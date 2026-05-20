// ─── Ventas Viajero — Type Definitions ────────────────────────────────────────

export type VentasEstatus =
  | 'PROSPECTO'
  | 'PROPUESTA'
  | 'NEGOCIACION'
  | 'PEDIDO'
  | 'EN_PRODUCCION'
  | 'EMBARQUE'
  | 'ENTREGADO'
  | 'FACTURADO'
  | 'CANCELADO';

export type VentasPrioridad = 'NORMAL' | 'ALTA' | 'URGENTE';
export type VentasMoneda = 'MXN' | 'USD';
export type VentasEtapaEstado = 'pendiente' | 'en_proceso' | 'completado';

export interface VentasItem {
  id: string;
  tenant_id: string;
  folio: string;
  cliente: string;
  contacto?: string;
  descripcion: string;
  responsable_ventas: string;
  estatus: VentasEstatus;
  prioridad: VentasPrioridad;
  valor_pedido: number;
  moneda: VentasMoneda;
  avance_porcentaje: number;
  fecha_pedido?: string;
  fecha_entrega_prometida?: string;
  fecha_entrega_real?: string;
  numero_pedido_cliente?: string;
  numero_factura?: string;
  motivo_cancelacion?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Joined
  etapas?: VentasEtapa[];
}

export interface VentasEtapa {
  id: string;
  viajero_venta_id: string;
  nombre_etapa: string;
  responsable_etapa?: string;
  tiempo_estimado?: number;
  estado: VentasEtapaEstado;
  orden: number;
  created_at: string;
}

export const VENTAS_ESTATUS_LABELS: Record<VentasEstatus, string> = {
  PROSPECTO:     'Prospecto',
  PROPUESTA:     'Propuesta',
  NEGOCIACION:   'Negociación',
  PEDIDO:        'Pedido',
  EN_PRODUCCION: 'En Producción',
  EMBARQUE:      'Embarque',
  ENTREGADO:     'Entregado',
  FACTURADO:     'Facturado',
  CANCELADO:     'Cancelado',
};

export const VENTAS_ESTATUS_OPTIONS: VentasEstatus[] = [
  'PROSPECTO', 'PROPUESTA', 'NEGOCIACION', 'PEDIDO',
  'EN_PRODUCCION', 'EMBARQUE', 'ENTREGADO', 'FACTURADO', 'CANCELADO',
];

export const DEFAULT_VENTAS_ETAPAS = [
  'PROPUESTA',
  'NEGOCIACIÓN',
  'PEDIDO',
  'EN_PRODUCCIÓN',
  'EMBARQUE',
];
