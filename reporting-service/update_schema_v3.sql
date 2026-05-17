-- ============================================================
-- McVill Viajero PDF — Schema Patch v3
-- Agrega todas las columnas que el ViajeroDocument.cs necesita
-- y que faltaban en las tablas actuales de Supabase.
-- Seguro para re-ejecutar (todos los ALTER usan IF NOT EXISTS).
-- ============================================================

-- ── 1. viajeros ──────────────────────────────────────────────
ALTER TABLE public.viajeros
    ADD COLUMN IF NOT EXISTS fecha_entrega TIMESTAMP WITH TIME ZONE;

-- ── 2. viajero_operaciones ───────────────────────────────────
ALTER TABLE public.viajero_operaciones
    ADD COLUMN IF NOT EXISTS configuracion      NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tasa_proceso       TEXT    DEFAULT '0.00 Min/Part',
    ADD COLUMN IF NOT EXISTS fecha_inicio_prg   TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS fecha_fin_prg      TIMESTAMP WITH TIME ZONE;

-- ── 3. viajero_materiales ────────────────────────────────────
--   clave_requerimiento = número de requisición (diferente a clave de material)
ALTER TABLE public.viajero_materiales
    ADD COLUMN IF NOT EXISTS clave_requerimiento TEXT,
    ADD COLUMN IF NOT EXISTS fecha_vencimiento   TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS lote                TEXT,
    ADD COLUMN IF NOT EXISTS partes_barra        NUMERIC,
    ADD COLUMN IF NOT EXISTS longitud_parte      NUMERIC,
    ADD COLUMN IF NOT EXISTS corte               NUMERIC,
    ADD COLUMN IF NOT EXISTS fin_barra           NUMERIC,
    ADD COLUMN IF NOT EXISTS piezas_por          NUMERIC,
    ADD COLUMN IF NOT EXISTS piezas_reg          NUMERIC;

-- Retrocompatibilidad: si clave_requerimiento está vacía, copiar desde clave
UPDATE public.viajero_materiales
SET clave_requerimiento = clave
WHERE clave_requerimiento IS NULL AND clave IS NOT NULL;

-- ── 4. viajero_componentes ───────────────────────────────────
--   Crear tabla si no existe (columnas completas para el PDF)
CREATE TABLE IF NOT EXISTS public.viajero_componentes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viajero_id     TEXT REFERENCES public.viajeros(id) ON DELETE CASCADE,
    job_id_hijo    TEXT,
    parte          TEXT,
    revision       TEXT,
    descripcion    TEXT,
    horas_est      NUMERIC DEFAULT 0,
    cantidad       NUMERIC DEFAULT 0,
    fecha_inicio_prg TIMESTAMP WITH TIME ZONE,
    fecha_fin_prg    TIMESTAMP WITH TIME ZONE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si ya existía la tabla pero le faltan las columnas de fecha:
ALTER TABLE public.viajero_componentes
    ADD COLUMN IF NOT EXISTS fecha_inicio_prg TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS fecha_fin_prg    TIMESTAMP WITH TIME ZONE;

-- ── 5. RLS & políticas ───────────────────────────────────────
ALTER TABLE public.viajero_componentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viajero_componentes_select" ON public.viajero_componentes;
CREATE POLICY "viajero_componentes_select"
    ON public.viajero_componentes FOR SELECT USING (true);

DROP POLICY IF EXISTS "viajero_componentes_insert" ON public.viajero_componentes;
CREATE POLICY "viajero_componentes_insert"
    ON public.viajero_componentes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "viajero_componentes_update" ON public.viajero_componentes;
CREATE POLICY "viajero_componentes_update"
    ON public.viajero_componentes FOR UPDATE USING (true);

-- ── 6. Índices para rendimiento ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_viajero_comp_viajero_id
    ON public.viajero_componentes(viajero_id);

CREATE INDEX IF NOT EXISTS idx_viajero_comp_job_hijo
    ON public.viajero_componentes(job_id_hijo);
