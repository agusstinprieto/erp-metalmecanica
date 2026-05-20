
CREATE OR REPLACE FUNCTION public.get_active_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_active_tenant_id() RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1; $$;
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- FLUJO VIAJERO DE COMPRAS â€” McVill ERP (metalmecanica)
-- Ejecutar en Supabase SQL Editor
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 1. Tabla principal: viajeros_compras
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.viajeros_compras (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid,
  folio                  text NOT NULL,
  proveedor              text NOT NULL,
  concepto               text NOT NULL,
  descripcion            text,
  solicitante            text NOT NULL,
  aprobador              text,
  estatus                text NOT NULL DEFAULT 'REQUISICION'
                           CHECK (estatus IN (
                             'REQUISICION','COT_PROVEEDOR','APROBACION',
                             'OC_EMITIDA','EN_TRANSITO','RECIBIDA','CERRADA','CANCELADA'
                           )),
  prioridad              text NOT NULL DEFAULT 'NORMAL'
                           CHECK (prioridad IN ('NORMAL','ALTA','URGENTE')),
  urgente                boolean NOT NULL DEFAULT false,
  monto_total            numeric(14,2) NOT NULL DEFAULT 0,
  moneda                 text NOT NULL DEFAULT 'MXN'
                           CHECK (moneda IN ('MXN','USD')),
  avance_porcentaje      integer NOT NULL DEFAULT 0
                           CHECK (avance_porcentaje BETWEEN 0 AND 100),
  fecha_requisicion      date,
  fecha_entrega_requerida date,
  fecha_recepcion        date,
  numero_oc              text,
  proveedor_contacto     text,
  condiciones_pago       text,
  notas                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- 2. Sub-tabla: compras_etapas
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.compras_etapas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viajero_compra_id   uuid NOT NULL REFERENCES public.viajeros_compras(id) ON DELETE CASCADE,
  nombre_etapa        text NOT NULL,
  responsable_etapa   text,
  tiempo_estimado     numeric(6,2),
  estado              text NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','en_proceso','completado')),
  orden               integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 3. Ãndices
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE INDEX IF NOT EXISTS idx_viajeros_compras_tenant   ON public.viajeros_compras(tenant_id);
CREATE INDEX IF NOT EXISTS idx_viajeros_compras_estatus  ON public.viajeros_compras(estatus);
CREATE INDEX IF NOT EXISTS idx_viajeros_compras_urgente  ON public.viajeros_compras(urgente);
CREATE INDEX IF NOT EXISTS idx_compras_etapas_viajero    ON public.compras_etapas(viajero_compra_id);

-- 4. Trigger: updated_at automÃ¡tico
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_viajeros_compras_updated_at ON public.viajeros_compras;
CREATE TRIGGER trg_viajeros_compras_updated_at
  BEFORE UPDATE ON public.viajeros_compras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS (Row Level Security)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.viajeros_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_etapas   ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (adjust per-tenant logic as needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'viajeros_compras' AND policyname = 'viajeros_compras_auth_all'
  ) THEN
    CREATE POLICY viajeros_compras_auth_all ON public.viajeros_compras
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'compras_etapas' AND policyname = 'compras_etapas_auth_all'
  ) THEN
    CREATE POLICY compras_etapas_auth_all ON public.compras_etapas
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Sample data (optional â€” remove in production)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/*
INSERT INTO public.viajeros_compras
  (folio, proveedor, concepto, solicitante, estatus, prioridad, urgente, monto_total, moneda, fecha_requisicion, fecha_entrega_requerida)
VALUES
  ('OC-2025-001', 'Aceros del Norte S.A.', 'LÃ¡mina HR 3/16" x 4x8', 'Almacen', 'EN_TRANSITO', 'ALTA', false, 18500.00, 'MXN', '2025-05-01', '2025-05-22'),
  ('OC-2025-002', 'Tornillos y Tuercas MX', 'Kit tornillerÃ­a M8', 'ProducciÃ³n', 'OC_EMITIDA', 'NORMAL', false, 3200.00, 'MXN', '2025-05-05', '2025-05-25'),
  ('OC-2025-003', 'Industrial Welding USA', 'Electrodo E7018 caja 50lb', 'Calidad', 'APROBACION', 'URGENTE', true, 450.00, 'USD', '2025-05-10', '2025-05-20');
*/

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Flujo de estatus:
--   REQUISICION â†’ COT_PROVEEDOR â†’ APROBACION â†’ OC_EMITIDA â†’ EN_TRANSITO â†’ RECIBIDA â†’ CERRADA
--   Cualquier estado â†’ CANCELADA
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- FLUJO VIAJERO DE COTIZACIONES â€” DDL
-- Modeled after the production viajero pattern
-- Run once per project (metalmecanica + industrial-pro share the same Supabase)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 1. Main table: viajeros_cotizacion
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.viajeros_cotizacion (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL,

  -- Identification
  folio                   text NOT NULL,
  cliente                 text NOT NULL,
  contacto                text,
  descripcion             text NOT NULL,
  responsable             text NOT NULL,

  -- Status flow: RFQ_RECIBIDA â†’ FACTIBILIDAD â†’ COSTEO â†’ ELABORACION â†’ REVISION â†’ ENVIADA â†’ GANADA/PERDIDA
  estatus                 text NOT NULL DEFAULT 'RFQ_RECIBIDA'
                          CHECK (estatus IN (
                            'RFQ_RECIBIDA','FACTIBILIDAD','COSTEO','ELABORACION',
                            'REVISION','ENVIADA','GANADA','PERDIDA','CANCELADA'
                          )),
  prioridad               text NOT NULL DEFAULT 'NORMAL'
                          CHECK (prioridad IN ('NORMAL','ALTA','URGENTE')),

  -- Commercial
  valor_estimado          numeric(14,2) NOT NULL DEFAULT 0,
  probabilidad_cierre     integer NOT NULL DEFAULT 50 CHECK (probabilidad_cierre BETWEEN 0 AND 100),
  avance_porcentaje       integer NOT NULL DEFAULT 0  CHECK (avance_porcentaje BETWEEN 0 AND 100),

  -- Dates
  fecha_recepcion         date,
  fecha_entrega_requerida date,
  fecha_envio             date,

  -- Outcome
  motivo_perdida          text,
  notas                   text,

  -- Audit
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_viajeros_cotizacion_tenant   ON public.viajeros_cotizacion(tenant_id);
CREATE INDEX IF NOT EXISTS idx_viajeros_cotizacion_estatus  ON public.viajeros_cotizacion(estatus);
CREATE INDEX IF NOT EXISTS idx_viajeros_cotizacion_folio    ON public.viajeros_cotizacion(folio);


-- 2. Sub-table: cot_etapas
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.cot_etapas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viajero_cot_id     uuid NOT NULL REFERENCES public.viajeros_cotizacion(id) ON DELETE CASCADE,
  nombre_etapa       text NOT NULL,
  responsable_etapa  text,
  tiempo_estimado    numeric(6,2),
  estado             text NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente','en_proceso','completado')),
  orden              integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cot_etapas_viajero_cot ON public.cot_etapas(viajero_cot_id);


-- 3. Row Level Security
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.viajeros_cotizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cot_etapas          ENABLE ROW LEVEL SECURITY;

-- viajeros_cotizacion: tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'viajeros_cotizacion' AND policyname = 'viajeros_cotizacion_tenant_select'
  ) THEN
    CREATE POLICY viajeros_cotizacion_tenant_select ON public.viajeros_cotizacion
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'viajeros_cotizacion' AND policyname = 'viajeros_cotizacion_tenant_insert'
  ) THEN
    CREATE POLICY viajeros_cotizacion_tenant_insert ON public.viajeros_cotizacion
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'viajeros_cotizacion' AND policyname = 'viajeros_cotizacion_tenant_update'
  ) THEN
    CREATE POLICY viajeros_cotizacion_tenant_update ON public.viajeros_cotizacion
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'viajeros_cotizacion' AND policyname = 'viajeros_cotizacion_tenant_delete'
  ) THEN
    CREATE POLICY viajeros_cotizacion_tenant_delete ON public.viajeros_cotizacion
      FOR DELETE USING (true);
  END IF;
END $$;

-- cot_etapas: open (inherits tenant isolation from parent join)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cot_etapas' AND policyname = 'cot_etapas_open'
  ) THEN
    CREATE POLICY cot_etapas_open ON public.cot_etapas FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- 4. updated_at trigger
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.set_updated_at_cotizacion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cotizacion_updated_at ON public.viajeros_cotizacion;
CREATE TRIGGER trg_cotizacion_updated_at
  BEFORE UPDATE ON public.viajeros_cotizacion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_cotizacion();


-- 5. Seed sample (optional â€” comment out in production)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- INSERT INTO public.viajeros_cotizacion (tenant_id, folio, cliente, descripcion, responsable, estatus, valor_estimado, probabilidad_cierre)
-- VALUES
--   ('c89d6183-5f66-48dd-8b66-2b8b6b993e61', 'COT-2026-001', 'Cliente Demo A', 'FabricaciÃ³n estructura metÃ¡lica',  'Ing. GarcÃ­a', 'FACTIBILIDAD', 85000, 70),
--   ('c89d6183-5f66-48dd-8b66-2b8b6b993e61', 'COT-2026-002', 'Aceros del Norte',   'Maquinado CNC lote 500 piezas', 'Ing. LÃ³pez',  'COSTEO',       120000, 60),
--   ('c89d6183-5f66-48dd-8b66-2b8b6b993e61', 'COT-2026-003', 'PetroquÃ­mica SA',    'Tanque ASME Div. 1',           'Ing. RamÃ­rez', 'GANADA',       350000, 100);
-- ============================================================
-- Flujo Viajero de IngenierÃ­a â€” McVill ERP
-- Tablas: viajeros_ingenieria + ing_etapas
-- RLS multi-tenant via get_active_tenant_id()
-- ============================================================

-- â”€â”€â”€ 1. Tabla principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS viajeros_ingenieria (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL,
  folio              text NOT NULL,
  proyecto           text NOT NULL,
  cliente            text NOT NULL,
  descripcion        text,
  responsable        text NOT NULL,
  departamento       text,
  prioridad          text NOT NULL DEFAULT 'NORMAL'
                       CHECK (prioridad IN ('NORMAL', 'ALTA', 'URGENTE')),
  estatus            text NOT NULL DEFAULT 'SOLICITUD'
                       CHECK (estatus IN ('SOLICITUD', 'DISEÃ‘O', 'CÃLCULO', 'REVISIÃ“N', 'APROBACIÃ“N', 'LIBERADO', 'CANCELADO')),
  avance_porcentaje  integer NOT NULL DEFAULT 0 CHECK (avance_porcentaje BETWEEN 0 AND 100),
  fecha_solicitud    date,
  fecha_entrega      date,
  horas_est_totales  numeric NOT NULL DEFAULT 0,
  notas              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- â”€â”€â”€ 2. Sub-tabla de etapas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS ing_etapas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viajero_ing_id   uuid NOT NULL REFERENCES viajeros_ingenieria(id) ON DELETE CASCADE,
  nombre_etapa     text NOT NULL,
  responsable_etapa text,
  tiempo_estimado  numeric NOT NULL DEFAULT 0,
  estado           text NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'en_proceso', 'completado')),
  orden            integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- â”€â”€â”€ 3. Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX IF NOT EXISTS idx_viajeros_ingenieria_tenant_id   ON viajeros_ingenieria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_viajeros_ingenieria_estatus     ON viajeros_ingenieria(estatus);
CREATE INDEX IF NOT EXISTS idx_viajeros_ingenieria_fecha_entrega ON viajeros_ingenieria(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_ing_etapas_viajero_ing_id       ON ing_etapas(viajero_ing_id);

-- â”€â”€â”€ 4. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE viajeros_ingenieria ENABLE ROW LEVEL SECURITY;
ALTER TABLE ing_etapas           ENABLE ROW LEVEL SECURITY;

-- viajeros_ingenieria: users can only access their tenant's data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'viajeros_ingenieria'
      AND policyname = 'Users can manage their tenant data'
  ) THEN
    CREATE POLICY "Users can manage their tenant data"
      ON viajeros_ingenieria
      FOR ALL
      USING (tenant_id = get_active_tenant_id())
      WITH CHECK (tenant_id = get_active_tenant_id());
  END IF;
END $$;

-- ing_etapas: access via parent viajero_ing_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ing_etapas'
      AND policyname = 'Users can manage etapas of their tenant'
  ) THEN
    CREATE POLICY "Users can manage etapas of their tenant"
      ON ing_etapas
      FOR ALL
      USING (
        viajero_ing_id IN (
          SELECT id FROM viajeros_ingenieria
          WHERE tenant_id = get_active_tenant_id()
        )
      )
      WITH CHECK (
        viajero_ing_id IN (
          SELECT id FROM viajeros_ingenieria
          WHERE tenant_id = get_active_tenant_id()
        )
      );
  END IF;
END $$;

-- â”€â”€â”€ 5. updated_at trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_viajeros_ingenieria_updated_at ON viajeros_ingenieria;
CREATE TRIGGER trg_viajeros_ingenieria_updated_at
  BEFORE UPDATE ON viajeros_ingenieria
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- CREAR_VIAJEROS_RH.sql
-- Flujo Viajero de Recursos Humanos â€” ERP McVill MetalmecÃ¡nica
-- Ejecutar en Supabase SQL Editor
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- â”€â”€ Tabla principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS public.viajeros_rh (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid,
  folio                 text NOT NULL,
  puesto                text NOT NULL,
  departamento          text NOT NULL,
  solicitante           text NOT NULL,
  responsable_rh        text,
  estatus               text NOT NULL DEFAULT 'VACANTE'
                          CHECK (estatus IN ('VACANTE','RECLUTAMIENTO','ENTREVISTAS','SELECCION','OFERTA','ONBOARDING','ACTIVO','CANCELADO')),
  prioridad             text NOT NULL DEFAULT 'NORMAL'
                          CHECK (prioridad IN ('NORMAL','ALTA','URGENTE')),
  urgente               boolean NOT NULL DEFAULT false,
  num_posiciones        integer NOT NULL DEFAULT 1,
  salario_min           numeric,
  salario_max           numeric,
  avance_porcentaje     integer NOT NULL DEFAULT 0
                          CHECK (avance_porcentaje BETWEEN 0 AND 100),
  fecha_apertura        date,
  fecha_objetivo        date,
  fecha_ingreso         date,
  candidato_seleccionado text,
  motivo_cancelacion    text,
  notas                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- â”€â”€ Sub-tabla etapas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS public.rh_etapas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viajero_rh_id   uuid NOT NULL REFERENCES public.viajeros_rh(id) ON DELETE CASCADE,
  nombre_etapa    text NOT NULL,
  responsable_etapa text,
  tiempo_estimado numeric,
  estado          text NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','en_proceso','completado')),
  orden           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- â”€â”€ Ãndices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE INDEX IF NOT EXISTS idx_viajeros_rh_tenant    ON public.viajeros_rh(tenant_id);
CREATE INDEX IF NOT EXISTS idx_viajeros_rh_estatus   ON public.viajeros_rh(estatus);
CREATE INDEX IF NOT EXISTS idx_viajeros_rh_urgente   ON public.viajeros_rh(urgente) WHERE urgente = true;
CREATE INDEX IF NOT EXISTS idx_rh_etapas_viajero     ON public.rh_etapas(viajero_rh_id);

-- â”€â”€ Trigger: updated_at automÃ¡tico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_viajeros_rh_updated_at ON public.viajeros_rh;
CREATE TRIGGER trg_viajeros_rh_updated_at
  BEFORE UPDATE ON public.viajeros_rh
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- â”€â”€ RLS (Row Level Security) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE public.viajeros_rh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_etapas   ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "viajeros_rh_tenant_select" ON public.viajeros_rh;
DROP POLICY IF EXISTS "viajeros_rh_tenant_insert" ON public.viajeros_rh;
DROP POLICY IF EXISTS "viajeros_rh_tenant_update" ON public.viajeros_rh;
DROP POLICY IF EXISTS "viajeros_rh_tenant_delete" ON public.viajeros_rh;
DROP POLICY IF EXISTS "rh_etapas_select"          ON public.rh_etapas;
DROP POLICY IF EXISTS "rh_etapas_insert"          ON public.rh_etapas;
DROP POLICY IF EXISTS "rh_etapas_update"          ON public.rh_etapas;
DROP POLICY IF EXISTS "rh_etapas_delete"          ON public.rh_etapas;

-- PolÃ­tica: acceso solo para usuarios autenticados del mismo tenant
CREATE POLICY "viajeros_rh_tenant_select" ON public.viajeros_rh
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IS NULL OR
      tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())::uuid
    )
  );

CREATE POLICY "viajeros_rh_tenant_insert" ON public.viajeros_rh
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "viajeros_rh_tenant_update" ON public.viajeros_rh
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "viajeros_rh_tenant_delete" ON public.viajeros_rh
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "rh_etapas_select" ON public.rh_etapas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rh_etapas_insert" ON public.rh_etapas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "rh_etapas_update" ON public.rh_etapas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "rh_etapas_delete" ON public.rh_etapas
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- â”€â”€ Datos de ejemplo (seed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO public.viajeros_rh (folio, puesto, departamento, solicitante, responsable_rh, estatus, prioridad, urgente, num_posiciones, salario_min, salario_max, avance_porcentaje, fecha_apertura, fecha_objetivo)
VALUES
  ('RH-2026-001', 'Soldador MIG', 'ProducciÃ³n', 'Ing. GarcÃ­a', 'Lic. MartÃ­nez', 'RECLUTAMIENTO', 'ALTA', false, 2, 14000, 18000, 20, CURRENT_DATE - 10, CURRENT_DATE + 20),
  ('RH-2026-002', 'Supervisor de Calidad', 'Calidad', 'Ing. LÃ³pez', 'Lic. MartÃ­nez', 'ENTREVISTAS', 'ALTA', false, 1, 18000, 25000, 40, CURRENT_DATE - 15, CURRENT_DATE + 10),
  ('RH-2026-003', 'Operador CNC', 'Maquinado', 'Ing. RamÃ­rez', 'Lic. MartÃ­nez', 'VACANTE', 'URGENTE', true, 3, 12000, 16000, 0, CURRENT_DATE - 3, CURRENT_DATE + 7),
  ('RH-2026-004', 'Almacenista', 'AlmacÃ©n', 'Lic. Torres', 'Lic. MartÃ­nez', 'ACTIVO', 'NORMAL', false, 1, 10000, 13000, 100, CURRENT_DATE - 45, NULL)
ON CONFLICT DO NOTHING;
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- CREAR_VIAJEROS_VENTAS.sql
-- Flujo Viajero de Ventas â€” Tablas para McVill ERP
-- Ejecutar en Supabase SQL Editor
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- â”€â”€ 1. Tabla principal: viajeros_ventas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS viajeros_ventas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL,
  folio                   TEXT NOT NULL,
  cliente                 TEXT NOT NULL,
  contacto                TEXT,
  descripcion             TEXT NOT NULL DEFAULT '',
  responsable_ventas      TEXT NOT NULL DEFAULT '',

  estatus                 TEXT NOT NULL DEFAULT 'PROSPECTO'
                          CHECK (estatus IN (
                            'PROSPECTO','PROPUESTA','NEGOCIACION','PEDIDO',
                            'EN_PRODUCCION','EMBARQUE','ENTREGADO','FACTURADO','CANCELADO'
                          )),

  prioridad               TEXT NOT NULL DEFAULT 'NORMAL'
                          CHECK (prioridad IN ('NORMAL','ALTA','URGENTE')),

  valor_pedido            NUMERIC(14,2) NOT NULL DEFAULT 0,
  moneda                  TEXT NOT NULL DEFAULT 'MXN'
                          CHECK (moneda IN ('MXN','USD')),

  avance_porcentaje       INTEGER NOT NULL DEFAULT 0
                          CHECK (avance_porcentaje BETWEEN 0 AND 100),

  fecha_pedido            DATE,
  fecha_entrega_prometida DATE,
  fecha_entrega_real      DATE,

  numero_pedido_cliente   TEXT,
  numero_factura          TEXT,
  motivo_cancelacion      TEXT,
  notas                   TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_viajeros_ventas_tenant_id ON viajeros_ventas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_viajeros_ventas_estatus   ON viajeros_ventas (estatus);
CREATE INDEX IF NOT EXISTS idx_viajeros_ventas_cliente   ON viajeros_ventas (cliente);

-- â”€â”€ 2. Sub-tabla: ventas_etapas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS ventas_etapas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viajero_venta_id  UUID NOT NULL REFERENCES viajeros_ventas(id) ON DELETE CASCADE,
  nombre_etapa      TEXT NOT NULL,
  responsable_etapa TEXT,
  tiempo_estimado   NUMERIC(8,2),
  estado            TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','en_proceso','completado')),
  orden             INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ventas_etapas_viajero_venta_id ON ventas_etapas (viajero_venta_id);

-- â”€â”€ 3. updated_at trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION set_updated_at_ventas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_viajeros_ventas_updated_at ON viajeros_ventas;
CREATE TRIGGER trg_viajeros_ventas_updated_at
  BEFORE UPDATE ON viajeros_ventas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_ventas();

-- â”€â”€ 4. Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE viajeros_ventas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_etapas    ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "tenant_viajeros_ventas_select"  ON viajeros_ventas;
DROP POLICY IF EXISTS "tenant_viajeros_ventas_insert"  ON viajeros_ventas;
DROP POLICY IF EXISTS "tenant_viajeros_ventas_update"  ON viajeros_ventas;
DROP POLICY IF EXISTS "tenant_viajeros_ventas_delete"  ON viajeros_ventas;
DROP POLICY IF EXISTS "tenant_ventas_etapas_select"    ON ventas_etapas;
DROP POLICY IF EXISTS "tenant_ventas_etapas_insert"    ON ventas_etapas;
DROP POLICY IF EXISTS "tenant_ventas_etapas_update"    ON ventas_etapas;
DROP POLICY IF EXISTS "tenant_ventas_etapas_delete"    ON ventas_etapas;

-- viajeros_ventas policies
CREATE POLICY "tenant_viajeros_ventas_select" ON viajeros_ventas
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    OR (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID = tenant_id
  );

CREATE POLICY "tenant_viajeros_ventas_insert" ON viajeros_ventas
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    OR (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID = tenant_id
  );

CREATE POLICY "tenant_viajeros_ventas_update" ON viajeros_ventas
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    OR (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID = tenant_id
  );

CREATE POLICY "tenant_viajeros_ventas_delete" ON viajeros_ventas
  FOR DELETE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    OR (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID = tenant_id
  );

-- ventas_etapas policies (access via parent viajero)
CREATE POLICY "tenant_ventas_etapas_select" ON ventas_etapas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM viajeros_ventas vv
      WHERE vv.id = ventas_etapas.viajero_venta_id
        AND (
          vv.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
          OR vv.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
        )
    )
  );

CREATE POLICY "tenant_ventas_etapas_insert" ON ventas_etapas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM viajeros_ventas vv
      WHERE vv.id = ventas_etapas.viajero_venta_id
        AND (
          vv.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
          OR vv.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
        )
    )
  );

CREATE POLICY "tenant_ventas_etapas_update" ON ventas_etapas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM viajeros_ventas vv
      WHERE vv.id = ventas_etapas.viajero_venta_id
        AND (
          vv.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
          OR vv.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
        )
    )
  );

CREATE POLICY "tenant_ventas_etapas_delete" ON ventas_etapas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM viajeros_ventas vv
      WHERE vv.id = ventas_etapas.viajero_venta_id
        AND (
          vv.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
          OR vv.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
        )
    )
  );

-- â”€â”€ 5. Sample data (opcional â€” comentar en producciÃ³n) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- INSERT INTO viajeros_ventas (tenant_id, folio, cliente, descripcion, responsable_ventas, estatus, valor_pedido)
-- VALUES ('YOUR-TENANT-UUID', 'PV-2026-001', 'Cliente Demo', 'Pedido de prueba', 'Vendedor Demo', 'PROPUESTA', 50000);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- FIN DEL SCRIPT
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
