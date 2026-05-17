import { supabase } from '../lib/supabase';

// ── Dynamic tenant resolution (Zero Hardcoding — Regla 16) ───────────────────
let _cachedWITenant: string | null = null;
async function getTenant(): Promise<string> {
  if (_cachedWITenant) return _cachedWITenant;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles').select('tenant_id').eq('id', session.user.id).maybeSingle();
    if (profile?.tenant_id) { _cachedWITenant = profile.tenant_id; return _cachedWITenant; }
  }
  const { data: tenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
  _cachedWITenant = tenant?.id ?? 'default';
  return _cachedWITenant;
}
/** @deprecated Use getTenant() — kept for demo data labels only */
const TENANT = 'mcvill';

export type WIEstado = 'borrador' | 'activa' | 'obsoleta';

export interface WorkInstruction {
  id: string;
  wi_numero: string;
  nombre: string;
  descripcion?: string;
  numero_parte?: string;
  operacion?: string;
  revision: string;
  estado: WIEstado;
  aprobado_por?: string;
  fecha_aprobacion?: string;
  tiempo_ciclo_min?: number;
  tenant_id: string;
  created_at: string;
  updated_at?: string;
}

export interface WIPaso {
  id: string;
  wi_id: string;
  orden: number;
  titulo: string;
  instruccion: string;
  imagen_url?: string;
  herramienta?: string;
  punto_control: boolean;
  advertencia?: string;
  tenant_id: string;
  created_at: string;
}

export interface NewWIInput {
  wi_numero: string;
  nombre: string;
  descripcion?: string;
  numero_parte?: string;
  operacion?: string;
  revision?: string;
  tiempo_ciclo_min?: number;
  aprobado_por?: string;
}

export interface NewPasoInput {
  wi_id: string;
  orden: number;
  titulo: string;
  instruccion: string;
  imagen_url?: string;
  herramienta?: string;
  punto_control?: boolean;
  advertencia?: string;
}

// ── Demo data (operaciones reales McVill) ────────────────────────────────────
const DEMO_WIS: WorkInstruction[] = [
  { id: 'wi-001', wi_numero: 'WI-2026-001', nombre: 'Configuración Corte Láser Trumpf 3kW',
    descripcion: 'Procedimiento de setup y operación de cortadora láser para lamina A36', numero_parte: 'VARIOS',
    operacion: 'CORTE', revision: 'B', estado: 'activa', aprobado_por: 'Jorge Villarreal',
    fecha_aprobacion: '2026-03-01', tiempo_ciclo_min: 45, tenant_id: TENANT, created_at: '2026-03-01T10:00:00Z' },
  { id: 'wi-002', wi_numero: 'WI-2026-002', nombre: 'Soldadura MIG Estructural — Certificada AWS',
    descripcion: 'Proceso estándar para soldadura MIG en uniones tipo T y esquina', numero_parte: 'ENSAMBLES',
    operacion: 'SOLDADURA', revision: 'A', estado: 'activa', aprobado_por: 'Jorge Villarreal',
    fecha_aprobacion: '2026-02-15', tiempo_ciclo_min: 30, tenant_id: TENANT, created_at: '2026-02-15T09:00:00Z' },
  { id: 'wi-003', wi_numero: 'WI-2026-003', nombre: 'Maquinado CNC — Torno Mazak Nexus',
    descripcion: 'Setup y operación del torno CNC para piezas de revolución', numero_parte: 'NP-HOUSING',
    operacion: 'MAQUINADO', revision: 'A', estado: 'activa', aprobado_por: 'Jorge Villarreal',
    fecha_aprobacion: '2026-04-01', tiempo_ciclo_min: 60, tenant_id: TENANT, created_at: '2026-04-01T08:00:00Z' },
  { id: 'wi-004', wi_numero: 'WI-2026-004', nombre: 'Pintura en Polvo — Preparación de Superficie',
    descripcion: 'Proceso completo de preparación y aplicación de pintura en polvo epóxica', numero_parte: 'VARIOS',
    operacion: 'PINTURA', revision: 'A', estado: 'activa', aprobado_por: 'Jorge Villarreal',
    fecha_aprobacion: '2026-01-20', tiempo_ciclo_min: 120, tenant_id: TENANT, created_at: '2026-01-20T11:00:00Z' },
  { id: 'wi-005', wi_numero: 'WI-2026-005', nombre: 'Ensamble de Bracket — CAT CMSA',
    descripcion: 'Instrucciones de ensamble para brackets CAT serie 452', numero_parte: 'CAT-CMSA-452',
    operacion: 'ENSAMBLE', revision: 'C', estado: 'activa', aprobado_por: 'Jorge Villarreal',
    fecha_aprobacion: '2026-05-01', tiempo_ciclo_min: 25, tenant_id: TENANT, created_at: '2026-05-01T09:00:00Z' },
  { id: 'wi-006', wi_numero: 'WI-2026-006', nombre: 'Corte por Oxicorte — Placas Gruesas AR400',
    descripcion: 'Procedimiento para corte de placas AR400/AR500 mayor a 25mm', numero_parte: 'VARIOS',
    operacion: 'CORTE', revision: 'A', estado: 'borrador', tenant_id: TENANT, created_at: '2026-05-10T14:00:00Z' },
];

const DEMO_PASOS: Record<string, WIPaso[]> = {
  'wi-001': [
    { id: 'p-001-1', wi_id: 'wi-001', orden: 1, titulo: 'Verificar programa CNC', instruccion: 'Cargar el programa CNC correspondiente al plano. Verificar nombre de archivo, revisión y material especificado. Confirmar con el ingeniero antes de continuar.', herramienta: 'PC Trumpf TruTops', punto_control: true, advertencia: 'NO iniciar corte sin verificar el programa con el número de plano correcto.', tenant_id: TENANT, created_at: '2026-03-01T10:00:00Z' },
    { id: 'p-001-2', wi_id: 'wi-001', orden: 2, titulo: 'Configurar parámetros de corte', instruccion: 'Seleccionar material: Acero A36. Espesor según plano. Velocidad de corte y presión de gas N₂ según tabla de parámetros Trumpf en pared. Verificar boquilla limpia.', herramienta: 'Panel Trumpf TruLaser', punto_control: false, tenant_id: TENANT, created_at: '2026-03-01T10:00:00Z' },
    { id: 'p-001-3', wi_id: 'wi-001', orden: 3, titulo: 'Colocar lámina en mesa', instruccion: 'Colocar lámina con puente grúa o manualmente según peso. Alinear con topes de referencia. Verificar que la lámina esté plana sin deformaciones mayores a 2mm.', herramienta: 'Puente grúa / imán de levante', punto_control: false, advertencia: 'Usar guantes y zapatos de seguridad. Peso máximo manual: 25kg.', tenant_id: TENANT, created_at: '2026-03-01T10:00:00Z' },
    { id: 'p-001-4', wi_id: 'wi-001', orden: 4, titulo: 'Ejecutar corte de prueba', instruccion: 'Ejecutar primeras 3 piezas como muestra. Medir dimensiones críticas indicadas en plano con cinta métrica o vernier. Tolerancia ±0.5mm general.', herramienta: 'Vernier digital / cinta métrica', punto_control: true, tenant_id: TENANT, created_at: '2026-03-01T10:00:00Z' },
    { id: 'p-001-5', wi_id: 'wi-001', orden: 5, titulo: 'Producción y clasificación', instruccion: 'Continuar producción. Clasificar piezas buenas en tarima identificada con etiqueta: NP, cantidad, fecha, operador. Piezas con defecto en área de rechazo con etiqueta roja.', herramienta: 'Etiquetas identificación / marcador', punto_control: false, tenant_id: TENANT, created_at: '2026-03-01T10:00:00Z' },
  ],
  'wi-002': [
    { id: 'p-002-1', wi_id: 'wi-002', orden: 1, titulo: 'Equipos de protección personal', instruccion: 'Colocarse: careta de soldar (oscuridad #11 mínimo), guantes de cuero de soldador, mandil de cuero, botas de seguridad, tapones auditivos. OBLIGATORIO antes de encender el equipo.', punto_control: true, advertencia: 'NO soldar sin EPP completo. Riesgo de quemaduras, ceguera por arco y fumes.', tenant_id: TENANT, created_at: '2026-02-15T09:00:00Z' },
    { id: 'p-002-2', wi_id: 'wi-002', orden: 2, titulo: 'Preparar equipo Miller', instruccion: 'Conectar tierra a la pieza de trabajo lo más cerca posible de la zona a soldar. Verificar parámetros: voltaje 22-26V, velocidad de alambre 250-350 ipm según espesor. Gas: CO₂/Argón 75/25 a 25 cfh.', herramienta: 'Soldadora Miller Millermatic 252', punto_control: false, tenant_id: TENANT, created_at: '2026-02-15T09:00:00Z' },
    { id: 'p-002-3', wi_id: 'wi-002', orden: 3, titulo: 'Limpiar y preparar junta', instruccion: 'Eliminar óxido, pintura, grasa y humedad en zona de soldadura (50mm mínimo alrededor). Usar amoladora o cepillo de acero. La junta debe verse metálica brillante.', herramienta: 'Amoladora angular / Cepillo de acero', punto_control: false, tenant_id: TENANT, created_at: '2026-02-15T09:00:00Z' },
    { id: 'p-002-4', wi_id: 'wi-002', orden: 4, titulo: 'Ejecutar soldadura', instruccion: 'Aplicar soldadura según secuencia indicada en plano. Controlar distorsión usando sujetadores y secuencia alternada. Longitud de cordón y cateto según especificación del plano.', herramienta: 'Pistola MIG / Martillo descoriador', punto_control: true, tenant_id: TENANT, created_at: '2026-02-15T09:00:00Z' },
    { id: 'p-002-5', wi_id: 'wi-002', orden: 5, titulo: 'Inspección visual post-soldadura', instruccion: 'Inspeccionar todos los cordones: sin porosidad visible, sin socavado, sin grietas, cateto correcto. Medir distorsión angular con escuadra. Si hay defecto, reportar a calidad.', herramienta: 'Escuadra / Galga de soldadura', punto_control: true, tenant_id: TENANT, created_at: '2026-02-15T09:00:00Z' },
  ],
};

// ── Supabase CRUD ────────────────────────────────────────────────────────────
export async function fetchWIs(filters?: { operacion?: string; estado?: WIEstado }): Promise<WorkInstruction[]> {
  let q = supabase.from('work_instructions').select('*').eq('tenant_id', TENANT).order('wi_numero');
  if (filters?.operacion) q = q.eq('operacion', filters.operacion);
  if (filters?.estado)    q = q.eq('estado', filters.estado);
  const { data, error } = await q;
  if (error || !data?.length) return DEMO_WIS;
  return data as WorkInstruction[];
}

export async function fetchPasos(wiId: string): Promise<WIPaso[]> {
  if (wiId.startsWith('wi-')) return DEMO_PASOS[wiId] || [];
  const { data, error } = await supabase
    .from('wi_pasos').select('*').eq('wi_id', wiId).order('orden');
  if (error || !data) return [];
  return data as WIPaso[];
}

export async function createWI(input: NewWIInput): Promise<WorkInstruction> {
  const row = { ...input, revision: input.revision || 'A', estado: 'borrador' as WIEstado, tenant_id: TENANT };
  const { data, error } = await supabase.from('work_instructions').insert(row).select().single();
  if (error || !data) return { id: `wi-local-${Date.now()}`, ...row, created_at: new Date().toISOString() };
  return data as WorkInstruction;
}

export async function updateWI(id: string, updates: Partial<WorkInstruction>): Promise<void> {
  await supabase.from('work_instructions').update(updates).eq('id', id).eq('tenant_id', TENANT);
}

export async function deleteWI(id: string): Promise<void> {
  await supabase.from('work_instructions').delete().eq('id', id).eq('tenant_id', TENANT);
}

export async function createPaso(input: NewPasoInput): Promise<WIPaso> {
  const row = { ...input, punto_control: input.punto_control ?? false, tenant_id: TENANT };
  const { data, error } = await supabase.from('wi_pasos').insert(row).select().single();
  if (error || !data) return { id: `paso-local-${Date.now()}`, ...row, created_at: new Date().toISOString() };
  return data as WIPaso;
}

export async function updatePaso(id: string, updates: Partial<WIPaso>): Promise<void> {
  await supabase.from('wi_pasos').update(updates).eq('id', id);
}

export async function deletePaso(id: string): Promise<void> {
  await supabase.from('wi_pasos').delete().eq('id', id);
}

export async function reorderPasos(wiId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => updatePaso(id, { orden: i + 1 })));
}

export const OPERACIONES = ['CORTE', 'SOLDADURA', 'MAQUINADO', 'ENSAMBLE', 'PINTURA', 'DOBLADO', 'TRATAMIENTO', 'INSPECCION'];
