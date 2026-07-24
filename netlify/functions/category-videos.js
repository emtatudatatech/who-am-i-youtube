import { sql, ok, fail, yearParam } from "./_shared/db.js";

// Drill-down: top 5 watched videos within a category. ?category=ID&year=YYYY.
export async function handler(event) {
  try {
    const category = event.queryStringParameters?.category;
    if (!category) return ok([]);
    const year = yearParam(event);
    const rows = await sql.query(
      `SELECT title, title_url, video_thumbnail_url,
              channel_name, video_id, count(*)::int AS count
         FROM history
        WHERE activity_type='watched'
          AND category_id = $1
          AND ($2::int IS NULL OR EXTRACT(YEAR FROM time_eat) = $2)
        GROUP BY title, title_url, video_thumbnail_url, channel_name, video_id
        ORDER BY count DESC
        LIMIT 5`,
      [category, year]
    );
    return ok(rows);
  } catch (e) {
    return fail(e);
  }
}
