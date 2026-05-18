import { supabase, getActiveTenantId } from '../lib/supabase';

export interface WorkShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  is_active: boolean;
  tenant_id: string;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
}

const DEFAULT_SHIFTS = [
  { name: 'Matutino',   start_time: '06:00:00', end_time: '14:00:00', grace_period_minutes: 10, is_active: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
  { name: 'Vespertino', start_time: '14:00:00', end_time: '22:00:00', grace_period_minutes: 10, is_active: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
  { name: 'Nocturno',   start_time: '22:00:00', end_time: '06:00:00', grace_period_minutes: 10, is_active: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
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

    const mapDays = (s: any): WorkShift => ({
      ...s,
      monday: s.monday !== false,
      tuesday: s.tuesday !== false,
      wednesday: s.wednesday !== false,
      thursday: s.thursday !== false,
      friday: s.friday !== false,
      saturday: !!s.saturday,
      sunday: !!s.sunday
    });

    return data.map(mapDays);
  },

  async getShiftById(id: string): Promise<WorkShift | null> {
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      monday: data.monday !== false,
      tuesday: data.tuesday !== false,
      wednesday: data.wednesday !== false,
      thursday: data.thursday !== false,
      friday: data.friday !== false,
      saturday: !!data.saturday,
      sunday: !!data.sunday
    };
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
