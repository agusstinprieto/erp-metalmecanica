import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZGJndnllb21vZXd6bWhrYnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc4MjIxOCwiZXhwIjoyMDkyMzU4MjE4fQ.Fiv_FSMBniNAeY26aJAPvxXYQCaNlHnPr88ZaqmJFv4';

async function seedAllModules() {
  console.log('🚀 Iniciando Inyección Integral de Datos para Demo McVill (Metalmecánica - Service Role)...');
  
  // 1. Inicializar cliente con Service Role Key (Bypass RLS completo)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    // 2. Obtener el UUID del tenant 'mcvill'
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

    // --- SEED DE CENTROS DE COSTO ---
    console.log('⚙️ Verificando Centros de Costo...');
    const { data: ccData } = await supabase
      .from('centros_costo')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    
    let centroCostoId = null;
    if (ccData && ccData.length > 0) {
      centroCostoId = ccData[0].id;
    } else {
      // Crear uno de respaldo
      const { data: newCC } = await supabase
        .from('centros_costo')
        .insert({
          tenant_id: tenantId,
          nombre: 'Mecanizado CNC',
          codigo: 'CNC-01',
          activo: true
        })
        .select()
        .single();
      if (newCC) centroCostoId = newCC.id;
    }
    console.log(`✅ Centro de Costo de trabajo: ${centroCostoId}`);

    // --- SEED DE EMPLEADOS ---
    console.log('👥 Inyectando Personal en RH (employees)...');
    const employeeIds = [
      'e1111111-1111-1111-1111-111111111111',
      'e2222222-2222-2222-2222-222222222222',
      'e3333333-3333-3333-3333-333333333333',
      'e4444444-4444-4444-4444-444444444444',
      'e5555555-5555-5555-5555-555555555555'
    ];

    // Limpiar anteriores
    await supabase.from('employees').delete().in('id', employeeIds);

    const employees = [
      {
        id: employeeIds[0],
        tenant_id: tenantId,
        employee_number: 'EMP-2026-001',
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan.perez@mcvill.com',
        phone: '811-000-0001',
        rfc: 'PERJ850101XYZ',
        curp: 'PERJ850101HDFRRN01',
        nss: '12345678901',
        job_title: 'Operador CNC',
        department: 'Producción',
        hire_date: '2026-01-15',
        daily_salary: 960,
        status: 'active',
        tipo_empleado: 'operador',
        celula_operador: 'MAQUINADO',
        turno_operador: 'matutino',
        puesto_operador: 'Operador CNC Senior'
      },
      {
        id: employeeIds[1],
        tenant_id: tenantId,
        employee_number: 'EMP-2026-002',
        first_name: 'María',
        last_name: 'Gómez',
        email: 'maria.gomez@mcvill.com',
        phone: '811-000-0002',
        rfc: 'GOMM820302ABC',
        curp: 'GOMM820302MDFRRN02',
        nss: '23456789012',
        job_title: 'Supervisor de Turno',
        department: 'Producción',
        hire_date: '2026-02-01',
        daily_salary: 1440,
        status: 'active',
        tipo_empleado: 'supervisor',
        celula_operador: 'MAQUINADO',
        turno_operador: 'matutino',
        puesto_operador: 'Supervisor Maquinados'
      },
      {
        id: employeeIds[2],
        tenant_id: tenantId,
        employee_number: 'EMP-2026-003',
        first_name: 'Carlos',
        last_name: 'Ruíz',
        email: 'carlos.ruiz@mcvill.com',
        phone: '811-000-0003',
        rfc: 'RUIC800404DEF',
        curp: 'RUIC800404HDFRRN03',
        nss: '34567890123',
        job_title: 'Inspector de Calidad',
        department: 'Calidad',
        hire_date: '2026-02-15',
        daily_salary: 1200,
        status: 'active',
        tipo_empleado: 'calidad',
        celula_operador: 'CORTE',
        turno_operador: 'vespertino',
        puesto_operador: 'Inspector QA Junior'
      },
      {
        id: employeeIds[3],
        tenant_id: tenantId,
        employee_number: 'EMP-2026-004',
        first_name: 'Ana',
        last_name: 'Hernández',
        email: 'ana.hernandez@mcvill.com',
        phone: '811-000-0004',
        rfc: 'HERA880505GHI',
        curp: 'HERA880505MDFRRN04',
        nss: '45678901234',
        job_title: 'Gerente de RH',
        department: 'Recursos Humanos',
        hire_date: '2026-03-01',
        daily_salary: 1280,
        status: 'active',
        tipo_empleado: 'rh',
        celula_operador: null,
        turno_operador: null,
        puesto_operador: null
      },
      {
        id: employeeIds[4],
        tenant_id: tenantId,
        employee_number: 'EMP-2026-005',
        first_name: 'Luis',
        last_name: 'Martínez',
        email: 'luis.martinez@mcvill.com',
        phone: '811-000-0005',
        rfc: 'MARL900606JKL',
        curp: 'MARL900606HDFRRN05',
        nss: '56789012345',
        job_title: 'Auxiliar de Almacén',
        department: 'Almacén',
        hire_date: '2026-03-10',
        daily_salary: 880,
        status: 'active',
        tipo_empleado: 'almacenista',
        celula_operador: 'ENSAMBLE',
        turno_operador: 'matutino',
        puesto_operador: 'Ayudante Almacén'
      }
    ];

    const { error: empErr } = await supabase.from('employees').insert(employees);
    if (empErr) console.log(`⚠️ Advertencia al inyectar empleados: ${empErr.message}`);
    else console.log('✅ 5 Empleados premium inyectados.');

    // --- SEED DE ASISTENCIA DIARIA (attendance_records) ---
    console.log('⏰ Inyectando registros de Asistencia (attendance_records) para hoy...');
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Limpiar anteriores de hoy
    await supabase.from('attendance_records').delete().eq('date', todayStr);

    const attendances = [
      {
        tenant_id: tenantId,
        employee_id: employeeIds[0],
        employee_name: 'Juan Pérez',
        date: todayStr,
        check_in: `${todayStr}T08:02:14.000Z`,
        check_out: null,
        status: 'present',
        is_late: false,
        overtime_minutes: 0,
        missing_checkout: false
      },
      {
        tenant_id: tenantId,
        employee_id: employeeIds[1],
        employee_name: 'María Gómez',
        date: todayStr,
        check_in: `${todayStr}T07:55:30.000Z`,
        check_out: null,
        status: 'present',
        is_late: false,
        overtime_minutes: 0,
        missing_checkout: false
      },
      {
        tenant_id: tenantId,
        employee_id: employeeIds[2],
        employee_name: 'Carlos Ruíz',
        date: todayStr,
        check_in: `${todayStr}T08:15:00.000Z`,
        check_out: null,
        status: 'present',
        is_late: false,
        overtime_minutes: 0,
        missing_checkout: false
      },
      {
        tenant_id: tenantId,
        employee_id: employeeIds[3],
        employee_name: 'Ana Hernández',
        date: todayStr,
        check_in: `${todayStr}T08:00:00.000Z`,
        check_out: `${todayStr}T17:00:00.000Z`,
        status: 'present',
        is_late: false,
        overtime_minutes: 0,
        missing_checkout: false
      }
    ];

    const { error: attErr } = await supabase.from('attendance_records').insert(attendances);
    if (attErr) console.log(`⚠️ Advertencia al inyectar asistencias: ${attErr.message}`);
    else console.log('✅ Registros de asistencia en tiempo real creados para hoy.');

    // --- SEED DE TURNOS DE TRABAJO ---
    console.log('📅 Configurando Turnos Laborales (work_shifts)...');
    await supabase.from('work_shifts').delete().eq('tenant_id', tenantId);
    
    const shifts = [
      {
        tenant_id: tenantId,
        nombre: 'Primer Turno McVill',
        hora_inicio: '08:00:00',
        hora_fin: '17:00:00',
        dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
      },
      {
        tenant_id: tenantId,
        nombre: 'Segundo Turno McVill',
        hora_inicio: '17:00:00',
        hora_fin: '01:00:00',
        dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
      }
    ];
    await supabase.from('work_shifts').insert(shifts);
    console.log('✅ Turnos de producción creados.');

    // --- SEED DE ALMACÉN (materiales & suministros) ---
    console.log('📦 Abasteciendo el Almacén General (materiales + suministros)...');
    
    const matIds = [
      'm1111111-1111-1111-1111-111111111111',
      'm2222222-2222-2222-2222-222222222222',
      'm3333333-3333-3333-3333-333333333333',
      'm4444444-4444-4444-4444-444444444444'
    ];

    // Limpiar anteriores
    await supabase.from('materiales').delete().in('id', matIds);
    await supabase.from('suministros').delete().in('id', matIds);

    // Inyectar en materiales (industrial)
    const materialesRows = [
      {
        id: matIds[0],
        tenant_id: tenantId,
        descripcion_mp: 'Lámina de Acero al Carbón A36 1/8" (4x10 ft)',
        peso_mp: 45,
        unidad_medida: 'pza',
        grado: 'MAT-STL-20',
        sku: 'MAT-STL-20'
      },
      {
        id: matIds[1],
        tenant_id: tenantId,
        descripcion_mp: 'Barra Redonda de Aluminio 6061-T6 1/2"x12ft',
        peso_mp: 80,
        unidad_medida: 'pza',
        grado: 'MAT-AL-12',
        sku: 'MAT-AL-12'
      },
      {
        id: matIds[2],
        tenant_id: tenantId,
        descripcion_mp: 'Tornillo Allen de Alta Resistencia Grado 8 3/8" x 2"',
        peso_mp: 1200,
        unidad_medida: 'pza',
        grado: 'MAT-SCR-08',
        sku: 'MAT-SCR-08'
      },
      {
        id: matIds[3],
        tenant_id: tenantId,
        descripcion_mp: 'Aceite Lubricante Industrial Mobil Vactra No. 2',
        peso_mp: 15,
        unidad_medida: 'cubeta',
        grado: 'MAT-LUB-01',
        sku: 'MAT-LUB-01'
      }
    ];

    const { error: matIndustrialErr } = await supabase.from('materiales').insert(materialesRows);
    if (matIndustrialErr) {
      console.log(`⚠️ Advertencia al inyectar materiales: ${matIndustrialErr.message}`);
    } else {
      console.log('✅ Tabla industrial "materiales" poblada.');
    }

    // Inyectar en suministros (fallback)
    const suministrosRows = [
      {
        id: matIds[0],
        tenant_id: tenantId,
        sku: 'MAT-STL-20',
        name: 'Lámina de Acero al Carbón A36 1/8" (4x10 ft)',
        description: 'Lámina estructural de acero al carbón A36 para corte láser.',
        descripcion: 'Lámina estructural de acero al carbón A36 para corte láser.',
        category: 'Acero',
        stock_quantity: 45,
        unit: 'pza',
        min_stock: 10,
        location: 'Estante A-1'
      },
      {
        id: matIds[1],
        tenant_id: tenantId,
        sku: 'MAT-AL-12',
        name: 'Barra Redonda de Aluminio 6061-T6 1/2"x12ft',
        description: 'Barra de aluminio templado de alta maquinabilidad.',
        descripcion: 'Barra de aluminio templado de alta maquinabilidad.',
        category: 'Aluminio',
        stock_quantity: 80,
        unit: 'pza',
        min_stock: 15,
        location: 'Estante B-3'
      },
      {
        id: matIds[2],
        tenant_id: tenantId,
        sku: 'MAT-SCR-08',
        name: 'Tornillo Allen de Alta Resistencia Grado 8 3/8" x 2"',
        description: 'Sujetadores mecánicos de alta tracción y dureza.',
        descripcion: 'Sujetadores mecánicos de alta tracción y dureza.',
        category: 'Tornillería',
        stock_quantity: 1200,
        unit: 'pza',
        min_stock: 200,
        location: 'Gaveta C-12'
      },
      {
        id: matIds[3],
        tenant_id: tenantId,
        sku: 'MAT-LUB-01',
        name: 'Aceite Lubricante Industrial Mobil Vactra No. 2',
        description: 'Aceite deslizante premium para guías de tornos y centros de mecanizado.',
        descripcion: 'Aceite deslizante premium para guías de tornos y centros de mecanizado.',
        category: 'Químicos',
        stock_quantity: 15,
        unit: 'cubeta',
        min_stock: 3,
        location: 'Estante Químicos Q'
      }
    ];

    const { error: sumErr } = await supabase.from('suministros').insert(suministrosRows);
    if (sumErr) {
      console.log(`⚠️ Advertencia al inyectar suministros: ${sumErr.message}`);
    } else {
      console.log('✅ Tabla fallback "suministros" poblada.');
    }

    // --- SEED DE TARIFAS DE MANO DE OBRA ---
    console.log('💸 Configurando Tabulador de Tarifas Laborales (tarifas_mano_obra)...');
    await supabase.from('tarifas_mano_obra').delete().eq('activa', true);
    const rates = [
      {
        puesto: 'Operador CNC',
        nivel: 'Senior',
        tarifa_hora: 160,
        tarifa_real_hora: 195,
        factor_carga: 1.25,
        activa: true
      },
      {
        puesto: 'Soldador Especializado',
        nivel: 'Acreditado ASG',
        tarifa_hora: 150,
        tarifa_real_hora: 180,
        factor_carga: 1.20,
        activa: true
      },
      {
        puesto: 'Inspector de Calidad',
        nivel: 'Nivel II PND',
        tarifa_hora: 180,
        tarifa_real_hora: 220,
        factor_carga: 1.22,
        activa: true
      },
      {
        puesto: 'Ayudante General',
        nivel: 'Único',
        tarifa_hora: 90,
        tarifa_real_hora: 110,
        factor_carga: 1.20,
        activa: true
      }
    ];
    await supabase.from('tarifas_mano_obra').insert(rates);
    console.log('✅ Tabulador de tarifas inicializado.');

    // --- SEED DE VIAJEROS & COSTOS ---
    console.log('📊 Generando Órdenes y Viajeros de Costeo...');
    const ids = [
      'JOB-2026-001',
      'JOB-2026-002',
      'JOB-2026-003',
      'JOB-2026-004',
      'JOB-2026-005'
    ];

    // Limpiar anteriores
    await supabase.from('costos_ordenes').delete().in('viajero_id', ids);
    await supabase.from('viajeros').delete().in('id', ids);

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

    await supabase.from('viajeros').insert(viajeros);
    console.log('✅ Viajeros registrados.');

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
        mo_real: 4100,
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
        mat_real: 38500,
        mo_real: 15500,
        maq_real: 26000,
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
        mat_real: null,
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
        mat_real: 5100,
        mo_real: 2300,
        maq_real: 3100,
        overhead_real: 1550,
        precio_venta: 15500,
        estado: 'abierta',
        notas: 'Orden abierta en rectificado. Desviación inicial de costo de material por aumento de insumos.',
        data_source: 'seed'
      }
    ];

    await supabase.from('costos_ordenes').insert(costos);
    console.log('✅ Órdenes de costo vinculadas.');

    // --- SEED DE APROBACIONES PENDIENTES ---
    console.log('🔏 Insertando Flujo de Aprobaciones y Límites...');
    await supabase.from('aprobaciones').delete().eq('tenant_id', tenantId);

    const approvals = [
      {
        tenant_id: tenantId,
        modulo: 'costeo',
        registro_id: 'JOB-2026-003',
        registro_desc: 'Exceso de costos en Chasis Láser (JOB-2026-003). Varianza acumulada: +25%. Monto total real: $92,000.',
        estado: 'pendiente',
        monto: 18400,
        solicitado_en: new Date().toISOString()
      },
      {
        tenant_id: tenantId,
        modulo: 'compras',
        registro_id: 'REQ-2026-042',
        registro_desc: 'Requisición de barra de aluminio extrudido 6061 para cliente Tesla Inc.',
        estado: 'pendiente',
        monto: 8400,
        solicitado_en: new Date().toISOString()
      }
    ];
    await supabase.from('aprobaciones').insert(approvals);
    console.log('✅ Aprobaciones pendientes inyectadas.');

    // --- SEED DE RECLUTAMIENTO (VACANTES & CANDIDATOS) ---
    console.log('💼 Creando Bolsa de Trabajo y Reclutamiento (vacancies)...');
    
    // Primero borrar candidatos
    await supabase.from('candidates').delete().eq('tenant_id', tenantId);
    await supabase.from('vacancies').delete().eq('tenant_id', tenantId);

    const vacancyRes = await supabase.from('vacancies').insert({
      tenant_id: tenantId,
      title: 'Operador de Torno CNC Mazak',
      department: 'Producción / Mecanizado',
      status: 'open',
      requirements: 'Experiencia de 3 años programando en control Mazatrol, lectura de dibujos técnicos, manejo de vernier y micrómetro.',
      salary_range: '$18,000 - $22,000 MXN'
    }).select().single();

    if (vacancyRes.data) {
      console.log('   - Vacante de Torno CNC creada.');
      await supabase.from('candidates').insert([
        {
          tenant_id: tenantId,
          vacancy_id: vacancyRes.data.id,
          name: 'José Refugio Torres',
          email: 'jose.torres@gmail.com',
          phone: '811-492-3029',
          status: 'interview',
          resume_summary: 'Operador CNC con 4 años de experiencia en tornos Mazak y fresadoras Haas. Capacidad para configurar herramental de corte.'
        },
        {
          tenant_id: tenantId,
          vacancy_id: vacancyRes.data.id,
          name: 'Alejandro Ruiz Silva',
          email: 'ale.ruiz@hotmail.com',
          phone: '812-384-9102',
          status: 'applied',
          resume_summary: 'Técnico en máquinas y herramientas recién egresado con prácticas de 6 meses operando CNC de 3 ejes.'
        }
      ]);
      console.log('   - 2 Candidatos registrados.');
    }

    console.log('\n✨ ¡INYECCIÓN INTEGRAL COMPLETADA CON ÉXITO!');
    console.log('📊 Resumen de Módulos Poblados:');
    console.log('   🟢 5 Órdenes de Costeo Dinámico (McVill) con Semáforo.');
    console.log('   🟢 5 Empleados premium activos en RH.');
    console.log('   🟢 Registro de asistencia en vivo (Attendance Records) para hoy.');
    console.log('   🟢 2 Turnos de Trabajo asignados.');
    console.log('   🟢 4 Materiales de alta demanda en Almacén.');
    console.log('   🟢 4 Tarifas de Mano de Obra en tabulador.');
    console.log('   🟢 2 Autorizaciones críticas pendientes (Aprobación Costos + Compras).');
    console.log('   🟢 1 Vacante activa con 2 Candidatos para entrevista en vivo.');

  } catch (err) {
    console.error('❌ Error fatal durante la inyección de datos:', err.message || err);
  }
}

seedAllModules();
