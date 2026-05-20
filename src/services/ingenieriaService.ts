import { supabase, getActiveTenantId } from '../lib/supabase';
import type { IngenieriaItem, IngenieriaEtapa } from '../types/ingenieria';

export const ingenieriaService = {

  async getAll(): Promise<IngenieriaItem[]> {
    const tenantId = await getActiveTenantId();
    const { data, error } = await supabase
      .from('viajeros_ingenieria')
      .select('*, etapas:ing_etapas(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<IngenieriaItem> {
    const { data, error } = await supabase
      .from('viajeros_ingenieria')
      .select('*, etapas:ing_etapas(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload: Partial<IngenieriaItem>): Promise<IngenieriaItem> {
    const tenantId = await getActiveTenantId();
    const { data, error } = await supabase
      .from('viajeros_ingenieria')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Partial<IngenieriaItem>): Promise<IngenieriaItem> {
    const { data, error } = await supabase
      .from('viajeros_ingenieria')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('viajeros_ingenieria')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getEtapas(viajeroIngId: string): Promise<IngenieriaEtapa[]> {
    const { data, error } = await supabase
      .from('ing_etapas')
      .select('*')
      .eq('viajero_ing_id', viajeroIngId)
      .order('orden', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async upsertEtapas(viajeroIngId: string, etapas: Partial<IngenieriaEtapa>[]): Promise<void> {
    // Delete existing and re-insert
    const { error: delErr } = await supabase
      .from('ing_etapas')
      .delete()
      .eq('viajero_ing_id', viajeroIngId);
    if (delErr) throw delErr;

    if (etapas.length === 0) return;

    const toInsert = etapas.map((e, idx) => ({
      viajero_ing_id: viajeroIngId,
      nombre_etapa: e.nombre_etapa || '',
      responsable_etapa: e.responsable_etapa || null,
      tiempo_estimado: e.tiempo_estimado || 0,
      estado: e.estado || 'pendiente',
      orden: e.orden ?? idx,
    }));

    const { error } = await supabase.from('ing_etapas').insert(toInsert);
    if (error) throw error;
  },

  async generateFolio(): Promise<string> {
    const year = new Date().getFullYear();
    const tenantId = await getActiveTenantId();
    const { count } = await supabase
      .from('viajeros_ingenieria')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    const num = String((count || 0) + 1).padStart(3, '0');
    return `ING-${year}-${num}`;
  },
};
