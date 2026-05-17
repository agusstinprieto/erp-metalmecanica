import { supabase } from '../lib/supabase';

const getTenantId = async (): Promise<string | undefined> => {
  const { data } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
  return data?.id;
};

export interface EmployeeSkill {
  id: string;
  tenant_id?: string;
  employee_id: string;
  skill_name: string;
  skill_level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  certified: boolean;
  certification_date: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  employee_id: string;
  certification_type: string;
  provider: string | null;
  issue_date: string;
  expiration_date: string;
  status: 'active' | 'expired' | 'pending_renewal';
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EPPDelivery {
  id: string;
  employee_id: string;
  epp_item: string;
  quantity: number;
  delivery_date: string;
  condition_at_delivery: 'new' | 'good' | 'fair';
  return_date: string | null;
  return_condition: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const rhService = {
  async getEmployeeSkills(employeeId: string) {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('employee_skills')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('tenant_id', tenantId)
      .order('skill_name');

    if (error) throw error;
    return data as EmployeeSkill[];
  },

  async addEmployeeSkill(skill: Partial<EmployeeSkill>) {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('employee_skills')
      .insert({ ...skill, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data as EmployeeSkill;
  },

  async updateEmployeeSkill(id: string, updates: Partial<EmployeeSkill>) {
    const { data, error } = await supabase
      .from('employee_skills')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EmployeeSkill;
  },

  async deleteEmployeeSkill(id: string) {
    const { error } = await supabase
      .from('employee_skills')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getCertifications(employeeId: string) {
    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('employee_id', employeeId)
      .order('expiration_date');

    if (error) throw error;
    return data as Certification[];
  },

  async getExpiringCertifications(daysBeforeExpiry: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);
    
    const { data, error } = await supabase
      .from('certifications')
      .select('*, employees(first_name, last_name, employee_number)')
      .lte('expiration_date', futureDate.toISOString().split('T')[0])
      .eq('status', 'active')
      .order('expiration_date');

    if (error) throw error;
    return data as any[];
  },

  async addCertification(cert: Partial<Certification>) {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('certifications')
      .insert({ ...cert, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data as Certification;
  },

  async updateCertification(id: string, updates: Partial<Certification>) {
    const { data, error } = await supabase
      .from('certifications')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Certification;
  },

  async deleteCertification(id: string) {
    const { error } = await supabase
      .from('certifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getEPPDeliveries(employeeId: string) {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('epp_deliveries')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('tenant_id', tenantId)
      .order('delivery_date', { ascending: false });

    if (error) throw error;
    return data as EPPDelivery[];
  },

  async addEPPDelivery(delivery: Partial<EPPDelivery>) {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('epp_deliveries')
      .insert({ ...delivery, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data as EPPDelivery;
  },

  async returnEPP(id: string, returnCondition: string, notes?: string) {
    const { data, error } = await supabase
      .from('epp_deliveries')
      .update({
        return_date: new Date().toISOString().split('T')[0],
        return_condition: returnCondition,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EPPDelivery;
  },

  async deleteEPPDelivery(id: string) {
    const { error } = await supabase
      .from('epp_deliveries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
