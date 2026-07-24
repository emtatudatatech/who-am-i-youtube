// Drives the running app (localhost:5173) via Chrome DevTools Protocol:
// visits each tab, captures console errors + a screenshot, and reports layout diagnostics.
import { spawn } from "node:child_process";
import fs from "node:fs";

const OUT = process.argv[2] || ".";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const TABS = ["overview", "channels", "categories", "patterns", "fame", "trend"];

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`,
  "--user-data-dir=/tmp/cdp-profile-yt", "--hide-scrollbars", "--window-size=1280,2400",
]);
process.on("exit", () => chrome.kill());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://localhost:${PORT}/json`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome CDP not ready");
}

const ws = new WebSocket(await getWsUrl());
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === "Runtime.exceptionThrown") {
    errors.push("EXCEPTION: " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    errors.push("console.error: " + msg.params.args.map((a) => a.value || a.description).join(" "));
  }
});
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await new Promise((r) => ws.addEventListener("open", r));
await send("Page.enable");
await send("Runtime.enable");

const evalJS = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};

await send("Page.navigate", { url: "http://localhost:5173/#overview" });
await sleep(3500);

// Layout diagnostics
const diag = await evalJS(`JSON.stringify({
  statCards: document.querySelectorAll('.stat').length,
  cols4: getComputedStyle(document.querySelector('.grid.cols-4')||document.body).gridTemplateColumns,
  cols2: getComputedStyle(document.querySelector('.grid.cols-2')||document.body).gridTemplateColumns,
  bodyScrollW: document.body.scrollWidth,
  innerW: window.innerWidth
})`);
console.log("LAYOUT:", diag);

for (const t of TABS) {
  await evalJS(`(()=>{const b=[...document.querySelectorAll('.tab')].find(x=>x.textContent.toLowerCase().includes(${JSON.stringify(t === "fame" ? "fame" : t)}));if(b)b.click();})()`);
  await sleep(2600);
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  fs.writeFileSync(`${OUT}/tab-${t}.png`, Buffer.from(shot.result.data, "base64"));
  const marker = await evalJS(`document.querySelector('.panel-head h3')?.textContent || '(none)'`);
  console.log(`TAB ${t}: firstPanel="${marker}" screenshot saved`);
}

console.log(errors.length ? "\nERRORS:\n" + errors.join("\n") : "\nNo console/runtime errors across all tabs.");
ws.close();
chrome.kill();
process.exit(0);
