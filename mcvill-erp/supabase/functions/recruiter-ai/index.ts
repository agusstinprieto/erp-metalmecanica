Deno.serve(async (req) => {
  const { action, payload } = await req.json();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Obtener API key
  const { data: configData } = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id,config&limit=1`, {
    headers: { 
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }).then(r => r.json());

  const apiKey = configData?.[0]?.config?.gemini_api_key || Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API_KEY_NO_CONFIGURADA' }), { status: 500 });
  }

  try {
    let prompt = '';
    const result = {};

    if (action === 'analyze-resume') {
      const { jobDescription, resumeText, candidateName } = payload;
      prompt = `Eres un experto reclutador industrial. Analiza el siguiente CV para el puesto descrito.

PUESTO: ${jobDescription}

CURRICULUM:
${resumeText}

Analiza y responde en JSON con el siguiente formato:
{
  "match_score": (0-100),
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

Responde en JSON con:
{
  "ranked_candidates": [
    {
      "id": "id_del_candidato",
      "score": (0-100),
      "reason": "explicación corta"
    }
  ],
  "top_3": ["id1", "id2", "id3"]
}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })
    });

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ result: JSON.parse(content) }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});