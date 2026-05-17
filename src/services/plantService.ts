import { supabase } from '../lib/supabase';

export interface Planta {
  id: string;
  tenant_id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  pais: string;
  responsable: string | null;
  activa: boolean;
  created_at?: string;
}

export const plantService = {
  async listPlants(): Promise<Planta[]> {
    const { data, error } = await supabase
      .from('plantas')
      .select('*')
      .order('codigo');
    
    if (error) {
      console.error('Error listing plants:', error);
      throw error;
    }
    return data || [];
  },

  async createPlant(plant: Partial<Planta>): Promise<Planta> {
    // Get active tenant id
    const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
    const tenant_id = tenant?.id;

    const { data, error } = await supabase
      .from('plantas')
      .insert([{ ...plant, tenant_id }])
      .select()
      .single();

    if (error) {
      console.error('Error creating plant:', error);
      throw error;
    }
    return data;
  },

  async updatePlant(id: string, plant: Partial<Planta>): Promise<Planta> {
    const { data, error } = await supabase
      .from('plantas')
      .update(plant)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating plant:', error);
      throw error;
    }
    return data;
  }
};
