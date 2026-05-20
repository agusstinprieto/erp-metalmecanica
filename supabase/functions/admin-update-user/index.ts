import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://mcvill.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ELEVATED_ROLES = new Set(['ceo', 'sistemas', 'gerencia', 'admin'])

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
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

    // Verificar identidad del llamante
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(callerToken)
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Sesión inválida o expirada' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !ELEVATED_ROLES.has(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Permisos insuficientes' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { userId, full_name, role } = await req.json()
    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar que el usuario target pertenece al mismo tenant
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (targetProfile.tenant_id !== callerProfile.tenant_id) {
      return new Response(JSON.stringify({ error: 'Cross-tenant no permitido' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Actualizar profiles (bypasa RLS porque usamos service_role)
    const profileUpdates: Record<string, string> = {}
    if (full_name) profileUpdates.full_name = full_name
    if (role) profileUpdates.role = role

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)
      if (profileError) throw profileError
    }

    // 2. Actualizar auth.users.user_metadata para que el header del app refleje el cambio
    if (full_name) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name },
      })
      if (authError) throw authError
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
