import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, publicToken, metadata, userId } = body;

    // 1. Obtener credenciales de Plaid desde el primer tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('tenants')
      .select('id, plaid_client_id, plaid_secret, plaid_environment')
      .limit(1)
      .maybeSingle();

    if (tErr || !tenant?.plaid_client_id) {
      throw new Error('Configuración de Plaid no encontrada en la tabla tenants.');
    }

    const plaidBaseUrl = `https://${tenant.plaid_environment}.plaid.com`;
    const plaidHeaders = {
      'Content-Type': 'application/json',
    };

    const plaidAuth = {
      client_id: tenant.plaid_client_id,
      secret: tenant.plaid_secret,
    };

    // --- ACCIONES ---

    // A. CREAR LINK TOKEN
    if (action === 'create-link-token') {
      const response = await fetch(`${plaidBaseUrl}/link/token/create`, {
        method: 'POST',
        headers: plaidHeaders,
        body: JSON.stringify({
          ...plaidAuth,
          user: { client_user_id: userId || 'agus_pro_user' },
          client_name: 'Agus Pro Auditoría',
          products: ['transactions'],
          country_codes: ['US', 'MX'],
          language: 'es',
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // B. INTERCAMBIAR PUBLIC TOKEN
    if (action === 'exchange-token') {
      const response = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
        method: 'POST',
        headers: plaidHeaders,
        body: JSON.stringify({
          ...plaidAuth,
          public_token: publicToken,
        }),
      });

      const data = await response.json();
      
      if (data.access_token) {
        // Guardar en la base de datos
        const { error: dbErr } = await supabaseAdmin
          .from('financial_accounts')
          .insert({
            tenant_id: tenant.id,
            user_id: userId,
            plaid_access_token: data.access_token,
            plaid_item_id: data.item_id,
            institution_name: metadata?.institution?.name || 'Unknown',
            status: 'active'
          });

        if (dbErr) throw dbErr;
      }

      return new Response(JSON.stringify({ success: true, item_id: data.item_id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // C. SINCRONIZAR TRANSACCIONES
    if (action === 'sync-transactions') {
      const { accountId } = body;
      
      // Obtener el access_token de la DB
      const { data: account, error: aErr } = await supabaseAdmin
        .from('financial_accounts')
        .select('plaid_access_token')
        .eq('id', accountId)
        .single();

      if (aErr || !account) throw new Error('Cuenta bancaria no encontrada');

      const response = await fetch(`${plaidBaseUrl}/transactions/get`, {
        method: 'POST',
        headers: plaidHeaders,
        body: JSON.stringify({
          ...plaidAuth,
          access_token: account.plaid_access_token,
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Últimos 30 días
          end_date: new Date().toISOString().split('T')[0],
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify({ transactions: data.transactions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error('Acción no válida');

  } catch (error: any) {
    console.error('❌ Plaid Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
