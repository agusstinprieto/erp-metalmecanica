import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import {
  Activity, AlertTriangle, CheckCircle, Plus, RefreshCw,
  Bell, X, Shield, FileDown
} from 'lucide-react';
import { reportUtils } from '../utils/reportUtils';
import type { SPCCaracteristica, SPCMedicion, SPCAlerta, SPCStats, SubgrupoStats, NewMedicionInput } from '../services/spcService';
import { fetchCaracteristicas, fetchMediciones, fetchAlertas, calcularEstadisticas, detectarAlertas, createMedicion, resolverAlerta, TURNOS } from '../services/spcService';

// ── Mini sparkline SVG component ──────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; ucl: number; lcl: number; width?: number; height?: number }> = ({
  data, ucl, lcl, width = 200, height = 60
}) => {
  if (data.length < 2) return null;
  const min = Math.min(...data, lcl) * 0.999;
  const max = Math.max(...data, ucl) * 1.001;
  const range = max - min || 1;
  const toY = (v: number) => height - ((v - min) / range) * height;
  const toX = (i: number) => (i / (data.length - 1)) * width;

  const linePath = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* UCL line */}
      <line x1={0} y1={toY(ucl)} x2={width} y2={toY(ucl)} stroke="#ef4444" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
      {/* LCL line */}
      <line x1={0} y1={toY(lcl)} x2={width} y2={toY(lcl)} stroke="#ef4444" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
      {/* Data line */}
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      {/* Points */}
      {data.map((v, i) => {
        const outOfControl = v > ucl || v < lcl;
        return (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={outOfControl ? 4 : 2.5}
            fill={outOfControl ? '#ef4444' : '#3b82f6'}
            stroke={outOfControl ? '#fca5a5' : 'transparent'} strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
};

// ── X̄-R Chart ─────────────────────────────────────────────────────────────────
const XbarRChart: React.FC<{ stats: SPCStats; carac: SPCCaracteristica }> = ({ stats, carac }) => {
  const { subgrupos, ucl_x, lcl_x, ucl_r, lcl_r, xbarbar, rbar } = stats;
  const xbars = subgrupos.map(s => s.xbar);
  const rangos = subgrupos.map(s => s.rango);

  const ChartPanel: React.FC<{
    title: string; data: number[]; ucl: number; lcl: number; cl: number;
    color: string; unit: string;
  }> = ({ title, data, ucl, lcl, cl, color, unit }) => {
    const allVals = [...data, ucl, lcl];
    const min = Math.min(...allVals) * 0.995;
    const max = Math.max(...allVals) * 1.005;
    const range = max - min || 1;
    const W = 480; const H = 120;
    const toY = (v: number) => H - ((v - min) / range) * H;
    const toX = (i: number) => 40 + (i / Math.max(data.length - 1, 1)) * (W - 60);

    const linePath = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

    return (
      <div className="bg-mcvill-bg border border-mcvill-accent/20 rounded-xl p-4">
        <p className="text-xs font-black uppercase tracking-widest text-mcvill-text-muted mb-3">{title}</p>
        <div className="overflow-x-auto">
          <svg width={W} height={H + 20} className="block">
            {/* Y axis labels */}
            <text x={35} y={toY(ucl) + 4} fontSize={9} fill="#ef4444" textAnchor="end">{ucl.toFixed(3)}</text>
            <text x={35} y={toY(cl) + 4} fontSize={9} fill="#94a3b8" textAnchor="end">{cl.toFixed(3)}</text>
            {lcl > 0 && <text x={35} y={toY(lcl) + 4} fontSize={9} fill="#ef4444" textAnchor="end">{lcl.toFixed(3)}</text>}
            {/* UCL */}
            <line x1={40} y1={toY(ucl)} x2={W - 20} y2={toY(ucl)} stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" opacity={0.8} />
            {/* CL */}
            <line x1={40} y1={toY(cl)} x2={W - 20} y2={toY(cl)} stroke="#64748b" strokeWidth={1} strokeDasharray="2,4" opacity={0.8} />
            {/* LCL */}
            {lcl > 0 && <line x1={40} y1={toY(lcl)} x2={W - 20} y2={toY(lcl)} stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" opacity={0.8} />}
            {/* Spec limits */}
            {carac.usl && <line x1={40} y1={toY(carac.usl)} x2={W - 20} y2={toY(carac.usl)} stroke="#f59e0b" strokeWidth={1.5} opacity={0.6} />}
            {carac.lsl && <line x1={40} y1={toY(carac.lsl)} x2={W - 20} y2={toY(carac.lsl)} stroke="#f59e0b" strokeWidth={1.5} opacity={0.6} />}
            {/* Data line */}
            <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
            {/* Points */}
            {data.map((v, i) => {
              const oc = v > ucl || (lcl > 0 && v < lcl);
              return (
                <g key={i}>
                  <circle cx={toX(i)} cy={toY(v)} r={oc ? 5 : 3.5}
                    fill={oc ? '#ef4444' : color}
                    stroke={oc ? '#fca5a5' : 'transparent'} strokeWidth={2}
                  />
                  <text x={toX(i)} y={H + 14} fontSize={8} fill="#64748b" textAnchor="middle">{i + 1}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-mcvill-text-muted">
          <span className="flex items-center gap-1"><span className="w-3 h-px bg-red-500 inline-block" /> UCL={ucl.toFixed(4)} {unit}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-px bg-slate-500 inline-block" style={{ borderTop: '1px dashed' }} /> CL={cl.toFixed(4)} {unit}</span>
          {lcl > 0 && <span className="flex items-center gap-1"><span className="w-3 h-px bg-red-500 inline-block" /> LCL={lcl.toFixed(4)} {unit}</span>}
          {carac.usl && <span className="flex items-center gap-1"><span className="w-3 h-px bg-amber-500 inline-block" /> USL={carac.usl} {unit}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <ChartPanel title={`Gráfica X̄ — ${carac.nombre}`} data={xbars}
        ucl={ucl_x} lcl={lcl_x} cl={xbarbar} color="#3b82f6" unit={carac.unidad} />
      <ChartPanel title="Gráfica R (Rangos)" data={rangos}
        ucl={ucl_r} lcl={lcl_r > 0 ? lcl_r : 0} cl={rbar} color="#8b5cf6" unit={carac.unidad} />
    </div>
  );
};

// ── Capability indicator ──────────────────────────────────────────────────────
const CpkGauge: React.FC<{ cp: number; cpk: number }> = ({ cp, cpk }) => {
  const color = cpk >= 1.67 ? 'text-emerald-400' : cpk >= 1.33 ? 'text-green-400' : cpk >= 1.0 ? 'text-amber-400' : 'text-rose-500';
  const label = cpk >= 1.67 ? 'Excelente' : cpk >= 1.33 ? 'Capaz' : cpk >= 1.0 ? 'Marginal' : 'No capaz';
  return (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted mb-1">Cp</p>
        <p className={clsx('text-2xl font-black tabular-nums', color)}>{cp.toFixed(2)}</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted mb-1">Cpk</p>
        <p className={clsx('text-2xl font-black tabular-nums', color)}>{cpk.toFixed(2)}</p>
        <p className={clsx('text-[10px] font-black uppercase tracking-widest', color)}>{label}</p>
      </div>
    </div>
  );
};

// ── Alert Badge ───────────────────────────────────────────────────────────────
const AlertBadge: React.FC<{ tipo: SPCAlerta['tipo_alerta'] }> = ({ tipo }) => {
  const map: Record<string, { label: string; cls: string }> = {
    fuera_limite: { label: 'Fuera Límite', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    tendencia:    { label: 'Tendencia',    cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    cambio_nivel: { label: 'Cambio Nivel', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    zona_c:       { label: 'Zona C',       cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  };
  const { label, cls } = map[tipo] ?? map.fuera_limite;
  return <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border', cls)}>{label}</span>;
};

// ── Add medicion form ─────────────────────────────────────────────────────────
const AddMedicionForm: React.FC<{
  carac: SPCCaracteristica;
  nextSubgrupo: number;
  onAdd: (input: NewMedicionInput) => Promise<void>;
  onClose: () => void;
}> = ({ carac, nextSubgrupo, onAdd, onClose }) => {
  const [valores, setValores] = useState<string[]>(Array(carac.subgrupo_n).fill(''));
  const [operador, setOperador] = useState('');
  const [turno, setTurno] = useState<typeof TURNOS[number]>('matutino');
  const [maquina, setMaquina] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    for (const v of valores) {
      const val = parseFloat(v);
      if (isNaN(val)) continue;
      await onAdd({ caracteristica_id: carac.id, subgrupo_id: nextSubgrupo, valor: val, operador, turno, maquina });
    }
    setSaving(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-mcvill-card border border-mcvill-accent/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-widest text-mcvill-text">Subgrupo #{nextSubgrupo}</p>
        <button type="button" onClick={onClose}><X size={16} className="text-mcvill-text-muted hover:text-rose-400" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {valores.map((v, i) => (
          <div key={i}>
            <label className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1">
              Medición {i + 1} ({carac.unidad})
            </label>
            <input type="number" step="0.001" value={v}
              onChange={e => { const a = [...valores]; a[i] = e.target.value; setValores(a); }}
              className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-3 py-2 text-sm text-mcvill-text focus:outline-none focus:border-mcvill-accent/50"
              placeholder={carac.nominal?.toString() ?? '0'}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="spc-operador" className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1">Operador</label>
          <input id="spc-operador" value={operador} onChange={e => setOperador(e.target.value)}
            className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-3 py-2 text-sm text-mcvill-text focus:outline-none focus:border-mcvill-accent/50"
            placeholder="Nombre"
          />
        </div>
        <div>
          <label htmlFor="spc-turno" className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1">Turno</label>
          <select id="spc-turno" value={turno} onChange={e => setTurno(e.target.value as typeof TURNOS[number])}
            className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-3 py-2 text-sm text-mcvill-text focus:outline-none focus:border-mcvill-accent/50">
            {TURNOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="spc-maquina" className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1">Máquina</label>
          <input id="spc-maquina" value={maquina} onChange={e => setMaquina(e.target.value)}
            className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-3 py-2 text-sm text-mcvill-text focus:outline-none focus:border-mcvill-accent/50"
            placeholder="Opcional"
          />
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="w-full py-2.5 bg-mcvill-accent/20 hover:bg-mcvill-accent/30 border border-mcvill-accent/40 rounded-xl text-mcvill-accent text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
        {saving ? 'Guardando...' : `Registrar ${carac.subgrupo_n} Mediciones`}
      </button>
    </form>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────
export const SPCView: React.FC = () => {
  const [caracs, setCaracs] = useState<SPCCaracteristica[]>([]);
  const [selectedCarac, setSelectedCarac] = useState<SPCCaracteristica | null>(null);
  const [mediciones, setMediciones] = useState<SPCMedicion[]>([]);
  const [alertas, setAlertas] = useState<SPCAlerta[]>([]);
  const [stats, setStats] = useState<SPCStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'charts' | 'data' | 'alertas'>('charts');
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchCaracteristicas().then(setCaracs).catch(() => setLoadError('Error al cargar características.'));
    fetchAlertas(false).then(setAlertas).catch(() => setLoadError('Error al cargar alertas.'));
  }, []);

  const loadCarac = useCallback(async (carac: SPCCaracteristica) => {
    setSelectedCarac(carac);
    setLoading(true);
    setStats(null);
    try {
      const meds = await fetchMediciones(carac.id);
      setMediciones(meds);
      const s = calcularEstadisticas(carac, meds);
      setStats(s);
    } catch {
      setMediciones([]);
      setLoadError('Error al cargar mediciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (caracs.length > 0 && !selectedCarac) loadCarac(caracs[0]);
  }, [caracs, selectedCarac, loadCarac]);

  const handleExportPDF = () => {
    const data = caracs.map(c => {
      const s = c.id === selectedCarac?.id && stats ? stats : null;
      return {
        CARACTERISTICA: c.nombre,
        PARTE: c.numero_parte ?? '—',
        ESPECIFICACION: `LSL: ${c.lsl ?? '—'} / USL: ${c.usl ?? '—'}`,
        CP: s?.cp != null ? s.cp.toFixed(3) : '—',
        CPK: s?.cpk != null ? s.cpk.toFixed(3) : '—',
        XBARBAR: s?.xbarbar != null ? s.xbarbar.toFixed(4) : '—',
        UCL: s?.ucl_x != null ? s.ucl_x.toFixed(4) : '—',
        LCL: s?.lcl_x != null ? s.lcl_x.toFixed(4) : '—',
        ESTADO: s?.cpk != null ? (s.cpk >= 1.33 ? 'CAPAZ' : s.cpk >= 1.0 ? 'MARGINAL' : 'NO CAPAZ') : '—',
      };
    });
    reportUtils.exportToPDF('Reporte SPC — Control Estadístico de Proceso', data, 'spc_caracteristicas', 'CALIDAD');
  };

  const nextSubgrupo = mediciones.length > 0
    ? Math.max(...mediciones.map(m => m.subgrupo_id)) + 1
    : 1;

  const handleAddMedicion = async (input: NewMedicionInput) => {
    const nueva = await createMedicion(input);
    const updated = [...mediciones, nueva];
    setMediciones(updated);
    if (selectedCarac) setStats(calcularEstadisticas(selectedCarac, updated));
  };

  const handleResolverAlerta = async (id: string) => {
    await resolverAlerta(id, 'Usuario');
    setAlertas(prev => prev.filter(a => a.id !== id));
  };

  const pendingAlertas = alertas.filter(a => !a.resuelta);
  const localAlertas = stats && selectedCarac ? detectarAlertas(stats, selectedCarac) : [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      {loadError && <div className="mx-4 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-bold">{loadError}</div>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-mcvill-text flex items-center gap-3">
            <Activity size={28} className="text-mcvill-accent" />
            SPC — Control Estadístico de Proceso
          </h1>
          <p className="text-xs text-mcvill-text-muted mt-1 tracking-widest uppercase">
            Gráficas X̄-R · Cp/Cpk · Alertas en Tiempo Real — Responsable: Jorge Herrera
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Alerts badge */}
          <button onClick={() => setAlertasOpen(!alertasOpen)}
            className={clsx(
              'relative flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-black uppercase tracking-wider',
              pendingAlertas.length > 0
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:bg-rose-500/20'
                : 'bg-mcvill-card border-mcvill-accent/20 text-mcvill-text-muted hover:border-mcvill-accent/40'
            )}>
            <Bell size={14} />
            {pendingAlertas.length > 0 ? `${pendingAlertas.length} Alerta${pendingAlertas.length > 1 ? 's' : ''}` : 'Sin alertas'}
            {pendingAlertas.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                {pendingAlertas.length}
              </span>
            )}
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <FileDown size={11} /> EXPORTAR PDF
          </button>
          <button onClick={() => selectedCarac && loadCarac(selectedCarac)}
            className="p-2 bg-mcvill-card border border-mcvill-accent/20 rounded-xl text-mcvill-text-muted hover:text-mcvill-accent hover:border-mcvill-accent/40 transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Alerts panel */}
      {alertasOpen && (
        <div className="bg-rose-500/5 border border-rose-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
              <AlertTriangle size={14} /> Alertas Activas
            </p>
            <button onClick={() => setAlertasOpen(false)}><X size={14} className="text-rose-400/70" /></button>
          </div>
          {pendingAlertas.length === 0 ? (
            <p className="text-xs text-mcvill-text-muted">No hay alertas activas.</p>
          ) : (
            pendingAlertas.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-4 bg-mcvill-bg/50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertBadge tipo={a.tipo_alerta} />
                    <span className="text-[10px] text-mcvill-text-muted">{new Date(a.created_at).toLocaleString('es-MX')}</span>
                  </div>
                  <p className="text-xs text-mcvill-text">{a.descripcion}</p>
                </div>
                <button onClick={() => handleResolverAlerta(a.id)}
                  className="shrink-0 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all">
                  Resolver
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex gap-6">
        {/* Left — Caracteristicas list */}
        <div className="w-64 shrink-0 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-mcvill-text-muted px-1 mb-3">
            Características ({caracs.length})
          </p>
          {caracs.map(c => {
            const isActive = selectedCarac?.id === c.id;
            return (
              <button key={c.id} onClick={() => loadCarac(c)}
                className={clsx(
                  'w-full text-left p-3 rounded-xl border transition-all',
                  isActive
                    ? 'bg-mcvill-accent/10 border-mcvill-accent/40 text-mcvill-text'
                    : 'bg-mcvill-card border-mcvill-accent/10 text-mcvill-text-muted hover:border-mcvill-accent/30 hover:text-mcvill-text'
                )}>
                <p className={clsx('text-xs font-black uppercase tracking-wide truncate', isActive && 'text-mcvill-accent')}>
                  {c.nombre}
                </p>
                {c.numero_parte && <p className="text-[10px] text-mcvill-text-muted mt-0.5">{c.numero_parte}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider bg-slate-800/50 px-1.5 py-0.5 rounded-md">{c.operacion}</span>
                  <span className="text-[9px] text-slate-500">n={c.subgrupo_n}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right — Detail */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selectedCarac ? (
            <div className="flex items-center justify-center h-64 text-mcvill-text-muted text-sm">
              Selecciona una característica para ver su gráfica de control.
            </div>
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'USL', val: selectedCarac.usl?.toFixed(4) ?? '—', unit: selectedCarac.unidad, color: 'text-amber-400' },
                  { label: 'Nominal', val: selectedCarac.nominal?.toFixed(4) ?? '—', unit: selectedCarac.unidad, color: 'text-mcvill-text' },
                  { label: 'LSL', val: selectedCarac.lsl?.toFixed(4) ?? '—', unit: selectedCarac.unidad, color: 'text-amber-400' },
                  { label: 'Mediciones', val: mediciones.length.toString(), unit: 'pts', color: 'text-mcvill-text' },
                ].map(k => (
                  <div key={k.label} className="bg-mcvill-card border border-mcvill-accent/10 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted">{k.label}</p>
                    <p className={clsx('text-lg font-black tabular-nums', k.color)}>{k.val}</p>
                    <p className="text-[10px] text-mcvill-text-muted">{k.unit}</p>
                  </div>
                ))}
              </div>

              {/* Capability */}
              {stats && (
                <div className="bg-mcvill-card border border-mcvill-accent/10 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
                  <CpkGauge cp={stats.cp} cpk={stats.cpk} />
                  <div className="flex items-center gap-6 text-xs text-mcvill-text-muted">
                    <div><p className="font-black text-[10px] uppercase tracking-widest">X̄̄</p><p className="text-mcvill-text font-black tabular-nums">{stats.xbarbar.toFixed(4)}</p></div>
                    <div><p className="font-black text-[10px] uppercase tracking-widest">R̄</p><p className="text-mcvill-text font-black tabular-nums">{stats.rbar.toFixed(4)}</p></div>
                    <div><p className="font-black text-[10px] uppercase tracking-widest">σ̂</p><p className="text-mcvill-text font-black tabular-nums">{stats.sigma.toFixed(4)}</p></div>
                    <div><p className="font-black text-[10px] uppercase tracking-widest">Subgrupos</p><p className="text-mcvill-text font-black">{stats.subgrupos.length}</p></div>
                  </div>
                  {localAlertas.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                      <AlertTriangle size={14} className="text-rose-400" />
                      <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                        {localAlertas.length} alerta{localAlertas.length > 1 ? 's' : ''} detectada{localAlertas.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Local alerts detail */}
              {localAlertas.length > 0 && (
                <div className="space-y-2">
                  {localAlertas.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                      <AlertTriangle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <AlertBadge tipo={a.tipo_alerta} />
                        <p className="text-xs text-mcvill-text mt-1">{a.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-mcvill-card border border-mcvill-accent/10 rounded-xl p-1 w-fit">
                {(['charts', 'data', 'alertas'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={clsx(
                      'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                      activeTab === t
                        ? 'bg-mcvill-accent/20 text-mcvill-accent border border-mcvill-accent/30'
                        : 'text-mcvill-text-muted hover:text-mcvill-text'
                    )}>
                    {t === 'charts' ? 'Gráficas X̄-R' : t === 'data' ? 'Datos' : 'Reglas Nelson'}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="flex items-center justify-center h-32 text-mcvill-text-muted text-sm gap-2">
                  <div className="w-5 h-5 border-2 border-mcvill-accent/20 border-t-mcvill-accent rounded-full animate-spin" role="status" aria-label="Cargando" />
                  Cargando mediciones...
                </div>
              )}

              {!loading && activeTab === 'charts' && stats && (
                <XbarRChart stats={stats} carac={selectedCarac} />
              )}

              {!loading && activeTab === 'charts' && !stats && (
                <div className="text-center text-mcvill-text-muted text-sm py-12">
                  Insuficientes datos para calcular gráficas. Registra al menos {selectedCarac.subgrupo_n * 2} mediciones.
                </div>
              )}

              {!loading && activeTab === 'data' && (
                <div className="bg-mcvill-card border border-mcvill-accent/10 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-mcvill-accent/10">
                    <p className="text-xs font-black uppercase tracking-widest text-mcvill-text">
                      Mediciones — {mediciones.length} registros
                    </p>
                    <button onClick={() => setShowAddForm(!showAddForm)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-mcvill-accent/10 border border-mcvill-accent/30 rounded-xl text-mcvill-accent text-xs font-black uppercase tracking-wider hover:bg-mcvill-accent/20 transition-all">
                      <Plus size={12} /> Registrar Subgrupo
                    </button>
                  </div>

                  {showAddForm && (
                    <div className="p-4 border-b border-mcvill-accent/10">
                      <AddMedicionForm carac={selectedCarac} nextSubgrupo={nextSubgrupo}
                        onAdd={handleAddMedicion} onClose={() => setShowAddForm(false)} />
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-mcvill-accent/10">
                          {['SG #', 'Valor', 'Operador', 'Turno', 'Máquina', 'Estado', 'Fecha'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mediciones.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-10 text-center text-mcvill-text-muted text-xs">Sin registros</td></tr>
                        ) : mediciones.slice(-50).reverse().map((m) => (
                          <tr key={m.id} className={clsx(
                            'border-b border-mcvill-accent/5 hover:bg-mcvill-accent/5 transition-colors',
                            m.fuera_control && 'bg-rose-500/5'
                          )}>
                            <td className="px-4 py-2 font-black text-mcvill-text">{m.subgrupo_id}</td>
                            <td className="px-4 py-2 font-black tabular-nums text-mcvill-text">{m.valor.toFixed(4)}</td>
                            <td className="px-4 py-2 text-mcvill-text-muted">{m.operador ?? '—'}</td>
                            <td className="px-4 py-2 text-mcvill-text-muted capitalize">{m.turno ?? '—'}</td>
                            <td className="px-4 py-2 text-mcvill-text-muted">{m.maquina ?? '—'}</td>
                            <td className="px-4 py-2">
                              {m.fuera_control
                                ? <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full text-[10px] font-black">Fuera control</span>
                                : <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black">OK</span>}
                            </td>
                            <td className="px-4 py-2 text-mcvill-text-muted">{new Date(m.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!loading && activeTab === 'alertas' && (
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-mcvill-text-muted">
                    Reglas de Nelson / Shewhart aplicadas al proceso actual
                  </p>
                  {localAlertas.length === 0 ? (
                    <div className="flex items-center gap-3 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <CheckCircle size={20} className="text-emerald-400" />
                      <div>
                        <p className="text-sm font-black text-emerald-400">Proceso en Control Estadístico</p>
                        <p className="text-xs text-mcvill-text-muted mt-0.5">Ninguna regla de Nelson fue violada en los datos actuales.</p>
                      </div>
                    </div>
                  ) : (
                    localAlertas.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                        <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                        <div>
                          <AlertBadge tipo={a.tipo_alerta} />
                          <p className="text-sm text-mcvill-text mt-2">{a.descripcion}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="bg-mcvill-card border border-mcvill-accent/10 rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted mb-3 flex items-center gap-2">
                      <Shield size={12} /> Reglas de Nelson Monitoreadas
                    </p>
                    {[
                      { n: '1', rule: 'Un punto fuera de los límites de control (±3σ)', status: localAlertas.some(a => a.tipo_alerta === 'fuera_limite') },
                      { n: '2', rule: '9 puntos consecutivos del mismo lado de la línea central', status: localAlertas.some(a => a.tipo_alerta === 'cambio_nivel') },
                      { n: '3', rule: '6 puntos consecutivos formando una tendencia monotónica', status: localAlertas.some(a => a.tipo_alerta === 'tendencia') },
                    ].map(r => (
                      <div key={r.n} className="flex items-center gap-3 py-2 border-b border-mcvill-accent/5 last:border-0">
                        <span className="w-5 h-5 rounded-full bg-mcvill-accent/10 text-mcvill-accent text-[10px] font-black flex items-center justify-center shrink-0">{r.n}</span>
                        <span className="text-xs text-mcvill-text-muted flex-1">{r.rule}</span>
                        {r.status
                          ? <span className="text-[10px] font-black text-rose-400 uppercase">VIOLADA</span>
                          : <span className="text-[10px] font-black text-emerald-400 uppercase">OK</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SPCView;
