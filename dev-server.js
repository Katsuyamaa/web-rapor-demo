'use strict';
/**
 * Local API dev server that mimics Vercel's file-based /api routing without
 * requiring `vercel login`. Run this alongside `npm run dev` (Vite) in
 * frontend/ — vite.config.js proxies /api to this server on port 3000.
 * Uses the same router as the Vercel catch-all function (api/[...path].js).
 */
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { buildRouter } = require('./api/_lib/router');

const PORT = process.env.PORT || 3000;
const router = buildRouter(path.join(__dirname, 'api', '_handlers'));

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  if (!pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.end('Not an API route');
    return;
  }
  const apiPath = pathname.slice(4);
  const found = router.match(apiPath);
  if (!found) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: `Route not found: ${apiPath}` }));
    return;
  }

  const searchParams = Object.fromEntries(parsed.searchParams.entries());
  req.query = { ...searchParams, ...found.params };

  try {
    delete require.cache[require.resolve(found.absPath)];
    const mod = require(found.absPath);
    const fn = mod.default || mod;
    await fn(req, res);
  } catch (e) {
    console.error(`[${apiPath}]`, e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: String((e && e.message) || e) }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`Local API dev server (mimics Vercel functions) -> http://localhost:${PORT}/api/*`);
  console.log(`Routes loaded: ${router.count}`);
});
