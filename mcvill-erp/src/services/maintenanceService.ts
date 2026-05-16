import { supabase } from '../lib/supabase';

export interface Machine {
  id: string;
  name: string;
  status: 'operational' | 'warning' | 'maintenance';
  usage: number;
  next_maintenance: string;
  health: number;
  critical: boolean;
  purchase_date?: string;
  warranty_expiration?: string;
  cost?: number;
  spare_parts?: string[];
  manual_url?: string;
  created_at?: string;
}

export const maintenanceService = {
  async listMachines(): Promise<Machine[]> {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching machines:', error);
      // Return demo data if table doesn't exist
      return [
        { id: 'M-001', name: 'CNC Haas VF-2', status: 'operational', usage: 1240, next_maintenance: '2026-05-10', health: 85, critical: false },
        { id: 'M-002', name: 'Soldadora Robótica Kuka', status: 'warning', usage: 4500, next_maintenance: '2026-04-28', health: 62, critical: true },
        { id: 'M-003', name: 'Prensa Hidráulica 200T', status: 'maintenance', usage: 8900, next_maintenance: '2026-04-25', health: 45, critical: true },
      ] as Machine[];
    }
    
    return data.map(m => ({
      ...m,
      next_maintenance: m.next_maintenance || new Date().toISOString()
    })) as Machine[];
  },

  async createMachine(machine: Partial<Machine>): Promise<void> {
    const { data: tenant } = await supabase.from('tenants').select('id').single();
    if (!tenant) throw new Error('No active tenant found');

    const { error } = await supabase
      .from('machines')
      .insert({ ...machine, tenant_id: tenant.id });

    if (error) throw error;
  },

  async updateMachine(id: string, updates: Partial<Machine>): Promise<void> {
    const { error } = await supabase
      .from('machines')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteMachine(id: string): Promise<void> {
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
