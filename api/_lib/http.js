'use strict';
/** Shared request/response helpers for the demo API (stateless, no real JWT verification). */

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function ok(res, body, status = 200) { json(res, status, body); }
function err(res, status, message) { json(res, status, { error: message }); }

/** Reads and parses the JSON body for Node serverless functions (body may already be parsed by Vercel). */
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try { return req.body ? JSON.parse(req.body) : {}; } catch { return {}; }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

/** Encode a fake bearer token carrying the user's identity/role as base64 JSON (no signing — demo only). */
function makeToken(user) {
  return Buffer.from(JSON.stringify({ id: user.id, username: user.username, role: user.role })).toString('base64');
}

/** Decode the Authorization: Bearer <token> header. Any non-empty token is accepted (per demo auth spec). */
function getAuth(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (!header || typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m || !m[1]) return null;
  const token = m[1].trim();
  if (!token) return null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    if (decoded && decoded.username) return { id: decoded.id, username: decoded.username, role: decoded.role || 'guest' };
  } catch { /* fall through to default guest identity */ }
  return { id: 0, username: 'guest', role: 'guest' };
}

/** requireAuth(req, res, roles?) -> user object or null (and writes 401/403 response). */
function requireAuth(req, res, roles) {
  const user = getAuth(req);
  if (!user) { err(res, 401, 'Yetkilendirme gerekli (Authorization: Bearer <token>)'); return null; }
  if (roles && roles.length && !roles.includes(user.role)) {
    err(res, 403, 'Yetkiniz yetersiz'); return null;
  }
  return user;
}

function query(req) {
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

module.exports = { json, ok, err, readBody, makeToken, getAuth, requireAuth, query };
