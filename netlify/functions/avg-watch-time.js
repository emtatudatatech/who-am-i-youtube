import { sql, ok, fail, yearParam, VIDEO_FILTER } from "./_shared/db.js";

// Watch-time metrics from video_duration_seconds (real durations, added via enrichment).
// No ?year: group by year. ?year=YYYY: drill down to months within that year.
// Only watched rows that actually have a duration contribute; coverage is reported.
export async function handler(event) {
  try {
    const year = yearParam(event);
    const bucket = year ? "EXTRACT(MONTH FROM time_eat)::int" : "EXTRACT(YEAR FROM time_eat)::int";

    const [rows, coverage] = await Promise.all([
      sql.query(
        `SELECT ${bucket} AS period,
                sum(video_duration_seconds)::bigint            AS total_seconds,
                avg(video_duration_seconds)::numeric(10,1)     AS avg_seconds,
                count(*)::int                                  AS videos
           FROM history
          WHERE ${VIDEO_FILTER}
            AND video_duration_seconds IS NOT NULL
            AND ($1::int IS NULL OR EXTRACT(YEAR FROM time_eat) = $1)
          GROUP BY 1 ORDER BY 1`,
        [year]
      ),
      sql.query(
        `SELECT
           count(*) FILTER (WHERE video_duration_seconds IS NOT NULL) AS with_duration,
           count(*)                                                   AS total_watched
         FROM history WHERE ${VIDEO_FILTER}`
      ),
    ]);

    return ok({
      periods: rows.map((r) => ({
        period: r.period,
        totalSeconds: Number(r.total_seconds),
        avgSeconds: Number(r.avg_seconds),
        videos: r.videos,
      })),
      withDuration: Number(coverage[0].with_duration),
      totalWatched: Number(coverage[0].total_watched),
    });
  } catch (e) {
    return fail(e);
  }
}
