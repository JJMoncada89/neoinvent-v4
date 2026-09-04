/* ============================================================
   NEOINVENT V4 — App (sesión, router, sidebar, navegación)
   ============================================================ */
(function () {
  'use strict';

  const SESSION_KEY = 'neoinvent_v4_session';

  function loginScreen() { return document.getElementById('login-screen'); }
  function appEl() { return document.getElementById('app'); }
  function contentEl() { return document.getElementById('content'); }
  function navEl() { return document.getElementById('sidebar-nav'); }
  function pageTitle() { return document.getElementById('page-title'); }
  function pageSubtitle() { return document.getElementById('page-subtitle'); }
  function topbarActions() { return document.getElementById('topbar-actions'); }
  function userChip() { return document.getElementById('user-chip'); }

  let session = null;

  // Registro de vistas
  window.Views = window.Views || {};

  function register(id, def) {
    Views[id] = def; // def: {title, subtitle, render, mount}
  }

  // ---------- Sesión ----------
  function authSession(record) {
    session = record;
    localStorage.setItem(SESSION_KEY, JSON.stringify(record));
  }
  function logout() {
    session = null;
    Store.logEvent('LOGOUT', 'auth', 'Cierre de sesión', session?.username || 'unknown');
    localStorage.removeItem(SESSION_KEY);
    location.hash = '';
    appEl().hidden = true;
    loginScreen().hidden = false;
    contentEl().innerHTML = '';
  }
  function currentUser() { return session; }

  // ---------- Atajo secreto: Ctrl+Alt+A → Auditoría Forense ----------
  function setupSecretShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (!session) return; // requiere sesión
        // Registrar intento de acceso al panel oculto
        Store.logEvent('SECURITY', 'audit-access', 'Intento acceder a auditoría forense', session?.username || 'unknown');
        location.hash = '#/audit';
        goRoute();
        UI.toast('Panel de auditoría', 'info');
      }
    });
  }

  // ---------- Sidebar ----------
  const BUILD_MENU = [
    { id: 'dashboard', title: 'Dashboard', icon: 'M3 3h8v8H3zM13 3h8v5h-8zM3 13h5v8H3zM13 13h8v8h-8z' },
    { id: 'pos', title: 'Punto de Venta', icon: 'M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 4h16M12 15v4' },
    { id: 'inventory', title: 'Inventario', icon: 'M3 7l9-4 9 4v10l-9 4-9-4V7z' },
    { id: 'sales', title: 'Ventas', icon: 'M13 2L3 14h6l-2 8 10-12h-6l2-8z' },
    { id: 'clients', title: 'Clientes', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    { id: 'reports', title: 'Reportes', icon: 'M21 12v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-1a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2z' },
    { id: 'hr', title: 'RRHH', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    { id: 'payroll', title: 'Nómina', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { id: 'purchasing', title: 'Compras', icon: 'M3 6l2-3h14l2 3M3 6v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6M3 6h18M9 10h6' },
    { id: 'accounting', title: 'Contabilidad', icon: 'M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4zM8 2v4M12 8v4M12 14v4M16 2v4' },
    { id: 'settings', title: 'Ajustes', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l1.7 1.3a1 1 0 0 1 .2 1.4l-1.6 2.7a1 1 0 0 1-1.3.4l-2-.9a7 7 0 0 1-2 .8l-.3 2.1a1 1 0 0 1-1 .8H9.3a1 1 0 0 1-1-.8l-.3-2.1a7 7 0 0 1-2-.8l-2 .9a1 1 0 0 1-1.3-.4L1.1 14a1 1 0 0 1 .2-1.4L3 11.3a7.6 7.6 0 0 1 0-1.7L1.3 8.3a1 1 0 0 1-.2-1.4l1.6-2.7a1 1 0 0 1 1.3-.5l2 .9a7 7 0 0 1 2-.8l.3-2.1a1 1 0 0 1 1-.8h3.2a1 1 0 0 1 1 .8l.3 2.1a7 7 0 0 1 2 .8l2-.9a1 1 0 0 1 1.3.5L19.6 7a1 1 0 0 1-.2 1.4L17.7 9.7' },
  ];

  // ---------- Render de navegación ----------
  function renderNav() {
    navEl().innerHTML = BUILD_MENU.map(m =>
      '<a href="#/' + m.id + '" class="nav-item" data-nav="' + m.id + '">' +
      '<svg viewBox="0 0 24 24" class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + m.icon + '"/></svg>' +
      '<span>' + m.title + '</span></a>'
    ).join('');
  }

  // ---------- Router ----------
  function goRoute() {
    if (!session) { contentEl().innerHTML = ''; return; }
    const allowed = BUILD_MENU.map(m => m.id);
    let key = (location.hash || '#/dashboard').replace(/^#\//, '');
    let base = key.split('/')[0];
    if (allowed.indexOf(base) === -1 && base !== 'audit') base = 'dashboard'; // 'audit' es acceso oculto (Ctrl+Alt+A)

    topbarActions().innerHTML = '';
    const def = window.Views[base];
    if (!def) { contentEl().innerHTML = '<div class="empty">Vista en construcción</div>'; return; }

    pageTitle().textContent = def.title || base;
    pageSubtitle().textContent = def.subtitle || '';

    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.nav === base);
    });

    const ctx = { currentUser: session, nav: goRoute, reload: goRoute };
    contentEl().innerHTML = def.render(ctx);
    if (def.mount) def.mount(ctx, contentEl());
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  // ---------- Login ----------
  function doLogin(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    const dbU = Store.get().users.find(x => x.username === u && x.password === p);
    if (!dbU) {
      err.textContent = 'Usuario o contraseña incorrectos';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    authSession({ id: dbU.id, username: dbU.username, name: dbU.name, role: dbU.role });
    Store.logEvent('LOGIN', 'auth', 'Inicio de sesión exitoso', dbU.username);
    enterApp();
  }

  function enterApp() {
    loginScreen().hidden = true;
    appEl().hidden = false;
    userChip().innerHTML =
      '<div class="user-avatar">' + Utils.esc(session.name.charAt(0).toUpperCase()) + '</div>' +
      '<div><strong>' + Utils.esc(session.name) + '</strong><span>' + Utils.esc(session.role) + '</span></div>';
    renderNav();
    if (!location.hash) location.hash = '#/dashboard';
    else goRoute();
  }

  // ---------- Wire ----------
  document.addEventListener('DOMContentLoaded', () => {
    // Registro PWA (no crítico)
    if (navigator.serviceWorker && navigator.serviceWorker.register) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }

    document.getElementById('login-form').addEventListener('submit', doLogin);
    const menuBtn = document.getElementById('btn-menu');
    const sb = document.getElementById('sidebar');
    if (menuBtn) menuBtn.addEventListener('click', () => sb.classList.toggle('open'));
    document.addEventListener('click', (ev) => {
      if (!sb.contains(ev.target) && sb.classList.contains('open')) sb.classList.remove('open');
    });
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('modal-close').addEventListener('click', UI.closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (ev) => {
      if (ev.target === document.getElementById('modal-overlay')) UI.closeModal();
    });
    window.addEventListener('hashchange', goRoute);
    setupSecretShortcut();

    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        session = JSON.parse(saved);
        if (session) { enterApp(); return; }
      } catch (e) { /* fall through */ }
    }
    loginScreen().hidden = false;
  });

  window.App = { go: goRoute, logout, register: register, currentUser, auth: authSession };
})();