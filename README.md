# 🏆 NEOINVENT V4 — Inventario & Punto de Venta

Sistema profesional de gestión de inventario y punto de venta (POS), **100% JavaScript** (Vanilla), **sin dependencias externas**, sin base de datos remota y **sin pasos de compilación**. Reescritura completa desde cero tras el fracaso del deploy en Render de la versión anterior (BuildV3-deploy-fix).

---

## 🚀 Características

| Módulo | Funcionalidades |
|---|---|
| 🔐 **Autenticación** | Login con roles (**Admin / Cajero**), sesión persistente, contraseñas con hash SHA-256 |
| 📊 **Dashboard** | KPIs (ventas de hoy, ingresos, ganancia, valor de inventario), gráfica SVG propia de los últimos 7 días, top 5 productos, alertas de stock bajo |
| 🛒 **Punto de Venta** | Carrito, búsqueda de productos, descuentos, impuesto configurable, selección de cliente, métodos de pago, **impresión de ticket** |
| 📦 **Inventario** | CRUD de productos y categorías, **kardex de movimientos** (entradas/salidas/ajustes/reposición), stock mínimo configurable, alertas |
| 🚚 **Proveedores** | CRUD completo de proveedores y asignación por producto (contacto, teléfono) |
| 💰 **Ventas** | Historial filtrable, detalle completo de cada venta y **anulación que devuelve stock automáticamente** |
| 👥 **Clientes** | CRUD de clientes con historial de compras acumulado |
| 📤 **Reportes** | Filtros por rango de fechas, resumen de ingresos/ganancias/unidades y **exportación CSV** |
| ⚙️ **Ajustes** | Datos del negocio, moneda e impuesto global, alta/baja de usuarios, **respaldo y restauración JSON**, reinicio de demo |
| 📱 **PWA** | Instalable en móvil/desktop (`manifest.json` + Service Worker) y **funciona 100% offline** |

## 🔑 Credenciales demo
- Usuario: `admin` · Contraseña: `admin123`
- (Cajero demo: `cajero1` / `cajero123`, permisos restringidos)

## 🖥️ Cómo ejecutar (3 opciones)

### 1) Abrir directo (sin instalar nada)
Abre `index.html` en cualquier navegador moderno (Chrome, Edge, Firefox). Todo se guarda en el navegador (localStorage).

### 2) Servidor estático local
```bash
python3 -m http.server 8080
# abre http://localhost:8080
```
o con Node:
```bash
npx serve -l 5000
```

### 3) Desplegar en Render (recomendado, GRATIS)
Este repositorio está listo para Render **sin ningún ajuste adicional**:

| Campo | Valor |
|---|---|
| Tipo | **Static Site** |
| Build Command | *(vacío — no requiere build)* |
| Publish Directory | `.` *(raíz del repo)* |

1. En [render.com](https://render.com): **New → Static Site** y conecta este repo.
2. Deja el Build Command vacío y Publish Directory en `.`.
3. Deploy → Render entrega una URL pública HTTPS automáticamente.

Como el frontend es 100% estático, **el build no puede fallar**: no hay módulos rotos, no hay dependencias que resolver, no hay base de datos que provisionar. Cada cliente guarda sus datos en su propio navegador.

## 🗂️ Estructura del proyecto
```
.
├── index.html            # SPA única (shell de la aplicación)
├── css/styles.css        # Sistema de diseño propio (dark theme, responsive)
├── js/
│   ├── store.js          # Persistencia localStorage + lógica de negocio (seed incluido)
│   ├── utils.js          # Moneda, fechas, exportación CSV, helpers
│   ├── ui.js             # Modales, toasts, tablas, KPI cards, gráficas SVG
│   ├── app.js            # Sesión, router hash, layout/sidebar
│   └── views/
│       ├── dashboard.js  # Panel principal
│       ├── pos.js        # Punto de venta
│       ├── inventory.js  # Productos, categorías, kardex, proveedores
│       ├── sales.js      # Historial y detalle de ventas
│       ├── clients.js    # Clientes
│       ├── reports.js    # Reportes + CSV
│       └── settings.js   # Ajustes, usuarios, backup/restore
├── manifest.json         # Manifest PWA
├── sw.js                 # Service Worker (cache-first, offline)
├── .gitignore
└── README.md             # Este archivo
```

**Total:** ~1 750 líneas, 0 dependencias npm, 0 frameworks, 0 build tools.

## 💾 Datos y respaldo
- Los datos viven en `localStorage` bajo la clave `neoinvent_v4_db`.
- En **Ajustes → Respaldo** puedes descargar un **JSON** completo y restaurarlo en cualquier otro dispositivo/navegador.
- Para un sistema multi-dispositivo/multi-sucursal real, este mismo front puede conectarse a una API REST (la arquitectura de vistas ya desacopla `Store` de la UI).

## 🧾 ¿Por qué se reescribió? (BuildV3 → Build_V4)

La versión anterior fallaba el deploy en Render por defectos estructurales graves:

| Problema en BuildV3-deploy-fix | Solución en Build_V4 |
|---|---|
| Backend Python híbrido **doble** (dos árboles `src/`, dos ORMs SQLite/PostgreSQL coexistiendo) | Un solo front-end JS estático, un modelo de datos único |
| Imports fantasma y módulos declarados pero inexistentes (≥9 fixes de imports Use Case↔Ruta) | Cero imports entre archivos fuera de carga explícita; verificado con `node --check` |
| Dependencias rotas / versiones sin fijar en `requirements.txt` | **Cero dependencias** |
| Merge conflicts sin resolver (`<<<<<<<`) en `README.md` y `docker-compose.yml` | Repo limpio, generado de una sola pieza coherente |
| Dockerfile referencing pasos inexistentes (alembic) | Sin contenedores necesarios |
| Riesgo continuo de fallo de build/deploy | Un Static Site **no puede fallar el build** |

Se conservó el **concepto de negocio** (inventario, POS, ventas, reportes, roles) y se descartó toda la implementación rota.

## 🔮 Roadmap sugerido
- [ ] Sincronización multi-dispositivo (backend Node + Postgres opcional)
- [ ] Códigos de barras (cámara) y lector USB
- [ ] Facturación electrónica / CFDI según región
- [ ] Compras a proveedores (ordenes de compra) usando ya el catálogo existente
- [ ] Modo multi-caja con turnos y corte de caja

## 🏢 Módulo Enterprise

NeoInvent está escalando a **plataforma empresarial completa** (ver `ENTERPRISE_ROADMAP.md` para el plan maestro):

| Módulo | Estado | Ubicación |
|---|---|---|
| 🏛️ SENIAT fiscal (IVA 16/8/0, facturación, RIF) | ✅ Implementado | `backend/src/config/seniat.js` |
| 🔐 Auditoría Forense (hash-chaining SHA-256) | ✅ 90% | `backend/.../auditService.js` + `js/views/audit.js` |
| 👥 RRHH (empleados, contratos, despidos) | ✅ 60% | `backend/src/controllers/hrController.js` + `js/views/hr.js` |
| 🛒 Compras (requisiciones, PO, GR) | 📋 Esquema listo | `backend/src/config/schema.sql` |
| 🧾 Contabilidad | 📋 Roadmap | — |

### 🔐 Atajo secreto de auditoría (solo creador)
Presiona **Ctrl+Alt+A** dentro de la app conectada a sesión. Exige clave maestra (`MASTER_AUDIT_KEY_HASH`). Cada login, logout, venta y ajuste de stock queda registrado con timestamp, usuario, IP y hash encadenado. Acceso NO aparece en el menú lateral.

---
Hecho para ser simple, vendible y que **nunca vuelva a romper un deploy**. 👑

## 🧪 Testing por usuarios humanos (QA)

**Credenciales:** `admin` / `admin123`

### Flujo sugerido de prueba (15 min)
1. **Login** → verifica el dashboard ejecutivo (KPIs por departamento)
2. **POS** → vende un producto y un servicio (categoría 🛠️), imprime el ticket
3. **Inventario** → verifica que el stock bajó tras la venta, registra una reposición
4. **Compras** → crea requisición → emite PO → recibe mercancía (stock sube) → evalúa proveedor ⭐
5. **RRHH** → registra un empleado → crea contrato → evalúa desempeño 📊 → procesa una terminación (calcula liquidación LOTTT)
6. **Nómina** → calcula nómina del mes (IVSS/FAOV/INCE/ISLR) → imprime comprobante
7. **Contabilidad** → revisa Libro Diario (asientos automáticos), Balance General (debe cuadrar), IVA
8. **Reportes** → exporta CSV, envía reporte ejecutivo por email (configúralo en Ajustes)
9. **🔐 Secreto:** presiona **Ctrl+Alt+A** y revisa el historial forense — cada acción anterior debe estar registrada
10. **Ajustes** → cambia moneda/nombre, exporta backup JSON

### Bugs encontrados durante QA interna
- ~~Overlay fantasma bloqueante~~ (corregido, commit 7e82889)
- ~~Cierre anual con utilidad $0~~ (corregido: ingresos se debitaban con signo negativo)

## 🔐 Usuarios multi-admin / multi-vendedor (fix)

**Síntoma reportado:** los usuarios creados desde Ajustes no se podían editar y los admins/vendedores nuevos no podían iniciar sesión desde otro navegador en Render.

**Causa raíz:** el login y la gestión de usuarios vivían solo en el `localStorage` de cada navegador (modo demo offline). Cada navegador tenía sus propios usuarios — el creado en una máquina no existía en la otra.

**Solución implementada (modo dual):**
1. **`js/api.js`** — cliente API inteligente: si el backend PostgreSQL está disponible, crea/edita/elimina/loguea contra PostgreSQL (compartido por todos los navegadores). Si no hay backend, cae a localStorage (demo offline).
2. **Edición de usuarios** — nueva ✎ en la tabla de usuarios: cambia nombre, rol (admin/cajero/vendedor) y contraseña opcional.
3. **Login por username o email** en el backend.
4. **Seed automático** — `npm run seed` crea el admin inicial si no existe.

### Cómo conectarlo en Render (para multi-dispositivo REAL)
1. Asegúrate de tener el **Web Service del backend** (Node) + **PostgreSQL** desplegados (render.yaml incluido).
2. Ejecuta en la consola del Web Service: `npm run migrate` y luego `npm run seed`.
3. En el frontend → **Ajustes → URL del backend**: pega `https://tu-backend.onrender.com` y pulsa Enter.
4. A partir de ahí, **todos** los usuarios (admin/vendedor/cajero) creados quedan en PostgreSQL y entran desde **cualquier** navegador.
