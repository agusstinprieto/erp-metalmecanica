import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Users, AlertTriangle, CheckCircle2, XCircle,
  Clock, Activity, Circle, Zap
} from 'lucide-react';
import { rhViaService } from '../services/rhViaService';
import { useConfig } from '../contexts/ConfigContext';
import { RHViaAdminPanel } from './RHViaAdminPanel';
import { RHKPIPanel } from './RHKPIPanel';
import clsx from 'clsx';
import { PrintButton } from './common/PrintButton';
import type { RHItem } from '../types/rh';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type RiskLevel = 'cancelado' | 'atrasado' | 'en_riesgo' | 'en_proceso_final' | 'ok' | 'completado' | 'pendiente';

const RISK_CONFIG: Record<RiskLevel, { label: string; badge: string; dot: string; row: string; glow: string }> = {
  cancelado:        { label: 'CANCELADO',      badge: 'bg-rose-600/20 text-rose-400 border-rose-600/40',      dot: 'bg-rose-500',              row: 'border-l-rose-600',   glow: 'shadow-[0_0_15px_rgba(225,29,72,0.4)]' },
  atrasado:         { label: 'ATRASADO',        badge: 'bg-red-600/20 text-red-400 border-red-600/40',         dot: 'bg-red-500 animate-pulse', row: 'border-l-red-600',    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
  en_riesgo:        { label: 'EN RIESGO',       badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',   dot: 'bg-amber-500 animate-pulse', row: 'border-l-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  en_proceso_final: { label: 'ONBOARDING',      badge: 'bg-sky-500/20 text-sky-400 border-sky-500/40',         dot: 'bg-sky-500',               row: 'border-l-sky-500',    glow: 'shadow-[0_0_15px_rgba(14,165,233,0.4)]' },
  ok:               { label: 'EN PROCESO',      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',      dot: 'bg-blue-500',              row: 'border-l-blue-500',   glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
  completado:       { label: 'ACTIVO',          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500',        row: 'border-l-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
  pendiente:        { label: 'VACANTE',         badge: 'bg-slate-600/30 text-slate-400 border-slate-600/30',   dot: 'bg-slate-500',             row: 'border-l-slate-600',  glow: 'shadow-none' },
};

const RISK_ICONS: Record<RiskLevel, React.ReactNode> = {
  cancelado:        <XCircle size={14} />,
  atrasado:         <AlertTriangle size={14} />,
  en_riesgo:        <AlertTriangle size={14} />,
  en_proceso_final: <Clock size={14} />,
  ok:               <Activity size={14} />,
  completado:       <CheckCircle2 size={14} />,
  pendiente:        <Circle size={14} />,
};

const RISK_ORDER: Record<RiskLevel, number> = {
  atrasado: 0, cancelado: 1, en_riesgo: 2, en_proceso_final: 3, ok: 4, pendiente: 5, completado: 6,
};

type FilterId = 'todos' | 'en_proceso' | 'urgentes' | 'atrasadas' | 'completadas' | 'canceladas';

const FILTER_TABS: { id: FilterId; label: string; color: string }[] = [
  { id: 'todos',       label: 'Todas',       color: 'text-slate-400' },
  { id: 'en_proceso',  label: 'En Proceso',  color: 'text-blue-400' },
  { id: 'urgentes',    label: 'Urgentes',    color: 'text-amber-400' },
  { id: 'atrasadas',   label: 'Atrasadas',   color: 'text-red-400' },
  { id: 'completadas', label: 'Completadas', color: 'text-emerald-400' },
  { id: 'canceladas',  label: 'Canceladas',  color: 'text-rose-400' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcRiesgo(v: RHItem): RiskLevel {
  if (v.estatus === 'CANCELADO') return 'cancelado';
  if (v.estatus === 'ACTIVO')    return 'completado';
  if (v.estatus === 'ONBOARDING') return 'en_proceso_final';
  if (v.estatus === 'VACANTE' || v.estatus === 'RECLUTAMIENTO') {
    if (v.urgente) return 'atrasado';
  }
  if (!v.fecha_objetivo) return 'ok';

  const hoy      = new Date();
  const objetivo = new Date(v.fecha_objetivo);
  const diff     = objetivo.getTime() - hoy.getTime();
  const dias     = diff / 86400000;

  if (dias < 0)   return 'atrasado';
  if (dias <= 5)  return 'en_riesgo';
  return 'ok';
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return 'S/F';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
};

const fmtSalario = (min?: number, max?: number) => {
  if (!min && !max) return '—';
  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min || max || 0);
};

// ─── Componente ──────────────────────────────────────────────────────────────

export const RHFlowView: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [items,        setItems]       = useState<any[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [fetchError,   setFetchError]  = useState<string | null>(null);
  const [lastUpdate,   setLastUpdate]  = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<FilterId>('todos');
  const [searchTerm,   setSearchTerm]  = useState('');
  const [panelMode,    setPanelMode]   = useState<'flujo' | 'admin' | 'kpi'>('flujo');

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rhViaService.getAll();
      const enriched = data.map(v => ({ ...v, riesgo: calcRiesgo(v) }));
      setItems(enriched);
      setLastUpdate(new Date());
      setFetchError(null);
    } catch (err) {
      console.error('Error viajeros_rh:', err);
      setFetchError('No se pudieron cargar las solicitudes de RH. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  // ── Filtros ──────────────────────────────────────────────────────────────

  const filtered = items
    .filter(v => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          v.folio?.toLowerCase().includes(q) ||
          v.puesto?.toLowerCase().includes(q) ||
          v.departamento?.toLowerCase().includes(q) ||
          v.solicitante?.toLowerCase().includes(q) ||
          v.candidato_seleccionado?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .filter(v => {
      switch (activeFilter) {
        case 'en_proceso':  return ['RECLUTAMIENTO','ENTREVISTAS','SELECCION','OFERTA'].includes(v.estatus);
        case 'urgentes':    return v.urgente === true;
        case 'atrasadas':   return v.riesgo === 'atrasado';
        case 'completadas': return v.estatus === 'ACTIVO';
        case 'canceladas':  return v.estatus === 'CANCELADO';
        default:            return true;
      }
    })
    .sort((a, b) => (RISK_ORDER[a.riesgo as RiskLevel] ?? 9) - (RISK_ORDER[b.riesgo as RiskLevel] ?? 9));

  // ── Summary cards ────────────────────────────────────────────────────────

  const vacantesAbiertas = items.filter(v => v.estatus === 'VACANTE').length;
  const enProceso        = items.filter(v => ['RECLUTAMIENTO','ENTREVISTAS','SELECCION','OFERTA','ONBOARDING'].includes(v.estatus)).length;
  const urgentes         = items.filter(v => v.urgente).length;
  const thisMonth        = new Date(); thisMonth.setDate(1);
  const activosEsteMes   = items.filter(v => v.estatus === 'ACTIVO' && v.fecha_ingreso && new Date(v.fecha_ingreso) >= thisMonth).length;

  const SUMMARY_CARDS = [
    { label: 'Vacantes Abiertas', value: vacantesAbiertas, color: 'text-slate-300',   dot: 'bg-slate-500' },
    { label: 'En Proceso',        value: enProceso,        color: 'text-blue-400',    dot: 'bg-blue-500' },
    { label: 'Urgentes',          value: urgentes,         color: 'text-amber-400',   dot: 'bg-amber-500 animate-pulse' },
    { label: 'Activos (mes)',      value: activosEsteMes,  color: 'text-emerald-400', dot: 'bg-emerald-500' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  if (panelMode === 'admin') {
    return <RHViaAdminPanel onBack={() => setPanelMode('flujo')} />;
  }
  if (panelMode === 'kpi') {
    return <RHKPIPanel onBack={() => setPanelMode('flujo')} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={clsx(
        'shrink-0 border-b px-6 py-4 flex items-center justify-between gap-4 flex-wrap',
        isDarkMode ? 'bg-mcvill-bg border-mcvill-card-border/30' : 'bg-white border-blue-100'
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Users size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className={clsx('text-lg font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
              Flujo RH
            </h1>
            <p className={clsx('text-[10px] font-bold tracking-widest uppercase', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
              Monitoreo de Solicitudes · {items.length} registros
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('text-[10px]', isDarkMode ? 'text-slate-600' : 'text-slate-400')}>
            Actualizado {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <PrintButton />
          <button
            onClick={() => setPanelMode('kpi')}
            className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-purple-600/10 border border-purple-500/20 text-purple-400 hover:bg-purple-600/20 transition-all"
          >
            KPIs
          </button>
          <button
            onClick={() => setPanelMode('admin')}
            className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 transition-all"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="shrink-0 px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        {SUMMARY_CARDS.map(card => (
          <div key={card.label} className={clsx(
            'rounded-xl border p-3 flex items-center gap-3',
            isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
          )}>
            <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0', card.dot)} />
            <div>
              <p className={clsx('text-xl font-black', card.color)}>{card.value}</p>
              <p className={clsx('text-[9px] font-bold uppercase tracking-wider', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div className="shrink-0 px-6 pb-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={clsx(
                'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                activeFilter === tab.id
                  ? `${tab.color} bg-white/[0.08]`
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar puesto, depto, folio…"
          className={clsx(
            'flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border text-[11px] outline-none transition-all',
            isDarkMode
              ? 'bg-white/[0.04] border-white/[0.08] text-slate-300 placeholder-slate-600 focus:border-blue-500/40'
              : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-blue-400'
          )}
        />
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mx-6 mb-3 p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-[11px]">
          {fetchError}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-40 gap-3 text-slate-500">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Cargando solicitudes RH…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            Sin resultados para este filtro
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className={clsx('border-b', isDarkMode ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                  {['Folio','Puesto','Departamento','Solicitante','Pos.','Salario','Estatus','Fecha Obj.','Candidato','Urgente'].map(h => (
                    <th key={h} className={clsx('px-3 py-2.5 text-left font-black uppercase tracking-wider', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, idx) => {
                  const risk = v.riesgo as RiskLevel;
                  const cfg  = RISK_CONFIG[risk];
                  return (
                    <tr
                      key={v.id}
                      className={clsx(
                        'border-b border-l-2 transition-all',
                        cfg.row,
                        isDarkMode
                          ? `border-white/[0.04] ${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'} hover:bg-white/[0.04]`
                          : `border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50`
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <span className={clsx('font-black', isDarkMode ? 'text-blue-400' : 'text-blue-600')}>
                          {v.folio}
                        </span>
                      </td>
                      <td className={clsx('px-3 py-2.5 font-semibold max-w-[140px] truncate', isDarkMode ? 'text-slate-200' : 'text-slate-800')}>
                        {v.puesto}
                      </td>
                      <td className={clsx('px-3 py-2.5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                        {v.departamento}
                      </td>
                      <td className={clsx('px-3 py-2.5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                        {v.solicitante}
                      </td>
                      <td className={clsx('px-3 py-2.5 text-center font-black', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                        {v.num_posiciones ?? 1}
                      </td>
                      <td className={clsx('px-3 py-2.5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                        {fmtSalario(v.salario_min, v.salario_max)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider',
                          cfg.badge
                        )}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                          {RISK_ICONS[risk]}
                          {v.estatus}
                        </span>
                      </td>
                      <td className={clsx('px-3 py-2.5', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                        {fmtDate(v.fecha_objetivo)}
                      </td>
                      <td className={clsx('px-3 py-2.5 max-w-[120px] truncate', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                        {v.candidato_seleccionado || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {v.urgente && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black">
                            <Zap size={9} />
                            URGENTE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
