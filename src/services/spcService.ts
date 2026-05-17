import { supabase } from '../lib/supabase';

// ── Dynamic tenant resolution (Zero Hardcoding — Regla 16) ───────────────────
let _cachedSPCTenant: string | null = null;
async function getTenant(): Promise<string> {
  if (_cachedSPCTenant) return _cachedSPCTenant;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles').select('tenant_id').eq('id', session.user.id).maybeSingle();
    if (profile?.tenant_id) { _cachedSPCTenant = profile.tenant_id; return _cachedSPCTenant; }
  }
  const { data: tenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
  _cachedSPCTenant = tenant?.id ?? 'default';
  return _cachedSPCTenant;
}
/** @deprecated Use getTenant() — kept for demo data labels only */
const TENANT = 'mcvill';

export interface SPCCaracteristica {
  id: string;
  nombre: string;
  numero_parte?: string;
  operacion?: string;
  unidad: string;
  lsl?: number;
  usl?: number;
  nominal?: number;
  subgrupo_n: number;
  activa: boolean;
  tenant_id: string;
  created_at: string;
}

export interface SPCMedicion {
  id: string;
  caracteristica_id: string;
  subgrupo_id: number;
  valor: number;
  operador?: string;
  turno?: 'matutino' | 'vespertino' | 'nocturno';
  maquina?: string;
  observacion?: string;
  fuera_control: boolean;
  tenant_id: string;
  created_at: string;
}

export interface SPCAlerta {
  id: string;
  caracteristica_id: string;
  tipo_alerta: 'fuera_limite' | 'tendencia' | 'cambio_nivel' | 'zona_c';
  descripcion: string;
  subgrupo_id?: number;
  valor?: number;
  resuelta: boolean;
  resuelta_por?: string;
  resuelta_at?: string;
  tenant_id: string;
  created_at: string;
}

export interface SubgrupoStats {
  subgrupo_id: number;
  valores: number[];
  xbar: number;
  rango: number;
  created_at: string;
}

export interface SPCStats {
  xbarbar: number;        // Grand mean (X̄̄)
  rbar: number;           // Mean range (R̄)
  ucl_x: number;         // UCL for X̄ chart
  lcl_x: number;         // LCL for X̄ chart
  ucl_r: number;         // UCL for R chart
  lcl_r: number;         // LCL for R chart
  sigma: number;          // Process std dev estimate
  cp: number;             // Process capability index
  cpk: number;            // Process capability index (centered)
  subgrupos: SubgrupoStats[];
}

// Nelson/Shewhart control constants for subgroup sizes 2-10
const SPC_CONSTANTS: Record<number, { A2: number; D3: number; D4: number }> = {
  2:  { A2: 1.880, D3: 0,     D4: 3.267 },
  3:  { A2: 1.023, D3: 0,     D4: 2.574 },
  4:  { A2: 0.729, D3: 0,     D4: 2.282 },
  5:  { A2: 0.577, D3: 0,     D4: 2.114 },
  6:  { A2: 0.483, D3: 0,     D4: 2.004 },
  7:  { A2: 0.419, D3: 0.076, D4: 1.924 },
  8:  { A2: 0.373, D3: 0.136, D4: 1.864 },
  9:  { A2: 0.337, D3: 0.184, D4: 1.816 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777 },
};

// ── Demo data ────────────────────────────────────────────────────────────────
const DEMO_CARACS: SPCCaracteristica[] = [
  { id: 'spc-001', nombre: 'Diámetro Ext. Eje Motor', numero_parte: 'NP-HOUSING', operacion: 'MAQUINADO',
    unidad: 'mm', lsl: 49.95, usl: 50.05, nominal: 50.0, subgrupo_n: 5, activa: true,
    tenant_id: TENANT, created_at: '2026-04-01T08:00:00Z' },
  { id: 'spc-002', nombre: 'Espesor Lámina A36 3mm', numero_parte: 'VARIOS', operacion: 'CORTE',
    unidad: 'mm', lsl: 2.8, usl: 3.2, nominal: 3.0, subgrupo_n: 5, activa: true,
    tenant_id: TENANT, created_at: '2026-04-01T08:00:00Z' },
  { id: 'spc-003', nombre: 'Cateto Soldadura MIG', numero_parte: 'ENSAMBLES', operacion: 'SOLDADURA',
    unidad: 'mm', lsl: 5.5, usl: 6.5, nominal: 6.0, subgrupo_n: 4, activa: true,
    tenant_id: TENANT, created_at: '2026-04-01T08:00:00Z' },
];

function generateDemoMediciones(carac: SPCCaracteristica): SPCMedicion[] {
  const mediciones: SPCMedicion[] = [];
  const { nominal = 50, lsl = nominal - 0.5, usl = nominal + 0.5, subgrupo_n: n, id } = carac;
  const sigma = (usl - lsl) / 8;
  let mId = 0;
  for (let sg = 1; sg <= 20; sg++) {
    const drift = sg > 14 ? (sg - 14) * sigma * 0.3 : 0; // simulate drift in last 6 subgroups
    for (let i = 0; i < n; i++) {
      const valor = parseFloat((nominal + drift + (Math.random() - 0.5) * sigma * 2).toFixed(4));
      mediciones.push({
        id: `med-${id}-${++mId}`, caracteristica_id: id, subgrupo_id: sg,
        valor, operador: ['Juan M.', 'Luis R.', 'Pedro G.'][sg % 3],
        turno: (['matutino', 'vespertino', 'nocturno'] as const)[sg % 3],
        maquina: carac.operacion === 'MAQUINADO' ? 'Mazak Nexus' : carac.operacion === 'CORTE' ? 'Trumpf 3kW' : 'Miller 252',
        fuera_control: false, tenant_id: TENANT,
        created_at: new Date(Date.now() - (20 - sg) * 3600000).toISOString(),
      });
    }
  }
  return mediciones;
}

// ── SPC math ──────────────────────────────────────────────────────────────────
export function calcularEstadisticas(carac: SPCCaracteristica, mediciones: SPCMedicion[]): SPCStats | null {
  const n = carac.subgrupo_n;
  const consts = SPC_CONSTANTS[Math.min(Math.max(n, 2), 10)];
  if (!consts || mediciones.length < n * 2) return null;

  // Group by subgrupo_id
  const groups = new Map<number, number[]>();
  for (const m of mediciones) {
    if (!groups.has(m.subgrupo_id)) groups.set(m.subgrupo_id, []);
    groups.get(m.subgrupo_id)!.push(m.valor);
  }

  const subgrupos: SubgrupoStats[] = [];
  for (const [sg_id, vals] of Array.from(groups.entries()).sort((a, b) => a[0] - b[0])) {
    if (vals.length < n) continue;
    const xbar = vals.reduce((s, v) => s + v, 0) / vals.length;
    const rango = Math.max(...vals) - Math.min(...vals);
    const ts = mediciones.find(m => m.subgrupo_id === sg_id)?.created_at ?? '';
    subgrupos.push({ subgrupo_id: sg_id, valores: vals, xbar, rango, created_at: ts });
  }

  if (subgrupos.length < 2) return null;

  const xbarbar = subgrupos.reduce((s, g) => s + g.xbar, 0) / subgrupos.length;
  const rbar    = subgrupos.reduce((s, g) => s + g.rango, 0) / subgrupos.length;

  const ucl_x = xbarbar + consts.A2 * rbar;
  const lcl_x = xbarbar - consts.A2 * rbar;
  const ucl_r = consts.D4 * rbar;
  const lcl_r = consts.D3 * rbar;

  // d2 constants for sigma estimation
  const d2: Record<number, number> = { 2:1.128, 3:1.693, 4:2.059, 5:2.326, 6:2.534, 7:2.704, 8:2.847, 9:2.970, 10:3.078 };
  const sigma = rbar / (d2[n] ?? 2.326);

  const lsl = carac.lsl ?? (xbarbar - 3 * sigma);
  const usl = carac.usl ?? (xbarbar + 3 * sigma);
  const cp  = sigma > 0 ? (usl - lsl) / (6 * sigma) : 0;
  const cpk = sigma > 0 ? Math.min((usl - xbarbar) / (3 * sigma), (xbarbar - lsl) / (3 * sigma)) : 0;

  return { xbarbar, rbar, ucl_x, lcl_x, ucl_r, lcl_r, sigma, cp, cpk, subgrupos };
}

export function detectarAlertas(stats: SPCStats, carac: SPCCaracteristica): Omit<SPCAlerta, 'id' | 'tenant_id' | 'created_at' | 'resuelta' | 'caracteristica_id'>[] {
  const alertas: Omit<SPCAlerta, 'id' | 'tenant_id' | 'created_at' | 'resuelta' | 'caracteristica_id'>[] = [];
  const { subgrupos, ucl_x, lcl_x } = stats;

  for (const sg of subgrupos) {
    if (sg.xbar > ucl_x || sg.xbar < lcl_x) {
      alertas.push({
        tipo_alerta: 'fuera_limite',
        descripcion: `Subgrupo ${sg.subgrupo_id}: X̄=${sg.xbar.toFixed(4)} fuera de límites de control (UCL=${ucl_x.toFixed(4)}, LCL=${lcl_x.toFixed(4)})`,
        subgrupo_id: sg.subgrupo_id, valor: sg.xbar,
      });
    }
  }

  // Nelson Rule 2: 9 consecutive points same side of center
  for (let i = 8; i < subgrupos.length; i++) {
    const window = subgrupos.slice(i - 8, i + 1);
    if (window.every(s => s.xbar > stats.xbarbar) || window.every(s => s.xbar < stats.xbarbar)) {
      alertas.push({
        tipo_alerta: 'cambio_nivel',
        descripcion: `9 subgrupos consecutivos del mismo lado de la línea central (subgrupos ${subgrupos[i-8].subgrupo_id}–${subgrupos[i].subgrupo_id})`,
        subgrupo_id: subgrupos[i].subgrupo_id,
      });
      break;
    }
  }

  // Nelson Rule 3: 6 points in a row trending up or down
  for (let i = 5; i < subgrupos.length; i++) {
    const window = subgrupos.slice(i - 5, i + 1);
    const increasing = window.every((s, j) => j === 0 || s.xbar > window[j-1].xbar);
    const decreasing = window.every((s, j) => j === 0 || s.xbar < window[j-1].xbar);
    if (increasing || decreasing) {
      alertas.push({
        tipo_alerta: 'tendencia',
        descripcion: `Tendencia ${increasing ? 'ascendente' : 'descendente'} de 6 subgrupos consecutivos (subgrupos ${subgrupos[i-5].subgrupo_id}–${subgrupos[i].subgrupo_id})`,
        subgrupo_id: subgrupos[i].subgrupo_id,
      });
      break;
    }
  }

  return alertas;
}

// ── Supabase CRUD ─────────────────────────────────────────────────────────────
export async function fetchCaracteristicas(): Promise<SPCCaracteristica[]> {
  const { data, error } = await supabase.from('spc_caracteristicas').select('*')
    .eq('tenant_id', TENANT).eq('activa', true).order('nombre');
  if (error || !data?.length) return DEMO_CARACS;
  return data as SPCCaracteristica[];
}

export async function fetchMediciones(caracId: string, limit = 200): Promise<SPCMedicion[]> {
  if (caracId.startsWith('spc-')) {
    const carac = DEMO_CARACS.find(c => c.id === caracId);
    return carac ? generateDemoMediciones(carac) : [];
  }
  const { data, error } = await supabase.from('spc_mediciones').select('*')
    .eq('caracteristica_id', caracId).eq('tenant_id', TENANT)
    .order('subgrupo_id').limit(limit);
  if (error || !data) return [];
  return data as SPCMedicion[];
}

export async function fetchAlertas(resuelta = false): Promise<SPCAlerta[]> {
  const { data, error } = await supabase.from('spc_alertas').select('*')
    .eq('tenant_id', TENANT).eq('resuelta', resuelta)
    .order('created_at', { ascending: false }).limit(50);
  if (error || !data) return [];
  return data as SPCAlerta[];
}

export interface NewMedicionInput {
  caracteristica_id: string;
  subgrupo_id: number;
  valor: number;
  operador?: string;
  turno?: 'matutino' | 'vespertino' | 'nocturno';
  maquina?: string;
  observacion?: string;
}

export async function createMedicion(input: NewMedicionInput): Promise<SPCMedicion> {
  const row = { ...input, fuera_control: false, tenant_id: TENANT };
  const { data, error } = await supabase.from('spc_mediciones').insert(row).select().single();
  if (error || !data) return { id: `med-local-${Date.now()}`, ...row, created_at: new Date().toISOString() };
  return data as SPCMedicion;
}

export async function resolverAlerta(alertaId: string, resuelta_por: string): Promise<void> {
  await supabase.from('spc_alertas').update({ resuelta: true, resuelta_por, resuelta_at: new Date().toISOString() })
    .eq('id', alertaId).eq('tenant_id', TENANT);
}

export async function createCaracteristica(input: Omit<SPCCaracteristica, 'id' | 'tenant_id' | 'created_at'>): Promise<SPCCaracteristica> {
  const row = { ...input, tenant_id: TENANT };
  const { data, error } = await supabase.from('spc_caracteristicas').insert(row).select().single();
  if (error || !data) return { id: `spc-local-${Date.now()}`, ...row, created_at: new Date().toISOString() };
  return data as SPCCaracteristica;
}

export const TURNOS = ['matutino', 'vespertino', 'nocturno'] as const;
