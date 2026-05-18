import { supabase, getActiveTenantId } from '../lib/supabase';

export interface WorkShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  is_active: boolean;
  tenant_id: string;
}

const DEFAULT_SHIFTS = [
  { name: 'Matutino',   start_time: '06:00:00', end_time: '14:00:00', grace_period_minutes: 10, is_active: true },
  { name: 'Vespertino', start_time: '14:00:00', end_time: '22:00:00', grace_period_minutes: 10, is_active: true },
  { name: 'Nocturno',   start_time: '22:00:00', end_time: '06:00:00', grace_period_minutes: 10, is_active: true },
];

export const shiftService = {
  async listShifts(): Promise<WorkShift[]> {
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Tabla vacía — sembrar turnos estándar automáticamente
    if (!data || data.length === 0) {
      const tenantId = await getActiveTenantId();
      const toInsert = DEFAULT_SHIFTS.map(s => ({ ...s, tenant_id: tenantId }));

      const { data: seeded, error: seedErr } = await supabase
        .from('work_shifts')
        .insert(toInsert)
        .select();

      if (!seedErr && seeded && seeded.length > 0) return seeded;

      // Sin permisos de INSERT — devolver fallback local para que el dropdown funcione
      return toInsert.map((s, i) => ({ ...s, id: `local-${i}` })) as WorkShift[];
    }

    return data;
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
