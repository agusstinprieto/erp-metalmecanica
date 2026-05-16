import { supabase } from '../lib/supabase';
import type { RFQCotizacion, RFQEstado, NewRFQInput, RFQDocumento, DocumentoTipo } from '../types/quote.types';

/*
  SQL para crear la tabla rfq_documentos en Supabase:

  CREATE TABLE rfq_documentos (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfq_id        TEXT NOT NULL,
    tipo          TEXT NOT NULL,
    nombre        TEXT NOT NULL,
    url           TEXT NOT NULL,
    storage_path  TEXT NOT NULL,
    tamano        BIGINT,
    tenant_id     TEXT DEFAULT 'mcvill',
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX ON rfq_documentos(rfq_id);

  Los viajeros se insertan en la tabla "viajeros" ya existente.
  Storage bucket policy — en erp-assets, permitir uploads a rfq-documents/*
*/

// const TENANT = 'mcvill'; // REMOVED: Now using dynamic tenantId from callers


// F001 Risk Matrix Scoring (Formato PM_F001 McVill)
// Aceros:       ≤2 → 1pt, >2 → 3pts (binario per escala F001)
// Procesos:     <3 → 1pt, 3–5 → 2pts, ≥6 → 3pts
// Subensambles: ≤2 → 1pt, 3 → 2pts, ≥4 → 3pts
// Hardwares:    ≤2 → 1pt, 3 → 2pts, ≥4 → 3pts
// Total: <6 = LOW (5d), 6–8 = MEDIUM (10d), ≥9 = HIGH (20d)
export function calcRiskScore(a: number, p: number, s: number, h: number) {
  const sa = a <= 2 ? 1 : 3;
  const sp = p < 3 ? 1 : p < 6 ? 2 : 3;
  const ss = s <= 2 ? 1 : s < 4 ? 2 : 3;
  const sh = h <= 2 ? 1 : h < 4 ? 2 : 3;
  const total = sa + sp + ss + sh;
  const nivel: 'LOW' | 'MEDIUM' | 'HIGH' = total < 6 ? 'LOW' : total < 9 ? 'MEDIUM' : 'HIGH';
  const sla_dias = nivel === 'LOW' ? 5 : nivel === 'MEDIUM' ? 10 : 20;
  return { sa, sp, ss, sh, total, nivel, sla_dias };
}

const DEMO: RFQCotizacion[] = [
  { id: 'rfq-001', ident: 452, rfq_interno: '541', rfq_externo: 'CAT-CMSA-452',
    cliente: 'CAT CMSA', descripcion: 'Subcontrato Oxicorte — 9 NPs',
    contacto_cliente: 'Ramón Vázquez', pm_asignado: 'Ruben Delgado', cant_np: 9, eau: 'SEMANAL',
    cant_aceros: 3, cant_procesos: 2, cant_subensambles: 0, cant_hardwares: 0,
    riesgo_score: 7, riesgo_nivel: 'MEDIUM', sla_dias: 10, fecha_recepcion: '2026-05-10',
    alcance_general: 'CORTE', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
    estado: 'factibilidad', comentario_pm: 'Pendiente análisis de procesos', created_at: '2026-05-10T10:00:00Z' },

  { id: 'rfq-002', ident: 451, rfq_interno: '542', rfq_externo: 'CAT-ACU-4479191',
    cliente: 'CAT ACUÑA', descripcion: '4479191 BRACKET AS — 217 EAU',
    contacto_cliente: 'Ramón Vázquez', pm_asignado: 'Eduardo Flores', cant_np: 1, eau: '217',
    cant_aceros: 1, cant_procesos: 2, cant_subensambles: 0, cant_hardwares: 0,
    riesgo_score: 4, riesgo_nivel: 'LOW', sla_dias: 5, fecha_recepcion: '2026-05-13',
    alcance_general: 'BRACKET', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
    estado: 'factibilidad', created_at: '2026-05-13T09:00:00Z' },

  { id: 'rfq-003', ident: 450, rfq_interno: '540', rfq_externo: 'WB-2026-450',
    cliente: 'WABTEC', descripcion: 'BCC-RFQ-010 Medium Assemblies — 5 NPs',
    contacto_cliente: 'Olivia Nuriulú', pm_asignado: 'Sandra Rodríguez', cant_np: 5, eau: '750-2000',
    cant_aceros: 3, cant_procesos: 4, cant_subensambles: 2, cant_hardwares: 1,
    riesgo_score: 9, riesgo_nivel: 'HIGH', sla_dias: 20, fecha_recepcion: '2026-05-08',
    alcance_general: 'ENSAMBLE', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
    estado: 'factibilidad', comentario_pm: 'Revisar proceso de soldadura', created_at: '2026-05-08T14:00:00Z' },

  { id: 'rfq-004', ident: 323, rfq_interno: '539', rfq_externo: 'NS-2026-323',
    cliente: 'New Standard', descripcion: 'Varios Metal Fabrications — 8 NPs',
    contacto_cliente: 'Tina Andreoli', pm_asignado: 'Sandra Rodríguez', cant_np: 8, eau: 'varios',
    cant_aceros: 3, cant_procesos: 3, cant_subensambles: 1, cant_hardwares: 0,
    riesgo_score: 7, riesgo_nivel: 'MEDIUM', sla_dias: 10, fecha_recepcion: '2026-05-02',
    alcance_general: 'FABRICACIÓN', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
    estado: 'cotizacion', created_at: '2026-05-02T11:00:00Z' },

  { id: 'rfq-005', ident: 449, rfq_interno: '538', rfq_externo: 'KOM-2026-449',
    cliente: 'KOMATSU', descripcion: 'Housing V37/V47/V57 — 3 NPs',
    contacto_cliente: 'Fernando Aguirre', pm_asignado: 'Sandra Rodríguez', cant_np: 3, eau: '22-44',
    cant_aceros: 3, cant_procesos: 5, cant_subensambles: 0, cant_hardwares: 0,
    riesgo_score: 8, riesgo_nivel: 'MEDIUM', sla_dias: 10, fecha_recepcion: '2026-05-01',
    alcance_general: 'MAQUINADO', tiene_solido_3d: true, tiene_planos_2d: true, tiene_bom: false,
    estado: 'cotizacion', comentario_pm: 'Revisar maquinado CNC', created_at: '2026-05-01T08:00:00Z' },

  { id: 'rfq-006', ident: 288, rfq_interno: '537', rfq_externo: 'JD-25-288',
    cliente: 'JOHN DEERE', descripcion: 'BELLCRANK SHIFTABLE PTO + CLEVIS DRAWBAR',
    contacto_cliente: 'Mario Ruíz', pm_asignado: 'Elias Salas', cant_np: 2, eau: '1600-20',
    cant_aceros: 2, cant_procesos: 4, cant_subensambles: 1, cant_hardwares: 0,
    riesgo_score: 7, riesgo_nivel: 'MEDIUM', sla_dias: 10, fecha_recepcion: '2026-04-20',
    alcance_general: 'ENSAMBLE', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
    estado: 'revision', created_at: '2026-04-20T09:00:00Z' },

  { id: 'rfq-007', ident: 312, rfq_interno: '535', rfq_externo: 'KONE-2026-312',
    cliente: 'KONE', descripcion: '72 NPs Varios — Fabricación Estructural',
    contacto_cliente: 'Krutika Sharma', pm_asignado: 'Elias Salas', cant_np: 72, eau: '125-98125',
    cant_aceros: 4, cant_procesos: 6, cant_subensambles: 3, cant_hardwares: 2,
    riesgo_score: 12, riesgo_nivel: 'HIGH', sla_dias: 20, fecha_recepcion: '2026-04-15',
    alcance_general: 'VARIOS', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: true,
    estado: 'revision', comentario_pm: 'Esperando aprobación de Dirección', created_at: '2026-04-15T09:00:00Z' },

  { id: 'rfq-008', ident: 426, rfq_interno: '536', rfq_externo: 'BUH-2026-426',
    cliente: 'BUHLER', descripcion: 'Painting Parts MVRT-12005 — 21 NPs',
    contacto_cliente: 'Patrick Riedener', pm_asignado: 'Sandra Rodríguez', cant_np: 21, eau: '40-60',
    cant_aceros: 2, cant_procesos: 3, cant_subensambles: 1, cant_hardwares: 1,
    riesgo_score: 6, riesgo_nivel: 'MEDIUM', sla_dias: 10, fecha_recepcion: '2026-04-25',
    alcance_general: 'PINTURA', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
    estado: 'revision', comentario_pm: 'En revisión por Ing. Manuel', created_at: '2026-04-25T13:00:00Z' },

  { id: 'rfq-009', ident: 292, rfq_interno: '534', rfq_externo: 'JD-25-292',
    cliente: 'JOHN DEERE', descripcion: '7 NPs Varios — Estructural',
    contacto_cliente: 'Mario Ruíz', pm_asignado: 'Elias Salas', cant_np: 7, eau: 'varios',
    cant_aceros: 3, cant_procesos: 4, cant_subensambles: 2, cant_hardwares: 1,
    riesgo_score: 10, riesgo_nivel: 'HIGH', sla_dias: 20, fecha_recepcion: '2026-04-22',
    alcance_general: 'VARIOS', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
    estado: 'revision', created_at: '2026-04-22T10:00:00Z' },

  { id: 'rfq-010', ident: 318, rfq_interno: '533', rfq_externo: 'AG-2026-318',
    cliente: 'ALFAGOMMA', descripcion: 'Brackets AG — 17 NPs',
    contacto_cliente: 'Fausto Vitela', pm_asignado: 'Sandra Rodríguez', cant_np: 17, eau: '15-574',
    cant_aceros: 2, cant_procesos: 3, cant_subensambles: 1, cant_hardwares: 3,
    riesgo_score: 8, riesgo_nivel: 'MEDIUM', sla_dias: 10, fecha_recepcion: '2026-04-10',
    fecha_envio: '2026-04-20', alcance_general: 'BRACKETS', tiene_solido_3d: false,
    tiene_planos_2d: true, tiene_bom: false, estado: 'enviada', desempeno: '2-Bueno',
    comentario_pm: 'Enviada en tiempo', created_at: '2026-04-10T09:00:00Z' },
];

export async function fetchRFQs(tenantId: string): Promise<RFQCotizacion[]> {
  const { data, error } = await supabase
    .from('rfq_cotizaciones')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error || !data?.length) return DEMO;
  return data as RFQCotizacion[];
}

export async function createRFQ(input: NewRFQInput, tenantId: string): Promise<RFQCotizacion> {
  const risk = calcRiskScore(input.cant_aceros, input.cant_procesos, input.cant_subensambles, input.cant_hardwares);
  const row = {
    ...input,
    riesgo_score: risk.total,
    riesgo_nivel: risk.nivel,
    sla_dias: risk.sla_dias,
    estado: 'factibilidad' as RFQEstado,
    tenant_id: tenantId,
    fecha_recepcion: input.fecha_recepcion || new Date().toISOString().split('T')[0],
  };
  const { data, error } = await supabase.from('rfq_cotizaciones').insert(row).select().single();
  if (error || !data) {
    return { id: `rfq-local-${Date.now()}`, ...row, created_at: new Date().toISOString() };
  }
  return data as RFQCotizacion;
}

export async function updateEstado(id: string, estado: RFQEstado, tenantId: string): Promise<void> {
  const extra: Record<string, string> = {};
  if (estado === 'enviada') extra.fecha_envio = new Date().toISOString().split('T')[0];
  await supabase
    .from('rfq_cotizaciones')
    .update({ estado, ...extra })
    .eq('id', id)
    .eq('tenant_id', tenantId);
}

export async function updateRFQ(id: string, updates: Partial<RFQCotizacion>, tenantId: string): Promise<void> {
  await supabase
    .from('rfq_cotizaciones')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId);
}

export async function deleteRFQ(id: string, tenantId: string): Promise<void> {
  await supabase
    .from('rfq_cotizaciones')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
}

// ─── Document Management ─────────────────────────────────────────────────────

export async function fetchDocumentos(rfqId: string, tenantId: string): Promise<RFQDocumento[]> {
  const { data } = await supabase
    .from('rfq_documentos')
    .select('*')
    .eq('rfq_id', rfqId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return (data as RFQDocumento[]) ?? [];
}

export async function uploadDocumento(
  rfqId: string,
  tipo: DocumentoTipo,
  file: File,
  tenantId: string
): Promise<RFQDocumento | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `rfq-documents/${rfqId}/${tipo}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from('erp-assets')
    .upload(storagePath, file, { upsert: false });
  if (uploadErr) return null;

  const { data: urlData } = supabase.storage.from('erp-assets').getPublicUrl(storagePath);

  const row = {
    rfq_id: rfqId,
    tipo,
    nombre: file.name,
    url: urlData.publicUrl,
    storage_path: storagePath,
    tamano: file.size,
    tenant_id: tenantId,
  };
  const { data, error } = await supabase
    .from('rfq_documentos')
    .insert(row)
    .select()
    .single();
  if (error) {
    await supabase.storage.from('erp-assets').remove([storagePath]);
    return null;
  }
  return data as RFQDocumento;
}

export async function deleteDocumento(id: string, storagePath: string, tenantId: string): Promise<void> {
  await supabase.storage.from('erp-assets').remove([storagePath]);
  await supabase
    .from('rfq_documentos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
}

// ─── Viajero / Orden de Trabajo ──────────────────────────────────────────────

export async function createViajeroFromRFQ(rfq: RFQCotizacion, tenantId: string): Promise<string> {
  const row = {
    cliente:          rfq.cliente,
    numero_parte:     rfq.rfq_externo || rfq.rfq_interno || 'PENDIENTE',
    descripcion:      rfq.descripcion || rfq.alcance_general || '',
    cantidad_orden:   1,
    cant_fabricada:   0,
    fecha_orden:      new Date().toISOString().split('T')[0],
    oc_cliente:       rfq.rfq_externo || '',
    cotizacion:       rfq.rfq_interno || rfq.rfq_externo || '',
    horas_est_totales: 0,
    notas:            rfq.comentario_pm || '',
    estatus:          'PENDIENTE',
    prioridad:        'NORMAL',
    avance_porcentaje: 0,
    tenant_id:        tenantId,
  };
  const { data, error } = await supabase.from('viajeros').insert([row]).select('id').single();
  if (error) throw new Error(`No se pudo crear el viajero: ${error.message}`);
  return (data as { id: string }).id;
}
