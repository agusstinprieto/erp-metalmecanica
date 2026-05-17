export type RFQEstado = 'factibilidad' | 'cotizacion' | 'revision' | 'enviada' | 'declinada';

export type DocumentoTipo = 'plano_2d' | 'modelo_3d' | 'especificacion' | 'bom' | 'otro';

export interface RFQDocumento {
  id: string;
  rfq_id: string;
  tipo: DocumentoTipo;
  nombre: string;
  url: string;
  storage_path: string;
  tamano?: number;
  created_at: string;
}

export interface RFQCotizacion {
  id: string;
  ident?: number;
  rfq_interno?: string;
  rfq_externo?: string;
  cliente: string;
  descripcion?: string;
  contacto_cliente?: string;
  pm_asignado?: string;
  cant_np: number;
  eau?: string;
  cant_aceros: number;
  cant_procesos: number;
  cant_subensambles: number;
  cant_hardwares: number;
  riesgo_score: number;
  riesgo_nivel: 'LOW' | 'MEDIUM' | 'HIGH';
  sla_dias: number;
  fecha_recepcion?: string;
  fecha_ingenieria?: string;
  fecha_compromiso?: string;
  fecha_envio?: string;
  alcance_general?: string;
  tiene_solido_3d: boolean;
  tiene_planos_2d: boolean;
  tiene_bom: boolean;
  estado: RFQEstado;
  desempeno?: string;
  motivo_declinacion?: string;
  comentario_pm?: string;
  monto_estimado?: number;
  created_at: string;
  updated_at?: string;
}

export type NewRFQInput = {
  cliente: string;
  descripcion?: string;
  contacto_cliente?: string;
  pm_asignado?: string;
  cant_np: number;
  eau?: string;
  cant_aceros: number;
  cant_procesos: number;
  cant_subensambles: number;
  cant_hardwares: number;
  alcance_general?: string;
  tiene_solido_3d: boolean;
  tiene_planos_2d: boolean;
  tiene_bom: boolean;
  fecha_recepcion?: string;
  comentario_pm?: string;
  monto_estimado?: number;
};
