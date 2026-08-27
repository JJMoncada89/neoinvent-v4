/* ============================================================
   NEOINVENT V4 — Dashboard
   ============================================================ */
(function () {
  'use strict';
  const U = Utils;

  function isToday(iso) {
    const d = new Date(iso), n = new Date();
    return d.toDateString() === n.toDateString();
  }

  const def = {
    title: 'Dashboard',
    subtitle: 'Resumen general del negocio',
    render() {
      const db = Store.get();
      const days = 7;

      const ventasHoy = db.sales.filter(s => !s.cancelled && isToday(s.date));
      const totalHoy = ventasHoy.reduce((a, s) => a + s.total, 0);
      const ventasHist = db.sales.filter(s => !s.cancelled);
      const ingresos = ventasHist.reduce((a, s) => a + s.total, 0);
      const costos = ventasHist.reduce((a, s) => a + s.items.reduce((x, i) => x + i.cost * i.qty, 0), 0);
      const ganancia = ingresos - costos;
      const bajoStock = db.products.filter(p => p.stock <= p.stockMin);
      const valorInv = db.products.reduce((a, p) => a + p.cost * p.stock, 0);

      const kpis = U.kpiCard({ label: 'Ventas de hoy', value: U.money(totalHoy), sub: ventasHoy.length + ' venta(s)' }) +
        U.kpiCard({ label: 'Ingresos totales', value: U.money(ingresos), sub: ventasHist.length + ' ventas' }) +
        U.kpiCard({ label: 'Ganancia', value: U.money(ganancia), tone: 'pos' }) +
        U.kpiCard({ label: 'Valor de inventario', value: U.money(valorInv), tone: 'info' }) +
        U.kpiCard({ label: 'Productos', value: db.products.length, sub: bajoStock.length + ' bajo stock' }) +
        U.kpiCard({ label: 'Clientes', value: db.customers.length });

      const data7 = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toDateString();
        const sum = db.sales.filter(s => !s.cancelled && new Date(s.date).toDateString() === key)
          .reduce((a, s) => a + s.total, 0);
        data7.push({ label: d.toLocaleDateString('es', { day: '2-digit', month: 'short' }), value: sum });
      }
      const bar = UI.barChart(data7, 180);

      const perProduct = {};
      db.sales.filter(s => !s.cancelled).forEach(s => s.items.forEach(i => {
        perProduct[i.productId] = (perProduct[i.productId] || 0) + i.qty;
      }));
      const top = Object.entries(perProduct).sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([id, qty]) => { const p = Store.productById(id); return p ? '<div class="top"><span>' + U.esc(p.name) + '</span><strong>×' + qty + '</strong></div>' : ''; }).join('');

      const lowRows = bajoStock.map(p =>
        '<tr><td>' + U.esc(p.name) + '</td><td class="num">' + p.stock + '</td><td class="num">' + p.stockMin + '</td></tr>').join('');

      return '<div class="kpis">' + kpis + '</div>' +
        '<div class="grid">' +
        '<div class="card"><div class="card-title">Ventas — últimos 7 días</div>' + bar + '</div>' +
        '<div class="card"><div class="card-title">Productos más vendidos</div>' + (top || '<div class="empty">Sin ventas aún</div>') + '</div>' +
        '</div>' +
        '<div class="card"><div class="card-title">Productos bajo stock (' + bajoStock.length + ')</div>' +
        (bajoStock.length ? U.table(['Producto', 'Stock', 'Mínimo'], lowRows ? [lowRows] : [], '') : '<div class="empty">Todo en niveles óptimos ✓</div>') + '</div>';
    },
  };

  App.register('dashboard', def);
})();