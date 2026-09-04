-- AUDITORÍA FORENSE — Cadena de hashes inviolable
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prev_hash VARCHAR(64),           -- hash del registro anterior (blockchain-like)
    hash VARCHAR(64) NOT NULL,       -- SHA-256 de este registro
    entity_type VARCHAR(50) NOT NULL, -- tabla afectada (productos, ventas, empleados, etc)
    entity_id UUID,                   -- id del registro afectado
    action VARCHAR(20) NOT NULL,     -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, VIEW
    user_id UUID,                     -- quién lo hizo
    user_name VARCHAR(255),           -- nombre legible del usuario
    before_data JSONB,                -- estado ANTES del cambio
    after_data JSONB,                 -- estado DESPUÉS del cambio
    ip_address VARCHAR(45),           -- IP de origen
    user_agent VARCHAR(500),          -- navegador/dispositivo
    session_id VARCHAR(100),          -- sesión del usuario
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- No se puede modificar ni borrar por diseño
    CONSTRAINT chk_action CHECK (action IN ('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','VIEW','CANCEL','AUTH_FAIL','SECURITY'))
);

-- El hash es una función SHA-256 sobre: prev_hash + entity_type + entity_id + action + user_id + timestamp + before + after
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_trail(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_hash ON audit_trail(hash);

-- Índice especial para búsqueda por fecha/hora
CREATE INDEX IF NOT EXISTS idx_audit_date_range ON audit_trail(timestamp);

-- ================================================
-- EMPLEADOS Y RRHH (Fase 3 - pre-creada para forward-compat)
-- ================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(20) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    cedula VARCHAR(12) UNIQUE,
    rif VARCHAR(20),
    birth_date DATE,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    department VARCHAR(100),
    position VARCHAR(100),
    base_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVO',
    photo_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact TEXT,
    bank_account VARCHAR(50),
    notes TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP,
    CONSTRAINT chk_emp_status CHECK (status IN ('ACTIVO','VACACIONES','SUSPENDIDO','RENTA_ACTIVA','DESPIDIDO','RENUNCIA','RETIRO'))
);

CREATE TABLE IF NOT EXISTS employment_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    contract_type VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    salary DECIMAL(14,2) NOT NULL,
    benefits JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'VIGENTE',
    signed_date DATE,
    pdf_url TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_contract_type CHECK (contract_type IN ('FIJO','TEMPORAL','OBRA','PASANTIA','TERCERIZADO','SUPERNUMERARIO')),
    CONSTRAINT chk_contract_status CHECK (status IN ('VIGENTE','VENCIDO','RESCINDIDO','RENOVADO'))
);

CREATE TABLE IF NOT EXISTS terminations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    termination_type VARCHAR(30) NOT NULL,
    termination_date DATE NOT NULL,
    reason TEXT,
    severance_amount DECIMAL(14,2) DEFAULT 0,
    prestaciones_acumuladas DECIMAL(14,2) DEFAULT 0,
    vacaciones_pendientes DECIMAL(14,2) DEFAULT 0,
    indemnizacion_despido DECIMAL(14,2) DEFAULT 0,
    total_liquidacion DECIMAL(14,2) DEFAULT 0,
    notice_period_days INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PROCESADA',
    pdf_url TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_term_type CHECK (termination_type IN ('RENUNCIA','DESPIDO_JUSTIFICADO','DESPIDO_NO_JUSTIFICADO','MUTUO_ACUERDO','FIN_CONTRATO','JUBILACION','FALLECIMIENTO'))
);

-- ================================================
-- COMPRAS (Fase 2 - pre-creada)
-- ================================================
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requestor_id UUID REFERENCES usuarios(id),
    department VARCHAR(100),
    priority VARCHAR(10) DEFAULT 'NORMAL',
    status VARCHAR(20) DEFAULT 'BORRADOR',
    justification TEXT,
    items JSONB DEFAULT '[]',
    aprobado_por UUID,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(30) UNIQUE,
    supplier_id UUID,
    requisition_id UUID REFERENCES purchase_requisitions(id),
    subtotal DECIMAL(14,2) DEFAULT 0,
    iva DECIMAL(14,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'BORRADOR',
    items JSONB DEFAULT '[]',
    delivery_date DATE,
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- SERVICIOS (Fase 5)
-- ================================================
-- ================================================
-- CONTABILIDAD (Fase 4) — Plan de Cuentas y Libro Diario
-- ================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,          -- ACTIVO / PASIVO / PATRIMONIO / INGRESO / GASTO
    parent_code VARCHAR(20),
    saldo DECIMAL(14,2) DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    CONSTRAINT chk_account_type CHECK (type IN ('ACTIVO','PASIVO','PATRIMONIO','INGRESO','GASTO'))
);

CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(type);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(30) UNIQUE NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    referencia VARCHAR(100),
    descripcion TEXT,
    source VARCHAR(30) NOT NULL,        -- VENTA / COMPRA / NOMINA / MANUAL
    source_id UUID,
    total_debito DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_credito DECIMAL(14,2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_source CHECK (source IN ('VENTA','COMPRA','NOMINA','MANUAL'))
);

CREATE INDEX IF NOT EXISTS idx_journal_fecha ON journal_entries(fecha DESC);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    debit DECIMAL(14,2) NOT NULL DEFAULT 0,
    credit DECIMAL(14,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (entry_id) REFERENCES journal_entries(id)
);

-- ================================================
-- RRHH: EVALUACIONES DE DESEMPEÑO (Fase 3.5)
-- ================================================
CREATE TABLE IF NOT EXISTS employee_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    period VARCHAR(20) NOT NULL,        -- ej. 2026-S1
    evaluator VARCHAR(255),
    punctuality INTEGER DEFAULT 3,      -- 1-5
    quality INTEGER DEFAULT 3,
    teamwork INTEGER DEFAULT 3,
    productivity INTEGER DEFAULT 3,
    overall_score DECIMAL(4,2) DEFAULT 3.00,
    comments TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_eval_score CHECK (punctuality BETWEEN 1 AND 5 AND quality BETWEEN 1 AND 5 AND teamwork BETWEEN 1 AND 5 AND productivity BETWEEN 1 AND 5)
);

-- ================================================
-- COMPRAS: EVALUACIÓN DE PROVEEDORES (Fase 2.4)
-- ================================================
CREATE TABLE IF NOT EXISTS supplier_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL,
    po_id UUID,
    quality INTEGER DEFAULT 3,          -- 1-5 calidad del producto
    timeliness INTEGER DEFAULT 3,       -- 1-5 puntualidad de entrega
    price_competitiveness INTEGER DEFAULT 3, -- 1-5 competitividad de precio
    overall DECIMAL(3,1) DEFAULT 3.0,
    comments TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- SERVICIOS (Fase 5)
-- ================================================
CREATE TABLE IF NOT EXISTS services (
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(14,2) NOT NULL DEFAULT 0,
    duracion_estimada_horas DECIMAL(6,1) DEFAULT 0,
    categoria VARCHAR(50) DEFAULT 'general',
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);
);

-- ================================================
-- NÓMINA (Fase 3.3) — RSAI/VEN venezolana
-- ================================================
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo VARCHAR(20) NOT NULL,           -- ej. 2026-08
    fecha_inicio DATE,
    fecha_fin DATE,
    tipo VARCHAR(20) DEFAULT 'QUINCENAL',   -- QUINCENAL / MENSUAL
    total_gross DECIMAL(14,2) DEFAULT 0,
    total_deducciones DECIMAL(14,2) DEFAULT 0,
    total_neto DECIMAL(14,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'BORRADOR',  -- BORRADOR / PROCESADA / PAGADA
    procesado_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_payroll_estado CHECK (estado IN ('BORRADOR','PROCESADA','PAGADA'))
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    salario_base DECIMAL(14,2) NOT NULL DEFAULT 0,
    dias_trabajados INTEGER DEFAULT 30,
    asignaciones JSONB DEFAULT '[]',        -- [{concepto, monto}]
    horas_extra JSONB DEFAULT '[]',         -- [{tipo, horas, monto}]
    bono_transporte DECIMAL(14,2) DEFAULT 0,
    bono_alimentacion DECIMAL(14,2) DEFAULT 0,
    total_asignaciones DECIMAL(14,2) DEFAULT 0,
    retencion_ivss DECIMAL(14,2) DEFAULT 0,
    retencion_faov DECIMAL(14,2) DEFAULT 0,
    retencion_ince DECIMAL(14,2) DEFAULT 0,
    retencion_islr DECIMAL(14,2) DEFAULT 0,
    caja_ahorro DECIMAL(14,2) DEFAULT 0,
    prestamos DECIMAL(14,2) DEFAULT 0,
    otras_deducciones DECIMAL(14,2) DEFAULT 0,
    total_deducciones DECIMAL(14,2) DEFAULT 0,
    neto_pagar DECIMAL(14,2) DEFAULT 0,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_emp ON payroll_items(employee_id);

-- ================================================
-- COMPRAS — RECEPCIONES (Fase 2.3)
-- ================================================
CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id),
    items JSONB DEFAULT '[]',               -- [{producto_id, solicitado, recibido, ok}]
    received_by UUID REFERENCES usuarios(id),
    qc_status VARCHAR(20) DEFAULT 'PENDIENTE',
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cajero',
    rif VARCHAR(20),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    rif VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(255),
    direccion TEXT,
    tipo_cliente VARCHAR(20) DEFAULT 'CLIENTE_FINAL',
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP,
    CONSTRAINT chk_tipo_cliente CHECK (tipo_cliente IN ('CLIENTE_FINAL', 'CONTRIBUYENTE', 'EMPRESA', 'GOBIERNO'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_rif ON clientes(rif);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);

CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50),
    descripcion TEXT,
    precio DECIMAL(14,2) NOT NULL CHECK (precio >= 0),
    costo DECIMAL(14,2) DEFAULT 0,
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    stock_minimo INTEGER DEFAULT 5,
    categoria VARCHAR(50) NOT NULL DEFAULT 'general',
    categoria_id UUID REFERENCES categorias(id),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);

CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    cliente_id UUID REFERENCES clientes(id),
    numero_control VARCHAR(50),
    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
    iva DECIMAL(14,2) NOT NULL DEFAULT 0,
    total DECIMAL(14,2) NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'Efectivo',
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA',
    observaciones TEXT,
    motivo_cancelacion TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP,
    CONSTRAINT chk_estado CHECK (estado IN ('COMPLETADA', 'CANCELADA', 'PENDIENTE'))
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(creado_en);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);

CREATE TABLE IF NOT EXISTS venta_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    nombre VARCHAR(255) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(14,2) NOT NULL,
    tasa_iva DECIMAL(5,2) NOT NULL DEFAULT 16,
    monto_iva DECIMAL(14,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(14,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id)
);

CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id),
    tipo VARCHAR(20) NOT NULL,
    cantidad INTEGER NOT NULL,
    referencia TEXT,
    usuario VARCHAR(100),
    creado_en TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_tipo_mov CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'venta', 'anulacion'))
);

CREATE TABLE IF NOT EXISTS facturas_seniat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID REFERENCES ventas(id),
    numero_control VARCHAR(50) UNIQUE NOT NULL,
    rif_emisor VARCHAR(20) NOT NULL,
    rif_receptor VARCHAR(20),
    tipo_comprobante VARCHAR(5) NOT NULL,
    base_imponible_general DECIMAL(14,2) DEFAULT 0,
    base_imponible_reducido DECIMAL(14,2) DEFAULT 0,
    base_exenta DECIMAL(14,2) DEFAULT 0,
    iva_general DECIMAL(14,2) DEFAULT 0,
    iva_reducido DECIMAL(14,2) DEFAULT 0,
    total_iva DECIMAL(14,2) DEFAULT 0,
    total DECIMAL(14,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'AUTORIZADA',
    qr_data TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_control ON facturas_seniat(numero_control);
-- SEED: Plan de Cuentas básico venezolano (idempotente)
INSERT INTO chart_of_accounts (code, name, type)
VALUES
  ('1.1.1.01', 'Caja', 'ACTIVO'),
  ('1.1.1.02', 'Banco', 'ACTIVO'),
  ('1.1.2.01', 'Cuentas por cobrar clientes', 'ACTIVO'),
  ('1.1.3.01', 'Inventario de mercancías', 'ACTIVO'),
  ('1.1.4.01', 'IVA acreditable (compras)', 'ACTIVO'),
  ('1.2.1.01', 'Mobiliario y equipo', 'ACTIVO'),
  ('1.2.2.01', 'Equipos de cómputo', 'ACTIVO'),
  ('1.2.3.01', 'Depreciación acumulada', 'ACTIVO'),
  ('2.1.1.01', 'Cuentas por pagar proveedores', 'PASIVO'),
  ('2.1.2.01', 'IVA por pagar (ventas)', 'PASIVO'),
  ('2.1.3.01', 'Retenciones IVSS por pagar', 'PASIVO'),
  ('2.1.3.02', 'Retenciones FAOV por pagar', 'PASIVO'),
  ('2.1.3.03', 'Retenciones ISLR por pagar', 'PASIVO'),
  ('2.1.4.01', 'Sueldos por pagar', 'PASIVO'),
  ('2.1.5.01', 'Prestaciones sociales por pagar', 'PASIVO'),
  ('3.1.1.01', 'Capital social', 'PATRIMONIO'),
  ('3.1.2.01', 'Utilidades retenidas', 'PATRIMONIO'),
  ('4.1.1.01', 'Ventas de mercancías', 'INGRESO'),
  ('4.1.2.01', 'Ventas de servicios', 'INGRESO'),
  ('5.1.1.01', 'Costo de ventas', 'GASTO'),
  ('5.2.1.01', 'Gasto de sueldos y salarios', 'GASTO'),
  ('5.2.1.02', 'Gasto de cesta ticket', 'GASTO'),
  ('5.2.2.01', 'Gasto de alquiler', 'GASTO'),
  ('5.2.3.01', 'Gasto de servicios públicos', 'GASTO'),
  ('5.2.4.01', 'Gasto de depreciación', 'GASTO')
ON CONFLICT (code) DO NOTHING;
