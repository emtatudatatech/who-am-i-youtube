import { sql, ok, fail } from "./_shared/db.js";

// Average number of videos watched per active day, overall and per year.
export async function handler() {
  try {
    const [overall, byYear] = await Promise.all([
      sql.query(
        `SELECT count(*)::int AS videos,
                count(DISTINCT date_trunc('day', time_eat))::int AS days
           FROM history WHERE activity_type='watched'`
      ),
      sql.query(
        `SELECT EXTRACT(YEAR FROM time_eat)::int AS year,
                count(*)::int AS videos,
                count(DISTINCT date_trunc('day', time_eat))::int AS days
           FROM history WHERE activity_type='watched'
          GROUP BY 1 ORDER BY 1`
      ),
    ]);
    const o = overall[0];
    return ok({
      overall: { videos: o.videos, days: o.days, avgPerDay: o.videos / (o.days || 1) },
      byYear: byYear.map((r) => ({
        year: r.year,
        videos: r.videos,
        days: r.days,
        avgPerDay: r.videos / (r.days || 1),
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
