import { sql, ok, fail } from "./_shared/db.js";

// Watch patterns by hour-of-day, day-of-week, month-of-year — overall and per year,
// so the frontend can show how the rhythm shifted over time. All from time_eat.
export async function handler() {
  try {
    const [hour, dow, month, hourByYear] = await Promise.all([
      sql.query(
        `SELECT EXTRACT(HOUR FROM time_eat)::int AS bucket, count(*)::int AS count
           FROM history WHERE activity_type='watched' GROUP BY 1 ORDER BY 1`
      ),
      sql.query(
        `SELECT EXTRACT(DOW FROM time_eat)::int AS bucket, count(*)::int AS count
           FROM history WHERE activity_type='watched' GROUP BY 1 ORDER BY 1`
      ),
      sql.query(
        `SELECT EXTRACT(MONTH FROM time_eat)::int AS bucket, count(*)::int AS count
           FROM history WHERE activity_type='watched' GROUP BY 1 ORDER BY 1`
      ),
      sql.query(
        `SELECT EXTRACT(YEAR FROM time_eat)::int AS year,
                EXTRACT(HOUR FROM time_eat)::int AS bucket,
                count(*)::int AS count
           FROM history WHERE activity_type='watched' GROUP BY 1, 2 ORDER BY 1, 2`
      ),
    ]);
    return ok({ hour, dow, month, hourByYear });
  } catch (e) {
    return fail(e);
  }
}
