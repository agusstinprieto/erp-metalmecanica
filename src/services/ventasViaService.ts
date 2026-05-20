// ─── Ventas Viajero Service ────────────────────────────────────────────────────

import { supabase, getActiveTenantId } from '../lib/supabase';
import type { VentasItem, VentasEtapa } from '../types/ventas';

export const ventasViaService = {
  // ── Ventas ──────────────────────────────────────────────────────────────────

  async getAll(): Promise<VentasItem[]> {
    const tenantId = await getActiveTenantId();
    const { data, error } = await supabase
      .from('viajeros_ventas')
      .select('*, etapas:ventas_etapas(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as VentasItem[];
  },

  async getById(id: string): Promise<VentasItem | null> {
    const { data, error } = await supabase
      .from('viajeros_ventas')
      .select('*, etapas:ventas_etapas(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as VentasItem;
  },

  async create(payload: Partial<VentasItem>): Promise<VentasItem> {
    const tenantId = await getActiveTenantId();
    const { data, error } = await supabase
      .from('viajeros_ventas')
      .insert({ ...payload, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data as VentasItem;
  },

  async update(id: string, payload: Partial<VentasItem>): Promise<VentasItem> {
    const { data, error } = await supabase
      .from('viajeros_ventas')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as VentasItem;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('viajeros_ventas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('viajeros_ventas')
      .delete()
      .in('id', ids);

    if (error) throw error;
  },

  // ── Etapas ──────────────────────────────────────────────────────────────────

  async getEtapas(viajero_venta_id: string): Promise<VentasEtapa[]> {
    const { data, error } = await supabase
      .from('ventas_etapas')
      .select('*')
      .eq('viajero_venta_id', viajero_venta_id)
      .order('orden', { ascending: true });

    if (error) throw error;
    return (data || []) as VentasEtapa[];
  },

  async upsertEtapas(
    viajero_venta_id: string,
    etapas: Omit<VentasEtapa, 'id' | 'created_at'>[]
  ): Promise<VentasEtapa[]> {
    // Delete existing and re-insert for simplicity
    await supabase
      .from('ventas_etapas')
      .delete()
      .eq('viajero_venta_id', viajero_venta_id);

    if (etapas.length === 0) return [];

    const { data, error } = await supabase
      .from('ventas_etapas')
      .insert(etapas.map((e, i) => ({ ...e, viajero_venta_id, orden: i })))
      .select();

    if (error) throw error;
    return (data || []) as VentasEtapa[];
  },

  // ── Helper: generate folio ───────────────────────────────────────────────

  async generateFolio(): Promise<string> {
    const year = new Date().getFullYear();
    const tenantId = await getActiveTenantId();
    const { count } = await supabase
      .from('viajeros_ventas')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const num = String((count || 0) + 1).padStart(3, '0');
    return `PV-${year}-${num}`;
  },
};
