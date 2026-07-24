import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// "Watch of Fame": top 10 all-time channels with name, primary category,
// video count, and a monthly watch-count series for an inline sparkline.
export async function handler() {
  try {
    const top = await sql.query(
      `SELECT h.channel_id, h.channel_name, h.channel_image_url,
              count(*)::int AS count,
              mode() WITHIN GROUP (ORDER BY vc.category_name) AS primary_category
         FROM history h
         LEFT JOIN video_categories vc ON h.category_id = vc.category_id
        WHERE ${VIDEO_FILTER} AND h.channel_id IS NOT NULL
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
            WHERE ${VIDEO_FILTER} AND channel_id = ANY($1)
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
        primaryCategory: r.primary_category || "Uncategorized",
        count: r.count,
        sparkline: byChannel[r.channel_id] || [],
      }))
    );
  } catch (e) {
    return fail(e);
  }
}
