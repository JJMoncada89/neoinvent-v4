-- NEOINVENT V4 - Esquema PostgreSQL con cumplimiento SENIAT Venezuela
-- Ejecutar con: npm run migrate

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