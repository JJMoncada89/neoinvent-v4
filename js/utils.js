/* ============================================================
   NEOINVENT V4 — Utils (helpers de formato, CSV, DOM)
   ============================================================ */
(function (global) {
  'use strict';

  // ---------- Moneda ----------
  function money(n) {
    const cur = (Store.get()?.settings?.currency) || 'USD';
    const symbols = { USD: '$', MXN: '$', EUR: '€', COP: '$', PEN: 'S/', ARS: '$' };
    const sym = symbols[cur] || cur + ' ';
    return sym + Number(n || 0).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---------- Fechas ----------
  function fmtDateStr(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d)) return '-';
    return d.toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function todayISO() {
    return new Date().toISOString();
  }

  // ---------- CSV export ----------
  function exportCSV(filename, rows) {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      const s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(',')];
    rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(',')));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename + '.csv');
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  // ---------- Validación/parseo de número ----------
  function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  // ---------- Escape de entidades para HTML ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Descarga de JSON ----------
  function downloadJSON(blob, filename) {
    downloadBlob(blob, filename);
  }

  // ---------- Ripple / util misc ----------
  global.Utils = {
    money, fmtDateStr, fmtDateTime, todayISO, exportCSV, downloadBlob, downloadJSON, num, esc, uid: Store.uid,
  };
})(window);