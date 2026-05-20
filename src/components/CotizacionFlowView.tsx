import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Activity, AlertTriangle, CheckCircle2, XCircle,
  Circle, Send, TrendingUp, DollarSign, FileText
} from 'lucide-react';
import clsx from 'clsx';
import { cotizacionViaService } from '../services/cotizacionViaService';
import { useConfig } from '../contexts/ConfigContext';
import { COT_ESTATUS_LABELS } from '../types/cotizacion';
import type { CotizacionItem } from '../types/cotizacion';
import { CotizacionViaAdminPanel } from './CotizacionViaAdminPanel';
import { CotizacionKPIPanel } from './CotizacionKPIPanel';
import { PrintButton } from './common/PrintButton';

// ─── Risk ────────────────────────────────────────────────────────────────────

type RiskLevel = 'cancelado' | 'atrasado' | 'en_riesgo' | 'en_seguimiento' | 'ok' | 'completado' | 'pendiente';

const RISK_CONFIG: Record<RiskLevel, { label: string; badge: string; dot: string; row: string; glow: string }> = {
  cancelado:      { label: 'CANCELADA',     badge: 'bg-rose-600/20 text-rose-400 border-rose-600/40',       dot: 'bg-rose-500',              row: 'border-l-rose-600',   glow: 'shadow-[0_0_15px_rgba(225,29,72,0.4)]' },
  atrasado:       { label: 'ATRASADA',      badge: 'bg-red-600/20 text-red-400 border-red-600/40',          dot: 'bg-red-500 animate-pulse', row: 'border-l-red-600',    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
  en_riesgo:      { label: 'EN RIESGO',     badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',   dot: 'bg-amber-500 animate-pulse',row: 'border-l-amber-500',  glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  en_seguimiento: { label: 'EN SEGUIMIENTO',badge: 'bg-sky-500/20 text-sky-400 border-sky-500/40',         dot: 'bg-sky-500',               row: 'border-l-sky-500',    glow: 'shadow-[0_0_15px_rgba(14,165,233,0.4)]' },
  ok:             { label: 'EN PROCESO',    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',      dot: 'bg-blue-500',              row: 'border-l-blue-500',   glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
  completado:     { label: 'GANADA',        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500',        row: 'border-l-emerald-500',glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
  pendiente:      { label: 'PENDIENTE',     badge: 'bg-slate-600/30 text-slate-400 border-slate-600/30',   dot: 'bg-slate-500',             row: 'border-l-slate-600',  glow: 'shadow-none' },
};

const RISK_ICONS: Record<RiskLevel, React.ReactNode> = {
  cancelado:      <XCircle size={14} />,
  atrasado:       <AlertTriangle size={14} />,
  en_riesgo:      <AlertTriangle size={14} />,
  en_seguimiento: <Send size={14} />,
  ok:             <Activity size={14} />,
  completado:     <CheckCircle2 size={14} />,
  pendiente:      <Circle size={14} />,
};

const RISK_ORDER: Record<RiskLevel, number> = {
  atrasado: 0, cancelado: 1, en_riesgo: 2, ok: 3, en_seguimiento: 4, pendiente: 5, completado: 6,
};

function calcRiesgo(c: CotizacionItem): RiskLevel {
  if (c.estatus === 'GANADA')    return 'completado';
  if (c.estatus === 'PERDIDA' || c.estatus === 'CANCELADA') return 'cancelado';
  if (c.estatus === 'ENVIADA')   return 'en_seguimiento';
  if (c.estatus === 'RFQ_RECIBIDA') return 'pendiente';

  if (c.fecha_entrega_requerida) {
    const hoy    = new Date();
    const limite = new Date(c.fecha_entrega_requerida);
    const avance = c.avance_porcentaje || 0;
    // Estimate remaining days proportional to avance
    const diasBase  = 10; // default effort estimate in days
    const diasRest  = diasBase * (1 - avance / 100);
    const finEst    = new Date(hoy.getTime() + diasRest * 86400000);
    if (finEst > limite) return 'atrasado';
    if (limite.getTime() - finEst.getTime() < 2 * 86400000) return 'en_riesgo';
  }
  return 'ok';
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

type FilterId = 'todas' | 'en_proceso' | 'en_seguimiento' | 'atrasadas' | 'ganadas' | 'perdidas';

const FILTER_TABS: { id: FilterId; label: string; color: string }[] = [
  { id: 'todas',          label: 'Todas',           color: 'text-slate-400' },
  { id: 'en_proceso',     label: 'En Proceso',      color: 'text-blue-400' },
  { id: 'en_seguimiento', label: 'En Seguimiento',  color: 'text-sky-400' },
  { id: 'atrasadas',      label: 'Atrasadas',       color: 'text-red-400' },
  { id: 'ganadas',        label: 'Ganadas',         color: 'text-emerald-400' },
  { id: 'perdidas',       label: 'Perdidas',        color: 'text-rose-400' },
];

const fmtMXN = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

const fmtDate = (iso?: string) => {
  if (!iso) return 'S/F';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

// ─── Component ───────────────────────────────────────────────────────────────

type PanelMode = 'flujo' | 'admin' | 'kpi';

export const CotizacionFlowView: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [cotizaciones,  setCotizaciones]  = useState<(CotizacionItem & { riesgo: RiskLevel })[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const [lastUpdate,    setLastUpdate]    = useState(new Date());
  const [activeFilter,  setActiveFilter]  = useState<FilterId>('todas');
  const [searchTerm,    setSearchTerm]    = useState('');
  const [panelMode,     setPanelMode]     = useState<PanelMode>('flujo');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await cotizacionViaService.getAll();
      const enriched = raw.map(c => ({ ...c, riesgo: calcRiesgo(c) }));
      // Sort by risk priority
      enriched.sort((a, b) => RISK_ORDER[a.riesgo] - RISK_ORDER[b.riesgo]);
      setCotizaciones(enriched);
      setLastUpdate(new Date());
      setFetchError(null);
    } catch (err) {
      console.error('Error cotizaciones:', err);
      setFetchError('No se pudieron cargar las cotizaciones. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = cotizaciones.filter(c => {
    const matchSearch =
      !searchTerm ||
      c.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    switch (activeFilter) {
      case 'en_proceso':     return c.riesgo === 'ok';
      case 'en_seguimiento': return c.riesgo === 'en_seguimiento';
      case 'atrasadas':      return c.riesgo === 'atrasado' || c.riesgo === 'en_riesgo';
      case 'ganadas':        return c.riesgo === 'completado';
      case 'perdidas':       return c.riesgo === 'cancelado';
      default:               return true;
    }
  });

  // ── Summary counts ────────────────────────────────────────────────────────

  const total      = cotizaciones.length;
  const enProceso  = cotizaciones.filter(c => c.riesgo === 'ok' || c.riesgo === 'en_riesgo' || c.riesgo === 'atrasado').length;
  const enviadas   = cotizaciones.filter(c => c.riesgo === 'en_seguimiento').length;
  const ganadas    = cotizaciones.filter(c => c.riesgo === 'completado').length;
  const pipeline   = cotizaciones
    .filter(c => !['GANADA','PERDIDA','CANCELADA'].includes(c.estatus))
    .reduce((s, c) => s + (c.valor_estimado || 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────

  if (panelMode === 'admin') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setPanelMode('flujo')} className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all">
            Flujo
          </button>
          <button className="px-4 py-2 rounded-xl bg-blue-600 text-white border border-blue-500 text-xs font-black uppercase tracking-widest">
            Administrar
          </button>
          <button onClick={() => setPanelMode('kpi')} className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all">
            KPIs
          </button>
        </div>
        <CotizacionViaAdminPanel onRefreshParent={fetchData} />
      </div>
    );
  }

  if (panelMode === 'kpi') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setPanelMode('flujo')} className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all">
            Flujo
          </button>
          <button onClick={() => setPanelMode('admin')} className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all">
            Administrar
          </button>
          <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white border border-emerald-500 text-xs font-black uppercase tracking-widest">
            KPIs
          </button>
        </div>
        <CotizacionKPIPanel />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <FileText size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white">Flujo Cotizaciones</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Actualizado: {lastUpdate.toLocaleTimeString('es-MX')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setPanelMode('admin')} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
            Administrar
          </button>
          <button onClick={() => setPanelMode('kpi')} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
            KPIs
          </button>
          <button
            onClick={fetchData}
            className={clsx('p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all', loading && 'animate-spin text-blue-400')}
          >
            <RefreshCw size={16} />
          </button>
          <PrintButton />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total RFQs',      value: total,   icon: <FileText size={16} />,      color: 'blue' },
          { label: 'En Proceso',      value: enProceso, icon: <Activity size={16} />,    color: 'blue' },
          { label: 'En Seguimiento',  value: enviadas,  icon: <Send size={16} />,         color: 'sky' },
          { label: 'Ganadas',         value: ganadas, icon: <CheckCircle2 size={16} />,  color: 'emerald' },
          { label: 'Pipeline ($)',    value: fmtMXN(pipeline), icon: <DollarSign size={16} />, color: 'amber', isText: true },
        ].map(card => (
          <div key={card.label} className={clsx(
            'p-4 rounded-2xl border bg-white/[0.02] backdrop-blur-sm flex items-center gap-3',
            card.color === 'blue'    && 'border-blue-500/20',
            card.color === 'sky'     && 'border-sky-500/20',
            card.color === 'emerald' && 'border-emerald-500/20',
            card.color === 'amber'   && 'border-amber-500/20',
          )}>
            <div className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              card.color === 'blue'    && 'bg-blue-500/10 text-blue-400',
              card.color === 'sky'     && 'bg-sky-500/10 text-sky-400',
              card.color === 'emerald' && 'bg-emerald-500/10 text-emerald-400',
              card.color === 'amber'   && 'bg-amber-500/10 text-amber-400',
            )}>
              {card.icon}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{card.label}</p>
              <p className={clsx(
                'font-black',
                card.isText ? 'text-sm' : 'text-xl',
                card.color === 'blue'    && 'text-blue-300',
                card.color === 'sky'     && 'text-sky-300',
                card.color === 'emerald' && 'text-emerald-300',
                card.color === 'amber'   && 'text-amber-300',
              )}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                activeFilter === tab.id
                  ? `${tab.color} border-current bg-current/10`
                  : 'text-slate-500 border-transparent hover:border-white/10 hover:text-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar folio, cliente, responsable..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full sm:w-72 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
        />
      </div>

      {/* Error */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
          {fetchError}
        </div>
      )}

      {/* Loading */}
      {loading && cotizaciones.length === 0 && (
        <div className="flex items-center justify-center h-40 gap-3">
          <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargando cotizaciones...</p>
        </div>
      )}

      {/* Table */}
      {!loading || cotizaciones.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.01]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  {['Folio', 'Cliente', 'Descripción', 'Responsable', 'Valor Est.', 'Prob. %', 'Estatus', 'Límite', 'Avance'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                      Sin resultados para el filtro seleccionado
                    </td>
                  </tr>
                )}
                {filtered.map(c => {
                  const risk = RISK_CONFIG[c.riesgo];
                  return (
                    <tr
                      key={c.id}
                      className={clsx(
                        'border-b border-white/[0.04] border-l-2 transition-all hover:bg-white/[0.03]',
                        risk.row,
                        risk.glow
                      )}
                    >
                      <td className="px-4 py-3 font-black text-slate-200 whitespace-nowrap">{c.folio}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-[140px] truncate">{c.cliente}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[180px] truncate">{c.descripcion}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.responsable}</td>
                      <td className="px-4 py-3 text-slate-300 font-bold whitespace-nowrap">{fmtMXN(c.valor_estimado)}</td>
                      <td className="px-4 py-3 text-slate-300 font-bold">{c.probabilidad_cierre}%</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border',
                          risk.badge
                        )}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', risk.dot)} />
                          {COT_ESTATUS_LABELS[c.estatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(c.fecha_entrega_requerida)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[60px] h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={clsx(
                                'h-full rounded-full transition-all duration-500',
                                c.avance_porcentaje >= 80 ? 'bg-emerald-500' :
                                c.avance_porcentaje >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                              )}
                              style={{ width: `${c.avance_porcentaje}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-500 font-bold w-7 text-right">
                            {c.avance_porcentaje}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Footer count */}
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">
        Mostrando {filtered.length} de {cotizaciones.length} cotizaciones
      </p>
    </div>
  );
};
