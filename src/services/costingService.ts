import { supabase } from '../lib/supabase';

export interface Material {
  id: string;
  name: string;
  unit: string;
  unit_cost: number;
  category: string;
}

export interface CostingSimulation {
  id: string;
  project_name: string;
  client_name: string;
  material_cost: number;
  labor_cost: number;
  overhead_pct: number;
  profit_margin_pct: number;
  total_cost: number;
  suggested_price: number;
  status: 'draft' | 'quoted' | 'approved';
  created_at: string;
}

export const costingService = {
  /**
   * Obtiene la lista de materiales base.
   */
  async listMaterials() {
    const { data, error } = await supabase
      .from('suministros')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Material[];
  },

  /**
   * Obtiene las simulaciones de costeo realizadas.
   */
  async listSimulations() {
    const { data, error } = await supabase
      .from('costing_simulations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CostingSimulation[];
  },

  /**
   * Guarda una nueva simulación de costeo.
   */
  async saveSimulation(simulation: Partial<CostingSimulation>) {
    const { data: tenantData } = await supabase.from('tenants').select('id').single();
    if (!tenantData) throw new Error('No active tenant found');

    const { data, error } = await supabase
      .from('costing_simulations')
      .insert({ ...simulation, tenant_id: tenantData.id })
      .select()
      .single();

    if (error) throw error;
    return data as CostingSimulation;
  },

  /**
   * Elimina una simulación.
   */
  async deleteSimulation(id: string) {
    const { error } = await supabase
      .from('costing_simulations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Actualiza una simulación existente.
   */
  async updateSimulation(id: string, updates: Partial<CostingSimulation>) {
    const { data, error } = await supabase
      .from('costing_simulations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CostingSimulation;
  }
};
