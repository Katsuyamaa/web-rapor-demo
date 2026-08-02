'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const start = body.start_date || '2026-08-02';
  const end = body.end_date || start;
  // Stateless demo: ERP is not reachable, so we simulate a successful pull without persisting anything.
  ok(res, { success: true, message: `(Demo) ${start} - ${end} aralığı için örnek veri zaten hazır; gerçek ERP bağlantısı bu demoda devre dışı.` });
};
