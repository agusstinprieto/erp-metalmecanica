import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Loader2, Mail } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import geminiService from '../services/geminiService';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';

interface VOCEntry {
  id: string;
  cliente: string;
  fecha: string;
  asunto: string;
  cuerpo: string;
  categoria: 'ENTREGA' | 'CALIDAD' | 'PRECIO' | 'COMUNICACIÓN' | 'OTRO';
  sentimiento: 'POSITIVO' | 'NEUTRAL' | 'NEGATIVO';
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  checklist: { accion: string; completada: boolean }[];
  analizado: boolean;
}

const MOCK_VOC: VOCEntry[] = [
  {
    id: 'voc-001', cliente: 'CAT', fecha: '2026-05-12',
    asunto: 'Retraso en entrega OT-288 — urgente',
    cuerpo: 'El lote de soportes hidráulicos debía llegar el 10 de mayo. A hoy no tenemos piezas y nuestra línea está detenida. Necesitamos una respuesta inmediata y un plan de acción.',
    categoria: 'ENTREGA', sentimiento: 'NEGATIVO', prioridad: 'ALTA',
    checklist: [
      { accion: 'Confirmar fecha de entrega real al cliente', completada: true },
      { accion: 'Identificar causa raíz del retraso', completada: true },
      { accion: 'Ofrecer plan de recuperación con fechas', completada: false },
      { accion: 'Escalar a gerencia si retraso > 3 días', completada: false },
    ],
    analizado: true,
  },
  {
    id: 'voc-002', cliente: 'WABTEC', fecha: '2026-05-08',
    asunto: 'Observaciones dimensionales en muestra FAI eje WT-0812',
    cuerpo: 'Hemos recibido las muestras del eje de transmisión y encontramos 3 características fuera de tolerancia en el reporte dimensional. Adjuntamos el reporte de rechazo. Por favor corrijan y reenvíen.',
    categoria: 'CALIDAD', sentimiento: 'NEGATIVO', prioridad: 'ALTA',
    checklist: [
      { accion: 'Analizar reporte de rechazo WABTEC', completada: true },
      { accion: 'Identificar causas raíz con equipo de calidad', completada: false },
      { accion: 'Generar 8D y enviar en 48h', completada: false },
      { accion: 'Producir nuevas muestras corregidas', completada: false },
    ],
    analizado: true,
  },
  {
    id: 'voc-003', cliente: 'KONE', fecha: '2026-05-05',
    asunto: 'Excelente trabajo en entrega de placas KN-441',
    cuerpo: 'Queremos felicitarlos por la calidad y puntualidad en el lote de 200 placas. Las piezas llegaron dentro de tolerancia y a tiempo. Continuaremos con el próximo pedido de 500 unidades.',
    categoria: 'CALIDAD', sentimiento: 'POSITIVO', prioridad: 'BAJA',
    checklist: [
      { accion: 'Agradecer al cliente por retroalimentación', completada: true },
      { accion: 'Documentar como caso de éxito', completada: false },
    ],
    analizado: true,
  },
  {
    id: 'voc-004', cliente: 'JABIL', fecha: '2026-05-14',
    asunto: 'Solicitud de cotización urgente brackets CNC',
    cuerpo: 'Necesitamos cotización para 500 brackets adicionales al JB-1192. Entrega máxima 4 semanas. Favor de confirmar viabilidad y precio antes del viernes.',
    categoria: 'OTRO', sentimiento: 'NEUTRAL', prioridad: 'MEDIA',
    checklist: [
      { accion: 'Revisar capacidad disponible para fecha solicitada', completada: false },
      { accion: 'Preparar cotización con precio y tiempo', completada: false },
      { accion: 'Responder a JABIL antes del viernes', completada: false },
    ],
    analizado: false,
  },
];

const sentColor: Record<string, string> = {
  POSITIVO: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  NEUTRAL: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  NEGATIVO: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};
const priColor: Record<string, string> = { ALTA: 'text-rose-400', MEDIA: 'text-amber-400', BAJA: 'text-slate-400' };

const TREND_DATA = [
  { mes: 'Ene', entrega: 2, calidad: 1, precio: 0 },
  { mes: 'Feb', entrega: 3, calidad: 2, precio: 1 },
  { mes: 'Mar', entrega: 1, calidad: 3, precio: 0 },
  { mes: 'Abr', entrega: 4, calidad: 1, precio: 2 },
  { mes: 'May', entrega: 2, calidad: 2, precio: 0 },
];

const PIE_DATA = [
  { name: 'ENTREGA', value: 38, color: '#f59e0b' },
  { name: 'CALIDAD', value: 34, color: '#ef4444' },
  { name: 'PRECIO', value: 15, color: '#8b5cf6' },
  { name: 'COMUNICACIÓN', value: 8, color: '#06b6d4' },
  { name: 'OTRO', value: 5, color: '#64748b' },
];

const panel = 'bg-slate-900/40 border border-white/5 rounded-xl';

export const VOCDashboardView: React.FC = () => {
  const { config } = useConfig();
  const [vocEntries, setVocEntries] = useState<VOCEntry[]>(MOCK_VOC);
  const [selected, setSelected] = useState<VOCEntry | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [emailText, setEmailText] = useState('');
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  useEffect(() => {
    supabase.from('voc_entries').select('*').order('fecha', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setVocEntries(data as VOCEntry[]);
        // Si no hay datos en DB, deja el MOCK_VOC como seed visual hasta que el usuario agregue datos reales
      });
  }, []);

  const persistChecklist = async (entry: VOCEntry) => {
    await supabase.from('voc_entries').update({ checklist: entry.checklist as unknown as object }).eq('id', entry.id);
  };

  const negativos = vocEntries.filter(v => v.sentimiento === 'NEGATIVO').length;
  const positivos = vocEntries.filter(v => v.sentimiento === 'POSITIVO').length;
  const altas = vocEntries.filter(v => v.prioridad === 'ALTA').length;

  const analyzeEmail = async (voc: VOCEntry) => {
    setAnalyzing(voc.id);
    await new Promise(r => setTimeout(r, 1200));
    setAnalyzing(null);
    setSelected({ ...voc, analizado: true });
  };

  const toggleChecklist = (itemIdx: number) => {
    if (!selected) return;
    const updated = {
      ...selected,
      checklist: selected.checklist.map((c, i) => i === itemIdx ? { ...c, completada: !c.completada } : c),
    };
    setSelected(updated);
    setVocEntries(vs => vs.map(v => v.id === updated.id ? updated : v));
    persistChecklist(updated);
  };

  const analyzeNew = async () => {
    if (!emailText.trim()) return;
    setAnalyzing('new');
    try {
      const prompt = `Analiza este correo de cliente para una empresa de manufactura metal-mecánica (${config.companyName}). Responde SOLO JSON:
Correo: "${emailText}"
Esquema: {"categoria":"ENTREGA|CALIDAD|PRECIO|COMUNICACIÓN|OTRO","sentimiento":"POSITIVO|NEUTRAL|NEGATIVO","prioridad":"ALTA|MEDIA|BAJA","checklist":["accion1","accion2","accion3"]}`;
      const raw = await geminiService.generateText(prompt);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const { data: tenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        const payload = {
          tenant_id: tenant?.id,
          cliente: 'Nuevo',
          fecha: new Date().toISOString().split('T')[0],
          asunto: emailText.slice(0, 60) + '...',
          cuerpo: emailText,
          categoria: parsed.categoria,
          sentimiento: parsed.sentimiento,
          prioridad: parsed.prioridad,
          checklist: (parsed.checklist as string[]).map((a: string) => ({ accion: a, completada: false })),
          analizado: true,
        };
        const { data: saved } = await supabase.from('voc_entries').insert(payload).select().single();
        const newEntry: VOCEntry = (saved ?? { id: `voc-${Date.now()}`, ...payload }) as VOCEntry;
        setVocEntries(vs => [newEntry, ...vs]);
        setSelected(newEntry);
        setEmailText('');
        setShowAnalyzer(false);
      }
    } catch { /* fallback silencioso */ }
    finally { setAnalyzing(null); }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center gap-4 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
          <MessageCircle size={16} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-[0.15em]">VOC — Voice of Customer</h1>
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">NLP de correos + checklist automático</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-center"><p className="text-base font-black text-rose-400">{negativos}</p><p className="text-[9px] text-slate-400">Negativos</p></div>
          <div className="text-center"><p className="text-base font-black text-emerald-400">{positivos}</p><p className="text-[9px] text-slate-400">Positivos</p></div>
          <div className="text-center"><p className="text-base font-black text-amber-400">{altas}</p><p className="text-[9px] text-slate-400">Prioridad Alta</p></div>
          <button onClick={() => setShowAnalyzer(!showAnalyzer)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/30 transition-all">
            <Mail size={12} /> Analizar correo
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
        <AnimatePresence>
          {showAnalyzer && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className={`${panel} p-3 flex gap-3 shrink-0`}>
              <Brain size={15} className="text-rose-400 shrink-0 mt-2" />
              <textarea value={emailText} onChange={e => setEmailText(e.target.value)}
                placeholder="Pega el correo del cliente aquí para analizarlo con IA..."
                rows={3}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800/60 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 resize-none" />
              <button onClick={analyzeNew} disabled={analyzing === 'new' || !emailText.trim()}
                className="mcvill-btn-ai px-4 self-start py-2 rounded-lg font-bold text-sm disabled:opacity-40 flex items-center gap-2">
                {analyzing === 'new' ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                Analizar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          {/* Inbox */}
          <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">{vocEntries.length} comunicaciones</p>
            {vocEntries.map((voc, i) => (
              <motion.button key={voc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelected(voc)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === voc.id ? 'border-rose-500/50 bg-rose-500/10' : 'border-white/5 bg-slate-900/40 hover:border-white/10'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-white">{voc.cliente}</span>
                  <span className={`text-[9px] font-black ${priColor[voc.prioridad]}`}>{voc.prioridad}</span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-1 font-medium">{voc.asunto}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${sentColor[voc.sentimiento]}`}>{voc.sentimiento}</span>
                  <span className="text-[9px] text-slate-500">{voc.fecha}</span>
                </div>
                {!voc.analizado && <div className="mt-1 text-[9px] text-amber-400">● Sin analizar</div>}
              </motion.button>
            ))}
          </div>

          {/* Detail + Charts */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`${panel} p-4 flex flex-col gap-3`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-black text-white">{selected.asunto}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-400">{selected.cliente} · {selected.fecha}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${sentColor[selected.sentimiento]}`}>{selected.sentimiento}</span>
                      <span className="text-[9px] text-rose-400 font-bold">{selected.categoria}</span>
                    </div>
                  </div>
                  {!selected.analizado && (
                    <button onClick={() => analyzeEmail(selected)} disabled={analyzing === selected.id}
                      className="mcvill-btn-ai flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold">
                      {analyzing === selected.id ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                      Analizar con IA
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                  <p className="text-xs text-slate-300 leading-relaxed">{selected.cuerpo}</p>
                </div>

                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Plan de acción generado</p>
                  <div className="space-y-1.5">
                    {selected.checklist.map((item, idx) => (
                      <button key={idx} onClick={() => toggleChecklist(idx)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${item.completada ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-slate-900/30 hover:border-white/10'}`}>
                        {item.completada
                          ? <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                          : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 shrink-0" />}
                        <p className={`text-xs ${item.completada ? 'text-slate-500 line-through' : 'text-white'}`}>{item.accion}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className={`${panel} h-32 flex items-center justify-center`}>
                <p className="text-slate-400 text-sm">Selecciona un correo para ver el análisis</p>
              </div>
            )}

            {/* Trend charts */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className={`${panel} p-3`}>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Tendencia de quejas por categoría</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={TREND_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="mes" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="entrega" name="Entrega" fill="#f59e0b" opacity={0.8} radius={[2, 2, 0, 0]} stackId="a" />
                    <Bar dataKey="calidad" name="Calidad" fill="#ef4444" opacity={0.8} radius={[2, 2, 0, 0]} stackId="a" />
                    <Bar dataKey="precio" name="Precio" fill="#8b5cf6" opacity={0.8} radius={[2, 2, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={`${panel} p-3`}>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Distribución por tipo</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.8} />)}
                    </Pie>
                    <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{v}</span>} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VOCDashboardView;
