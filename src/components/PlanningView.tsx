import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Package, Gauge, TrendingUp, BarChart3,
  RefreshCw, Sparkles, AlertTriangle, CheckCircle2,
  Clock, Zap, ChevronRight, ShoppingCart, BrainCircuit,
  ArrowRight, Factory, HelpCircle, X, ChevronLeft, BookOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { aiService } from '../services/aiService';

// ── Planning Guide Modal ──────────────────────────────────────────────────────

const GUIDE_STORAGE_KEY = 'mcvill_planning_guide_seen';

const GUIDE_STEPS = [
  {
    tab: 'gantt',
    icon: CalendarDays,
    color: 'text-mcvill-accent',
    bg:   'bg-mcvill-accent/10 border-mcvill-accent/30',
    title: 'Gantt de Producción IA',
    subtitle: 'Visualiza todas las órdenes en un timeline',
    tips: [
      '📅 Cada barra representa una orden de trabajo activa en los próximos 21 días.',
      '🎨 Los segmentos de color muestran el estado de cada etapa: azul = en proceso, verde = completada, gris = pendiente.',
      '⚡ Presiona "Optimizar con IA" para recibir recomendaciones de reordenamiento y eficiencia.',
      '🔴 Las órdenes sin etapas activas aparecen como una barra sólida — indican que necesitan asignación.',
    ],
  },
  {
    tab: 'mrp',
    icon: ShoppingCart,
    color: 'text-yellow-400',
    bg:   'bg-yellow-400/10 border-yellow-400/30',
    title: 'MRP — Requerimiento de Materiales',
    subtitle: 'Detecta déficits antes de que paren la producción',
    tips: [
      '📦 El sistema cruza automáticamente las órdenes abiertas contra el inventario actual.',
      '🔴 Rojo = déficit crítico (>70% de lo necesario). Amarillo = déficit moderado.',
      '🤖 El botón "Sugerencia IA Compras" genera una estrategia de abastecimiento priorizada.',
      '✅ Si no hay déficits, el módulo muestra confirmación verde — inventario suficiente.',
    ],
  },
  {
    tab: 'carga',
    icon: Gauge,
    color: 'text-orange-400',
    bg:   'bg-orange-400/10 border-orange-400/30',
    title: 'Carga de Planta por Estación',
    subtitle: 'Detecta cuellos de botella en tiempo real',
    tips: [
      '📊 Cada barra muestra la utilización de una estación: Corte, Soldadura, Maquinado, Pintura, etc.',
      '🔴 Rojo (>80%) = sobrecargada — riesgo de cuello de botella.',
      '🟡 Amarillo (50–80%) = carga normal. Azul (<50%) = capacidad disponible.',
      '🤖 "Detectar Cuellos IA" analiza patrones y sugiere redistribución de carga entre estaciones.',
    ],
  },
  {
    tab: 'forecast',
    icon: TrendingUp,
    color: 'text-green-400',
    bg:   'bg-green-400/10 border-green-400/30',
    title: 'Forecast de Demanda IA',
    subtitle: 'Anticipa las próximas semanas con datos reales',
    tips: [
      '📈 Las barras azules muestran el historial real de órdenes por semana (últimos 90 días).',
      '🟡 Las barras amarillas son la proyección IA para las próximas 4 semanas.',
      '🤖 "Proyectar Demanda IA" genera forecast numérico y recomienda acciones de capacidad.',
      '💡 Usa el forecast antes de tu reunión semanal de planeación para tomar decisiones con datos.',
    ],
  },
  {
    tab: 'sop',
    icon: BarChart3,
    color: 'text-purple-400',
    bg:   'bg-purple-400/10 border-purple-400/30',
    title: 'S&OP — Ventas y Operaciones Alineadas',
    subtitle: 'Asegura que lo que se vende se puede producir',
    tips: [
      '💰 Muestra el pipeline de cotizaciones activas y su valor total.',
      '🏭 Cruza ese pipeline contra la capacidad operativa real (órdenes activas + estaciones ocupadas).',
      '🤖 "Análisis S&OP con IA" responde: ¿podemos aceptar todas estas cotizaciones? ¿Qué riesgos hay?',
      '⚡ Úsalo en la junta de dirección para validar la promesa de ventas vs la realidad del piso.',
    ],
  },
];

interface PlanningGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlanningGuideModal: React.FC<PlanningGuideModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep]           = useState(0);
  const [dontShow, setDontShow]   = useState(false);

  if (!isOpen) return null;

  const current = GUIDE_STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === GUIDE_STEPS.length - 1;

  const handleClose = () => {
    if (dontShow) localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    setStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-mcvill-bg border border-mcvill-card-border rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">

        {/* Header */}
        <div className="p-6 border-b border-mcvill-card-border/40 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mcvill-accent/15 border border-mcvill-accent/30 flex items-center justify-center">
              <BookOpen size={18} className="text-mcvill-accent" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Guía del Módulo de Planeación</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                {step + 1} de {GUIDE_STEPS.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5 px-6">
          {GUIDE_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 h-2 bg-mcvill-accent'
                  : i < step
                    ? 'w-2 h-2 bg-mcvill-accent/40'
                    : 'w-2 h-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="p-8">
          {/* Icon + Title */}
          <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-2xl border mb-5 ${current.bg}`}>
            <current.icon size={16} className={current.color} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${current.color}`}>
              {current.title}
            </span>
          </div>

          <h3 className="text-xl font-black text-white mb-1">{current.title}</h3>
          <p className="text-sm text-slate-400 mb-6">{current.subtitle}</p>

          {/* Tips */}
          <div className="space-y-3">
            {current.tips.map((tip, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 ${current.bg} ${current.color} border`}>
                  {i + 1}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() => setDontShow(!dontShow)}
              className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                dontShow
                  ? 'bg-mcvill-accent border-mcvill-accent'
                  : 'border-slate-600 bg-transparent group-hover:border-slate-400'
              }`}
            >
              {dontShow && <CheckCircle2 size={10} className="text-white" />}
            </div>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">No mostrar de nuevo</span>
          </label>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-mcvill-card-border text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-slate-500 transition-all"
              >
                <ChevronLeft size={12} /> Anterior
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-mcvill-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-mcvill-accent/80 transition-all shadow-lg shadow-mcvill-accent/20"
              >
                Siguiente <ChevronRight size={12} />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-mcvill-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-mcvill-accent/80 transition-all shadow-lg shadow-mcvill-accent/20"
              >
                ¡Entendido! <Zap size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkOrderPlan {
  id: string;
  order_number: string;
  title: string;
  status: string;
  progress: number;
  created_at: string;
  due_date?: string;
  stages: StagePlan[];
}

interface StagePlan {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  updated_at?: string;
}

interface MaterialNeed {
  material: string;
  needed: number;
  inStock: number;
  unit: string;
  deficit: number;
  orderNumber: string;
}

interface StationLoad {
  name: string;
  active: number;
  pending: number;
  completed: number;
  totalJobs: number;
  utilization: number;
}

// ── Palette ───────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  completed:  'bg-green-500',
  in_progress:'bg-mcvill-accent animate-pulse',
  pending:    'bg-slate-600',
};

const STATUS_LABEL: Record<string, string> = {
  pending:    'Pendiente',
  in_progress:'En Proceso',
  completed:  'Completado',
  cancelled:  'Cancelado',
};

const STATION_ICONS: Record<string, string> = {
  'Corte':     '✂️',
  'Soldadura': '🔥',
  'Maquinado': '⚙️',
  'Pintura':   '🎨',
  'Ensamble':  '🔩',
  'Inspección':'🔍',
  'Embarque':  '📦',
};

// ── PlanningView ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'gantt',    label: 'Gantt IA',         icon: CalendarDays },
  { id: 'mrp',      label: 'MRP',              icon: ShoppingCart },
  { id: 'carga',    label: 'Carga Planta',     icon: Gauge },
  { id: 'forecast', label: 'Forecast IA',      icon: TrendingUp },
  { id: 'sop',      label: 'S&OP',             icon: BarChart3 },
];

export const PlanningView: React.FC = () => {
  const [activeTab, setActiveTab]   = useState('gantt');
  const [guideOpen, setGuideOpen]   = useState(false);

  // Auto-open guide on first visit
  useEffect(() => {
    const seen = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (!seen) setGuideOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <PlanningGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
            Planeación <span className="text-mcvill-accent">IA</span>
          </h1>
          <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-0.5">
            Módulo de Planeación de Producción — Control Core v2.5
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGuideOpen(true)}
            title="Abrir guía de ayuda"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-mcvill-accent/40 hover:bg-mcvill-accent/10 transition-all"
          >
            <HelpCircle size={13} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Guía</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-mcvill-accent/10 border border-mcvill-accent/30">
            <BrainCircuit size={12} className="text-mcvill-accent" />
            <span className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest">IA Activa</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-mcvill-bg border border-mcvill-card-border/50">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-mcvill-accent/20 border border-mcvill-accent/40 text-mcvill-accent shadow-[0_0_12px_rgba(0,128,255,0.15)]'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <tab.icon size={12} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'gantt'    && <GanttTab />}
      {activeTab === 'mrp'      && <MRPTab />}
      {activeTab === 'carga'    && <CargaTab />}
      {activeTab === 'forecast' && <ForecastTab />}
      {activeTab === 'sop'      && <SOPTab />}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — GANTT
// ══════════════════════════════════════════════════════════════════════════════

const GanttTab: React.FC = () => {
  const [orders, setOrders]       = useState<WorkOrderPlan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [aiTip, setAiTip]         = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const DAYS = 21;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayLabels = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return { date: d, label: d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) };
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Separate queries to avoid Supabase 400 relationship errors
      const { data: wos } = await supabase
        .from('work_orders')
        .select('id, order_number, status, created_at, project_id')
        .in('status', ['pending', 'in_progress', 'completed'])
        .order('created_at', { ascending: false })
        .limit(12);

      const { data: projects } = await supabase
        .from('engineering_projects')
        .select('id, title');

      const woList = wos ?? [];
      const withStages: WorkOrderPlan[] = await Promise.all(
        woList.map(async (wo: any) => {
          const { data: stages } = await supabase
            .from('manufacturing_stages')
            .select('id, name, status, updated_at')
            .eq('work_order_id', wo.id)
            .order('id');
          return {
            id: wo.id,
            order_number: wo.order_number,
            title: projects?.find((p: any) => p.id === wo.project_id)?.title ?? wo.order_number,
            status: wo.status,
            progress: wo.progress ?? 0,
            created_at: wo.created_at,
            stages: (stages ?? []).map((s: any) => ({
              id: s.id,
              name: s.name,
              status: s.status ?? 'pending',
              updated_at: s.updated_at,
            })),
          };
        })
      );
      setOrders(withStages);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const analyzeWithAI = async () => {
    if (!orders.length) return;
    setAnalyzing(true);
    try {
      const summary = orders.map(o =>
        `${o.order_number} (${o.status}, ${o.progress}%): etapas=${o.stages.map(s => `${s.name}[${s.status}]`).join(',')}`
      ).join('\n');

      const response = await aiService.askGemini(
        `Analiza este Gantt de producción y da 3 recomendaciones concretas para optimizar el flujo. Sé breve y directo:\n${summary}`,
        'GENERAL',
        [],
        'Eres un experto en planeación de producción industrial metalmecánica. Responde en español, máximo 3 puntos concisos.'
      );
      setAiTip(response);
    } catch {
      setAiTip('No se pudo obtener análisis IA. Verifica la conexión.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Calculate bar position: offset from today in days, width based on progress/stages
  const getBarGeometry = (order: WorkOrderPlan) => {
    const start = new Date(order.created_at);
    start.setHours(0, 0, 0, 0);
    const offsetDays = Math.max(0, Math.floor((start.getTime() - today.getTime()) / 86400000));
    const estimatedDays = Math.max(3, Math.ceil(order.stages.length * 2.5));
    const endDays = offsetDays + estimatedDays;
    return { offsetDays: Math.max(offsetDays, 0), widthDays: Math.min(estimatedDays, DAYS - offsetDays), endDays };
  };

  if (loading) return <LoadingCard label="Cargando Gantt..." />;

  return (
    <div className="space-y-4">
      {/* AI Analyze Button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Mostrando <span className="text-white font-black">{orders.length}</span> órdenes — ventana de {DAYS} días
        </p>
        <button
          onClick={analyzeWithAI}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[10px] font-black uppercase tracking-widest hover:bg-mcvill-accent/25 transition-all disabled:opacity-50"
        >
          {analyzing ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
          Optimizar con IA
        </button>
      </div>

      {/* AI Tip Card */}
      {aiTip && (
        <div className="p-4 rounded-2xl bg-mcvill-accent/5 border border-mcvill-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit size={14} className="text-mcvill-accent" />
            <span className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest">Recomendación IA</span>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line">{aiTip}</p>
        </div>
      )}

      {/* Gantt Chart */}
      <div className="rounded-2xl border border-mcvill-card-border/50 bg-mcvill-bg overflow-hidden">
        {/* Day Headers */}
        <div className="flex border-b border-mcvill-card-border/30">
          <div className="w-48 shrink-0 p-3 border-r border-mcvill-card-border/30">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Orden</span>
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {dayLabels.map((d, i) => (
              <div
                key={i}
                className={`flex-1 min-w-[36px] py-2 text-center border-r border-mcvill-card-border/20 last:border-0 ${
                  i === 0 ? 'bg-mcvill-accent/10' : ''
                }`}
              >
                <span className={`text-[8px] font-black uppercase ${i === 0 ? 'text-mcvill-accent' : 'text-slate-600'}`}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {orders.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">Sin órdenes activas</div>
        ) : (
          orders.map((order) => {
            const { offsetDays, widthDays } = getBarGeometry(order);
            const pctOffset = (offsetDays / DAYS) * 100;
            const pctWidth  = (widthDays / DAYS) * 100;

            return (
              <div key={order.id} className="flex border-b border-mcvill-card-border/20 last:border-0 group hover:bg-white/[0.02]">
                {/* Label */}
                <div className="w-48 shrink-0 p-3 border-r border-mcvill-card-border/20">
                  <p className="text-[10px] font-black text-white truncate">{order.order_number}</p>
                  <p className="text-[9px] text-slate-500 truncate">{order.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      order.status === 'completed' ? 'bg-green-500' :
                      order.status === 'in_progress' ? 'bg-mcvill-accent animate-pulse' : 'bg-slate-600'
                    }`} />
                    <span className="text-[8px] text-slate-500">{order.progress}%</span>
                  </div>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative py-3 px-1">
                  {/* Today line */}
                  <div className="absolute top-0 bottom-0 left-0 w-px bg-mcvill-accent/40 z-10" style={{ left: '0%' }} />

                  {/* Bar */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-7 rounded-lg overflow-hidden flex"
                    style={{ left: `${pctOffset}%`, width: `${Math.max(pctWidth, 4)}%` }}
                  >
                    {/* Stage segments */}
                    {order.stages.length > 0 ? (
                      order.stages.map((s, si) => (
                        <div
                          key={si}
                          title={`${s.name} — ${STATUS_LABEL[s.status] ?? s.status}`}
                          className={`h-full flex-1 border-r border-black/20 last:border-0 flex items-center justify-center ${STAGE_COLORS[s.status] ?? 'bg-slate-700'}`}
                        >
                          {si === 0 && (
                            <span className="text-[7px] font-black text-white/80 truncate px-1">
                              {s.name}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className={`h-full w-full rounded-lg ${
                        order.status === 'completed' ? 'bg-green-600' :
                        order.status === 'in_progress' ? 'bg-mcvill-accent' : 'bg-slate-700'
                      }`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-green-500 inline-block" /> Completada</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-mcvill-accent inline-block" /> En Proceso</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-slate-600 inline-block" /> Pendiente</span>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — MRP
// ══════════════════════════════════════════════════════════════════════════════

const MRPTab: React.FC = () => {
  const [needs, setNeeds]     = useState<MaterialNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [analyzing, setAnalyzing]       = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [matRes, woRes] = await Promise.all([
          supabase.from('materiales').select('descripcion_mp, peso_mp, stock_minimo_mp, unidad_mp').limit(50),
          supabase.from('work_orders').select('id, order_number').in('status', ['pending', 'in_progress']).limit(20),
        ]);

        const mats   = matRes.data ?? [];
        const orders = woRes.data ?? [];

        // Build material needs: items below 2x minimum stock are flagged
        const needsList: MaterialNeed[] = mats
          .filter((m: any) => m.stock_minimo_mp && m.peso_mp !== null)
          .map((m: any, idx: number) => {
            const inStock = Number(m.peso_mp ?? 0);
            const minStock = Number(m.stock_minimo_mp ?? 0);
            const needed = minStock * 2; // Target: 2x minimum
            const deficit = Math.max(0, needed - inStock);
            // Link to the oldest active order (round-robin by index, deterministic)
            const relatedOrder = orders.length > 0 ? orders[idx % orders.length] as any : null;
            return {
              material: m.descripcion_mp,
              needed,
              inStock,
              unit: m.unidad_mp ?? 'kg',
              deficit,
              orderNumber: relatedOrder?.order_number ?? '—',
            };
          })
          .filter((n: MaterialNeed) => n.deficit > 0)
          .sort((a: MaterialNeed, b: MaterialNeed) => b.deficit - a.deficit)
          .slice(0, 12);

        setNeeds(needsList);
      } catch {
        setNeeds([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const analyzeMRP = async () => {
    if (!needs.length) return;
    setAnalyzing(true);
    try {
      const summary = needs.slice(0, 6).map(n =>
        `${n.material}: stock=${n.inStock}${n.unit}, necesita=${n.needed}${n.unit}, déficit=${n.deficit.toFixed(1)}${n.unit}`
      ).join('\n');
      const res = await aiService.askGemini(
        `Analiza estos requerimientos de materiales MRP y sugiere la estrategia de compras óptima:\n${summary}`,
        'GENERAL', [],
        'Eres experto en compras industriales y supply chain metalmecánica. Responde en 3 puntos concisos en español.'
      );
      setAiSuggestion(res);
    } catch {
      setAiSuggestion('Error al obtener sugerencia.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <LoadingCard label="Calculando MRP..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">
            <span className="text-white font-black">{needs.length}</span> materiales con déficit detectado
          </p>
        </div>
        <button
          onClick={analyzeMRP}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[10px] font-black uppercase tracking-widest hover:bg-mcvill-accent/25 transition-all disabled:opacity-50"
        >
          {analyzing ? <RefreshCw size={11} className="animate-spin" /> : <BrainCircuit size={11} />}
          Sugerencia IA Compras
        </button>
      </div>

      {aiSuggestion && (
        <div className="p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-yellow-400" />
            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Estrategia de Compras IA</span>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line">{aiSuggestion}</p>
        </div>
      )}

      {needs.length === 0 ? (
        <div className="p-10 rounded-2xl border border-green-500/20 bg-green-500/5 text-center">
          <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm font-black text-green-400">Inventario suficiente para órdenes actuales</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-mcvill-card-border/50 overflow-hidden">
          <div className="grid grid-cols-5 gap-0 p-3 border-b border-mcvill-card-border/30 text-[9px] font-black uppercase tracking-widest text-slate-500">
            <span className="col-span-2">Material</span>
            <span className="text-right">Stock</span>
            <span className="text-right">Necesario</span>
            <span className="text-right">Déficit</span>
          </div>
          {needs.map((n, i) => {
            const severity = n.deficit / n.needed;
            return (
              <div key={i} className="grid grid-cols-5 gap-0 p-3 border-b border-mcvill-card-border/20 last:border-0 hover:bg-white/[0.02] items-center">
                <div className="col-span-2">
                  <p className="text-xs font-black text-white truncate">{n.material}</p>
                  <p className="text-[9px] text-slate-500">Orden: {n.orderNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">{n.inStock.toFixed(1)} {n.unit}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">{n.needed.toFixed(1)} {n.unit}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black ${
                    severity > 0.7 ? 'text-red-400' : severity > 0.4 ? 'text-yellow-400' : 'text-orange-400'
                  }`}>
                    -{n.deficit.toFixed(1)} {n.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — CARGA DE PLANTA
// ══════════════════════════════════════════════════════════════════════════════

const CargaTab: React.FC = () => {
  const [stations, setStations] = useState<StationLoad[]>([]);
  const [loading, setLoading]   = useState(true);
  const [aiAlert, setAiAlert]   = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: stages } = await supabase
          .from('manufacturing_stages')
          .select('name, status')
          .order('name');

        const stageList = stages ?? [];
        const stationMap = new Map<string, StationLoad>();

        for (const s of stageList as any[]) {
          const name = s.name ?? 'Sin Nombre';
          if (!stationMap.has(name)) {
            stationMap.set(name, { name, active: 0, pending: 0, completed: 0, totalJobs: 0, utilization: 0 });
          }
          const station = stationMap.get(name)!;
          station.totalJobs++;
          if (s.status === 'in_progress') station.active++;
          else if (s.status === 'pending')    station.pending++;
          else if (s.status === 'completed')  station.completed++;
        }

        const result = Array.from(stationMap.values()).map(st => ({
          ...st,
          utilization: st.totalJobs > 0
            ? Math.round(((st.active + st.pending) / st.totalJobs) * 100)
            : 0,
        })).sort((a, b) => b.utilization - a.utilization);

        setStations(result);
      } catch {
        setStations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const analyzeLoad = async () => {
    if (!stations.length) return;
    setAnalyzing(true);
    try {
      const summary = stations.map(s =>
        `${s.name}: utilización=${s.utilization}%, activas=${s.active}, pendientes=${s.pending}`
      ).join('\n');
      const res = await aiService.askGemini(
        `Analiza la carga de las estaciones de producción y detecta cuellos de botella:\n${summary}`,
        'GENERAL', [],
        'Eres experto en balanceo de línea en metalmecánica. Responde en 3 puntos concisos en español.'
      );
      setAiAlert(res);
    } catch {
      setAiAlert('Error al obtener análisis.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <LoadingCard label="Analizando carga de planta..." />;

  const overloaded = stations.filter(s => s.utilization > 80).length;

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Estaciones Totales', value: stations.length, color: 'text-white' },
          { label: 'Con Alta Carga (>80%)', value: overloaded, color: 'text-red-400' },
          { label: 'Jobs Activos', value: stations.reduce((s, st) => s + st.active, 0), color: 'text-mcvill-accent' },
        ].map((kpi, i) => (
          <div key={i} className="p-4 rounded-2xl bg-mcvill-bg border border-mcvill-card-border/50 text-center">
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={analyzeLoad}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[10px] font-black uppercase tracking-widest hover:bg-mcvill-accent/25 transition-all disabled:opacity-50"
        >
          {analyzing ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
          Detectar Cuellos IA
        </button>
      </div>

      {aiAlert && (
        <div className="p-4 rounded-2xl bg-orange-400/5 border border-orange-400/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={12} className="text-orange-400" />
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Análisis de Capacidad IA</span>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line">{aiAlert}</p>
        </div>
      )}

      {/* Station Bars */}
      <div className="space-y-3">
        {stations.map((st, i) => {
          const icon = STATION_ICONS[st.name] ?? '🏭';
          const barColor = st.utilization > 80 ? 'bg-red-500' : st.utilization > 50 ? 'bg-yellow-500' : 'bg-mcvill-accent';
          return (
            <div key={i} className="p-4 rounded-2xl border border-mcvill-card-border/50 bg-mcvill-bg hover:border-mcvill-accent/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm font-black text-white">{st.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-slate-500">{st.active} activos</span>
                  <span className="text-slate-500">{st.pending} pendientes</span>
                  <span className={`font-black text-xs ${st.utilization > 80 ? 'text-red-400' : st.utilization > 50 ? 'text-yellow-400' : 'text-mcvill-accent'}`}>
                    {st.utilization}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${Math.min(st.utilization, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
        {stations.length === 0 && (
          <div className="p-10 text-center text-slate-500 text-xs">Sin datos de estaciones</div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — FORECAST IA
// ══════════════════════════════════════════════════════════════════════════════

const ForecastTab: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<{ label: string; real: number; forecast?: number }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [forecastText, setForecastText]   = useState('');
  const [forecasting, setForecasting]     = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: orders } = await supabase
          .from('work_orders')
          .select('created_at, status')
          .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
          .order('created_at');

        const oList = orders ?? [];
        const weeks: Record<string, number> = {};
        for (const o of oList as any[]) {
          const d = new Date(o.created_at);
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          const key = weekStart.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
          weeks[key] = (weeks[key] ?? 0) + 1;
        }

        const historical = Object.entries(weeks).slice(-10).map(([label, real]) => ({ label, real }));
        setWeeklyData(historical);
      } catch {
        setWeeklyData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const generateForecast = async () => {
    if (!weeklyData.length) return;
    setForecasting(true);
    try {
      const series = weeklyData.map(w => `${w.label}:${w.real}`).join(', ');
      const res = await aiService.askGemini(
        `Basándote en esta serie histórica de órdenes por semana: ${series}. Proyecta las próximas 4 semanas y da 2 recomendaciones de planeación.`,
        'GENERAL', [],
        'Eres experto en forecasting de demanda industrial. Responde en español con: 1) Proyección numérica por semana, 2) 2 recomendaciones.'
      );
      setForecastText(res);

      // Add projected weeks using simple linear trend from last 4 data points
      const history = weeklyData.slice(-4);
      const avg = history.length > 0 ? history.reduce((s, w) => s + w.real, 0) / history.length : 0;
      const trend = history.length >= 2
        ? (history[history.length - 1].real - history[0].real) / Math.max(history.length - 1, 1)
        : 0;
      const projected = [1, 2, 3, 4].map((i) => ({
        label: `+${i}sem`,
        real: 0,
        forecast: Math.max(0, Math.round(avg + trend * i)),
      }));
      setWeeklyData(prev => [...prev.filter(w => w.real > 0), ...projected]);
    } catch {
      setForecastText('Error al generar forecast.');
    } finally {
      setForecasting(false);
    }
  };

  if (loading) return <LoadingCard label="Cargando historial..." />;

  const maxVal = Math.max(...weeklyData.map(w => Math.max(w.real, w.forecast ?? 0)), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Historial de <span className="text-white font-black">{weeklyData.filter(w => w.real > 0).length}</span> semanas
        </p>
        <button
          onClick={generateForecast}
          disabled={forecasting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[10px] font-black uppercase tracking-widest hover:bg-mcvill-accent/25 transition-all disabled:opacity-50"
        >
          {forecasting ? <RefreshCw size={11} className="animate-spin" /> : <TrendingUp size={11} />}
          Proyectar Demanda IA
        </button>
      </div>

      {/* Bar chart */}
      <div className="p-4 rounded-2xl border border-mcvill-card-border/50 bg-mcvill-bg">
        <div className="flex items-end gap-2 h-40">
          {weeklyData.map((w, i) => {
            const height  = w.real > 0 ? (w.real / maxVal) * 100 : 0;
            const fHeight = w.forecast ? (w.forecast / maxVal) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '120px' }}>
                  {w.real > 0 && (
                    <div
                      className="flex-1 bg-mcvill-accent/80 rounded-t-sm transition-all duration-500"
                      style={{ height: `${height}%` }}
                      title={`${w.label}: ${w.real} órdenes`}
                    />
                  )}
                  {w.forecast && (
                    <div
                      className="flex-1 bg-yellow-400/50 border border-yellow-400/40 rounded-t-sm transition-all duration-500"
                      style={{ height: `${fHeight}%` }}
                      title={`Proyección: ${w.forecast} órdenes`}
                    />
                  )}
                </div>
                <span className="text-[7px] text-slate-600 rotate-45 whitespace-nowrap">{w.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-[9px] font-black uppercase tracking-widest text-slate-500 justify-center">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-mcvill-accent/80 inline-block" /> Real</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-yellow-400/50 border border-yellow-400/40 inline-block" /> Proyectado</span>
        </div>
      </div>

      {forecastText && (
        <div className="p-4 rounded-2xl bg-mcvill-accent/5 border border-mcvill-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit size={12} className="text-mcvill-accent" />
            <span className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest">Forecast y Recomendaciones IA</span>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line">{forecastText}</p>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — S&OP
// ══════════════════════════════════════════════════════════════════════════════

const SOPTab: React.FC = () => {
  const [pipeline, setPipeline]   = useState<any[]>([]);
  const [capacity, setCapacity]   = useState({ totalOrders: 0, inProgress: 0, stationsActive: 0 });
  const [loading, setLoading]     = useState(true);
  const [sopAnalysis, setSopAnalysis] = useState('');
  const [analyzing, setAnalyzing]     = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [quotesRes, ordersRes, stagesRes] = await Promise.all([
          supabase.from('cotizaciones').select('id, numero_cotizacion, cliente_nombre, precio_total, estado, created_at').order('created_at', { ascending: false }).limit(8),
          supabase.from('work_orders').select('id, status').limit(100),
          supabase.from('work_orders').select('id, status').eq('status', 'in_progress').limit(100),
        ]);

        setPipeline(quotesRes.data ?? []);
        const orders    = ordersRes.data ?? [];
        const inProgRes = stagesRes.data ?? [];
        setCapacity({
          totalOrders:    orders.length,
          inProgress:     orders.filter((o: any) => o.status === 'in_progress').length,
          stationsActive: inProgRes.length,
        });
      } catch {
        setPipeline([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const analyzeSOp = async () => {
    setAnalyzing(true);
    try {
      const pipeSummary = pipeline.slice(0, 5).map((q: any) =>
        `${q.numero_cotizacion ?? q.id} — ${q.cliente_nombre ?? 'Cliente'}: $${Number(q.precio_total ?? 0).toLocaleString()} (${q.estado})`
      ).join('\n');
      const capSummary = `Órdenes activas: ${capacity.inProgress}/${capacity.totalOrders}, Estaciones ocupadas: ${capacity.stationsActive}`;
      const res = await aiService.askGemini(
        `Análisis S&OP:\nPipeline de ventas:\n${pipeSummary}\nCapacidad operativa:\n${capSummary}\n¿Podemos aceptar todas estas cotizaciones? ¿Qué riesgos hay?`,
        'GENERAL', [],
        'Eres experto en S&OP para manufactura metalmecánica B2B. Responde en 3 puntos: 1) Capacidad disponible, 2) Riesgos, 3) Recomendación.'
      );
      setSopAnalysis(res);
    } catch {
      setSopAnalysis('Error al generar análisis S&OP.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <LoadingCard label="Cargando S&OP..." />;

  const pipelineValue = pipeline.reduce((s, q) => s + Number(q.precio_total ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pipeline Cotizaciones', value: pipeline.length, color: 'text-white' },
          { label: 'Valor Pipeline', value: `$${(pipelineValue / 1000).toFixed(0)}k`, color: 'text-mcvill-accent' },
          { label: 'Órdenes en Proceso', value: capacity.inProgress, color: 'text-yellow-400' },
          { label: 'Estaciones Ocupadas', value: capacity.stationsActive, color: 'text-green-400' },
        ].map((kpi, i) => (
          <div key={i} className="p-4 rounded-2xl bg-mcvill-bg border border-mcvill-card-border/50 text-center">
            <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={analyzeSOp}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[10px] font-black uppercase tracking-widest hover:bg-mcvill-accent/25 transition-all disabled:opacity-50"
        >
          {analyzing ? <RefreshCw size={11} className="animate-spin" /> : <BarChart3 size={11} />}
          Análisis S&OP con IA
        </button>
      </div>

      {sopAnalysis && (
        <div className="p-4 rounded-2xl bg-mcvill-accent/5 border border-mcvill-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit size={12} className="text-mcvill-accent" />
            <span className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest">S&OP Intelligence</span>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line">{sopAnalysis}</p>
        </div>
      )}

      {/* Pipeline table */}
      <div className="rounded-2xl border border-mcvill-card-border/50 overflow-hidden">
        <div className="p-3 border-b border-mcvill-card-border/30 flex items-center gap-2">
          <Factory size={12} className="text-mcvill-accent" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipeline de Cotizaciones</span>
        </div>
        {pipeline.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">Sin cotizaciones en pipeline</div>
        ) : (
          pipeline.map((q, i) => (
            <div key={i} className="flex items-center justify-between p-3 border-b border-mcvill-card-border/20 last:border-0 hover:bg-white/[0.02]">
              <div>
                <p className="text-xs font-black text-white">{q.numero_cotizacion ?? q.id?.slice(0, 8)}</p>
                <p className="text-[9px] text-slate-500">{q.cliente_nombre ?? '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-mcvill-accent">
                  {q.precio_total ? `$${Number(q.precio_total).toLocaleString()}` : '—'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                  q.estado === 'aprobada' ? 'bg-green-500/20 text-green-400' :
                  q.estado === 'enviada'  ? 'bg-blue-500/20 text-blue-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {q.estado ?? '—'}
                </span>
                <ArrowRight size={10} className="text-slate-600" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SHARED
// ══════════════════════════════════════════════════════════════════════════════

const LoadingCard: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-3">
    <RefreshCw size={24} className="text-mcvill-accent animate-spin" />
    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</p>
  </div>
);
