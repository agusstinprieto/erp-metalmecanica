// ─── Tipos para Viajero de RH (Recursos Humanos) ─────────────────────────────

export type RHEstatus =
  | 'VACANTE'
  | 'RECLUTAMIENTO'
  | 'ENTREVISTAS'
  | 'SELECCION'
  | 'OFERTA'
  | 'ONBOARDING'
  | 'ACTIVO'
  | 'CANCELADO';

export type RHPrioridad = 'NORMAL' | 'ALTA' | 'URGENTE';

export interface RHItem {
  id: string;
  tenant_id?: string;
  folio: string;
  puesto: string;
  departamento: string;
  solicitante: string;
  responsable_rh?: string;
  estatus: RHEstatus;
  prioridad: RHPrioridad;
  urgente: boolean;
  num_posiciones: number;
  salario_min?: number;
  salario_max?: number;
  avance_porcentaje: number;
  fecha_apertura?: string;
  fecha_objetivo?: string;
  fecha_ingreso?: string;
  candidato_seleccionado?: string;
  motivo_cancelacion?: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
  // Joined
  etapas?: RHEtapa[];
}

export interface RHEtapa {
  id: string;
  viajero_rh_id: string;
  nombre_etapa: string;
  responsable_etapa?: string;
  tiempo_estimado?: string;
  estado?: string;
  orden: number;
  created_at?: string;
}
