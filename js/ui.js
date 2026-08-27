/* ============================================================
   NEOINVENT V4 — UI (componentes reutilizables)
   Modal, toast, tablas, tarjetas KPI y gráficas SVG propias.
   ============================================================ */
(function (global) {
  'use strict';

  const U = Utils;

  // ---------- Toast ----------
  const toastEl = () => document.getElementById('toast');
  let toastTimer = null;
  function toast(msg, type) {
    const t = toastEl();
    t.textContent = msg;
    t.className = 'toast show ' + (type || 'info');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
  }

  // ---------- Modal ----------
  const modalOverlay = () => document.getElementById('modal-overlay');
  const modalBody = () => document.getElementById('modal-body');
  const modalTitle = () => document.getElementById('modal-title');

  function modal(title, html) {
    modalTitle().textContent = title;
    modalBody().innerHTML = html;
    modalOverlay().hidden = false;
  }
  function closeModal() {
    modalOverlay().hidden = true;
  }
  function openModal(title, html) { modal(title, html); }
  function isLoading(){
    return modalOverlay().hidden;
  }

  // ---------- KPI card ----------
  function kpiCard({ label, value, sub, tone }) {
    return '<div class="kpi"><div class="kpi-label">' + U.esc(label) + '</div>' +
      '<div class="kpi-value ' + (tone || '') + '">' + U.esc(value) + '</div>' +
      (sub ? '<div class="kpi-sub">' + sub + '</div>' : '') + '</div>';
  }

  // ---------- Tabla genérica ----------
  function table(headers, rowsHtml, emptyMsg) {
    if (!rowsHtml || !rowsHtml.length) {
      return '<div class="empty">' + U.esc(emptyMsg || 'Sin datos') + '</div>';
    }
    const thead = '<thead><tr>' + headers.map(h => '<th>' + U.esc(h) + '</th>').join('') + '</tr></thead>';
    return '<div class="table-wrap"><table class="table">' + thead + '<tbody>' + rowsHtml.join('') + '</tbody></table></div>';
  }

  // ---------- Barra SVG ----------
  function barChart(data, height) {
    // data: [{label, value}]
    if (!data || !data.length) return '<div class="empty">Sin datos para graficar</div>';
    const h = height || 180;
    const w = 480;
    const max = Math.max.apply(null, data.map(d => d.value)) || 1;
    const bw = (w - 40) / data.length;
    let bars = '';
    data.forEach(d => {
      const barH = Math.max(2, (d.value / max) * (h - 40));
      const x = 20 + data.indexOf(d) * bw;
      bars += '<rect x="' + x + '" y="' + (h - 20 - barH) + '" width="' + (bw - 8) + '" height="' + barH +
        '" rx="4" fill="#22d3ee" opacity="0.9"><title>' + U.esc(d.label) + ': ' + d.value + '</title></rect>';
      bars += '<text x="' + (x + bw / 2 - 4) + '" y="' + (h - 4) + '" font-size="8" fill="#94a3b8" text-anchor="middle">' + U.esc(String(d.label)) + '</text>';
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart">' + bars + '</svg>';
  }

  // ---------- Donut SVG ----------
  function donutChart(segments, total) {
    // segments: [{value, color, label}]
    const sum = segments.reduce((a, s) => a + s.value, 0) || 1;
    const r = 40, cx = 60, cy = 60;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    let paths = '';
    segments.forEach(s => {
      const frac = s.value / sum;
      const dash = frac * circ;
      paths += '<circle r="' + r + '" cx="' + cx + '" cy="' + cy + '" fill="none" stroke="' + s.color +
        '" stroke-width="14" stroke-dasharray="' + dash + ' ' + (circ - dash) +
        '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')">' +
        '<title>' + U.esc(s.label) + ': ' + s.value + '</title></circle>';
      offset += dash;
    });
    const html = '<svg viewBox="0 0 120 120" class="donut">' + paths + '</svg>' +
      '<div class="donut-center">' + U.esc(total) + '</div>';
    return '<div class="donut-wrap">' + html + '</div>';
  }

  // ---------- Inputs form helpers ----------
  function field(label, innerHtml, id) {
    return '<div class="field" ' + (id ? 'id="' + id + '"' : '') + '><label>' + U.esc(label) + '</label>' + innerHtml + '</div>';
  }

  global.UI = { toast, modal, closeModal, kpiCard, table, barChart, donutChart, field };

  // Las vistas referencian estos helpers a través de `Utils` (alias U):
  // exponerlos también ahí para compatibilidad, sin duplicar lógica.
  Object.assign(global.Utils, { kpiCard, table, field, barChart, donutChart });
})(window);