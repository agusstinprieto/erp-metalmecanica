export type IngenieriaEstatus =
  | 'SOLICITUD'
  | 'DISEÑO'
  | 'CÁLCULO'
  | 'REVISIÓN'
  | 'APROBACIÓN'
  | 'LIBERADO'
  | 'CANCELADO';

export interface IngenieriaItem {
  id: string;
  tenant_id?: string;
  folio: string;
  proyecto: string;
  cliente: string;
  descripcion?: string;
  responsable: string;
  departamento?: string;
  prioridad: 'NORMAL' | 'ALTA' | 'URGENTE';
  estatus: IngenieriaEstatus;
  avance_porcentaje: number;
  fecha_solicitud?: string;
  fecha_entrega?: string;
  horas_est_totales: number;
  notas?: string;
  created_at: string;
  updated_at: string;
  etapas?: IngenieriaEtapa[];
}

export interface IngenieriaEtapa {
  id: string;
  viajero_ing_id: string;
  nombre_etapa: string;
  responsable_etapa?: string;
  tiempo_estimado: number;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  orden: number;
  created_at: string;
}
