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
        '<button class="btn btn-danger" data-anomalies>🚨 Análisis de riesgo</button>' +
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
      el.querySelector('[data-anomalies]').addEventListener('click', () => detectAnomalies(el));
      applyFilter(el);
    },
  };

  // ===== ANÁLISIS DE ANOMALÍAS Y FRAUDE (Fase 9 gemini_code) =====
  function detectAnomalies(el) {
    const events = Store.getLocalEvents();
    const now = Date.now();
    const H24 = 86400000;
    const riesgos = [];

    // 1. Anulaciones/DELETE frecuentes por un mismo usuario (≥3 en 24h)
    const byUser24h = {};
    events.filter(e => (e.action === 'DELETE' || e.action === 'CANCEL') && now - new Date(e.time).getTime() < H24)
      .forEach(e => { byUser24h[e.user] = (byUser24h[e.user] || 0) + 1; });
    Object.entries(byUser24h).filter(([, n]) => n >= 3).forEach(([user, n]) => {
      riesgos.push({ nivel: '🔴 ALTO', tipo: 'Anulaciones masivas', detalle: user + ' anuló/eliminó ' + n + ' registros en las últimas 24h' });
    });

    // 2. Ajustes de stock fuera de horario laboral (antes 7am o después 20h)
    events.filter(e => e.module === 'inventario' && /salida|ajuste/i.test(e.action + ' ' + (e.detail || ''))).forEach(e => {
      const h = new Date(e.time).getHours();
      if (h < 7 || h >= 20) {
        riesgos.push({ nivel: '🟡 MEDIO', tipo: 'Movimiento fuera de horario', detalle: e.user + ' movió stock a las ' + new Date(e.time).toLocaleTimeString('es') + ' — ' + (e.detail || '') });
      }
    });

    // 3. Accesos a auditoría (SECURITY) — solo el creador debería acceder
    const auditAccess = events.filter(e => e.module === 'audit-access' || e.action === 'SECURITY');
    if (auditAccess.length > 0) {
      const users = [...new Set(auditAccess.map(e => e.user))];
      riesgos.push({ nivel: '🟡 INFO', tipo: 'Accesos al panel de auditoría', detalle: 'Accedido por: ' + users.join(', ') + ' (' + auditAccess.length + ' veces). Solo el creador debería.' });
    }

    // 4. Exportaciones de datos (potencial fuga)
    const exports = events.filter(e => e.action === 'EXPORT');
    if (exports.length >= 3) {
      const byUser = {};
      exports.forEach(e => { byUser[e.user] = (byUser[e.user] || 0) + 1; });
      Object.entries(byUser).filter(([, n]) => n >= 3).forEach(([user, n]) => {
        riesgos.push({ nivel: '🟡 MEDIO', tipo: 'Exportaciones masivas', detalle: user + ' exportó datos ' + n + ' veces (posible fuga)' });
      });
    }

    // 5. Logins fallidos recientes (brute-force)
    const authFails = events.filter(e => e.action === 'AUTH_FAIL' || (e.action === 'LOGIN' && /fallido|incorrect/i.test(e.detail || '')));
    if (authFails.length >= 5) {
      riesgos.push({ nivel: '🔴 ALTO', tipo: 'Posible brute-force', detalle: authFails.length + ' intentos de login fallidos detectados' });
    }

    // Render
    const body = el.querySelector('#audit-results');
    if (!riesgos.length) {
      body.innerHTML = '<div class="empty">✅ Análisis completo: <strong>sin anomalías detectadas</strong> en ' + events.length + ' eventos. Todo dentro de parámetros normales.</div>';
      UI.toast('Análisis: sin anomalías', 'success');
      return;
    }
    const rows = riesgos.map(r => '<tr><td><span class="pill ' + (r.nivel.includes('ALTO') ? 'pill-out' : r.nivel.includes('MEDIO') ? 'pill-warn' : 'pill-in') + '">' + r.nivel + '</span></td>' +
      '<td><strong>' + U.esc(r.tipo) + '</strong></td><td>' + U.esc(r.detalle) + '</td></tr>').join('');
    body.innerHTML = '<div class="card-title">🚨 Riesgos detectados (' + riesgos.length + ')</div>' +
      U.table(['Nivel', 'Tipo', 'Detalle'], [rows], '') +
      '<div class="toolbar" style="margin-top:12px"><button class="btn btn-outline" data-export-riesgos>Exportar análisis</button></div>';
    body.querySelector('[data-export-riesgos]').addEventListener('click', () => {
      U.exportCSV('analisis_riesgos_', riesgos.map(r => ({ Nivel: r.nivel, Tipo: r.tipo, Detalle: r.detalle, Fecha: new Date().toISOString() })));
    });
    UI.toast(riesgos.length + ' riesgos detectados', 'warn');
  }

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