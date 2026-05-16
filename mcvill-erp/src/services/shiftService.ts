import { supabase } from '../lib/supabase';

export interface WorkShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  is_active: boolean;
  tenant_id: string;
}

export const shiftService = {
  async listShifts(): Promise<WorkShift[]> {
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getShiftById(id: string): Promise<WorkShift | null> {
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createShift(shift: Partial<WorkShift>) {
    const { data, error } = await supabase
      .from('work_shifts')
      .insert([shift])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateShift(id: string, shift: Partial<WorkShift>) {
    const { data, error } = await supabase
      .from('work_shifts')
      .update(shift)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
