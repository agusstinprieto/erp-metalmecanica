-- MCVILL ERP: P2 — Trazabilidad por Número de Parte
-- Lotes de material, uso de lotes en órdenes e historial de revisiones

-- 1. Lotes de Material
--    Cada recepción de material de un proveedor genera un lote con su número de colada
CREATE TABLE IF NOT EXISTS lotes_materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero_lote TEXT NOT NULL,                       -- LOT-2026-001
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    descripcion TEXT,                                -- fallback si no hay material_id
    proveedor TEXT,
    numero_colada TEXT,                              -- heat number para metales
    fecha_recepcion DATE DEFAULT CURRENT_DATE,
    cantidad_inicial NUMERIC NOT NULL DEFAULT 0,
    cantidad_disponible NUMERIC NOT NULL DEFAULT 0,
    unidad TEXT DEFAULT 'kg',
    cert_calidad_url TEXT,                           -- enlace al certificado de calidad
    status TEXT DEFAULT 'disponible'
        CHECK (status IN ('disponible', 'agotado', 'cuarentena', 'rechazado')),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (tenant_id, numero_lote)
);

-- 2. Trazabilidad de Uso de Lote
--    Vincula qué lote se consumió en qué viajero/orden, con qué cantidad
CREATE TABLE IF NOT EXISTS trazabilidad_uso_lote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    lote_id UUID REFERENCES lotes_materiales(id) ON DELETE CASCADE,
    viajero_id TEXT NOT NULL,                        -- FK lógica a viajeros
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    operacion TEXT,                                  -- operación donde se consumió
    cantidad_usada NUMERIC NOT NULL DEFAULT 0,
    registrado_por TEXT,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Historial de Revisiones de Producto
--    Rastreo de cambios de revisión en productos (A → B → C)
CREATE TABLE IF NOT EXISTS product_revision_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT,                                        -- copia del SKU para consulta rápida
    revision_anterior TEXT,
    revision_nueva TEXT NOT NULL,
    descripcion_cambio TEXT,
    motivo TEXT,
    impacto TEXT,                                    -- BOM, plano, proceso, dimensiones
    fecha_cambio DATE DEFAULT CURRENT_DATE,
    cambiado_por TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE lotes_materiales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trazabilidad_uso_lote    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_revision_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotes_select"    ON lotes_materiales         FOR SELECT USING (true);
CREATE POLICY "lotes_all"       ON lotes_materiales         FOR ALL    USING (true);
CREATE POLICY "uso_lote_select" ON trazabilidad_uso_lote    FOR SELECT USING (true);
CREATE POLICY "uso_lote_all"    ON trazabilidad_uso_lote    FOR ALL    USING (true);
CREATE POLICY "rev_select"      ON product_revision_history FOR SELECT USING (true);
CREATE POLICY "rev_all"         ON product_revision_history FOR ALL    USING (true);

-- Auto updated_at para lotes
CREATE TRIGGER lotes_updated_at
    BEFORE UPDATE ON lotes_materiales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para búsquedas de trazabilidad
CREATE INDEX IF NOT EXISTS idx_uso_lote_lote    ON trazabilidad_uso_lote (lote_id);
CREATE INDEX IF NOT EXISTS idx_uso_lote_viajero ON trazabilidad_uso_lote (viajero_id);
CREATE INDEX IF NOT EXISTS idx_rev_product      ON product_revision_history (product_id);
CREATE INDEX IF NOT EXISTS idx_lotes_material   ON lotes_materiales (material_id);
CREATE INDEX IF NOT EXISTS idx_lotes_status     ON lotes_materiales (status);
