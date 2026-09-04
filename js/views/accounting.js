/* ============================================================
   NEOINVENT ENTERPRISE — CONTABILIDAD (Fase 4)
   COA · Libro Diario · Balance General · PyG · Declaración IVA
   Local-first: calcula desde ventas/compras/nómina del Store
   ============================================================ */
(function () {
  'use strict';
  const U = Utils, K = Store.uid;

  // Plan de cuentas venezolano (sincronizado con backend seed)
  const COA = [
    { code: '1.1.1.01', name: 'Caja', type: 'ACTIVO' },
    { code: '1.1.1.02', name: 'Banco', type: 'ACTIVO' },
    { code: '1.1.2.01', name: 'Cuentas por cobrar clientes', type: 'ACTIVO' },
    { code: '1.1.3.01', name: 'Inventario de mercancías', type: 'ACTIVO' },
    { code: '1.1.4.01', name: 'IVA acreditable (compras)', type: 'ACTIVO' },
    { code: '2.1.1.01', name: 'Cuentas por pagar proveedores', type: 'PASIVO' },
    { code: '2.1.2.01', name: 'IVA por pagar (ventas)', type: 'PASIVO' },
    { code: '2.1.3.01', name: 'Retenciones IVSS por pagar', type: 'PASIVO' },
    { code: '2.1.3.02', name: 'Retenciones FAOV por pagar', type: 'PASIVO' },
    { code: '2.1.3.03', name: 'Retenciones ISLR por pagar', type: 'PASIVO' },
    { code: '2.1.4.01', name: 'Sueldos por pagar', type: 'PASIVO' },
    { code: '3.1.1.01', name: 'Capital social', type: 'PATRIMONIO' },
    { code: '4.1.1.01', name: 'Ventas de mercancías', type: 'INGRESO' },
    { code: '5.1.1.01', name: 'Costo de ventas', type: 'GASTO' },
    { code: '5.2.1.01', name: 'Gasto de sueldos y salarios', type: 'GASTO' },
  ];

  // Construye asientos locales desde las colecciones del Store
  function buildLocalEntries() {
    const db = Store.get();
    const entries = [];
    let n = 0;
    const num = () => 'AS-L-' + String(++n).padStart(4, '0');

    (db.sales || []).filter(s => s.status !== 'CANCELADA' && !s.cancelled).forEach(s => {
      entries.push({
        entry_number: num(), fecha: s.date, source: 'VENTA', ref: s.folio,
        lines: [
          { code: '1.1.1.01', name: 'Caja', debit: s.total, credit: 0 },
          { code: '4.1.1.01', name: 'Ventas de mercancías', debit: 0, credit: s.subtotal },
          { code: '2.1.2.01', name: 'IVA por pagar (ventas)', debit: 0, credit: s.tax || s.iva || 0 },
        ],
      });
    });
    (db.purchaseOrders || []).forEach(po => {
      entries.push({
        entry_number: num(), fecha: po.fecha, source: 'COMPRA', ref: po.po_number,
        lines: [
          { code: '1.1.3.01', name: 'Inventario de mercancías', debit: po.subtotal, credit: 0 },
          { code: '1.1.4.01', name: 'IVA acreditable', debit: po.iva, credit: 0 },
          { code: '2.1.1.01', name: 'Ctas por pagar proveedores', debit: 0, credit: po.total },
        ],
      });
    });
    (db.payrolls || []).forEach(pr => {
      entries.push({
        entry_number: num(), fecha: pr.fecha, source: 'NOMINA', ref: pr.periodo,
        lines: [
          { code: '5.2.1.01', name: 'Gasto sueldos y salarios', debit: pr.totales.base, credit: 0 },
          { code: '2.1.4.01', name: 'Sueldos por pagar', debit: 0, credit: pr.totales.neto },
          { code: '2.1.3.01', name: 'Retenciones por pagar', debit: 0, credit: pr.totales.ded },
        ],
      });
    });
    return entries;
  }

  function computeSaldoCuentas(entries) {
    const saldos = {};
    COA.forEach(c => { saldos[c.code] = { ...c, saldo: 0 }; });
    entries.forEach(e => e.lines.forEach(l => {
      if (saldos[l.code]) saldos[l.code].saldo += (l.debit || 0) - (l.credit || 0);
    }));
    return Object.values(saldos);
  }

  const def = {
    title: 'Contabilidad',
    subtitle: 'Plan de cuentas, libro diario, balance y declaraciones',
    render() {
      return '<div class="toolbar"><div class="toolbar-left">' +
        '<select id="acc-view" class="input" style="max-width:220px">' +
        '<option value="journal">📗 Libro Diario</option>' +
        '<option value="balance">⚖️ Balance General</option>' +
        '<option value="pnl">📈 Estado de Resultados</option>' +
        '<option value="iva">🏛️ Declaración IVA</option>' +
        '<option value="coa">📋 Plan de Cuentas</option>' +
        '</select>' +
        '<span class="pill pill-in">Asientos automáticos VENTA/COMPRA/NOMINA</span>' +
        '</div></div>' +
        '<div id="acc-body"></div>';
    },
    mount(ctx, el) {
      const body = el.querySelector('#acc-body');
      const renderView = (v) => {
        const entries = buildLocalEntries();
        if (v === 'journal') {
          const html = entries.slice().reverse().slice(0, 50).map(e => {
            const lines = e.lines.map(l =>
              '<tr><td style="font-family:var(--font-mono);font-size:11px">' + U.esc(l.code) + '</td>' +
              '<td>' + U.esc(l.name) + '</td>' +
              '<td class="num">' + (l.debit ? U.money(l.debit) : '') + '</td>' +
              '<td class="num">' + (l.credit ? U.money(l.credit) : '') + '</td></tr>').join('');
            const ok = Math.abs(e.lines.reduce((a, l) => a + (l.debit || 0) - (l.credit || 0), 0)) < 0.01;
            return '<tr><td colspan="4" style="background:var(--neutral-50)"><strong>' + U.esc(e.entry_number) + '</strong> · ' +
              U.fmtDateStr(e.fecha) + ' · ' + U.esc(e.source) + ' · ' + U.esc(e.ref || '') +
              ' <span class="pill ' + (ok ? 'pill-ok' : 'pill-out') + '">' + (ok ? 'cuadrado' : 'DESCUADRADO') + '</span></td></tr>' + lines;
          }).join('');
          body.innerHTML = '<div class="card"><div class="card-title">Libro Diario (' + entries.length + ' asientos)</div>' +
            (entries.length ? '<div class="table-wrap"><table class="table"><tbody>' + html + '</tbody></table></div>' : '<div class="empty">Sin asientos aún. Genera ventas, compras o nómina.</div>') + '</div>';
        }
        if (v === 'balance' || v === 'pnl') {
          const saldos = computeSaldoCuentas(entries);
          const byType = t => saldos.filter(a => a.type === t && Math.abs(a.saldo) > 0.001);
          const rowsType = (t, sign) => byType(t).map(a => '<tr><td>' + U.esc(a.name) + '</td><td class="num">' + U.money(sign * a.saldo) + '</td></tr>').join('');
          if (v === 'balance') {
            const activo = byType('ACTIVO').reduce((a, x) => a + x.saldo, 0);
            const pasivo = byType('PASIVO').reduce((a, x) => a + x.saldo, 0);
            const ingreso = byType('INGRESO').reduce((a, x) => a + x.saldo, 0);
            const gasto = byType('GASTO').reduce((a, x) => a + x.saldo, 0);
            const utilidad = ingreso - gasto;
            const patrimonioTotal = byType('PATRIMONIO').reduce((a, x) => a + x.saldo, 0) + utilidad;
            body.innerHTML = '<div class="grid"><div class="card"><div class="card-title">ACTIVO</div>' +
              (rowsType('ACTIVO', 1) || '<div class="empty">Sin saldos</div>') +
              '<div class="top"><span><strong>TOTAL ACTIVO</strong></span><strong>' + U.money(activo) + '</strong></div></div>' +
              '<div class="card"><div class="card-title">PASIVO + PATRIMONIO</div>' +
              (rowsType('PASIVO', 1) || '') +
              (rowsType('PATRIMONIO', 1) || '') +
              '<div class="top"><span>Utilidad del período</span><strong>' + U.money(utilidad) + '</strong></div>' +
              '<div class="top"><span><strong>TOTAL PASIVO+PATRIMONIO</strong></span><strong>' + U.money(pasivo + patrimonioTotal) + '</strong></div></div></div>' +
              '<div class="kpis"><div class="kpi"><div class="kpi-label">Ecuación contable</div><div class="kpi-value ' + (Math.abs(activo - pasivo - patrimonioTotal) < 0.01 ? 'pos' : 'neg') + '">' +
              (Math.abs(activo - pasivo - patrimonioTotal) < 0.01 ? '✅ CUADRA' : '⚠️ DESCUADRE ' + U.money(activo - pasivo - patrimonioTotal)) + '</div></div></div>';
          } else {
            const ingresos = byType('INGRESO').reduce((a, x) => a + x.saldo, 0);
            const gastos = byType('GASTO').reduce((a, x) => a + x.saldo, 0);
            body.innerHTML = '<div class="card"><div class="card-title">INGRESOS</div>' + (rowsType('INGRESO', 1) || '<div class="empty">Sin ingresos</div>') +
              '<div class="top"><span><strong>Total ingresos</strong></span><strong>' + U.money(ingresos) + '</strong></div></div>' +
              '<div class="card"><div class="card-title">GASTOS</div>' + (rowsType('GASTO', 1) || '<div class="empty">Sin gastos</div>') +
              '<div class="top"><span><strong>Total gastos</strong></span><strong>' + U.money(gastos) + '</strong></div></div>' +
              '<div class="kpis"><div class="kpi"><div class="kpi-label">UTILIDAD DEL PERÍODO</div><div class="kpi-value ' + (ingresos - gastos >= 0 ? 'pos' : 'neg') + '">' + U.money(ingresos - gastos) + '</div></div></div>';
          }
        }
        if (v === 'iva') {
          const now = new Date();
          const mes = now.getMonth() + 1, anio = now.getFullYear();
          const db = Store.get();
          const ivaVentas = (db.sales || []).filter(s => !s.cancelled && s.date && new Date(s.date).getMonth() + 1 === mes && new Date(s.date).getFullYear() === anio)
            .reduce((a, s) => a + (s.tax || s.iva || 0), 0);
          const ivaCompras = (db.purchaseOrders || []).filter(po => po.fecha && new Date(po.fecha).getMonth() + 1 === mes && new Date(po.fecha).getFullYear() === anio)
            .reduce((a, po) => a + (po.iva || 0), 0);
          const neto = ivaVentas - ivaCompras;
          body.innerHTML = '<div class="kpis">' +
            U.kpiCard({ label: 'IVA débito (ventas)', value: U.money(ivaVentas), sub: 'IVA por pagar generado' }) +
            U.kpiCard({ label: 'IVA crédito (compras)', value: U.money(ivaCompras), sub: 'IVA acreditable' }) +
            U.kpiCard({ label: neto >= 0 ? 'IVA a pagar' : 'Saldo a favor', value: U.money(Math.abs(neto)), tone: neto >= 0 ? 'neg' : 'pos' }) +
            '</div>' +
            '<div class="card"><div class="card-title">Resumen periodo ' + String(mes).padStart(2, '0') + '/' + anio + '</div>' +
            '<p style="color:var(--text-muted);font-size:12.5px">Resumen informativo para la declaración mensual de IVA. Verifique con su contador y el formulario vigente del SENIAT antes de declarar.</p></div>';
        }
        if (v === 'coa') {
          const saldos = computeSaldoCuentas(entries);
          const rows = COA.map(c => {
            const s = saldos.find(x => x.code === c.code);
            return '<tr><td style="font-family:var(--font-mono)">' + c.code + '</td><td>' + U.esc(c.name) + '</td>' +
              '<td><span class="pill pill-in">' + c.type + '</span></td><td class="num">' + U.money(s.saldo) + '</td></tr>';
          }).join('');
          body.innerHTML = '<div class="card"><div class="card-title">Plan de Cuentas (Chart of Accounts)</div>' +
            '<div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th>Saldo</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
        }
      };
      el.querySelector('#acc-view').addEventListener('change', e => renderView(e.target.value));
      renderView('journal');
      Store.logEvent('VIEW', 'contabilidad', 'Acceso a módulo Contabilidad', ctx.currentUser?.username);
    },
  };

  App.register('accounting', def);
})();
