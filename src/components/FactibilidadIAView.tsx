import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit, Clock, DollarSign, Factory, AlertTriangle,
  CheckCircle, AlertCircle, XCircle, Trash2, Save, Sparkles, History,
  ChevronRight, Loader2, Zap, Package, Wrench,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import { fetchRFQs, type RFQCotizacion } from '../services/quoteService';
import { useTenant } from '../hooks/useTenant';
import {
  analyzeRFQ, saveAnalisis, getHistorial, deleteAnalisis,
  type FactibilidadAnalisis, type AnalisisRecord
} from '../services/factibilidadIAService';

// ── Risk badge F001 ──────────────────────────────────────────────────────────
const RiskBadge = ({ nivel }: { nivel: string }) => {
  const map: Record<string, string> = {
    HIGH: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    MEDIUM: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    LOW: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  };
  return (
    <span className={clsx('px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider', map[nivel] || map.MEDIUM)}>
      {nivel}
    </span>
  );
};

// ── Verdict badge ────────────────────────────────────────────────────────────
const VerdictBadge = ({ verdict, large = false }: { verdict: string; large?: boolean }) => {
  const map: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    VIABLE:       { cls: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]', icon: CheckCircle, label: 'VIABLE' },
    CONDICIONADA: { cls: 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]',    icon: AlertCircle, label: 'CONDICIONADA' },
    NO_VIABLE:    { cls: 'bg-rose-500/20 border-rose-400/50 text-rose-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]',        icon: XCircle,     label: 'NO VIABLE' },
  };
  const v = map[verdict] || map.CONDICIONADA;
  const Icon = v.icon;
  return (
    <div className={clsx('flex items-center gap-2 border rounded-xl font-black tracking-widest uppercase', v.cls, large ? 'px-5 py-3 text-lg' : 'px-3 py-1.5 text-xs')}>
      <Icon size={large ? 22 : 13} />
      {v.label}
    </div>
  );
};

// ── Nivel badge ──────────────────────────────────────────────────────────────
const NivelBadge = ({ nivel }: { nivel: string }) => {
  const map: Record<string, string> = {
    ALTO:  'bg-rose-500/15 text-rose-300 border-rose-400/30',
    MEDIO: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    BAJO:  'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  };
  return (
    <span className={clsx('px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase', map[nivel] || map.MEDIO)}>
      {nivel}
    </span>
  );
};

// ── Capacidad badge ──────────────────────────────────────────────────────────
const CapacidadBadge = ({ cap }: { cap: string }) => {
  const map: Record<string, string> = {
    DISPONIBLE: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
    AJUSTADA:   'text-amber-300 bg-amber-500/10 border-amber-400/30',
    SATURADA:   'text-rose-300 bg-rose-500/10 border-rose-400/30',
  };
  return (
    <span className={clsx('px-2 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider', map[cap] || map.AJUSTADA)}>
      {cap}
    </span>
  );
};

// ── Chip ─────────────────────────────────────────────────────────────────────
const Chip = ({ text, color = 'blue' }: { text: string; color?: 'blue' | 'amber' | 'rose' | 'emerald' }) => {
  const cls = {
    blue:    'bg-blue-500/10 text-blue-300 border-blue-400/20',
    amber:   'bg-amber-500/10 text-amber-300 border-amber-400/20',
    rose:    'bg-rose-500/10 text-rose-300 border-rose-400/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
  };
  return (
    <span className={clsx('px-2.5 py-1 rounded-lg border text-[11px] font-medium', cls[color])}>
      {text}
    </span>
  );
};

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) => (
  <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex flex-col gap-1">
    <div className="flex items-center gap-1.5 text-slate-400">
      <Icon size={13} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-mcvill-text font-black text-base leading-tight">{value}</p>
    {sub && <p className="text-slate-500 text-[10px]">{sub}</p>}
  </div>
);

// ── RFQ selector row ─────────────────────────────────────────────────────────
const RFQOption = ({ rfq, selected, onClick }: { rfq: RFQCotizacion; selected: boolean; onClick: () => void }) => (
  <div
    onClick={onClick}
    className={clsx(
      'flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-200',
      selected
        ? 'bg-mcvill-accent/15 border-mcvill-accent/40 text-mcvill-text'
        : 'bg-white/2 border-white/8 text-slate-300 hover:bg-white/5 hover:border-white/15'
    )}
  >
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold truncate">{rfq.cliente}</p>
      <p className="text-[10px] text-slate-400 truncate">{rfq.descripcion || rfq.alcance_general || '—'}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">RFQ #{rfq.rfq_interno || rfq.ident} · {rfq.cant_np} NPs</p>
    </div>
    <div className="shrink-0 flex flex-col items-end gap-1">
      <RiskBadge nivel={rfq.riesgo_nivel} />
      {selected && <ChevronRight size={12} className="text-mcvill-accent" />}
    </div>
  </div>
);

// ── Analysis result panel ────────────────────────────────────────────────────
const AnalysisResult = ({
  analisis, rfq, onSave, saved,
}: {
  analisis: FactibilidadAnalisis;
  rfq: RFQCotizacion;
  onSave: () => void;
  saved: boolean;
}) => {
  const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header verdict */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/3 border border-white/8 rounded-2xl">
        <div className="flex flex-col gap-2">
          <VerdictBadge verdict={analisis.factibilidad} large />
          <p className="text-slate-400 text-xs">{rfq.cliente} — {rfq.descripcion || rfq.alcance_general}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Confianza IA</span>
            <span className="text-mcvill-accent font-black text-lg">{analisis.confianza}%</span>
          </div>
          <button
            onClick={onSave}
            disabled={saved}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all',
              saved
                ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300 cursor-default'
                : 'bg-mcvill-accent/15 border-mcvill-accent/30 text-mcvill-accent hover:bg-mcvill-accent/25'
            )}
          >
            {saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saved ? 'Guardado' : 'Guardar análisis'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Costo / Pieza" value={`${fmt(analisis.costo_estimado.por_pieza_min)} – ${fmt(analisis.costo_estimado.por_pieza_max)}`} sub="rango estimado" />
        <StatCard icon={Package} label="Costo / Lote" value={`${fmt(analisis.costo_estimado.por_lote_min)} – ${fmt(analisis.costo_estimado.por_lote_max)}`} sub="total estimado" />
        <StatCard icon={Clock} label="Tiempo entrega" value={`${analisis.tiempo_entrega_dias} días`} sub="días hábiles" />
        <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Factory size={13} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Capacidad</span>
          </div>
          <CapacidadBadge cap={analisis.capacidad_planta} />
        </div>
      </div>

      {/* Riesgos */}
      {analisis.riesgos.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-white/2">
            <AlertTriangle size={13} className="text-amber-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Riesgos identificados</span>
          </div>
          <div className="divide-y divide-white/5">
            {analisis.riesgos.map((r, i) => (
              <div key={i} className="px-4 py-3 grid grid-cols-[auto,1fr,auto] gap-3 items-start">
                <Chip text={r.categoria} color="blue" />
                <div>
                  <p className="text-xs text-slate-200">{r.descripcion}</p>
                  <p className="text-[11px] text-slate-500 mt-1">↳ {r.mitigacion}</p>
                </div>
                <NivelBadge nivel={r.nivel} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cuellos de botella + Procesos críticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {analisis.cuellos_botella.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={13} className="text-rose-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cuellos de botella</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analisis.cuellos_botella.map((c, i) => <Chip key={i} text={c} color="rose" />)}
            </div>
          </div>
        )}
        {analisis.procesos_criticos.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} className="text-amber-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Procesos críticos</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analisis.procesos_criticos.map((p, i) => <Chip key={i} text={p} color="amber" />)}
            </div>
          </div>
        )}
      </div>

      {/* Recomendaciones */}
      {analisis.recomendaciones.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={13} className="text-emerald-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recomendaciones</span>
          </div>
          <ol className="space-y-2">
            {analisis.recomendaciones.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="shrink-0 w-5 h-5 rounded-lg bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Condiciones especiales */}
      {analisis.condiciones_especiales.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-400/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={13} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Condiciones especiales</span>
          </div>
          <ul className="space-y-1.5">
            {analisis.condiciones_especiales.map((c, i) => (
              <li key={i} className="text-xs text-amber-200/80 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">◆</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resumen ejecutivo */}
      <div className="bg-mcvill-accent/5 border border-mcvill-accent/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <BrainCircuit size={13} className="text-mcvill-accent" />
          <span className="text-xs font-bold text-mcvill-accent uppercase tracking-wider">Resumen ejecutivo IA</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{analisis.resumen_ejecutivo}</p>
      </div>
    </div>
  );
};

// ── Historial card ────────────────────────────────────────────────────────────
const HistorialCard = ({
  record, onDelete, onReload,
}: {
  record: AnalisisRecord;
  onDelete: (id: string) => void;
  onReload: (record: AnalisisRecord) => void;
}) => {
  const date = new Date(record.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = new Date(record.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <VerdictBadge verdict={record.analisis.factibilidad} />
            <CapacidadBadge cap={record.analisis.capacidad_planta} />
          </div>
          <p className="text-sm font-bold text-mcvill-text">{record.cliente}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{record.descripcion || record.rfq_label}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-[10px] text-slate-500">{date} {time}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReload(record)}
              className="p-1.5 rounded-lg bg-mcvill-accent/10 border border-mcvill-accent/20 text-mcvill-accent hover:bg-mcvill-accent/20 transition-all"
              title="Ver análisis"
            >
              <RefreshCw size={12} />
            </button>
            <button
              onClick={() => onDelete(record.id)}
              className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-400/20 text-rose-400 hover:bg-rose-500/20 transition-all"
              title="Eliminar"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 line-clamp-2">{record.analisis.resumen_ejecutivo}</p>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[10px] text-slate-500">Confianza: <span className="text-mcvill-accent font-bold">{record.analisis.confianza}%</span></span>
        <span className="text-[10px] text-slate-500">Entrega: <span className="text-slate-300 font-bold">{record.analisis.tiempo_entrega_dias}d</span></span>
        <span className="text-[10px] text-slate-500">RFQ: <span className="text-slate-300 font-bold">#{record.rfq_label}</span></span>
      </div>
    </div>
  );
};

// ── Main view ─────────────────────────────────────────────────────────────────
type TabId = 'analizar' | 'historial';

export function FactibilidadIAView() {
  const tenantId = useTenant();
  const [tab, setTab] = useState<TabId>('analizar');
  const [rfqs, setRfqs] = useState<RFQCotizacion[]>([]);
  const [selected, setSelected] = useState<RFQCotizacion | null>(null);
  const [analisis, setAnalisis] = useState<FactibilidadAnalisis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [historial, setHistorial] = useState<AnalisisRecord[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState<'all' | 'factibilidad' | 'cotizacion' | 'revision'>('all');

  useEffect(() => {
    fetchRFQs(tenantId)
      .then(data => setRfqs(data.filter(r => r.estado !== 'declinada')))
      .catch(() => setError('No se pudieron cargar los RFQs. Verifica la conexión.'));
    getHistorial(tenantId)
      .then(setHistorial)
      .catch(() => { /* historial no es crítico, falla silenciosamente */ });
  }, [tenantId]);

  // Read pre-selected RFQ from sessionStorage (set by Kanban "Analizar" button)
  useEffect(() => {
    const presel = sessionStorage.getItem('mcvill_fact_rfq_id');
    if (presel && rfqs.length > 0) {
      const rfq = rfqs.find(r => r.id === presel);
      if (rfq) setSelected(rfq);
      sessionStorage.removeItem('mcvill_fact_rfq_id');
    }
  }, [rfqs]);

  const handleAnalizar = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setAnalisis(null);
    setSaved(false);
    try {
      const result = await analyzeRFQ(selected);
      setAnalisis(result);
    } catch (e) {
      setError('Error al conectar con la IA. Verifica que tienes una API key configurada en Ajustes → Motores IA.');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const handleSave = useCallback(async () => {
    if (!selected || !analisis) return;
    try {
      await saveAnalisis(selected, analisis, tenantId);
      setSaved(true);
      getHistorial(tenantId).then(setHistorial).catch((e) => console.warn('[Factibilidad] Error al recargar historial tras guardar:', e));
    } catch (e) {
      setError('Error al guardar el análisis. Intenta de nuevo.');
    }
  }, [selected, analisis, tenantId]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteAnalisis(id, tenantId);
    } catch {
      setError('No se pudo eliminar el análisis. Intenta de nuevo.');
    }
    getHistorial(tenantId).then(setHistorial).catch((e) => console.warn('[Factibilidad] Error al recargar historial tras eliminar:', e));
  }, [tenantId]);

  const handleReload = useCallback((record: AnalisisRecord) => {
    const rfq = rfqs.find(r => r.id === record.rfq_id);
    if (!rfq) {
      setError(`RFQ "${record.rfq_label}" ya no está disponible en el Kanban.`);
      return;
    }
    setSelected(rfq);
    setAnalisis(record.analisis);
    setSaved(true);
    setError(null);
    setTab('analizar');
  }, [rfqs]);

  const filteredRFQs = rfqs.filter(r => filter === 'all' || r.estado === filter);

  // Dashboard stats from historial
  const stats = {
    total: historial.length,
    viable: historial.filter(h => h.analisis.factibilidad === 'VIABLE').length,
    condicionada: historial.filter(h => h.analisis.factibilidad === 'CONDICIONADA').length,
    no_viable: historial.filter(h => h.analisis.factibilidad === 'NO_VIABLE').length,
  };

  return (
    <div className="flex flex-col h-full bg-mcvill-bg text-mcvill-text overflow-auto">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-mcvill-accent/20 bg-mcvill-bg/95 backdrop-blur sticky top-0 z-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-mcvill-accent/15 border border-mcvill-accent/30 flex items-center justify-center shadow-[0_0_20px_var(--mcvill-accent-rgb),0.2]">
              <BrainCircuit size={20} className="text-mcvill-accent drop-shadow-[0_0_8px_var(--mcvill-accent-rgb),0.8]" />
            </div>
            <div>
              <h1 className="text-base font-black text-mcvill-text uppercase tracking-wider leading-none">
                Factibilidad en Cotizaciones
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">Análisis de manufactura con Inteligencia Artificial — P4</p>
            </div>
          </div>
          {/* Stats pills */}
          {stats.total > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{stats.total} analizados</span>
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-[10px] font-bold">{stats.viable} Viables</span>
              <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold">{stats.condicionada} Condicionadas</span>
              <span className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-400/20 text-rose-300 text-[10px] font-bold">{stats.no_viable} No Viables</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {([
            { id: 'analizar', label: 'Analizar RFQ', icon: Sparkles },
            { id: 'historial', label: `Historial (${stats.total})`, icon: History },
          ] as { id: TabId; label: string; icon: React.ElementType }[]).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all',
                  tab === t.id
                    ? 'bg-mcvill-accent/15 border-mcvill-accent/40 text-mcvill-accent'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 lg:p-6">

        {/* ── Analizar tab ── */}
        {tab === 'analizar' && (
          <div className="flex flex-col lg:flex-row gap-5 h-full">

            {/* Left: RFQ selector */}
            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
              <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Seleccionar RFQ</p>

                {/* Filter chips */}
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'factibilidad', 'cotizacion', 'revision'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={clsx(
                        'px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider transition-all',
                        filter === f
                          ? 'bg-mcvill-accent/15 border-mcvill-accent/40 text-mcvill-accent'
                          : 'bg-white/3 border-white/10 text-slate-500 hover:text-slate-300'
                      )}
                    >
                      {f === 'all' ? 'Todos' : f}
                    </button>
                  ))}
                </div>

                {/* RFQ list */}
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {filteredRFQs.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Sin RFQs en este estado</p>
                  ) : filteredRFQs.map(rfq => (
                    <RFQOption
                      key={rfq.id}
                      rfq={rfq}
                      selected={selected?.id === rfq.id}
                      onClick={() => { setSelected(rfq); setAnalisis(null); setSaved(false); setError(null); }}
                    />
                  ))}
                </div>
              </div>

              {/* Selected RFQ detail */}
              {selected && (
                <div className="bg-mcvill-accent/5 border border-mcvill-accent/20 rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-[11px] font-bold text-mcvill-accent uppercase tracking-widest">RFQ seleccionado</p>
                  <p className="text-sm font-bold text-mcvill-text">{selected.cliente}</p>
                  <p className="text-xs text-slate-400">{selected.descripcion || selected.alcance_general || 'Sin descripción'}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <span>NPs: <b className="text-slate-200">{selected.cant_np}</b></span>
                    <span>Riesgo: <RiskBadge nivel={selected.riesgo_nivel} /></span>
                    <span>Procesos: <b className="text-slate-200">{selected.cant_procesos}</b></span>
                    <span>Aceros: <b className="text-slate-200">{selected.cant_aceros}</b></span>
                    <span>Sub-ensam.: <b className="text-slate-200">{selected.cant_subensambles}</b></span>
                    <span>Hardware: <b className="text-slate-200">{selected.cant_hardwares}</b></span>
                  </div>
                  {selected.sla_dias && (
                    <p className="text-[11px] text-slate-500">SLA: <span className="text-slate-300 font-bold">{selected.sla_dias} días</span></p>
                  )}

                  <button
                    onClick={handleAnalizar}
                    disabled={loading}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black border transition-all',
                      loading
                        ? 'btn-ai opacity-60 cursor-not-allowed'
                        : 'btn-ai shadow-[0_0_20px_rgba(0,128,255,0.2)]'
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <BrainCircuit size={15} />
                        Analizar con IA
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Right: Result panel */}
            <div className="flex-1 min-w-0">
              {!selected && !loading && (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center">
                    <BrainCircuit size={32} className="text-mcvill-accent/40" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-bold">Selecciona un RFQ para analizar</p>
                    <p className="text-sm text-slate-500 mt-1">La IA evaluará costo, tiempo, riesgos y cuellos de botella<br />basándose en las capacidades reales de planta {tenantId}.</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="h-full flex flex-col items-center justify-center gap-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-mcvill-accent/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-mcvill-accent/40 animate-ping" style={{ animationDelay: '0.2s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BrainCircuit size={28} className="text-mcvill-accent animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-mcvill-text font-bold">Analizando factibilidad...</p>
                    <p className="text-sm text-slate-500 mt-1">La IA está evaluando procesos, costos y riesgos para <span className="text-slate-300">{selected?.cliente}</span></p>
                  </div>
                </div>
              )}

              {error && !loading && (
                <div className="bg-rose-500/10 border border-rose-400/30 rounded-2xl p-6 flex items-start gap-4">
                  <XCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-rose-300 font-bold text-sm mb-1">Error en el análisis</p>
                    <p className="text-rose-300/70 text-xs">{error}</p>
                  </div>
                </div>
              )}

              {analisis && !loading && selected && (
                <AnalysisResult
                  analisis={analisis}
                  rfq={selected}
                  onSave={handleSave}
                  saved={saved}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Historial tab ── */}
        {tab === 'historial' && (
          <div>
            {historial.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                  <History size={28} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-slate-400 font-bold">Sin análisis guardados</p>
                  <p className="text-sm text-slate-600 mt-1">Analiza un RFQ y guarda el resultado para verlo aquí.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {historial.map(record => (
                  <HistorialCard
                    key={record.id}
                    record={record}
                    onDelete={handleDelete}
                    onReload={handleReload}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FactibilidadIAView;
