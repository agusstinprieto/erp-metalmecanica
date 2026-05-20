# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai_integration.spec.ts >> Pruebas de Integración de IA (Cerebro Neural Gemini con Autenticación Real) >> La Edge Function de Gemini (gemini-generate) responde correctamente y con baja latencia
- Location: e2e\ai_integration.spec.ts:70:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Test source

```ts
  3   | import path from 'path';
  4   | import { createClient } from '@supabase/supabase-js';
  5   | 
  6   | // Parsea el archivo .env de forma manual para evitar dependencias
  7   | function loadEnv() {
  8   |   const envPath = path.resolve(process.cwd(), '.env');
  9   |   if (fs.existsSync(envPath)) {
  10  |     const envContent = fs.readFileSync(envPath, 'utf-8');
  11  |     envContent.split('\n').forEach(line => {
  12  |       const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  13  |       if (match) {
  14  |         const key = match[1];
  15  |         let value = match[2] || '';
  16  |         if (value.startsWith('"') && value.endsWith('"')) {
  17  |           value = value.slice(1, -1);
  18  |         } else if (value.startsWith("'") && value.endsWith("'")) {
  19  |           value = value.slice(1, -1);
  20  |         }
  21  |         process.env[key] = value.trim();
  22  |       }
  23  |     });
  24  |   }
  25  | }
  26  | 
  27  | loadEnv();
  28  | 
  29  | const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
  30  | const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
  31  | 
  32  | test.describe('Pruebas de Integración de IA (Cerebro Neural Gemini con Autenticación Real)', () => {
  33  |   let accessToken: string | null = null;
  34  | 
  35  |   test.beforeAll(async () => {
  36  |     // 🔐 Autenticación en Supabase para obtener un JWT access_token real de CEO/Sistemas
  37  |     if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  38  |       const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  39  |       
  40  |       console.log('🔑 Intentando iniciar sesión con credenciales semilla en Supabase...');
  41  |       // Intentamos loguearnos con la cuenta del admin de sistemas
  42  |       const { data, error } = await supabase.auth.signInWithPassword({
  43  |         email: 'admin@mcvill.com',
  44  |         password: 'McVill_SYS_Admin_Root!'
  45  |       });
  46  | 
  47  |       if (error) {
  48  |         console.warn('⚠️ No se pudo iniciar sesión con credenciales semilla en auth schema:', error.message);
  49  |         console.log('🔄 Intentando cuenta secundaria de Recursos Humanos...');
  50  |         
  51  |         const { data: hrData, error: hrError } = await supabase.auth.signInWithPassword({
  52  |           email: 'rh@mcvill.com',
  53  |           password: 'McVill_HR_2025!'
  54  |         });
  55  | 
  56  |         if (!hrError && hrData.session) {
  57  |           accessToken = hrData.session.access_token;
  58  |           console.log('✅ Sesión iniciada con éxito como Recursos Humanos.');
  59  |         } else {
  60  |           console.warn('⚠️ No se pudo iniciar sesión en Supabase Auth local. Se usará el anon_key como fallback.');
  61  |           accessToken = SUPABASE_ANON_KEY;
  62  |         }
  63  |       } else if (data.session) {
  64  |         accessToken = data.session.access_token;
  65  |         console.log('✅ Sesión iniciada con éxito como Administrador de Sistemas.');
  66  |       }
  67  |     }
  68  |   });
  69  | 
  70  |   test('La Edge Function de Gemini (gemini-generate) responde correctamente y con baja latencia', async ({ request }) => {
  71  |     test.setTimeout(50000); // 50s por arranque en frío de la Edge Function
  72  | 
  73  |     const payload = {
  74  |       prompt: 'Responde únicamente con la palabra "OK" si estás funcionando correctamente.',
  75  |       systemInstruction: 'Eres el asistente técnico de pruebas de Agus Pro. Sé extremadamente conciso.',
  76  |       temperature: 0.1,
  77  |       maxTokens: 50,
  78  |       model: 'gemini-2.5-flash-lite',
  79  |       provider: 'google',
  80  |       moduleName: 'e2e-test'
  81  |     };
  82  | 
  83  |     const tokenToUse = accessToken || SUPABASE_ANON_KEY;
  84  | 
  85  |     console.log('🤖 Enviando prompt básico a Gemini-Generate...');
  86  |     const response = await request.post(`${SUPABASE_URL}/functions/v1/gemini-generate`, {
  87  |       headers: {
  88  |         'Content-Type': 'application/json',
  89  |         'Authorization': `Bearer ${tokenToUse}`
  90  |       },
  91  |       data: payload
  92  |     });
  93  | 
  94  |     // Registrar resultados para auditoría
  95  |     console.log('📊 Status recibido:', response.status());
  96  |     const status = response.status();
  97  |     
  98  |     if (status !== 200) {
  99  |       const errText = await response.text();
  100 |       console.error('❌ Error recibido de la Edge Function:', errText);
  101 |     }
  102 |     
> 103 |     expect(status).toBe(200);
      |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  104 | 
  105 |     const body = await response.json();
  106 |     console.log('🤖 Respuesta de Gemini:', JSON.stringify(body));
  107 | 
  108 |     expect(body).toBeDefined();
  109 |     const content = body.content || body.result;
  110 |     expect(content).toBeDefined();
  111 |     expect(content.length).toBeGreaterThan(0);
  112 |     
  113 |     // Verificamos si responde de manera coherente
  114 |     expect(content.toLowerCase()).toContain('ok');
  115 |   });
  116 | 
  117 |   test('La Edge Function de Reclutamiento IA (recruiter-ai) procesa solicitudes correctamente', async ({ request }) => {
  118 |     test.setTimeout(50000);
  119 | 
  120 |     const payload = {
  121 |       action: 'analyze-resume',
  122 |       payload: {
  123 |         jobDescription: 'Ingeniero de Software con conocimientos de React y Node.js',
  124 |         resumeText: 'Desarrollador Fullstack. Experto en React, Node.js y Supabase.',
  125 |         candidateName: 'Agustín Prieto'
  126 |       }
  127 |     };
  128 | 
  129 |     const tokenToUse = accessToken || SUPABASE_ANON_KEY;
  130 | 
  131 |     console.log('🤖 Enviando currículum para análisis a recruiter-ai...');
  132 |     const response = await request.post(`${SUPABASE_URL}/functions/v1/recruiter-ai`, {
  133 |       headers: {
  134 |         'Content-Type': 'application/json',
  135 |         'Authorization': `Bearer ${tokenToUse}`
  136 |       },
  137 |       data: payload
  138 |     });
  139 | 
  140 |     console.log('📊 Status recibido (Recruiter):', response.status());
  141 |     expect(response.status()).toBe(200);
  142 | 
  143 |     const body = await response.json();
  144 |     console.log('🤖 Respuesta de Recruiter-AI:', JSON.stringify(body));
  145 | 
  146 |     expect(body).toBeDefined();
  147 |     expect(body.result).toBeDefined();
  148 |   });
  149 | });
  150 | 
```