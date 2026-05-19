import { supabase } from '../lib/supabase';
import type { Vacancy, Candidate } from '../types/index';

const getTenantId = async (): Promise<string> => {
  const { tenantService } = await import('./tenantService');
  const config = await tenantService.getConfig();
  return config.id;
};

export const recruitmentService = {
  // --- Vacancies ---
  async getVacancies() {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('vacancies')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Vacancy[];
  },

  async createVacancy(vacancy: Partial<Vacancy>) {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('vacancies')
      .insert({ ...vacancy, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data as Vacancy;
  },

  async updateVacancy(id: string, updates: Partial<Vacancy>) {
    const { data, error } = await supabase
      .from('vacancies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Vacancy;
  },

  async deleteVacancy(id: string) {
    const { error } = await supabase
      .from('vacancies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // --- Candidates ---
  async getCandidates(vacancyId?: string) {
    const tenantId = await getTenantId();
    let query = supabase
      .from('candidates')
      .select('*, vacancies(title)')
      .eq('tenant_id', tenantId);

    if (vacancyId) {
      query = query.eq('vacancy_id', vacancyId);
    }

    const { data, error } = await query.order('ai_score', { ascending: false });

    if (error) throw error;
    return data as (Candidate & { vacancies: { title: string } })[];
  },

  async addCandidate(candidate: Partial<Candidate>) {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('candidates')
      .insert({ ...candidate, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data as Candidate;
  },

  async uploadCV(candidateName: string, file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${candidateName.replace(/\s+/g, '_').toLowerCase()}.${fileExt}`;
      const filePath = `candidates/resumes/${fileName}`;

      // Set correct contentType for txt and other file types
      const contentType = file.type || (file.name.toLowerCase().endsWith('.txt') ? 'text/plain; charset=utf-8' : 'application/octet-stream');

      const { error: uploadError } = await supabase.storage
        .from('erp-assets')
        .upload(filePath, file, {
          contentType,
          upsert: true
        });

      if (uploadError) {
        console.warn('Supabase storage upload warning, using local fallback:', uploadError);
        return URL.createObjectURL(file);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('erp-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.warn('Failed to upload CV to storage, falling back to local Object URL:', err);
      return URL.createObjectURL(file);
    }
  },

  async analyzeCandidate(candidate: Candidate, vacancy: Vacancy) {
    // This method will use aiService to analyze the resume
    // If the resume is an image, we use analyzeVision. 
    // If it's text/pdf, we would ideally need the text.
    // For now, let's assume we send a prompt to Gemini with the info we have.
    
    const prompt = `Analiza el siguiente candidato para la vacante: "${vacancy.title}".
    Descripción de la vacante: ${vacancy.description}
    Requisitos: ${vacancy.requirements?.join(', ')}
    
    Datos del Candidato:
    Nombre: ${candidate.name}
    Texto del CV (Extraído): ${candidate.resume_text || 'No disponible, analizar imagen si aplica'}
    URL del CV: ${candidate.resume_url}
    
    Por favor, evalúa:
    1. Score de compatibilidad (0-100).
    2. Fortalezas (array de strings).
    3. Debilidades o Gaps (array de strings).
    4. Recomendación (contratar, entrevistar, rechazar).
    5. Justificación breve.
    
    Responde ÚNICAMENTE en formato JSON:
    {
      "score": number,
      "strengths": string[],
      "weaknesses": string[],
      "recommendation": string,
      "justification": string
    }`;

    // Import dynamically to avoid circular dependencies if any
    const { aiService } = await import('./aiService');
    
    let result;
    if (candidate.resume_url && (candidate.resume_url.endsWith('.jpg') || candidate.resume_url.endsWith('.png') || candidate.resume_url.endsWith('.jpeg'))) {
      result = await aiService.analyzeVision(candidate.resume_url, prompt, 'reclutamiento');
    } else {
      const { geminiService } = await import('./geminiService');
      result = await geminiService.generateStructuredData(prompt, '{}', { moduleName: 'reclutamiento' });
    }

    const analysis = typeof result === 'string' ? JSON.parse(result.replace(/```json|```/g, '')) : result;
    
    // Update candidate with analysis
    await this.updateCandidate(candidate.id, {
      ai_score: analysis.score,
      ai_analysis: analysis,
      status: analysis.score > 70 ? 'screening' : 'pending'
    });

    return analysis;
  },

  async updateCandidate(id: string, updates: Partial<Candidate>) {
    const { data, error } = await supabase
      .from('candidates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Candidate;
  },

  async deleteCandidate(id: string) {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
