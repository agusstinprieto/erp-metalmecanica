import { supabase, getActiveTenantId } from '../lib/supabase';

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  rfc: string;
  curp: string;
  nss: string;
  job_title: string;
  department: string;
  hire_date: string;
  daily_salary: number;
  monthly_salary?: number;
  contract_type?: string;
  benefits?: string[];
  status: 'active' | 'inactive' | 'vacation' | 'medical_leave' | 'on_leave';
  photo_url?: string;
  documents?: Record<string, string>;
  shift_id?: string;
  // CategorÃ­a para vincular automÃ¡ticamente con mÃ³dulo de DesempeÃ±o
  tipo_empleado?: string;        // administrativo | supervisor | operador | almacenista | mantenimiento | vigilancia
  celula_operador?: string;      // CORTE | SOLDADURA | MAQUINADO | ENSAMBLE | PINTURA
  turno_operador?: string;       // matutino | vespertino | nocturno
  puesto_operador?: string;      // Soldador Senior, Operador CNC, etc.
  notes?: string;                // Notas especiales del colaborador
}

export const employeeService = {
  /**
   * Obtiene todos los empleados del tenant activo.
   */
  async listEmployees() {
    const MCVILL_TENANT = 'c89d6183-5f66-48dd-8b66-2b8b6b993e61';
    const tenantId = await getActiveTenantId();

    // Intento 1: filtrar por tenant activo
    const { data, error } = await supabase
      .from('empleados')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('employee_number', { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) return data as Employee[];

    // Intento 2: filtrar por tenant McVill principal (si el activo era diferente)
    if (tenantId !== MCVILL_TENANT) {
      const { data: d2, error: e2 } = await supabase
        .from('empleados')
        .select('*')
        .eq('tenant_id', MCVILL_TENANT)
        .order('employee_number', { ascending: true });
      if (!e2 && d2 && d2.length > 0) return d2 as Employee[];
    }

    // Intento 3: sin filtro de tenant (todos los empleados visibles por RLS)
    const { data: d3, error: e3 } = await supabase
      .from('empleados')
      .select('*')
      .order('employee_number', { ascending: true });
    if (!e3 && d3) return d3 as Employee[];

    return [] as Employee[];
  },

  /**
   * Crea un nuevo empleado.
   */
  async createEmployee(employee: Partial<Employee>) {
    const tenantId = await getActiveTenantId();

    const { data, error } = await supabase
      .from('empleados')
      .insert({ ...employee, tenant_id: tenantId })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      throw error;
    }

    return data as Employee;
  },

  /**
   * Actualiza un empleado existente.
   */
  async updateEmployee(id: string, updates: Partial<Employee>) {
    const { data, error } = await supabase
      .from('empleados')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }

    return data as Employee;
  },

  /**
   * Elimina un empleado.
   */
  async deleteEmployee(id: string) {
    const { error } = await supabase
      .from('empleados')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  /**
   * Sube una foto de empleado al almacenamiento de Supabase.
   */
  async uploadPhoto(employeeId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `employee-photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Sube un documento del expediente digital.
   */
  async uploadDocument(employeeId: string, docType: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}-${docType}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `employee-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading document:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
    return data.publicUrl;
  }
};
