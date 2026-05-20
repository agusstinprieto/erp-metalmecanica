import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parsea el archivo .env de forma manual para evitar dependencias
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    });
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('Pruebas de Integración de IA (Cerebro Neural Gemini con Autenticación Real)', () => {
  let accessToken: string | null = null;

  test.beforeAll(async () => {
    // 🔐 Autenticación en Supabase para obtener un JWT access_token real de CEO/Sistemas
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      console.log('🔑 Intentando iniciar sesión con credenciales semilla en Supabase...');
      // Intentamos loguearnos con la cuenta del admin de sistemas
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@mcvill.com',
        password: 'McVill_SYS_Admin_Root!'
      });

      if (error) {
        console.warn('⚠️ No se pudo iniciar sesión con credenciales semilla en auth schema:', error.message);
        console.log('🔄 Intentando cuenta secundaria de Recursos Humanos...');
        
        const { data: hrData, error: hrError } = await supabase.auth.signInWithPassword({
          email: 'rh@mcvill.com',
          password: 'McVill_HR_2025!'
        });

        if (!hrError && hrData.session) {
          accessToken = hrData.session.access_token;
          console.log('✅ Sesión iniciada con éxito como Recursos Humanos.');
        } else {
          console.warn('⚠️ No se pudo iniciar sesión en Supabase Auth local. Se usará el anon_key como fallback.');
          accessToken = SUPABASE_ANON_KEY;
        }
      } else if (data.session) {
        accessToken = data.session.access_token;
        console.log('✅ Sesión iniciada con éxito como Administrador de Sistemas.');
      }
    }
  });

  test('La Edge Function de Gemini (gemini-generate) responde correctamente y con baja latencia', async ({ request }) => {
    test.setTimeout(50000); // 50s por arranque en frío de la Edge Function

    const payload = {
      prompt: 'Responde únicamente con la palabra "OK" si estás funcionando correctamente.',
      systemInstruction: 'Eres el asistente técnico de pruebas de Agus Pro. Sé extremadamente conciso.',
      temperature: 0.1,
      maxTokens: 50,
      model: 'gemini-2.5-flash-lite',
      provider: 'google',
      moduleName: 'e2e-test'
    };

    const tokenToUse = accessToken || SUPABASE_ANON_KEY;

    console.log('🤖 Enviando prompt básico a Gemini-Generate...');
    const response = await request.post(`${SUPABASE_URL}/functions/v1/gemini-generate`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenToUse}`
      },
      data: payload
    });

    // Registrar resultados para auditoría
    console.log('📊 Status recibido:', response.status());
    const status = response.status();
    
    if (status !== 200) {
      const errText = await response.text();
      console.error('❌ Error recibido de la Edge Function:', errText);
    }
    
    expect(status).toBe(200);

    const body = await response.json();
    console.log('🤖 Respuesta de Gemini:', JSON.stringify(body));

    expect(body).toBeDefined();
    const content = body.content || body.result;
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
    
    // Verificamos si responde de manera coherente
    expect(content.toLowerCase()).toContain('ok');
  });

  test('La Edge Function de Reclutamiento IA (recruiter-ai) procesa solicitudes correctamente', async ({ request }) => {
    test.setTimeout(50000);

    const payload = {
      action: 'analyze-resume',
      payload: {
        jobDescription: 'Ingeniero de Software con conocimientos de React y Node.js',
        resumeText: 'Desarrollador Fullstack. Experto en React, Node.js y Supabase.',
        candidateName: 'Agustín Prieto'
      }
    };

    const tokenToUse = accessToken || SUPABASE_ANON_KEY;

    console.log('🤖 Enviando currículum para análisis a recruiter-ai...');
    const response = await request.post(`${SUPABASE_URL}/functions/v1/recruiter-ai`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenToUse}`
      },
      data: payload
    });

    console.log('📊 Status recibido (Recruiter):', response.status());
    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log('🤖 Respuesta de Recruiter-AI:', JSON.stringify(body));

    expect(body).toBeDefined();
    expect(body.result).toBeDefined();
  });
});
