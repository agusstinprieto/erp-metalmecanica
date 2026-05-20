// ─── Flujo Viajero de Cotizaciones — Types ────────────────────────────────────
// Modeled after viajero.ts — each cotizacion travels through stages like a production traveler

export type CotizacionViaEstatus =
  | 'RFQ_RECIBIDA'
  | 'FACTIBILIDAD'
  | 'COSTEO'
  | 'ELABORACION'
  | 'REVISION'
  | 'ENVIADA'
  | 'GANADA'
  | 'PERDIDA'
  | 'CANCELADA';

export type CotizacionViaPrioridad = 'NORMAL' | 'ALTA' | 'URGENTE';

export type CotizacionViaEtapaEstado = 'pendiente' | 'en_proceso' | 'completado';

export interface CotizacionViaEtapa {
  id: string;
  viajero_cot_id: string;
  nombre_etapa: string;
  responsable_etapa?: string;
  tiempo_estimado?: number;
  estado: CotizacionViaEtapaEstado;
  orden: number;
  created_at?: string;
}

export interface CotizacionViaItem {
  id: string;
  tenant_id?: string;
  folio: string;
  cliente: string;
  contacto?: string;
  descripcion: string;
  responsable: string;
  estatus: CotizacionViaEstatus;
  prioridad: CotizacionViaPrioridad;
  valor_estimado: number;
  probabilidad_cierre: number;
  avance_porcentaje: number;
  fecha_recepcion?: string;
  fecha_entrega_requerida?: string;
  fecha_envio?: string;
  motivo_perdida?: string;
  notas?: string;
  etapas?: CotizacionViaEtapa[];
  created_at: string;
  updated_at: string;
}

// Stages in order
export const COT_STAGES: CotizacionViaEstatus[] = [
  'RFQ_RECIBIDA',
  'FACTIBILIDAD',
  'COSTEO',
  'ELABORACION',
  'REVISION',
  'ENVIADA',
  'GANADA',
];

// Default etapas when creating a new cotizacion
export const DEFAULT_ETAPAS = [
  { nombre_etapa: 'FACTIBILIDAD',  orden: 1 },
  { nombre_etapa: 'COSTEO',        orden: 2 },
  { nombre_etapa: 'ELABORACION',   orden: 3 },
  { nombre_etapa: 'REVISIÓN',      orden: 4 },
];
