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
        '<button class="btn btn-outline" data-libro-ventas>🏛️ Libro Ventas TXT</button>' +
        '<button class="btn btn-outline" data-libro-compras>🏛️ Libro Compras TXT</button>' +
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

      // ===== 4.5 Libros IVA SENIAT (TXT) — dual backend/local =====
      async function descargarLibro(tipo) {
        const mes = new Date().getMonth() + 1, anio = new Date().getFullYear();
        const jwt = localStorage.getItem('neoinvent_jwt') || '';
        // 1º intentar backend
        try {
          const res = await fetch(API.apiBase() + '/api/v1/fiscal/libros?tipo=' + tipo + '&mes=' + mes + '&anio=' + anio, {
            headers: { Authorization: 'Bearer ' + jwt },
          });
          if (res.ok) {
            const blob = await res.blob();
            U.downloadBlob(blob, 'LIBRO_' + tipo.toUpperCase() + '_' + String(mes).padStart(2, '0') + '_' + anio + '.txt');
            UI.toast('Libro ' + tipo + ' descargado (formato SENIAT)', 'success');
            return;
          }
        } catch { /* fallback local */ }

        // 2º fallback local: generar TXT con las mismas columnas
        const db = Store.get();
        const rif = db.settings.seniatRif || 'J-99999999-0';
        const data = tipo === 'ventas' ? (db.sales || []).filter(s => !s.cancelled) : (db.purchaseOrders || []);
        const mesStr = String(mes).padStart(2, '0');
        const lines = ['LIBRO DE ' + tipo.toUpperCase() + ' (IVA)', 'PERIODO: ' + mesStr + '/' + anio, 'RIF: ' + rif];
        data.filter(x => x.date && new Date(x.date).getMonth() + 1 === mes).forEach(x => {
          lines.push([
            tipo === 'ventas' ? (x.folio || x.id) : (x.po_number || x.id),
            tipo === 'ventas' ? ((Store.customerById(x.customerId) || {}).name || 'Consumidor Final').toUpperCase() : (x.supplier || 'PROVEEDOR').toUpperCase(),
            new Date(x.date || x.fecha).toLocaleDateString('es'),
            x.subtotal || 0, x.tax || x.iva || 0, x.total || 0,
          ].join('|'));
        });
        lines.push('TOTAL REGISTROS: ' + (data.length));
        lines.push('NOTA: ARCHIVO GENERADO PARA DECLARACION ANTE EL SENIAT. VERIFICAR CON CONTADOR.');
        U.downloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=iso-8859-1' }), 'LIBRO_' + tipo.toUpperCase() + '_' + mesStr + '_' + anio + '.txt');
        Store.logEvent('EXPORT', 'fiscal-libros', 'Libro ' + tipo + ' ' + mesStr + '/' + anio + ' exportado', ctx.currentUser?.username);
        UI.toast('Libro ' + tipo + ' generado (local)', 'success');
      }
      el.querySelector('[data-libro-ventas]').addEventListener('click', () => descargarLibro('ventas'));
      el.querySelector('[data-libro-compras]').addEventListener('click', () => descargarLibro('compras'));
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