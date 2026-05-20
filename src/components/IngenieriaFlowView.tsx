import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Activity, AlertTriangle,
  CheckCircle2, XCircle, Circle,
  BarChart2, Settings, Route
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { IngenieriaAdminPanel } from './IngenieriaAdminPanel';
import { IngenieriaKPIPanel } from './IngenieriaKPIPanel';
import clsx from 'clsx';
import { PrintButton } from './common/PrintButton';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type RiskLevel = 'cancelado' | 'atrasado' | 'en_riesgo' | 'ok' | 'completado' | 'pendiente';

const RISK_CONFIG: Record<RiskLevel, { label: string; badge: string; dot: string; row: string; glow: string }> = {
  cancelado:  { label: 'CANCELADO',  badge: 'bg-rose-600/20 text-rose-400 border-rose-600/40',       dot: 'bg-rose-500',             row: 'border-l-rose-600',   glow: 'shadow-[0_0_15px_rgba(225,29,72,0.4)]' },
  atrasado:   { label: 'ATRASADO',   badge: 'bg-red-600/20 text-red-400 border-red-600/40',          dot: 'bg-red-500 animate-pulse', row: 'border-l-red-600',    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
  en_riesgo:  { label: 'EN RIESGO',  badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',   dot: 'bg-amber-500 animate-pulse', row: 'border-l-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  ok:         { label: 'EN PROCESO', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',       dot: 'bg-blue-500',             row: 'border-l-blue-500',   glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
  completado: { label: 'LIBERADO',   badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500',       row: 'border-l-emerald-500',glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
  pendiente:  { label: 'SOLICITUD',  badge: 'bg-slate-600/30 text-slate-400 border-slate-600/30',   dot: 'bg-slate-500',            row: 'border-l-slate-600',  glow: 'shadow-none' },
};

const RISK_ICONS: Record<RiskLevel, React.ReactNode> = {
  cancelado:  <XCircle size={14} />,
  atrasado:   <AlertTriangle size={14} />,
  en_riesgo:  <AlertTriangle size={14} />,
  ok:         <Activity size={14} />,
  completado: <CheckCircle2 size={14} />,
  pendiente:  <Circle size={14} />,
};

const RISK_ORDER: Record<RiskLevel, number> = {
  atrasado: 0, cancelado: 1, en_riesgo: 2, ok: 3, pendiente: 4, completado: 5,
};

type FilterId = 'todos' | 'en_proceso' | 'atrasados' | 'completados' | 'cancelados';

const FILTER_TABS: { id: FilterId; label: string; color: string }[] = [
  { id: 'todos',       label: 'Todos',      color: 'text-slate-400' },
  { id: 'en_proceso',  label: 'En Proceso', color: 'text-blue-400' },
  { id: 'atrasados',   label: 'Atrasados',  color: 'text-red-400' },
  { id: 'completados', label: 'Liberados',  color: 'text-emerald-400' },
  { id: 'cancelados',  label: 'Cancelados', color: 'text-rose-400' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcRiesgo(v: any): RiskLevel {
  if (v.estatus === 'CANCELADO') return 'cancelado';
  if (v.estatus === 'LIBERADO')  return 'completado';
  if (v.estatus === 'SOLICITUD') return 'pendiente';

  if (v.fecha_entrega) {
    const hoy     = new Date();
    const entrega = new Date(v.fecha_entrega);
    const avance  = v.avance_porcentaje || 0;
    const hRest   = (v.horas_est_totales || 0) * (1 - avance / 100);
    const finEst  = new Date(hoy.getTime() + (hRest / 8) * 86400000);
    if (finEst > entrega) return 'atrasado';
    if (entrega.getTime() - finEst.getTime() < 2 * 86400000) return 'en_riesgo';
  }
  return 'ok';
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return 'S/F';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

// ─── Componente ──────────────────────────────────────────────────────────────

export const IngenieriaFlowView: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [items,        setItems]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [lastUpdate,   setLastUpdate]   = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<FilterId>('todos');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [panelMode,    setPanelMode]    = useState<'monitor' | 'admin' | 'kpi'>('monitor');

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viajeros_ingenieria')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = (data || []).map(v => ({
        ...v,
        riesgo: calcRiesgo(v),
      }));

      setItems(enriched);
      setLastUpdate(new Date());
      setFetchError(null);
    } catch (err) {
      console.error('Error ingenieria:', err);
      setFetchError('No se pudieron cargar los proyectos. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  // ── Filtrar ──────────────────────────────────────────────────────────────

  const filtered = items
    .filter(v => {
      if (activeFilter === 'en_proceso') return v.riesgo === 'ok' || v.riesgo === 'en_riesgo';
      if (activeFilter === 'atrasados')  return v.riesgo === 'atrasado';
      if (activeFilter === 'completados') return v.riesgo === 'completado';
      if (activeFilter === 'cancelados') return v.riesgo === 'cancelado';
      return true;
    })
    .filter(v => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        v.folio?.toLowerCase().includes(s) ||
        v.proyecto?.toLowerCase().includes(s) ||
        v.cliente?.toLowerCase().includes(s) ||
        v.responsable?.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => RISK_ORDER[a.riesgo as RiskLevel] - RISK_ORDER[b.riesgo as RiskLevel]);

  // ── Summary ──────────────────────────────────────────────────────────────
  const total       = items.length;
  const enProceso   = items.filter(v => v.riesgo === 'ok' || v.riesgo === 'en_riesgo').length;
  const atrasados   = items.filter(v => v.riesgo === 'atrasado').length;
  const completados = items.filter(v => v.riesgo === 'completado').length;

  // ─────────────────────────────────────────────────────────────────────────

  if (panelMode === 'admin') {
    return (
      <div className="h-full flex flex-col bg-mcvill-bg">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-white/10 shrink-0">
          {(['monitor', 'admin', 'kpi'] as const).map(m => (
            <button
              key={m}
              onClick={() => setPanelMode(m)}
              className={clsx(
                'px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 transition-all',
                panelMode === m
                  ? 'border-mcvill-accent text-mcvill-accent bg-mcvill-accent/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              {m === 'monitor' ? 'Monitor' : m === 'admin' ? 'Admin' : 'KPIs'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <IngenieriaAdminPanel />
        </div>
      </div>
    );
  }

  if (panelMode === 'kpi') {
    return (
      <div className="h-full flex flex-col bg-mcvill-bg">
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-white/10 shrink-0">
          {(['monitor', 'admin', 'kpi'] as const).map(m => (
            <button
              key={m}
              onClick={() => setPanelMode(m)}
              className={clsx(
                'px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-t-xl border-b-2 transition-all',
                panelMode === m
                  ? 'border-mcvill-accent text-mcvill-accent bg-mcvill-accent/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              {m === 'monitor' ? 'Monitor' : m === 'admin' ? 'Admin' : 'KPIs'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <IngenieriaKPIPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-mcvill-bg overflow-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-4 lg:px-8 py-4 border-b border-white/10 shrink-0 flex flex-col gap-3">
        {/* Tab bar */}
        <div className="flex items-center gap-1">
          {(['monitor', 'admin', 'kpi'] as const).map(m => (
            <button
              key={m}
              onClick={() => setPanelMode(m)}
              className={clsx(
                'px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all',
                panelMode === m
                  ? 'border-mcvill-accent text-mcvill-accent bg-mcvill-accent/10'
                  : 'border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
              )}
            >
              {m === 'monitor' ? (
                <span className="flex items-center gap-1.5"><Activity size={12} />Monitor</span>
              ) : m === 'admin' ? (
                <span className="flex items-center gap-1.5"><Settings size={12} />Admin</span>
              ) : (
                <span className="flex items-center gap-1.5"><BarChart2 size={12} />KPIs</span>
              )}
            </button>
          ))}
          <div className="flex-1" />
          <PrintButton />
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>

        {/* Title row */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-mcvill-accent/10 border border-mcvill-accent/30 flex items-center justify-center">
            <Route size={18} className="text-mcvill-accent" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-widest">Flujo Ingeniería</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Monitor en tiempo real · Actualización cada 30s</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Total',      value: total,       color: 'text-slate-300',  border: 'border-slate-600/30' },
            { label: 'En Proceso', value: enProceso,   color: 'text-blue-400',   border: 'border-blue-500/30' },
            { label: 'Atrasados',  value: atrasados,   color: 'text-red-400',    border: 'border-red-500/30' },
            { label: 'Liberados',  value: completados, color: 'text-emerald-400',border: 'border-emerald-500/30' },
          ].map(c => (
            <div key={c.label} className={clsx('bg-slate-900/80 backdrop-blur border rounded-2xl px-4 py-3', c.border)}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{c.label}</p>
              <p className={clsx('text-2xl font-black', c.color)}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900/60 border border-white/10 rounded-2xl p-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                  activeFilter === tab.id
                    ? clsx('bg-white/10 border border-white/20', tab.color)
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar folio, proyecto, cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[180px] bg-slate-900/60 border border-white/10 rounded-2xl px-4 py-2 text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-mcvill-accent/50"
          />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-4 lg:px-8 py-4">
        {fetchError ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-red-400 text-sm">{fetchError}</p>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={20} className="animate-spin text-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Route size={32} className="text-slate-700" />
            <p className="text-slate-600 text-sm">Sin proyectos en esta vista</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const rc = RISK_CONFIG[item.riesgo as RiskLevel];
              return (
                <div
                  key={item.id}
                  className={clsx(
                    'bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 border-l-4 transition-all hover:bg-slate-900',
                    rc.row
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Risk badge */}
                    <span className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest shrink-0', rc.badge)}>
                      {RISK_ICONS[item.riesgo as RiskLevel]}
                      {rc.label}
                    </span>

                    {/* Folio */}
                    <span className="text-[11px] font-black text-slate-300 font-mono shrink-0">{item.folio}</span>

                    {/* Proyecto */}
                    <span className="text-[13px] font-bold text-white flex-1 min-w-0 truncate">{item.proyecto}</span>

                    {/* Cliente */}
                    <span className="text-[11px] text-slate-400 hidden sm:block shrink-0">{item.cliente}</span>

                    {/* Responsable */}
                    <span className="text-[11px] text-slate-500 hidden md:block shrink-0">{item.responsable}</span>

                    {/* Prioridad */}
                    <span className={clsx(
                      'text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0',
                      item.prioridad === 'URGENTE' ? 'bg-rose-500/20 text-rose-400' :
                      item.prioridad === 'ALTA'    ? 'bg-amber-500/20 text-amber-400' :
                                                     'bg-slate-700/40 text-slate-400'
                    )}>{item.prioridad}</span>

                    {/* Fecha entrega */}
                    <span className="text-[11px] text-slate-400 shrink-0">{fmtDate(item.fecha_entrega)}</span>

                    {/* Avance */}
                    <div className="flex items-center gap-2 shrink-0 w-28">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all', item.riesgo === 'completado' ? 'bg-emerald-500' : 'bg-mcvill-accent')}
                          style={{ width: `${item.avance_porcentaje || 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 w-8 text-right">{item.avance_porcentaje || 0}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
