import { sql, ok, fail } from "./_shared/db.js";

// 4-way breakdown of consumed content: long-form Videos, Shorts, Ads, Posts.
// Ads (Takeout "From Google Ads") and posts (community /post/) are kept out of
// the video/short counts so they never inflate "videos watched".
export async function handler() {
  try {
    const rows = await sql.query(
      `SELECT
         count(*) FILTER (WHERE activity_type='watched' AND content_type='video') AS videos,
         count(*) FILTER (WHERE activity_type='watched' AND content_type='short') AS shorts,
         count(*) FILTER (WHERE content_type='ad')                                AS ads,
         count(*) FILTER (WHERE content_type='post')                              AS posts
       FROM history`
    );
    const r = rows[0];
    return ok({
      videos: Number(r.videos),
      shorts: Number(r.shorts),
      ads: Number(r.ads),
      posts: Number(r.posts),
    });
  } catch (e) {
    return fail(e);
  }
}
