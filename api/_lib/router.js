'use strict';
/** File-based router over api/_handlers/**, shared by the Vercel catch-all
 * function (api/[...path].js) and the local dev server (dev-server.js). */
const fs = require('fs');
const path = require('path');

function walk(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
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

/** Builds a router over `handlersDir` (an absolute path to api/_handlers). */
function buildRouter(handlersDir) {
  const routes = walk(handlersDir).map(toRoute).sort((a, b) => Number(a.isDynamic) - Number(b.isDynamic));

  /** apiPath: the URL path after "/api" (e.g. "/orders", "/pages/1/widgets"). */
  function match(apiPath) {
    const route = routes.find((r) => r.regex.test(apiPath));
    if (!route) return null;
    const m = apiPath.match(route.regex);
    const params = {};
    route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
    return { params, absPath: path.join(handlersDir, route.filePath) };
  }

  return { match, count: routes.length };
}

module.exports = { buildRouter };
