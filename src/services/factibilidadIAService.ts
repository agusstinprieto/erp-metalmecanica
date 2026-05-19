import { aiService } from './aiService';
import { supabase } from '../lib/supabase';
import type { RFQCotizacion } from './quoteService';

export interface FactibilidadRiesgo {
  categoria: 'Materiales' | 'Proceso' | 'Calidad' | 'Tiempo' | 'Costo' | 'Cliente';
  descripcion: string;
  nivel: 'ALTO' | 'MEDIO' | 'BAJO';
  mitigacion: string;
}

export interface ProcesoEvaluacion {
  proceso: string;
  disponibilidad: number; // 0, 1, 2
  herramental: number;    // 0, 1, 2
  capacidad: number;       // 0, 1, 2
  score: number;          // Suma (0 a 6)
  plan_mitigacion: string; // Requerido si score === 5, ej: "FABRICAR DADOS A DIMENSION"
}

export interface FactibilidadAnalisis {
  factibilidad: 'VIABLE' | 'CONDICIONADA' | 'NO_VIABLE';
  confianza: number;
  costo_estimado: {
    por_pieza_min: number;
    por_pieza_max: number;
    por_lote_min: number;
    por_lote_max: number;
  };
  tiempo_entrega_dias: number;
  capacidad_planta: 'DISPONIBLE' | 'AJUSTADA' | 'SATURADA';
  riesgos: FactibilidadRiesgo[];
  cuellos_botella: string[];
  procesos_criticos: string[];
  recomendaciones: string[];
  condiciones_especiales: string[];
  resumen_ejecutivo: string;
  matriz_procesos: ProcesoEvaluacion[]; // Matriz real de procesos McVill FT-IG-01
}

export interface AnalisisRecord {
  id: string;
  rfq_id: string;
  rfq_label: string;
  cliente: string;
  descripcion: string;
  fecha: string;
  analisis: FactibilidadAnalisis;
}

const LS_KEY = 'mcvill_factibilidad_historial';

// Dynamically gets company brand info from localStorage (Rule 16)
function getBrandConfig() {
  try {
    const saved = localStorage.getItem('mcvill-config');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { brandName: 'la empresa metal-mecánica', companyName: 'la empresa metal-mecánica' };
}

const SYSTEM_PROMPT = `Eres el analista senior de factibilidad de manufactura de una empresa metal-mecánica de precisión en Coahuila, México especializada en fabricación industrial pesada y maquinados CNC de alta tolerancia.

CAPACIDADES DE PLANTA REALES (McVill):
- Corte: láser Trumpf CNC de 3kW (acero hasta 12mm), oxicorte/plasma de alta definición
- Transformación: prensas dobladoras CNC de 150 TON, roladoras de rodillos, sierra de cinta, biseladoras neumáticas
- Maquinado: centros de maquinado vertical Haas/Mazak y tornos CNC Mazak
- Ensamble/Soldadura: cabinas TIG/MIG certificadas bajo normas AWS D1.1 y AWS D1.3, soldadura por puntos
- Acabado: cabina de pintura industrial electrostática en polvo y curado por horno
- Materiales: acero al carbono (A36, A572), aceros aleados, inoxidables (304, 316), aluminio (6061-T6) y placas antidesgaste AR400/AR500

CLIENTES OPERATIVOS: Caterpillar, John Deere, Kone, Buhler, Komatsu, Wabtec, Jabil

MATRIZ DE PROCESOS (FT-IG-01):
Debes evaluar para cada RFQ los procesos necesarios de planta en escala 0 a 2 para:
1. Disponibilidad de máquina (0: saturada, 1: limitada, 2: 100% libre)
2. Herramental/Dados (0: no se tiene, 1: requiere fabricar/modificar dados o fixtures, 2: listo)
3. Capacidad humana (0: sin personal, 1: requiere entrenamiento, 2: calificado)

Si la suma de criterios (Score) es 5 (Poco Factible), debes asignar un plan de mitigación metalmecánico obligatorio en plan_mitigacion, por ejemplo:
- Si requiere Doblez y el herramental es limitado (1) -> "FABRICAR DADOS A DIMENSION DE LAS PIEZAS"
- Si requiere Ensamble/Soldadura y es complejo -> "FABRICAR PLANTILLAS (FIXTURES) PARA ARMADO"
- Si la soldadura requiere normativas complejas -> "CALIFICAR SOLDADURA BAJO AWS D1.1/D1.3 CON PERSONAL CALIFICADO"

Reglas de decisión:
- VIABLE: Todos los procesos críticos score >= 5, con mitigaciones operativas estándar y riesgo F001 LOW/MED.
- CONDICIONADA: Algún proceso crítico requiere inversión, dados especiales o el riesgo F001 es HIGH con mitigaciones complejas.
- NO_VIABLE: Algún proceso tiene score <= 4 (sin máquina o sin capacidad).

Responde únicamente con un JSON que cumpla exactamente la estructura solicitada. Sin markdown, sin comentarios.`;

export async function analyzeRFQ(rfq: RFQCotizacion): Promise<FactibilidadAnalisis> {
  const brand = getBrandConfig();
  const eau_str = rfq.eau ? `\nEAU (unidades/año): ${rfq.eau}` : '';
  const prompt = `Analiza la factibilidad de manufactura para este RFQ de ${brand.companyName || 'la empresa'}:

CLIENTE: ${rfq.cliente}
DESCRIPCIÓN: ${rfq.descripcion || rfq.alcance_general || 'No especificada'}
ALCANCE GENERAL: ${rfq.alcance_general || 'No especificado'}
Número de partes (NPs): ${rfq.cant_np}${eau_str}
Aceros únicos requeridos: ${rfq.cant_aceros}
Procesos distintos: ${rfq.cant_procesos}
Sub-ensambles: ${rfq.cant_subensambles}
Hardwares/comprados: ${rfq.cant_hardwares}
Nivel de riesgo F001: ${rfq.riesgo_nivel} (score: ${rfq.riesgo_score}/12)
SLA comprometido: ${rfq.sla_dias} días hábiles
Documentación disponible: ${[
    rfq.tiene_solido_3d && 'Sólido 3D',
    rfq.tiene_planos_2d && 'Planos 2D',
    rfq.tiene_bom && 'BOM',
  ].filter(Boolean).join(', ') || 'Sin documentación'}
${rfq.comentario_pm ? `Comentario PM: ${rfq.comentario_pm}` : ''}
${rfq.monto_estimado ? `Monto estimado cliente: $${rfq.monto_estimado.toLocaleString()} MXN` : ''}

Devuelve el análisis con esta estructura JSON exacta:
{
  "factibilidad": "VIABLE",
  "confianza": 85,
  "costo_estimado": {
    "por_pieza_min": 1200,
    "por_pieza_max": 1800,
    "por_lote_min": 50000,
    "por_lote_max": 80000
  },
  "tiempo_entrega_dias": 15,
  "capacidad_planta": "DISPONIBLE",
  "riesgos": [
    {
      "categoria": "Materiales",
      "descripcion": "descripción del riesgo específico",
      "nivel": "MEDIO",
      "mitigacion": "acción concreta de mitigación"
    }
  ],
  "cuellos_botella": ["proceso o recurso que puede limitar el flujo"],
  "procesos_criticos": ["procesos que definen costo y tiempo"],
  "recomendaciones": ["acción recomendada para avanzar la cotización"],
  "condiciones_especiales": ["condición especial para hacer viable o mejorar la propuesta"],
  "resumen_ejecutivo": "Párrafo de 2-3 oraciones con la conclusión ejecutiva del análisis.",
  "matriz_procesos": [
    {
      "proceso": "Láser",
      "disponibilidad": 2,
      "herramental": 2,
      "capacidad": 2,
      "score": 6,
      "plan_mitigacion": ""
    },
    {
      "proceso": "Doblez",
      "disponibilidad": 1,
      "herramental": 2,
      "capacidad": 2,
      "score": 5,
      "plan_mitigacion": "FABRICAR DADOS A DIMENSION DE LAS PIEZAS"
    }
  ]
}`;

  const raw = await aiService.askGemini(prompt, undefined, [], SYSTEM_PROMPT);
  const cleaned = raw.trim().replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as FactibilidadAnalisis;
    if (!parsed.factibilidad || !parsed.resumen_ejecutivo) {
      throw new Error('Respuesta IA incompleta: faltan campos requeridos');
    }
    return parsed;
  } catch (e) {
    throw new Error('La IA devolvió una respuesta inválida. Intenta de nuevo. ' + (e instanceof Error ? e.message : ''));
  }
}

// ── Supabase row → AnalisisRecord ────────────────────────────────────────────
function rowToRecord(row: Record<string, unknown>): AnalisisRecord {
  return {
    id: row.id as string,
    rfq_id: row.rfq_id as string,
    rfq_label: (row.rfq_label as string) || '',
    cliente: row.cliente as string,
    descripcion: (row.descripcion as string) || '',
    fecha: row.created_at as string,
    analisis: row.analisis as FactibilidadAnalisis,
  };
}

// ── localStorage helpers (fallback) ──────────────────────────────────────────
function lsGet(): AnalisisRecord[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsSet(records: AnalisisRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(records.slice(0, 100)));
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function getHistorial(tenantId: string): Promise<AnalisisRecord[]> {
  const { data, error } = await supabase
    .from('factibilidad_analisis')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return lsGet();
  return data.map(rowToRecord);
}

export async function saveAnalisis(rfq: RFQCotizacion, analisis: FactibilidadAnalisis, tenantId: string): Promise<AnalisisRecord> {
  const payload = {
    rfq_id: rfq.id,
    rfq_label: rfq.rfq_interno || rfq.rfq_externo || rfq.id,
    cliente: rfq.cliente,
    descripcion: rfq.descripcion || rfq.alcance_general || '',
    analisis,
    tenant_id: tenantId,
  };

  const { data, error } = await supabase
    .from('factibilidad_analisis')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    // Fallback: save to localStorage
    const record: AnalisisRecord = {
      id: `fact-local-${Date.now()}`,
      rfq_id: rfq.id,
      rfq_label: payload.rfq_label,
      cliente: rfq.cliente,
      descripcion: payload.descripcion,
      fecha: new Date().toISOString(),
      analisis,
    };
    const hist = lsGet();
    hist.unshift(record);
    lsSet(hist);
    return record;
  }

  return rowToRecord(data);
}

export async function deleteAnalisis(id: string, tenantId: string): Promise<void> {
  // Remove from Supabase unless it's a local-only record
  if (!id.startsWith('fact-local-')) {
    await supabase
      .from('factibilidad_analisis')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
  }
  // Always clean localStorage regardless of origin
  lsSet(lsGet().filter(r => r.id !== id));
}
