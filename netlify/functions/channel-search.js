import { sql, ok, fail, VIDEO_FILTER } from "./_shared/db.js";

// Options for the Superfan tab's channel picker. With no ?q= it returns the
// most-watched channels (a sensible default list); with ?q= it name-searches.
// There are ~14K channels in a full history, so the picker searches server-side
// rather than shipping the whole list to the browser.
export async function handler(event) {
  try {
    const q = (event?.queryStringParameters?.q || "").trim();
    const raw = parseInt(event?.queryStringParameters?.limit ?? "30", 10);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 100) : 30;

    const rows = await sql.query(
      `SELECT channel_id,
              max(channel_name)      AS channel_name,
              max(channel_image_url) AS channel_image_url,
              max(channel_country)   AS channel_country,
              count(*)::int          AS count
         FROM history
        WHERE ${VIDEO_FILTER}
          AND channel_id IS NOT NULL
          -- $1 is bound, so any % or _ the user types is just a wildcard here,
          -- never SQL. Empty string means "no filter".
          AND ($1 = '' OR channel_name ILIKE '%' || $1 || '%')
        GROUP BY channel_id
        ORDER BY count DESC
        LIMIT $2`,
      [q, limit]
    );

    return ok(
      rows.map((r) => ({
        channelId: r.channel_id,
        channelName: r.channel_name,
        channelImageUrl: r.channel_image_url,
        channelCountry: r.channel_country,
        count: r.count,
      }))
    );
  } catch (e) {
    return fail(e);
  }
}
