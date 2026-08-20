// Lightweight local API server for development: maps /api/<name> and
// /.netlify/functions/<name> to the corresponding Netlify function handler,
// so `vite dev` can proxy to it. Not used in production (Netlify runs the
// functions itself). Usage: node scripts/dev-server.mjs
//                           PERSON=wambui node scripts/dev-server.mjs
import "./env.mjs";
import http from "node:http";

const PORT = 8888;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const m = url.pathname.match(/^\/(?:api|\.netlify\/functions)\/([\w-]+)$/);
  res.setHeader("content-type", "application/json");
  if (!m) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: "not found" }));
  }
  try {
    const mod = await import(`../netlify/functions/${m[1]}.js`);
    const event = { queryStringParameters: Object.fromEntries(url.searchParams) };
    const result = await mod.handler(event);
    res.statusCode = result.statusCode;
    for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v);
    res.end(result.body);
  } catch (e) {
    console.error(m[1], e.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`dev API on http://localhost:${PORT}`));
