import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

function generateSecurePassword(length = 14): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export const registerNewUser = async (
  email: string,
  role: string,
  displayName: string,
  phone: string,
) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Se requiere sesión activa para crear usuarios.');

  const password = generateSecurePassword();

  // Delegar al Edge Function autenticado — el rol es validado en el servidor
  const response = await fetch(
    `${supabaseUrl}/functions/v1/admin-create-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, password, full_name: displayName, role, phone }),
    },
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Error creando usuario');

  return { user: result.user, password };
};

export const updateUserPassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
  return data;
};

/**
 * Gets the active tenant UUID.
 * Resolves by looking up the correct active tenant and caching it.
 */
let _cachedTenantId: string | null = null;

export const getActiveTenantId = async (): Promise<string> => {
  const MCVILL_TENANT = 'c89d6183-5f66-48dd-8b66-2b8b6b993e61';

  if (_cachedTenantId) return _cachedTenantId;

  try {
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .in('slug', ['mcvill', 'mcvill-global'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      _cachedTenantId = data.id;
      return data.id;
    }
  } catch (e) {
    console.error('Error fetching active tenant ID:', e);
  }

  _cachedTenantId = MCVILL_TENANT;
  return MCVILL_TENANT;
};

