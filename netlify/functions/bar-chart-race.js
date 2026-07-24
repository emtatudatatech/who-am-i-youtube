import { sql, ok, fail } from "./_shared/db.js";

// Data for an animated "racing" bar chart: cumulative watched counts per channel
// at the end of each year, for the top channels overall. Frames are precomputed.
export async function handler() {
  try {
    const rows = await sql.query(
      `WITH top AS (
         SELECT channel_id
           FROM history
          WHERE activity_type='watched' AND channel_id IS NOT NULL
          GROUP BY channel_id
          ORDER BY count(*) DESC
          LIMIT 12
       )
       SELECT h.channel_id,
              h.channel_name,
              h.channel_image_url,
              EXTRACT(YEAR FROM h.time_eat)::int AS year,
              count(*)::int AS count
         FROM history h
         JOIN top ON top.channel_id = h.channel_id
        WHERE h.activity_type='watched'
        GROUP BY h.channel_id, h.channel_name, h.channel_image_url, year
        ORDER BY year`
    );

    const meta = {}; // channel_id -> {name, image}
    const counts = {}; // channel_id -> {year -> count}
    let minYear = Infinity;
    let maxYear = -Infinity;
    for (const r of rows) {
      meta[r.channel_id] ||= { name: r.channel_name, image: r.channel_image_url };
      (counts[r.channel_id] ||= {})[r.year] = r.count;
      minYear = Math.min(minYear, r.year);
      maxYear = Math.max(maxYear, r.year);
    }

    const frames = [];
    const cumulative = {};
    for (let year = minYear; year <= maxYear; year++) {
      for (const id of Object.keys(meta)) {
        cumulative[id] = (cumulative[id] || 0) + (counts[id]?.[year] || 0);
      }
      const bars = Object.keys(meta)
        .map((id) => ({
          channelId: id,
          channelName: meta[id].name,
          channelImageUrl: meta[id].image,
          value: cumulative[id],
        }))
        .filter((b) => b.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      frames.push({ year, bars });
    }

    return ok({ frames });
  } catch (e) {
    return fail(e);
  }
}
