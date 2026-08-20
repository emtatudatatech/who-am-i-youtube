// Invokes each Netlify function handler directly against the live Neon DB.
// Usage (from repo root): node scripts/test-functions.mjs
//                          PERSON=wambui node scripts/test-functions.mjs
import "./env.mjs";

// Call a handler and return its parsed body (or null if it failed).
async function probe(name, qs = {}) {
  try {
    const mod = await import(`../netlify/functions/${name}.js`);
    const res = await mod.handler({ queryStringParameters: qs });
    return res.statusCode === 200 ? JSON.parse(res.body) : null;
  } catch {
    return null;
  }
}

// Parameters are derived from whoever's database is loaded, not hardcoded, so
// this suite is meaningful for every person — not just the one it was written on.
const [stats, categories, musicChannels, africa] = await Promise.all([
  probe("headline-stats"),
  probe("top-categories"),
  probe("music-channels"),
  probe("african-creators"),
]);

const year = stats?.years?.length ? String(stats.years.at(-1)) : "all";
const category = categories?.[0]?.category_id ?? "10";
const channel = musicChannels?.[0]?.channelId ?? "";
const country = africa?.topCountries?.[0]?.channel_country ?? "KE";
console.log(`derived params: year=${year} category=${category} country=${country} channel=${channel || "(none)"}`);

const cases = [
  ["headline-stats", {}],
  ["top-channels", { year }],
  ["top-channels", {}],
  ["watch-trend", {}],
  ["time-patterns", {}],
  ["content-mix", {}],
  ["african-creators", {}],
  ["african-channels", { country }],
  ["top-categories", { year }],
  ["category-channels", { category, year }],
  ["avg-watch-time", {}],
  ["avg-watch-time", { year }],
  ["videos-per-day", {}],
  ["watch-of-fame", {}],
  ["music-channels", {}],
  ["music-videos", { channel }],
  ["watch-trend-tab", {}],
  ["bar-chart-race", {}],
];

let failures = 0;
for (const [name, qs] of cases) {
  const mod = await import(`../netlify/functions/${name}.js`);
  const event = { queryStringParameters: qs };
  try {
    const res = await mod.handler(event);
    const body = JSON.parse(res.body);
    const preview = JSON.stringify(body).slice(0, 140);
    const tag = res.statusCode === 200 ? "OK " : "ERR";
    if (res.statusCode !== 200) failures++;
    console.log(`${tag} ${name} ${JSON.stringify(qs)} -> ${res.statusCode} ${preview}`);
  } catch (e) {
    failures++;
    console.log(`ERR ${name} ${JSON.stringify(qs)} -> threw: ${e.message}`);
  }
}
console.log(failures ? `\n${failures} FAILURES` : "\nAll functions OK");
process.exit(failures ? 1 : 0);
