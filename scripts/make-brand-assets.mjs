// Regenerates the raster brand assets in public/ from source markup, using the
// same headless Chrome the visual checks already rely on. Committed PNGs stay
// reproducible: change the markup here, re-run, commit the result.
//
//   node scripts/make-brand-assets.mjs
//
// Produces:
//   public/favicon-96.png   96x96   PNG fallback for browsers without SVG favicons
//   public/og-image.png     1200x630 link-preview card (Open Graph / Twitter)
//
// Not part of `npm run build` — Netlify has no Chrome, and these change rarely.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(REPO, "public");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9340;

const FAVICON_SVG = fs.readFileSync(path.join(PUBLIC, "favicon.svg"), "utf8");

// Mirrors the app's dark theme: --page #0d0d0d with the red/blue brand aura.
const OG_HTML = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:#0d0d0d;color:#fff;
    font-family:Inter,system-ui,sans-serif;overflow:hidden;
    background-image:
      radial-gradient(760px 460px at 8% -12%, rgba(230,51,41,.42), transparent 62%),
      radial-gradient(640px 420px at 104% 8%, rgba(42,120,214,.30), transparent 58%);
    display:flex;flex-direction:column;justify-content:center;padding:0 86px;position:relative}
  .mark{width:104px;height:104px;border-radius:28px;background:#e63329;
    display:grid;place-items:center;margin-bottom:38px;
    box-shadow:0 18px 60px rgba(230,51,41,.42)}
  .mark svg{width:60px;height:60px;margin-left:6px}
  h1{font-size:76px;font-weight:800;letter-spacing:-.03em;line-height:1.04}
  h1 span{color:#ff4b41}
  p{margin-top:22px;font-size:29px;color:#c3c2b7;font-weight:400;letter-spacing:-.01em}
  .foot{position:absolute;left:86px;bottom:64px;display:flex;align-items:center;gap:13px;
    font-size:22px;color:#898781;font-weight:600}
  .foot b{color:#fff;font-weight:700}
  .foot svg{border-radius:3px;box-shadow:0 0 0 1px rgba(255,255,255,.22)}
  .rule{position:absolute;left:86px;right:86px;bottom:132px;height:1px;background:rgba(255,255,255,.11)}
</style></head><body>
  <div class="mark"><svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>
  <h1>Who Am I? <span>| YouTube</span></h1>
  <!-- Generic: one image serves every person's site, so no per-person claims. -->
  <p>A personal watch-history story, told in charts.</p>
  <div class="rule"></div>
  <div class="foot">
    <span>Designed in Kenya</span>
    <svg viewBox="0 0 24 16" height="17" width="25.5">
      <defs><clipPath id="s"><ellipse cx="12" cy="8" rx="1.8" ry="4.3"/></clipPath></defs>
      <rect width="24" height="16" fill="#fff"/><rect width="24" height="5.33"/>
      <rect y="6.22" width="24" height="3.56" fill="#be0027"/>
      <rect y="10.67" width="24" height="5.33" fill="#006b3f"/>
      <g stroke="#fff" stroke-width=".85" stroke-linecap="round">
        <line x1="9.7" y1="1.8" x2="14.3" y2="14.2"/><line x1="14.3" y1="1.8" x2="9.7" y2="14.2"/></g>
      <ellipse cx="12" cy="8" rx="2.4" ry="5" fill="#fff"/><ellipse cx="12" cy="8" rx="1.8" ry="4.3"/>
      <rect x="9" y="5.7" width="6" height="4.6" fill="#be0027" clip-path="url(#s)"/>
      <rect x="11.6" y="3.6" width=".8" height="8.8" fill="#fff" clip-path="url(#s)"/>
    </svg>
    <span>by <b>emtatudatatech</b></span>
  </div>
</body></html>`;

const FAVICON_HTML = `<!doctype html><html><head><meta charset="utf-8">
<style>*{margin:0}body{width:96px;height:96px;background:transparent}svg{width:96px;height:96px;display:block}</style>
</head><body>${FAVICON_SVG}</body></html>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`,
  "--user-data-dir=/tmp/cdp-brand-assets", "--hide-scrollbars", "--force-device-scale-factor=1",
]);
process.on("exit", () => chrome.kill());

let ws;
for (let i = 0; i < 60; i++) {
  try {
    const list = await (await fetch(`http://localhost:${PORT}/json`)).json();
    const page = list.find((t) => t.type === "page");
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(250);
}
if (!ws) throw new Error("Chrome CDP not ready");

let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await new Promise((r) => ws.addEventListener("open", r));
await send("Page.enable");

async function render({ html, width, height, out, transparent = false }) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  if (transparent) {
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  } else {
    await send("Emulation.setDefaultBackgroundColorOverride");
  }
  await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });
  await sleep(2200); // let the webfont land before capturing
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width, height, scale: 1 },
    captureBeyondViewport: true,
  });
  const file = path.join(PUBLIC, out);
  fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  console.log(`wrote public/${out} (${width}x${height}, ${(fs.statSync(file).size / 1024).toFixed(1)} kB)`);
}

await render({ html: OG_HTML, width: 1200, height: 630, out: "og-image.png" });
await render({ html: FAVICON_HTML, width: 96, height: 96, out: "favicon-96.png", transparent: true });

ws.close();
chrome.kill();
process.exit(0);
