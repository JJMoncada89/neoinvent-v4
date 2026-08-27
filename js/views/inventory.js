/* ============================================================
   NEOINVENT V4 — Inventario (Productos, Categorías, Movimientos)
   ============================================================ */
(function () {
  'use strict';
  const U = Utils, K = Store.uid;

  const def = {
    title: 'Inventario',
    subtitle: 'Productos, categorías, kardex y reposiciones',
    render(ctx) {
      const db = Store.get();
      const rows = db.products.map(p => {
        const low = p.stock <= p.stockMin;
        const gain = (p.price - p.cost).toFixed(2);
        return '<tr>' +
          '<td>' + U.esc(p.sku) + '</td>' +
          '<td><strong>' + U.esc(p.name) + '</strong></td>' +
          '<td>' + U.esc(Store.categoryName(p.categoryId)) + '</td>' +
          '<td class="num">' + p.stock + ' <span class="pill ' + (low ? 'pill-warn' : 'pill-ok') + '">' + (low ? 'Bajo' : 'OK') + '</span></td>' +
          '<td class="num">' + U.money(p.cost) + '</td>' +
          '<td class="num">' + U.money(p.price) + '</td>' +
          '<td class="num">' + U.money(gain) + '</td>' +
          '<td class="actions">' +
          '<button class="icon-btn" data-act="stock" data-id="' + p.id + '" title="Movimiento">⇄</button>' +
          '<button class="icon-btn" data-act="edit" data-id="' + p.id + '" title="Editar">✎</button>' +
          '<button class="icon-btn danger" data-act="del" data-id="' + p.id + '" title="Eliminar">✕</button>' +
          '</td></tr>';
      });
      return '<div class="toolbar">' +
        '<div class="toolbar-left"><input type="search" id="pd-search" placeholder="Buscar…" class="input" style="max-width:200px">' +
        '<button class="btn btn-outline" data-act="cats">Categorías</button>' +
        '<button class="btn btn-outline" data-act="provs">Proveedores</button>' +
        '<button class="btn btn-outline" data-act="moves">Movimientos</button>' +
        '<button class="btn btn-outline" data-act="export">Exportar CSV</button></div>' +
        '<button class="btn btn-primary" data-act="add">+ Nuevo producto</button>' +
        '</div>' + U.table(['SKU', 'Producto', 'Categoría', 'Stock', 'Costo', 'Precio', 'Gan.', ''], rows, 'No hay productos. Agrega el primero.');
    },
    mount(ctx, el) {
      el.querySelector('#pd-search').addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        const db = Store.get();
        const filtered = db.products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
        const tbody = el.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = filtered.map(p => {
          const low = p.stock <= p.stockMin;
          return '<tr><td>' + U.esc(p.sku) + '</td><td><strong>' + U.esc(p.name) + '</strong></td>' +
            '<td>' + U.esc(Store.categoryName(p.categoryId)) + '</td>' +
            '<td class="num">' + p.stock + ' <span class="pill ' + (low ? 'pill-warn' : 'pill-ok') + '">' + (low ? 'Bajo' : 'OK') + '</span></td>' +
            '<td class="num">' + U.money(p.cost) + '</td><td class="num">' + U.money(p.price) + '</td>' +
            '<td class="num">' + U.money((p.price - p.cost).toFixed(2)) + '</td>' +
            '<td class="actions"><button class="icon-btn" data-act="stock" data-id="' + p.id + '">⇄</button>' +
            '<button class="icon-btn" data-act="edit" data-id="' + p.id + '">✎</button>' +
            '<button class="icon-btn danger" data-act="del" data-id="' + p.id + '">✕</button></td></tr>';
        }).join('');
      });

      el.querySelector('[data-act="cats"]').addEventListener('click', () => catsModal());
      el.querySelector('[data-act="provs"]').addEventListener('click', () => providersModal());
      el.querySelector('[data-act="moves"]').addEventListener('click', () => movesModal());
      el.querySelector('[data-act="export"]').addEventListener('click', () => {
        U.exportCSV('productos', Store.get().products.map(p => ({
          SKU: p.sku, Producto: p.name, Categoria: Store.categoryName(p.categoryId),
          Proveedor: Store.providerName(p.providerId),
          Stock: p.stock, StockMin: p.stockMin, Costo: p.cost, Precio: p.price
        })));
      });
      el.querySelector('[data-act="add"]').addEventListener('click', () => productForm(ctx, null));
      el.querySelectorAll('[data-act="edit"]').forEach(b => b.addEventListener('click', () => {
        productForm(ctx, Store.get().products.find(p => p.id === b.dataset.id));
      }));
      el.querySelectorAll('[data-act="del"]').forEach(b => b.addEventListener('click', () => {
        const p = Store.get().products.find(x => x.id === b.dataset.id);
        if (p && confirm('¿Eliminar "' + p.name + '"?')) {
          Store.get().products = Store.get().products.filter(x => x.id !== p.id);
          Store.persist();
          UI.toast('Producto eliminado', 'success');
          ctx.reload();
        }
      }));
      el.querySelectorAll('[data-act="stock"]').forEach(b => b.addEventListener('click', () => stockForm(ctx, b.dataset.id)));
    },
  };

  // ---------- Modal formulario producto ----------
  function productForm(ctx, p) {
    const db = Store.get();
    const catOpts = db.categories.map(c =>
      '<option value="' + c.id + '"' + (p && p.categoryId === c.id ? ' selected' : '') + '>' + U.esc(c.name) + '</option>').join('');
    const provOpts = db.providers.map(pr =>
      '<option value="' + pr.id + '"' + (p && p.providerId === pr.id ? ' selected' : '') + '>' + U.esc(pr.name) + '</option>').join('');
    const isEdit = !!p;
    UI.modal(isEdit ? 'Editar producto' : 'Nuevo producto',
      '<form id="pf">' +
      U.field('Nombre', '<input type="text" name="name" required value="' + (p ? U.esc(p.name) : '') + '">') +
      U.field('SKU / Código', '<input type="text" name="sku" required value="' + (p ? U.esc(p.sku) : '') + '">') +
      '<div class="grid2">' +
      U.field('Categoría', '<select name="categoryId">' + catOpts + '</select>') +
      U.field('Proveedor', '<select name="providerId"><option value="">— Sin proveedor —</option>' + provOpts + '</select>') +
      '</div><div class="grid2">' +
      U.field('Costo', '<input type="number" min="0" step="0.01" name="cost" value="' + (p ? p.cost : 0) + '">') +
      U.field('Precio venta', '<input type="number" min="0" step="0.01" name="price" value="' + (p ? p.price : 0) + '">') +
      '</div><div class="grid2">' +
      U.field('Stock', '<input type="number" min="0" name="stock" value="' + (p ? p.stock : 0) + '">') +
      U.field('Stock mínimo', '<input type="number" min="0" name="stockMin" value="' + (p ? p.stockMin : 5) + '">') +
      '</div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Guardar</button></div></form>');

    document.querySelector('#pf [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('pf').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = {
        sku: f.get('sku').trim(), name: f.get('name').trim(), categoryId: f.get('categoryId'),
        providerId: f.get('providerId') || null,
        cost: Utils.num(f.get('cost')), price: Utils.num(f.get('price')),
        stockMin: Utils.num(f.get('stockMin')),
      };
      if (isEdit) {
        const target = db.products.find(x => x.id === p.id);
        const desiredStock = Utils.num(f.get('stock'));
        const delta = desiredStock - target.stock;
        Object.assign(target, data, { stock: desiredStock });
        if (delta !== 0) Store.adjustStock(p.id, delta > 0 ? 'entrada' : 'salida', Math.abs(delta), 'Ajuste manual', ctx.currentUser.username);
        UI.toast('Producto actualizado', 'success');
      } else {
        const id = K('p');
        const stock = Utils.num(f.get('stock'));
        Object.assign(data, { id, stock });
        db.products.push(data);
        if (stock > 0) Store.adjustStock(id, 'entrada', stock, 'Stock inicial', ctx.currentUser.username);
        UI.toast('Producto creado', 'success');
      }
      Store.persist(); UI.closeModal(); ctx.reload();
    });
  }

  // ---------- Form stock ----------
  function stockForm(ctx, productId) {
    const p = Store.get().products.find(x => x.id === productId);
    if (!p) return;
    UI.modal('Movimiento de stock — ' + U.esc(p.name),
      '<form id="stk">' +
      U.field('Tipo', '<select name="type"><option value="entrada">Entrada (reposición)</option><option value="salida">Salida</option></select>') +
      U.field('Cantidad', '<input type="number" min="1" name="qty" required>') +
      U.field('Referencia', '<input type="text" name="ref" placeholder="ej. Compra proveedor">') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Aplicar</button></div></form>');
    document.querySelector('#stk [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('stk').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      Store.adjustStock(productId, f.get('type'), Utils.num(f.get('qty')), f.get('ref') || 'Movimiento', ctx.currentUser.username);
      Store.persist(); UI.closeModal();
      UI.toast('Stock actualizado', 'success'); ctx.reload();
    });
  }

  // ---------- Categorías ----------
  function catsModal() {
    const db = Store.get();
    const rows = db.categories.map(c =>
      '<tr><td>' + U.esc(c.name) + '</td><td class="right"><button class="icon-btn danger" data-del="' + c.id + '">✕</button></td></tr>').join('');
    UI.modal('Categorías',
      '<form id="cat-form" style="display:flex;gap:8px;margin-bottom:12px"><input type="text" id="cat-name" class="input" placeholder="Nueva categoría" style="flex:1" required>' +
      '<button class="btn btn-primary">Agregar</button></form>' +
      U.table(['Nombre', ''], (rows ? [rows] : []), 'Sin categorías'));

    document.getElementById('cat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('cat-name').value.trim();
      if (!name) return;
      db.categories.push({ id: K('c'), name });
      Store.persist(); UI.toast('Categoría agregada', 'success'); catsModal();
    });
    document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      db.categories = db.categories.filter(c => c.id !== b.dataset.del);
      Store.persist(); catsModal();
    }));
  }

  // ---------- Proveedores ----------
  function providersModal() {
    const db = Store.get();
    const rows = db.providers.map(pr =>
      '<tr><td><strong>' + U.esc(pr.name) + '</strong></td>' +
      '<td>' + U.esc(pr.contact || '—') + '</td>' +
      '<td>' + U.esc(pr.phone || '—') + '</td>' +
      '<td class="actions"><button class="icon-btn" data-edit="' + pr.id + '" title="Editar">✎</button>' +
      '<button class="icon-btn danger" data-del="' + pr.id + '" title="Eliminar">✕</button></td></tr>').join('');
    const provForm =
      '<form id="prov-form" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
      '<input type="text" id="prov-name" class="input" placeholder="Nombre del proveedor" style="flex:1;min-width:150px" required>' +
      '<input type="text" id="prov-contact" class="input" placeholder="Contacto" style="flex:1;min-width:120px">' +
      '<input type="text" id="prov-phone" class="input" placeholder="Teléfono" style="flex:1;min-width:110px">' +
      '<button class="btn btn-primary">Agregar</button></form>';
    UI.modal('Proveedores',
      provForm + U.table(['Nombre', 'Contacto', 'Teléfono', ''], (rows ? [rows] : []), 'Sin proveedores'));

    document.getElementById('prov-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('prov-name').value.trim();
      if (!name) return;
      db.providers.push({
        id: K('pr'), name,
        contact: document.getElementById('prov-contact').value.trim(),
        phone: document.getElementById('prov-phone').value.trim(),
      });
      Store.persist(); UI.toast('Proveedor agregado', 'success'); providersModal();
    });
    document.querySelectorAll('#modal-body [data-del]').forEach(b => b.addEventListener('click', () => {
      db.providers = db.providers.filter(pr => pr.id !== b.dataset.del);
      Store.persist(); providersModal();
    }));
    document.querySelectorAll('#modal-body [data-edit]').forEach(b => b.addEventListener('click', () => {
      providerForm(Store.get().providers.find(pr => pr.id === b.dataset.edit));
    }));
  }

  function providerForm(pr) {
    const db = Store.get();
    UI.modal('Editar proveedor',
      '<form id="pform">' +
      U.field('Nombre', '<input type="text" name="name" required value="' + U.esc(pr.name) + '">') +
      '<div class="grid2">' +
      U.field('Contacto', '<input type="text" name="contact" value="' + U.esc(pr.contact || '') + '">') +
      U.field('Teléfono', '<input type="tel" name="phone" value="' + U.esc(pr.phone || '') + '">') +
      '</div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Guardar</button></div></form>');
    document.querySelector('#pform [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('pform').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      Object.assign(pr, {
        name: f.get('name').trim(), contact: f.get('contact').trim(), phone: f.get('phone').trim(),
      });
      Store.persist(); UI.closeModal(); UI.toast('Proveedor actualizado', 'success'); providersModal();
    });
  }

  // ---------- Movimientos (kardex) ----------
  function movesModal() {
    const db = Store.get();
    const rows = db.movements.slice().reverse().map(m => {
      const p = Store.productById(m.productId);
      return '<tr><td>' + U.fmtDateTime(m.date) + '</td>' +
        '<td>' + U.esc(p ? p.name : '?') + '</td>' +
        '<td><span class="pill ' + (m.type === 'salida' ? 'pill-out' : 'pill-in') + '">' + m.type + '</span></td>' +
        '<td class="num">' + m.qty + '</td><td>' + U.esc(m.ref || '') + '</td><td>' + U.esc(m.user || '') + '</td></tr>';
    });
    UI.modal('Movimientos / Kardex', U.table(['Fecha', 'Producto', 'Tipo', 'Cant.', 'Referencia', 'Usuario'], rows || [], 'Sin movimientos') +
      '<div class="modal-actions"><button class="btn btn-outline" data-csv>Exportar CSV</button>' +
      '<button class="btn btn-ghost" data-cancel>Cerrar</button></div>');
    const csvB = document.querySelector('#modal-body [data-csv]');
    if (csvB) csvB.addEventListener('click', () => {
      U.exportCSV('movimientos', db.movements.map(m => ({
        fecha: m.date, producto: (Store.productById(m.productId) || {}).name, tipo: m.type, cantidad: m.qty, referencia: m.ref, usuario: m.user
      })));
    });
    const cancelB = document.querySelector('#modal-body [data-cancel]');
    if (cancelB) cancelB.addEventListener('click', UI.closeModal);
  }

  App.register('inventory', def);
})();