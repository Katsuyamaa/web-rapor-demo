'use strict';
const { ok, err, readBody, requireAuth } = require('../../../_lib/http');
const { DIST_RUTS } = require('../../../_lib/fixtures');

let seq = DIST_RUTS.length + 1;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    const data = DIST_RUTS.slice().sort((a, b) => a.rut_number - b.rut_number || a.branch_name.localeCompare(b.branch_name));
    return ok(res, { data });
  }

  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const body = await readBody(req);
    const branch = (body.branch_name || '').trim();
    const rutNum = parseInt(body.rut_number, 10);
    if (!branch || !Number.isInteger(rutNum) || rutNum < 1) return err(res, 400, 'Şube adı ve rut numarası gerekli');
    const existing = DIST_RUTS.find((r) => r.branch_name === branch);
    if (existing) { existing.rut_number = rutNum; return ok(res, { success: true, id: existing.id }); }
    const id = seq++;
    DIST_RUTS.push({ id, branch_name: branch, rut_number: rutNum });
    return ok(res, { success: true, id });
  }

  err(res, 405, 'Method not allowed');
};
