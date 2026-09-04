# 🏢 NEOINVENT ENTERPRISE V5 — Roadmap Maestro
> Sistema Empresarial Integral con Cumplimiento Fiscal Venezuela y Auditoría Forense
> Documento vivo — actualizado tras cada milestone

---

## ARQUITECTURA EMPRESARIAL INVESTIGADA

### Departamentos de una empresa real:
| Depto | Responsabilidades | Procesos clave | Documentos | Interacciones |
|---|---|---|---|---|
| **Ventas** | Cotizaciones, pedidos, facturación, cobranza | Lead→Quote→Order→Invoice→Payment | Cotización, Orden, Factura | Finance, Inventory, CRM |
| **Compras** | Requisición, RFQ, PO, recepción, pago | Req→RFQ→PO→GR→IV→Payment | Requisición, Orden Compra | Inventory, Finance |
| **Inventario** | Stock, warehouse, transfers, cycle counts | Recepción→Almacenaje→Pick→Ship→Count | Nota entrada/salida | Purchasing, Sales |
| **RRHH** | Reclutamiento, contratos, nómina, despidos | Vacante→Contratación→Payroll→Offboard | Contrato, Acta, Liquidación | Finance, Legal |
| **Contabilidad** | Libros, asientos, balance, impuestos | Journal→Ledger→Trial→Financial stmts | Asiento, Balance | TODOS |
| **Administración** | Contratos, legal, seguros | Redacción→Revisión→Firma→Renovación | Contrato, Poder | HR, Finance |
| **IT/Sistemas** | Hardware, software, licences | Inventario assets→Deployment→Support | Inventario IT, Licencia | TODOS |
| **Logística** | Envíos, carriers, tracking | Packing→Dispatch→Track→Deliver | Guía remisión | Warehouse, Sales |
| **Calidad** | Inspecciones, no conformidades | Inspect→Identify→Analyze→Correct | Reporte QC | Production, Procurement |
| **Marketing** | Campañas, leads, analítica | Campaign→Generate→Nurture→Hand-off | Brief, Reporte | Sales |

---

## ROADMAP DE DESARROLLO

### 📌 FASE 0 — Investigación y Diseño (COMPLETADA ✅)
- [x] Investigar departamentos empresariales reales
- [x] Diseñar arquitectura de auditoría forense
- [x] Definir modelo de datos extendido
- [x] Investigar normativa laboral venezolana

### 🔨 FASE 1 — AUDITORÍA FORENSE (PRIORIDAD MÁXIMA) — 90% COMPLETADA ✅
> Sistema de registro transaccional secreto e inviolable

- [x] **1.1** Tabla `audit_trail` con hash chaining (SHA-256) ✅
  - Campos: prev_hash, hash, entity_type, entity_id, action, user_id, before/after JSONB, IP, user_agent, session, timestamp
  - Verificación de integridad (`verificarIntegridad`) que recorre toda la cadena
- [x] **1.2** Middleware interceptor (`auditLog.js`) de operaciones ✅
  - Intercepta CREATE/UPDATE/DELETE en productos, ventas y auth
  - Captura before/after automaticamente
- [x] **1.3** Acceso con clave maestra (`MASTER_AUDIT_KEY_HASH`) ✅
  - Hash SHA-256 de la clave (nunca se guarda en texto plano)
  - `Crypto.timingSafeEqual` para comparación segura
  - Registra intentos fallidos como `AUTH_FAIL`
- [x] **1.4** Frontend: vista oculta `Ctrl+Alt+A` ✅
  - No aparece en el menú lateral
  - Atajo secreto + entrada de clave maestra
  - Vista local (localStorage 'neoinvent_v4_events') + endpoint backend `/api/v1/audit/*`
- [x] **1.5** Registro automático de eventos locales ✅
  - `Store.logEvent()` en cada login, logout, venta, ajuste de stock
  - Máximo 5000 eventos con timestamp exacto, user, device
- [ ] **1.6** Exportación forense CSV full desde backend (parcial: local sí, backend requiere token)

### 🔨 FASE 3 — RRHH — 60% COMPLETADA ✅
- [x] **3.1** Gestión de empleados (CRUD + seed demo) ✅
- [x] **3.2** Contratos laborales (tipos LOTTT: FIJO, TEMPORAL, OBRA...) ✅
- [ ] **3.3** Nómina (IVSS, FAOV, ISLR) — backend listo, front falta
- [x] **3.4** Despidos/renuncias/terminaciones (tipos LOT) ✅
- [ ] **3.5** Evaluaciones de desempeño

### 🔨 FASE 4 — CONTABILIDAD
- [ ] **4.1** Plan de cuentas
- [ ] **4.2** Asientos automáticos
- [ ] **4.3** Balance general
- [ ] **4.4** Declaración IVA

### 🔨 FASE 5 — SERVICIOS Y TECNOLOGÍA
- [ ] **5.1** Catálogo de servicios
- [ ] **5.2** Activos TI
- [ ] **5.3** Contratos con SLA
- [ ] **5.4** Órdenes de trabajo

### 🔨 FASE 6 — DASHBOARD EJECUTIVO

---

## PROGRESO
| Fase | Estado | Progreso | Última actualización |
|---|---|---|---|
| 0 - Investigación | ✅ | 100% | 27-ago-2026 |
| 1 - Auditoría Forense | 🔧 Casi completa | 90% | 27-ago-2026 |
| 2 - Compras | ⏳ Pendiente | 0% | — |
| 3 - RRHH | 🔧 En progreso | 60% | 27-ago-2026 |
| 4 - Contabilidad | ⏳ Pendiente | 0% | — |
| 5 - Servicios | ⏳ Pendiente | 0% | — |
| 6 - Dashboard | ⏳ Pendiente | 0% | — |