-- MCVILL ERP: P26 — Inteligencia Financiera
-- Cuentas por Cobrar (CxC), Cuentas por Pagar (CxP)

-- 1. Cuentas por Cobrar
CREATE TABLE IF NOT EXISTS cuentas_cobrar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero_factura TEXT NOT NULL,
    cliente TEXT NOT NULL,
    concepto TEXT,
    monto NUMERIC NOT NULL DEFAULT 0,
    monto_cobrado NUMERIC NOT NULL DEFAULT 0,
    moneda TEXT DEFAULT 'MXN',
    tipo_cambio NUMERIC DEFAULT 1,               -- si moneda = USD, tipo de cambio
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    fecha_cobro DATE,                            -- cuándo se cobró efectivamente
    status TEXT DEFAULT 'pendiente'
        CHECK (status IN ('pendiente','parcial','cobrada','vencida','cancelada')),
    metodo_cobro TEXT,                           -- transferencia, cheque, efectivo
    referencia_viajero TEXT,                     -- vinculación con viajero/OT
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Cuentas por Pagar
CREATE TABLE IF NOT EXISTS cuentas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    numero_factura TEXT NOT NULL,
    proveedor TEXT NOT NULL,
    concepto TEXT,
    monto NUMERIC NOT NULL DEFAULT 0,
    monto_pagado NUMERIC NOT NULL DEFAULT 0,
    moneda TEXT DEFAULT 'MXN',
    tipo_cambio NUMERIC DEFAULT 1,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    fecha_pago DATE,                             -- cuándo se pagó efectivamente
    status TEXT DEFAULT 'pendiente'
        CHECK (status IN ('pendiente','parcial','pagada','vencida','cancelada')),
    metodo_pago TEXT,
    prioridad TEXT DEFAULT 'normal'
        CHECK (prioridad IN ('baja','normal','alta','critica')),
    referencia_oc TEXT,                          -- número de orden de compra
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE cuentas_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_pagar  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cxc_select" ON cuentas_cobrar FOR SELECT USING (true);
CREATE POLICY "cxc_all"    ON cuentas_cobrar FOR ALL    USING (true);
CREATE POLICY "cxp_select" ON cuentas_pagar  FOR SELECT USING (true);
CREATE POLICY "cxp_all"    ON cuentas_pagar  FOR ALL    USING (true);

-- Auto updated_at
CREATE TRIGGER cxc_updated_at
    BEFORE UPDATE ON cuentas_cobrar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER cxp_updated_at
    BEFORE UPDATE ON cuentas_pagar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para consultas de vencimiento y flujo de caja
CREATE INDEX IF NOT EXISTS idx_cxc_vencimiento ON cuentas_cobrar (fecha_vencimiento, status);
CREATE INDEX IF NOT EXISTS idx_cxc_cliente     ON cuentas_cobrar (cliente);
CREATE INDEX IF NOT EXISTS idx_cxp_vencimiento ON cuentas_pagar  (fecha_vencimiento, status);
CREATE INDEX IF NOT EXISTS idx_cxp_proveedor   ON cuentas_pagar  (proveedor);

-- Vista: Resumen de flujo de caja proyectado (próximos 90 días)
CREATE OR REPLACE VIEW v_flujo_caja_proyectado AS
SELECT
    fecha_vencimiento AS fecha,
    'cobro'           AS tipo,
    cliente           AS contraparte,
    numero_factura,
    (monto - monto_cobrado) AS importe_pendiente,
    status
FROM cuentas_cobrar
WHERE status IN ('pendiente','parcial')
  AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '90 days'
UNION ALL
SELECT
    fecha_vencimiento AS fecha,
    'pago'            AS tipo,
    proveedor         AS contraparte,
    numero_factura,
    (monto - monto_pagado) AS importe_pendiente,
    status
FROM cuentas_pagar
WHERE status IN ('pendiente','parcial')
  AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY fecha;
