import { supabase } from '../lib/supabase';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export const auditService = {
  /**
   * Registra una acción en el log de auditoría.
   */
  async log(action: string, entityType: string, entityId?: string, metadata: any = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Obtener tenant_id del perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      console.warn('⚠️ [Audit] Intento de logueo omitido: Perfil sin tenant_id.');
      return;
    }

    const { error } = await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata
    });

    if (error) {
      if (error.code === '42501') {
        console.warn('⚠️ [Audit] Permiso denegado (403) para escribir en audit_logs.');
      } else {
        console.error('❌ [Audit] Error logging audit action:', error.message);
      }
    }
  },

  /**
   * Obtiene los logs de auditoría para el tenant.
   */
  async getLogs(limit = 50) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }

    if (!data || data.length === 0) return [];

    // audit_logs.user_id → auth.users, no hay FK directo a profiles,
    // así que hacemos un segundo query para enriquecer con datos del perfil
    const userIds = [...new Set(data.map((l: any) => l.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

    return data.map((log: any) => ({
      ...log,
      profiles: profileMap[log.user_id] ?? undefined,
    })) as AuditLog[];
  }
};
