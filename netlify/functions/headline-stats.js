import { sql, ok, fail } from "./_shared/db.js";

// Headline stat cards + the date-range ribbon values.
// Video metrics filter to activity_type='watched'; the ribbon uses all activity.
export async function handler() {
  try {
    const [totals, ribbon, days, years] = await Promise.all([
      sql.query(
        `SELECT
           count(*) FILTER (WHERE activity_type='watched')                              AS total_watched,
           count(DISTINCT channel_id) FILTER (WHERE activity_type='watched')            AS unique_channels,
           count(*) FILTER (WHERE activity_type='watched' AND is_short)                 AS total_shorts,
           count(*) FILTER (WHERE activity_type='searched for')                         AS total_searches
         FROM history`
      ),
      sql.query(`SELECT min(time_eat) AS min_time, max(time_eat) AS max_time FROM history`),
      sql.query(
        `SELECT count(DISTINCT date_trunc('day', time_eat)) AS active_days
         FROM history WHERE activity_type='watched'`
      ),
      sql.query(
        `SELECT DISTINCT EXTRACT(YEAR FROM time_eat)::int AS year
         FROM history WHERE activity_type='watched' ORDER BY year`
      ),
    ]);

    const t = totals[0];
    const activeDays = Number(days[0].active_days) || 1;
    return ok({
      totalWatched: Number(t.total_watched),
      uniqueChannels: Number(t.unique_channels),
      totalShorts: Number(t.total_shorts),
      totalSearches: Number(t.total_searches),
      avgPerDay: Number(t.total_watched) / activeDays,
      minTime: ribbon[0].min_time,
      maxTime: ribbon[0].max_time,
      years: years.map((r) => r.year),
    });
  } catch (e) {
    return fail(e);
  }
}
