'use strict';
/** Excel (.xlsx) generation helper using the `xlsx` (SheetJS) package. */
const XLSX = require('xlsx');

/**
 * sheets: [{ name, rows: [ {col: val, ...}, ... ] }]
 */
function buildWorkbookBuffer(sheets) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows && rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, (name || 'Sayfa1').slice(0, 31));
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function sendXlsx(res, filename, sheets) {
  const buf = buildWorkbookBuffer(sheets);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.end(buf);
}

module.exports = { buildWorkbookBuffer, sendXlsx };
