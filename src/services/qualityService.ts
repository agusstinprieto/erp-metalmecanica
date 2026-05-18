import { supabase } from '../lib/supabase';

export interface QualityInspection {
  id: string;
  tenant_id: string;
  product_code?: string;
  product_name?: string;
  batch_number?: string;
  inspector_id?: string;
  inspector_name?: string;
  inspection_date?: string;
  quantity_inspected?: number;
  quantity_passed?: number;
  quantity_failed?: number;
  defect_types?: string[];
  defect_notes?: string;
  status: 'passed' | 'failed';
  created_at: string;
  // legacy join field (may be present when fetched via getInspections)
  production_orders?: { order_number?: string; product_name?: string } | null;
}

export interface NoConformidad {
  id: string;
  tenant_id: string;
  numero: string;
  inspection_id?: string;
  tipo: 'proceso' | 'producto' | 'sistema' | 'proveedor';
  descripcion: string;
  origen: 'inspeccion' | 'auditoria' | 'cliente' | 'produccion';
  responsable?: string;
  area?: string;
  severidad: 'menor' | 'mayor' | 'critica';
  causa_raiz?: string;
  accion_correctiva?: string;
  accion_preventiva?: string;
  fecha_compromiso?: string;
  fecha_cierre?: string;
  status: 'abierta' | 'en_proceso' | 'verificacion' | 'cerrada';
  notas?: string;
  created_at: string;
}

export interface AuditoriaInterna {
  id: string;
  tenant_id: string;
  numero: string;
  tipo: 'proceso' | 'sistema' | 'producto' | 'proveedor';
  alcance: string;
  auditor?: string;
  area_auditada?: string;
  fecha_programada?: string;
  fecha_realizada?: string;
  hallazgos?: string;
  no_conformidades_encontradas: number;
  observaciones?: string;
  status: 'programada' | 'en_proceso' | 'completada' | 'cerrada';
  resultado: 'pendiente' | 'conforme' | 'no_conforme' | 'observado';
  notas?: string;
  created_at: string;
}

export const qualityService = {
  // ─── Inspections ────────────────────────────────────────────────────────────

  async getInspections() {
    const [qiRes, woRes, epRes] = await Promise.all([
      supabase.from('quality_inspections').select('*').order('created_at', { ascending: false }),
      supabase.from('ordenes_trabajo').select('id, order_number, project_id'),
      supabase.from('engineering_projects').select('id, title')
    ]);

    if (qiRes.error) throw qiRes.error;

    const epMap = new Map((epRes.data || []).map(ep => [ep.id, ep]));
    const woMap = new Map((woRes.data || []).map(wo => [
      wo.id,
      { ...wo, product_name: epMap.get(wo.project_id)?.title }
    ]));

    return (qiRes.data || []).map(qi => ({
      ...qi,
      production_orders: woMap.get(qi.order_id) || null
    }));
  },

  async getProductionOrders() {
    const [woRes, epRes] = await Promise.all([
      supabase.from('ordenes_trabajo').select('id, order_number, project_id').order('order_number', { ascending: false }),
      supabase.from('engineering_projects').select('id, title')
    ]);
    if (woRes.error) throw woRes.error;
    const epMap = new Map((epRes.data || []).map(ep => [ep.id, ep]));
    return (woRes.data || []).map(wo => ({
      id: wo.id,
      order_number: wo.order_number,
      product_name: epMap.get(wo.project_id)?.title || 'PROYECTO SIN TÍTULO'
    }));
  },

  async createInspection(inspection: Partial<QualityInspection>) {
    const { data: tenantData } = await supabase.from('tenants').select('id').single();
    if (!tenantData) throw new Error('No active tenant found');
    const { data, error } = await supabase
      .from('quality_inspections')
      .insert({ ...inspection, tenant_id: tenantData.id })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateInspection(id: string, updates: Partial<QualityInspection>) {
    const { data, error } = await supabase
      .from('quality_inspections').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteInspection(id: string) {
    const { error } = await supabase.from('quality_inspections').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── No Conformidades ───────────────────────────────────────────────────────

  async getNoConformidades() {
    const { data, error } = await supabase
      .from('no_conformidades')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createNoConformidad(nc: Partial<NoConformidad>, tenantId: string) {
    const { data, error } = await supabase
      .from('no_conformidades')
      .insert({ ...nc, tenant_id: tenantId })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateNoConformidad(id: string, updates: Partial<NoConformidad>) {
    const { data, error } = await supabase
      .from('no_conformidades').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteNoConformidad(id: string) {
    const { error } = await supabase.from('no_conformidades').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Auditorías Internas ────────────────────────────────────────────────────

  async getAuditorias() {
    const { data, error } = await supabase
      .from('auditorias_internas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createAuditoria(audit: Partial<AuditoriaInterna>, tenantId: string) {
    const { data, error } = await supabase
      .from('auditorias_internas')
      .insert({ ...audit, tenant_id: tenantId })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateAuditoria(id: string, updates: Partial<AuditoriaInterna>) {
    const { data, error } = await supabase
      .from('auditorias_internas').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteAuditoria(id: string) {
    const { error } = await supabase.from('auditorias_internas').delete().eq('id', id);
    if (error) throw error;
  },
};
