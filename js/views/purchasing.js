/* COMPRAS — Requisiciones, Órdenes de Compra y Recepciones (local-first) */
(function () {
  'use strict';
  const U = Utils, K = Store.uid;

  const def = {
    title: 'Compras',
    subtitle: 'Requisiciones, órdenes de compra y recepción',
    render() {
      const db = Store.get();
      const reqs = (db.requisitions || []).slice().reverse();
      const reqRows = reqs.map(r => {
        const items = (r.items || []).map(i => (i.name || i.producto || '?') + ' ×' + (i.cantidad || i.qty || 0)).join('; ');
        return '<tr><td><strong>' + U.esc(r.codigo || r.id.slice(0, 8)) + '</strong></td>' +
          '<td>' + U.esc(r.department || '—') + '</td>' +
          '<td>' + U.esc(items) + '</td>' +
          '<td><span class="pill ' + (r.status === 'APROBADA' ? 'pill-ok' : r.status === 'EN_PROCESO' ? 'pill-in' : r.status === 'RECIBIDA' ? 'pill-ok' : 'pill-warn') + '">' + U.esc(r.status || 'BORRADOR') + '</span></td>' +
          '<td class="actions"><button class="icon-btn" data-req-po="' + r.id + '" title="Crear PO">➕</button></td></tr>';
      }).join('');

      const pos = (db.purchaseOrders || []).slice().reverse();
      const poRows = pos.map(po => {
        return '<tr><td><strong>' + U.esc(po.po_number || po.id.slice(0, 8)) + '</strong></td>' +
          '<td>' + U.esc(po.supplier || '—') + '</td>' +
          '<td class="num">' + U.money(po.subtotal) + '</td>' +
          '<td class="num">' + U.money(po.total) + '</td>' +
          '<td><span class="pill ' + (po.status === 'RECIBIDA' ? 'pill-ok' : po.status === 'EMITIDA' ? 'pill-in' : 'pill-warn') + '">' + U.esc(po.status || 'BORRADOR') + '</span></td>' +
          '<td class="actions">' + (po.status !== 'RECIBIDA' ? '<button class="icon-btn" data-po-rec="' + po.id + '" title="Recibir">📦</button>' : '<button class="icon-btn" data-po-rate="' + po.id + '" title="Evaluar proveedor">⭐</button>') + '</td></tr>';
      }).join('');

      return '<div class="toolbar">' +
        '<div class="toolbar-left"><button class="btn btn-primary" data-req-new>+ Requisición</button>' +
        '<button class="btn btn-outline" data-po-new>+ Orden de compra</button></div></div>' +
        '<div class="card"><div class="card-title">Requisiciones</div>' +
        U.table(['Código','Depto','Productos','Estado',''], reqRows ? [reqRows] : [], 'Sin requisiciones') + '</div>' +
        '<div class="card"><div class="card-title">Órdenes de compra</div>' +
        U.table(['Nro','Proveedor','Subtotal','Total','Estado',''], poRows ? [poRows] : [], 'Sin órdenes de compra') + '</div>';
    },
    mount(ctx, el) {
      el.querySelector('[data-req-new]').addEventListener('click', () => reqForm(ctx));
      el.querySelector('[data-po-new]').addEventListener('click', () => poForm(ctx, null));
      el.querySelectorAll('[data-req-po]').forEach(b => b.addEventListener('click', () => {
        const req = (Store.get().requisitions || []).find(r => r.id === b.dataset.reqPo);
        if (req) poForm(ctx, req);
      }));
      el.querySelectorAll('[data-po-rec]').forEach(b => b.addEventListener('click', () => receivePO(ctx, b.dataset.poRec)));
      el.querySelectorAll('[data-po-rate]').forEach(b => b.addEventListener('click', () => rateForm(ctx, b.dataset.poRate)));
      Store.logEvent('VIEW', 'compras', 'Acceso a módulo Compras', ctx.currentUser?.username);
    },
  };

  // ----- 2.4 Evaluación de proveedor -----
  function rateForm(ctx, poId) {
    const db = Store.get();
    const po = (db.purchaseOrders || []).find(p => p.id === poId);
    if (!po) return;
    const sel = (name, label) =>
      U.field(label + ' (1-5)', '<select name="' + name + '" class="input">' + [1,2,3,4,5].map(v => '<option' + (v === 3 ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>');
    UI.modal('Evaluar proveedor — ' + U.esc(po.supplier || '—'),
      '<form id="rate-form">' +
      '<div class="grid2">' + sel('quality', 'Calidad producto') + sel('timeliness', 'Puntualidad') +
      sel('price', 'Precio competitivo') + '</div>' +
      U.field('Comentarios', '<textarea name="comments" rows="2" class="input"></textarea>') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Registrar evaluación</button></div></form>');
    document.querySelector('#rate-form [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('rate-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const scores = ['quality', 'timeliness', 'price'].map(n => Number(f.get(n)));
      const overall = +(scores.reduce((a, x) => a + x, 0) / 3).toFixed(1);
      db.supplierRatings = db.supplierRatings || [];
      db.supplierRatings.push({ id: K('rate'), supplier_id: po.supplier_id || po.supplier, po_id: po.id, quality: scores[0], timeliness: scores[1], price: scores[2], overall, comments: f.get('comments'), fecha: new Date().toISOString() });
      Store.logEvent('CREATE', 'compras-ratings', 'Proveedor ' + (po.supplier || '') + ' evaluado: ' + overall + '/5', ctx.currentUser?.username);
      Store.persist(); UI.closeModal(); UI.toast('Proveedor evaluado: ' + overall + '/5', 'success'); ctx.reload();
    });
  }

  function reqForm(ctx) {
    const db = Store.get();
    const prods = db.products.map(p => '<option value="' + p.id + '">' + U.esc(p.name) + '</option>').join('');
    UI.modal('Nueva requisición',
      '<form id="req-form">' +
      U.field('Departamento', '<input type="text" name="department" value="' + U.esc(ctx.currentUser?.role || '') + '">') +
      '<div class="field"><label>Productos</label><div class="grid2">' +
      '<select id="req-prod" class="input">' + prods + '</select>' +
      '<input type="number" id="req-qty" class="input" min="1" value="1" style="max-width:90px"></div>' +
      '<button type="button" class="btn btn-outline btn-sm" data-req-add style="margin-top:8px">+ Agregar</button>' +
      '<div id="req-items" class="stack" style="margin-top:8px"></div></div>' +
      U.field('Justificación', '<textarea name="justification" rows="2" class="input"></textarea>') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Crear requisición</button></div></form>');

    const items = [];
    const listEl = document.getElementById('req-items');
    function renderItems() {
      listEl.innerHTML = items.map((it, i) =>
        '<div class="cart-row"><div class="cart-info"><strong>' + U.esc(it.name) + '</strong><div class="cart-line">×' + it.qty + '</div></div>' +
        '<button class="icon-btn danger" type="button" data-rm="' + i + '">✕</button></div>').join('') || '<span style="color:var(--text-muted)">Agregue productos…</span>';
      listEl.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { items.splice(parseInt(b.dataset.rm), 1); renderItems(); }));
    }
    document.querySelector('[data-req-add]').addEventListener('click', () => {
      const p = Store.get().products.find(x => x.id === document.getElementById('req-prod').value);
      const qty = parseInt(document.getElementById('req-qty').value) || 1;
      if (!p) return;
      items.push({ id: p.id, name: p.name, qty });
      renderItems();
    });

    document.querySelector('#req-form [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('req-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!items.length) return UI.toast('Agregue al menos un producto', 'warn');
      const f = new FormData(e.target);
      const req = { id: K('req'), codigo: 'REQ-' + Date.now().toString().slice(-6), department: f.get('department'), justification: f.get('justification'), items, status: 'BORRADOR', fecha: new Date().toISOString() };
      Store.get().requisitions = Store.get().requisitions || [];
      Store.get().requisitions.push(req);
      Store.persist(); Store.logEvent('CREATE', 'compras-requisiciones', 'Requisición ' + req.codigo + ' creada', ctx.currentUser?.username);
      UI.closeModal(); UI.toast('Requisición creada', 'success'); ctx.reload();
    });
    renderItems();
  }

  function poForm(ctx, req) {
    const db = Store.get();
    const sups = (db.suppliers || (db.providers || [])).map(s => '<option value="' + s.id + '">' + U.esc(s.name || s.nombre) + '</option>').join('');
    UI.modal(req ? 'Orden de compra desde requisición' : 'Nueva orden de compra',
      '<form id="po-form">' +
      U.field('Proveedor', '<select name="supplier">' + sups + '</select>') +
      (req ? '<div class="field"><label>Items de la requisición</label><div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Cant</th><th>Precio</th></tr></thead><tbody>' +
        (req.items || []).map(i => '<tr><td>' + U.esc(i.name) + '</td><td class="num">' + i.qty + '</td><td class="num">' + U.money((db.products.find(p => p.id === i.id) || {}).price || 0) + '</td></tr>').join('') +
        '</tbody></table></div></div>' : '') +
      U.field('F. entrega', '<input type="date" name="delivery">') +
      U.field('Observaciones', '<textarea name="observaciones" rows="2" class="input"></textarea>') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Emitir PO</button></div></form>');
    document.querySelector('#po-form [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('po-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const items = (req && req.items) ? req.items.map(i => ({ name: i.name, qty: i.qty, precio: (db.products.find(p => p.id === i.id) || {}).price || 0 })) : [{ name: 'Compra directa', qty: 1, precio: 0 }];
      const subtotal = items.reduce((a, i) => a + i.precio * i.qty, 0);
      const po = {
        id: K('po'), po_number: 'PO-' + Date.now().toString().slice(-6), supplier: (db.providers || []).find(s => s.id === f.get('supplier'))?.name || '—',
        requisition_id: req?.id || null, items, subtotal: +subtotal.toFixed(2), iva: +(subtotal * 0.16).toFixed(2), total: +(subtotal * 1.16).toFixed(2),
        status: 'EMITIDA', delivery: f.get('delivery') || null, observaciones: f.get('observaciones') || null, fecha: new Date().toISOString(),
      };
      Store.get().purchaseOrders = Store.get().purchaseOrders || [];
      Store.get().purchaseOrders.push(po);
      if (req) req.status = 'EN_PROCESO';
      Store.persist(); Store.logEvent('CREATE', 'compras-po', 'PO ' + po.po_number + ' emitida por ' + po.total, ctx.currentUser?.username);
      UI.closeModal(); UI.toast('Orden emitida', 'success'); ctx.reload();
    });
  }

  function receivePO(ctx, poId) {
    const db = Store.get();
    const po = (db.purchaseOrders || []).find(p => p.id === poId);
    if (!po) return;
    if (!confirm('¿Registrar recepción de PO ' + po.po_number + '? Los productos entrarán a inventario.')) return;
    (po.items || []).forEach(i => {
      const p = db.products.find(x => x.id === i.id);
      if (p) Store.adjustStock(p.id, 'entrada', i.qty, 'Recepción PO ' + po.po_number, ctx.currentUser?.username);
      else if (i.name) { /* producto no mapeado */ }
    });
    po.status = 'RECIBIDA';
    po.recibida = new Date().toISOString();
    Store.persist(); Store.logEvent('CREATE', 'compras-recepcion', 'Recepción PO ' + po.po_number + ', stock actualizado', ctx.currentUser?.username);
    UI.toast('PO recibida y stock actualizado', 'success'); ctx.reload();
  }

  App.register('purchasing', def);
})();
