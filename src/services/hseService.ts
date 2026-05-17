import { supabase } from '../lib/supabase';

export interface HSECourse {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  duration_hours: number;
  category: string;
  validity_months: number;
  created_at: string;
}

export interface HSECertification {
  id: string;
  employee_id: string;
  course_id: string;
  issue_date: string;
  expiry_date: string;
  document_url: string;
  status: 'active' | 'expired' | 'pending';
  employee_name?: string;
  course_title?: string;
}

export interface HSEIncident {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  location: string;
  incident_date: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  involved_employees: string[];
  corrective_actions: string;
  photos_url: string[];
}

export const hseService = {
  async getCourses() {
    const { data, error } = await supabase
      .from('hse_courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as HSECourse[];
  },

  async getCertifications() {
    // Intento 1: con join a employees (Estándar de la BD real)
    const { data, error } = await supabase
      .from('hse_certifications')
      .select(`
        *,
        employees (first_name, last_name),
        hse_courses (title)
      `)
      .order('expiry_date', { ascending: true });
    
    if (!error && data) {
      return data.map((cert: any) => ({
        ...cert,
        employee_name: cert.employees ? `${cert.employees.first_name} ${cert.employees.last_name}` : 'N/A',
        course_title: cert.hse_courses?.title
      })) as HSECertification[];
    }

    // Intento 2: con join a empleados
    const { data: dataEmp, error: errorEmp } = await supabase
      .from('hse_certifications')
      .select(`
        *,
        empleados (first_name, last_name),
        hse_courses (title)
      `)
      .order('expiry_date', { ascending: true });

    if (!errorEmp && dataEmp) {
      return dataEmp.map((cert: any) => ({
        ...cert,
        employee_name: cert.empleados ? `${cert.empleados.first_name} ${cert.empleados.last_name}` : 'N/A',
        course_title: cert.hse_courses?.title
      })) as HSECertification[];
    }

    // Intento 3: simple sin joins por si fallan las FKs
    const { data: dataSimple, error: errorSimple } = await supabase
      .from('hse_certifications')
      .select('*')
      .order('expiry_date', { ascending: true });

    if (!errorSimple && dataSimple) {
      return dataSimple.map((cert: any) => ({
        ...cert,
        employee_name: 'N/A',
        course_title: 'N/A'
      })) as HSECertification[];
    }

    return [];
  },

  async getIncidents() {
    const { data, error } = await supabase
      .from('hse_incidents')
      .select('*')
      .order('incident_date', { ascending: false });
    if (error) throw error;
    return data as HSEIncident[];
  },

  async createIncident(incident: Omit<HSEIncident, 'id' | 'tenant_id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('No profile found');

    const { data, error } = await supabase
      .from('hse_incidents')
      .insert({
        ...incident,
        tenant_id: profile.tenant_id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateIncident(id: string, updates: Partial<HSEIncident>) {
    const { data, error } = await supabase
      .from('hse_incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteIncident(id: string) {
    const { error } = await supabase
      .from('hse_incidents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async createCourse(course: Omit<HSECourse, 'id' | 'tenant_id' | 'created_at'>) {
    const { data: profile } = await supabase.from('profiles').select('tenant_id').single();
    const { data, error } = await supabase.from('hse_courses').insert({
      ...course,
      tenant_id: profile?.tenant_id || 'mcvill'
    }).select().single();
    if (error) throw error;
    return data;
  },

  async updateCourse(id: string, updates: Partial<HSECourse>) {
    const { data, error } = await supabase.from('hse_courses').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCourse(id: string) {
    const { error } = await supabase.from('hse_courses').delete().eq('id', id);
    if (error) throw error;
  },

  async createCertification(cert: Omit<HSECertification, 'id'>) {
    const { data, error } = await supabase.from('hse_certifications').insert(cert).select().single();
    if (error) throw error;
    return data;
  },

  async updateCertification(id: string, updates: Partial<HSECertification>) {
    const { data, error } = await supabase.from('hse_certifications').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCertification(id: string) {
    const { error } = await supabase.from('hse_certifications').delete().eq('id', id);
    if (error) throw error;
  }
};
