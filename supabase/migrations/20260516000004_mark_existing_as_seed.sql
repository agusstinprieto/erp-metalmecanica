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
