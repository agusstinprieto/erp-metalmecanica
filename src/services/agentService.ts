import { supabase } from '../lib/supabase';
import { tenantService } from './tenantService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToolName =
  // Producción
  | 'generar_viajero'
  | 'status_viajero'
  | 'cuellos_de_botella'
  | 'alerta_paro_produccion'
  | 'listar_ordenes_activas'
  | 'eficiencia_turno'
  | 'proximas_entregas'
  // Capital Humano
  | 'reporte_faltas_hoy'
  | 'kpis_operadores'
  | 'proximas_nominas'
  // Calidad
  | 'nc_abiertas'
  | 'crear_nc'
  // Inventario / Compras
  | 'stock_critico'
  | 'generar_orden_compra'
  // Ventas / Finanzas
  | 'pipeline_ventas'
  | 'estado_financiero'
  // Análisis IA
  | 'analizar_factibilidad'
  | 'buscar_documentos';

export interface ToolCall {
  tool: ToolName;
  args: Record<string, any>;
}

export interface ToolResultAction {
  label: string;
  navigateTo?: string;
  url?: string;
}

export interface ToolResult {
  tool: ToolName;
  title: string;
  status: 'ok' | 'warning' | 'danger' | 'info';
  summary: string;
  rows: { label: string; value: string | number; highlight?: boolean }[];
  actions?: ToolResultAction[];
}

// ── Parser ────────────────────────────────────────────────────────────────────

export function parseToolCall(response: string): ToolCall | null {
  const trimmed = response.trim();
  const jsonStr = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    : trimmed;
  if (!jsonStr.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.tool && typeof parsed.tool === 'string') return parsed as ToolCall;
    return null;
  } catch {
    return null;
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  try {
    switch (call.tool) {
      // Producción
      case 'generar_viajero':        return await toolGenerarViajero(call.args);
      case 'status_viajero':         return await toolStatusViajero(call.args);
      case 'cuellos_de_botella':     return await toolCuellosBottleneck();
      case 'alerta_paro_produccion': return await toolAlertaParo();
      case 'listar_ordenes_activas': return await toolListarOrdenes();
      case 'eficiencia_turno':       return await toolEficienciaTurno();
      case 'proximas_entregas':      return await toolProximasEntregas();
      // Capital Humano
      case 'reporte_faltas_hoy':     return await toolReporteFaltasHoy();
      case 'kpis_operadores':        return await toolKpisOperadores();
      case 'proximas_nominas':       return await toolProximasNominas();
      // Calidad
      case 'nc_abiertas':            return await toolNcAbiertas();
      case 'crear_nc':               return await toolCrearNC(call.args);
      // Inventario / Compras
      case 'stock_critico':          return await toolStockCritico();
      case 'generar_orden_compra':   return await toolGenerarOrdenCompra(call.args);
      // Ventas / Finanzas
      case 'pipeline_ventas':        return await toolPipelineVentas();
      case 'estado_financiero':      return await toolEstadoFinanciero();
      // Análisis IA
      case 'analizar_factibilidad':  return await toolFactibilidad(call.args);
      case 'buscar_documentos':      return await toolBuscarDocumentos(call.args);
      default:
        return errorResult(call.tool as ToolName, 'Herramienta no reconocida');
    }
  } catch (err: any) {
    return errorResult(call.tool, err?.message ?? 'Error inesperado');
  }
}

// ── PRODUCCIÓN ────────────────────────────────────────────────────────────────

async function toolGenerarViajero(args: Record<string, any>): Promise<ToolResult> {
  const num = String(args.numero_orden ?? args.orden ?? '').trim();
  if (!num) return errorResult('generar_viajero', 'Indica el número de orden o Job.');

  const { data: orders } = await supabase
    .from('work_orders')
    .select('id, order_number, status, progress, project_id')
    .ilike('order_number', `%${num}%`)
    .limit(3);

  const { data: projects } = await supabase.from('engineering_projects').select('id, title');

  if (!orders?.length) {
    return { tool: 'generar_viajero', title: `Viajero — Orden ${num}`, status: 'warning',
      summary: `No se encontró ninguna orden con el número "${num}".`, rows: [] };
  }

  const order = orders[0] as any;
  const { data: stages } = await supabase
    .from('manufacturing_stages')
    .select('name, status, notes')
    .eq('work_order_id', order.id)
    .order('id');

  const completedStages = (stages ?? []).filter((s: any) => s.status === 'completed').length;
  const totalStages = (stages ?? []).length;

  return {
    tool: 'generar_viajero',
    title: `Viajero — ${order.order_number}`,
    status: order.status === 'completed' ? 'ok' : 'info',
    summary: `Orden encontrada. ${completedStages}/${totalStages} etapas completadas.`,
    rows: [
      { label: 'Número de Orden', value: order.order_number },
      { label: 'Proyecto', value: projects?.find((p: any) => p.id === order.project_id)?.title ?? '—' },
      { label: 'Estado', value: order.status ?? '—' },
      { label: 'Progreso', value: `${order.progress ?? 0}%`, highlight: true },
      { label: 'Etapas', value: `${completedStages} / ${totalStages}` },
      ...((stages ?? []).map((s: any) => ({
        label: s.name,
        value: s.status === 'completed' ? '✅ Completada' : s.status === 'in_progress' ? '🔄 En Proceso' : '⏳ Pendiente',
        highlight: s.status === 'in_progress',
      }))),
    ],
    actions: [{ label: 'Ver en Producción', navigateTo: 'production' }],
  };
}

async function toolStatusViajero(args: Record<string, any>): Promise<ToolResult> {
  const num = String(args.numero_orden ?? args.orden ?? '').trim();
  if (!num) return errorResult('status_viajero', 'Indica el número de orden.');

  const { data: orders } = await supabase
    .from('work_orders')
    .select('id, order_number, status, progress, project_id')
    .ilike('order_number', `%${num}%`)
    .limit(1);

  const { data: projects } = await supabase.from('engineering_projects').select('id, title');

  if (!orders?.length) {
    return { tool: 'status_viajero', title: `Status — Orden ${num}`, status: 'warning',
      summary: `Orden "${num}" no encontrada en el sistema.`, rows: [] };
  }

  const order = orders[0] as any;
  const { data: stages } = await supabase
    .from('manufacturing_stages')
    .select('name, status, notes, updated_at')
    .eq('work_order_id', order.id)
    .order('id');

  const activeStage = (stages ?? []).find((s: any) => s.status === 'in_progress');
  const lastCompleted = [...(stages ?? [])].reverse().find((s: any) => s.status === 'completed');

  return {
    tool: 'status_viajero',
    title: `Status Producción — ${order.order_number}`,
    status: order.status === 'completed' ? 'ok' : activeStage ? 'info' : 'warning',
    summary: activeStage
      ? `Actualmente en etapa: ${activeStage.name}`
      : order.status === 'completed' ? 'Orden completada'
      : 'Sin etapa activa — verificar asignación',
    rows: [
      { label: 'Proyecto', value: projects?.find((p: any) => p.id === order.project_id)?.title ?? '—' },
      { label: 'Estado Global', value: order.status ?? '—' },
      { label: 'Progreso', value: `${order.progress ?? 0}%`, highlight: true },
      { label: 'Etapa Activa', value: activeStage?.name ?? 'Ninguna', highlight: !!activeStage },
      { label: 'Última Completada', value: lastCompleted?.name ?? 'Ninguna' },
      ...(activeStage?.notes ? [{ label: 'Notas', value: activeStage.notes }] : []),
    ],
    actions: [{ label: 'Ver en Producción', navigateTo: 'production' }],
  };
}

async function toolCuellosBottleneck(): Promise<ToolResult> {
  const { data: orders } = await supabase
    .from('work_orders')
    .select('id, order_number, status, progress, created_at')
    .in('status', ['in_progress', 'pending'])
    .order('created_at');

  const now = Date.now();
  const bottlenecks = (orders ?? [])
    .map((o: any) => {
      const daysOld = Math.floor((now - new Date(o.created_at).getTime()) / 86400000);
      return { ...o, daysOld, risk: daysOld > 14 && (o.progress ?? 0) < 50 };
    })
    .filter((o: any) => o.risk || o.daysOld > 7)
    .sort((a: any, b: any) => b.daysOld - a.daysOld)
    .slice(0, 8);

  const highRisk = bottlenecks.filter((o: any) => o.risk).length;

  return {
    tool: 'cuellos_de_botella',
    title: 'Análisis de Cuellos de Botella',
    status: highRisk > 2 ? 'danger' : highRisk > 0 ? 'warning' : 'ok',
    summary: `${bottlenecks.length} órdenes en riesgo. ${highRisk} con riesgo alto (>14 días y <50% progreso).`,
    rows: bottlenecks.length
      ? bottlenecks.map((o: any) => ({
          label: o.order_number,
          value: `${o.progress ?? 0}% — ${o.daysOld}d en proceso`,
          highlight: o.risk,
        }))
      : [{ label: 'Estado', value: '✅ Sin cuellos de botella detectados' }],
    actions: [{ label: 'Ver Producción', navigateTo: 'production' }],
  };
}

async function toolAlertaParo(): Promise<ToolResult> {
  const [inventoryRes, maintenanceRes, ordersRes] = await Promise.all([
    supabase.from('materiales').select('descripcion_mp, peso_mp, stock_minimo_mp').limit(50),
    supabase.from('maintenance_requests').select('id, title, priority, status')
      .in('status', ['pending', 'open']).eq('priority', 'critical').limit(5),
    supabase.from('work_orders').select('order_number, status, progress, created_at')
      .eq('status', 'in_progress').lt('progress', 30).limit(5),
  ]);

  const materials = (inventoryRes.data ?? []) as any[];
  const criticalMat = materials.filter(
    (m) => m.stock_minimo_mp && m.peso_mp !== null && m.peso_mp <= m.stock_minimo_mp * 1.2
  );
  const criticalMaint = (maintenanceRes.data ?? []) as any[];
  const slowOrders = (ordersRes.data ?? []) as any[];
  const totalRisk = criticalMat.length + criticalMaint.length + slowOrders.length;

  return {
    tool: 'alerta_paro_produccion',
    title: 'Alerta de Paro de Producción',
    status: totalRisk > 5 ? 'danger' : totalRisk > 2 ? 'warning' : 'ok',
    summary: `${criticalMat.length} materiales críticos, ${criticalMaint.length} mantenimientos urgentes, ${slowOrders.length} órdenes lentas.`,
    rows: [
      { label: '⚠️ Materiales Críticos', value: criticalMat.length, highlight: criticalMat.length > 0 },
      ...criticalMat.slice(0, 3).map((m) => ({ label: `  ${m.descripcion_mp}`, value: `${m.peso_mp} kg (mín ${m.stock_minimo_mp})` })),
      { label: '🔧 Mantenimientos Urgentes', value: criticalMaint.length, highlight: criticalMaint.length > 0 },
      ...criticalMaint.slice(0, 2).map((m: any) => ({ label: `  ${m.title ?? 'Sin título'}`, value: m.priority ?? '—' })),
      { label: '🐢 Órdenes con Progreso Bajo', value: slowOrders.length, highlight: slowOrders.length > 0 },
      ...slowOrders.slice(0, 2).map((o: any) => ({ label: `  ${o.order_number}`, value: `${o.progress ?? 0}%` })),
    ],
    actions: [
      { label: 'Ver Inventario', navigateTo: 'inventory' },
      { label: 'Ver Mantenimiento', navigateTo: 'maintenance' },
    ],
  };
}

async function toolListarOrdenes(): Promise<ToolResult> {
  const { data: orders } = await supabase
    .from('work_orders')
    .select('order_number, status, progress, created_at, project_id')
    .in('status', ['in_progress', 'pending'])
    .order('created_at', { ascending: false })
    .limit(12);

  const { data: projects } = await supabase.from('engineering_projects').select('id, title');

  const list = (orders ?? []) as any[];
  const inProgress = list.filter((o) => o.status === 'in_progress').length;
  const pending = list.filter((o) => o.status === 'pending').length;

  return {
    tool: 'listar_ordenes_activas',
    title: 'Órdenes de Trabajo Activas',
    status: list.length === 0 ? 'info' : 'ok',
    summary: `${list.length} órdenes activas: ${inProgress} en proceso, ${pending} pendientes.`,
    rows: list.length
      ? list.map((o: any) => ({
          label: o.order_number,
          value: `${o.status === 'in_progress' ? '🔄' : '⏳'} ${o.progress ?? 0}% — ${projects?.find((p: any) => p.id === o.project_id)?.title ?? '—'}`,
          highlight: o.status === 'in_progress',
        }))
      : [{ label: 'Estado', value: 'Sin órdenes activas en este momento' }],
    actions: [{ label: 'Ver Producción', navigateTo: 'production' }],
  };
}

async function toolEficienciaTurno(): Promise<ToolResult> {
  const today = new Date().toISOString().split('T')[0];

  const [attendanceRes, ordersRes] = await Promise.all([
    supabase.from('attendance_records')
      .select('status, check_in, check_out')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`),
    supabase.from('work_orders')
      .select('progress, status')
      .eq('status', 'in_progress'),
  ]);

  const attendance = (attendanceRes.data ?? []) as any[];
  const orders = (ordersRes.data ?? []) as any[];

  const present = attendance.filter((a) => a.status !== 'absent').length;
  const late = attendance.filter((a) => a.status === 'late').length;
  const avgProgress = orders.length
    ? Math.round(orders.reduce((acc: number, o: any) => acc + (o.progress ?? 0), 0) / orders.length)
    : 0;
  const asistencia = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

  // Approximate OEE: availability × performance × quality (simplified)
  const oeeApprox = Math.round(asistencia * 0.85 * (avgProgress / 100) * 100) / 100;

  return {
    tool: 'eficiencia_turno',
    title: `Eficiencia del Turno — ${new Date().toLocaleDateString('es-MX', { weekday: 'long' })}`,
    status: asistencia >= 90 && avgProgress >= 60 ? 'ok' : asistencia >= 75 ? 'warning' : 'danger',
    summary: `Asistencia: ${asistencia}%. Progreso promedio de órdenes activas: ${avgProgress}%.`,
    rows: [
      { label: 'Operadores Presentes', value: present, highlight: true },
      { label: 'Tardanzas', value: late, highlight: late > 0 },
      { label: 'Asistencia %', value: `${asistencia}%`, highlight: asistencia < 85 },
      { label: 'Órdenes Activas', value: orders.length },
      { label: 'Progreso Promedio', value: `${avgProgress}%`, highlight: avgProgress < 50 },
      { label: 'OEE Estimado', value: `${oeeApprox}%`, highlight: oeeApprox < 70 },
    ],
    actions: [
      { label: 'Ver Asistencia', navigateTo: 'attendance' },
      { label: 'Ver Producción', navigateTo: 'production' },
    ],
  };
}

async function toolProximasEntregas(): Promise<ToolResult> {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Try delivery_date first, fall back to due_date
  const { data: orders } = await supabase
    .from('work_orders')
    .select('order_number, status, progress, delivery_date, due_date, project_id')
    .in('status', ['in_progress', 'pending'])
    .order('created_at')
    .limit(20);

  const { data: projects } = await supabase.from('engineering_projects').select('id, title');

  const list = (orders ?? []) as any[];
  const withDate = list.filter((o) => o.delivery_date || o.due_date);
  const upcoming = withDate
    .map((o) => {
      const date = new Date(o.delivery_date || o.due_date);
      const daysLeft = Math.ceil((date.getTime() - now.getTime()) / 86400000);
      return { ...o, date, daysLeft };
    })
    .filter((o) => o.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // If no date fields found, show orders by creation date as approximation
  const displayList = upcoming.length > 0 ? upcoming : list.slice(0, 8).map((o: any) => ({
    ...o,
    daysLeft: null,
    date: null,
  }));

  const atRisk = upcoming.filter((o) => o.daysLeft <= 3 && (o.progress ?? 0) < 70).length;

  return {
    tool: 'proximas_entregas',
    title: 'Próximas Entregas (7 días)',
    status: atRisk > 0 ? 'danger' : upcoming.length > 0 ? 'warning' : 'ok',
    summary: upcoming.length > 0
      ? `${upcoming.length} entregas en los próximos 7 días. ${atRisk} en riesgo de atraso.`
      : 'No hay fechas de entrega registradas en las órdenes activas.',
    rows: displayList.length
      ? displayList.map((o: any) => ({
          label: o.order_number,
          value: o.daysLeft !== null
            ? `${o.daysLeft}d restantes — ${o.progress ?? 0}% avance`
            : `${o.progress ?? 0}% — ${projects?.find((p: any) => p.id === o.project_id)?.title ?? '—'}`,
          highlight: o.daysLeft !== null && o.daysLeft <= 3,
        }))
      : [{ label: 'Estado', value: 'Sin órdenes próximas a vencer' }],
    actions: [{ label: 'Ver Producción', navigateTo: 'production' }],
  };
}

// ── CAPITAL HUMANO ────────────────────────────────────────────────────────────

async function toolReporteFaltasHoy(): Promise<ToolResult> {
  const today = new Date().toISOString().split('T')[0];

  const { data: records } = await supabase
    .from('attendance_records')
    .select('employee_id, status, check_in, check_out, employee_name')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, role').neq('role', 'ceo');

  const totalEmployees = profiles?.length ?? 0;
  const checkedIn = (records ?? []).filter((r: any) => r.status !== 'absent').length;
  const late = (records ?? []).filter((r: any) => r.status === 'late').length;
  const absent = totalEmployees - checkedIn;

  const lateNames = (records ?? [])
    .filter((r: any) => r.status === 'late')
    .map((r: any) => r.employee_name ?? r.employee_id)
    .slice(0, 5).join(', ');

  return {
    tool: 'reporte_faltas_hoy',
    title: `Asistencia — ${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    status: absent > 3 || late > 5 ? 'warning' : 'ok',
    summary: `${checkedIn} presentes de ${totalEmployees} empleados. ${absent} ausencias, ${late} tardanzas.`,
    rows: [
      { label: 'Total Empleados', value: totalEmployees },
      { label: 'Presentes', value: checkedIn, highlight: true },
      { label: 'Ausentes', value: absent, highlight: absent > 0 },
      { label: 'Tardanzas', value: late, highlight: late > 0 },
      ...(lateNames ? [{ label: 'Con Tardanza', value: lateNames }] : []),
    ],
    actions: [{ label: 'Ver Asistencia', navigateTo: 'attendance' }],
  };
}

async function toolKpisOperadores(): Promise<ToolResult> {
  const { data: kpis } = await supabase
    .from('desempeno_kpis')
    .select('operador_id, eficiencia, calidad, asistencia, oee, periodo')
    .order('eficiencia', { ascending: false })
    .limit(10);

  const { data: operadores } = await supabase
    .from('operadores')
    .select('id, nombre, area, turno');

  const list = (kpis ?? []) as any[];
  const avgEficiencia = list.length
    ? Math.round(list.reduce((acc, k) => acc + (k.eficiencia ?? 0), 0) / list.length)
    : 0;

  return {
    tool: 'kpis_operadores',
    title: 'KPIs de Operadores — Turno Actual',
    status: avgEficiencia >= 85 ? 'ok' : avgEficiencia >= 70 ? 'warning' : 'danger',
    summary: `${list.length} operadores evaluados. Eficiencia promedio: ${avgEficiencia}%.`,
    rows: list.length
      ? list.map((k: any) => {
          const op = operadores?.find((o: any) => o.id === k.operador_id);
          return {
            label: op?.nombre ?? `Operador ${k.operador_id?.slice(0, 8) ?? '—'}`,
            value: `Ef: ${k.eficiencia ?? 0}% | Cal: ${k.calidad ?? 0}% | OEE: ${k.oee ?? 0}%`,
            highlight: (k.eficiencia ?? 0) >= 90,
          };
        })
      : [{ label: 'Estado', value: 'No hay KPIs registrados para el período actual' }],
    actions: [{ label: 'Ver Desempeño', navigateTo: 'desempeno' }],
  };
}

async function toolProximasNominas(): Promise<ToolResult> {
  const { data: nominas } = await supabase
    .from('nominas')
    .select('id, periodo_inicio, periodo_fin, status, total_neto, created_at')
    .in('status', ['borrador', 'pendiente', 'en_proceso'])
    .order('periodo_fin', { ascending: true })
    .limit(5);

  const { data: allNominas } = await supabase
    .from('nominas')
    .select('id, status')
    .limit(20);

  const pending = (nominas ?? []) as any[];
  const today = new Date();

  return {
    tool: 'proximas_nominas',
    title: 'Nóminas Pendientes',
    status: pending.length > 0 ? 'warning' : 'ok',
    summary: pending.length > 0
      ? `${pending.length} nómina(s) pendiente(s) de procesar.`
      : 'No hay nóminas pendientes de procesar.',
    rows: pending.length
      ? pending.map((n: any) => {
          const fin = new Date(n.periodo_fin);
          const daysLeft = Math.ceil((fin.getTime() - today.getTime()) / 86400000);
          return {
            label: `Nómina ${n.periodo_inicio?.slice(0, 10) ?? '—'} al ${n.periodo_fin?.slice(0, 10) ?? '—'}`,
            value: `${n.status} — $${(n.total_neto ?? 0).toLocaleString('es-MX')} — ${daysLeft > 0 ? `${daysLeft}d restantes` : 'VENCIDA'}`,
            highlight: daysLeft <= 2 || daysLeft < 0,
          };
        })
      : [{ label: 'Estado', value: `Total nóminas registradas: ${allNominas?.length ?? 0}` }],
    actions: [{ label: 'Ver Nómina', navigateTo: 'payroll' }],
  };
}

// ── CALIDAD ───────────────────────────────────────────────────────────────────

async function toolNcAbiertas(): Promise<ToolResult> {
  const { data: ncs } = await supabase
    .from('no_conformidades')
    .select('numero, tipo, severidad, status, descripcion, area, created_at')
    .in('status', ['abierta', 'en_proceso'])
    .order('created_at', { ascending: false })
    .limit(10);

  const list = (ncs ?? []) as any[];
  const criticas = list.filter((nc) => nc.severidad === 'critica').length;
  const mayores = list.filter((nc) => nc.severidad === 'mayor').length;

  return {
    tool: 'nc_abiertas',
    title: 'No Conformidades Abiertas',
    status: criticas > 0 ? 'danger' : mayores > 0 ? 'warning' : list.length > 0 ? 'info' : 'ok',
    summary: `${list.length} NCs abiertas: ${criticas} críticas, ${mayores} mayores.`,
    rows: list.length
      ? list.map((nc: any) => ({
          label: nc.numero ?? 'NC sin número',
          value: `[${nc.severidad?.toUpperCase() ?? '—'}] ${nc.area ?? '—'} — ${(nc.descripcion ?? '').slice(0, 50)}`,
          highlight: nc.severidad === 'critica',
        }))
      : [{ label: 'Estado', value: '✅ Sin No Conformidades abiertas' }],
    actions: [{ label: 'Ver Calidad', navigateTo: 'quality' }],
  };
}

async function toolCrearNC(args: Record<string, any>): Promise<ToolResult> {
  const descripcion = String(args.descripcion ?? '').trim();
  if (!descripcion) return errorResult('crear_nc', 'Proporciona una descripción de la No Conformidad.');

  const numero = `NC-AGENTE-${Date.now()}`;
  const { data: nc, error } = await supabase
    .from('no_conformidades')
    .insert({
      numero,
      tipo: args.tipo ?? 'proceso',
      descripcion,
      area: args.area ?? 'General',
      severidad: args.severidad ?? 'menor',
      status: 'abierta',
      origen: 'agente_ia',
      causa_raiz: args.causa_raiz ?? 'Por determinar',
      notas: `[Creada por Agente IA — ${new Date().toLocaleDateString('es-MX')}]`,
    })
    .select()
    .single();

  if (error) return errorResult('crear_nc', `Error al crear NC: ${error.message}`);

  return {
    tool: 'crear_nc',
    title: `NC Creada — ${numero}`,
    status: 'ok',
    summary: `No Conformidad ${numero} creada exitosamente en estado Abierta.`,
    rows: [
      { label: 'Número', value: numero, highlight: true },
      { label: 'Tipo', value: args.tipo ?? 'proceso' },
      { label: 'Área', value: args.area ?? 'General' },
      { label: 'Severidad', value: args.severidad ?? 'menor' },
      { label: 'Descripción', value: descripcion.slice(0, 80) },
    ],
    actions: [{ label: 'Ver en Calidad', navigateTo: 'quality' }],
  };
}

// ── INVENTARIO / COMPRAS ───────────────────────────────────────────────────────

async function toolStockCritico(): Promise<ToolResult> {
  const { data: materials } = await supabase
    .from('materiales')
    .select('descripcion_mp, peso_mp, stock_minimo_mp, unidad_mp, proveedor_mp')
    .limit(100);

  const list = (materials ?? []) as any[];
  const critical = list
    .filter((m) => m.stock_minimo_mp != null && m.peso_mp != null && m.peso_mp <= m.stock_minimo_mp)
    .sort((a, b) => {
      const ratioA = a.peso_mp / (a.stock_minimo_mp || 1);
      const ratioB = b.peso_mp / (b.stock_minimo_mp || 1);
      return ratioA - ratioB;
    });

  const urgent = critical.filter((m) => m.peso_mp <= 0).length;

  return {
    tool: 'stock_critico',
    title: 'Inventario Crítico — Acción Requerida',
    status: urgent > 0 ? 'danger' : critical.length > 0 ? 'warning' : 'ok',
    summary: `${critical.length} materiales bajo mínimo. ${urgent} sin stock (agotados).`,
    rows: critical.length
      ? critical.slice(0, 10).map((m: any) => ({
          label: m.descripcion_mp ?? 'Sin descripción',
          value: `${m.peso_mp} ${m.unidad_mp ?? 'kg'} (mín: ${m.stock_minimo_mp})`,
          highlight: m.peso_mp <= 0,
        }))
      : [{ label: 'Estado', value: '✅ Todos los materiales sobre el mínimo' }],
    actions: [{ label: 'Ver Inventario', navigateTo: 'inventory' }],
  };
}

async function toolGenerarOrdenCompra(args: Record<string, any>): Promise<ToolResult> {
  const material = String(args.material ?? '').trim();
  if (!material) return errorResult('generar_orden_compra', 'Indica el material a pedir.');

  const cantidad = Number(args.cantidad) || 1;
  const unidad = String(args.unidad ?? 'kg');
  const prioridad = String(args.prioridad ?? 'normal');

  const { data: oc, error } = await supabase
    .from('compras')
    .insert({
      material_descripcion: material,
      cantidad_solicitada: cantidad,
      unidad,
      prioridad,
      status: 'pendiente',
      solicitante: 'Agente IA',
      notas: `Generada automáticamente por Agente IA — ${new Date().toLocaleDateString('es-MX')}`,
    })
    .select()
    .single();

  if (error) {
    // compras table might not exist yet — report gracefully
    return {
      tool: 'generar_orden_compra',
      title: 'Orden de Compra Registrada',
      status: 'info',
      summary: `Solicitud de compra para "${material}" preparada. Registra en el módulo de Compras para procesar.`,
      rows: [
        { label: 'Material', value: material, highlight: true },
        { label: 'Cantidad', value: `${cantidad} ${unidad}` },
        { label: 'Prioridad', value: prioridad },
        { label: 'Nota', value: 'Confirma en el módulo de Compras para registrar formalmente.' },
      ],
      actions: [{ label: 'Ver Compras', navigateTo: 'compras' }],
    };
  }

  return {
    tool: 'generar_orden_compra',
    title: 'Orden de Compra Creada',
    status: 'ok',
    summary: `Solicitud de compra para "${material}" creada con éxito.`,
    rows: [
      { label: 'Material', value: material, highlight: true },
      { label: 'Cantidad', value: `${cantidad} ${unidad}` },
      { label: 'Prioridad', value: prioridad },
      { label: 'Status', value: 'Pendiente de aprobación' },
    ],
    actions: [{ label: 'Ver Compras', navigateTo: 'compras' }],
  };
}

// ── VENTAS / FINANZAS ─────────────────────────────────────────────────────────

async function toolPipelineVentas(): Promise<ToolResult> {
  const { data: cots } = await supabase
    .from('cotizaciones')
    .select('estado, precio_total, cliente_nombre, numero_cotizacion')
    .order('created_at', { ascending: false })
    .limit(50);

  const list = (cots ?? []) as any[];
  const byStatus: Record<string, { count: number; total: number }> = {};

  list.forEach((c: any) => {
    const s = c.estado ?? 'sin_estado';
    if (!byStatus[s]) byStatus[s] = { count: 0, total: 0 };
    byStatus[s].count++;
    byStatus[s].total += Number(c.precio_total ?? 0);
  });

  const totalPipeline = list.reduce((acc, c: any) => acc + Number(c.precio_total ?? 0), 0);
  const aprobadas = byStatus['aprobada']?.count ?? 0;

  const statusLabels: Record<string, string> = {
    borrador: '📝 Borrador',
    enviada: '📤 Enviada',
    aprobada: '✅ Aprobada',
    rechazada: '❌ Rechazada',
    convertida: '🏭 Convertida a Orden',
  };

  return {
    tool: 'pipeline_ventas',
    title: 'Pipeline de Ventas',
    status: aprobadas > 0 ? 'ok' : list.length > 0 ? 'info' : 'warning',
    summary: `${list.length} cotizaciones. Pipeline total: $${totalPipeline.toLocaleString('es-MX', { minimumFractionDigits: 0 })} MXN.`,
    rows: [
      { label: 'Total Pipeline', value: `$${totalPipeline.toLocaleString('es-MX')} MXN`, highlight: true },
      { label: 'Cotizaciones Totales', value: list.length },
      ...Object.entries(byStatus).map(([status, data]) => ({
        label: statusLabels[status] ?? status,
        value: `${data.count} — $${data.total.toLocaleString('es-MX')} MXN`,
        highlight: status === 'aprobada',
      })),
    ],
    actions: [{ label: 'Ver Ventas', navigateTo: 'ventas' }],
  };
}

async function toolEstadoFinanciero(): Promise<ToolResult> {
  const [cxcRes, cxpRes, txRes] = await Promise.all([
    supabase.from('cuentas_cobrar')
      .select('monto, status, vencimiento').limit(50),
    supabase.from('cuentas_pagar')
      .select('monto, status, vencimiento').limit(50),
    supabase.from('financial_transactions')
      .select('type, amount, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(50),
  ]);

  const cxc = (cxcRes.data ?? []) as any[];
  const cxp = (cxpRes.data ?? []) as any[];
  const txs = (txRes.data ?? []) as any[];

  const totalCxC = cxc.reduce((acc, c) => acc + Number(c.monto ?? 0), 0);
  const totalCxP = cxp.reduce((acc, c) => acc + Number(c.monto ?? 0), 0);
  const vencidasCxC = cxc.filter((c) => c.vencimiento && new Date(c.vencimiento) < new Date()).length;

  const ingresos30d = txs.filter((t) => t.type === 'ingreso').reduce((acc, t) => acc + Number(t.amount ?? 0), 0);
  const egresos30d = txs.filter((t) => t.type === 'egreso').reduce((acc, t) => acc + Number(t.amount ?? 0), 0);
  const flujo = ingresos30d - egresos30d;

  return {
    tool: 'estado_financiero',
    title: 'Estado Financiero Ejecutivo',
    status: flujo >= 0 && vencidasCxC === 0 ? 'ok' : flujo < 0 ? 'danger' : 'warning',
    summary: `Flujo 30d: $${flujo.toLocaleString('es-MX')} MXN. CxC: $${totalCxC.toLocaleString('es-MX')} | CxP: $${totalCxP.toLocaleString('es-MX')}.`,
    rows: [
      { label: 'Cuentas por Cobrar', value: `$${totalCxC.toLocaleString('es-MX')} MXN`, highlight: totalCxC > 0 },
      { label: '  Vencidas', value: vencidasCxC, highlight: vencidasCxC > 0 },
      { label: 'Cuentas por Pagar', value: `$${totalCxP.toLocaleString('es-MX')} MXN` },
      { label: 'Ingresos (30d)', value: `$${ingresos30d.toLocaleString('es-MX')} MXN` },
      { label: 'Egresos (30d)', value: `$${egresos30d.toLocaleString('es-MX')} MXN` },
      { label: 'Flujo Neto (30d)', value: `$${flujo.toLocaleString('es-MX')} MXN`, highlight: flujo < 0 },
    ],
    actions: [{ label: 'Ver Finanzas', navigateTo: 'finance' }],
  };
}

// ── ANÁLISIS IA ───────────────────────────────────────────────────────────────

async function toolFactibilidad(args: Record<string, any>): Promise<ToolResult> {
  const desc = String(args.descripcion ?? args.proyecto ?? '').trim();
  const cliente = String(args.cliente ?? '').trim();
  if (!desc) return errorResult('analizar_factibilidad', 'Describe el proyecto a analizar.');

  const { analyzeRFQ } = await import('./factibilidadIAService');
  const rfq = {
    id: `agent-${Date.now()}`,
    cliente: cliente || 'Por definir',
    descripcion: desc,
    cantidad: 1,
    fecha: new Date().toISOString().split('T')[0],
  } as any;

  const analisis = await analyzeRFQ(rfq);
  const score = analisis.puntuacion_factibilidad ?? 0;
  const status: ToolResult['status'] = score >= 70 ? 'ok' : score >= 45 ? 'warning' : 'danger';

  return {
    tool: 'analizar_factibilidad',
    title: `Factibilidad — ${cliente || 'Nuevo Proyecto'}`,
    status,
    summary: `Puntuación: ${score}/100. ${analisis.decision ?? ''}`,
    rows: [
      { label: 'Puntuación', value: `${score} / 100`, highlight: true },
      { label: 'Decisión', value: analisis.decision ?? '—' },
      { label: 'Tiempo Estimado', value: analisis.tiempo_entrega_dias ? `${analisis.tiempo_entrega_dias} días` : '—' },
      { label: 'Riesgos', value: (analisis.riesgos ?? []).join('; ') || 'Sin riesgos identificados' },
      { label: 'Recomendación', value: analisis.recomendacion ?? '—' },
    ],
    actions: [{ label: 'Ver Factibilidades', navigateTo: 'factibilidad_ia' }],
  };
}

async function toolBuscarDocumentos(args: Record<string, any>): Promise<ToolResult> {
  const query = String(args.query ?? args.busqueda ?? '').trim();
  if (!query) return errorResult('buscar_documentos', 'Proporciona el texto a buscar en los documentos.');

  try {
    const config = await tenantService.getConfig();
    const apiKey = config.gemini_api_key?.trim();
    if (!apiKey) return errorResult('buscar_documentos', 'API Key de Gemini no configurada.');

    // Generate query embedding
    const embedRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: query }] },
          taskType: 'RETRIEVAL_QUERY',
        }),
      }
    );

    if (!embedRes.ok) return errorResult('buscar_documentos', 'Error al generar embedding de búsqueda.');
    const embedData = await embedRes.json();
    const embedding = embedData.embedding?.values ?? [];

    if (!embedding.length) return errorResult('buscar_documentos', 'No se pudo generar el embedding.');

    // Get tenant_id
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id ?? '').single();

    const { data: chunks, error } = await supabase.rpc('buscar_documentos_rag', {
      query_embedding: `[${embedding.join(',')}]`,
      p_tenant_id: profile?.tenant_id,
      match_count: 4,
      similarity_min: 0.4,
    });

    if (error || !chunks?.length) {
      return {
        tool: 'buscar_documentos',
        title: `Búsqueda: "${query}"`,
        status: 'info',
        summary: 'No se encontraron documentos relevantes para esta búsqueda.',
        rows: [{ label: 'Sugerencia', value: 'Indexa más documentos en el módulo de Memoria Corporativa RAG.' }],
      };
    }

    return {
      tool: 'buscar_documentos',
      title: `Resultados: "${query.slice(0, 40)}"`,
      status: 'ok',
      summary: `${chunks.length} fragmentos relevantes encontrados en la memoria corporativa.`,
      rows: chunks.slice(0, 5).map((c: any) => ({
        label: c.titulo ?? 'Documento',
        value: (c.contenido ?? '').slice(0, 120) + '…',
        highlight: (c.similarity ?? 0) > 0.7,
      })),
      actions: [{ label: 'Ver Documentos RAG', navigateTo: 'help' }],
    };
  } catch (err: any) {
    return errorResult('buscar_documentos', err?.message ?? 'Error en búsqueda RAG');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorResult(tool: ToolName, message: string): ToolResult {
  return { tool, title: 'Error de Herramienta', status: 'danger', summary: message, rows: [] };
}

// ── System Prompt ─────────────────────────────────────────────────────────────

export const AGENT_SYSTEM_PROMPT = `
MODO AGENTE DE ACCIÓN — MCVILL ERP v2.5:
Cuando el usuario solicite una ACCIÓN DIRECTA del sistema, responde ÚNICAMENTE con JSON puro sin texto adicional:
{"tool": "nombre_herramienta", "args": {}}

HERRAMIENTAS DISPONIBLES (19 total):

PRODUCCIÓN:
- "generar_viajero": Viajero y etapas de una orden. args: {"numero_orden": "<número>"}
- "status_viajero": Etapa actual de producción de una orden. args: {"numero_orden": "<número>"}
- "listar_ordenes_activas": Todas las OTs abiertas con estado y avance. args: {}
- "eficiencia_turno": OEE, asistencia y progreso del turno actual. args: {}
- "proximas_entregas": Órdenes con entrega en los próximos 7 días. args: {}
- "cuellos_de_botella": Órdenes atascadas o retrasadas. args: {}
- "alerta_paro_produccion": Riesgo de paro: inventario + mantenimiento + órdenes lentas. args: {}

CAPITAL HUMANO:
- "reporte_faltas_hoy": Asistencia del día: presentes, ausentes, tardanzas. args: {}
- "kpis_operadores": Ranking de eficiencia de operadores. args: {}
- "proximas_nominas": Nóminas pendientes de procesar. args: {}

CALIDAD:
- "nc_abiertas": No Conformidades abiertas y su severidad. args: {}
- "crear_nc": Crea una NC directamente. args: {"descripcion": "<texto>", "area": "<área>", "severidad": "menor|mayor|critica", "tipo": "proceso|producto|seguridad"}

INVENTARIO / COMPRAS:
- "stock_critico": Materiales bajo el nivel mínimo de seguridad. args: {}
- "generar_orden_compra": Crea solicitud de compra. args: {"material": "<nombre>", "cantidad": <número>, "unidad": "<kg|pzas|etc>", "prioridad": "urgente|normal|baja"}

VENTAS / FINANZAS:
- "pipeline_ventas": Pipeline de cotizaciones por etapa y valor total. args: {}
- "estado_financiero": CxC, CxP, flujo de caja de los últimos 30 días. args: {}

ANÁLISIS IA:
- "analizar_factibilidad": Evalúa si un proyecto es viable. args: {"descripcion": "<proyecto>", "cliente": "<nombre>"}
- "buscar_documentos": Busca en la memoria corporativa RAG. args: {"query": "<texto a buscar>"}

REGLA: Si el mensaje es una PREGUNTA informativa → responde en texto normal.
Si detectas una INTENCIÓN DE ACCIÓN → responde SOLO con el JSON.

Ejemplos:
- "genera el viajero del Job 4012" → {"tool":"generar_viajero","args":{"numero_orden":"4012"}}
- "¿cuántas faltas hoy?" → {"tool":"reporte_faltas_hoy","args":{}}
- "¿hay riesgo de paro?" → {"tool":"alerta_paro_produccion","args":{}}
- "crea una NC de soldadura deficiente en área de armado" → {"tool":"crear_nc","args":{"descripcion":"Soldadura deficiente","area":"Armado","severidad":"mayor","tipo":"proceso"}}
- "¿cuánto vale el pipeline de ventas?" → {"tool":"pipeline_ventas","args":{}}
- "busca en documentos el procedimiento de pintura" → {"tool":"buscar_documentos","args":{"query":"procedimiento de pintura"}}
- "pide 500 kg de acero A36" → {"tool":"generar_orden_compra","args":{"material":"Acero A36","cantidad":500,"unidad":"kg","prioridad":"normal"}}
`;
