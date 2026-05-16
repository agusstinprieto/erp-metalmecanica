import { supabase } from '../lib/supabase';
import type { Employee } from './employeeService';

export interface AttendanceSummary {
  employee_number: string;
  days_present: number;
  days_absent: number;
  days_late: number;
  hours_worked: number;
  overtime_hours: number;
}

export interface Payroll {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  days_worked: number;
  hours_worked: number;
  overtime_hours: number;
  overtime_amount: number;
  bonus_oee: number;
  deductions_absence: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  status: 'draft' | 'calculated' | 'approved' | 'paid';
  payment_date?: string;
  empleados?: Partial<Employee>;
}

// Configuración de nómina
const HOURLY_RATE_MULTIPLIER = 2;
const OEE_BONUS_THRESHOLD = 85;
const OEE_BONUS_PCT = 0.05;
const DAILY_WAGE = 450;

// ─── ISR Tarifa mensual 2026 (SAT Art. 96 LISR) ──────────────────────────────
const ISR_TABLE = [
  { li: 0,           ls: 7735.00,      cuota: 0,           pct: 0.0192 },
  { li: 7735.01,     ls: 65651.07,     cuota: 148.51,      pct: 0.0640 },
  { li: 65651.08,    ls: 115375.90,    cuota: 3844.66,     pct: 0.1088 },
  { li: 115375.91,   ls: 134119.41,    cuota: 9264.97,     pct: 0.1600 },
  { li: 134119.42,   ls: 160577.65,    cuota: 12254.93,    pct: 0.1792 },
  { li: 160577.66,   ls: 323862.00,    cuota: 18994.18,    pct: 0.2136 },
  { li: 323862.01,   ls: 510451.00,    cuota: 53854.20,    pct: 0.2352 },
  { li: 510451.01,   ls: 974535.03,    cuota: 97754.25,    pct: 0.3000 },
  { li: 974535.04,   ls: 1299380.04,   cuota: 236986.41,   pct: 0.3200 },
  { li: 1299380.05,  ls: Infinity,     cuota: 340946.91,   pct: 0.3400 },
];

// Subsidio al empleo mensual 2026 (Art. octavo transitorio LISR)
const SUBSIDIO_TABLE = [
  { li: 0.01,    ls: 1768.96,  subsidio: 407.02 },
  { li: 1768.97, ls: 2653.38,  subsidio: 406.83 },
  { li: 2653.39, ls: 3472.84,  subsidio: 406.62 },
  { li: 3472.85, ls: 3537.87,  subsidio: 392.77 },
  { li: 3537.88, ls: 4446.15,  subsidio: 382.46 },
  { li: 4446.16, ls: 4717.18,  subsidio: 354.23 },
  { li: 4717.19, ls: 5335.42,  subsidio: 324.87 },
  { li: 5335.43, ls: 6224.67,  subsidio: 294.63 },
  { li: 6224.68, ls: 7113.90,  subsidio: 253.54 },
  { li: 7113.91, ls: 7382.33,  subsidio: 217.61 },
  { li: 7382.34, ls: Infinity, subsidio: 0       },
];

function calcularISR(ingresoMensual: number): number {
  const fila = ISR_TABLE.find(r => ingresoMensual >= r.li && ingresoMensual <= r.ls);
  if (!fila) return 0;
  const isr = fila.cuota + (ingresoMensual - fila.li) * fila.pct;
  const subsidio = SUBSIDIO_TABLE.find(r => ingresoMensual >= r.li && ingresoMensual <= r.ls)?.subsidio ?? 0;
  return Math.max(0, isr - subsidio);
}

// IMSS cuotas obrero 2026: Invalidez y Vida (0.625%) + Cesantía y Vejez (1.125%)
// + Enfermedad y Maternidad excedente de 3 UMAs (0.40%)
const UMA_DIARIA_2026 = 108.57;
const TRES_UMAS_MENSUAL = UMA_DIARIA_2026 * 30.4 * 3; // ≈ $9,900

function calcularIMSSObrero(salarioMensual: number): number {
  const cuotaBase = salarioMensual * (0.00625 + 0.01125); // IV + CV
  const excedente = Math.max(0, salarioMensual - TRES_UMAS_MENSUAL);
  const cuotaEM   = excedente * 0.004; // Enfermedad y Maternidad sobre excedente
  return cuotaBase + cuotaEM;
}

export function desglosarDeducciones(grossSalary: number, absenceDeduction: number = 0) {
  const isr   = calcularISR(grossSalary);
  const imss  = calcularIMSSObrero(grossSalary);
  return {
    isr,
    imss,
    deductions_absence: absenceDeduction,
    total: isr + imss + absenceDeduction,
  };
}

// Fallback demo data cuando las tablas no existen aún
const DEMO_PAYROLLS: Payroll[] = [
  {
    id: 'demo-1', employee_id: 'e1',
    period_start: '2026-04-01', period_end: '2026-04-15',
    days_worked: 15, hours_worked: 120, overtime_hours: 0,
    overtime_amount: 0, bonus_oee: 0, deductions_absence: 0,
    gross_salary: 22500, deductions: 2700, net_salary: 19800, status: 'paid',
    empleados: { first_name: 'Carlos', last_name: 'Mendoza', job_title: 'Ing. de Producción' }
  },
  {
    id: 'demo-2', employee_id: 'e2',
    period_start: '2026-04-01', period_end: '2026-04-15',
    days_worked: 15, hours_worked: 120, overtime_hours: 4,
    overtime_amount: 900, bonus_oee: 0, deductions_absence: 0,
    gross_salary: 18000, deductions: 2160, net_salary: 15840, status: 'approved',
    empleados: { first_name: 'Ana', last_name: 'García', job_title: 'Supervisora HSE' }
  },
  {
    id: 'demo-3', employee_id: 'e3',
    period_start: '2026-04-01', period_end: '2026-04-15',
    days_worked: 14, hours_worked: 112, overtime_hours: 0,
    overtime_amount: 0, bonus_oee: 0, deductions_absence: 1100,
    gross_salary: 15400, deductions: 1848, net_salary: 13552, status: 'calculated',
    empleados: { first_name: 'Miguel', last_name: 'Torres', job_title: 'Operador CNC' }
  },
];

export const payrollService = {
  /**
   * Obtiene todas las nóminas. Intenta sin join si falla la relación.
   */
  async listPayrolls(): Promise<Payroll[]> {
    // Intento 1: con join a empleados (Estándar Agus Pro)
    const { data, error } = await supabase
      .from('nominas')
      .select(`
        *,
        empleados (
          first_name,
          last_name,
          rfc,
          job_title
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as Payroll[];
    }

    // Intento 2: Fallback a tablas en inglés (payrolls / employees)
    const { data: engData, error: engErr } = await supabase
      .from('payrolls')
      .select(`
        *,
        employees (
          first_name,
          last_name,
          rfc,
          job_title
        )
      `)
      .order('created_at', { ascending: false });

    if (!engErr && engData) {
      // Mapear employees a empleados para consistencia en UI
      return engData.map((p: any) => ({
        ...p,
        empleados: p.employees
      })) as Payroll[];
    }

    // Intento 3: Consulta simple sin joins (por si fallan las FKs)
    const { data: simple, error: simpleErr } = await supabase
      .from('nominas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!simpleErr && simple && simple.length > 0) return simple as Payroll[];

    // Fallback: datos demo si nada funciona
    console.warn('[payrollService] Tablas de nómina no encontradas, usando datos demo.');
    return DEMO_PAYROLLS;
  },

  /**
   * Calcula y genera una nómina con horas extras, bonos OEE y deducciones por faltas.
   */
  async calculateForEmployee(employee: Employee, options?: {
    days?: number;
    overtime_hours?: number;
    oee_percentage?: number;
    absences?: number;
    hourly_rate?: number;
  }): Promise<Payroll> {
    const days = options?.days || 15;
    const overtime_hours = options?.overtime_hours || 0;
    const oee_percentage = options?.oee_percentage || 0;
    const absences = options?.absences || 0;
    const hourly_rate = options?.hourly_rate || ((employee.daily_salary || DAILY_WAGE) / 8);
    
    // 1. Salario base
    const base_salary = (employee.daily_salary || DAILY_WAGE) * days;
    
    // 2. Horas extras (2x hora normal)
    const overtime_amount = overtime_hours * hourly_rate * HOURLY_RATE_MULTIPLIER;
    
    // 3. Bono OEE (5% si OEE > 85%)
    const bonus_oee = (oee_percentage >= OEE_BONUS_THRESHOLD) 
      ? (base_salary + overtime_amount) * OEE_BONUS_PCT 
      : 0;
    
    // 4. Deducciones por faltan (1 día de salario por cada falta)
    const deductions_absence = absences * (employee.daily_salary || DAILY_WAGE);
    
    // 5. ISR + IMSS obrero (tablas SAT/IMSS 2026)
    const gross_salary = base_salary + overtime_amount + bonus_oee;
    const { total: deductions } = desglosarDeducciones(gross_salary, deductions_absence);
    const net_salary = gross_salary - deductions;
    
    const hours_worked = (days * 8) + overtime_hours;

    const { data: tenantData } = await supabase.from('tenants').select('id').single();
    if (!tenantData) throw new Error('No active tenant found');

    const { data, error } = await supabase
      .from('nominas')
      .insert({
        tenant_id: tenantData.id,
        employee_id: employee.id,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        days_worked: days,
        hours_worked: hours_worked,
        overtime_hours: overtime_hours,
        overtime_amount: overtime_amount,
        bonus_oee: bonus_oee,
        deductions_absence: deductions_absence,
        gross_salary,
        deductions,
        net_salary,
        status: 'calculated'
      })
      .select()
      .single();

    if (error) {
      console.error('Error calculating payroll:', error);
      throw error;
    }

    return data as Payroll;
  },

  async updatePayroll(id: string, updates: Partial<Payroll>): Promise<void> {
    const { error } = await supabase
      .from('nominas')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deletePayroll(id: string): Promise<void> {
    const { error } = await supabase
      .from('nominas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Obtiene costo de mano de obra por proyecto.
   * Agrupa nóminas por employee y suma gross_salary por proyecto.
   */
  /**
   * Obtiene el resumen de asistencia real de la vista attendance_payroll_summary
   * para un grupo de empleados en un rango de fechas.
   * Retorna un mapa employee_number → AttendanceSummary.
   */
  async getAttendanceSummaryForPeriod(
    employeeNumbers: string[],
    periodStart: string,
    periodEnd: string
  ): Promise<Record<string, AttendanceSummary>> {
    if (employeeNumbers.length === 0) return {};

    const { data, error } = await supabase
      .from('attendance_records')
      .select('employee_id, status, minutes_worked, overtime_minutes')
      .in('employee_id', employeeNumbers)
      .gte('date', periodStart)
      .lte('date', periodEnd);

    if (error || !data) return {};

    const result: Record<string, AttendanceSummary> = {};

    for (const emp of employeeNumbers) {
      const records = data.filter(r => r.employee_id === emp);
      result[emp] = {
        employee_number: emp,
        days_present: records.filter(r => ['present', 'late'].includes(r.status)).length,
        days_absent:  records.filter(r => r.status === 'absent').length,
        days_late:    records.filter(r => r.status === 'late').length,
        hours_worked: Math.round(
          records.reduce((s, r) => s + (r.minutes_worked || 0), 0) / 60 * 10
        ) / 10,
        overtime_hours: Math.round(
          records.reduce((s, r) => s + (r.overtime_minutes || 0), 0) / 60 * 10
        ) / 10,
      };
    }

    return result;
  },

  async bulkSavePayrolls(calculations: any[]): Promise<void> {
    const { data: tenantData } = await supabase.from('tenants').select('id').single();
    if (!tenantData) throw new Error('No active tenant found');

    const payloads = calculations.map(calc => ({
      tenant_id: tenantData.id,
      employee_id: calc.employee_id,
      period_start: new Date().toISOString().split('T')[0], // TODO: use actual period
      period_end: new Date().toISOString().split('T')[0],
      days_worked: calc.worked_days,
      hours_worked: (calc.worked_days * 8) + calc.overtime_hours,
      overtime_hours: calc.overtime_hours,
      overtime_amount: calc.overtime_amount,
      bonus_oee: calc.bonus_oee,
      deductions_absence: calc.absences_discount,
      gross_salary: calc.gross_salary,
      deductions: calc.deduction_total,
      net_salary: calc.net_salary,
      status: 'calculated'
    }));

    const { error } = await supabase
      .from('nominas')
      .insert(payloads);

    if (error) throw error;
  },

  async getLaborCostByProject(projectId: string): Promise<{
    total_labor_cost: number;
    employees_cost: { employee_id: string; name: string; cost: number }[];
    details: { employee_id: string; name: string; gross: number; bonus_oee: number; overtime: number }[];
  }> {
    // Get employees who worked on this project (from work_orders)
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('id, assigned_to')
      .eq('project_id', projectId);

    if (!workOrders || workOrders.length === 0) {
      return { total_labor_cost: 0, employees_cost: [], details: [] };
    }

    const employeeIds = [...new Set(workOrders.map(wo => wo.assigned_to).filter(Boolean))];

    // Get their payrolls
    const { data: payrolls } = await supabase
      .from('nominas')
      .select(`
        employee_id,
        gross_salary,
        bonus_oee,
        overtime_amount,
        empleados (first_name, last_name)
      `)
      .in('employee_id', employeeIds);

    if (!payrolls) {
      return { total_labor_cost: 0, employees_cost: [], details: [] };
    }

    const employeesMap: Record<string, { name: string; cost: number }> = {};
    const details: { employee_id: string; name: string; gross: number; bonus_oee: number; overtime: number }[] = [];
    let total = 0;

    for (const p of payrolls) {
      const emp = Array.isArray(p.empleados) ? p.empleados[0] : p.empleados;
      const name = `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim();
      const cost = Number(p.gross_salary);
      total += cost;
      
      if (employeesMap[p.employee_id]) {
        employeesMap[p.employee_id].cost += cost;
      } else {
        employeesMap[p.employee_id] = { name, cost };
      }

      details.push({
        employee_id: p.employee_id,
        name,
        gross: cost,
        bonus_oee: Number(p.bonus_oee || 0),
        overtime: Number(p.overtime_amount || 0)
      });
    }

    return {
      total_labor_cost: total,
      employees_cost: Object.entries(employeesMap).map(([id, v]) => ({ employee_id: id, ...v })),
      details
    };
  }
};
