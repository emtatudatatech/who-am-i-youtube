import { neon } from "@neondatabase/serverless";

// Neon HTTP driver — safe for ephemeral serverless invocations (no long-lived pool).
// DATABASE_URL comes from Netlify environment variables only (never shipped to the browser).
export const sql = neon(process.env.DATABASE_URL);

export function ok(data) {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      // Watch history is static between syncs; let the CDN cache responses.
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
    body: JSON.stringify(data),
  };
}

export function fail(err) {
  console.error(err);
  return {
    statusCode: 500,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ error: "Query failed" }),
  };
}

// Parse a ?year= param into an integer, or null for "all time".
export function yearParam(event) {
  const raw = event.queryStringParameters?.year;
  if (!raw || raw === "all") return null;
  const y = parseInt(raw, 10);
  return Number.isFinite(y) ? y : null;
}
