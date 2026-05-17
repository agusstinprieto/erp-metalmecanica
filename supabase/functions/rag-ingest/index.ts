import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.length > 50);
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    }
  );
  if (!res.ok) {
    console.error('Embedding API error:', await res.text());
    return [];
  }
  const data = await res.json();
  return data.embedding?.values ?? [];
}

async function extractTextFromFile(
  fileData: Blob,
  filePath: string,
  geminiApiKey: string
): Promise<string> {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';

  // For plain text files, decode directly
  if (['txt', 'md', 'csv'].includes(ext)) {
    return await fileData.text();
  }

  // For PDFs and images, use Gemini vision via inline base64
  if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };
    const mimeType = mimeMap[ext] ?? 'application/octet-stream';

    const buffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Extrae y transcribe todo el texto de este documento de forma completa y fiel. No agregues comentarios propios, solo el texto extraído.' },
              { inlineData: { mimeType, data: base64 } }
            ]
          }]
        }),
      }
    );
    if (!res.ok) throw new Error('Error extrayendo texto con Gemini: ' + await res.text());
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  return `[Archivo binario no procesable: ${filePath}]`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("No autorizado");

    const { data: profile } = await supabase
      .from('profiles').select('tenant_id').eq('id', user.id).single();
    if (!profile?.tenant_id) throw new Error("Tenant no encontrado");

    // Resolve Gemini API key from tenant config
    const { data: tenantData } = await supabase
      .from('tenants').select('gemini_api_key').eq('id', profile.tenant_id).maybeSingle();
    const geminiApiKey = tenantData?.gemini_api_key || Deno.env.get('GEMINI_API_KEY') || '';
    if (!geminiApiKey) throw new Error("API key de Gemini no configurada");

    const body = await req.json();
    const { titulo, contenido, tipo, file_path } = body;

    let textoFinal = contenido || "";

    if (file_path) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('rag_documents').download(file_path);
      if (downloadError) throw new Error("Error descargando archivo: " + downloadError.message);

      const extracted = await extractTextFromFile(fileData, file_path, geminiApiKey);
      textoFinal = extracted + (textoFinal ? '\n\n' + textoFinal : '');
    }

    if (!textoFinal.trim()) throw new Error("No hay contenido para indexar");

    const chunks = chunkText(textoFinal);
    if (chunks.length === 0) throw new Error("El texto es demasiado corto para indexar");

    // Insert document metadata
    const { data: doc, error: docError } = await supabase
      .from('documentos_rag_meta')
      .insert({
        tenant_id: profile.tenant_id,
        titulo,
        tipo,
        file_path,
        estado: 'indexado',
        total_chunks: chunks.length,
      })
      .select().single();
    if (docError) throw docError;

    // Generate embeddings and insert chunks
    const chunkInserts = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const embedding = await generateEmbedding(chunk, geminiApiKey);
        return {
          documento_id: doc.id,
          chunk_index: idx,
          contenido: chunk,
          ...(embedding.length > 0 ? { embedding: `[${embedding.join(',')}]` } : {}),
        };
      })
    );

    const { error: chunkError } = await supabase
      .from('documentos_rag_chunks').insert(chunkInserts);
    if (chunkError) throw chunkError;

    return new Response(
      JSON.stringify({ success: true, total_chunks: chunks.length, doc_id: doc.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error RAG Ingest:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
