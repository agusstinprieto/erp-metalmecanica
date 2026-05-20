// ─── Cotizacion Viajero — Type Definitions ────────────────────────────────────

export type CotizacionEstatus =
  | 'RFQ_RECIBIDA'
  | 'FACTIBILIDAD'
  | 'COSTEO'
  | 'ELABORACION'
  | 'REVISION'
  | 'ENVIADA'
  | 'GANADA'
  | 'PERDIDA'
  | 'CANCELADA';

export type CotizacionPrioridad = 'NORMAL' | 'ALTA' | 'URGENTE';

export type CotizacionEtapaEstado = 'pendiente' | 'en_proceso' | 'completado';

export interface CotizacionItem {
  id: string;
  tenant_id: string;
  folio: string;
  cliente: string;
  contacto?: string;
  descripcion: string;
  responsable: string;
  estatus: CotizacionEstatus;
  prioridad: CotizacionPrioridad;
  valor_estimado: number;
  probabilidad_cierre: number;
  avance_porcentaje: number;
  fecha_recepcion?: string;
  fecha_entrega_requerida?: string;
  fecha_envio?: string;
  motivo_perdida?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Joined
  etapas?: CotizacionEtapa[];
}

export interface CotizacionEtapa {
  id: string;
  viajero_cot_id: string;
  nombre_etapa: string;
  responsable_etapa?: string;
  tiempo_estimado?: number;
  estado: CotizacionEtapaEstado;
  orden: number;
  created_at: string;
}

export const COT_ESTATUS_LABELS: Record<CotizacionEstatus, string> = {
  RFQ_RECIBIDA: 'RFQ Recibida',
  FACTIBILIDAD: 'Factibilidad',
  COSTEO:       'Costeo',
  ELABORACION:  'Elaboración',
  REVISION:     'Revisión',
  ENVIADA:      'Enviada',
  GANADA:       'Ganada',
  PERDIDA:      'Perdida',
  CANCELADA:    'Cancelada',
};

export const COT_ESTATUS_OPTIONS: CotizacionEstatus[] = [
  'RFQ_RECIBIDA', 'FACTIBILIDAD', 'COSTEO', 'ELABORACION',
  'REVISION', 'ENVIADA', 'GANADA', 'PERDIDA', 'CANCELADA',
];

export const DEFAULT_ETAPAS = [
  'FACTIBILIDAD',
  'COSTEO',
  'ELABORACION',
  'REVISIÓN',
];
