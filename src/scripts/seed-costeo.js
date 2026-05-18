import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZGJndnllb21vZXd6bWhrYnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODIyMTgsImV4cCI6MjA5MjM1ODIxOH0.jFUjtbPOTUiNesoy6Su3k1gTDoO5tv8ZotVFw7Ffb5Q';

async function seedCosteo() {
  console.log('🚀 Iniciando inyección de datos de prueba para Costeo Dinámico (Cloud Supabase - Anon Key)...');
  
  // Inicializar cliente de Supabase con Anon Key
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    // 1. Obtener el UUID del tenant 'mcvill'
    const { data: tenantData, error: tenantErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'mcvill')
      .maybeSingle();

    if (tenantErr || !tenantData) {
      throw new Error(`No se pudo obtener el tenant 'mcvill': ${tenantErr?.message || 'No existe'}`);
    }
    const tenantId = tenantData.id;
    console.log(`📌 Tenant 'mcvill' encontrado con ID: ${tenantId}`);

    // 2. Obtener un centro de costo existente para asociar
    const { data: ccData } = await supabase
      .from('centros_costo')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    
    let centroCostoId = null;
    if (ccData && ccData.length > 0) {
      centroCostoId = ccData[0].id;
      console.log(`📌 Centro de costo asociado encontrado con ID: ${centroCostoId}`);
    } else {
      console.log('⚠️ No se encontró centro de costo. Se insertará con valor nulo.');
    }

    // Listado de IDs demo
    const ids = [
      'JOB-2026-001',
      'JOB-2026-002',
      'JOB-2026-003',
      'JOB-2026-004',
      'JOB-2026-005'
    ];

    console.log('🧹 Limpiando registros anteriores de prueba...');
    // Eliminar costos existentes primero debido a la FK
    const { error: delCostosErr } = await supabase
      .from('costos_ordenes')
      .delete()
      .in('viajero_id', ids);
    
    if (delCostosErr) {
      console.log(`⚠️ Advertencia al limpiar costos: ${delCostosErr.message}`);
    }

    // Eliminar viajeros existentes
    const { error: delViajerosErr } = await supabase
      .from('viajeros')
      .delete()
      .in('id', ids);

    if (delViajerosErr) {
      console.log(`⚠️ Advertencia al limpiar viajeros: ${delViajerosErr.message}`);
    }

    // 3. Crear datos de los viajeros demo
    const viajeros = [
      {
        id: 'JOB-2026-001',
        numero_parte: 'PT-10045-AL',
        descripcion: 'Soporte de Aluminio para Celda de Batería (Trumpf Laser + CNC)',
        revision: 'A',
        cliente: 'Tesla Inc.',
        cantidad_orden: 150,
        cant_fabricada: 150,
        oc_cliente: 'PO-994821',
        linea: 'Aluminio',
        fecha_orden: '2026-05-10',
        fecha_entrega: '2026-06-10',
        cotizacion: 'QT-2026-104',
        horas_est_totales: 45.5,
        es_maestro: false,
        data_source: 'seed'
      },
      {
        id: 'JOB-2026-002',
        numero_parte: 'PT-20098-SS',
        descripcion: 'Brida de Acero Inoxidable 316L (Torno Mazak + Pulido)',
        revision: 'B',
        cliente: 'Caterpillar México',
        cantidad_orden: 45,
        cant_fabricada: 45,
        oc_cliente: 'PO-884712',
        linea: 'Maquinados Sr',
        fecha_orden: '2026-05-12',
        fecha_entrega: '2026-06-12',
        cotizacion: 'QT-2026-105',
        horas_est_totales: 32.0,
        es_maestro: false,
        data_source: 'seed'
      },
      {
        id: 'JOB-2026-003',
        numero_parte: 'PT-30012-CS',
        descripcion: 'Chasis de Acero al Carbón Cortado por Láser (Reproceso Crítico)',
        revision: 'A',
        cliente: 'John Deere',
        cantidad_orden: 80,
        cant_fabricada: 75,
        oc_cliente: 'PO-773199',
        linea: 'Corte y Doblez',
        fecha_orden: '2026-05-13',
        fecha_entrega: '2026-06-13',
        cotizacion: 'QT-2026-106',
        horas_est_totales: 18.5,
        es_maestro: false,
        data_source: 'seed'
      },
      {
        id: 'JOB-2026-004',
        numero_parte: 'PT-40081-BR',
        descripcion: 'Buje de Bronce de Alta Fricción (Torno Especializado)',
        revision: 'C',
        cliente: 'General Electric',
        cantidad_orden: 200,
        cant_fabricada: 200,
        oc_cliente: 'PO-662491',
        linea: 'Torno Especial',
        fecha_orden: '2026-05-14',
        fecha_entrega: '2026-06-14',
        cotizacion: 'QT-2026-107',
        horas_est_totales: 65.0,
        es_maestro: false,
        data_source: 'seed'
      },
      {
        id: 'JOB-2026-005',
        numero_parte: 'PT-50033-PL',
        descripcion: 'Placa de Sujeción de Herramental (Fresado Haas)',
        revision: 'A',
        cliente: 'Siemens AG',
        cantidad_orden: 12,
        cant_fabricada: 10,
        oc_cliente: 'PO-551029',
        linea: 'Herramentales',
        fecha_orden: '2026-05-15',
        fecha_entrega: '2026-06-15',
        cotizacion: 'QT-2026-108',
        horas_est_totales: 12.5,
        es_maestro: false,
        data_source: 'seed'
      }
    ];

    console.log('📥 Insertando viajeros de prueba en la nube...');
    const { error: insViajerosErr } = await supabase
      .from('viajeros')
      .insert(viajeros);

    if (insViajerosErr) {
      throw new Error(`Error al insertar viajeros: ${insViajerosErr.message}`);
    }
    console.log('✅ Viajeros insertados exitosamente.');

    // 4. Crear costos para los viajeros demo
    const costos = [
      {
        tenant_id: tenantId,
        viajero_id: 'JOB-2026-001',
        centro_costo: centroCostoId,
        mat_est: 12500,
        mo_est: 4500,
        maq_est: 6000,
        overhead_est: 3450,
        mat_real: 12450,
        mo_real: 4380,
        maq_real: 5900,
        overhead_real: 3350,
        precio_venta: 38500,
        estado: 'cerrada',
        notas: 'Proyecto entregado en tiempo. Margen saludable de 32%. Varianza del -1.40% (ahorro de costos).',
        data_source: 'seed'
      },
      {
        tenant_id: tenantId,
        viajero_id: 'JOB-2026-002',
        centro_costo: centroCostoId,
        mat_est: 8200,
        mo_est: 3200,
        maq_est: 4500,
        overhead_est: 2385,
        mat_real: 8350,
        mo_real: 4100, // Desviación en mano de obra por horas extras requeridas
        maq_real: 4800,
        overhead_real: 2500,
        precio_venta: 26000,
        estado: 'cerrada',
        notas: 'Varianza de +8.01% por horas extra del operador sr debido a dureza de lote de acero inox.',
        data_source: 'seed'
      },
      {
        tenant_id: tenantId,
        viajero_id: 'JOB-2026-003',
        centro_costo: centroCostoId,
        mat_est: 34000,
        mo_est: 12000,
        maq_est: 18000,
        overhead_est: 9600,
        mat_real: 38500, // Desperdicio de láminas
        mo_real: 15500, // Retrabajos
        maq_real: 26000, // Máquina Amada tuvo falla mecánica y demoró el doble
        overhead_real: 12000,
        precio_venta: 95000,
        estado: 'cerrada',
        notas: '⚠️ CRÍTICO: Varianza de +25.00%. Fallo de la cortadora láser Amada durante el lote causó merma de material y reprocesos.',
        data_source: 'seed'
      },
      {
        tenant_id: tenantId,
        viajero_id: 'JOB-2026-004',
        centro_costo: centroCostoId,
        mat_est: 15000,
        mo_est: 6500,
        maq_est: 9000,
        overhead_est: 4575,
        mat_real: null, // Sigue abierta
        mo_real: null,
        maq_real: null,
        overhead_real: null,
        precio_venta: 52000,
        estado: 'abierta',
        notas: 'Orden en curso en Torno Haas. Costos reales se calcularán al finalizar las operaciones.',
        data_source: 'seed'
      },
      {
        tenant_id: tenantId,
        viajero_id: 'JOB-2026-005',
        centro_costo: centroCostoId,
        mat_est: 4500,
        mo_est: 2200,
        maq_est: 3000,
        overhead_est: 1455,
        mat_real: 5100, // Desviación parcial
        mo_real: 2300,
        maq_real: 3100,
        overhead_real: 1550,
        precio_venta: 15500,
        estado: 'abierta',
        notas: 'Orden abierta en rectificado. Desviación inicial de costo de material por aumento de insumos.',
        data_source: 'seed'
      }
    ];

    console.log('📥 Insertando órdenes de costo en la nube...');
    const { error: insCostosErr } = await supabase
      .from('costos_ordenes')
      .insert(costos);

    if (insCostosErr) {
      throw new Error(`Error al insertar costos_ordenes: ${insCostosErr.message}`);
    }

    console.log('\n✨ ¡Inyección exitosa! Los datos en la nube están listos para brillar en el demo de mañana.');

  } catch (err) {
    console.error('❌ Error inyectando datos de prueba:', err.message || err);
  }
}

seedCosteo();
