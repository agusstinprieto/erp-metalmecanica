-- =============================================================================
-- CONSOLIDAR TENANT ÚNICO — McVill Metalmecánica
-- UUID correcto (donde están los empleados y datos reales): c89d6183-5f66-48dd-8b66-2b8b6b993e61
-- Ejecutar en Supabase SQL Editor (Role: postgres)
-- =============================================================================

DO $$
DECLARE
  v_correct   UUID    := 'c89d6183-5f66-48dd-8b66-2b8b6b993e61';
  v_correct_t TEXT    := 'c89d6183-5f66-48dd-8b66-2b8b6b993e61';
  tbl         TEXT;
  col_type    TEXT;
  rows_upd    BIGINT;

  -- Todas las tablas que pueden tener tenant_id (UUID o TEXT)
  all_tables TEXT[] := ARRAY[
    'profiles',
    'empleados', 'employees',
    'nominas', 'payrolls', 'nomina_lineas', 'payroll_concepts',
    'employee_fiscal_data', 'employee_skills', 'certifications', 'epp_deliveries',
    'financial_accounts', 'financial_transactions', 'transaction_entries', 'tax_tables',
    'materiales', 'materials', 'suministros', 'materiales_catalogo',
    'inventory_movements', 'lotes_materiales', 'trazabilidad_uso_lote',
    'costing_simulations', 'costing_headers', 'costos_ordenes', 'costos_lineas',
    'productos', 'products', 'bom_items', 'product_revision_history',
    'ordenes_trabajo', 'work_orders', 'production_logs',
    'quality_inspections', 'inspection_checkpoints', 'no_conformidades',
    'auditorias_internas', 'sgc_no_conformidades',
    'clientes', 'proveedores',
    'cotizaciones', 'cotizacion_partidas', 'cotizaciones_express',
    'rfq_cotizaciones', 'rfq_documentos',
    'factibilidad_analisis', 'evaluacion_factibilidad',
    'operaciones_catalogo', 'catalogo_ilc', 'parametros_globales',
    'ordenes_compra_cliente', 'ordenes_compra_proveedor',
    'cuentas_cobrar', 'cuentas_pagar',
    'viajeros', 'viajero_operaciones', 'viajero_materiales', 'viajero_comentarios',
    'plantas', 'centros_costo', 'tarifas_mano_obra', 'tarifas_maquina',
    'activos_maquinas', 'activos_edificio', 'ordenes_mantenimiento',
    'asistencia', 'attendance_records', 'time_attendance',
    'hse_incidents', 'hse_certifications', 'hse_courses',
    'spc_alertas',
    'minutas', 'aprobaciones', 'flujos_aprobacion',
    'audit_logs',
    'ai_knowledge', 'knowledge_base',
    'telemetry_records',
    'banco_cuentas', 'banco_transacciones',
    'work_shifts', 'report_schedules',
    'desempeno_operadores', 'incentivos',
    'ai_token_usage'
  ];

BEGIN
  RAISE NOTICE '=== INICIO: Consolidar tenant único McVill ===';
  RAISE NOTICE 'Tenant correcto: %', v_correct_t;

  -- Desactivar triggers para evitar conflictos durante la migración masiva
  SET session_replication_role = replica;

  -- ── PASO 1: Reasignar datos de todos los tenants incorrectos ─────────────
  FOREACH tbl IN ARRAY all_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id'
    ) THEN
      CONTINUE;
    END IF;

    -- Detectar tipo de columna tenant_id
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id';

    BEGIN
      IF col_type = 'uuid' THEN
        -- Columna UUID: reasignar todos los UUIDs distintos al correcto
        EXECUTE format(
          'UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NOT NULL AND tenant_id != $1',
          tbl
        ) USING v_correct;
        GET DIAGNOSTICS rows_upd = ROW_COUNT;

      ELSE
        -- Columna TEXT: reasignar si tiene un UUID que no sea el correcto
        -- (deja intactos valores de slug como 'mcvill' ya que son válidos)
        EXECUTE format(
          'UPDATE public.%I SET tenant_id = $1
           WHERE tenant_id IS NOT NULL
             AND tenant_id != $1
             AND tenant_id != ''mcvill''
             AND tenant_id ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''',
          tbl
        ) USING v_correct_t;
        GET DIAGNOSTICS rows_upd = ROW_COUNT;
      END IF;

      IF rows_upd > 0 THEN
        RAISE NOTICE '  ✓ % → % filas reasignadas', tbl, rows_upd;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '  ⚠ Error en %: %', tbl, SQLERRM;
    END;
  END LOOP;

  -- Reactivar triggers
  SET session_replication_role = DEFAULT;

  -- ── PASO 2: Eliminar tenants incorrectos ─────────────────────────────────
  -- CASCADE borrará únicamente filas huérfanas (no reasignadas) en tablas hijas
  RAISE NOTICE '';
  RAISE NOTICE '=== Eliminando tenants incorrectos ===';

  DELETE FROM public.tenants WHERE id != v_correct;
  GET DIAGNOSTICS rows_upd = ROW_COUNT;
  RAISE NOTICE '  ✓ Tenants eliminados: %', rows_upd;

  -- ── PASO 3: Actualizar el tenant correcto ─────────────────────────────────
  UPDATE public.tenants SET
    slug = 'mcvill',
    name = 'McVill Metalmecánica'
  WHERE id = v_correct;

  RAISE NOTICE '';
  RAISE NOTICE '=== Tenant único configurado ===';
  RAISE NOTICE '  ID:   %', v_correct_t;
  RAISE NOTICE '  Slug: mcvill';
  RAISE NOTICE '  Nombre: McVill Metalmecánica';
  RAISE NOTICE '=== FIN ===';

END $$;

-- ── VERIFICACIÓN ─────────────────────────────────────────────────────────────
SELECT 'tenants' AS tabla, COUNT(*) AS total FROM public.tenants
UNION ALL
SELECT 'empleados', COUNT(*) FROM public.empleados WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'empleados')
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles
ORDER BY tabla;
