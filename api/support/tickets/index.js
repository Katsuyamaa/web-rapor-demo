'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { SUPPORT_TICKETS, SUPPORT_COMMENTS, USERS, nextTicketId } = require('../../_lib/fixtures');

const VALID_TYPES = new Set(['hata', 'istek', 'soru']);
const VALID_STATUSES = new Set(['yeni', 'inceleniyor', 'cozuldu', 'reddedildi']);

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  const isAdmin = user.role === 'admin';

  if (req.method === 'POST') {
    const body = await readBody(req);
    const title = (body.title || '').trim();
    const description = (body.description || '').trim();
    if (!title) return err(res, 400, 'Başlık gerekli.');
    if (title.length > 255) return err(res, 400, 'Başlık en fazla 255 karakter.');
    if (!description || description.length < 10) return err(res, 400, 'Açıklama en az 10 karakter olmalı.');
    const type = VALID_TYPES.has(body.type) ? body.type : 'soru';
    const id = nextTicketId();
    const ticket = {
      id, user_id: user.id, type, title, description, status: 'yeni', priority: 2,
      page_url: (body.page_url || '').slice(0, 255), user_agent: (req.headers['user-agent'] || '').slice(0, 512),
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), username: user.username,
    };
    SUPPORT_TICKETS.push(ticket);
    SUPPORT_COMMENTS[id] = [];
    return ok(res, { success: true, ticket }, 201);
  }

  if (req.method === 'GET') {
    const { status, type } = req.query;
    let rows = SUPPORT_TICKETS.slice();
    if (!isAdmin) rows = rows.filter((t) => t.user_id === user.id);
    else if (req.query.user_id) rows = rows.filter((t) => t.user_id === parseInt(req.query.user_id, 10));
    if (status && VALID_STATUSES.has(status)) rows = rows.filter((t) => t.status === status);
    if (type && VALID_TYPES.has(type)) rows = rows.filter((t) => t.type === type);
    rows = rows.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 200);
    return ok(res, { data: rows });
  }

  err(res, 405, 'Method not allowed');
};
