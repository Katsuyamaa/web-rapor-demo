import client from './client'

// ── Warehouses ────────────────────────────────────────────
export const getWarehouses = () =>
  client.get('/cost/warehouses').then(r => r.data)

// ── Products ──────────────────────────────────────────────
export const getProducts = (ambar = '') =>
  client.get('/cost/products', { params: ambar ? { ambar } : {} }).then(r => r.data)

export const createProduct = (data) =>
  client.post('/cost/products', data).then(r => r.data)

export const updateProduct = (id, data) =>
  client.put(`/cost/products/${id}`, data).then(r => r.data)

export const archiveProduct = (id) =>
  client.delete(`/cost/products/${id}`).then(r => r.data)

export const restoreProduct = (id) =>
  client.patch(`/cost/products/${id}/restore`).then(r => r.data)

export const getProductsWithStock = (ambar = '', showArchived = false) =>
  client.get('/cost/products/with-stock', { params: { ...(ambar ? { ambar } : {}), ...(showArchived ? { show_archived: 'true' } : {}) } }).then(r => r.data)

// ── Inventory ─────────────────────────────────────────────
export const getInventory = (dateStr, ambar = '') =>
  client.get('/cost/inventory', { params: ambar ? { date: dateStr, ambar } : { date: dateStr } }).then(r => r.data)

export const initInventory = (dateStr, ambar = '') =>
  client.post('/cost/inventory/init', null, { params: ambar ? { date: dateStr, ambar } : { date: dateStr } }).then(r => r.data)

export const bulkSave = (entries, cascade = false) =>
  client.post(`/cost/inventory/bulk?cascade=${cascade}`, { entries }).then(r => r.data)

export const setMevcut = (productId, dateStr, mevcut) =>
  client.patch('/cost/inventory/set-mevcut', { product_id: productId, date: dateStr, mevcut }).then(r => r.data)

export const syncPrevDay = (dateStr, ambar = '') =>
  client.post('/cost/inventory/sync-prev', null, { params: ambar ? { date: dateStr, ambar } : { date: dateStr } }).then(r => r.data)

export const getInventoryDiff = (dateStr, threshold = 50) =>
  client.get('/cost/inventory/diff', { params: { date: dateStr, threshold } }).then(r => r.data)

export const updateDivisor = (id, divisor) =>
  client.patch(`/cost/products/${id}/divisor`, { divisor }).then(r => r.data)

export const getProductHistory = (pid, months = 3) =>
  client.get(`/cost/products/${pid}/history`, { params: { months } }).then(r => r.data)

export const setEntryField = (id, field, value) =>
  client.patch('/cost/inventory/set-field', { id, field, value }).then(r => r.data)

export const resetUretim = (productId, date) =>
  client.patch('/cost/inventory/reset-uretim', { product_id: productId, date }).then(r => r.data)

export const resetEntry = (entryId) =>
  client.patch('/cost/inventory/reset-entry', { entry_id: entryId }).then(r => r.data)

export const importProductsFromErp = (ambar) =>
  client.post('/cost/products/import-from-erp', null, { params: { ambar } }).then(r => r.data)

// ── Column Labels ──────────────────────────────────────────────────────────────
export const getColumnLabels = (ambar) =>
  client.get('/cost/column-labels', { params: ambar ? { ambar } : {} }).then(r => r.data)

export const saveColumnLabels = (ambar, labels) =>
  client.post('/cost/column-labels', { ambar, labels }).then(r => r.data)

// ── Report ────────────────────────────────────────────────
export const getReportProducts = (ambar = '') =>
  client.get('/cost/report/products', { params: ambar ? { ambar } : {} })
    .then(r => r.data.products || [])

export const getCostReport = (params) =>
  client.get('/cost/report', { params }).then(r => r.data)

export const getCostReportExcelUrl = (params) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') p.set(k, v) })
  return `/api/cost/report/excel?${p.toString()}`
}
