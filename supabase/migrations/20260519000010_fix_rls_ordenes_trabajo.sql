-- Fix RLS: ordenes_trabajo (renamed from work_orders) was left with the old
-- role-check policy from 20260424000008_production.sql. Update to the standard
-- authenticated-user pattern used across all other tables.

ALTER TABLE public.ordenes_trabajo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Work orders visibility"    ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "Production full access"    ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "ordenes_trabajo_access"    ON public.ordenes_trabajo;
DROP POLICY IF EXISTS "ordenes_trabajo_all"       ON public.ordenes_trabajo;

CREATE POLICY "ordenes_trabajo_access" ON public.ordenes_trabajo
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Fix production_logs as well (same migration origin, same risk)
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Production logs visibility" ON public.production_logs;
DROP POLICY IF EXISTS "production_logs_access"     ON public.production_logs;

CREATE POLICY "production_logs_access" ON public.production_logs
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
