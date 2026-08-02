'use strict';
/** Single catch-all Vercel function for all /api/* routes (Hobby plan caps
 * a deployment at 12 serverless functions, so every route from
 * api/_handlers/** is served through this one entry point instead of one
 * function per file). */
const path = require('path');
const { buildRouter } = require('./_lib/router');

const router = buildRouter(path.join(__dirname, '_handlers'));

module.exports = async (req, res) => {
  const segments = req.query.path;
  const apiPath = '/' + (Array.isArray(segments) ? segments.join('/') : segments || '');

  const found = router.match(apiPath);
  if (!found) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: `Route not found: ${apiPath}` }));
    return;
  }

  const query = { ...req.query };
  delete query.path;
  req.query = { ...query, ...found.params };

  try {
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
};
