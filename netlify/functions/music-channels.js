import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// "Sing Song": top 10 all-time Music-category channels (YouTube category 10),
// with channel country, video count, and a monthly sparkline of music watches.
export async function handler() {
  try {
    const top = await sql.query(
      `SELECT h.channel_id, h.channel_name, h.channel_image_url,
              max(h.channel_country) AS channel_country,
              count(*)::int AS count
         FROM history h
        WHERE ${VIDEO_FILTER} AND h.category_id = '10' AND h.channel_id IS NOT NULL
        GROUP BY h.channel_id, h.channel_name, h.channel_image_url
        ORDER BY count DESC
        LIMIT 10`
    );

    const ids = top.map((r) => r.channel_id);
    const series = ids.length
      ? await sql.query(
          `SELECT channel_id,
                  to_char(date_trunc('month', time_eat), 'YYYY-MM') AS period,
                  count(*)::int AS count
             FROM history
            WHERE ${VIDEO_FILTER} AND category_id = '10' AND channel_id = ANY($1)
            GROUP BY 1, 2 ORDER BY 1, 2`,
          [ids]
        )
      : [];

    const byChannel = {};
    for (const row of series) {
      (byChannel[row.channel_id] ||= []).push({ period: row.period, count: row.count });
    }

    return ok(
      top.map((r) => ({
        channelId: r.channel_id,
        channelName: r.channel_name,
        channelImageUrl: r.channel_image_url,
        channelCountry: r.channel_country,
        count: r.count,
        sparkline: byChannel[r.channel_id] || [],
      }))
    );
  } catch (e) {
    return fail(e);
  }
}
