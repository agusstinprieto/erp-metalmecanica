import { supabase } from '../lib/supabase';
import type { RHItem, RHEtapa } from '../types/rhVia';

export const rhViaService = {
  async getAll(): Promise<RHItem[]> {
    const { data, error } = await supabase
      .from('viajeros_rh')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as RHItem[];
  },

  async getById(id: string): Promise<RHItem | null> {
    const { data, error } = await supabase
      .from('viajeros_rh')
      .select('*, etapas:rh_etapas(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as RHItem;
  },

  async create(item: Partial<RHItem>): Promise<RHItem> {
    const { data, error } = await supabase
      .from('viajeros_rh')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data as RHItem;
  },

  async update(id: string, item: Partial<RHItem>): Promise<RHItem> {
    const { data, error } = await supabase
      .from('viajeros_rh')
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as RHItem;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('viajeros_rh')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getEtapas(viajeroRhId: string): Promise<RHEtapa[]> {
    const { data, error } = await supabase
      .from('rh_etapas')
      .select('*')
      .eq('viajero_rh_id', viajeroRhId)
      .order('orden', { ascending: true });
    if (error) throw error;
    return data as RHEtapa[];
  },

  async upsertEtapas(viajeroRhId: string, etapas: Partial<RHEtapa>[]): Promise<RHEtapa[]> {
    // Delete existing then re-insert for simplicity
    await supabase.from('rh_etapas').delete().eq('viajero_rh_id', viajeroRhId);

    if (!etapas.length) return [];

    const rows = etapas.map((e, i) => ({
      ...e,
      viajero_rh_id: viajeroRhId,
      orden: e.orden ?? i,
    }));

    const { data, error } = await supabase
      .from('rh_etapas')
      .insert(rows)
      .select();
    if (error) throw error;
    return data as RHEtapa[];
  },
};
