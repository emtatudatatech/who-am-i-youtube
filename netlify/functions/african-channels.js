import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// Top 5 channels (by videos watched) for a given channel_country. ?country=KE
export async function handler(event) {
  try {
    const country = event.queryStringParameters?.country;
    if (!country) return ok([]);
    const rows = await sql.query(
      `SELECT channel_id, channel_name, channel_image_url, count(*)::int AS count
         FROM history
        WHERE ${VIDEO_FILTER}
          AND channel_country = $1
          AND channel_id IS NOT NULL
        GROUP BY channel_id, channel_name, channel_image_url
        ORDER BY count DESC
        LIMIT 5`,
      [country]
    );
    return ok(rows);
  } catch (e) {
    return fail(e);
  }
}
