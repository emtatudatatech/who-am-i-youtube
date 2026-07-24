import { sql, ok, fail } from "./_shared/db.js";
import { AFRICAN_CODES } from "./_shared/africa.js";

// Count of watched videos whose channel self-reports an African country.
// Nulls are excluded from the numerator but reported so their share is visible.
export async function handler() {
  try {
    const [counts, byCountry] = await Promise.all([
      sql.query(
        `SELECT
           count(*) FILTER (WHERE channel_country = ANY($1))          AS african,
           count(*) FILTER (WHERE channel_country IS NOT NULL)        AS with_country,
           count(*) FILTER (WHERE channel_country IS NULL)            AS null_country,
           count(*)                                                   AS total_watched
         FROM history WHERE activity_type='watched'`,
        [AFRICAN_CODES]
      ),
      sql.query(
        `SELECT channel_country, count(*)::int AS count
           FROM history
          WHERE activity_type='watched' AND channel_country = ANY($1)
          GROUP BY channel_country
          ORDER BY count DESC
          LIMIT 15`,
        [AFRICAN_CODES]
      ),
    ]);
    const c = counts[0];
    return ok({
      african: Number(c.african),
      withCountry: Number(c.with_country),
      nullCountry: Number(c.null_country),
      totalWatched: Number(c.total_watched),
      topCountries: byCountry,
    });
  } catch (e) {
    return fail(e);
  }
}
