/* ============================================================
   NEOINVENT V4 — Reportes
   ============================================================ */
(function () {
  'use strict';
  const U = Utils;

  const def = {
    title: 'Reportes',
    subtitle: 'Ventas y exportación',
    render() {
      const db = Store.get();
      const rows = db.sales.slice().reverse().map(s => saleRow(s));
      return '<div class="toolbar"><div class="toolbar-left">' +
        '<input type="date" id="rp-from" class="input"><input type="date" id="rp-to" class="input">' +
        '<button class="btn btn-outline" data-filter>Filtrar</button>' +
        '<button class="btn btn-outline" data-csv>Exportar CSV</button>' +
        '</div></div>' +
        '<div class="card" id="rp-container"><div class="card-title">Detalle de ventas</div>' +
        U.table(['Folio', 'Fecha', 'Cliente', 'Método', 'Subtotal', 'Desc.', 'Total', 'Estado'], rows, 'Sin ventas') + '</div>';
    },
    mount(ctx, el) {
      const container = el.querySelector('#rp-container');
      el.querySelector('[data-filter]').addEventListener('click', () => {
        const from = document.getElementById('rp-from').value;
        const to = document.getElementById('rp-to').value;
        let list = Store.get().sales.slice();
        if (from) list = list.filter(s => new Date(s.date) >= new Date(from + 'T00:00:00'));
        if (to) list = list.filter(s => new Date(s.date) <= new Date(to + 'T23:59:59'));
        const rows = list.slice().reverse().map(saleRow);
        const old = container.querySelector('.table-wrap, .empty');
        if (old) container.removeChild(old);
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        wrap.innerHTML = U.table(['Folio', 'Fecha', 'Cliente', 'Método', 'Subtotal', 'Desc.', 'Total', 'Estado'], rows, 'Sin ventas');
        container.appendChild(wrap);
      });
      el.querySelector('[data-csv]').addEventListener('click', () => {
        const db = Store.get();
        U.exportCSV('reporte_ventas', db.sales.map(s => ({
          Folio: s.folio, Fecha: s.date, Cliente: (Store.customerById(s.customerId) || {}).name,
          Metodo: s.method, Subtotal: s.subtotal, Descuento: s.discount, Total: s.total, Estado: s.cancelled ? 'ANULADA' : 'OK'
        })));
      });
    },
  };

  function saleRow(s) {
    const cust = Store.customerById(s.customerId);
    return '<tr><td>' + U.esc(s.folio) + '</td><td>' + U.fmtDateTime(s.date) + '</td>' +
      '<td>' + U.esc(cust ? cust.name : '—') + '</td><td>' + U.esc(s.method) + '</td>' +
      '<td class="num">' + U.money(s.subtotal) + '</td><td class="num">' + U.money(s.discount) + '</td>' +
      '<td class="num"><strong>' + U.money(s.total) + '</strong></td>' +
      '<td>' + (s.cancelled ? '<span class="pill pill-out">Anulada</span>' : '<span class="pill pill-ok">OK</span>') + '</td></tr>';
  }

  App.register('reports', def);
})();