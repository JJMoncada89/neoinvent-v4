/* ============================================================
   NEOINVENT ENTERPRISE — AUDITORÍA FORENSE (Acceso Oculto)
   SOLO accesible con Ctrl+Alt+A + clave maestra
   ============================================================ */
(function () {
  'use strict';
  const U = Utils;

  const def = {
    title: '🔐 Auditoría Forense',
    subtitle: 'Registro transaccional inviolable (acceso restringido)',
    render() {
      return '<div class="toolbar">' +
        '<div class="toolbar-left">' +
        '<input type="search" id="audit-search" class="input" placeholder="Buscar usuario…" style="max-width:220px">' +
        '<select id="audit-filter" class="input" style="max-width:140px">' +
        '<option value="">Todas</option>' +
        '<option>CREATE</option><option>UPDATE</option><option>DELETE</option>' +
        '<option>LOGIN</option><option>LOGOUT</option><option>EXPORT</option>' +
        '<option>CANCEL</option><option>SECURITY</option>' +
        '</select>' +
        '<input type="date" id="audit-from" class="input" style="max-width:150px">' +
        '<button class="btn btn-outline" data-refresh>Filtrar</button>' +
        '<button class="btn btn-outline" data-integrity>Integridad</button>' +
        '<button class="btn btn-outline" data-export>Exportar</button>' +
        '</div>' +
        '<span class="pill pill-in" id="audit-status">⛓️ SHA-256 chain</span></div>' +
        '<div class="card" id="audit-results">' +
        '<div class="empty">Conectado backend PostgreSQL + clave maestra para desbloquear.</div>' +
        '</div>';
    },
    mount(ctx, el) {
      el.querySelector('[data-refresh]').addEventListener('click', () => applyFilter(el));
      el.querySelector('[data-integrity]').addEventListener('click', () => checkIntegrity(el));
      el.querySelector('[data-export]').addEventListener('click', () => exportForensic(el));
      applyFilter(el);
    },
  };

  function applyFilter(el) {
    const q = el.querySelector('#audit-search')?.value.toLowerCase() || '';
    const action = el.querySelector('#audit-filter')?.value || '';
    const from = el.querySelector('#audit-from')?.value || '';

    // En modo frontend-local: mostrar historial local almacenado
    try {
      const localEvents = JSON.parse(localStorage.getItem('neoinvent_v4_events') || '[]');
      const rows = localEvents
        .filter(e => (!action || e.action === action) && (!q || (e.user || '').toLowerCase().includes(q)))
        .slice().reverse().map(e =>
          '<tr><td style="font-family:var(--font-mono);font-size:11px">' + U.fmtDateTime(e.time) + '</td>' +
          '<td>' + U.esc(e.user) + '</td>' +
          '<td><span class="pill pill-in">' + U.esc(e.action) + '</span></td>' +
          '<td>' + U.esc(e.module) + '</td><td>' + U.esc(e.detail || '') + '</td></tr>'
        ).join('');
      el.querySelector('#audit-results').innerHTML =
        '<div class="card-title">Historial local de eventos (' + localEvents.length + ')</div>' +
        (rows ? '<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Detalle</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
          : '<div class="empty">Sin eventos locales. Conecte el backend para auditoría completa.</div>');
      el.querySelector('#audit-status').textContent = '⛓️ ' + localEvents.length + ' eventos capturados';
    } catch (e) {
      el.querySelector('#audit-results').innerHTML = '<div class="empty">Error: ' + U.esc(e.message) + '</div>';
    }
  }

  function checkIntegrity(el) {
    UI.toast('Conecte el backend para verificación SHA-256 de cadena completa', 'warn');
  }

  function exportForensic(el) {
    const localEvents = JSON.parse(localStorage.getItem('neoinvent_v4_events') || '[]');
    U.exportCSV('audit_local_', localEvents.map(e => ({
      FECHA: new Date(e.time).toLocaleString('es'), USUARIO: e.user,
      ACCION: e.action, MODULO: e.module, DETALLE: e.detail,
    })));
  }

  App.register('audit', def);
})();