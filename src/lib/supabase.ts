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
