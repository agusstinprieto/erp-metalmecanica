import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  DollarSign, BarChart3, RefreshCw, ChevronRight,
  Loader2, XCircle, ThumbsUp, ThumbsDown, Clock,
  Activity, Target, Minus
} from 'lucide-react';
import clsx from 'clsx';
import { costeoService, type CosteoDashboardRow, type Aprobacion } from '../services/costeoService';
import { toast, appConfirm } from '../lib/dialogs';
import { useConfig } from '../contexts/ConfigContext';

const fmt = (n: number | null, decimals = 0) =>
  n == null ? '—' : n.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtPct = (n: number | null) => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtMXN = (n: number | null) =>
  n == null ? '—' : `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const SEMAFORO_CONFIG = {
  ok:        { label: 'OK',       color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', dot: 'bg-emerald-400', icon: CheckCircle2 },
  atencion:  { label: 'Atención', color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/30',     dot: 'bg-amber-400',   icon: AlertTriangle },
  critico:   { label: 'Crítico',  color: 'text-rose-400',    bg: 'bg-rose-400/10 border-rose-400/30',       dot: 'bg-rose-400',    icon: XCircle },
  sin_datos: { label: 'Sin datos',color: 'text-slate-500',   bg: 'bg-slate-500/10 border-slate-500/20',     dot: 'bg-slate-500',   icon: Minus },
};

function SemaforoBadge({ semaforo }: { semaforo: CosteoDashboardRow['semaforo'] }) {
  const cfg = SEMAFORO_CONFIG[semaforo] ?? SEMAFORO_CONFIG.sin_datos;
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', cfg.bg, cfg.color)}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function StatCard({ title, value, sub, icon: Icon, color = 'blue' }: {
  title: string; value: string; sub?: string; icon: any; color?: 'blue' | 'emerald' | 'amber' | 'rose';
}) {
  const colors = {
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-400',
  };
  return (
    <div className="glass-premium p-4 rounded-2xl border border-mcvill-card-border">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center border', colors[color])}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-black text-mcvill-text">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-2">{title}</p>
    </div>
  );
}

function OrderRow({ row, onSelect }: { row: CosteoDashboardRow; onSelect: (r: CosteoDashboardRow) => void }) {
  const varianza = row.varianza_pct;
  const isOver = varianza != null && varianza > 0;
  return (
    <tr
      onClick={() => onSelect(row)}
      className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors group"
    >
      <td className="px-3 py-2.5">
        <div className="text-[11px] font-bold text-mcvill-text">{row.viajero_id}</div>
        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{row.numero_parte ?? '—'}</div>
      </td>
      <td className="px-3 py-2.5 text-[11px] text-slate-300 truncate max-w-[150px]">
        {row.descripcion ?? '—'}
      </td>
      <td className="px-3 py-2.5 text-[11px] text-slate-400">{row.cliente ?? '—'}</td>
      <td className="px-3 py-2.5 text-[11px] text-right font-mono">{fmtMXN(row.total_est)}</td>
      <td className="px-3 py-2.5 text-[11px] text-right font-mono">{fmtMXN(row.total_real)}</td>
      <td className="px-3 py-2.5 text-right">
        {varianza == null ? (
          <span className="text-slate-600 text-[10px]">—</span>
        ) : (
          <span className={clsx('text-[11px] font-bold font-mono', isOver ? 'text-rose-400' : 'text-emerald-400')}>
            {isOver && <TrendingUp size={10} className="inline mr-0.5" />}
            {!isOver && <TrendingDown size={10} className="inline mr-0.5" />}
            {fmtPct(varianza)}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5"><SemaforoBadge semaforo={row.semaforo} /></td>
      <td className="px-3 py-2.5 text-right">
        <ChevronRight size={14} className="text-slate-600 group-hover:text-mcvill-accent transition-colors inline" />
      </td>
    </tr>
  );
}

function AprobacionCard({ ap, onResolve }: {
  ap: Aprobacion;
  onResolve: (id: string, accion: 'aprobado' | 'rechazado') => void;
}) {
  return (
    <div className="glass-premium rounded-xl p-3 border border-amber-400/20">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{ap.modulo}</span>
          <p className="text-[11px] font-semibold text-mcvill-text mt-0.5">{ap.registro_desc ?? ap.registro_id}</p>
        </div>
        {ap.monto && (
          <span className="text-[11px] font-bold text-mcvill-text whitespace-nowrap">{fmtMXN(ap.monto)}</span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-2">
        <Clock size={10} className="text-slate-500" />
        <span className="text-[10px] text-slate-500">
          {new Date(ap.solicitado_en).toLocaleDateString('es-MX')}
        </span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={() => onResolve(ap.id, 'rechazado')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold hover:bg-rose-500/20 transition-colors"
          >
            <ThumbsDown size={10} /> Rechazar
          </button>
          <button
            onClick={() => onResolve(ap.id, 'aprobado')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
          >
            <ThumbsUp size={10} /> Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}

type Tab = 'dashboard' | 'alertas' | 'aprobaciones';

export const CosteoDashboard: React.FC<{ userRole?: string }> = ({ userRole = 'empleado' }) => {
  const { isDarkMode } = useConfig();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [rows, setRows] = useState<CosteoDashboardRow[]>([]);
  const [alertas, setAlertas] = useState<CosteoDashboardRow[]>([]);
  const [aprobaciones, setAprobaciones] = useState<Aprobacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CosteoDashboardRow | null>(null);

  const canApprove = ['ceo', 'gerencia', 'finanzas', 'sistemas'].includes(userRole);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, a, ap] = await Promise.all([
        costeoService.getDashboard(),
        costeoService.getAlertas(),
        costeoService.getAprobacionesPendientes(),
      ]);
      setRows(d);
      setAlertas(a);
      setAprobaciones(ap);
    } catch (e: any) {
      toast(e.message ?? 'Error cargando datos de costeo', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: string, accion: 'aprobado' | 'rechazado') => {
    const ok = await appConfirm(
      `¿${accion === 'aprobado' ? 'Aprobar' : 'Rechazar'} esta solicitud?`,
      accion === 'aprobado' ? 'Confirmar aprobación' : 'Confirmar rechazo'
    );
    if (!ok) return;
    try {
      await costeoService.resolverAprobacion(id, accion);
      toast(`Solicitud ${accion} correctamente`, 'success');
      load();
    } catch (e: any) {
      toast(e.message ?? 'Error al resolver aprobación', 'error');
    }
  };

  // KPIs
  const total = rows.length;
  const criticos = rows.filter(r => r.semaforo === 'critico').length;
  const atencion = rows.filter(r => r.semaforo === 'atencion').length;
  const sumEst  = rows.reduce((s, r) => s + (r.total_est ?? 0), 0);
  const sumReal = rows.filter(r => r.total_real != null).reduce((s, r) => s + (r.total_real ?? 0), 0);
  const avgMargen = (() => {
    const withMargen = rows.filter(r => r.margen_real_pct != null);
    if (!withMargen.length) return null;
    return withMargen.reduce((s, r) => s + (r.margen_real_pct ?? 0), 0) / withMargen.length;
  })();

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'dashboard',    label: 'Dashboard',    count: total },
    { id: 'alertas',      label: 'Alertas',      count: alertas.length },
    { id: 'aprobaciones', label: 'Aprobaciones', count: aprobaciones.length },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-mcvill-text tracking-tight">Costeo Dinámico</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Proyectado vs Real · Semáforo de varianza</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 text-mcvill-accent text-[11px] font-bold hover:bg-mcvill-accent/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} role={loading ? 'status' : undefined} aria-label={loading ? 'Cargando' : undefined} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Órdenes activas"  value={String(total)}       icon={Activity}    color="blue" />
        <StatCard title="Críticos"          value={String(criticos)}    icon={XCircle}     color="rose"
          sub={atencion > 0 ? `+${atencion} en atención` : undefined} />
        <StatCard title="Costo est. total"  value={fmtMXN(sumEst)}     icon={Target}      color="blue" />
        <StatCard
          title="Margen real prom."
          value={avgMargen != null ? fmtPct(avgMargen) : '—'}
          icon={avgMargen != null && avgMargen >= 15 ? TrendingUp : TrendingDown}
          color={avgMargen != null && avgMargen >= 15 ? 'emerald' : 'amber'}
          sub={sumReal > 0 ? `Real: ${fmtMXN(sumReal)}` : undefined}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-black/20 rounded-xl border border-white/5 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
              tab === t.id
                ? 'bg-mcvill-accent text-white shadow-[0_0_12px_rgba(0,128,255,0.3)]'
                : 'text-slate-400 hover:text-mcvill-text'
            )}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={clsx(
                'px-1.5 py-0.5 rounded-full text-[9px] font-black',
                tab === t.id ? 'bg-white/20' :
                t.id === 'alertas' ? 'bg-amber-400/20 text-amber-400' :
                t.id === 'aprobaciones' ? 'bg-rose-400/20 text-rose-400' :
                'bg-mcvill-accent/20 text-mcvill-accent'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-mcvill-accent" role="status" aria-label="Cargando" />
        </div>
      ) : tab === 'dashboard' ? (
        <div className="glass-premium rounded-2xl border border-mcvill-card-border overflow-hidden">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <BarChart3 size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-bold">Sin órdenes de costeo aún</p>
              <p className="text-xs mt-1">Las órdenes se crean al asociar un viajero a costos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Viajero','Descripción','Cliente','Est.','Real','Varianza','Estado',''].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-black tracking-widest text-slate-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <OrderRow key={r.id} row={r} onSelect={setSelected} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === 'alertas' ? (
        <div className="space-y-2">
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <CheckCircle2 size={32} className="mb-3 text-emerald-500/40" />
              <p className="text-sm font-bold">Sin alertas de varianza</p>
              <p className="text-xs mt-1">Todas las órdenes están dentro de tolerancia (&lt;5%)</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-amber-400/80 font-medium px-1">
                {alertas.length} orden{alertas.length !== 1 ? 'es' : ''} con varianza elevada
              </p>
              <div className="glass-premium rounded-2xl border border-mcvill-card-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['Viajero','Parte / Cliente','Est.','Real','Varianza','Alerta'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[9px] font-black tracking-widest text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alertas.map(r => (
                        <tr key={r.id} className="border-b border-white/5">
                          <td className="px-3 py-2.5 text-[11px] font-bold text-mcvill-text">{r.viajero_id}</td>
                          <td className="px-3 py-2.5">
                            <div className="text-[11px] text-slate-300">{r.numero_parte ?? '—'}</div>
                            <div className="text-[10px] text-slate-500">{r.cliente ?? '—'}</div>
                          </td>
                          <td className="px-3 py-2.5 text-[11px] font-mono text-right">{fmtMXN(r.total_est)}</td>
                          <td className="px-3 py-2.5 text-[11px] font-mono text-right">{fmtMXN(r.total_real)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={clsx('text-[11px] font-bold', r.semaforo === 'critico' ? 'text-rose-400' : 'text-amber-400')}>
                              {fmtPct(r.varianza_pct)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5"><SemaforoBadge semaforo={r.semaforo} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // Aprobaciones
        <div className="space-y-2">
          {aprobaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <CheckCircle2 size={32} className="mb-3 text-emerald-500/40" />
              <p className="text-sm font-bold">Sin aprobaciones pendientes</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-amber-400/80 font-medium px-1">
                {aprobaciones.length} solicitud{aprobaciones.length !== 1 ? 'es' : ''} pendiente{aprobaciones.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {aprobaciones.map(ap => (
                  <AprobacionCard
                    key={ap.id}
                    ap={ap}
                    onResolve={canApprove ? handleResolve : () => toast('No tienes permisos para aprobar', 'error')}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass-premium rounded-2xl border border-mcvill-card-border w-full max-w-lg p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-mcvill-text">{selected.viajero_id}</h3>
                <p className="text-[11px] text-slate-400">{selected.descripcion ?? '—'} · {selected.cliente ?? '—'}</p>
              </div>
              <SemaforoBadge semaforo={selected.semaforo} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                ['Costo estimado', fmtMXN(selected.total_est)],
                ['Costo real',     fmtMXN(selected.total_real)],
                ['Precio venta',   fmtMXN(selected.precio_venta)],
                ['Utilidad bruta', fmtMXN(selected.utilidad_bruta)],
                ['Varianza',       fmtPct(selected.varianza_pct)],
                ['Margen real',    fmtPct(selected.margen_real_pct)],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                  <p className="text-sm font-bold text-mcvill-text mt-1">{val}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className={clsx('text-[10px] font-bold uppercase px-2 py-1 rounded-lg border',
                selected.estado === 'cerrada' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                selected.estado === 'cancelada' ? 'text-slate-500 bg-slate-500/10 border-slate-500/20' :
                'text-blue-400 bg-blue-400/10 border-blue-400/20'
              )}>
                {selected.estado}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-[11px] font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
