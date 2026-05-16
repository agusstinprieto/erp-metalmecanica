import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://mcvill.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_ROLES = new Set([
  'operario', 'vendedor', 'supervisor', 'rh',
  'finanzas', 'contabilidad', 'sistemas', 'gerente', 'admin', 'ceo',
])
const ELEVATED_ROLES = new Set(['ceo', 'admin'])

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Validar que el llamante tenga un JWT válido
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado — falta token de sesión' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const callerToken = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 2. Verificar identidad del llamante
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(callerToken)
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Sesión inválida o expirada' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Obtener perfil + rol del llamante
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Perfil del solicitante no encontrado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!ELEVATED_ROLES.has(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Permisos insuficientes — se requiere rol admin o ceo' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Validar payload de entrada
    const body = await req.json()
    const { email, password, full_name, role } = body

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Campos requeridos: email, password, full_name, role' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!VALID_ROLES.has(role)) {
      return new Response(JSON.stringify({ error: `Rol '${role}' no válido` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Solo CEOs pueden crear otros admins/CEOs
    if (ELEVATED_ROLES.has(role) && callerProfile.role !== 'ceo') {
      return new Response(JSON.stringify({ error: 'Solo el CEO puede crear administradores' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Crear usuario en Auth (sin email_confirm automático)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name },  // role NO se pasa aquí; lo asigna el trigger o el insert de profiles
    })
    if (authError) throw authError

    // 6. Crear perfil con el tenant del llamante y el rol validado por el servidor
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        tenant_id: callerProfile.tenant_id,
        full_name,
        email,
        role,  // Rol asignado por admin en servidor, no por el cliente
      })
    if (profileInsertError) throw profileInsertError

    return new Response(
      JSON.stringify({ user: { id: authData.user.id, email, role } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
