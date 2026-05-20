import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, TrendingUp, Activity, AlertTriangle,
  CheckCircle2, XCircle, Truck, Circle,
  DollarSign, Package, Zap
} from 'lucide-react';
import clsx from 'clsx';
import { ventasViaService } from '../services/ventasViaService';
import { PrintButton } from './common/PrintButton';
import type { VentasItem } from '../types/ventas';
import { VentasViaAdminPanel } from './VentasViaAdminPanel';
import { VentasKPIPanel } from './VentasKPIPanel';

// ─── Risk Types ───────────────────────────────────────────────────────────────

type RiskLevel = 'cancelado' | 'atrasado' | 'en_riesgo' | 'en_transito' | 'ok' | 'completado' | 'pendiente';

const RISK_CONFIG: Record<RiskLevel, { label: string; badge: string; dot: string; row: string; glow: string }> = {
  cancelado:   { label: 'CANCELADO',   badge: 'bg-rose-600/20 text-rose-400 border-rose-600/40',      dot: 'bg-rose-500',              row: 'border-l-rose-600',   glow: 'shadow-[0_0_15px_rgba(225,29,72,0.4)]' },
  atrasado:    { label: 'ATRASADO',    badge: 'bg-red-600/20 text-red-400 border-red-600/40',          dot: 'bg-red-500 animate-pulse', row: 'border-l-red-600',    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
  en_riesgo:   { label: 'EN RIESGO',   badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',   dot: 'bg-amber-500 animate-pulse', row: 'border-l-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  en_transito: { label: 'EMBARQUE',    badge: 'bg-sky-500/20 text-sky-400 border-sky-500/40',         dot: 'bg-sky-500',               row: 'border-l-sky-500',    glow: 'shadow-[0_0_15px_rgba(14,165,233,0.4)]' },
  ok:          { label: 'EN PROCESO',  badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',      dot: 'bg-blue-500',              row: 'border-l-blue-500',   glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
  completado:  { label: 'COMPLETADO',  badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500',       row: 'border-l-emerald-500',glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
  pendiente:   { label: 'PENDIENTE',   badge: 'bg-slate-600/30 text-slate-400 border-slate-600/30',   dot: 'bg-slate-500',             row: 'border-l-slate-600',  glow: 'shadow-none' },
};

const RISK_ORDER: Record<RiskLevel, number> = {
  atrasado: 0, cancelado: 1, en_riesgo: 2, en_transito: 3, ok: 4, pendiente: 5, completado: 6,
};

type FilterId = 'todos' | 'en_proceso' | 'en_embarque' | 'atrasados' | 'facturados' | 'cancelados';

const FILTER_TABS: { id: FilterId; label: string; color: string }[] = [
  { id: 'todos',       label: 'Todos',       color: 'text-slate-400' },
  { id: 'en_proceso',  label: 'En Proceso',  color: 'text-blue-400' },
  { id: 'en_embarque', label: 'En Embarque', color: 'text-sky-400' },
  { id: 'atrasados',   label: 'Atrasados',   color: 'text-red-400' },
  { id: 'facturados',  label: 'Facturados',  color: 'text-emerald-400' },
  { id: 'cancelados',  label: 'Cancelados',  color: 'text-rose-400' },
];

// ─── Risk Calculation ─────────────────────────────────────────────────────────

function calcRiesgo(v: VentasItem): RiskLevel {
  if (v.estatus === 'CANCELADO') return 'cancelado';
  if (v.estatus === 'FACTURADO' || v.estatus === 'ENTREGADO') return 'completado';
  if (v.estatus === 'EMBARQUE') return 'en_transito';

  if (v.estatus === 'EN_PRODUCCION' && v.fecha_entrega_prometida) {
    const hoy    = new Date();
    const entrega = new Date(v.fecha_entrega_prometida);
    const avance  = v.avance_porcentaje || 0;
    // Estimate finish from remaining progress (rough: 1% = 0.1 day)
    const diasRest = (100 - avance) * 0.1;
    const finEst   = new Date(hoy.getTime() + diasRest * 86400000);
    if (finEst > entrega) return 'atrasado';
    if (entrega.getTime() - finEst.getTime() < 2 * 86400000) return 'en_riesgo';
  }

  if (!v.fecha_entrega_prometida) return 'ok';
  return 'ok';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '---';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
};

const fmtMoney = (n: number, moneda = 'MXN') =>
  `${moneda === 'USD' ? '$' : '$'}${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${moneda}`;

// ─── Component ────────────────────────────────────────────────────────────────

type PanelMode = 'monitor' | 'admin' | 'kpi';

export const VentasFlowView: React.FC = () => {
  const [items,       setItems]       = useState<(VentasItem & { riesgo: RiskLevel })[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState<string | null>(null);
  const [lastUpdate,  setLastUpdate]  = useState(new Date());
  const [activeFilter,setActiveFilter]= useState<FilterId>('todos');
  const [searchTerm,  setSearchTerm]  = useState('');
  const [panelMode,   setPanelMode]   = useState<PanelMode>('monitor');

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ventasViaService.getAll();
      const enriched = data.map(v => ({ ...v, riesgo: calcRiesgo(v) }));
      setItems(enriched);
      setLastUpdate(new Date());
      setFetchError(null);
    } catch (err) {
      console.error('Error ventas:', err);
      setFetchError('No se pudieron cargar los pedidos de ventas. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  // ── Filter + Search ───────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    let list = items.filter(v => {
      switch (activeFilter) {
        case 'en_proceso':  return ['PROSPECTO','PROPUESTA','NEGOCIACION','PEDIDO','EN_PRODUCCION'].includes(v.estatus);
        case 'en_embarque': return v.estatus === 'EMBARQUE';
        case 'atrasados':   return v.riesgo === 'atrasado' || v.riesgo === 'en_riesgo';
        case 'facturados':  return v.estatus === 'FACTURADO' || v.estatus === 'ENTREGADO';
        case 'cancelados':  return v.estatus === 'CANCELADO';
        default:            return true;
      }
    });

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(v =>
        (v.folio || '').toLowerCase().includes(q) ||
        (v.cliente || '').toLowerCase().includes(q) ||
        (v.descripcion || '').toLowerCase().includes(q) ||
        (v.responsable_ventas || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (RISK_ORDER[a.riesgo] ?? 9) - (RISK_ORDER[b.riesgo] ?? 9));
  }, [items, activeFilter, searchTerm]);

  const filterCount = (id: FilterId) => {
    switch (id) {
      case 'en_proceso':  return items.filter(v => ['PROSPECTO','PROPUESTA','NEGOCIACION','PEDIDO','EN_PRODUCCION'].includes(v.estatus)).length;
      case 'en_embarque': return items.filter(v => v.estatus === 'EMBARQUE').length;
      case 'atrasados':   return items.filter(v => v.riesgo === 'atrasado' || v.riesgo === 'en_riesgo').length;
      case 'facturados':  return items.filter(v => v.estatus === 'FACTURADO' || v.estatus === 'ENTREGADO').length;
      case 'cancelados':  return items.filter(v => v.estatus === 'CANCELADO').length;
      default:            return items.length;
    }
  };

  // ── Summary Stats ─────────────────────────────────────────────────────────

  const totalPedidos   = items.length;
  const enProceso      = items.filter(v => ['PROSPECTO','PROPUESTA','NEGOCIACION','PEDIDO','EN_PRODUCCION'].includes(v.estatus)).length;
  const enEmbarque     = items.filter(v => v.estatus === 'EMBARQUE').length;
  const valorFacturado = items
    .filter(v => v.estatus === 'FACTURADO')
    .reduce((acc, v) => acc + (v.valor_pedido || 0), 0);
  const atrasados      = items.filter(v => v.riesgo === 'atrasado' || v.riesgo === 'en_riesgo').length;

  // ── Tab switch helpers ───────────────────────────────────────────────────
  const TabBar = () => (
    <div className="flex items-center gap-2 mb-4">
      {([['monitor','Monitor'],['admin','Admin'],['kpi','KPIs']] as [PanelMode, string][]).map(([id, label]) => (
        <button
          key={id}
          onClick={() => setPanelMode(id)}
          className={clsx(
            'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border',
            panelMode === id
              ? id === 'kpi' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-blue-600 border-blue-500 text-white'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
          )}
        >{label}</button>
      ))}
    </div>
  );

  if (panelMode === 'admin') {
    return (
      <div className="space-y-4">
        <TabBar />
        <VentasViaAdminPanel onRefreshParent={fetchData} />
      </div>
    );
  }

  if (panelMode === 'kpi') {
    return (
      <div className="space-y-4">
        <TabBar />
        <VentasKPIPanel />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <TrendingUp className="text-emerald-400" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              FLUJO <span className="text-emerald-400">VENTAS</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Live Feed · Seguimiento de Pedidos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPanelMode('admin')}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
          >Admin</button>
          <button
            onClick={() => setPanelMode('kpi')}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
          >KPIs</button>
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Actualización</span>
            <span className="text-[10px] font-mono text-white font-bold">{lastUpdate.toLocaleTimeString()}</span>
          </div>
          <button onClick={fetchData} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95">
            <RefreshCw size={12} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>
          <PrintButton />
        </div>
      </div>

      {fetchError && (
        <div className="mx-4 mt-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[11px] font-bold shrink-0">
          {fetchError}
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
          {[
            { label: 'TOTAL PEDIDOS',        value: totalPedidos,                   color: 'text-slate-300', icon: Package,       bg: 'bg-slate-800/40 border-white/5' },
            { label: 'EN PROCESO',           value: enProceso,                      color: 'text-blue-400',  icon: Activity,      bg: 'bg-blue-950/20 border-blue-500/20' },
            { label: 'EN EMBARQUE',          value: enEmbarque,                     color: 'text-sky-400',   icon: Truck,         bg: 'bg-sky-950/20 border-sky-500/20' },
            { label: 'VALOR FACTURADO',      value: fmtMoney(valorFacturado),       color: 'text-emerald-400', icon: DollarSign,  bg: 'bg-emerald-950/20 border-emerald-500/20' },
            { label: 'ATRASADOS',            value: atrasados,                      color: 'text-red-400',   icon: AlertTriangle, bg: 'bg-red-950/20 border-red-500/20' },
          ].map(card => (
            <div key={card.label} className={clsx('px-5 py-4 rounded-2xl border flex flex-col gap-2', card.bg)}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{card.label}</span>
                <card.icon size={14} className={card.color} />
              </div>
              <span className={clsx('text-2xl font-black leading-none', card.color)}>{card.value}</span>
            </div>
          ))}
        </div>

        {/* Filter Tabs + Search */}
        <div className="flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900/60 rounded-2xl p-1 border border-white/5 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
                  activeFilter === tab.id
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <span>{tab.label}</span>
                <span className={clsx('text-[9px]', tab.color)}>{filterCount(tab.id)}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar folio, cliente, responsable..."
            className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40 w-64"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar rounded-2xl border border-white/5 bg-slate-900/20">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-sm">
              <tr className="border-b border-white/5">
                {['Folio','Cliente','Descripción','Responsable','Valor','Estatus','Fecha Entrega','Avance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-widest text-[9px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const risk = RISK_CONFIG[v.riesgo];
                return (
                  <tr key={v.id} className={clsx(
                    'border-b border-white/5 hover:bg-white/[0.03] transition-colors border-l-2',
                    risk.row
                  )}>
                    <td className="px-4 py-3">
                      <span className="font-black text-white font-mono">{v.folio}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-200">{v.cliente}</span>
                      {v.contacto && <p className="text-slate-500 text-[9px]">{v.contacto}</p>}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-slate-300 truncate block">{v.descripcion}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-400">{v.responsable_ventas || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-emerald-400">{fmtMoney(v.valor_pedido || 0, v.moneda)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1', risk.badge)}>
                        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', risk.dot)} />
                        {risk.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(v.fecha_entrega_prometida)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all', risk.dot)}
                            style={{ width: `${v.avance_porcentaje || 0}%` }}
                          />
                        </div>
                        <span className="text-slate-500 text-[10px] font-black w-8 text-right">{v.avance_porcentaje || 0}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
                    Sin registros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 bg-slate-900/60 border border-white/5 rounded-2xl shrink-0 backdrop-blur-xl">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">TOTAL PEDIDOS</span>
              <span className="text-2xl font-black text-white leading-none">{items.length}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">EN PROCESO</span>
              <span className="text-2xl font-black text-blue-400 leading-none">{enProceso}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">ALERTAS</span>
              <span className="text-2xl font-black text-red-400 leading-none">
                {items.filter(v => v.riesgo === 'atrasado' || v.riesgo === 'en_riesgo').length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">VENTAS INTELLIGENCE ENGINE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
