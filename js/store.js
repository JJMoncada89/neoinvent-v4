/* ============================================================
   NEOINVENT V4 — Store (persistencia + lógica de datos)
   Capa de datos sobre localStorage + exportación/importación JSON.
   ============================================================ */
(function (global) {
  'use strict';

  const DB_KEY = 'neoinvent_v4_db';

  // ---------- Datos iniciales (seed de demostración) ----------
  const seed = {
    settings: {
      businessName: 'Mi Negocio',
      currency: 'USD',
      taxRate: 0,
      receiptFooter: '¡Gracias por su compra!',
      lowStockThreshold: 5,
    },
    users: [
      { id: 'u1', username: 'admin', password: 'admin123', name: 'Administrador', role: 'admin' },
    ],
    categories: [
      { id: 'c1', name: 'Comestibles' },
      { id: 'c2', name: 'Bebidas' },
      { id: 'c3', name: 'Limpieza' },
    ],
    providers: [
      { id: 'pr1', name: 'Multidistribuidora del Norte', contact: 'vendedor@mdnorte.com', phone: '555-0101' },
      { id: 'pr2', name: 'Almacén Mayorista Sur', contact: 'Proveeduría Mayorista', phone: '555-0102' },
      { id: 'pr3', name: 'Distribuidora Local', contact: 'Carlos Ruiz', phone: '555-0103' },
    ],
    customers: [
      { id: 'cl1', name: 'Cliente Final', phone: '', email: '', address: '' },
    ],
    products: [
      { id: 'p1', sku: 'SKU-001', name: 'Harina de Trigo', categoryId: 'c1', providerId: 'pr1', cost: 18, price: 32, stockMin: 10, stock: 60 },
      { id: 'p2', sku: 'SKU-002', name: 'Aceite Vegetal 1L', categoryId: 'c1', providerId: 'pr1', cost: 38, price: 62, stockMin: 8, stock: 24 },
      { id: 'p3', sku: 'SKU-003', name: 'Refresco Cola 600ml', categoryId: 'c2', providerId: 'pr2', cost: 15, price: 26, stockMin: 12, stock: 40 },
      { id: 'p4', sku: 'SKU-004', name: 'Detergente 1kg', categoryId: 'c3', providerId: 'pr2', cost: 22, price: 40, stockMin: 6, stock: 5 },
      { id: 'p5', sku: 'SKU-005', name: 'Café Molido 250g', categoryId: 'c1', providerId: 'pr3', cost: 55, price: 85, stockMin: 5, stock: 12 },
    ],
    sales: [],       // ventas (incluye líneas de items)
    movements: [],   // kardex: entradas/salidas de stock
    nextSaleSeq: 0,
    version: 4,
  };

  let db = null;

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function load() {
    if (db) return db;
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === seed.version) {
          db = parsed;
          ensureCollections();
          return db;
        }
      } catch (e) {
        console.error('DB corrupta, reiniciando', e);
      }
    }
    db = deepClone(seed);
    persist();
    return db;
  }

  function get() {
    return load(); // inicialización perezosa
  }

  function persist() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  // ---------- Migración ligera: garantiza colecciones nuevas ----------
  function ensureCollections() {
    if (!Array.isArray(db.providers)) db.providers = [];
    if (!Array.isArray(db.movements)) db.movements = [];
    if (!Array.isArray(db.sales)) db.sales = [];
    if (typeof db.nextSaleSeq !== 'number') db.nextSaleSeq = 0;
  }

  function reset() {
    db = deepClone(seed);
    persist();
  }

  function categoryName(id) {
    const c = db.categories.find(x => x.id === id);
    return c ? c.name : 'Sin categoría';
  }

  function providerName(id) {
    const p = db.providers.find(x => x.id === id);
    return p ? p.name : 'Sin proveedor';
  }

  function productById(id) {
    return db.products.find(p => p.id === id);
  }

  function customerById(id) {
    return db.customers.find(c => c.id === id);
  }

  // ---------- Alta / actualización de stock con registro kardex ----------
  function adjustStock(productId, type, qty, ref, user) {
    const p = productById(productId);
    if (!p) return;
    const sign = type === 'salida' ? -1 : 1;
    p.stock = Math.max(0, Number(p.stock) + sign * qty);
    db.movements.push({
      id: uid('mv'), date: new Date().toISOString(), productId,
      type, qty, ref: ref || '', user: user || 'sistema',
    });
    persist();
    return p;
  }

  global.Store = {
    DB_KEY, load, persist, reset, uid, deepClone,
    get, categoryName, providerName, productById, customerById, adjustStock,
  };

  // Sembrar/leer base al cargar el módulo
  load();
})(window);