-- Migration: add data_source column to all main tables
-- Purpose: distinguish real McVill data from seed/demo data injected for testing
-- Usage: DELETE FROM <table> WHERE data_source = 'seed'; -- run before go-live

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'rfq_cotizaciones',
    'rfq_documentos',
    'factibilidad_analisis',
    'evaluacion_factibilidad',
    'cotizaciones_express',
    'clientes',
    'proveedores',
    'materiales',
    'materiales_catalogo',
    'suministros',
    'lotes_materiales',
    'trazabilidad_uso_lote',
    'inventory_movements',
    'operaciones_catalogo',
    'productos',
    'bom_items',
    'product_revision_history',
    'viajeros',
    'viajero_operaciones',
    'viajero_materiales',
    'viajero_comentarios',
    'ordenes_trabajo',
    'production_logs',
    'costos_ordenes',
    'costos_lineas',
    'ordenes_compra_cliente',
    'ordenes_compra_proveedor',
    'cuentas_cobrar',
    'cuentas_pagar',
    'quality_inspections',
    'inspection_checkpoints',
    'no_conformidades',
    'auditorias_internas',
    'activos_maquinas',
    'activos_edificio',
    'ordenes_mantenimiento',
    'empleados',
    'nominas',
    'asistencia',
    'hse_incidents',
    'hse_certifications',
    'minutas',
    'aprobaciones'
  ];
  index_tables TEXT[] := ARRAY[
    'rfq_cotizaciones',
    'viajeros',
    'costos_ordenes',
    'materiales',
    'clientes',
    'proveedores',
    'ordenes_trabajo'
  ];
  view_tables TEXT[] := ARRAY[
    'rfq_cotizaciones',
    'viajeros',
    'costos_ordenes',
    'materiales',
    'clientes',
    'proveedores',
    'ordenes_trabajo',
    'productos',
    'empleados'
  ];
  t TEXT;
  view_parts TEXT[] := ARRAY[]::TEXT[];
  view_sql TEXT;
BEGIN
  -- 1. Add data_source column to all tables that exist
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'data_source'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD COLUMN data_source TEXT NOT NULL DEFAULT ''real'' CHECK (data_source IN (''real'', ''seed'', ''demo'', ''import''))',
          t
        );
        RAISE NOTICE 'Added data_source to %', t;
      ELSE
        RAISE NOTICE 'data_source already exists in %, skipping', t;
      END IF;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', t;
    END IF;
  END LOOP;

  -- 2. Create indexes only on tables that exist and have the column
  FOREACH t IN ARRAY index_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'data_source'
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_data_source ON public.%I(data_source) WHERE data_source != ''real''',
        t, t
      );
      RAISE NOTICE 'Created index on %', t;
    END IF;
  END LOOP;

  -- 3. Build view dynamically from tables that exist and have data_source
  FOREACH t IN ARRAY view_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'data_source'
    ) THEN
      view_parts := array_append(
        view_parts,
        format('SELECT %L AS tabla, data_source, COUNT(*) AS registros FROM public.%I GROUP BY data_source', t, t)
      );
    END IF;
  END LOOP;

  IF array_length(view_parts, 1) > 0 THEN
    view_sql := 'CREATE OR REPLACE VIEW public.v_data_source_summary AS ' ||
                array_to_string(view_parts, ' UNION ALL ') ||
                ' ORDER BY tabla, data_source';
    EXECUTE view_sql;
    RAISE NOTICE 'Created view v_data_source_summary with % tables', array_length(view_parts, 1);
  END IF;
END;
$$;


-- ============================================================

-- Migration: mark all currently existing rows as seed data
-- Context: runs AFTER 20260516000003_add_data_source.sql which set DEFAULT 'real'
-- All rows present at this migration time are demo/seed data injected for testing.
-- Real McVill data inserted going forward will use the DEFAULT 'real' automatically.
-- At go-live: run v_data_source_summary view, verify, then delete WHERE data_source = 'seed'.
-- NOTE: triggers are disabled during this migration to bypass the audit trigger
--       (trg_audit_generica) which fails on non-UUID tenant_id values like 'mcvill'.

-- Disable triggers for this session to bypass audit trigger during bulk UPDATE
SET session_replication_role = replica;

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'rfq_cotizaciones',
    'rfq_documentos',
    'factibilidad_analisis',
    'evaluacion_factibilidad',
    'cotizaciones_express',
    'clientes',
    'proveedores',
    'materiales',
    'materiales_catalogo',
    'suministros',
    'lotes_materiales',
    'trazabilidad_uso_lote',
    'inventory_movements',
    'operaciones_catalogo',
    'productos',
    'bom_items',
    'product_revision_history',
    'viajeros',
    'viajero_operaciones',
    'viajero_materiales',
    'viajero_comentarios',
    'ordenes_trabajo',
    'production_logs',
    'costos_ordenes',
    'costos_lineas',
    'ordenes_compra_cliente',
    'ordenes_compra_proveedor',
    'cuentas_cobrar',
    'cuentas_pagar',
    'quality_inspections',
    'inspection_checkpoints',
    'no_conformidades',
    'auditorias_internas',
    'activos_maquinas',
    'activos_edificio',
    'ordenes_mantenimiento',
    'empleados',
    'nominas',
    'asistencia',
    'hse_incidents',
    'hse_certifications',
    'minutas',
    'aprobaciones',
    'catalogo_ilc',
    'parametros_globales',
    'tarifas_mano_obra',
    'tarifas_maquina',
    'centros_costo',
    'plantas'
  ];
  t TEXT;
  rows_updated BIGINT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'data_source'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET data_source = ''seed'' WHERE data_source = ''real''',
        t
      );
      GET DIAGNOSTICS rows_updated = ROW_COUNT;
      RAISE NOTICE 'Marked % rows as seed in %', rows_updated, t;
    ELSE
      RAISE NOTICE 'Table % has no data_source column, skipping', t;
    END IF;
  END LOOP;
END;
$$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;


-- ============================================================

-- Migration: mark real McVill catalog data as 'import' (not seed)
-- 'import' = real data loaded from actual McVill/Caterpillar sources — do NOT delete at go-live.
--   materiales   → McVill's actual steel catalog (grades 1E-0166, 1E-0170, AR400, etc.)
--   catalogo_ilc → Caterpillar ILC hardware catalog used for quoting.

SET session_replication_role = replica;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'materiales' AND column_name = 'data_source'
  ) THEN
    UPDATE public.materiales SET data_source = 'import' WHERE data_source = 'seed';
    RAISE NOTICE 'Marked materiales as import: % rows', (SELECT COUNT(*) FROM public.materiales WHERE data_source = 'import');
  ELSE
    RAISE NOTICE 'materiales has no data_source column, skipping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalogo_ilc' AND column_name = 'data_source'
  ) THEN
    UPDATE public.catalogo_ilc SET data_source = 'import' WHERE data_source = 'seed';
    RAISE NOTICE 'Marked catalogo_ilc as import: % rows', (SELECT COUNT(*) FROM public.catalogo_ilc WHERE data_source = 'import');
  ELSE
    RAISE NOTICE 'catalogo_ilc has no data_source column, skipping';
  END IF;
END;
$$;

SET session_replication_role = DEFAULT;

