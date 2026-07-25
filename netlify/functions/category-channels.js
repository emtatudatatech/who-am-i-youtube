import { sql, ok, fail, yearParam, VIDEO_FILTER } from "./_shared/db.js";

// Drill-down: top 5 channels (by videos watched) within a category. ?category=ID&year=YYYY.
export async function handler(event) {
  try {
    const category = event.queryStringParameters?.category;
    if (!category) return ok([]);
    const year = yearParam(event);
    const rows = await sql.query(
      `SELECT channel_id, channel_name, channel_image_url, count(*)::int AS count
         FROM history
        WHERE ${VIDEO_FILTER}
          AND category_id = $1
          AND channel_id IS NOT NULL
          AND ($2::int IS NULL OR EXTRACT(YEAR FROM time_eat) = $2)
        GROUP BY channel_id, channel_name, channel_image_url
        ORDER BY count DESC
        LIMIT 5`,
      [category, year]
    );
    return ok(rows);
  } catch (e) {
    return fail(e);
  }
}
