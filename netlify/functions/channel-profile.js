import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// Everything the Superfan tab shows for ONE channel: headline totals, where it
// ranks among all channels, its monthly trend, when in the day you watch it,
// its category mix, and the videos you replayed most.
export async function handler(event) {
  try {
    const channel = event?.queryStringParameters?.channel;
    if (!channel) return ok(null);

    const [summary, ranking, monthly, hourly, categories, topVideos] = await Promise.all([
      sql.query(
        `SELECT max(channel_name)                                AS channel_name,
                max(channel_image_url)                           AS channel_image_url,
                max(channel_country)                             AS channel_country,
                count(*)::int                                    AS videos,
                count(DISTINCT video_id)::int                    AS unique_videos,
                count(DISTINCT date_trunc('day', time_eat))::int AS active_days,
                min(time_eat)                                    AS first_watched,
                max(time_eat)                                    AS last_watched,
                sum(video_duration_seconds)::bigint              AS total_seconds,
                avg(video_duration_seconds)                      AS avg_seconds
           FROM history
          WHERE ${VIDEO_FILTER} AND channel_id = $1`,
        [channel]
      ),
      // Where this channel sits in the all-time leaderboard, and out of how many.
      sql.query(
        `WITH totals AS (
           SELECT channel_id, count(*) AS n
             FROM history
            WHERE ${VIDEO_FILTER} AND channel_id IS NOT NULL
            GROUP BY channel_id
         ), ranked AS (
           SELECT channel_id,
                  rank()  OVER (ORDER BY n DESC) AS rank,
                  count(*) OVER ()               AS total_channels
             FROM totals
         )
         SELECT rank::int, total_channels::int FROM ranked WHERE channel_id = $1`,
        [channel]
      ),
      sql.query(
        `SELECT to_char(date_trunc('month', time_eat), 'YYYY-MM') AS period,
                count(*)::int AS count
           FROM history
          WHERE ${VIDEO_FILTER} AND channel_id = $1
          GROUP BY 1 ORDER BY 1`,
        [channel]
      ),
      sql.query(
        `SELECT EXTRACT(HOUR FROM time_eat)::int AS bucket, count(*)::int AS count
           FROM history
          WHERE ${VIDEO_FILTER} AND channel_id = $1
          GROUP BY 1 ORDER BY 1`,
        [channel]
      ),
      sql.query(
        `SELECT coalesce(vc.category_name, 'Uncategorized') AS category_name,
                count(*)::int AS count
           FROM history h
           LEFT JOIN video_categories vc ON h.category_id = vc.category_id
          WHERE ${VIDEO_FILTER} AND h.channel_id = $1
          GROUP BY 1 ORDER BY count DESC LIMIT 6`,
        [channel]
      ),
      sql.query(
        `SELECT video_id,
                max(title)               AS title,
                max(title_url)           AS title_url,
                max(video_thumbnail_url) AS video_thumbnail_url,
                count(*)::int            AS count,
                max(time_eat)            AS last_watched
           FROM history
          WHERE ${VIDEO_FILTER} AND channel_id = $1 AND video_id IS NOT NULL
          GROUP BY video_id
          ORDER BY count DESC, last_watched DESC
          LIMIT 8`,
        [channel]
      ),
    ]);

    const s = summary[0];
    // A channel_id with no watched videos (e.g. only Shorts) aggregates to a
    // single all-null row — treat that as "not found" rather than rendering zeros.
    if (!s || s.videos === 0) return ok(null);

    // Every hour 0-23 present, so the chart never draws a gap-toothed axis.
    const hourMap = Object.fromEntries(hourly.map((r) => [r.bucket, r.count]));
    const hours = Array.from({ length: 24 }, (_, h) => ({ bucket: h, count: hourMap[h] ?? 0 }));

    return ok({
      channelId: channel,
      channelName: s.channel_name,
      channelImageUrl: s.channel_image_url,
      channelCountry: s.channel_country,
      videos: s.videos,
      uniqueVideos: s.unique_videos,
      activeDays: s.active_days,
      firstWatched: s.first_watched,
      lastWatched: s.last_watched,
      totalSeconds: s.total_seconds == null ? null : Number(s.total_seconds),
      avgSeconds: s.avg_seconds == null ? null : Number(s.avg_seconds),
      rank: ranking[0]?.rank ?? null,
      totalChannels: ranking[0]?.total_channels ?? null,
      monthly,
      hourly: hours,
      categories,
      topVideos: topVideos.map((r) => ({
        videoId: r.video_id,
        title: r.title,
        titleUrl: r.title_url,
        videoThumbnailUrl: r.video_thumbnail_url,
        count: r.count,
        lastWatched: r.last_watched,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
