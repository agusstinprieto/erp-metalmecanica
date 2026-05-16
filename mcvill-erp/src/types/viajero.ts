export interface Viajero {
  id: string;
  cliente: string;
  numero_parte: string;
  descripcion: string;
  revision?: string;
  cantidad_orden: number;
  cant_fabricada: number;
  cantidad_fabricada?: number; // Alias for cant_fabricada
  fecha_orden: string;
  fecha_entrega?: string;
  oc_cliente?: string;
  linea?: string;
  ensamble_tl?: string;
  descripcion_ensamble?: string; // Additional descriptive field
  dibujo?: string;
  cotizacion?: string;
  horas_est_totales: number;
  horas_estimadas?: number; // Calculated field
  notas?: string;
  estatus: 'PENDIENTE' | 'EN PROCESO' | 'DETENIDO' | 'COMPLETADO' | 'RECHAZADO';
  prioridad: 'NORMAL' | 'ALTA' | 'URGENTE';
  avance_porcentaje?: number;
  motivo_rechazo?: string;
  rechazado_por?: string;
  fecha_rechazo?: string;
  tenant_id?: string;
  image_prompt?: string;
  image_url?: string;
  componentes?: ViajeroComponente[];
  rutas?: ViajeroRuta[];
  materiales?: ViajeroMaterial[];
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
