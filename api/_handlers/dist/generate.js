'use strict';
const { err, readBody, requireAuth } = require('../../_lib/http');
const { DIST_TEMPLATES, DIST_TEMPLATE_PRODUCTS, DIST_RUTS, ORDERS } = require('../../_lib/fixtures');
const { sendXlsx } = require('../../_lib/xlsx');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const dateStr = (body.date || '').trim();
  const templateNames = body.templates || [];
  if (!dateStr) return err(res, 400, 'Tarih gerekli');
  if (!templateNames.length) return err(res, 400, 'En az bir şablon seçilmeli');

  const orderRows = ORDERS.filter((o) => o.order_date === dateStr);
  const byBranchProduct = new Map();
  for (const o of orderRows) {
    const key = o.branch + '||' + o.stok_adi;
    byBranchProduct.set(key, (byBranchProduct.get(key) || 0) + o.miktar);
  }

  const sheets = [];
  for (const name of templateNames) {
    const tmpl = DIST_TEMPLATES.find((t) => t.name === name);
    if (!tmpl) continue;
    const products = (DIST_TEMPLATE_PRODUCTS[tmpl.id] || []).map((p) => p.product_name);
    const rows = DIST_RUTS.slice().sort((a, b) => a.rut_number - b.rut_number).map((r) => {
      const row = { 'Rut': r.rut_number, 'Şube': r.branch_name };
      for (const p of products) row[p] = byBranchProduct.get(r.branch_name + '||' + p) || 0;
      return row;
    });
    sheets.push({ name: (name.toUpperCase()).slice(0, 31), rows });
  }
  if (!sheets.length) return err(res, 400, 'Seçili şablonlar bulunamadı');

  sendXlsx(res, `dagitim_${dateStr}.xlsx`, sheets);
};
