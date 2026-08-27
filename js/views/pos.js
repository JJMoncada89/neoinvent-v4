/* ============================================================
   NEOINVENT V4 — Punto de Venta (POS)
   ============================================================ */
(function () {
  'use strict';
  const U = Utils;
  let cart = []; // {productId, name, price, cost, qty}

  const def = {
    title: 'Punto de Venta',
    subtitle: 'Selecciona productos y cobra',
    render() {
      const db = Store.get();
      const cats = db.categories.map(c => '<option value="' + c.id + '">' + U.esc(c.name) + '</option>').join('');
      const prods = db.products.map(p => {
        const out = p.stock <= 0;
        return '<button class="pos-item' + (out ? ' out' : '') + '" data-add="' + p.id + '"' + (out ? ' disabled' : '') + '>' +
          '<strong>' + U.esc(p.name) + '</strong><div class="pos-price">' + U.money(p.price) + '</div>' +
          '<div class="pos-stock">Stock: ' + p.stock + '</div></button>';
      }).join('');
      const custOpts = db.customers.map(c => '<option value="' + c.id + '">' + U.esc(c.name) + '</option>').join('');
      return '<div class="pos-layout">' +
        '<div class="pos-products"><div class="pos-tools">' +
        '<input type="search" id="pos-search" class="input" placeholder="Buscar producto…">' +
        '<select id="pos-cat" class="input"><option value="">Todas</option>' + cats + '</select></div>' +
        '<div class="pos-grid" id="pos-grid">' + prods + '</div></div>' +

        '<div class="pos-cart">' +
        '<div class="cart-head"><h3>Ticket / Carrito</h3><button class="icon-btn danger" data-clear title="Vaciar">🗑</button></div>' +
        '<div class="cart-items" id="cart-items"><div class="cart-empty">Agrega productos</div></div>' +
        '<div class="cart-fields">' +
        U.field('Cliente', '<select id="cart-customer">' + custOpts + '</select>') +
        U.field('Descuento', '<input type="number" id="cart-discount" min="0" step="0.01" value="0">') +
        U.field('Método', '<select id="cart-method"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select>') +
        '</div>' +
        '<div class="cart-totals">' +
        '<div><span>Subtotal</span><strong id="t-subtotal">' + U.money(0) + '</strong></div>' +
        '<div><span>IVA/Imp.</span><strong id="t-tax">' + U.money(0) + '</strong></div>' +
        '<div><span>Descuento</span><strong id="t-disc">−' + U.money(0) + '</strong></div>' +
        '<div class="total"><span>TOTAL</span><strong id="t-total">' + U.money(0) + '</strong></div>' +
        '</div>' +
        '<button class="btn btn-primary btn-block btn-lg" id="btn-charge">Cobrar</button>' +
        '</div></div>';
    },
    mount(ctx, el) {
      cart = [];
      renderCart(ctx, el);

      const grid = el.querySelector('#pos-grid');
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-add]'); if (btn) add(btn.dataset.add, ctx, el);
      });

      const search = el.querySelector('#pos-search');
      const catSel = el.querySelector('#pos-cat');
      function filter() {
        const q = search.value.trim().toLowerCase();
        const c = catSel.value;
        const list = Store.get().products.filter(p =>
          (!c || p.categoryId === c) && (!q || p.name.toLowerCase().includes(q)));
        grid.innerHTML = list.map(p => {
          const out = p.stock <= 0;
          return '<button class="pos-item' + (out ? ' out' : '') + '" data-add="' + p.id + '"' + (out ? ' disabled' : '') + '>' +
            '<strong>' + U.esc(p.name) + '</strong><div class="pos-price">' + U.money(p.price) + '</div>' +
            '<div class="pos-stock">Stock: ' + p.stock + '</div></button>';
        }).join('');
      }
      search.addEventListener('input', filter);
      catSel.addEventListener('change', filter);

      // evento del carrito (delegación)
      const items = el.querySelector('#cart-items');
      items.addEventListener('click', (e) => {
        const qb = e.target.closest('[data-qty]');
        if (qb) { setQty(qb.dataset.qty, parseInt(qb.dataset.d, 10), ctx, el); renderCart(ctx, el); return; }
        const rb = e.target.closest('[data-rm]');
        if (rb) { cart = cart.filter(c => c.productId !== rb.dataset.rm); renderCart(ctx, el); }
      });
      el.querySelector('[data-clear]').addEventListener('click', () => { cart = []; renderCart(ctx, el); });
      el.querySelector('#cart-discount').addEventListener('input', () => compute(ctx, el));
      el.querySelector('#btn-charge').addEventListener('click', () => checkout(ctx, el));
    },
  };

  function setQty(pid, delta, ctx, el) {
    const row = cart.find(c => c.productId === pid); if (!row) return;
    row.qty += delta;
    const p = Store.productById(pid);
    if (row.qty <= 0) cart = cart.filter(c => c !== row);
    else if (p && row.qty > p.stock) { row.qty = p.stock; UI.toast('Stock máximo disponible', 'warn'); }
  }

  function add(pid, ctx, el) {
    const p = Store.productById(pid);
    if (!p || p.stock <= 0) return;
    const row = cart.find(c => c.productId === pid);
    if (row) { if (row.qty < p.stock) row.qty++; else UI.toast('Stock máximo', 'warn'); }
    else cart.push({ productId: pid, name: p.name, price: p.price, cost: p.cost, qty: 1 });
    renderCart(ctx, el);
  }

  function renderCart(ctx, el) {
    const items = el.querySelector('#cart-items'); if (!items) return;
    if (!cart.length) { items.innerHTML = '<div class="cart-empty">Agrega productos al carrito</div>'; compute(ctx, el); return; }
    items.innerHTML = cart.map(c => {
      return '<div class="cart-row">' +
        '<div class="cart-info"><strong>' + U.esc(c.name) + '</strong>' +
        '<div class="cart-line">' + U.money(c.price) + ' × ' + c.qty + '</div></div>' +
        '<div class="cart-price">' + U.money(c.price * c.qty) + '</div>' +
        '<div class="cart-actions">' +
        '<button class="icon-btn" data-qty="' + c.productId + '" data-d="-1">−</button>' +
        '<span class="cart-qty">' + c.qty + '</span>' +
        '<button class="icon-btn" data-qty="' + c.productId + '" data-d="1">+</button>' +
        '<button class="icon-btn danger" data-rm="' + c.productId + '">✕</button>' +
        '</div></div>';
    }).join('');
    compute(ctx, el);
  }

  function compute(ctx, el) {
    const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
    const taxRate = Store.get().settings.taxRate || 0;
    const tax = subtotal * (taxRate / 100);
    const disc = Utils.num(el.querySelector('#cart-discount').value);
    const total = Math.max(0, subtotal + tax - disc);
    el.querySelector('#t-subtotal').textContent = U.money(subtotal);
    el.querySelector('#t-tax').textContent = U.money(tax);
    el.querySelector('#t-disc').textContent = '−' + U.money(disc);
    el.querySelector('#t-total').textContent = U.money(total);
  }

  function nextFolio() {
    const db = Store.get();
    db.nextSaleSeq = (db.nextSaleSeq || 0) + 1;
    return 'FV-' + String(db.nextSaleSeq).padStart(4, '0');
  }

  function checkout(ctx, el) {
    if (!cart.length) return UI.toast('El carrito está vacío', 'warn');
    const db = Store.get();
    for (const c of cart) {
      const p = Store.productById(c.productId);
      if (!p || p.stock < c.qty) { UI.toast('Stock insuficiente: ' + p.name, 'warn'); return; }
    }
    const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
    const taxRate = db.settings.taxRate || 0;
    const tax = subtotal * (taxRate / 100);
    const disc = Utils.num(el.querySelector('#cart-discount').value);
    const total = Math.max(0, subtotal + tax - disc);
    const sale = {
      id: U.uid('v'), folio: nextFolio(), date: new Date().toISOString(),
      customerId: el.querySelector('#cart-customer').value, method: el.querySelector('#cart-method').value,
      user: ctx.currentUser.username,
      subtotal: +subtotal.toFixed(2), tax: +tax.toFixed(2), discount: +disc.toFixed(2), total: +total.toFixed(2),
      cancelled: false,
      items: cart.map(c => ({ productId: c.productId, qty: c.qty, price: c.price, cost: c.cost })),
    };
    db.sales.push(sale);
    cart.forEach(c => Store.adjustStock(c.productId, 'salida', c.qty, 'Venta ' + sale.folio, ctx.currentUser.username));
    Store.persist();
    printReceipt(sale);
    UI.toast('Venta ' + sale.folio + ' registrada', 'success');
    cart = [];
    renderCart(ctx, el);
    ctx.reload();
  }

  function printReceipt(sale) {
    const s = Store.get().settings;
    const items = sale.items.map(i => {
      const p = Store.productById(i.productId);
      return '<tr><td>' + U.esc(p ? p.name : '') + ' × ' + i.qty + '</td><td style="text-align:right">' + U.money(i.price * i.qty) + '</td></tr>';
    }).join('');
    const w = window.open('', '_blank', 'width=320,height=520');
    if (!w) return;
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Ticket ' + sale.folio + '</title>' +
      '<style>body{font-family:monospace;font-size:12px;width:300px;margin:0 auto}.c{text-align:center}.b{border-top:1px dashed #000;border-bottom:1px dashed #000}table{width:100%;border-collapse:collapse}hr{border:none;border-top:1px dashed #000}</style></head><body>' +
      '<div class="c"><h2>' + U.esc(s.businessName) + '</h2>' +
      '<div>' + sale.folio + '<br>' + U.fmtDateTime(sale.date) + '<br>Atiende: ' + U.esc(sale.user) + '</div>' +
      '<hr><table>' + items + '</table><hr>' +
      '<div>Subtotal: ' + U.money(sale.subtotal) + '</div>' +
      (s.taxRate ? '<div>IVA: ' + U.money(sale.tax) + '</div>' : '') +
      (sale.discount ? '<div>Descuento: −' + U.money(sale.discount) + '</div>' : '') +
      '<div style="font-size:16px;font-weight:bold;margin-top:4px">TOTAL: ' + U.money(sale.total) + '</div>' +
      '<div>Método: ' + U.esc(sale.method) + '</div>' +
      '<hr><div class="c">' + U.esc(s.receiptFooter || '¡Gracias!') + '</div></div></body></html>');
    w.document.close(); w.print();
  }

  App.register('pos', def);
})();