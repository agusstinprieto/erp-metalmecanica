import { supabase } from '../lib/supabase';
import { tenantService } from './tenantService';

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  source_url?: string;
}

export const aiService = {
  async getKnowledge(category?: string) {
    let query = supabase.from('ai_knowledge').select('*');
    if (category) {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as KnowledgeItem[];
  },

  async askGemini(question: string, contextCategory?: string, history: any[] = [], systemInstructionOverride?: string, moduleName: string = 'chat') {
    // 1. Obtener contexto relevante de la base de conocimiento
    const knowledge = await this.getKnowledge(contextCategory);
    const contextText = knowledge
      .map(k => `[${k.category}] ${k.title}: ${k.content}`)
      .join('\n\n');

    // 2. Usar configuración dinámica
    const config = await tenantService.getConfig();
    const selected = config.selected_api || 'google';
    
    let provider = 'google';
    const model = selected;

    if (selected.includes('gemini')) provider = 'google';
    else if (selected.includes('claude') || selected.includes('anthropic')) provider = 'anthropic';
    else if (selected.includes('gpt') || selected.includes('openai')) provider = 'openai';
    else if (selected.includes('deepseek')) provider = 'deepseek';
    else if (selected.includes('qwen') || selected.includes('together')) provider = 'together';

    const aiConfig = { provider, model };

    // 3. Llamada segura vía Edge Function
    try {
      const systemInstruction = systemInstructionOverride || `Eres el Cerebro Neural de Control, un ERP de alta ingeniería industrial.
      Tu tono debe ser profesional, eficiente, directo y tecnológico.
      
      INSTRUCCIONES DE RESPUESTA:
      1. Usa el CONTEXTO CORPORATIVO proporcionado para responder.
      2. Si el contexto está vacío o es insuficiente, responde como un sistema en fase de aprendizaje.
      3. Nunca inventes datos técnicos, financieros o de seguridad.
      4. Si la pregunta es sobre "Agus Pro", recuerda que es el estándar de excelencia del sistema.
      
      CONTEXTO CORPORATIVO:
      ${contextText || 'SIN_DATOS_CARGADOS'}`;

      const { data, error } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt: question,
          systemInstruction,
          history,
          model: aiConfig.model,
          provider: aiConfig.provider,
          language: 'text',
          useRag: true,
          moduleName,
        }
      });

      if (error) throw error;
      return data.content || data.result;
    } catch (error) {
      console.error('CRITICAL_AI_FAILURE:', error);
      throw error;
    }
  },

  async analyzeVision(imageFile: File | string, prompt: string, moduleName: string = 'vision') {
    try {
      let base64Image = '';
      if (typeof imageFile !== 'string') {
        const reader = new FileReader();
        base64Image = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      } else {
        base64Image = imageFile;
      }

      // Forzar modelo con capacidad de visión (Regla 12: siempre 2.5-flash-lite)
      const model = 'gemini-2.5-flash-lite';
      const provider = 'google';

      // Extraer mimeType antes de limpiar el prefijo
      const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Content = base64Image.replace(/^data:image\/\w+;base64,/, '');

      const { data, error } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt,
          image: base64Content,
          mimeType,
          model,
          provider,
          language: 'json',
          moduleName
        }
      });

      if (error) throw error;
      return data.content || data.result;
    } catch (error) {
      console.error('VISION_ANALYSIS_FAILURE:', error);
      throw error;
    }
  },

  async analyzeResume(jobDescription: string, resumeText: string, vacancyId?: string, candidateName?: string) {
    try {
      const { data, error } = await supabase.functions.invoke('recruiter-ai', {
        body: {
          action: 'analyze-resume',
          payload: { jobDescription, resumeText, vacancyId, candidateName }
        }
      });

      if (error) throw error;
      return data.result;
    } catch (error) {
      console.error('RESUME_ANALYSIS_FAILURE:', error);
      throw error;
    }
  },

  async filterCandidates(jobDescription: string, candidates: any[]) {
    try {
      const { data, error } = await supabase.functions.invoke('recruiter-ai', {
        body: {
          action: 'filter-candidates',
          payload: { jobDescription, candidatesSummary: candidates }
        }
      });

      if (error) throw error;
      return data.result;
    } catch (error) {
      console.error('CANDIDATE_FILTER_FAILURE:', error);
      throw error;
    }
  },

  /**
   * Ejecuta una Auditoría Neural sobre transacciones bancarias
   */
  async performNeuralAudit(transactions: any[], moduleName: string = 'auditoria') {
    try {
      const prompt = `Analiza las siguientes transacciones bancarias y genera un REPORTE DE AUDITORÍA NEURAL:
      
      TRANSACCIONES:
      ${JSON.stringify(transactions)}
      
      REQUERIMIENTOS DEL REPORTE:
      1. Identifica las 3 categorías principales de gasto.
      2. Detecta cualquier anomalía (gastos duplicados, montos inusuales).
      3. Sugiere 2 estrategias de optimización de flujo de caja.
      4. Clasifica el nivel de salud financiera (Óptimo, Estable, Crítico).
      
      Formato de respuesta: JSON estructurado.`;

      const { data, error } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt,
          systemInstruction: 'Eres un Auditor Senior de IA especializado en finanzas corporativas de alto rendimiento.',
          provider: 'google',
          model: 'gemini-2.5-flash-lite', // Siguiendo la regla 12
          moduleName
        }
      });

      if (error) throw error;
      return typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
    } catch (error) {
      console.error('NEURAL_AUDIT_FAILURE:', error);
      throw error;
    }
  }
};
