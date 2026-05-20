import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ShoppingCart, Truck, PackageCheck, DollarSign,
  AlertTriangle, CheckCircle2, XCircle, Clock, Activity,
  Circle, Zap
} from 'lucide-react';
import clsx from 'clsx';
import { comprasViaService } from '../services/comprasViaService';
import { ComprasViaAdminPanel } from './ComprasViaAdminPanel';
import { ComprasKPIPanel } from './ComprasKPIPanel';
import { PrintButton } from './common/PrintButton';
import type { ComprasItem } from '../types/compras';

// ─── Risk config ──────────────────────────────────────────────────────────────

type RiskLevel = 'cancelado' | 'atrasado' | 'en_riesgo' | 'en_transito' | 'ok' | 'completado' | 'pendiente';

const RISK_CONFIG: Record<RiskLevel, { label: string; badge: string; dot: string; row: string; glow: string }> = {
  cancelado:   { label: 'CANCELADO',   badge: 'bg-rose-600/20 text-rose-400 border-rose-600/40',      dot: 'bg-rose-500',              row: 'border-l-rose-600',   glow: 'shadow-[0_0_15px_rgba(225,29,72,0.4)]' },
  atrasado:    { label: 'ATRASADO',    badge: 'bg-red-600/20 text-red-400 border-red-600/40',          dot: 'bg-red-500 animate-pulse', row: 'border-l-red-600',    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
  en_riesgo:   { label: 'EN RIESGO',   badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',   dot: 'bg-amber-500 animate-pulse', row: 'border-l-amber-500',  glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  en_transito: { label: 'EN TRÁNSITO', badge: 'bg-sky-500/20 text-sky-400 border-sky-500/40',         dot: 'bg-sky-500 animate-pulse', row: 'border-l-sky-500',    glow: 'shadow-[0_0_15px_rgba(14,165,233,0.4)]' },
  ok:          { label: 'EN PROCESO',  badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',      dot: 'bg-blue-500',              row: 'border-l-blue-500',   glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
  completado:  { label: 'COMPLETADO',  badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500',          row: 'border-l-emerald-500',glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
  pendiente:   { label: 'PENDIENTE',   badge: 'bg-slate-600/30 text-slate-400 border-slate-600/30',   dot: 'bg-slate-500',             row: 'border-l-slate-600',  glow: 'shadow-none' },
};

const RISK_ORDER: Record<RiskLevel, number> = {
  atrasado: 0, cancelado: 1, en_riesgo: 2, en_transito: 3, ok: 4, pendiente: 5, completado: 6,
};

type FilterId = 'todas' | 'en_proceso' | 'en_transito' | 'atrasadas' | 'completadas' | 'canceladas';

const FILTER_TABS: { id: FilterId; label: string; color: string }[] = [
  { id: 'todas',       label: 'Todas',        color: 'text-slate-400' },
  { id: 'en_proceso',  label: 'En Proceso',   color: 'text-blue-400' },
  { id: 'en_transito', label: 'En Tránsito',  color: 'text-sky-400' },
  { id: 'atrasadas',   label: 'Atrasadas',    color: 'text-red-400' },
  { id: 'completadas', label: 'Completadas',  color: 'text-emerald-400' },
  { id: 'canceladas',  label: 'Canceladas',   color: 'text-rose-400' },
];

// ─── Risk calculation ─────────────────────────────────────────────────────────

function calcRiesgo(c: ComprasItem): RiskLevel {
  if (c.estatus === 'CANCELADA') return 'cancelado';
  if (c.estatus === 'CERRADA' || c.estatus === 'RECIBIDA') return 'completado';
  if (c.estatus === 'EN_TRANSITO') return 'en_transito';
  if (c.estatus === 'REQUISICION') return 'pendiente';

  if (!c.fecha_entrega_requerida) return 'ok';

  const hoy       = new Date();
  const entrega   = new Date(c.fecha_entrega_requerida);
  const avance    = c.avance_porcentaje || 0;
  // Estimate finish based on percentage remaining (1 day per 10% remaining as baseline)
  const diasRest  = (1 - avance / 100) * 10;
  const finEst    = new Date(hoy.getTime() + diasRest * 86400000);

  if (finEst > entrega) return 'atrasado';
  if (entrega.getTime() - finEst.getTime() < 2 * 86400000) return 'en_riesgo';
  return 'ok';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
};

const fmtMoney = (n: number, moneda: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(n);

// ─── Component ────────────────────────────────────────────────────────────────

export const ComprasFlowView: React.FC = () => {
  const [items,        setItems]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [lastUpdate,   setLastUpdate]   = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<FilterId>('todas');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [panelMode,    setPanelMode]    = useState<'flujo' | 'admin' | 'kpi'>('flujo');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await comprasViaService.getAll();
      const enriched = raw.map(c => ({ ...c, riesgo: calcRiesgo(c) }));
      enriched.sort((a, b) => RISK_ORDER[a.riesgo as RiskLevel] - RISK_ORDER[b.riesgo as RiskLevel]);
      setItems(enriched);
      setLastUpdate(new Date());
      setFetchError(null);
    } catch (err) {
      console.error('Error compras:', err);
      setFetchError('No se pudieron cargar las OCs. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  // ── Filtered items ────────────────────────────────────────────────────────

  const filtered = items.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      c.folio?.toLowerCase().includes(q) ||
      c.proveedor?.toLowerCase().includes(q) ||
      c.concepto?.toLowerCase().includes(q) ||
      c.solicitante?.toLowerCase().includes(q);

    const matchFilter =
      activeFilter === 'todas' ? true :
      activeFilter === 'en_proceso'  ? (c.riesgo === 'ok' || c.riesgo === 'en_riesgo' || c.riesgo === 'pendiente') :
      activeFilter === 'en_transito' ? c.riesgo === 'en_transito' :
      activeFilter === 'atrasadas'   ? c.riesgo === 'atrasado' :
      activeFilter === 'completadas' ? c.riesgo === 'completado' :
      activeFilter === 'canceladas'  ? c.riesgo === 'cancelado' :
      true;

    return matchSearch && matchFilter;
  });

  // ── Summary cards ────────────────────────────────────────────────────────

  const totalOCs     = items.length;
  const enProceso    = items.filter(c => ['ok', 'en_riesgo', 'atrasado', 'pendiente'].includes(c.riesgo)).length;
  const enTransito   = items.filter(c => c.riesgo === 'en_transito').length;
  const montoPend    = items
    .filter(c => !['completado', 'cancelado'].includes(c.riesgo))
    .reduce((s, c) => s + (c.moneda === 'MXN' ? (c.monto_total || 0) : 0), 0);
  const urgentes     = items.filter(c => c.urgente && !['completado', 'cancelado'].includes(c.riesgo)).length;

  if (panelMode === 'admin') return <ComprasViaAdminPanel />;
  if (panelMode === 'kpi')   return <ComprasKPIPanel />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <ShoppingCart size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Flujo Compras</h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Actualizado: {lastUpdate.toLocaleTimeString('es-MX')} · Auto-refresh 30s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Panel mode tabs */}
          {(['flujo', 'admin', 'kpi'] as const).map(m => (
            <button
              key={m}
              onClick={() => setPanelMode(m)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border',
                panelMode === m
                  ? 'bg-blue-600/20 text-blue-400 border-blue-600/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-blue-600/30 hover:text-blue-400'
              )}
            >
              {m === 'flujo' ? 'Monitor' : m === 'admin' ? 'Admin' : 'KPIs'}
            </button>
          ))}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-blue-400 hover:border-blue-600/30 transition-all"
          >
            <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
          </button>
          <PrintButton />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:hidden">
        {[
          { label: 'Total OCs',             value: totalOCs,                   icon: ShoppingCart, color: 'text-blue-400',    bg: 'bg-blue-600/10',    border: 'border-blue-600/20' },
          { label: 'En Proceso',            value: enProceso,                  icon: Activity,     color: 'text-amber-400',   bg: 'bg-amber-600/10',   border: 'border-amber-600/20' },
          { label: 'En Tránsito',           value: enTransito,                 icon: Truck,        color: 'text-sky-400',     bg: 'bg-sky-600/10',     border: 'border-sky-600/20' },
          { label: 'Monto Pendiente (MXN)', value: fmtMoney(montoPend, 'MXN'), icon: DollarSign,   color: 'text-emerald-400', bg: 'bg-emerald-600/10', border: 'border-emerald-600/20' },
          { label: 'Urgentes',              value: urgentes,                   icon: Zap,          color: 'text-orange-400',  bg: 'bg-orange-600/10',  border: 'border-orange-600/20' },
        ].map(card => (
          <div key={card.label} className={clsx('rounded-2xl border p-4 flex items-center gap-3 backdrop-blur-sm', card.bg, card.border)}>
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', card.bg, 'border', card.border)}>
              <card.icon size={16} className={card.color} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{card.label}</p>
              <p className={clsx('text-lg font-black', card.color)}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border',
                activeFilter === tab.id
                  ? clsx('bg-slate-700/60 border-slate-500/50', tab.color)
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar folio, proveedor, concepto..."
          className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-600/50 w-64"
        />
      </div>

      {/* Error */}
      {fetchError && (
        <div className="rounded-2xl border border-red-600/30 bg-red-600/10 p-4 text-red-400 text-sm">
          {fetchError}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-700/50 overflow-hidden bg-slate-900/40 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30">
                {['Folio', 'Proveedor', 'Concepto', 'Solicitante', 'Monto', 'Estatus', 'Entrega Req.', ''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Cargando órdenes de compra...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                    No hay registros con los filtros actuales.
                  </td>
                </tr>
              )}
              {!loading && filtered.map(c => {
                const risk = c.riesgo as RiskLevel;
                const cfg  = RISK_CONFIG[risk];
                return (
                  <tr
                    key={c.id}
                    className={clsx(
                      'border-l-2 transition-colors hover:bg-slate-800/30',
                      cfg.row,
                      risk === 'atrasado' ? cfg.glow : ''
                    )}
                  >
                    <td className="px-3 py-3 font-mono font-bold text-white text-xs whitespace-nowrap">
                      {c.folio || '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-300 text-xs max-w-[140px] truncate">{c.proveedor || '—'}</td>
                    <td className="px-3 py-3 text-slate-300 text-xs max-w-[180px] truncate">{c.concepto || '—'}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs">{c.solicitante || '—'}</td>
                    <td className="px-3 py-3 text-xs font-bold text-slate-200 whitespace-nowrap">
                      {c.monto_total ? fmtMoney(c.monto_total, c.moneda || 'MXN') : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                        <span className={clsx('px-2 py-0.5 rounded-lg text-[10px] font-bold border', cfg.badge)}>
                          {cfg.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {fmtDate(c.fecha_entrega_requerida)}
                    </td>
                    <td className="px-3 py-3">
                      {c.urgente && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black border bg-orange-500/20 text-orange-400 border-orange-500/40 flex items-center gap-1 w-fit">
                          <Zap size={10} /> URGENTE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
