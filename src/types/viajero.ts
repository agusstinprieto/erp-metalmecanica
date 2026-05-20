export type ViajeroEstatus =
  | 'PENDIENTE'
  | 'EN PROCESO'
  | 'DETENIDO'
  | 'EN RETRABAJO'
  | 'COMPLETADO'
  | 'RECHAZADO';

export interface Viajero {
  id: string;
  cliente: string;
  numero_parte: string;
  descripcion: string;
  revision?: string;
  cantidad_orden: number;
  cant_fabricada: number;
  cantidad_fabricada?: number; // Alias for cant_fabricada
  cantidad_asignada?: number;  // Piezas asignadas a este viajero dentro de su orden
  fecha_orden: string;
  fecha_entrega?: string;
  oc_cliente?: string;
  linea?: string;
  ensamble_tl?: string;
  descripcion_ensamble?: string;
  dibujo?: string;
  cotizacion?: string;
  horas_est_totales: number;
  horas_estimadas?: number;
  notas?: string;
  estatus: ViajeroEstatus;
  prioridad: 'NORMAL' | 'ALTA' | 'URGENTE';
  avance_porcentaje?: number;
  orden_trabajo_id?: string;
  // Rechazo
  motivo_rechazo?: string;
  rechazado_por?: string;
  fecha_rechazo?: string;
  // Scrap
  cantidad_scrap?: number;
  motivo_scrap?: string;
  tenant_id?: string;
  image_prompt?: string;
  image_url?: string;
  componentes?: ViajeroComponente[];
  rutas?: ViajeroRuta[];
  materiales?: ViajeroMaterial[];
  retrabajos?: Retrabajo[];
}

export type RetrabajoDispo = 'reparar' | 'scrap' | 'usar_como_esta';
export type RetrabajoStatus = 'pendiente' | 'en_proceso' | 'completado' | 'scrap';

export interface Retrabajo {
  id: string;
  tenant_id: string;
  viajero_id: string;
  no_conformidad_id?: string;
  numero_intento: number;
  descripcion_falla: string;
  disposicion: RetrabajoDispo;
  operaciones_repetir?: string[];
  responsable?: string;
  aprobado_por?: string;
  fecha_inicio: string;
  fecha_cierre?: string;
  costo_estimado: number;
  costo_real?: number;
  status: RetrabajoStatus;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface ViajeroComponente {
  id: string;
  viajero_id: string;
  ot_suborden?: string;
  numero_parte: string;
  descripcion?: string;
  revision?: string;
  total_horas_estimadas: number;
  cantidad_a_fabricar: number;
}

export interface ViajeroRuta {
  id: string;
  viajero_id: string;
  proveedor_ct: string;
  operacion_servicio: string;
  clave_operacion: string;
  tiempo_configuracion: number;
  tasa_proceso: number;
  descripcion_detallada: string;
  orden_operacion: number;
}

export interface ViajeroMaterial {
  id: string;
  viajero_id: string;
  clave_requerimiento: string;
  descripcion_material: string;
  ubicacion_almacen: string;
  cantidad: number;
  unidad_medida: string;
  tipo_material: 'placa' | 'tubo';
  parametros?: ViajeroParametrosMaterial;
}

export interface ViajeroParametrosMaterial {
  id: string;
  material_id: string;
  items_parte: number;
  piezas_requeridas: number;
  partes_hoja_barra: number;
  longitud_parte: number;
  ancho_parte: number;
  merma_corte?: number;
}
