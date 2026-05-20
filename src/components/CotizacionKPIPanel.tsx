// ─── Cotizacion KPI Panel ─────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, CheckCircle2, XCircle,
  BarChart2, Users, Target, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { cotizacionViaService } from '../services/cotizacionViaService';
import { COT_ESTATUS_LABELS } from '../types/cotizacion';
import type { CotizacionItem, CotizacionEstatus } from '../types/cotizacion';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtMXN = (val: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

const PCT = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

// ── Estatus colors ────────────────────────────────────────────────────────────

const ESTATUS_COLORS: Record<CotizacionEstatus, string> = {
  RFQ_RECIBIDA: '#64748b',
  FACTIBILIDAD: '#0ea5e9',
  COSTEO:       '#3b82f6',
  ELABORACION:  '#8b5cf6',
  REVISION:     '#f59e0b',
  ENVIADA:      '#38bdf8',
  GANADA:       '#10b981',
  PERDIDA:      '#f43f5e',
  CANCELADA:    '#e11d48',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const CotizacionKPIPanel: React.FC = () => {
  const [cotizaciones, setCotizaciones] = useState<CotizacionItem[]>([]);
  const [loading,      setLoading]      = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cotizacionViaService.getAll();
      setCotizaciones(data);
    } catch (err) {
      console.error('Error KPI:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── KPI Calculations ─────────────────────────────────────────────────────

  const total     = cotizaciones.length;
  const ganadas   = cotizaciones.filter(c => c.estatus === 'GANADA');
  const perdidas  = cotizaciones.filter(c => c.estatus === 'PERDIDA' || c.estatus === 'CANCELADA');
  const activas   = cotizaciones.filter(c => !['GANADA','PERDIDA','CANCELADA'].includes(c.estatus));
  const cerradas  = ganadas.length + perdidas.length;

  const tasaCierre     = PCT(ganadas.length, cerradas);
  const valorGanado    = ganadas.reduce((s, c) => s + (c.valor_estimado || 0), 0);
  const pipelineActivo = activas.reduce((s, c) => s + (c.valor_estimado || 0), 0);
  const ticketPromedio = ganadas.length > 0
    ? Math.round(valorGanado / ganadas.length)
    : 0;

  // ── By estatus ───────────────────────────────────────────────────────────

  const byEstatus = (Object.keys(COT_ESTATUS_LABELS) as CotizacionEstatus[])
    .map(est => ({
      estatus: est,
      label: COT_ESTATUS_LABELS[est],
      count: cotizaciones.filter(c => c.estatus === est).length,
      color: ESTATUS_COLORS[est],
    }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxByEstatus = Math.max(...byEstatus.map(e => e.count), 1);

  // ── By responsable (top 5) ────────────────────────────────────────────────

  const respMap = new Map<string, { total: number; ganadas: number; pipeline: number }>();
  cotizaciones.forEach(c => {
    const r = c.responsable || 'Sin asignar';
    if (!respMap.has(r)) respMap.set(r, { total: 0, ganadas: 0, pipeline: 0 });
    const entry = respMap.get(r)!;
    entry.total++;
    if (c.estatus === 'GANADA') entry.ganadas++;
    if (!['GANADA','PERDIDA','CANCELADA'].includes(c.estatus)) entry.pipeline += (c.valor_estimado || 0);
  });

  const byResponsable = Array.from(respMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const maxByResp = Math.max(...byResponsable.map(r => r.total), 1);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3">
        <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calculando KPIs...</p>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total Cotizaciones',
      value: total,
      icon: <BarChart2 size={18} />,
      color: 'blue',
      sub: `${activas.length} activas`,
    },
    {
      label: 'Ganadas',
      value: ganadas.length,
      icon: <CheckCircle2 size={18} />,
      color: 'emerald',
      sub: `de ${cerradas} cerradas`,
    },
    {
      label: 'Perdidas / Canc.',
      value: perdidas.length,
      icon: <XCircle size={18} />,
      color: 'rose',
      sub: `${PCT(perdidas.length, cerradas)}% de cerradas`,
    },
    {
      label: 'Tasa de Cierre',
      value: `${tasaCierre}%`,
      icon: <Target size={18} />,
      color: tasaCierre >= 50 ? 'emerald' : 'amber',
      sub: tasaCierre >= 50 ? 'Por encima de meta' : 'Bajo meta (50%)',
      isText: true,
    },
    {
      label: 'Valor Total Ganado',
      value: fmtMXN(valorGanado),
      icon: <DollarSign size={18} />,
      color: 'emerald',
      sub: `ticket prom. ${fmtMXN(ticketPromedio)}`,
      isText: true,
    },
    {
      label: 'Pipeline Activo',
      value: fmtMXN(pipelineActivo),
      icon: <TrendingUp size={18} />,
      color: 'sky',
      sub: `${activas.length} cotizaciones`,
      isText: true,
    },
    {
      label: 'Ticket Promedio',
      value: fmtMXN(ticketPromedio),
      icon: <Users size={18} />,
      color: 'violet',
      sub: 'cotizaciones ganadas',
      isText: true,
    },
  ];

  const colorCls = (c: string) => ({
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
    sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/20' },
    violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
  }[c] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">KPIs Cotizaciones</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Indicadores de desempeño comercial</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : ''} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map(card => {
          const cls = colorCls(card.color);
          return (
            <div
              key={card.label}
              className={clsx(
                'p-4 rounded-2xl border bg-white/[0.02] flex flex-col gap-2',
                cls.border
              )}
            >
              <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', cls.bg, cls.text)}>
                {card.icon}
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight">{card.label}</p>
                <p className={clsx('font-black leading-tight', card.isText ? 'text-sm mt-0.5' : 'text-2xl', cls.text)}>
                  {card.value}
                </p>
                <p className="text-[8px] text-slate-600 font-bold mt-0.5">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* By Estatus */}
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01] space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart2 size={13} className="text-blue-400" />
            Distribución por Estatus
          </h3>
          <div className="space-y-2.5">
            {byEstatus.length === 0 ? (
              <p className="text-slate-600 text-xs text-center py-6">Sin datos</p>
            ) : (
              byEstatus.map(e => (
                <div key={e.estatus} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">{e.label}</span>
                    <span className="text-[10px] font-black text-slate-300">{e.count}</span>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${PCT(e.count, maxByEstatus)}%`,
                        backgroundColor: e.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Responsable */}
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01] space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users size={13} className="text-violet-400" />
            Top 5 Responsables
          </h3>
          <div className="space-y-2.5">
            {byResponsable.length === 0 ? (
              <p className="text-slate-600 text-xs text-center py-6">Sin datos</p>
            ) : (
              byResponsable.map((r, i) => (
                <div key={r.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-500">#{i + 1}</span>
                      <span className="text-[10px] font-bold text-slate-400 truncate max-w-[140px]">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] text-emerald-500 font-bold">{r.ganadas}G</span>
                      <span className="text-[10px] font-black text-slate-300">{r.total}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-700"
                      style={{ width: `${PCT(r.total, maxByResp)}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-slate-600 font-bold">
                    Pipeline: {fmtMXN(r.pipeline)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest text-right">
        {total} cotizaciones totales · {ganadas.length} ganadas · {perdidas.length} perdidas/canceladas
      </p>
    </div>
  );
};
