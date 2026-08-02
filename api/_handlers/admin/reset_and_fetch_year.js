'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  ok(res, { success: true, message: '(Demo) Bu işlem canlı ortamda devre dışıdır; fixture verisi zaten tüm yılı kapsar.' });
};
