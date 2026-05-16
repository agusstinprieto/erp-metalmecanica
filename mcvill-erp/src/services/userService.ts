import { supabase, registerNewUser } from '../lib/supabase';
import { auditService } from './auditService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

export interface CreateUserParams {
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  role: string;
  tenant_id: string;
}

export const userService = {
  async createUser(params: CreateUserParams) {
    try {
      const { user, password } = await registerNewUser(
        params.email,
        params.role,
        params.full_name,
        params.phone || '',
      );

      await auditService.log('CREATE_USER', 'auth', user?.id || 'unknown', {
        email: params.email,
        role: params.role,
      });

      return { user, password };
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  },

  async listUsers(tenantId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listando usuarios:', error);
      throw error;
    }

    return data;
  },

  async updateUser(userId: string, updates: Partial<CreateUserParams>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        role: updates.role,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await auditService.log('UPDATE_USER', 'auth', userId, { role: updates.role });
    return data;
  },

  async deleteUser(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Se requiere sesión activa.');

    // Llama al Edge Function que elimina la cuenta de Auth Y el perfil
    const response = await fetch(
      `${supabaseUrl}/functions/v1/admin-delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      },
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al eliminar usuario');

    await auditService.log('DELETE_USER', 'auth', userId, {});
    return true;
  },
};
