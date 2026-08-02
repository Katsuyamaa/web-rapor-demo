'use strict';
const { ok, err, requireAuth } = require('./_lib/http');

// File-upload endpoint stubbed: the demo has no filesystem/DB to persist parsed Excel rows into.
module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  ok(res, { success: true, message: '(Demo) Dosya yükleme bu ortamda devre dışı — örnek veri seti zaten hazır.' });
};
