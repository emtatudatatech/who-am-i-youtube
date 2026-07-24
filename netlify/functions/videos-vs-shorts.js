import { sql, ok, fail } from "./_shared/db.js";

// Videos vs. Shorts split among watched entries (is_short from '#shorts' title tag).
export async function handler() {
  try {
    const rows = await sql.query(
      `SELECT is_short, count(*)::int AS count
         FROM history WHERE activity_type='watched'
        GROUP BY is_short`
    );
    let shorts = 0;
    let videos = 0;
    for (const r of rows) {
      if (r.is_short) shorts = r.count;
      else videos = r.count;
    }
    return ok({ videos, shorts });
  } catch (e) {
    return fail(e);
  }
}
