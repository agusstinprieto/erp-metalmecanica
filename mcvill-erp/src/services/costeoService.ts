import { supabase } from '../lib/supabase';

export interface CosteoDashboardRow {
  id: string;
  viajero_id: string;
  numero_parte: string | null;
  descripcion: string | null;
  cliente: string | null;
  estatus_viajero: string | null;
  total_est: number | null;
  total_real: number | null;
  precio_venta: number | null;
  varianza_pct: number | null;
  margen_real_pct: number | null;
  estado: 'abierta' | 'cerrada' | 'cancelada';
  created_at: string;
  semaforo: 'ok' | 'atencion' | 'critico' | 'sin_datos';
  utilidad_bruta: number | null;
}

export interface CostoOrden {
  id: string;
  viajero_id: string;
  mat_est: number;
  mo_est: number;
  maq_est: number;
  overhead_est: number;
  total_est: number;
  mat_real: number | null;
  mo_real: number | null;
  maq_real: number | null;
  overhead_real: number | null;
  total_real: number;
  precio_venta: number | null;
  varianza_pct: number | null;
  margen_real_pct: number | null;
  estado: 'abierta' | 'cerrada' | 'cancelada';
  notas: string | null;
  created_at: string;
}

export interface Aprobacion {
  id: string;
  modulo: string;
  registro_id: string;
  registro_desc: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'expirado';
  monto: number | null;
  solicitado_en: string;
  resuelto_en: string | null;
  comentario: string | null;
}

export interface TarifaManoObra {
  id: string;
  puesto: string;
  nivel: string;
  tarifa_hora: number;
  tarifa_real_hora: number;
  factor_carga: number;
  activa: boolean;
}

export const costeoService = {
  async getDashboard(): Promise<CosteoDashboardRow[]> {
    const { data, error } = await supabase
      .from('v_costeo_dashboard')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CosteoDashboardRow[];
  },

  async getAlertas(): Promise<CosteoDashboardRow[]> {
    const { data, error } = await supabase
      .from('v_alertas_varianza')
      .select('*');
    if (error) throw error;
    return (data ?? []) as CosteoDashboardRow[];
  },

  async upsertCosto(viajero_id: string, payload: Partial<CostoOrden>) {
    const { data, error } = await supabase
      .from('costos_ordenes')
      .upsert({ viajero_id, ...payload }, { onConflict: 'viajero_id' })
      .select()
      .single();
    if (error) throw error;
    return data as CostoOrden;
  },

  async closeCosto(id: string) {
    const { error } = await supabase
      .from('costos_ordenes')
      .update({ estado: 'cerrada', cerrada_en: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async getAprobacionesPendientes(): Promise<Aprobacion[]> {
    const { data, error } = await supabase
      .from('aprobaciones')
      .select('*')
      .eq('estado', 'pendiente')
      .order('solicitado_en', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Aprobacion[];
  },

  async resolverAprobacion(id: string, accion: 'aprobado' | 'rechazado', comentario?: string) {
    const { error } = await supabase
      .from('aprobaciones')
      .update({
        estado: accion,
        resuelto_en: new Date().toISOString(),
        comentario: comentario ?? null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  async getTarifasMO(): Promise<TarifaManoObra[]> {
    const { data, error } = await supabase
      .from('tarifas_mano_obra')
      .select('*')
      .eq('activa', true)
      .order('puesto');
    if (error) throw error;
    return (data ?? []) as TarifaManoObra[];
  },
};
