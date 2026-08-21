import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// "Nostalgia": the videos you came back to. Ranked by how many times the same
// video_id appears in the watch history — the songs, trailers and workouts you
// replayed rather than watched once and moved on from.
export async function handler(event) {
  try {
    const raw = parseInt(event?.queryStringParameters?.limit ?? "10", 10);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 50) : 10;

    const rows = await sql.query(
      `SELECT video_id,
              max(title)               AS title,
              max(title_url)           AS title_url,
              max(video_thumbnail_url) AS video_thumbnail_url,
              max(channel_id)          AS channel_id,
              max(channel_name)        AS channel_name,
              max(channel_image_url)   AS channel_image_url,
              max(channel_country)     AS channel_country,
              count(*)::int            AS count,
              min(time_eat)            AS first_watched,
              max(time_eat)            AS last_watched
         FROM history
        WHERE ${VIDEO_FILTER} AND video_id IS NOT NULL
        GROUP BY video_id
        -- last_watched breaks ties so the ordering is stable between calls.
        ORDER BY count DESC, last_watched DESC
        LIMIT $1`,
      [limit]
    );

    return ok(
      rows.map((r) => ({
        videoId: r.video_id,
        title: r.title,
        titleUrl: r.title_url,
        videoThumbnailUrl: r.video_thumbnail_url,
        channelId: r.channel_id,
        channelName: r.channel_name,
        channelImageUrl: r.channel_image_url,
        channelCountry: r.channel_country,
        count: r.count,
        firstWatched: r.first_watched,
        lastWatched: r.last_watched,
      }))
    );
  } catch (e) {
    return fail(e);
  }
}
