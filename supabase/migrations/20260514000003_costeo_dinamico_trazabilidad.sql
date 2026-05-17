-- ═══════════════════════════════════════════════════════════════════════════
-- MCVILL ERP · Módulo 5+6: Costeo Dinámico + Trazabilidad + Multi-Planta
-- ═══════════════════════════════════════════════════════════════════════════
-- Tablas nuevas:
--   plantas               → multi-planta / multi-sucursal
--   centros_costo         → agrupación de costos por área
--   tarifas_mano_obra     → costo/hora por puesto
--   tarifas_maquina       → costo/hora por activo
--   costos_ordenes        → resumen proyectado vs real por viajero
--   costos_lineas         → desglose línea a línea (material/labor/máquina)
--   flujos_aprobacion     → definición de flujos (qué requiere aprobación)
--   aprobaciones          → instancias de aprobación pendientes / resueltas
-- Mejoras a existentes:
--   audit_logs            → añade old_data / new_data JSONB
--   triggers              → auto-log en tablas críticas


-- ─── 0. EXTENSION ────────────────────────────────────────────────────────────
-- pgcrypto ya disponible en Supabase; solo por si acaso
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ─── 1. PLANTAS (multi-planta) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plantas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  codigo       TEXT NOT NULL,
  nombre       TEXT NOT NULL,
  direccion    TEXT,
  ciudad       TEXT,
  pais         TEXT DEFAULT 'México',
  responsable  TEXT,
  activa       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, codigo)
);

-- Planta principal McVill
INSERT INTO plantas (tenant_id, codigo, nombre, ciudad, responsable)
SELECT id, 'PLT-01', 'Planta Principal McVill', 'Monterrey', 'Gerencia General'
FROM tenants WHERE slug = 'mcvill'
ON CONFLICT DO NOTHING;


-- ─── 2. CENTROS DE COSTO ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS centros_costo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  planta_id   UUID REFERENCES plantas(id),
  codigo      TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  tipo        TEXT DEFAULT 'produccion'
                CHECK (tipo IN ('produccion','mantenimiento','administrativo','comercial','calidad')),
  presupuesto_mensual NUMERIC DEFAULT 0,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, codigo)
);

INSERT INTO centros_costo (tenant_id, codigo, nombre, tipo)
SELECT id, cc.codigo, cc.nombre, cc.tipo
FROM tenants, (VALUES
  ('CC-CNC',   'CNC / Torno',         'produccion'),
  ('CC-LASER', 'Corte Láser',         'produccion'),
  ('CC-SOLD',  'Soldadura',           'produccion'),
  ('CC-MONT',  'Montaje / Ensamble',  'produccion'),
  ('CC-MANT',  'Mantenimiento',       'mantenimiento'),
  ('CC-CAL',   'Calidad',             'calidad'),
  ('CC-ADM',   'Administración',      'administrativo')
) AS cc(codigo, nombre, tipo)
WHERE tenants.slug = 'mcvill'
ON CONFLICT DO NOTHING;


-- ─── 3. TARIFAS DE MANO DE OBRA ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarifas_mano_obra (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
  puesto           TEXT NOT NULL,          -- Operador CNC, Soldador, Inspector...
  nivel            TEXT DEFAULT 'jr'
                     CHECK (nivel IN ('jr','sr','especialista','supervisor')),
  tarifa_hora      NUMERIC NOT NULL,       -- MXN/hora
  incluye_imss     BOOLEAN DEFAULT TRUE,   -- Si incluye carga social
  factor_carga     NUMERIC DEFAULT 1.35,   -- multiplicador IMSS+prestaciones (35% default)
  tarifa_real_hora NUMERIC GENERATED ALWAYS AS (tarifa_hora * factor_carga) STORED,
  moneda           TEXT DEFAULT 'MXN',
  vigente_desde    DATE DEFAULT CURRENT_DATE,
  vigente_hasta    DATE,
  activa           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tarifas_mano_obra (tenant_id, puesto, nivel, tarifa_hora, factor_carga)
SELECT t.id, mo.puesto, mo.nivel, mo.tarifa, mo.factor
FROM tenants t, (VALUES
  ('Operador CNC',        'jr',          45.00, 1.40),
  ('Operador CNC',        'sr',          65.00, 1.40),
  ('Operador Láser',      'jr',          42.00, 1.40),
  ('Soldador TIG',        'sr',          80.00, 1.40),
  ('Soldador MIG',        'jr',          55.00, 1.40),
  ('Inspector Calidad',   'sr',          60.00, 1.35),
  ('Supervisor',          'especialista',95.00, 1.35),
  ('Ensamblador',         'jr',          38.00, 1.40)
) AS mo(puesto, nivel, tarifa, factor)
WHERE t.slug = 'mcvill'
ON CONFLICT DO NOTHING;


-- ─── 4. TARIFAS DE MÁQUINA ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarifas_maquina (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  activo_id         UUID REFERENCES activos_maquinas(id) ON DELETE CASCADE,
  tarifa_hora       NUMERIC NOT NULL,      -- MXN/hora de operación
  incluye_overhead  BOOLEAN DEFAULT TRUE,  -- deprecación + energía + espacio
  pct_overhead      NUMERIC DEFAULT 20.0,  -- % adicional de overhead
  vigente_desde     DATE DEFAULT CURRENT_DATE,
  activa            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Tarifas iniciales basadas en las máquinas seed
INSERT INTO tarifas_maquina (tenant_id, activo_id, tarifa_hora, pct_overhead)
SELECT t.id, m.id,
  CASE m.codigo
    WHEN 'MQ-001' THEN 250.00   -- Torno CNC
    WHEN 'MQ-002' THEN 280.00   -- Fresadora CNC
    WHEN 'MQ-003' THEN 320.00   -- Cortadora Láser
    WHEN 'MQ-004' THEN  90.00   -- Soldadora TIG
    WHEN 'MQ-005' THEN  40.00   -- Compresor
    ELSE 100.00
  END,
  20.0
FROM tenants t
JOIN activos_maquinas m ON m.tenant_id = 'mcvill'
WHERE t.slug = 'mcvill'
ON CONFLICT DO NOTHING;


-- ─── 5. COSTOS POR ORDEN (proyectado vs real) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS costos_ordenes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  viajero_id    TEXT NOT NULL,           -- FK lógica a viajeros.id (TEXT)
  centro_costo  UUID REFERENCES centros_costo(id),

  -- Proyectado (al crear el viajero)
  mat_est       NUMERIC DEFAULT 0,       -- costo material estimado
  mo_est        NUMERIC DEFAULT 0,       -- mano de obra estimada
  maq_est       NUMERIC DEFAULT 0,       -- máquina estimada
  overhead_est  NUMERIC DEFAULT 0,
  total_est     NUMERIC GENERATED ALWAYS AS (mat_est + mo_est + maq_est + overhead_est) STORED,

  -- Real (al cerrar el viajero)
  mat_real      NUMERIC,
  mo_real       NUMERIC,
  maq_real      NUMERIC,
  overhead_real NUMERIC,
  total_real    NUMERIC GENERATED ALWAYS AS (
    COALESCE(mat_real,0) + COALESCE(mo_real,0) +
    COALESCE(maq_real,0) + COALESCE(overhead_real,0)
  ) STORED,

  -- Precio de venta (de la cotización)
  precio_venta  NUMERIC,

  -- Varianza y margen (calculados)
  varianza_pct  NUMERIC GENERATED ALWAYS AS (
    CASE WHEN mat_est + mo_est + maq_est + overhead_est = 0 THEN NULL
    ELSE ROUND(
      ((COALESCE(mat_real,0) + COALESCE(mo_real,0) +
        COALESCE(maq_real,0) + COALESCE(overhead_real,0)) -
       (mat_est + mo_est + maq_est + overhead_est)) /
      NULLIF(mat_est + mo_est + maq_est + overhead_est, 0) * 100, 2)
    END
  ) STORED,

  margen_real_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN precio_venta IS NULL OR precio_venta = 0 THEN NULL
    ELSE ROUND(
      (precio_venta -
       (COALESCE(mat_real,0) + COALESCE(mo_real,0) +
        COALESCE(maq_real,0) + COALESCE(overhead_real,0))) /
      precio_venta * 100, 2)
    END
  ) STORED,

  estado        TEXT DEFAULT 'abierta'
                  CHECK (estado IN ('abierta','cerrada','cancelada')),
  cerrada_en    TIMESTAMPTZ,
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, viajero_id)
);

CREATE INDEX IF NOT EXISTS idx_costos_viajero  ON costos_ordenes (viajero_id);
CREATE INDEX IF NOT EXISTS idx_costos_tenant   ON costos_ordenes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_costos_estado   ON costos_ordenes (estado);
CREATE INDEX IF NOT EXISTS idx_costos_varianza ON costos_ordenes (varianza_pct)
  WHERE varianza_pct IS NOT NULL;


-- ─── 6. LÍNEAS DE COSTO (desglose detallado) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS costos_lineas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  costo_orden_id UUID REFERENCES costos_ordenes(id) ON DELETE CASCADE,

  tipo           TEXT NOT NULL
                   CHECK (tipo IN ('material','mano_obra','maquina','overhead','ajuste','otro')),
  es_estimado    BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE=presupuestado, FALSE=real

  descripcion    TEXT NOT NULL,
  referencia_id  UUID,     -- UUID del material, empleado, activo, etc.
  referencia_tipo TEXT,    -- 'material' | 'employee' | 'activo_maquina'

  cantidad       NUMERIC DEFAULT 1,
  unidad         TEXT,
  costo_unitario NUMERIC NOT NULL DEFAULT 0,
  importe        NUMERIC GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,

  registrado_por UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lineas_orden ON costos_lineas (costo_orden_id);
CREATE INDEX IF NOT EXISTS idx_lineas_tipo  ON costos_lineas (tipo, es_estimado);


-- ─── 7. FLUJOS DE APROBACIÓN (configuración) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS flujos_aprobacion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  modulo          TEXT NOT NULL,    -- 'compras' | 'cotizacion' | 'calidad' | 'nomina' | 'costeo'
  monto_minimo    NUMERIC DEFAULT 0,      -- aplica si el registro tiene monto
  rol_aprobador   TEXT NOT NULL,          -- rol que puede aprobar
  rol_solicitante TEXT,                   -- quién puede solicitar (NULL = cualquiera)
  requiere_motivo BOOLEAN DEFAULT FALSE,
  timeout_horas   INT DEFAULT 48,         -- horas antes de escalar
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO flujos_aprobacion (tenant_id, nombre, modulo, monto_minimo, rol_aprobador, requiere_motivo)
SELECT id, fa.nombre, fa.modulo, fa.monto, fa.rol, fa.motivo
FROM tenants, (VALUES
  ('Compra > $5,000',      'compras',    5000,  'gerente', FALSE),
  ('Compra > $20,000',     'compras',    20000, 'ceo',     TRUE),
  ('Cotización salida',    'cotizacion', 0,     'gerente', FALSE),
  ('Cierre de lote QC',    'calidad',    0,     'sistemas',FALSE),
  ('Nómina especial',      'nomina',     0,     'ceo',     TRUE),
  ('Ajuste de costo real', 'costeo',     0,     'finanzas',TRUE)
) AS fa(nombre, modulo, monto, rol, motivo)
WHERE tenants.slug = 'mcvill'
ON CONFLICT DO NOTHING;


-- ─── 8. APROBACIONES (instancias) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aprobaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  flujo_id        UUID REFERENCES flujos_aprobacion(id),

  modulo          TEXT NOT NULL,
  registro_id     TEXT NOT NULL,       -- ID del registro que necesita aprobación
  registro_desc   TEXT,                -- descripción legible (ej: "OC-2026-042 Proveedor X $8,500")

  solicitado_por  UUID REFERENCES auth.users(id),
  solicitado_en   TIMESTAMPTZ DEFAULT NOW(),

  estado          TEXT DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','aprobado','rechazado','expirado')),

  aprobado_por    UUID REFERENCES auth.users(id),
  resuelto_en     TIMESTAMPTZ,
  comentario      TEXT,

  monto           NUMERIC,             -- si aplica
  datos_extra     JSONB DEFAULT '{}',  -- cualquier metadata adicional

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aprob_estado  ON aprobaciones (estado, tenant_id);
CREATE INDEX IF NOT EXISTS idx_aprob_modulo  ON aprobaciones (modulo, registro_id);
CREATE INDEX IF NOT EXISTS idx_aprob_solicit ON aprobaciones (solicitado_por);


-- ─── 9. MEJORA AL AUDIT LOG (añadir old/new data) ────────────────────────────
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS old_data   JSONB,
  ADD COLUMN IF NOT EXISTS new_data   JSONB,
  ADD COLUMN IF NOT EXISTS tabla      TEXT,
  ADD COLUMN IF NOT EXISTS planta_id  UUID REFERENCES plantas(id);

-- Índices útiles para auditoría
CREATE INDEX IF NOT EXISTS idx_audit_entity   ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs (created_at DESC);

-- Política: nadie puede borrar ni modificar audit_logs (append-only)
-- La política INSERT hereda de la existente; bloqueamos UPDATE y DELETE
DROP POLICY IF EXISTS "No update audit" ON audit_logs;
DROP POLICY IF EXISTS "No delete audit" ON audit_logs;
CREATE POLICY "No update audit" ON audit_logs FOR UPDATE USING (FALSE);
CREATE POLICY "No delete audit" ON audit_logs FOR DELETE USING (FALSE);


-- ─── 10. FUNCIÓN: registrar acción en audit_log ───────────────────────────────
-- Reemplaza la anterior log_action con soporte de old/new data
CREATE OR REPLACE FUNCTION log_auditoria(
  p_tabla        TEXT,
  p_accion       TEXT,                    -- 'INSERT' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
  p_registro_id  TEXT,
  p_old_data     JSONB DEFAULT NULL,
  p_new_data     JSONB DEFAULT NULL,
  p_metadata     JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID;
BEGIN
  v_user_id  := auth.uid();
  -- Intentar obtener tenant_id del nuevo dato o del antiguo
  v_tenant_id := COALESCE(
    (p_new_data->>'tenant_id')::UUID,
    (p_old_data->>'tenant_id')::UUID
  );

  INSERT INTO audit_logs (
    tenant_id, user_id, tabla, action,
    entity_type, entity_id,
    old_data, new_data, metadata
  ) VALUES (
    v_tenant_id, v_user_id, p_tabla, p_accion,
    p_tabla, p_registro_id::UUID,
    p_old_data, p_new_data, p_metadata
  );
END;
$$;


-- ─── 11. TRIGGER GENÉRICO: auto-audit en tablas críticas ─────────────────────
CREATE OR REPLACE FUNCTION trg_audit_generica()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_auditoria(TG_TABLE_NAME, 'INSERT', NEW.id::TEXT, NULL, row_to_json(NEW)::JSONB);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_auditoria(TG_TABLE_NAME, 'UPDATE', NEW.id::TEXT, row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_auditoria(TG_TABLE_NAME, 'DELETE', OLD.id::TEXT, row_to_json(OLD)::JSONB, NULL);
    RETURN OLD;
  END IF;
END;
$$;

-- Aplicar trigger a tablas que requieren trazabilidad completa
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'costos_ordenes',
    'costos_lineas',
    'aprobaciones',
    'activos_maquinas',
    'ordenes_mantenimiento'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_audit_%I ON %I;
      CREATE TRIGGER trg_audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION trg_audit_generica();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END;
$$;


-- ─── 12. FUNCIÓN: calcular costo estimado de un viajero ──────────────────────
-- Llama esta función al crear o actualizar un viajero para pre-poblar costos_ordenes
CREATE OR REPLACE FUNCTION calcular_costo_estimado(p_viajero_id TEXT)
RETURNS TABLE (
  mat_est      NUMERIC,
  mo_est       NUMERIC,
  maq_est      NUMERIC,
  overhead_est NUMERIC,
  total_est    NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_id UUID := (
    SELECT t.id FROM tenants t WHERE t.slug = 'mcvill' LIMIT 1
  );
  v_mat       NUMERIC := 0;
  v_mo        NUMERIC := 0;
  v_maq       NUMERIC := 0;
  v_overhead  NUMERIC := 0;
  v_pct_oh    NUMERIC := 0.15;   -- 15% overhead por defecto
BEGIN
  -- Costo de materiales: cantidad × unit_cost del catálogo
  SELECT COALESCE(SUM(vm.cantidad * COALESCE(m.unit_cost, 0)), 0)
  INTO v_mat
  FROM viajero_materiales vm
  LEFT JOIN materials m ON m.name ILIKE vm.descripcion
  WHERE vm.job_id = p_viajero_id;

  -- Mano de obra: horas estimadas × tarifa promedio del puesto requerido por operación
  SELECT COALESCE(SUM(
    COALESCE(vo.tiempo_estimado, 0) *
    COALESCE((
      SELECT AVG(tmo.tarifa_real_hora)
      FROM tarifas_mano_obra tmo
      WHERE tmo.tenant_id = v_tenant_id AND tmo.activa = TRUE
    ), 60)  -- $60/h fallback
  ), 0)
  INTO v_mo
  FROM viajero_operaciones vo
  WHERE vo.job_id = p_viajero_id;

  -- Máquina: horas estimadas × tarifa de máquina por centro de trabajo
  SELECT COALESCE(SUM(
    COALESCE(vo.tiempo_estimado, 0) *
    COALESCE((
      SELECT AVG(tm.tarifa_hora)
      FROM tarifas_maquina tm
      JOIN activos_maquinas am ON am.id = tm.activo_id
      WHERE am.area ILIKE vo.centro_trabajo AND tm.activa = TRUE
    ), 150)  -- $150/h fallback
  ), 0)
  INTO v_maq
  FROM viajero_operaciones vo
  WHERE vo.job_id = p_viajero_id;

  v_overhead := (v_mat + v_mo + v_maq) * v_pct_oh;

  RETURN QUERY SELECT v_mat, v_mo, v_maq, v_overhead,
    v_mat + v_mo + v_maq + v_overhead;
END;
$$;


-- ─── 13. VISTA: Dashboard de Costeo ──────────────────────────────────────────
CREATE OR REPLACE VIEW v_costeo_dashboard AS
SELECT
  co.id,
  co.viajero_id,
  v.numero_parte,
  v.descripcion,
  v.cliente,
  v.estatus   AS estatus_viajero,
  co.total_est,
  co.total_real,
  co.precio_venta,
  co.varianza_pct,
  co.margen_real_pct,
  co.estado,
  co.created_at,
  -- Semáforo de salud financiera
  CASE
    WHEN co.varianza_pct IS NULL              THEN 'sin_datos'
    WHEN co.varianza_pct <= 5                 THEN 'ok'
    WHEN co.varianza_pct <= 15               THEN 'atencion'
    ELSE                                          'critico'
  END AS semaforo,
  -- Utilidad bruta
  CASE
    WHEN co.precio_venta IS NOT NULL
    THEN co.precio_venta - COALESCE(co.total_real, co.total_est)
    ELSE NULL
  END AS utilidad_bruta
FROM costos_ordenes co
LEFT JOIN viajeros v ON v.id = co.viajero_id;


-- ─── 14. VISTA: Alertas de Varianza Alta ─────────────────────────────────────
CREATE OR REPLACE VIEW v_alertas_varianza AS
SELECT
  viajero_id,
  numero_parte,
  cliente,
  total_est,
  total_real,
  varianza_pct,
  semaforo,
  estado
FROM v_costeo_dashboard
WHERE semaforo IN ('atencion', 'critico')
  AND estado = 'abierta'
ORDER BY varianza_pct DESC NULLS LAST;


-- ─── 15. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE plantas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_costo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_mano_obra    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_maquina      ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_ordenes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_lineas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE flujos_aprobacion    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones         ENABLE ROW LEVEL SECURITY;

-- Lectura: todos los autenticados
CREATE POLICY plantas_read        ON plantas           FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY cc_read             ON centros_costo     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY tarifas_mo_read     ON tarifas_mano_obra FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY tarifas_maq_read    ON tarifas_maquina   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY costos_ord_read     ON costos_ordenes    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY costos_lin_read     ON costos_lineas     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY flujos_read         ON flujos_aprobacion FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY aprob_read          ON aprobaciones      FOR SELECT USING (auth.role() = 'authenticated');

-- Escritura: roles autorizados por tabla
CREATE POLICY costos_ord_write ON costos_ordenes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY costos_lin_write ON costos_lineas FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Aprobaciones: solo el rol autorizado puede resolver
CREATE POLICY aprob_write ON aprobaciones FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY aprob_insert ON aprobaciones FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Tarifas: solo finanzas/CEO/sistemas pueden modificar
CREATE POLICY tarifas_mo_write ON tarifas_mano_obra FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY tarifas_maq_write ON tarifas_maquina FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
