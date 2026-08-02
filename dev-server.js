'use strict';
/**
 * Local API dev server that mimics Vercel's file-based /api routing without
 * requiring `vercel login`. Run this alongside `npm run dev` (Vite) in
 * frontend/ — vite.config.js proxies /api to this server on port 3000.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const API_DIR = path.join(__dirname, 'api');
const PORT = process.env.PORT || 3000;

function walk(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    if (entry.name === '_lib') continue;
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files = files.concat(walk(full, rel));
    } else if (entry.name.endsWith('.js')) {
      files.push(rel);
    }
  }
  return files;
}

function toRoute(relPath) {
  const noExt = relPath.slice(0, -3);
  const segments = noExt.split('/');
  if (segments[segments.length - 1] === 'index') segments.pop();
  const paramNames = [];
  const regexParts = segments.map((seg) => {
    const m = seg.match(/^\[(.+)\]$/);
    if (m) {
      paramNames.push(m[1]);
      return '([^/]+)';
    }
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const pattern = '^/' + regexParts.join('/') + '/?$';
  return { regex: new RegExp(pattern), paramNames, isDynamic: paramNames.length > 0, filePath: relPath };
}

const routes = walk(API_DIR).map(toRoute).sort((a, b) => Number(a.isDynamic) - Number(b.isDynamic));

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
  const match = routes.find((r) => r.regex.test(apiPath));
  if (!match) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: `Route not found: ${apiPath}` }));
    return;
  }

  const m = apiPath.match(match.regex);
  const params = {};
  match.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
  const searchParams = Object.fromEntries(parsed.searchParams.entries());
  req.query = { ...searchParams, ...params };

  try {
    const modPath = path.join(API_DIR, match.filePath);
    delete require.cache[require.resolve(modPath)];
    const mod = require(modPath);
    const fn = mod.default || mod;
    await fn(req, res);
  } catch (e) {
    console.error(`[${match.filePath}]`, e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: String((e && e.message) || e) }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`Local API dev server (mimics Vercel functions) -> http://localhost:${PORT}/api/*`);
  console.log(`Routes loaded: ${routes.length}`);
});
