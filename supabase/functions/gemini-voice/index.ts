import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://mcvill.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('No autorizado');
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl        = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin      = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Sesión inválida o expirada');

    // 2. Parse body
    const { voiceId, voiceName, text } = await req.json();
    if (!voiceId || !voiceName) throw new Error('voiceId y voiceName son requeridos');

    const promptText = text || `Preséntate de forma extremadamente corta y profesional diciendo: "Hola, soy la voz de ${voiceName} del ERP McVill. ¿En qué te puedo ayudar hoy?"`;

    // 3. Resolve API key from tenant (direct column, never exposed to client)
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('tenant_id').eq('id', user.id).maybeSingle();
    const targetTenantId = profile?.tenant_id || user.id;

    const { data: tenantData } = await supabaseAdmin
      .from('tenants').select('gemini_api_key').eq('id', targetTenantId).maybeSingle();

    const apiKey = tenantData?.gemini_api_key?.trim() || Deno.env.get('GEMINI_API_KEY') || '';
    if (!apiKey) throw new Error('API Key de Gemini no configurada. Agrega gemini_api_key en el tenant.');

    // 4. Call Gemini native audio model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-native-audio-preview-12-2025:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } },
        },
      },
    };

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      throw new Error(geminiData.error?.message || `Error Gemini ${geminiRes.status}`);
    }

    const part = geminiData.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;
    const mimeType    = part?.inlineData?.mimeType || 'audio/pcm;rate=24000';

    if (!base64Audio) throw new Error('No se recibió audio de Gemini.');

    return new Response(
      JSON.stringify({ base64Audio, mimeType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('GEMINI_VOICE_ERROR:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
