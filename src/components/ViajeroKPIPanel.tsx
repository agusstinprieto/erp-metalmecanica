import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  ChevronLeft, BarChart2, TrendingUp, TrendingDown,
  XCircle, AlertTriangle, Activity,
  Hammer, Users, Calendar,
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';

interface Props {
  viajeros: any[];
  onBack: () => void;
}

export const ViajeroKPIPanel: React.FC<Props> = ({ viajeros, onBack }) => {
  const { isDarkMode, config } = useConfig();

  const TOOLTIP_STYLE = {
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.15)'}`,
    borderRadius: 12,
    color: isDarkMode ? '#e2e8f0' : '#0f172a',
    fontSize: 11,
    fontWeight: 700,
  };

  // ── Cálculos KPI ──────────────────────────────────────────────────────────
  const total       = viajeros.length;
  const completados = viajeros.filter(v => v.estatus === 'COMPLETADO');
  const rechazados  = viajeros.filter(v => v.estatus === 'RECHAZADO');
  const enProceso   = viajeros.filter(v => v.estatus === 'EN PROCESO');
  const pendientes  = viajeros.filter(v => v.estatus === 'PENDIENTE');
  const detenidos   = viajeros.filter(v => v.estatus === 'DETENIDO');
  const atrasados   = viajeros.filter(v => v.riesgo === 'atrasado');
  const enRiesgo    = viajeros.filter(v => v.riesgo === 'en_riesgo');

  const otd = total > 0
    ? Math.round(((completados.length - rechazados.length) / Math.max(total, 1)) * 100)
    : 0;
  const tasaRechazo = total > 0 ? Math.round((rechazados.length / total) * 100) : 0;
  const avgAvance   = total > 0
    ? Math.round(viajeros.reduce((s, v) => s + (v.avance_porcentaje || 0), 0) / total)
    : 0;

  // ── Datos para gráficas ───────────────────────────────────────────────────

  const estadoData = [
    { name: 'En Proceso',  value: enProceso.length,   color: '#3b82f6' },
    { name: 'Completados', value: completados.length,  color: '#10b981' },
    { name: 'Pendientes',  value: pendientes.length,   color: '#64748b' },
    { name: 'Atrasados',   value: atrasados.length,    color: '#ef4444' },
    { name: 'Detenidos',   value: detenidos.length,    color: '#f97316' },
    { name: 'Rechazados',  value: rechazados.length,   color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const CTS = ['LASER', 'DOBLEZ', 'CNC', 'SOLDADURA', 'PINTURA', 'ENSAMBLE'];
  const ctData = CTS.map(ct => {
    const activos   = viajeros.filter(v => v.operacion_actual === ct && v.estatus === 'EN PROCESO');
    const atr       = activos.filter(v => v.riesgo === 'atrasado' || v.riesgo === 'en_riesgo');
    return { name: ct, activos: activos.length, atrasados: atr.length };
  });

  const mesData = (() => {
    const buckets: Record<string, number> = {};
    viajeros.forEach(v => {
      if (!v.created_at) return;
      const d   = new Date(v.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([key, count]) => ({
        mes: new Date(`${key}-01`).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        viajeros: count,
      }));
  })();

  const clienteData = (() => {
    const counts: Record<string, { total: number; rechazados: number }> = {};
    viajeros.forEach(v => {
      if (!v.cliente) return;
      if (!counts[v.cliente]) counts[v.cliente] = { total: 0, rechazados: 0 };
      counts[v.cliente].total++;
      if (v.estatus === 'RECHAZADO') counts[v.cliente].rechazados++;
    });
    return Object.entries(counts)
      .map(([cliente, d]) => ({ cliente, ...d }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-800'} p-4 sm:p-6`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            >
              <ChevronLeft size={13} /> Producción
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-600/20 rounded-lg border border-violet-500/30">
                <BarChart2 className="text-violet-400" size={18} />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter text-white leading-none">
                  KPIs <span className="text-violet-400">Gerenciales</span>
                </h1>
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-0.5">
                  {total} viajeros en base · calculado en tiempo real
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Viajeros',
              value: total,
              suffix: '',
              icon: <Activity size={16} />,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
              sub: `${enProceso.length} en proceso`,
            },
            {
              label: 'OTD Estimado',
              value: otd,
              suffix: '%',
              icon: otd >= 70 ? <TrendingUp size={16} /> : <TrendingDown size={16} />,
              color: otd >= 70 ? 'text-emerald-400' : 'text-red-400',
              bg: otd >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20',
              sub: `${completados.length} completados`,
            },
            {
              label: 'Tasa de Rechazo',
              value: tasaRechazo,
              suffix: '%',
              icon: <XCircle size={16} />,
              color: tasaRechazo > 10 ? 'text-rose-400' : 'text-slate-400',
              bg: tasaRechazo > 10 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-800/50 border-white/5',
              sub: `${rechazados.length} rechazados`,
            },
            {
              label: 'En Riesgo',
              value: atrasados.length + enRiesgo.length,
              suffix: '',
              icon: <AlertTriangle size={16} />,
              color: atrasados.length > 0 ? 'text-amber-400' : 'text-slate-500',
              bg: atrasados.length > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800/50 border-white/5',
              sub: `${atrasados.length} atrasados · ${enRiesgo.length} en riesgo`,
            },
          ].map(card => (
            <div key={card.label} className={`p-4 rounded-2xl border ${card.bg} space-y-2`}>
              <div className={`flex items-center gap-2 ${card.color} text-[10px] font-black uppercase tracking-widest`}>
                {card.icon} {card.label}
              </div>
              <div className={`text-4xl font-black leading-none ${card.color}`}>
                {card.value}<span className="text-xl">{card.suffix}</span>
              </div>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Fila 2: Estado + CT ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Distribución por Estado */}
          <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={12} className="text-blue-400" /> Distribución por Estado
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={estadoData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {estadoData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Carga por CT */}
          <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Hammer size={12} className="text-blue-400" /> Carga por Centro de Trabajo
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ctData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="activos" name="Activos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="atrasados" name="Atrasados/Riesgo" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Fila 3: Tendencia mensual + Top clientes ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Viajeros por mes */}
          <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar size={12} className="text-violet-400" /> Viajeros Creados por Mes
            </p>
            {mesData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
                Sin datos históricos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mesData} barCategoryGap="35%">
                  <XAxis dataKey="mes" tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="viajeros" name="Viajeros" radius={[4, 4, 0, 0]}>
                    {mesData.map((_, i) => (
                      <Cell key={i} fill={i === mesData.length - 1 ? '#8b5cf6' : '#334155'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Clientes */}
          <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users size={12} className="text-emerald-400" /> Top Clientes por Volumen
            </p>
            {clienteData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
                Sin clientes registrados
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[200px] pr-1">
                {clienteData.map((row, i) => (
                  <div key={row.cliente} className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-700 w-4 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-tight truncate max-w-[160px]">{row.cliente}</span>
                        <span className="text-[10px] font-black text-slate-400 ml-2 shrink-0">{row.total}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/70"
                          style={{ width: `${(row.total / clienteData[0].total) * 100}%` }}
                        />
                      </div>
                    </div>
                    {row.rechazados > 0 && (
                      <span className="text-[8px] font-black text-rose-500 shrink-0">{row.rechazados}R</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] font-black text-slate-700 uppercase tracking-[0.25em] pb-4">
          {`${config.developerName} — ${config.brandName} KPIs 2026`} · calculado sobre {total} viajeros en base
        </div>

      </div>
    </div>
  );
};
