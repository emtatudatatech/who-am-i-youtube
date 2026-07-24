import { sql, ok, fail } from "./_shared/db.js";

// Year-Month watch counts, each period annotated with its top channel (name + logo).
export async function handler() {
  try {
    const [totals, tops] = await Promise.all([
      sql.query(
        `SELECT to_char(date_trunc('month', time_eat), 'YYYY-MM') AS period,
                count(*)::int AS count
           FROM history WHERE activity_type='watched'
          GROUP BY 1 ORDER BY 1`
      ),
      sql.query(
        `WITH monthly AS (
           SELECT to_char(date_trunc('month', time_eat), 'YYYY-MM') AS period,
                  channel_name, channel_image_url, count(*)::int AS c
             FROM history
            WHERE activity_type='watched' AND channel_id IS NOT NULL
            GROUP BY 1, channel_name, channel_image_url
         ),
         ranked AS (
           SELECT period, channel_name, channel_image_url,
                  row_number() OVER (PARTITION BY period ORDER BY c DESC) AS rn
             FROM monthly
         )
         SELECT period, channel_name AS top_channel, channel_image_url AS top_channel_image
           FROM ranked WHERE rn = 1`
      ),
    ]);

    const topByPeriod = {};
    for (const t of tops) topByPeriod[t.period] = t;

    return ok(
      totals.map((r) => ({
        period: r.period,
        count: r.count,
        topChannel: topByPeriod[r.period]?.top_channel || null,
        topChannelImage: topByPeriod[r.period]?.top_channel_image || null,
      }))
    );
  } catch (e) {
    return fail(e);
  }
}
