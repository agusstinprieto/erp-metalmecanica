// ─── Tipos para Viajero de Compras ───────────────────────────────────────────

export type ComprasEstatus =
  | 'REQUISICION'
  | 'COT_PROVEEDOR'
  | 'APROBACION'
  | 'OC_EMITIDA'
  | 'EN_TRANSITO'
  | 'RECIBIDA'
  | 'CERRADA'
  | 'CANCELADA';

export type ComprasPrioridad = 'NORMAL' | 'ALTA' | 'URGENTE';

export type ComprasMoneda = 'MXN' | 'USD';

export interface ComprasItem {
  id: string;
  tenant_id?: string;
  folio: string;
  proveedor: string;
  concepto: string;
  descripcion?: string;
  solicitante: string;
  aprobador?: string;
  estatus: ComprasEstatus;
  prioridad: ComprasPrioridad;
  urgente: boolean;
  monto_total: number;
  moneda: ComprasMoneda;
  avance_porcentaje: number;
  fecha_requisicion?: string;
  fecha_entrega_requerida?: string;
  fecha_recepcion?: string;
  numero_oc?: string;
  proveedor_contacto?: string;
  condiciones_pago?: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
  // Joined
  etapas?: ComprasEtapa[];
}

export interface ComprasEtapa {
  id: string;
  viajero_compra_id: string;
  nombre_etapa: string;
  responsable_etapa?: string;
  tiempo_estimado?: string;
  estado?: string;
  orden: number;
  created_at?: string;
}
