import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// Monthly watched counts, optionally within a manual date range (?from=&to=, ISO dates).
export async function handler(event) {
  try {
    const from = event.queryStringParameters?.from || null;
    const to = event.queryStringParameters?.to || null;
    const rows = await sql.query(
      `SELECT to_char(date_trunc('month', time_eat), 'YYYY-MM') AS period,
              count(*)::int AS count
         FROM history
        WHERE ${VIDEO_FILTER}
          AND ($1::date IS NULL OR time_eat >= $1::date)
          AND ($2::date IS NULL OR time_eat <  ($2::date + INTERVAL '1 day'))
        GROUP BY 1
        ORDER BY 1`,
      [from, to]
    );
    return ok(rows);
  } catch (e) {
    return fail(e);
  }
}
