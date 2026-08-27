/* ============================================================
   NEOINVENT V4 — Ajustes (negocio, usuarios, backup/reset)
   ============================================================ */
(function () {
  'use strict';
  const U = Utils, K = Utils.uid;

  const def = {
    title: 'Ajustes',
    subtitle: 'Configuración del negocio y del sistema',
    render(ctx) {
      const db = Store.get();
      const s = db.settings;
      const role = ctx.currentUser && ctx.currentUser.role;
      return '<div class="grid">' +
        '<div class="card"><div class="card-title">Datos del negocio</div>' +
        '<form id="set-form">' +
        U.field('Nombre del negocio', '<input type="text" name="businessName" value="' + U.esc(s.businessName) + '" required>') +
        U.field('Moneda', '<select name="currency"><option value="USD"' + (s.currency === 'USD' ? ' selected' : '') + '>USD $</option>' +
        '<option value="MXN"' + (s.currency === 'MXN' ? ' selected' : '') + '>MXN $</option>' +
        '<option value="EUR"' + (s.currency === 'EUR' ? ' selected' : '') + '>EUR €</option>' +
        '<option value="COP"' + (s.currency === 'COP' ? ' selected' : '') + '>COP $</option>' +
        '<option value="PEN"' + (s.currency === 'PEN' ? ' selected' : '') + '>PEN S/</option>' +
        '<option value="ARS"' + (s.currency === 'ARS' ? ' selected' : '') + '>ARS $</option></select>') +
        '<div class="grid2">' +
        U.field('IVA / Impuesto (%)', '<input type="number" min="0" step="0.01" name="taxRate" value="' + s.taxRate + '">') +
        U.field('Alerta stock bajo', '<input type="number" min="0" name="lowStockThreshold" value="' + s.lowStockThreshold + '">') +
        '</div>' +
        U.field('Pie de ticket', '<input type="text" name="receiptFooter" value="' + U.esc(s.receiptFooter || '') + '">') +
        '<div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar ajustes</button></div></form></div>' +

        '<div class="card"><div class="card-title">Seguridad & datos</div>' +
        '<div class="stack">' +
        '<button class="btn btn-outline" data-bk>📤 Respaldo (descargar JSON)</button>' +
        '<button class="btn btn-outline" data-rest>📥 Restaurar respaldo</button>' +
        '<input type="file" id="restore-file" accept="application/json" hidden>' +
        '<button class="btn btn-danger" data-reset>🧹 Reiniciar base de datos</button>' +
        '</div></div></div>' +

        (role === 'admin' ? '<div class="card"><div class="card-title">Usuarios del sistema</div>' +
        '<form id="user-form" class="inline-form"><input type="text" id="u-name" class="input" placeholder="Nombre" required>'
        +
        '<input type="text" id="u-user" class="input" placeholder="Usuario" required>' +
        '<input type="password" id="u-pass" class="input" placeholder="Contraseña" required>' +
        '<select id="u-role" class="input"><option value="admin">Admin</option><option value="cajero">Cajero</option></select>' +
        '<button class="btn btn-primary">Agregar</button></form>' + usersTable() + '</div>' : '');
    },
    mount(ctx, el) {
      const db = Store.get();
      el.querySelector('#set-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        Object.assign(db.settings, {
          businessName: f.get('businessName').trim(), currency: f.get('currency'),
          taxRate: Utils.num(f.get('taxRate')), lowStockThreshold: Utils.num(f.get('lowStockThreshold')),
          receiptFooter: f.get('receiptFooter').trim(),
        });
        Store.persist(); UI.toast('Ajustes guardados', 'success');
      });

      el.querySelector('[data-bk]').addEventListener('click', () => {
        U.downloadBlob(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }), 'neoinvent-backup.json');
      });

      const restBtn = el.querySelector('[data-rest]');
      const fileInput = el.querySelector('#restore-file');
      restBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const f = fileInput.files[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            if (!parsed.products || !parsed.settings) throw new Error('formato');
            localStorage.setItem(Store.DB_KEY, JSON.stringify(parsed));
            UI.toast('Respaldo restaurado. Recargando…', 'success');
            setTimeout(() => location.reload(), 600);
          } catch (err) { UI.toast('Archivo de respaldo inválido', 'warn'); }
        };
        reader.readAsText(f);
      });

      el.querySelector('[data-reset]').addEventListener('click', () => {
        if (confirm('⚠️ Esto borrará TODOS los datos actuales. ¿Continuar?')) {
          Store.reset(); UI.toast('Base de datos reiniciada', 'success');
          setTimeout(() => location.reload(), 600);
        }
      });

      const uf = el.querySelector('#user-form');
      if (uf) {
        uf.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = el.querySelector('#u-name').value.trim();
          const uname = el.querySelector('#u-user').value.trim();
          const pass = el.querySelector('#u-pass').value;
          const role = el.querySelector('#u-role').value;
          if (db.users.find(u => u.username === uname)) { UI.toast('Ese usuario ya existe', 'warn'); return; }
          db.users.push({ id: K('u'), name, username: uname, password: pass, role });
          Store.persist(); UI.toast('Usuario creado', 'success'); ctx.reload();
        });
        el.querySelectorAll('[data-udel]').forEach(b => b.addEventListener('click', () => {
          if (db.users.length <= 1) { UI.toast('Debe quedar al menos 1 usuario', 'warn'); return; }
          if (confirm('¿Eliminar usuario?')) {
            db.users = db.users.filter(u => u.id !== b.dataset.udel);
            Store.persist(); ctx.reload();
          }
        }));
      }
    },
  };

  function usersTable() {
    const rows = Store.get().users.map(u =>
      '<tr><td>' + U.esc(u.name) + '</td><td>' + U.esc(u.username) + '</td><td>' + U.esc(u.role) + '</td>' +
      '<td class="actions"><button class="icon-btn danger" data-udel="' + u.id + '">✕</button></td></tr>').join('');
    return U.table(['Nombre', 'Usuario', 'Rol', ''], rows ? [rows] : [], '');
  }

  App.register('settings', def);
})();