-- ============================================================
-- RETRABAJOS Y CONTROL DE RECHAZO / SCRAP
-- Cierra el ciclo de calidad: rechazo → retrabajo → reinspección
-- ============================================================

-- ── 1. NUEVAS COLUMNAS EN VIAJEROS ──────────────────────────

-- Piezas asignadas a este viajero dentro de su orden
ALTER TABLE viajeros
  ADD COLUMN IF NOT EXISTS cantidad_asignada  INTEGER DEFAULT 0;

-- Piezas enviadas a scrap (rechazadas sin posibilidad de reparar)
ALTER TABLE viajeros
  ADD COLUMN IF NOT EXISTS cantidad_scrap     INTEGER DEFAULT 0;

ALTER TABLE viajeros
  ADD COLUMN IF NOT EXISTS motivo_scrap       TEXT;

-- ── 2. TABLA RETRABAJOS ──────────────────────────────────────
-- Registra cada ciclo de reparación de un viajero rechazado.
-- Un viajero puede tener N intentos de retrabajo.

CREATE TABLE IF NOT EXISTS retrabajos (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          TEXT        NOT NULL DEFAULT 'mcvill',
  viajero_id         TEXT        NOT NULL REFERENCES viajeros(id) ON DELETE CASCADE,
  no_conformidad_id  UUID        REFERENCES no_conformidades(id) ON DELETE SET NULL,
  numero_intento     INTEGER     NOT NULL DEFAULT 1,
  descripcion_falla  TEXT        NOT NULL,
  -- disposicion: qué se decide hacer con la pieza rechazada
  disposicion        TEXT        NOT NULL DEFAULT 'reparar'
                                 CHECK (disposicion IN ('reparar', 'scrap', 'usar_como_esta')),
  operaciones_repetir TEXT[]     DEFAULT '{}',  -- claves de operaciones que se deben repetir
  responsable        TEXT,
  aprobado_por       TEXT,
  fecha_inicio       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_cierre       TIMESTAMPTZ,
  costo_estimado     NUMERIC     DEFAULT 0,
  costo_real         NUMERIC,
  status             TEXT        NOT NULL DEFAULT 'pendiente'
                                 CHECK (status IN ('pendiente', 'en_proceso', 'completado', 'scrap')),
  notas              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_retrabajos_viajero ON retrabajos(viajero_id);
CREATE INDEX IF NOT EXISTS idx_retrabajos_status  ON retrabajos(status);

-- ── 3. RLS PARA RETRABAJOS ───────────────────────────────────
ALTER TABLE retrabajos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retrabajos_auth_access" ON retrabajos;
CREATE POLICY "retrabajos_auth_access" ON retrabajos
  FOR ALL USING (auth.role() = 'authenticated');

-- ── 4. TRIGGER updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS retrabajos_updated_at ON retrabajos;
CREATE TRIGGER retrabajos_updated_at
  BEFORE UPDATE ON retrabajos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. VISTA CONSOLIDADA DE ORDEN → VIAJEROS ─────────────────
-- Permite ver el avance de una orden de trabajo completa,
-- incluyendo cuántos viajeros completados, en retrabajo, etc.

CREATE OR REPLACE VIEW v_orden_viajeros AS
SELECT
  ot.id                                                        AS orden_id,
  ot.order_number,
  COUNT(v.id)                                                  AS total_viajeros,
  COALESCE(SUM(v.cantidad_asignada), 0)                        AS piezas_totales,
  COALESCE(SUM(v.cant_fabricada), 0)                           AS piezas_fabricadas,
  COALESCE(SUM(v.cantidad_scrap), 0)                           AS piezas_scrap,
  ROUND(
    COALESCE(AVG(v.avance_porcentaje), 0)::NUMERIC, 1
  )                                                            AS avance_promedio,
  COUNT(CASE WHEN v.estatus = 'COMPLETADO'    THEN 1 END)      AS viajeros_completados,
  COUNT(CASE WHEN v.estatus = 'EN PROCESO'    THEN 1 END)      AS viajeros_en_proceso,
  COUNT(CASE WHEN v.estatus = 'EN RETRABAJO'  THEN 1 END)      AS viajeros_en_retrabajo,
  COUNT(CASE WHEN v.estatus = 'RECHAZADO'     THEN 1 END)      AS viajeros_rechazados,
  COUNT(CASE WHEN v.estatus = 'DETENIDO'      THEN 1 END)      AS viajeros_detenidos,
  COUNT(CASE WHEN v.estatus = 'PENDIENTE'     THEN 1 END)      AS viajeros_pendientes
FROM ordenes_trabajo ot
LEFT JOIN viajeros v ON v.orden_trabajo_id = ot.id::TEXT
GROUP BY ot.id, ot.order_number;

-- ── 6. FUNCIÓN: obtener historial completo de un viajero ──────
-- Devuelve todos los retrabajos de un viajero en orden cronológico

CREATE OR REPLACE FUNCTION get_viajero_retrabajo_history(p_viajero_id TEXT)
RETURNS TABLE (
  retrabajo_id       UUID,
  numero_intento     INTEGER,
  descripcion_falla  TEXT,
  disposicion        TEXT,
  status             TEXT,
  responsable        TEXT,
  aprobado_por       TEXT,
  fecha_inicio       TIMESTAMPTZ,
  fecha_cierre       TIMESTAMPTZ,
  costo_real         NUMERIC,
  no_conformidad_num TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT
    r.id,
    r.numero_intento,
    r.descripcion_falla,
    r.disposicion,
    r.status,
    r.responsable,
    r.aprobado_por,
    r.fecha_inicio,
    r.fecha_cierre,
    r.costo_real,
    nc.numero
  FROM retrabajos r
  LEFT JOIN no_conformidades nc ON nc.id = r.no_conformidad_id
  WHERE r.viajero_id = p_viajero_id
  ORDER BY r.numero_intento ASC;
$$;
