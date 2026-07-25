import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// Headline stat cards + the date-range ribbon values.
// "Videos" = long-form watched videos only (ads / Shorts / posts counted separately).
export async function handler() {
  try {
    const [totals, ribbon, days, years] = await Promise.all([
      sql.query(
        `SELECT
           count(*) FILTER (WHERE ${VIDEO_FILTER})                                       AS videos,
           count(DISTINCT channel_id) FILTER (WHERE ${VIDEO_FILTER})                     AS unique_channels,
           count(*) FILTER (WHERE activity_type='watched' AND content_type='short')      AS shorts,
           count(*) FILTER (WHERE content_type='ad')                                     AS ads,
           count(*) FILTER (WHERE content_type='post')                                   AS posts,
           count(*) FILTER (WHERE activity_type='searched for')                          AS searches
         FROM history`
      ),
      sql.query(`SELECT min(time_eat) AS min_time, max(time_eat) AS max_time FROM history`),
      sql.query(
        `SELECT count(DISTINCT date_trunc('day', time_eat)) AS active_days
         FROM history WHERE ${VIDEO_FILTER}`
      ),
      sql.query(
        `SELECT DISTINCT EXTRACT(YEAR FROM time_eat)::int AS year
         FROM history WHERE ${VIDEO_FILTER} ORDER BY year`
      ),
    ]);

    const t = totals[0];
    const activeDays = Number(days[0].active_days) || 1;
    return ok({
      videos: Number(t.videos),
      uniqueChannels: Number(t.unique_channels),
      shorts: Number(t.shorts),
      ads: Number(t.ads),
      posts: Number(t.posts),
      searches: Number(t.searches),
      avgPerDay: Number(t.videos) / activeDays,
      minTime: ribbon[0].min_time,
      maxTime: ribbon[0].max_time,
      years: years.map((r) => r.year),
    });
  } catch (e) {
    return fail(e);
  }
}
