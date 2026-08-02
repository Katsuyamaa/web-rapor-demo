'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  // Demo: XLSM parsing is out of scope (no filesystem); returns a plausible summary.
  ok(res, { success: true, counts: { dolap: 8, dondurma: 3, sandvic: 2, pasta: 2, ruts: 20 } });
};
