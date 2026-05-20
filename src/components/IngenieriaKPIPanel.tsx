import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, CheckCircle2, Activity, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';

const ESTATUS_COLORS: Record<string, string> = {
  SOLICITUD:  'bg-slate-500',
  DISEÑO:     'bg-blue-500',
  CÁLCULO:    'bg-cyan-500',
  REVISIÓN:   'bg-amber-500',
  APROBACIÓN: 'bg-violet-500',
  LIBERADO:   'bg-emerald-500',
  CANCELADO:  'bg-rose-500',
};

const PRIORIDAD_COLORS: Record<string, string> = {
  NORMAL:  'bg-slate-500',
  ALTA:    'bg-amber-500',
  URGENTE: 'bg-rose-500',
};

export const IngenieriaKPIPanel: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viajeros_ingenieria')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const total       = items.length;
  const completados = items.filter(v => v.estatus === 'LIBERADO').length;
  const enProceso   = items.filter(v => !['LIBERADO', 'CANCELADO', 'SOLICITUD'].includes(v.estatus)).length;
  const atrasados   = items.filter(v => {
    if (!v.fecha_entrega || ['LIBERADO', 'CANCELADO'].includes(v.estatus)) return false;
    const hoy    = new Date();
    const entrega = new Date(v.fecha_entrega);
    const avance = v.avance_porcentaje || 0;
    const hRest  = (v.horas_est_totales || 0) * (1 - avance / 100);
    const finEst = new Date(hoy.getTime() + (hRest / 8) * 86400000);
    return finEst > entrega;
  }).length;
  const tasaCumplimiento = total > 0 ? Math.round((completados / total) * 100) : 0;

  // Distribución por estatus
  const estatusDist = ['SOLICITUD', 'DISEÑO', 'CÁLCULO', 'REVISIÓN', 'APROBACIÓN', 'LIBERADO', 'CANCELADO'].map(e => ({
    label: e,
    count: items.filter(v => v.estatus === e).length,
    color: ESTATUS_COLORS[e],
  }));

  // Distribución por prioridad
  const prioridadDist = ['NORMAL', 'ALTA', 'URGENTE'].map(p => ({
    label: p,
    count: items.filter(v => v.prioridad === p).length,
    color: PRIORIDAD_COLORS[p],
  }));

  const maxEst  = Math.max(...estatusDist.map(e => e.count), 1);
  const maxPrio = Math.max(...prioridadDist.map(p => p.count), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Summary cards ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <RefreshCw size={20} className="animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Proyectos',     value: total,              icon: <TrendingUp size={18} />,    color: 'text-slate-300',   border: 'border-slate-600/30', bg: 'bg-slate-700/20' },
              { label: 'Liberados',           value: completados,        icon: <CheckCircle2 size={18} />,  color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
              { label: 'En Proceso',          value: enProceso,          icon: <Activity size={18} />,      color: 'text-blue-400',    border: 'border-blue-500/30',   bg: 'bg-blue-500/10' },
              { label: 'Atrasados',           value: atrasados,          icon: <AlertTriangle size={18} />, color: 'text-red-400',     border: 'border-red-500/30',    bg: 'bg-red-500/10' },
              { label: 'Tasa Cumplimiento',   value: `${tasaCumplimiento}%`, icon: <TrendingUp size={18} />, color: tasaCumplimiento >= 80 ? 'text-emerald-400' : tasaCumplimiento >= 50 ? 'text-amber-400' : 'text-red-400', border: 'border-violet-500/30', bg: 'bg-violet-500/10' },
            ].map(c => (
              <div key={c.label} className={clsx('backdrop-blur border rounded-2xl px-4 py-4 flex flex-col gap-2', c.border, c.bg)}>
                <div className={clsx('opacity-70', c.color)}>{c.icon}</div>
                <p className={clsx('text-2xl font-black', c.color)}>{c.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-tight">{c.label}</p>
              </div>
            ))}
          </div>

          {/* ── Distribución por Estatus ────────────────────────────────── */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Distribución por Estatus</h4>
            <div className="flex flex-col gap-3">
              {estatusDist.map(e => (
                <div key={e.label} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">{e.label}</span>
                  <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700', e.color)}
                      style={{ width: `${(e.count / maxEst) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-slate-300 w-6 text-right">{e.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Distribución por Prioridad ──────────────────────────────── */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Distribución por Prioridad</h4>
            <div className="flex flex-col gap-3">
              {prioridadDist.map(p => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">{p.label}</span>
                  <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700', p.color)}
                      style={{ width: `${(p.count / maxPrio) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-slate-300 w-6 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasa cumplimiento visual */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke={tasaCumplimiento >= 80 ? '#10b981' : tasaCumplimiento >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - tasaCumplimiento / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">{tasaCumplimiento}%</span>
            </div>
            <div>
              <p className="text-base font-black text-white">Tasa de Cumplimiento</p>
              <p className="text-[11px] text-slate-500">
                {completados} de {total} proyectos liberados
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
