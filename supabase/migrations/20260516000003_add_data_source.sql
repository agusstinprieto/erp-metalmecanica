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
