/* ============================================================
   NEOINVENT V4 — Clientes
   ============================================================ */
(function () {
  'use strict';
  const U = Utils, K = Utils.uid;

  const def = {
    title: 'Clientes',
    subtitle: 'Registro y puntos de clientes',
    render() {
      const db = Store.get();
      const rows = db.customers.map(c => {
        const spent = db.sales.filter(s => !s.cancelled && s.customerId === c.id).reduce((a, s) => a + s.total, 0);
        const count = db.sales.filter(s => !s.cancelled && s.customerId === c.id).length;
        return '<tr><td><strong>' + U.esc(c.name) + '</strong></td>' +
          '<td>' + U.esc(c.phone || '—') + '</td>' +
          '<td>' + U.esc(c.email || '—') + '</td>' +
          '<td class="num">' + count + '</td>' +
          '<td class="num">' + U.money(spent) + '</td>' +
          '<td class="actions"><button class="icon-btn" data-edit="' + c.id + '">✎</button>' +
          '<button class="icon-btn danger" data-del="' + c.id + '">✕</button></td></tr>';
      });
      const totalCli = db.sales.filter(s => !s.cancelled).reduce((a, s) => a + s.total, 0);
      // Cliente con mayor gasto acumulado
      const byClient = {};
      db.sales.filter(s => !s.cancelled).forEach(s => {
        byClient[s.customerId] = (byClient[s.customerId] || 0) + s.total;
      });
      let topClient = '—';
      const topId = Object.keys(byClient).sort((a, b) => byClient[b] - byClient[a])[0];
      if (topId && byClient[topId] > 0) {
        const c = Store.customerById(topId);
        topClient = (c ? c.name : 'Cliente') + ' · ' + U.money(byClient[topId]);
      }
      return '<div class="kpis">' + U.kpiCard({ label: 'Clientes', value: db.customers.length }) +
        U.kpiCard({ label: 'Mejor cliente', value: U.esc(topClient === '—' ? '—' : topClient), sub: 'Mayor gasto acumulado' }) +
        U.kpiCard({ label: 'Total gastado', value: U.money(totalCli), tone: 'pos' }) + '</div>' +
        '<div class="toolbar"><div class="toolbar-left"></div><button class="btn btn-primary" data-add>+ Nuevo cliente</button></div>' +
        U.table(['Nombre', 'Teléfono', 'Email', 'Compras', 'Total gastado', ''], rows, 'Sin clientes registrados');
    },
    mount(ctx, el) {
      el.querySelector('[data-add]').addEventListener('click', () => clientForm(ctx, null));
      el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => clientForm(ctx, Store.get().customers.find(c => c.id === b.dataset.edit))));
      el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        const c = Store.get().customers.find(x => x.id === b.dataset.del);
        if (c && confirm('¿Eliminar cliente "' + c.name + '"?')) {
          Store.get().customers = Store.get().customers.filter(x => x.id !== c.id);
          Store.persist(); UI.toast('Cliente eliminado', 'success'); ctx.reload();
        }
      }));
    },
  };

  function clientForm(ctx, c) {
    const isEdit = !!c;
    UI.modal(isEdit ? 'Editar cliente' : 'Nuevo cliente',
      '<form id="cf">' +
      U.field('Nombre', '<input type="text" name="name" required value="' + (c ? U.esc(c.name) : '') + '">') +
      '<div class="grid2">' +
      U.field('Teléfono', '<input type="tel" name="phone" value="' + (c ? U.esc(c.phone) : '') + '">') +
      U.field('Email', '<input type="email" name="email" value="' + (c ? U.esc(c.email) : '') + '">') +
      '</div>' +
      U.field('Dirección', '<input type="text" name="address" value="' + (c ? U.esc(c.address) : '') + '">') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Guardar</button></div></form>');
    document.querySelector('#cf [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('cf').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = { name: f.get('name').trim(), phone: f.get('phone').trim(), email: f.get('email').trim(), address: f.get('address').trim() };
      if (isEdit) Object.assign(c, data);
      else { data.id = K('cl'); Store.get().customers.push(data); }
      Store.persist(); UI.closeModal(); UI.toast('Cliente guardado', 'success'); ctx.reload();
    });
  }

  App.register('clients', def);
})();