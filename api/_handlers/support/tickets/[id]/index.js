'use strict';
const { ok, err, readBody, requireAuth } = require('../../../../_lib/http');
const { SUPPORT_TICKETS, SUPPORT_COMMENTS } = require('../../../../_lib/fixtures');

const VALID_STATUSES = new Set(['yeni', 'inceleniyor', 'cozuldu', 'reddedildi']);
function canView(ticket, user) { return user.role === 'admin' || ticket.user_id === user.id; }

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  const id = parseInt(req.query.id, 10);
  const ticket = SUPPORT_TICKETS.find((t) => t.id === id);
  const isAdmin = user.role === 'admin';

  if (req.method === 'GET') {
    if (!ticket) return err(res, 404, 'Bulunamadı.');
    if (!canView(ticket, user)) return err(res, 403, 'Yetki yok.');
    return ok(res, { ticket: { ...ticket, comments: SUPPORT_COMMENTS[id] || [] } });
  }

  if (req.method === 'PATCH') {
    if (!ticket) return err(res, 404, 'Bulunamadı.');
    if (!canView(ticket, user)) return err(res, 403, 'Yetki yok.');
    const body = await readBody(req);
    if (isAdmin) {
      if (body.status && VALID_STATUSES.has(body.status)) ticket.status = body.status;
      if (body.priority && [1, 2, 3].includes(parseInt(body.priority, 10))) ticket.priority = parseInt(body.priority, 10);
    } else {
      if (ticket.status !== 'yeni') return err(res, 400, 'Yalnızca yeni durumdaki talepler düzenlenebilir.');
      if ('title' in body) ticket.title = String(body.title).slice(0, 255);
      if ('description' in body) ticket.description = String(body.description);
    }
    ticket.updated_at = new Date().toISOString();
    return ok(res, { success: true });
  }

  if (req.method === 'DELETE') {
    if (user.role !== 'admin') return err(res, 403, 'Yetki yok.');
    if (!ticket) return err(res, 404, 'Bulunamadı.');
    SUPPORT_TICKETS.splice(SUPPORT_TICKETS.indexOf(ticket), 1);
    delete SUPPORT_COMMENTS[id];
    return ok(res, { success: true });
  }

  err(res, 405, 'Method not allowed');
};
