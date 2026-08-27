/* ============================================================
   NEOINVENT V4 — Ventas (historial, detalle, anulación)
   ============================================================ */
(function () {
  'use strict';
  const U = Utils;

  const def = {
    title: 'Ventas',
    subtitle: 'Historial y gestión de ventas',
    render() {
      const db = Store.get();
      const rows = db.sales.slice().reverse().map(s => {
        const cust = Store.customerById(s.customerId);
        const pill = s.cancelled ? 'pill-out' : 'pill-ok';
        return '<tr>' +
          '<td><strong>' + U.esc(s.folio) + '</strong></td>' +
          '<td>' + U.fmtDateTime(s.date) + '</td>' +
          '<td>' + U.esc(cust ? cust.name : '—') + '</td>' +
          '<td>'+ U.esc(s.method) + '</td>' +
          '<td class="num">' + U.money(s.total) + '</td>' +
          '<td><span class="pill ' + pill + '">' + (s.cancelled ? 'Anulada' : 'OK') + '</span></td>' +
          '<td class="actions">' +
          '<button class="icon-btn" data-view="' + s.id + '" title="Ver">👁</button>' +
          (s.cancelled ? '' : '<button class="icon-btn danger" data-cancel="' + s.id + '" title="Anular">✕</button>') +
          '</td></tr>';
      });
      const sum = db.sales.filter(s => !s.cancelled).reduce((a, s) => a + s.total, 0);
      return '<div class="kpis">' + U.kpiCard({ label: 'Ventas activas', value: db.sales.filter(s => !s.cancelled).length }) +
        U.kpiCard({ label: 'Ingresos', value: U.money(sum), tone: 'pos' }) +
        U.kpiCard({ label: 'Anuladas', value: db.sales.filter(s => s.cancelled).length }) + '</div>' +
        '<div class="toolbar"><div class="toolbar-left"></div><button class="btn btn-outline" data-exp>Exportar CSV</button></div>' +
        U.table(['Folio', 'Fecha', 'Cliente', 'Método', 'Total', 'Estado', ''], rows, 'Aún no hay ventas');
    },
    mount(ctx, el) {
      el.querySelector('[data-exp]').addEventListener('click', () => {
        const db = Store.get();
        U.exportCSV('ventas', db.sales.map(s => ({
          Folio: s.folio, Fecha: s.date, Cliente: (Store.customerById(s.customerId) || {}).name,
          Metodo: s.method, Subtotal: s.subtotal, Descuento: s.discount, Total: s.total, Estado: s.cancelled ? 'ANULADA' : 'OK'
        })));
      });
      el.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => viewSale(ctx, b.dataset.view)));
      el.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => cancelSale(ctx, b.dataset.cancel)));
    },
  };

  function viewSale(ctx, id) {
    const s = Store.get().sales.find(x => x.id === id);
    if (!s) return;
    const rows = s.items.map(i => {
      const p = Store.productById(i.productId);
      return '<tr><td>' + U.esc(p ? p.name : '?') + '</td><td class="num">' + i.qty + '</td>' +
        '<td class="num">' + U.money(i.price) + '</td><td class="num">' + U.money(i.price * i.qty) + '</td></tr>';
    }).join('');
    UI.modal('Venta ' + s.folio,
      '<p>' + U.fmtDateTime(s.date) + ' · ' + U.esc((Store.customerById(s.customerId) || {}).name || '') + ' · ' + U.esc(s.method) + ' · ' + U.esc(s.user) + '</p>' +
      U.table(['Producto', 'Cant.', 'Precio', 'Total'], rows ? [rows] : []) +
      '<div class="cart-totals"><div><span>Subtotal</span><strong>' + U.money(s.subtotal) + '</strong></div>' +
      (s.tax ? '<div><span>Imp.</span><strong>' + U.money(s.tax) + '</strong></div>' : '') +
      (s.discount ? '<div><span>Desc.</span><strong>−' + U.money(s.discount) + '</strong></div>' : '') +
      '<div class="total"><span>TOTAL</span><strong>' + U.money(s.total) + '</strong></div></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" data-cancel>Cerrar</button></div>');
    document.querySelector('#modal-body [data-cancel]').addEventListener('click', UI.closeModal);
  }

  function cancelSale(ctx, id) {
    const db = Store.get();
    const s = db.sales.find(x => x.id === id);
    if (!s || s.cancelled) return;
    if (!confirm('¿Anular la venta ' + s.folio + '? Se regresará el stock.')) return;
    // devolver stock
    s.items.forEach(i => Store.adjustStock(i.productId, 'entrada', i.qty, 'Anulación ' + s.folio, ctx.currentUser.username));
    s.cancelled = true;
    Store.persist();
    UI.toast('Venta anulada y stock restaurado', 'success');
    ctx.reload();
  }

  App.register('sales', def);
})();