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

### 🔨 FASE 2 — COMPRAS — 70% COMPLETADA ✅
- [x] **2.1** Requisiciones de compra (frontend local + backend) ✅
- [x] **2.2** Órdenes de compra (PO) con IVA 16% automático ✅
- [x] **2.3** Recepción de mercancía que actualiza stock ✅
- [x] **2.5** Proveedores reutilizados del módulo inventario ✅
- [ ] **2.4** Evaluación de proveedores (rating) — pendiente

### 🔨 FASE 3 — RRHH — 85% COMPLETADA ✅
- [x] **3.1** Gestión de empleados (CRUD + seed demo) ✅
- [x] **3.2** Contratos laborales (tipos LOTTT: FIJO, TEMPORAL, OBRA...) ✅
- [x] **3.3** Nómina con IVSS 4% + FAOV 2% + INCE 0.5% + ISLR progresivo UT ✅
  - Backend: `payrollController.js` con `calcularISLR` por tramos UT + `runPayroll`
  - Frontend: `js/views/payroll.js` con cálculo, comprobante imprimible y persistencia de corridas
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

## 🔄 CÓMO CONTINUAR DESDE AQUÍ (checkpoint)

Al retomar la sesión, el estado se reconstruye así:
1. **Repo**: `JJMoncada89/neoinvent-v4`, rama `main` HEAD `553e525`.
2. **Backend** en `backend/`: Express + PG, rutas en `src/routes/`, controladores en `src/controllers/`. Esquema SQL en `src/config/schema.sql` (8+ tablas: usuarios, productos, ventas, venta_items, clientes, facturas_seniat, movimientos_inventario, categorías + employees, contracts, terminations, requisitions, POs, services + audit_trail).
3. **Auditoría forense**: `backend/src/services/auditService.js` (hash-chain SHA-256), middleware `auditLog.js`, rutas `/api/v1/audit/*` con clave maestra `MASTER_AUDIT_KEY_HASH`. Frontend: `js/views/audit.js` + atajo `Ctrl+Alt+A` en `js/app.js`.
4. **RRHH 85%**: `hrController.js` + `js/views/hr.js` (empleados/contratos/despidos) + `payrollController.js` + `js/views/payroll.js` (nómina IVSS/FAOV/INCE/ISLR).
5. **Compras 70%**: `purchaseController.js` + `js/views/purchasing.js` (requisiciones→PO→recepción). Falta 2.4 evaluación de proveedores.
6. **Pendiente Fase 4 (Contabilidad)**: plan de cuentas, asientos automáticos, balance, declaración IVA. 
7. **Pendiente Fase 5**: servicios/activos TI/SLA. **Fase 6**: dashboard ejecutivo por departamento.
8. **Gate de calidad**: ejecutar `node --check` en todo JS + test E2E `/tmp/vtest/browser_test.js` antes de cada push.

Próximo milestone lógico: **3.5 Evaluaciones de desempeño**, **2.4 Evaluación de proveedores**, o **Fase 4 Contabilidad** (asientos automáticos por venta/compras/nómina).

## PROGRESO
| Fase | Estado | Progreso | Última actualización |
|---|---|---|---|
| 0 - Investigación | ✅ | 100% | 27-ago-2026 |
| 1 - Auditoría Forense | 🔧 Casi completa | 90% | 27-ago-2026 |
| 2 - Compras | 🔧 Casi completa | 70% | 27-ago-2026 |
| 3 - RRHH | 🔧 Casi completa | 85% | 27-ago-2026 |
| 4 - Contabilidad | ⏳ Pendiente | 0% | — |
| 5 - Servicios | ⏳ Pendiente | 0% | — |
| 6 - Dashboard | ⏳ Pendiente | 0% | — |