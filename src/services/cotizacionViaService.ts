// ─── Cotizacion Viajero Service ───────────────────────────────────────────────

import { supabase, getActiveTenantId } from '../lib/supabase';
import type { CotizacionItem, CotizacionEtapa } from '../types/cotizacion';

export const cotizacionViaService = {
  // ── Cotizaciones ────────────────────────────────────────────────────────────

  async getAll(): Promise<CotizacionItem[]> {
    const tenantId = await getActiveTenantId();
    const { data, error } = await supabase
      .from('viajeros_cotizacion')
      .select('*, etapas:cot_etapas(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as CotizacionItem[];
  },

  async getById(id: string): Promise<CotizacionItem | null> {
    const { data, error } = await supabase
      .from('viajeros_cotizacion')
      .select('*, etapas:cot_etapas(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as CotizacionItem;
  },

  async create(payload: Partial<CotizacionItem>): Promise<CotizacionItem> {
    const tenantId = await getActiveTenantId();
    const { data, error } = await supabase
      .from('viajeros_cotizacion')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data as CotizacionItem;
  },

  async update(id: string, payload: Partial<CotizacionItem>): Promise<CotizacionItem> {
    const { data, error } = await supabase
      .from('viajeros_cotizacion')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CotizacionItem;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('viajeros_cotizacion')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('viajeros_cotizacion')
      .delete()
      .in('id', ids);

    if (error) throw error;
  },

  // ── Etapas ──────────────────────────────────────────────────────────────────

  async getEtapas(viajero_cot_id: string): Promise<CotizacionEtapa[]> {
    const { data, error } = await supabase
      .from('cot_etapas')
      .select('*')
      .eq('viajero_cot_id', viajero_cot_id)
      .order('orden', { ascending: true });

    if (error) throw error;
    return (data || []) as CotizacionEtapa[];
  },

  async upsertEtapas(
    viajero_cot_id: string,
    etapas: Omit<CotizacionEtapa, 'id' | 'created_at'>[]
  ): Promise<CotizacionEtapa[]> {
    // Delete existing and re-insert for simplicity
    await supabase
      .from('cot_etapas')
      .delete()
      .eq('viajero_cot_id', viajero_cot_id);

    if (etapas.length === 0) return [];

    const { data, error } = await supabase
      .from('cot_etapas')
      .insert(etapas.map((e, i) => ({ ...e, viajero_cot_id, orden: i })))
      .select();

    if (error) throw error;
    return (data || []) as CotizacionEtapa[];
  },

  // ── Helper: generate folio ────────────────────────────────────────────────

  async generateFolio(): Promise<string> {
    const year = new Date().getFullYear();
    const tenantId = await getActiveTenantId();
    const { count } = await supabase
      .from('viajeros_cotizacion')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const num = String((count || 0) + 1).padStart(3, '0');
    return `COT-${year}-${num}`;
  },
};
