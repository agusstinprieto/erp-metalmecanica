import { supabase } from '../lib/supabase';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  minutes_worked: number | null;
  overtime_minutes: number;
  is_late: boolean;
  missing_checkout: boolean;
  status: string;
}

// Configuración por defecto (Fallback si no hay turno asignado)
const DEFAULT_LATE_HOUR = 8;
const DEFAULT_LATE_MINUTE = 30;
const DEFAULT_SHIFT_HOURS = 9;

export const attendanceService = {
  async getCurrentEmployee() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, tenant_id')
      .eq('id', user.id)
      .single();
    return data;
  },

  async getTodayRecord(employeeId: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('asistencia')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();
    return data as AttendanceRecord | null;
  },

  async checkIn(employeeId: string, employeeName: string, tenantId?: string): Promise<AttendanceRecord> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Obtener turno del empleado
    const { data: emp } = await supabase
      .from('empleados')
      .select('shift_id, work_shifts(*)')
      .eq('id', employeeId)
      .maybeSingle();

    let isLate = false;
    const shift = emp?.work_shifts;

    if (shift) {
      const [sH, sM] = shift.start_time.split(':').map(Number);
      const grace = shift.grace_period_minutes || 0;
      
      const checkInLimit = new Date(now);
      checkInLimit.setHours(sH, sM + grace, 0, 0);
      
      isLate = now > checkInLimit;
    } else {
      isLate = now.getHours() > DEFAULT_LATE_HOUR || (now.getHours() === DEFAULT_LATE_HOUR && now.getMinutes() > DEFAULT_LATE_MINUTE);
    }

    const { data, error } = await supabase
      .from('asistencia')
      .insert({
        employee_id: employeeId,
        employee_name: employeeName,
        tenant_id: tenantId ?? null,
        date: today,
        check_in: now.toISOString(),
        status: isLate ? 'late' : 'present',
        is_late: isLate,
        overtime_minutes: 0,
        missing_checkout: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as AttendanceRecord;
  },

  async checkOut(recordId: string, checkInIso: string): Promise<AttendanceRecord> {
    const now = new Date();
    const checkIn = new Date(checkInIso);
    const minutesWorked = Math.round((now.getTime() - checkIn.getTime()) / 60_000);
    
    // Obtener datos del empleado para ver su turno
    const { data: record } = await supabase
      .from('asistencia')
      .select('employee_id')
      .eq('id', recordId)
      .maybeSingle();
    
    const { data: emp } = await supabase
      .from('empleados')
      .select('work_shifts(*)')
      .eq('id', record?.employee_id)
      .maybeSingle();

    const shift = emp?.work_shifts;
    let overtimeMinutes = 0;
    let status = 'present';

    if (shift) {
      let [eH, eM] = shift.end_time.split(':').map(Number);
      
      // ⏰ McVill: Turno Nocturno Crossover & Especial Jueves a las 7:00 AM
      const checkInDay = checkIn.getDay(); // 0 = Domingo, 4 = Jueves
      const isNocturno = shift.name.toLowerCase().includes('nocturno');
      
      if (isNocturno && checkInDay === 4) {
        eH = 7;
        eM = 0;
      }

      const expectedEnd = new Date(checkIn);
      // Como es nocturno, la salida es al día siguiente
      if (isNocturno) {
        expectedEnd.setDate(expectedEnd.getDate() + 1);
      }
      expectedEnd.setHours(eH, eM, 0, 0);
      
      // Si salió después de su hora de salida, calculamos extras
      if (now > expectedEnd) {
        overtimeMinutes = Math.round((now.getTime() - expectedEnd.getTime()) / 60_000);
      }
      
      // Calcular minutos teóricos de la jornada
      const [sH, sM] = shift.start_time.split(':').map(Number);
      let shiftMinutes = 0;
      if (isNocturno) {
        // Entrada 19:00 -> Salida 06:30 o 07:00 del día siguiente
        const startMinutes = sH * 60 + sM;
        const endMinutes = (eH + 24) * 60 + eM;
        shiftMinutes = endMinutes - startMinutes;
      } else {
        shiftMinutes = (eH * 60 + eM) - (sH * 60 + sM);
      }
      
      if (minutesWorked < shiftMinutes * 0.9) status = 'incomplete';
    } else {
      overtimeMinutes = Math.max(0, minutesWorked - DEFAULT_SHIFT_HOURS * 60);
      if (minutesWorked < DEFAULT_SHIFT_HOURS * 60 * 0.9) status = 'incomplete';
    }

    const { data, error } = await supabase
      .from('asistencia')
      .update({
        check_out: now.toISOString(),
        minutes_worked: minutesWorked,
        overtime_minutes: overtimeMinutes,
        missing_checkout: false,
        status: status,
        updated_at: now.toISOString(),
      })
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return data as AttendanceRecord;
  },

  async getWeekRecords(employeeId: string): Promise<AttendanceRecord[]> {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const { data } = await supabase
      .from('asistencia')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: false });
    return (data ?? []) as AttendanceRecord[];
  },

  async getEmployeeByBadge(badgeCode: string) {
    const { data, error } = await supabase
      .from('empleados')
      .select('id, first_name, last_name, employee_number, tenant_id')
      .eq('employee_number', badgeCode.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async processScan(badgeCode: string): Promise<{
    action: 'check_in' | 'check_out' | 'already_complete' | 'not_found';
    employee?: { id: string; first_name: string; last_name: string; employee_number: string };
    record?: AttendanceRecord;
  }> {
    const employee = await this.getEmployeeByBadge(badgeCode);
    if (!employee) return { action: 'not_found' };

    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('asistencia')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .maybeSingle();

    if (existing?.check_out) {
      return { action: 'already_complete', employee, record: existing as AttendanceRecord };
    }

    if (existing?.check_in) {
      const record = await this.checkOut(existing.id, existing.check_in);
      return { action: 'check_out', employee, record };
    }

    const fullName = `${employee.first_name} ${employee.last_name}`;
    const record = await this.checkIn(employee.id, fullName, employee.tenant_id ?? undefined);
    return { action: 'check_in', employee, record };
  },
};
