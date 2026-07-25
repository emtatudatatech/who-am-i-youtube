// Invokes each Netlify function handler directly against the live Neon DB.
// Usage (from repo root): node scripts/test-functions.mjs
import "dotenv/config";

const cases = [
  ["headline-stats", {}],
  ["top-channels", { year: "2023" }],
  ["top-channels", {}],
  ["watch-trend", {}],
  ["time-patterns", {}],
  ["content-mix", {}],
  ["african-creators", {}],
  ["african-channels", { country: "KE" }],
  ["top-categories", { year: "2023" }],
  ["category-channels", { category: "17", year: "2023" }],
  ["avg-watch-time", {}],
  ["avg-watch-time", { year: "2023" }],
  ["videos-per-day", {}],
  ["watch-of-fame", {}],
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
