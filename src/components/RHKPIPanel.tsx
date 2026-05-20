import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronLeft, TrendingUp, Users, XCircle, CheckCircle2, Clock, Zap, Briefcase } from 'lucide-react';
import { rhViaService } from '../services/rhViaService';
import { useConfig } from '../contexts/ConfigContext';
import clsx from 'clsx';
import type { RHItem, RHEstatus } from '../types/rhVia';

const ESTATUS_COLORS: Record<RHEstatus, string> = {
  VACANTE:       'bg-slate-500',
  RECLUTAMIENTO: 'bg-blue-500',
  ENTREVISTAS:   'bg-indigo-500',
  SELECCION:     'bg-violet-500',
  OFERTA:        'bg-amber-500',
  ONBOARDING:    'bg-sky-500',
  ACTIVO:        'bg-emerald-500',
  CANCELADO:     'bg-rose-500',
};

const ALL_ESTATUS: RHEstatus[] = [
  'VACANTE', 'RECLUTAMIENTO', 'ENTREVISTAS', 'SELECCION',
  'OFERTA', 'ONBOARDING', 'ACTIVO', 'CANCELADO',
];

export const RHKPIPanel: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { isDarkMode } = useConfig();
  const [items,   setItems]   = useState<RHItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rhViaService.getAll();
      setItems(data);
    } catch (err) {
      console.error('RHKPIPanel fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── KPI calculations ───────────────────────────────────────────────────────

  const total       = items.length;
  const contratados = items.filter(v => v.estatus === 'ACTIVO').length;
  const cancelados  = items.filter(v => v.estatus === 'CANCELADO').length;
  const tasaExito   = total > 0 ? Math.round((contratados / total) * 100) : 0;
  const urgentesAbiertas = items.filter(v => v.urgente && !['ACTIVO', 'CANCELADO'].includes(v.estatus)).length;

  const posicionesAbiertas = items
    .filter(v => !['ACTIVO', 'CANCELADO'].includes(v.estatus))
    .reduce((sum, v) => sum + (v.num_posiciones ?? 1), 0);

  // Average days from apertura → activo
  const tiempos = items
    .filter(v => v.estatus === 'ACTIVO' && v.fecha_apertura && v.fecha_ingreso)
    .map(v => {
      const a = new Date(v.fecha_apertura!).getTime();
      const b = new Date(v.fecha_ingreso!).getTime();
      return Math.round((b - a) / 86400000);
    });
  const tiempoPromedio = tiempos.length
    ? Math.round(tiempos.reduce((s, d) => s + d, 0) / tiempos.length)
    : 0;

  // By departamento (top 5 demand)
  const byDepto: Record<string, number> = {};
  items.forEach(v => {
    if (v.departamento) byDepto[v.departamento] = (byDepto[v.departamento] || 0) + 1;
  });
  const topDeptos = Object.entries(byDepto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxDepto = topDeptos[0]?.[1] || 1;

  // By estatus
  const byEstatus: Record<string, number> = {};
  items.forEach(v => { byEstatus[v.estatus] = (byEstatus[v.estatus] || 0) + 1; });
  const maxEstatus = Math.max(...Object.values(byEstatus), 1);

  // By responsable_rh
  const byResp: Record<string, number> = {};
  items.forEach(v => {
    const key = v.responsable_rh || 'Sin asignar';
    byResp[key] = (byResp[key] || 0) + 1;
  });
  const topResp = Object.entries(byResp).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxResp = topResp[0]?.[1] || 1;

  // ── Summary cards ──────────────────────────────────────────────────────────

  const KPI_CARDS = [
    { label: 'Total Solicitudes',         value: total,            icon: Users,         color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
    { label: 'Contratados',               value: contratados,      icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Cancelados',                value: cancelados,       icon: XCircle,       color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
    { label: 'Tasa Éxito (%)',            value: `${tasaExito}%`,  icon: TrendingUp,    color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
    { label: 'Tiempo Promedio (días)',    value: tiempoPromedio,   icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
    { label: 'Urgentes Abiertas',         value: urgentesAbiertas, icon: Zap,           color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
    { label: 'Posiciones Abiertas',       value: posicionesAbiertas, icon: Briefcase,   color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={clsx(
        'shrink-0 border-b px-6 py-4 flex items-center justify-between gap-4',
        isDarkMode ? 'bg-mcvill-bg border-mcvill-card-border/30' : 'bg-white border-blue-100'
      )}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <TrendingUp size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className={clsx('text-lg font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
              KPIs — Flujo RH
            </h1>
            <p className={clsx('text-[10px] font-bold tracking-widest uppercase', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
              Métricas de Reclutamiento
            </p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-40">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          {KPI_CARDS.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={clsx(
                'rounded-2xl border p-4 flex flex-col gap-2',
                isDarkMode ? `${card.bg} ${card.border}` : 'bg-slate-50 border-slate-200'
              )}>
                <div className={clsx('p-2 rounded-xl w-fit', card.bg, 'border', card.border)}>
                  <Icon size={16} className={card.color} />
                </div>
                <p className={clsx('text-2xl font-black leading-none', card.color)}>{card.value}</p>
                <p className={clsx('text-[9px] font-black uppercase tracking-wider leading-tight', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* By Departamento */}
          <div className={clsx(
            'rounded-2xl border p-5',
            isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200'
          )}>
            <p className={clsx('text-[10px] font-black uppercase tracking-widest mb-4', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
              Demanda por Departamento (Top 5)
            </p>
            {topDeptos.length === 0 ? (
              <p className={clsx('text-[11px]', isDarkMode ? 'text-slate-600' : 'text-slate-400')}>Sin datos</p>
            ) : (
              <div className="space-y-3">
                {topDeptos.map(([depto, count]) => (
                  <div key={depto}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={clsx('text-[11px] font-semibold truncate max-w-[60%]', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                        {depto}
                      </span>
                      <span className={clsx('text-[11px] font-black', isDarkMode ? 'text-blue-400' : 'text-blue-600')}>{count}</span>
                    </div>
                    <div className={clsx('h-2 rounded-full overflow-hidden', isDarkMode ? 'bg-white/[0.06]' : 'bg-slate-100')}>
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxDepto) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By Estatus */}
          <div className={clsx(
            'rounded-2xl border p-5',
            isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200'
          )}>
            <p className={clsx('text-[10px] font-black uppercase tracking-widest mb-4', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
              Distribución por Estatus
            </p>
            {total === 0 ? (
              <p className={clsx('text-[11px]', isDarkMode ? 'text-slate-600' : 'text-slate-400')}>Sin datos</p>
            ) : (
              <div className="space-y-3">
                {ALL_ESTATUS.filter(s => byEstatus[s]).map(s => (
                  <div key={s}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={clsx('text-[11px] font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>{s}</span>
                      <span className={clsx('text-[11px] font-black', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>{byEstatus[s] || 0}</span>
                    </div>
                    <div className={clsx('h-2 rounded-full overflow-hidden', isDarkMode ? 'bg-white/[0.06]' : 'bg-slate-100')}>
                      <div
                        className={clsx('h-full rounded-full transition-all duration-700', ESTATUS_COLORS[s])}
                        style={{ width: `${((byEstatus[s] || 0) / maxEstatus) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By Responsable RH */}
          <div className={clsx(
            'rounded-2xl border p-5',
            isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200'
          )}>
            <p className={clsx('text-[10px] font-black uppercase tracking-widest mb-4', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
              Carga por Responsable RH
            </p>
            {topResp.length === 0 ? (
              <p className={clsx('text-[11px]', isDarkMode ? 'text-slate-600' : 'text-slate-400')}>Sin datos</p>
            ) : (
              <div className="space-y-3">
                {topResp.map(([resp, count]) => (
                  <div key={resp}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={clsx('text-[11px] font-semibold truncate max-w-[60%]', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                        {resp}
                      </span>
                      <span className={clsx('text-[11px] font-black', isDarkMode ? 'text-violet-400' : 'text-violet-600')}>{count}</span>
                    </div>
                    <div className={clsx('h-2 rounded-full overflow-hidden', isDarkMode ? 'bg-white/[0.06]' : 'bg-slate-100')}>
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxResp) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
