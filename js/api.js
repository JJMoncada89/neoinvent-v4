/* ============================================================
   NEOINVENT — API CLIENT DUAL (backend PostgreSQL + fallback localStorage)
   Si hay backend desplegado (API_BASE configurada) usa PostgreSQL;
   si no responde, cae automáticamente a los datos locales del navegador.
   La API base se configura en Ajustes → Conexión al backend.
   ============================================================ */
(function (global) {
  'use strict';

  const API_KEY = 'neoinvent_api_url';

  function apiBase() {
    // 1º configuración explícita del usuario (Ajustes)
    const saved = localStorage.getItem(API_KEY);
    if (saved) return saved.replace(/\/+$/, '');
    // 2º variable inyectada en build
    if (typeof VITE_API_URL !== 'undefined' && VITE_API_URL) return VITE_API_URL.replace(/\/+$/, '');
    // 3º proxy dev local (vite server.proxy /api → localhost:4000)
    return '/api';
  }

  function saveBase(url) {
    localStorage.setItem(API_KEY, url.replace(/\/+$/, ''));
  }

  async function backendAvailable() {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(apiBase() + '/health', { signal: ctrl.signal });
      clearTimeout(to);
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function request(path, { method = 'GET', body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const auth = token || localStorage.getItem('neoinvent_jwt') || '';
    if (auth) headers['Authorization'] = 'Bearer ' + auth;
    const res = await fetch(apiBase() + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Error ' + res.status);
    }
    return res.json();
  }

  // ---------- Sesión ----------
  async function login(username, password) {
    if (!(await backendAvailable())) return { source: 'local', ok: false };
    try {
      // El backend acepta username o email como identificación
      const data = await request('/api/v1/auth/login', { method: 'POST', body: { email: username, password } });
      return { source: 'backend', ok: true, token: data.token, user: data.user };
    } catch (e) {
      return { source: 'local', ok: false, error: e.message };
    }
  }

  // ---------- Usuarios (CRUD) ----------
  async function listUsers() {
    if (!(await backendAvailable())) return { source: 'local' };
    try {
      const data = await request('/api/v1/users');
      return { source: 'backend', users: data };
    } catch (e) {
      return { source: 'local', error: e.message };
    }
  }

  async function createUser(payload) {
    if (!(await backendAvailable())) return { source: 'local' };
    try {
      await request('/api/v1/users', { method: 'POST', body: payload });
      return { source: 'backend', ok: true };
    } catch (e) {
      return { source: 'local', ok: false, error: e.message };
    }
  }

  async function updateUser(id, payload) {
    if (!(await backendAvailable())) return { source: 'local' };
    try {
      await request('/api/v1/users/' + id, { method: 'PUT', body: payload });
      return { source: 'backend', ok: true };
    } catch (e) {
      return { source: 'local', ok: false, error: e.message };
    }
  }

  async function deleteUser(id) {
    if (!(await backendAvailable())) return { source: 'local' };
    try {
      await request('/api/v1/users/' + id, { method: 'DELETE' });
      return { source: 'backend', ok: true };
    } catch (e) {
      return { source: 'local', ok: false, error: e.message };
    }
  }

  global.API = {
    API_KEY, apiBase, saveBase, backendAvailable, login, listUsers, createUser, updateUser, deleteUser,
  };
})(window);