-- MCVILL ERP: Abastecimiento & Compras Migration
-- Missing catalog tables for procurement and industrial operations

-- 1. Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    razon_social TEXT NOT NULL,
    rfc TEXT,
    categoria TEXT DEFAULT 'material', -- material, servicio, maquila, herramienta, otro
    nombre_contacto TEXT,
    email TEXT,
    telefono TEXT,
    ciudad TEXT,
    condicion_pago TEXT DEFAULT 'credito_30', -- contado, credito_15, credito_30, credito_60, credito_90
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Catálogo de Materiales
CREATE TABLE IF NOT EXISTS materiales_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    clave TEXT UNIQUE NOT NULL,
    descripcion TEXT NOT NULL,
    tipo TEXT DEFAULT 'placa', -- placa, tubo, barra, consumible, refaccion, herramienta, otro
    unidad_medida TEXT DEFAULT 'kg', -- kg, pza, m, lt
    precio_unitario NUMERIC DEFAULT 0,
    stock_actual NUMERIC DEFAULT 0,
    stock_minimo NUMERIC DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Catálogo de Operaciones e Industriales
CREATE TABLE IF NOT EXISTS operaciones_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    clave TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    centro_trabajo TEXT,
    tarifa_hora NUMERIC DEFAULT 0,
    tiempo_configuracion_default NUMERIC DEFAULT 0, -- en minutos
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE operaciones_catalogo ENABLE ROW LEVEL SECURITY;

-- Basic policies for anonymous/authenticated access (McVill Demo standard)
CREATE POLICY "Proveedores access" ON proveedores FOR ALL USING (true);
CREATE POLICY "Materiales catalogo access" ON materiales_catalogo FOR ALL USING (true);
CREATE POLICY "Operaciones catalogo access" ON operaciones_catalogo FOR ALL USING (true);

-- Indices for search optimization
CREATE INDEX IF NOT EXISTS idx_proveedores_razon ON proveedores(razon_social);
CREATE INDEX IF NOT EXISTS idx_materiales_clave ON materiales_catalogo(clave);
CREATE INDEX IF NOT EXISTS idx_operaciones_clave ON operaciones_catalogo(clave);
