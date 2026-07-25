import { sql, ok, fail, yearParam, VIDEO_FILTER } from "./_shared/db.js";

// Top 5 watched categories. ?year=YYYY (or omit / 'all'). Joins video_categories.
export async function handler(event) {
  try {
    const year = yearParam(event);
    const rows = await sql.query(
      `SELECT h.category_id,
              coalesce(vc.category_name, 'Uncategorized') AS category_name,
              count(*)::int AS count
         FROM history h
         LEFT JOIN video_categories vc ON h.category_id = vc.category_id
        WHERE ${VIDEO_FILTER}
          AND h.category_id IS NOT NULL
          AND ($1::int IS NULL OR EXTRACT(YEAR FROM h.time_eat) = $1)
        GROUP BY h.category_id, vc.category_name
        ORDER BY count DESC
        LIMIT 5`,
      [year]
    );
    return ok(rows);
  } catch (e) {
    return fail(e);
  }
}
