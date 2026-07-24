import { sql, ok, fail, yearParam } from "./_shared/db.js";

// Top 5 channels by watched count. ?year=YYYY (or omit / 'all' for all-time).
export async function handler(event) {
  try {
    const year = yearParam(event);
    const rows = await sql.query(
      `SELECT channel_id, channel_name, channel_image_url, count(*)::int AS count
         FROM history
        WHERE activity_type='watched'
          AND channel_id IS NOT NULL
          AND ($1::int IS NULL OR EXTRACT(YEAR FROM time_eat) = $1)
        GROUP BY channel_id, channel_name, channel_image_url
        ORDER BY count DESC
        LIMIT 5`,
      [year]
    );
    return ok(rows);
  } catch (e) {
    return fail(e);
  }
}
