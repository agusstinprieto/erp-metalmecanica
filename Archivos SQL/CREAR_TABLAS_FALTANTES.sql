-- ============================================================
-- TABLAS FALTANTES — mcvill-erp
-- Ejecutar en Supabase SQL Editor
-- Proyecto: kfdbgvyeomoewzmhkbsn.supabase.co
-- ============================================================

-- ─── 1. PRODUCTOS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.productos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku         TEXT NOT NULL,
  name        TEXT NOT NULL,
  revision    TEXT DEFAULT 'A',
  description TEXT,
  category    TEXT,
  unit        TEXT DEFAULT 'pza',
  status      TEXT DEFAULT 'activo' CHECK (status IN ('activo','descontinuado','en_revision')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_tenant ON public.productos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_sku    ON public.productos(sku);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_productos" ON public.productos;
CREATE POLICY "tenant_productos" ON public.productos
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- ─── 2. SUMINISTROS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suministros (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  unit           TEXT DEFAULT 'kg',
  category       TEXT,
  stock_quantity NUMERIC DEFAULT 0,
  min_stock      NUMERIC DEFAULT 5,
  unit_cost      NUMERIC DEFAULT 0,
  location       TEXT DEFAULT 'ALMACÉN',
  supplier       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suministros_tenant ON public.suministros(tenant_id);

ALTER TABLE public.suministros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_suministros" ON public.suministros;
CREATE POLICY "tenant_suministros" ON public.suministros
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- ─── 3. LOTES DE MATERIAL ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lotes_materiales (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  numero_lote         TEXT NOT NULL,
  material_id         UUID REFERENCES public.suministros(id) ON DELETE SET NULL,
  descripcion         TEXT,
  proveedor           TEXT,
  numero_colada       TEXT,
  fecha_recepcion     DATE DEFAULT CURRENT_DATE,
  cantidad_inicial    NUMERIC DEFAULT 0,
  cantidad_disponible NUMERIC DEFAULT 0,
  unidad              TEXT DEFAULT 'kg',
  cert_calidad_url    TEXT,
  status              TEXT DEFAULT 'disponible'
                        CHECK (status IN ('disponible','agotado','cuarentena','rechazado')),
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lotes_tenant    ON public.lotes_materiales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lotes_material  ON public.lotes_materiales(material_id);
CREATE INDEX IF NOT EXISTS idx_lotes_status    ON public.lotes_materiales(status);

ALTER TABLE public.lotes_materiales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_lotes" ON public.lotes_materiales;
CREATE POLICY "tenant_lotes" ON public.lotes_materiales
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- ─── 4. TRAZABILIDAD USO DE LOTE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.trazabilidad_uso_lote (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  lote_id         UUID REFERENCES public.lotes_materiales(id) ON DELETE RESTRICT,
  viajero_id      UUID,   -- Referencia soft a viajeros (sin FK para no bloquear)
  material_id     UUID REFERENCES public.suministros(id) ON DELETE SET NULL,
  operacion       TEXT,
  cantidad_usada  NUMERIC NOT NULL DEFAULT 0,
  registrado_por  TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uso_lote_lote    ON public.trazabilidad_uso_lote(lote_id);
CREATE INDEX IF NOT EXISTS idx_uso_lote_viajero ON public.trazabilidad_uso_lote(viajero_id);
CREATE INDEX IF NOT EXISTS idx_uso_lote_tenant  ON public.trazabilidad_uso_lote(tenant_id);

ALTER TABLE public.trazabilidad_uso_lote ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_uso_lote" ON public.trazabilidad_uso_lote;
CREATE POLICY "tenant_uso_lote" ON public.trazabilidad_uso_lote
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- ─── 5. HISTORIAL DE REVISIONES DE PRODUCTO ──────────────────
CREATE TABLE IF NOT EXISTS public.product_revision_history (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES public.productos(id) ON DELETE CASCADE,
  sku                 TEXT,
  revision_anterior   TEXT,
  revision_nueva      TEXT NOT NULL,
  descripcion_cambio  TEXT,
  motivo              TEXT,
  impacto             TEXT CHECK (impacto IN ('bajo','medio','alto') OR impacto IS NULL),
  fecha_cambio        DATE DEFAULT CURRENT_DATE,
  cambiado_por        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_product ON public.product_revision_history(product_id);
CREATE INDEX IF NOT EXISTS idx_revision_tenant  ON public.product_revision_history(tenant_id);

ALTER TABLE public.product_revision_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_revisions" ON public.product_revision_history;
CREATE POLICY "tenant_revisions" ON public.product_revision_history
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_settings WHERE user_id = auth.uid()
    )
  );

-- ─── TRIGGERS updated_at ─────────────────────────────────────
-- (Usa la función update_updated_at_column que ya existe en el schema)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_productos_updated_at') THEN
    CREATE TRIGGER trg_productos_updated_at
      BEFORE UPDATE ON public.productos
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_suministros_updated_at') THEN
    CREATE TRIGGER trg_suministros_updated_at
      BEFORE UPDATE ON public.suministros
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lotes_updated_at') THEN
    CREATE TRIGGER trg_lotes_updated_at
      BEFORE UPDATE ON public.lotes_materiales
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─── DATOS SEMILLA (opcional, para pruebas) ───────────────────
-- Descomenta si quieres datos iniciales:

/*
INSERT INTO public.suministros (name, unit, stock_quantity, min_stock, unit_cost, location)
VALUES
  ('Acero 4140 barra 2"',     'kg',  850, 200, 48.50, 'ALMACÉN-A1'),
  ('Acero inox 316 lámina',   'kg',  320, 100, 125.00,'ALMACÉN-A2'),
  ('Aluminio 6061 barra 3"',  'kg',  175, 50,  62.00, 'ALMACÉN-B1'),
  ('Acero 1045 barra 3"',     'kg',  640, 150, 38.00, 'ALMACÉN-A1'),
  ('Cobre tubo 1"',           'ml',  90,  30,  285.00,'ALMACÉN-B2')
ON CONFLICT DO NOTHING;
*/

-- ─── VERIFICACIÓN FINAL ───────────────────────────────────────
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS activo' ELSE '❌ Sin RLS' END AS rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('productos','suministros','lotes_materiales','trazabilidad_uso_lote','product_revision_history')
ORDER BY tablename;
