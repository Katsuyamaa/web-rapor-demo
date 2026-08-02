'use strict';
const { ok, err, readBody, requireAuth } = require('../../../_lib/http');
const { SUPPORT_TICKETS, SUPPORT_COMMENTS, nextCommentId } = require('../../../_lib/fixtures');

function canView(ticket, user) { return user.role === 'admin' || ticket.user_id === user.id; }

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const id = parseInt(req.query.id, 10);
  const ticket = SUPPORT_TICKETS.find((t) => t.id === id);
  if (!ticket) return err(res, 404, 'Bulunamadı.');
  const isAdmin = user.role === 'admin';
  if (!canView(ticket, user)) return err(res, 403, 'Yetki yok.');
  if (!isAdmin && ['cozuldu', 'reddedildi'].includes(ticket.status)) return err(res, 400, 'Kapatılmış taleplere yorum eklenemez.');
  const body = await readBody(req);
  const comment = (body.comment || '').trim();
  if (!comment) return err(res, 400, 'Yorum boş olamaz.');
  const c = { id: nextCommentId(), ticket_id: id, user_id: user.id, comment, is_admin: isAdmin ? 1 : 0, created_at: new Date().toISOString(), username: user.username };
  if (!SUPPORT_COMMENTS[id]) SUPPORT_COMMENTS[id] = [];
  SUPPORT_COMMENTS[id].push(c);
  if (isAdmin && ticket.status === 'yeni') ticket.status = 'inceleniyor';
  ok(res, { success: true, comment: c }, 201);
};
