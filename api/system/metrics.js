'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { TRANSFERS, USERS, UPLOAD_HISTORY } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  ok(res, {
    cpu_percent: 8.5, ram_used_mb: 512, ram_total_mb: 2048, ram_percent: 25.0,
    disk_used_gb: 12.4, disk_total_gb: 50.0, disk_percent: 24.8,
    doc_count: new Set(TRANSFERS.map((r) => r.dokuman_no)).size,
    user_count: USERS.length,
    last_upload: UPLOAD_HISTORY.length ? UPLOAD_HISTORY[UPLOAD_HISTORY.length - 1].upload_date.slice(0, 10) : null,
  });
};
