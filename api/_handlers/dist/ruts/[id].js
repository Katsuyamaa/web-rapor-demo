'use strict';
const { ok, err, readBody, requireAuth } = require('../../../_lib/http');
const { DIST_RUTS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  const id = parseInt(req.query.id, 10);
  const rut = DIST_RUTS.find((r) => r.id === id);

  if (req.method === 'PUT') {
    const body = await readBody(req);
    const branch = (body.branch_name || '').trim();
    const rutNum = parseInt(body.rut_number, 10);
    if (!branch || !Number.isInteger(rutNum) || rutNum < 1) return err(res, 400, 'Şube adı ve rut numarası gerekli');
    if (!rut) return err(res, 404, 'Rut bulunamadı');
    rut.branch_name = branch; rut.rut_number = rutNum;
    return ok(res, { success: true });
  }

  if (req.method === 'DELETE') {
    if (rut) DIST_RUTS.splice(DIST_RUTS.indexOf(rut), 1);
    return ok(res, { success: true });
  }

  err(res, 405, 'Method not allowed');
};
