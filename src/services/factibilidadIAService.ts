import { aiService } from './aiService';
import { supabase } from '../lib/supabase';
import type { RFQCotizacion } from './quoteService';

export interface FactibilidadRiesgo {
  categoria: 'Materiales' | 'Proceso' | 'Calidad' | 'Tiempo' | 'Costo' | 'Cliente';
  descripcion: string;
  nivel: 'ALTO' | 'MEDIO' | 'BAJO';
  mitigacion: string;
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

const SYSTEM_PROMPT = `Eres el analista de factibilidad de manufactura de una empresa metal-mecánica en Coahuila, México especializada en manufactura de precisión para clientes industriales.

CAPACIDADES DE PLANTA:
- Corte: oxicorte, plasma CNC, láser Trumpf 3kW (hasta 12mm acero)
- Maquinado CNC: tornos Mazak, fresadoras CNC, centros de maquinado
- Soldadura: MIG/TIG certificada AWS, soldadura estructural, puntos resistencia
- Ensamble industrial: sub-ensambles mecánicos y ensamble final
- Pintura: líquida y en polvo, cabina industrial con horno
- Materiales manejados: acero A36/A572, inoxidable 304/316, aluminio 6061, placas AR400/500

CLIENTES ACTIVOS: CAT CMSA, CAT Acuña, WABTEC, KOMATSU, JOHN DEERE, KONE, BUHLER, ALFAGOMMA, New Standard

REFERENCIA DE COSTOS (aproximados por proceso):
- Corte oxicorte/plasma: $80–$200 MXN/kg procesado
- Maquinado CNC: $400–$800 MXN/hr máquina
- Soldadura estructural: $250–$500 MXN/hr
- Ensamble industrial: $150–$300 MXN/hr
- Pintura en polvo: $120–$250 MXN/m²
- Materia prima acero: $22–$35 MXN/kg

CRITERIOS DE FACTIBILIDAD (basados en Matriz F001):
- Aceros únicos > 2: riesgo elevado de proveeduría
- Procesos distintos ≥ 6: alta complejidad operativa
- Sub-ensambles ≥ 4: integración compleja, cuellos potenciales
- Hardwares/comprados ≥ 4: dependencia crítica de proveedores externos

REGLAS DE DECISIÓN:
- VIABLE: planta puede ejecutar con recursos normales, riesgo F001 LOW o MEDIUM sin condicionantes críticos
- CONDICIONADA: requiere acción previa (proveedor especial, capacidad extra, plazo extendido, inversión en herramental)
- NO_VIABLE: excede capacidad técnica actual, materiales no disponibles en región, o riesgo F001 HIGH con múltiples condicionantes críticos sin mitigación clara

Responde ÚNICAMENTE con JSON válido. Sin markdown, sin texto fuera del JSON, sin comentarios.`;

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
  "resumen_ejecutivo": "Párrafo de 2-3 oraciones con la conclusión ejecutiva del análisis."
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
