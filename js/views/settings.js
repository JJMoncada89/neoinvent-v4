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
        U.field('Email para reportes ejecutivos', '<input type="email" name="reportEmail" value="' + U.esc(s.reportEmail || '') + '" placeholder="gerencia@empresa.com">') +
        '<div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar ajustes</button></div></form></div>' +

        '<div class="card"><div class="card-title">Seguridad & datos</div>' +
        '<div class="stack">' +
        U.field('URL del backend (opcional)', '<input type="text" id="api-url" class="input" value="' + U.esc(Store.get().settings.apiUrl || API.apiBase()) + '" placeholder="https://tu-backend.onrender.com">') +
        U.field('Tasa BCV USD (Bs)', '<div class="grid2" style="align-items:center">' +
        '<input type="number" id="bcv-rate" class="input" step="0.001" min="0" value="' + (Store.get().settings.bcvRate || '') + '">' +
        '<button class="btn btn-outline" data-bcv-auto>📡 Auto (BCV)</button></div>') +
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
          reportEmail: f.get('reportEmail').trim(),
        });
        Store.persist(); UI.toast('Ajustes guardados', 'success');
      });

      el.querySelector('[data-bk]').addEventListener('click', () => {
        U.downloadBlob(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }), 'neoinvent-backup.json');
      });

      // Guardar URL del backend
      const apiUrlInput = el.querySelector('#api-url');
      if (apiUrlInput) {
        apiUrlInput.addEventListener('change', () => {
          const url = apiUrlInput.value.trim();
          if (url) API.saveBase(url);
          else localStorage.removeItem(API.API_KEY);
          db.settings.apiUrl = url;
          Store.persist();
          UI.toast(url ? 'Backend configurado: ' + API.apiBase() : 'Backend local / demo', 'success');
        });
      }

      // Tasa BCV: guardar manual
      const bcvInput = el.querySelector('#bcv-rate');
      if (bcvInput) {
        bcvInput.addEventListener('change', () => {
          const rate = parseFloat(bcvInput.value);
          if (rate > 0) {
            db.settings.bcvRate = rate;
            Store.persist();
            UI.toast('Tasa BCV guardada: ' + rate + ' Bs/USD', 'success');
          }
        });
        // Auto: consultar backend (si disponible) o mostrar mensaje local
        el.querySelector('[data-bcv-auto]').addEventListener('click', async () => {
          try {
            const res = await fetch(API.apiBase() + '/api/v1/currency/rate');
            if (!res.ok) throw new Error('no backend');
            const data = await res.json();
            bcvInput.value = data.tasa;
            db.settings.bcvRate = data.tasa;
            Store.persist();
            UI.toast('Tasa BCV actualizada: ' + data.tasa + ' Bs/USD (' + (data.fuente || 'BCV') + ')', 'success');
          } catch (e) {
            // Fallback: estimación local 0 (pide que use el backend)
            UI.toast('Conecta el backend para tasa BCV automática; usa la manual por ahora.', 'warn');
          }
        });
      }

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
        uf.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = el.querySelector('#u-name').value.trim();
          const uname = el.querySelector('#u-user').value.trim();
          const pass = el.querySelector('#u-pass').value;
          const role = el.querySelector('#u-role').value;
          if (db.users.find(u => u.username === uname)) { UI.toast('Ese usuario ya existe', 'warn'); return; }
          // Intentar backend primero; si no hay backend, guardar local
          const res = await API.createUser({ email: uname, password: pass, nombre: name, rol: role });
          if (res.source === 'backend' && res.ok) {
            UI.toast('Usuario creado en PostgreSQL', 'success');
          } else {
            db.users.push({ id: K('u'), name, username: uname, password: pass, role });
            Store.persist();
            UI.toast(res.source === 'backend' ? 'Backend no disponible — guardado local' : 'Usuario creado (local)', res.source === 'backend' ? 'warn' : 'success');
          }
          Store.logEvent('CREATE', 'usuarios', 'Usuario creado: ' + uname + ' (' + role + ')', ctx.currentUser?.username);
          ctx.reload();
        });
        el.querySelectorAll('[data-uedit]').forEach(b => b.addEventListener('click', () => userEditModal(ctx, b.dataset.uedit)));
        el.querySelectorAll('[data-udel]').forEach(b => b.addEventListener('click', async () => {
          if (db.users.length <= 1) { UI.toast('Debe quedar al menos 1 usuario', 'warn'); return; }
          const u = db.users.find(x => x.id === b.dataset.udel);
          if (!u) return;
          if (!confirm('¿Eliminar usuario "' + u.username + '"?')) return;
          const res = await API.deleteUser(u.id);
          if (res.source === 'backend' && res.ok) {
            UI.toast('Usuario eliminado de PostgreSQL', 'success');
          } else {
            db.users = db.users.filter(x => x.id !== u.id);
            Store.persist();
            UI.toast(res.source === 'backend' ? 'Backend no disponible — borrado local' : 'Usuario eliminado', res.source === 'backend' ? 'warn' : 'success');
          }
          Store.logEvent('DELETE', 'usuarios', 'Usuario eliminado: ' + u.username, ctx.currentUser?.username);
          ctx.reload();
        }));
      }
    },
  };

  // ----- Edición de usuario (nombre, rol, password opcional) -----
  function userEditModal(ctx, id) {
    const db = Store.get();
    const u = db.users.find(x => x.id === id);
    if (!u) return;
    UI.modal('Editar usuario — ' + U.esc(u.username),
      '<form id="uedit-form">' +
      U.field('Nombre', '<input type="text" name="name" value="' + U.esc(u.name || '') + '" required>') +
      U.field('Usuario', '<input type="text" name="username" value="' + U.esc(u.username) + '" required>') +
      U.field('Rol', '<select name="role" class="input">' +
        '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>Admin</option>' +
        '<option value="cajero"' + (u.role === 'cajero' ? ' selected' : '') + '>Cajero</option>' +
        '<option value="vendedor"' + (u.role === 'vendedor' ? ' selected' : '') + '>Vendedor</option>' +
        '</select>') +
      U.field('Nueva contraseña (dejar vacío para no cambiar)', '<input type="password" name="password" autocomplete="new-password">') +
      '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">Guardar cambios</button></div></form>');
    document.querySelector('#uedit-form [data-cancel]').addEventListener('click', UI.closeModal);
    document.getElementById('uedit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const payload = {
        name: f.get('name').trim(), username: f.get('username').trim(), role: f.get('role'),
        password: f.get('password') ? f.get('password') : undefined,
      };
      const res = await API.updateUser(u.id, payload);
      if (res.source === 'backend' && res.ok) {
        UI.toast('Usuario actualizado en PostgreSQL', 'success');
      } else {
        Object.assign(u, { name: payload.name, username: payload.username, role: payload.role });
        if (payload.password) u.password = payload.password;
        Store.persist();
        UI.toast(res.source === 'backend' ? 'Backend no disponible — guardado local' : 'Usuario actualizado', res.source === 'backend' ? 'warn' : 'success');
      }
      Store.logEvent('UPDATE', 'usuarios', 'Usuario editado: ' + payload.username, ctx.currentUser?.username);
      UI.closeModal();
      ctx.reload();
    });
  }

  function usersTable() {
    const rows = Store.get().users.map(u =>
      '<tr><td>' + U.esc(u.name || '') + '</td><td>' + U.esc(u.username) + '</td><td>' + U.esc(u.role) + '</td>' +
      '<td class="actions"><button class="icon-btn" data-uedit="' + u.id + '" title="Editar">✎</button>' +
      '<button class="icon-btn danger" data-udel="' + u.id + '" title="Eliminar">✕</button></td></tr>').join('');
    return U.table(['Nombre', 'Usuario', 'Rol', ''], rows ? [rows] : [], 'Sin usuarios');
  }

  App.register('settings', def);
})();