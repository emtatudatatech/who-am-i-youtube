import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// Drill-down for "Sing Song": a channel's top 5 music videos by number of plays.
export async function handler(event) {
  try {
    const channel = event.queryStringParameters?.channel;
    if (!channel) return ok([]);
    const rows = await sql.query(
      `SELECT title, title_url, video_thumbnail_url, video_id, count(*)::int AS count
         FROM history
        WHERE ${VIDEO_FILTER} AND category_id = '10' AND channel_id = $1
        GROUP BY title, title_url, video_thumbnail_url, video_id
        ORDER BY count DESC
        LIMIT 5`,
      [channel]
    );
    return ok(rows);
  } catch (e) {
    return fail(e);
  }
}
