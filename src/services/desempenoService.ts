import { supabase } from '../lib/supabase';

const TENANT = 'mcvill';

let _cachedTenant: string | null = null;
async function getTenant(): Promise<string> {
  if (_cachedTenant) return _cachedTenant;
  const { data } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
  _cachedTenant = data?.id ?? 'mcvill';
  return _cachedTenant;
}

export type TipoPeriodo = 'diario' | 'semanal' | 'mensual';
export type TipoIncentivo = 'productividad' | 'calidad' | 'seguridad' | 'puntualidad' | '5s' | 'especial';
export type Turno = 'matutino' | 'vespertino' | 'nocturno';

export interface Operador {
  id: string;
  nombre: string;
  numero_empleado?: string;
  celula?: string;
  turno?: Turno;
  puesto?: string;
  activo: boolean;
  tenant_id: string;
  created_at: string;
}

export interface DesempenoKPI {
  id: string;
  operador_id: string;
  periodo: string;         // ISO date string
  tipo_periodo: TipoPeriodo;
  piezas_meta?: number;
  piezas_real?: number;
  piezas_ok?: number;
  piezas_rechazo?: number;
  horas_trabajadas?: number;
  horas_paro?: number;
  incidentes: number;
  score_5s?: number;
  eficiencia?: number;
  tasa_calidad?: number;
  oee?: number;
  tenant_id: string;
  created_at: string;
  updated_at?: string;
}

export interface Incentivo {
  id: string;
  operador_id: string;
  periodo: string;
  tipo_incentivo: TipoIncentivo;
  descripcion?: string;
  monto: number;
  porcentaje_base?: number;
  aprobado: boolean;
  aprobado_por?: string;
  tenant_id: string;
  created_at: string;
}

export interface CelulaDesempeno {
  id: string;
  celula: string;
  periodo: string;
  tipo_periodo: TipoPeriodo;
  eficiencia_prom?: number;
  calidad_prom?: number;
  oee_prom?: number;
  bono_celula: number;
  tenant_id: string;
  created_at: string;
}

// ── Computed KPI helpers ──────────────────────────────────────────────────────
export function calcularKPIs(kpi: Partial<DesempenoKPI>): Partial<DesempenoKPI> {
  const { piezas_meta, piezas_real, piezas_ok, horas_trabajadas, horas_paro } = kpi;
  const eficiencia = piezas_meta && piezas_real ? parseFloat(((piezas_real / piezas_meta) * 100).toFixed(2)) : undefined;
  const tasa_calidad = piezas_real && piezas_ok ? parseFloat(((piezas_ok / piezas_real) * 100).toFixed(2)) : undefined;
  const disponibilidad = horas_trabajadas && horas_paro !== undefined
    ? (horas_trabajadas - horas_paro) / horas_trabajadas : undefined;
  const oee = eficiencia !== undefined && tasa_calidad !== undefined && disponibilidad !== undefined
    ? parseFloat((eficiencia / 100 * tasa_calidad / 100 * disponibilidad * 100).toFixed(2)) : undefined;
  return { ...kpi, eficiencia, tasa_calidad, oee };
}

export interface PolicyConfig {
  salarioBaseDefault?: number;
  productividadPctAlto?: number;
  productividadPctBajo?: number;
  calidadPct?: number;
  seguridadPct?: number;
  fiveSPct?: number;
}

export function calcularIncentivo(kpi: DesempenoKPI, salarioBase: number, policies?: PolicyConfig): Incentivo[] {
  const incentivos: Incentivo[] = [];
  const now = new Date().toISOString();

  // Map configured dynamic percentages or fall back to default specs
  const prodPctAlto = (policies?.productividadPctAlto ?? 10) / 100;
  const prodPctBajo = (policies?.productividadPctBajo ?? 5) / 100;
  const calPct = (policies?.calidadPct ?? 3) / 100;
  const segPct = (policies?.seguridadPct ?? 2) / 100;
  const f5sPct = (policies?.fiveSPct ?? 1) / 100;

  if ((kpi.eficiencia ?? 0) >= 100) {
    const pct = kpi.eficiencia! >= 110 ? prodPctAlto : prodPctBajo;
    incentivos.push({
      id: `inc-local-${Date.now()}-p`, operador_id: kpi.operador_id, periodo: kpi.periodo,
      tipo_incentivo: 'productividad',
      descripcion: `Eficiencia ${kpi.eficiencia?.toFixed(1)}% — bono ${(pct * 100).toFixed(0)}% salario`,
      monto: parseFloat((salarioBase * pct).toFixed(2)),
      porcentaje_base: pct * 100,
      aprobado: false, tenant_id: kpi.tenant_id || TENANT, created_at: now,
    });
  }
  if ((kpi.tasa_calidad ?? 0) >= 98) {
    incentivos.push({
      id: `inc-local-${Date.now()}-q`, operador_id: kpi.operador_id, periodo: kpi.periodo,
      tipo_incentivo: 'calidad',
      descripcion: `Calidad ${kpi.tasa_calidad?.toFixed(1)}% — bono ${(calPct * 100).toFixed(0)}% salario`,
      monto: parseFloat((salarioBase * calPct).toFixed(2)),
      porcentaje_base: calPct * 100,
      aprobado: false, tenant_id: kpi.tenant_id || TENANT, created_at: now,
    });
  }
  if (kpi.incidentes === 0) {
    incentivos.push({
      id: `inc-local-${Date.now()}-s`, operador_id: kpi.operador_id, periodo: kpi.periodo,
      tipo_incentivo: 'seguridad',
      descripcion: `Cero incidentes en el período — bono ${(segPct * 100).toFixed(0)}% salario`,
      monto: parseFloat((salarioBase * segPct).toFixed(2)),
      porcentaje_base: segPct * 100,
      aprobado: false, tenant_id: kpi.tenant_id || TENANT, created_at: now,
    });
  }
  if ((kpi.score_5s ?? 0) >= 90) {
    incentivos.push({
      id: `inc-local-${Date.now()}-5s`, operador_id: kpi.operador_id, periodo: kpi.periodo,
      tipo_incentivo: '5s',
      descripcion: `5S score ${kpi.score_5s}% — bono ${(f5sPct * 100).toFixed(0)}% salario`,
      monto: parseFloat((salarioBase * f5sPct).toFixed(2)),
      porcentaje_base: f5sPct * 100,
      aprobado: false, tenant_id: kpi.tenant_id || TENANT, created_at: now,
    });
  }
  return incentivos;
}

// ── Demo data ─────────────────────────────────────────────────────────────────
export const CELULAS = ['CORTE', 'SOLDADURA', 'MAQUINADO', 'ENSAMBLE', 'PINTURA'];

const DEMO_OPERADORES: Operador[] = [
  { id: 'op-001', nombre: 'Juan Martínez López', numero_empleado: 'EMP-001', celula: 'SOLDADURA', turno: 'matutino', puesto: 'Soldador Senior', activo: true, tenant_id: TENANT, created_at: '2024-01-15T08:00:00Z' },
  { id: 'op-002', nombre: 'Luis Ramírez García', numero_empleado: 'EMP-002', celula: 'CORTE', turno: 'matutino', puesto: 'Operador Láser', activo: true, tenant_id: TENANT, created_at: '2024-02-01T08:00:00Z' },
  { id: 'op-003', nombre: 'Pedro González Soto', numero_empleado: 'EMP-003', celula: 'MAQUINADO', turno: 'matutino', puesto: 'Maquinista CNC', activo: true, tenant_id: TENANT, created_at: '2024-03-10T08:00:00Z' },
  { id: 'op-004', nombre: 'Ana Flores Méndez', numero_empleado: 'EMP-004', celula: 'ENSAMBLE', turno: 'vespertino', puesto: 'Ensambladora', activo: true, tenant_id: TENANT, created_at: '2024-04-05T08:00:00Z' },
  { id: 'op-005', nombre: 'Carlos Torres Vega', numero_empleado: 'EMP-005', celula: 'PINTURA', turno: 'matutino', puesto: 'Aplicador Pintura', activo: true, tenant_id: TENANT, created_at: '2024-05-20T08:00:00Z' },
  { id: 'op-006', nombre: 'Rosa Jiménez Cruz', numero_empleado: 'EMP-006', celula: 'SOLDADURA', turno: 'vespertino', puesto: 'Soldador Junior', activo: true, tenant_id: TENANT, created_at: '2024-06-01T08:00:00Z' },
];

const THIS_WEEK = new Date(Date.now() - ((new Date().getDay() || 7) - 1) * 86400000).toISOString().split('T')[0];

const DEMO_KPIS: DesempenoKPI[] = DEMO_OPERADORES.map((op, i) => {
  const meta = [180, 250, 90, 320, 150, 160][i];
  const real = [192, 238, 95, 305, 162, 148][i];
  const ok   = [190, 235, 94, 300, 160, 142][i];
  return calcularKPIs({
    id: `kpi-${op.id}`, operador_id: op.id, periodo: THIS_WEEK, tipo_periodo: 'semanal' as TipoPeriodo,
    piezas_meta: meta, piezas_real: real, piezas_ok: ok, piezas_rechazo: real - ok,
    horas_trabajadas: 40, horas_paro: [1.5, 2, 0.5, 3, 1, 2.5][i],
    incidentes: [0, 0, 0, 1, 0, 0][i],
    score_5s: [95, 88, 92, 75, 90, 82][i],
    tenant_id: TENANT, created_at: new Date().toISOString(),
  }) as DesempenoKPI;
});

// ── Supabase CRUD ─────────────────────────────────────────────────────────────
export async function fetchOperadores(celula?: string): Promise<Operador[]> {
  const tenant = await getTenant();
  let q = supabase.from('operadores').select('*').eq('tenant_id', tenant).eq('activo', true).order('nombre');
  if (celula) q = q.eq('celula', celula);
  const { data, error } = await q;
  if (error || !data?.length) return celula ? DEMO_OPERADORES.filter(o => o.celula === celula) : DEMO_OPERADORES;
  return data as Operador[];
}

export async function fetchKPIs(periodo: string, tipoPeriodo: TipoPeriodo = 'semanal'): Promise<DesempenoKPI[]> {
  const tenant = await getTenant();
  const { data, error } = await supabase.from('desempeno_kpis').select('*')
    .eq('tenant_id', tenant).eq('periodo', periodo).eq('tipo_periodo', tipoPeriodo);
  if (error || !data?.length) return DEMO_KPIS;
  return data as DesempenoKPI[];
}

export async function fetchIncentivos(periodo?: string): Promise<Incentivo[]> {
  const tenant = await getTenant();
  let q = supabase.from('incentivos').select('*').eq('tenant_id', tenant).order('created_at', { ascending: false });
  if (periodo) q = q.eq('periodo', periodo);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as Incentivo[];
}

export async function upsertKPI(kpi: Omit<DesempenoKPI, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<DesempenoKPI> {
  const tenant = await getTenant();
  const computed = calcularKPIs(kpi);
  const row = { ...computed, tenant_id: tenant };
  const { data, error } = await supabase.from('desempeno_kpis').upsert(row, { onConflict: 'operador_id,periodo,tipo_periodo' }).select().single();
  if (error || !data) return { id: `kpi-local-${Date.now()}`, ...row, created_at: new Date().toISOString() } as DesempenoKPI;
  return data as DesempenoKPI;
}

export async function createIncentivo(input: Omit<Incentivo, 'id' | 'tenant_id' | 'created_at'>): Promise<Incentivo> {
  const tenant = await getTenant();
  const row = { ...input, tenant_id: tenant };
  const { data, error } = await supabase.from('incentivos').insert(row).select().single();
  if (error || !data) return { id: `inc-local-${Date.now()}`, ...row, created_at: new Date().toISOString() };
  return data as Incentivo;
}

export async function aprobarIncentivo(id: string, aprobado_por: string): Promise<void> {
  const tenant = await getTenant();
  await supabase.from('incentivos').update({ aprobado: true, aprobado_por }).eq('id', id).eq('tenant_id', tenant);
}

export async function fetchCelulaDesempeno(periodo: string): Promise<CelulaDesempeno[]> {
  const tenant = await getTenant();
  const { data, error } = await supabase.from('celulas_desempeno').select('*')
    .eq('tenant_id', tenant).eq('periodo', periodo).order('celula');
  if (error || !data?.length) {
    return CELULAS.map(celula => ({
      id: `cel-${celula}`, celula, periodo, tipo_periodo: 'semanal' as TipoPeriodo,
      eficiencia_prom: [106.7, 95.2, 105.6, 95.3, 108][CELULAS.indexOf(celula)],
      calidad_prom: [99.0, 98.7, 98.9, 98.4, 98.8][CELULAS.indexOf(celula)],
      oee_prom: [98.3, 91.5, 103.1, 90.1, 105.2][CELULAS.indexOf(celula)],
      bono_celula: [1200, 0, 1000, 0, 1400][CELULAS.indexOf(celula)],
      tenant_id: tenant, created_at: new Date().toISOString(),
    }));
  }
  return data as CelulaDesempeno[];
}

export const SALARIO_BASE_DEFAULT = 4500; // MXN semanal referencia McVill
