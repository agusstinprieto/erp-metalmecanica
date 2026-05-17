import { supabase } from '../lib/supabase';

export interface EngineeringProject {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  version?: string;
  budget?: number;
  metadata: any;
  created_at: string;
}

export interface BOMItem {
  id: string;
  product_id?: string;
  project_id?: string;
  component_name: string;
  material_id?: string;
  quantity: number;
  unit: string;
  notes?: string;
  material?: {
    name: string;
    unit: string;
    current_stock: number;
  };
}

export interface TechnicalDoc {
  id: string;
  project_id: string;
  title: string;
  file_url: string;
  version: string;
  doc_type: string;
  created_at: string;
}

export interface LoteMaterial {
  id: string;
  tenant_id: string;
  numero_lote: string;
  material_id?: string;
  descripcion?: string;
  proveedor?: string;
  numero_colada?: string;
  fecha_recepcion?: string;
  cantidad_inicial: number;
  cantidad_disponible: number;
  unidad: string;
  cert_calidad_url?: string;
  status: 'disponible' | 'agotado' | 'cuarentena' | 'rechazado';
  notas?: string;
  created_at: string;
  material?: { name: string; unit: string };
}

export interface UsoLote {
  id: string;
  lote_id: string;
  viajero_id: string;
  material_id?: string;
  operacion?: string;
  cantidad_usada: number;
  registrado_por?: string;
  notas?: string;
  created_at: string;
  lote?: { numero_lote: string; descripcion?: string };
}

export interface RevisionHistorial {
  id: string;
  product_id: string;
  sku?: string;
  revision_anterior?: string;
  revision_nueva: string;
  descripcion_cambio?: string;
  motivo?: string;
  impacto?: string;
  fecha_cambio?: string;
  cambiado_por?: string;
  created_at: string;
  product?: { sku: string; name: string };
}

export const engineeringService = {
  async getProjects() {
    const { data, error } = await supabase
      .from('engineering_projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getProjectDetails(id: string) {
    const { data, error } = await supabase
      .from('engineering_projects')
      .select(`
        *,
        technical_docs (*),
        bom_items (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createProject(project: Partial<EngineeringProject>) {
    const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
    // In some cases we might not have a tenant table populated yet or RLS might block it.
    // If tenantData is found, we use it. If not, we proceed as it might be a single-tenant setup or handled by RLS.
    const projectToInsert = tenantData ? { ...project } : project;

    const { data, error } = await supabase
      .from('engineering_projects')
      .insert({ ...projectToInsert })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBOM(projectId: string) {
    const { data, error } = await supabase
      .from('bom_items')
      .select(`
        *,
        material:suministros (name, unit, current_stock)
      `)
      .eq('project_id', projectId);
    
    if (error) throw error;
    return data;
  },

  async addBOMItem(item: Partial<BOMItem>) {
    const { data, error } = await supabase
      .from('bom_items')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async addBOMItems(items: Partial<BOMItem>[]) {
    const { data, error } = await supabase
      .from('bom_items')
      .insert(items)
      .select();
    
    if (error) throw error;
    return data;
  },

  async removeBOMItem(id: string) {
    const { error } = await supabase
      .from('bom_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getDocs(projectId: string) {
    const { data, error } = await supabase
      .from('technical_docs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async updateProject(id: string, updates: Partial<EngineeringProject>) {
    const { data, error } = await supabase
      .from('engineering_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteProject(id: string) {
    const { error } = await supabase
      .from('engineering_projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ─── Lotes de Material ──────────────────────────────────────────────────────

  async getLotes() {
    const { data, error } = await supabase
      .from('lotes_materiales')
      .select('*, material:suministros(name, unit)')
      .order('created_at', { ascending: false });
    if (error) return [] as LoteMaterial[];
    return (data || []) as LoteMaterial[];
  },

  async createLote(lote: Partial<LoteMaterial>, tenantId: string) {
    const { data, error } = await supabase
      .from('lotes_materiales')
      .insert({ ...lote, tenant_id: tenantId })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateLote(id: string, updates: Partial<LoteMaterial>) {
    const { data, error } = await supabase
      .from('lotes_materiales').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteLote(id: string) {
    const { error } = await supabase.from('lotes_materiales').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Trazabilidad Uso de Lote ────────────────────────────────────────────────

  async getUsoLotes() {
    const { data, error } = await supabase
      .from('trazabilidad_uso_lote')
      .select('*, lote:lotes_materiales(numero_lote, descripcion)')
      .order('created_at', { ascending: false });
    if (error) return [] as UsoLote[];
    return (data || []) as UsoLote[];
  },

  async getUsoByLote(loteId: string) {
    const { data, error } = await supabase
      .from('trazabilidad_uso_lote')
      .select('*, lote:lotes_materiales(numero_lote, descripcion)')
      .eq('lote_id', loteId)
      .order('created_at', { ascending: false });
    if (error) return [] as UsoLote[];
    return (data || []) as UsoLote[];
  },

  async getUsoByViajero(viajeroId: string) {
    const { data, error } = await supabase
      .from('trazabilidad_uso_lote')
      .select('*, lote:lotes_materiales(numero_lote, descripcion, proveedor, numero_colada)')
      .eq('viajero_id', viajeroId)
      .order('created_at', { ascending: false });
    if (error) return [] as UsoLote[];
    return (data || []) as UsoLote[];
  },

  async createUsoLote(uso: Partial<UsoLote>, tenantId: string) {
    const { data, error } = await supabase
      .from('trazabilidad_uso_lote')
      .insert({ ...uso, tenant_id: tenantId })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateUsoLote(id: string, updates: Partial<UsoLote>) {
    const { data, error } = await supabase
      .from('trazabilidad_uso_lote').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteUsoLote(id: string) {
    const { error } = await supabase.from('trazabilidad_uso_lote').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Historial de Revisiones ─────────────────────────────────────────────────

  async getRevisionHistory() {
    const { data, error } = await supabase
      .from('product_revision_history')
      .select('*, product:productos(sku, name)')
      .order('created_at', { ascending: false });
    if (error) return [] as RevisionHistorial[];
    return (data || []) as RevisionHistorial[];
  },

  async getRevisionsByProduct(productId: string) {
    const { data, error } = await supabase
      .from('product_revision_history')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) return [] as RevisionHistorial[];
    return (data || []) as RevisionHistorial[];
  },

  async createRevision(rev: Partial<RevisionHistorial>, tenantId: string) {
    const { data, error } = await supabase
      .from('product_revision_history')
      .insert({ ...rev, tenant_id: tenantId })
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateRevision(id: string, updates: Partial<RevisionHistorial>) {
    const { data, error } = await supabase
      .from('product_revision_history').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteRevision(id: string) {
    const { error } = await supabase.from('product_revision_history').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Productos (para selects) ────────────────────────────────────────────────

  async getProducts() {
    const { data } = await supabase.from('productos').select('id, sku, name, revision').order('sku');
    return data || [];
  },

  async getMaterials() {
    const { data } = await supabase.from('suministros').select('id, name, unit').order('name');
    return data || [];
  },
};

