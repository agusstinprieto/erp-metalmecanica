import { supabase } from '../lib/supabase';
import { auditService } from './auditService';

export interface TenantConfig {
  gemini_api_key?: string;
  deepseek_api_key?: string;
  together_api_key?: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
  qwen_api_key?: string;
  github_api_key?: string;
  brand_name?: string;
  system_name?: string;
  slogan?: string;
  primary_color?: string;
  selected_api?: string;
  whatsapp_api_key?: string;
  whatsapp_phone_id?: string;
  resend_api_key?: string;
  google_client_id?: string;
  teams_tenant_id?: string;
  teams_client_id?: string;
  teams_webhook_url?: string;
  theme_color?: string;
  theme_color_light?: string;
  theme_name?: 'blue' | 'slate' | 'emerald';
}

const CEO_ROLES = new Set(['ceo', 'admin']);

async function getCurrentUserRole(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) throw new Error('Perfil de usuario no encontrado.');
  return profile.role as string;
}

export const tenantService = {
  async getConfig() {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id,config')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!tenant) throw new Error('No tenant configured');
    return { ...tenant.config, id: tenant.id } as TenantConfig & { id: string };
  },

  async updateConfig(config: Partial<TenantConfig>) {
    // Verificar permisos en el cliente antes de llamar al servidor
    // La RLS en Supabase también lo refuerza en el servidor como segunda capa
    const role = await getCurrentUserRole();
    if (!CEO_ROLES.has(role.toLowerCase())) {
      throw new Error('Permisos insuficientes: solo CEO o Admin puede modificar la configuración.');
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id,config')
      .limit(1)
      .maybeSingle();

    if (!tenant) throw new Error('No tenant found');

    const currentConfig = tenant.config || {};
    const newConfig = { ...currentConfig, ...config };

    const { error } = await supabase
      .from('tenants')
      .update({ config: newConfig })
      .eq('id', tenant.id);

    if (error) throw error;

    await auditService.log('UPDATE_CONFIG', 'system', tenant.id, {
      fieldsUpdated: Object.keys(config),
    });
  },
};
