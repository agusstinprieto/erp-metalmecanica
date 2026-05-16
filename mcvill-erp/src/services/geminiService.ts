/**
 * Servicio de Gemini API para McVill ERP
 * ⚠️ IA.AGUS: Con Telemetría Avanzada para Debugging
 */
import { supabase } from '../lib/supabase';
import { tenantService } from './tenantService';

export interface GeminiOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  language?: string;
  retries?: number;
  timeout?: number;
  model?: string;
  provider?: string;
  signal?: AbortSignal;
  accessToken?: string;
  contents?: any[];
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateText = async (
  prompt: string,
  options?: GeminiOptions
): Promise<string> => {
  const maxRetries = options?.retries || 3;
  const timeout = options?.timeout || 60000;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Sincronizar con el signal externo si existe
      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      // 🔐 IA.AGUS: Obtención de token
      let accessToken = options?.accessToken;
      
      if (!accessToken) {
        const { data: { session }, error: sErr } = await supabase.auth.getSession();
        if (!sErr && session) {
          accessToken = session.access_token;
        }
      }

      // 🔐 IA.AGUS: Zero Hardcoding - Dynamic fallback from Supabase
      const config = await tenantService.getConfig();
      let finalModel = options?.model || config.selected_model || 'gemini-2.5-flash-lite';
      let finalProvider = options?.provider || config.selected_api || 'google';

      // 🛡️ IA.AGUS: Enforce Gemini (Google) as Primary API
      if (finalProvider === 'deepseek') {
        finalProvider = 'google';
        finalModel = 'gemini-2.5-flash-lite';
      }

      const payload = {
        prompt,
        systemInstruction: options?.systemInstruction,
        temperature: options?.temperature || 0.1,
        maxTokens: options?.maxTokens || 12288,
        language: options?.language,
        model: finalModel,
        provider: finalProvider,
        contents: options?.contents
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const { data, error } = await supabase.functions.invoke('gemini-generate', {
        body: payload,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (error) {
        const realMessage = error.message || `Error ${error.status} en Edge Function`;
        
        // Auto-recovery for expired sessions
        if ((error.status === 401 || realMessage.includes('token')) && attempt < maxRetries) {
          await supabase.auth.refreshSession();
          continue;
        }

        if ((error.status === 429 || error.status >= 500) && attempt < maxRetries) {
          await delay(2000 * attempt);
          continue;
        }

        throw new Error(realMessage);
      }

      if (!data || (!data.content && !data.result)) {
        throw new Error('La IA devolvió una respuesta vacía.');
      }

      return data.content || data.result;

    } catch (error: any) {
      lastError = error;
      if (error.name === 'AbortError') {
        throw new Error('Timeout de comunicación con Control IA (60s).');
      }
      if (attempt === maxRetries) break;
      await delay(1000 * attempt);
    }
  }

  throw new Error(`Control IA no responde: ${lastError?.message}`);
};

export const generateStructuredData = async <T>(
  prompt: string,
  schema: string,
  options?: GeminiOptions
): Promise<T> => {
  const structuredPrompt = `${prompt}

**REGLA DE SALIDA OBLIGATORIA (JSON):**
${schema}

**IMPORTANTE:**
- Responde EXCLUSIVAMENTE con el objeto JSON.
- Sin explicaciones, sin bloques markdown.
- La respuesta debe ser un objeto JSON válido.`;

  const textResponse = await generateText(structuredPrompt, {
    ...options,
    temperature: 0.1,
    maxTokens: 12288
  });

  try {
    const firstBrace = textResponse.indexOf('{');
    const lastBrace = textResponse.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Respuesta no contiene estructura JSON.');
    }

    const jsonPart = textResponse.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonPart);
  } catch (error) {
    throw new Error('Error al decodificar la arquitectura del módulo.');
  }
};

export const generateCode = async (
  prompt: string,
  language: string = 'typescript',
  options?: GeminiOptions
): Promise<string> => {
  const codePrompt = `Actúa como un Ingeniero de Software Senior. Genera código de alta calidad en ${language} para el siguiente requerimiento:

${prompt}

**REGLAS:**
- Solo devuelve el código.
- Sin explicaciones.
- Sin bloques de texto markdown adicionales fuera del código.
- Asegúrate de que sea funcional y siga las mejores prácticas.`;

  return generateText(codePrompt, {
    ...options,
    temperature: 0.2,
    maxTokens: 8192
  });
};

export default {
  generateText,
  generateStructuredData,
  generateCode
};
