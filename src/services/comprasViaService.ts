import { supabase } from '../lib/supabase';
import type { ComprasItem, ComprasEtapa } from '../types/compras';

export const comprasViaService = {
  async getAll(): Promise<ComprasItem[]> {
    const { data, error } = await supabase
      .from('viajeros_compras')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ComprasItem[];
  },

  async getById(id: string): Promise<ComprasItem | null> {
    const { data, error } = await supabase
      .from('viajeros_compras')
      .select('*, etapas:compras_etapas(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as ComprasItem;
  },

  async create(item: Partial<ComprasItem>): Promise<ComprasItem> {
    const { data, error } = await supabase
      .from('viajeros_compras')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data as ComprasItem;
  },

  async update(id: string, item: Partial<ComprasItem>): Promise<ComprasItem> {
    const { data, error } = await supabase
      .from('viajeros_compras')
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ComprasItem;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('viajeros_compras')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getEtapas(viajeroCompraId: string): Promise<ComprasEtapa[]> {
    const { data, error } = await supabase
      .from('compras_etapas')
      .select('*')
      .eq('viajero_compra_id', viajeroCompraId)
      .order('orden', { ascending: true });
    if (error) throw error;
    return data as ComprasEtapa[];
  },

  async upsertEtapas(viajeroCompraId: string, etapas: Partial<ComprasEtapa>[]): Promise<ComprasEtapa[]> {
    // Delete existing then re-insert for simplicity
    await supabase.from('compras_etapas').delete().eq('viajero_compra_id', viajeroCompraId);

    if (!etapas.length) return [];

    const rows = etapas.map((e, i) => ({
      ...e,
      viajero_compra_id: viajeroCompraId,
      orden: e.orden ?? i,
    }));

    const { data, error } = await supabase
      .from('compras_etapas')
      .insert(rows)
      .select();
    if (error) throw error;
    return data as ComprasEtapa[];
  },
};
