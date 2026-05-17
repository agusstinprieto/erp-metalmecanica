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
    // ── Auth ────────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado — falta token de sesión' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl        = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin      = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida o expirada' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Resolve API Key ─────────────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('tenant_id').eq('id', user.id).maybeSingle();
    const tenantId = profile?.tenant_id ?? user.id;

    const { data: tenantData } = await supabaseAdmin
      .from('tenants').select('gemini_api_key').eq('id', tenantId).maybeSingle();

    const apiKey = tenantData?.gemini_api_key || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API_KEY_NO_CONFIGURADA — configura la clave Gemini en Ajustes → Motores IA' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Parse body ──────────────────────────────────────────────────────────────
    const { action, payload } = await req.json();

    let prompt = '';

    if (action === 'analyze-resume') {
      const { jobDescription, resumeText } = payload;
      prompt = `Eres un experto reclutador industrial. Analiza el siguiente CV para el puesto descrito.

PUESTO: ${jobDescription}

CURRICULUM:
${resumeText}

Analiza y responde ÚNICAMENTE en JSON con el siguiente formato exacto:
{
  "match_score": <número 0-100>,
  "strengths": ["punto1", "punto2"],
  "weaknesses": ["punto1"],
  "recommendation": "CONTRATAR / CONSIDERAR / RECHAZAR",
  "interview_questions": ["pregunta1", "pregunta2"]
}`;
    } else if (action === 'filter-candidates') {
      const { jobDescription, candidatesSummary } = payload;
      prompt = `Eres un experto reclutador industrial. Filtra y rankea los candidatos para el puesto.

PUESTO: ${jobDescription}

CANDIDATOS:
${JSON.stringify(candidatesSummary, null, 2)}

Responde ÚNICAMENTE en JSON con el siguiente formato exacto:
{
  "ranked_candidates": [
    {
      "id": "id_del_candidato",
      "score": <número 0-100>,
      "reason": "explicación corta"
    }
  ],
  "top_3": ["id1", "id2", "id3"]
}`;
    } else {
      return new Response(JSON.stringify({ error: `Acción desconocida: ${action}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Call Gemini ─────────────────────────────────────────────────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(`Gemini error ${response.status}: ${errData.error?.message ?? 'desconocido'}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return new Response(JSON.stringify({ result: JSON.parse(content) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('RECRUITER_AI_ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
