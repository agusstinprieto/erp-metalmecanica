import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Hammer, Activity, AlertTriangle,
  CheckCircle2, XCircle, PauseCircle, Circle,
  Monitor, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { ViajeroAdminPanel } from './ViajeroAdminPanel';
import { ViajeroKPIPanel } from './ViajeroKPIPanel';
import clsx from 'clsx';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type RiskLevel = 'rechazado' | 'atrasado' | 'en_riesgo' | 'detenido' | 'ok' | 'completado' | 'pendiente';

const RISK_CONFIG: Record<RiskLevel, { label: string; badge: string; dot: string; row: string; glow: string }> = {
  rechazado:  { label: 'RECHAZADO',  badge: 'bg-rose-600/20 text-rose-400 border-rose-600/40',    dot: 'bg-rose-500',            row: 'border-l-rose-600', glow: 'shadow-[0_0_15px_rgba(225,29,72,0.4)]' },
  atrasado:   { label: 'ATRASADO',   badge: 'bg-red-600/20 text-red-400 border-red-600/40',        dot: 'bg-red-500 animate-pulse', row: 'border-l-red-600', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
  en_riesgo:  { label: 'EN RIESGO',  badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40', dot: 'bg-amber-500 animate-pulse', row: 'border-l-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
  detenido:   { label: 'DETENIDO',   badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40', dot: 'bg-orange-500',        row: 'border-l-orange-500', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.4)]' },
  ok:         { label: 'EN PROCESO', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',     dot: 'bg-blue-500',            row: 'border-l-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' },
  completado: { label: 'COMPLETADO', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500',    row: 'border-l-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
  pendiente:  { label: 'PENDIENTE',  badge: 'bg-slate-600/30 text-slate-400 border-slate-600/30', dot: 'bg-slate-500',            row: 'border-l-slate-600', glow: 'shadow-none' },
};

const RISK_ICONS: Record<RiskLevel, React.ReactNode> = {
  rechazado:  <XCircle size={14} />,
  atrasado:   <AlertTriangle size={14} />,
  en_riesgo:  <AlertTriangle size={14} />,
  detenido:   <PauseCircle size={14} />,
  ok:         <Activity size={14} />,
  completado: <CheckCircle2 size={14} />,
  pendiente:  <Circle size={14} />,
};

const RISK_ORDER: Record<RiskLevel, number> = {
  atrasado: 0, rechazado: 1, en_riesgo: 2, detenido: 3, ok: 4, pendiente: 5, completado: 6,
};

type FilterId = 'todos' | 'en_proceso' | 'atrasados' | 'rechazados' | 'detenidos' | 'completados';

const FILTER_TABS: { id: FilterId; label: string; color: string }[] = [
  { id: 'todos',      label: 'Todos',      color: 'text-slate-400' },
  { id: 'en_proceso', label: 'En Proceso', color: 'text-blue-400' },
  { id: 'atrasados',  label: 'Atrasados',  color: 'text-red-400' },
  { id: 'rechazados', label: 'Rechazados', color: 'text-rose-400' },
  { id: 'detenidos',  label: 'Detenidos',  color: 'text-orange-400' },
  { id: 'completados',label: 'Completados',color: 'text-emerald-400' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcRiesgo(v: any): RiskLevel {
  if (v.estatus === 'RECHAZADO') return 'rechazado';
  if (v.estatus === 'COMPLETADO') return 'completado';
  if (v.estatus === 'DETENIDO')   return 'detenido';
  if (v.estatus === 'PENDIENTE')  return 'pendiente';

  if (v.fecha_entrega) {
    const hoy      = new Date();
    const entrega  = new Date(v.fecha_entrega);
    const avance   = v.avance_porcentaje || 0;
    const hRest    = (v.horas_est_totales || 0) * (1 - avance / 100);
    const finEst   = new Date(hoy.getTime() + (hRest / 8) * 86400000);
    if (finEst > entrega) return 'atrasado';
    if (entrega.getTime() - finEst.getTime() < 2 * 86400000) return 'en_riesgo';
  }
  return 'ok';
}

// ─── Componente ──────────────────────────────────────────────────────────────

export const ViajeroProduccionView: React.FC = () => {
  const { isDarkMode } = useConfig();
  const [viajeros,    setViajeros]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState<string | null>(null);
  const [lastUpdate,  setLastUpdate]  = useState(new Date());
  const [activeFilter,setActiveFilter]= useState<FilterId>('todos');
  const [searchTerm,  setSearchTerm]  = useState('');
  const [panelMode,   setPanelMode]   = useState<'produccion' | 'admin' | 'kpi'>('produccion');

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viajeros')
        .select('*, operaciones:viajero_operaciones(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = (data || []).map(v => {
        const ops: any[]  = v.operaciones || [];
        const opActual    = ops.find((o: any) => o.estado === 'in_progress') || ops.find((o: any) => o.estado === 'pending');
        const avance      = v.avance_porcentaje || 0;
        const hRest       = Math.round((v.horas_est_totales || 0) * (1 - avance / 100) * 10) / 10;
        const riesgo      = calcRiesgo(v);
        return { ...v, operacion_actual: opActual?.centro_trabajo || null, horas_restantes: hRest, riesgo };
      });

      setViajeros(enriched);
      setLastUpdate(new Date());
      setFetchError(null);
    } catch (err) {
      console.error('Error viajeros:', err);
      setFetchError('No se pudieron cargar los viajeros. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  // ── Filter + search ───────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    let list = viajeros.filter(v => {
      switch (activeFilter) {
        case 'en_proceso':  return v.estatus === 'EN PROCESO';
        case 'atrasados':   return v.riesgo  === 'atrasado';
        case 'rechazados':  return v.estatus === 'RECHAZADO';
        case 'detenidos':   return v.estatus === 'DETENIDO';
        case 'completados': return v.estatus === 'COMPLETADO';
        default:            return true;
      }
    });

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(v =>
        (v.id || '').toString().toLowerCase().includes(q) ||
        (v.numero_parte || '').toLowerCase().includes(q) ||
        (v.cliente || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (RISK_ORDER[a.riesgo as RiskLevel] ?? 9) - (RISK_ORDER[b.riesgo as RiskLevel] ?? 9));
  }, [viajeros, activeFilter, searchTerm]);

  const filterCount = (id: FilterId) => {
    switch (id) {
      case 'en_proceso':  return viajeros.filter(v => v.estatus === 'EN PROCESO').length;
      case 'atrasados':   return viajeros.filter(v => v.riesgo === 'atrasado').length;
      case 'rechazados':  return viajeros.filter(v => v.estatus === 'RECHAZADO').length;
      case 'detenidos':   return viajeros.filter(v => v.estatus === 'DETENIDO').length;
      case 'completados': return viajeros.filter(v => v.estatus === 'COMPLETADO').length;
      default:            return viajeros.length;
    }
  };

  const ctLoad = React.useMemo(() => {
    const CTS = ['LASER','DOBLEZ','CNC','SOLDADURA','PINTURA','ENSAMBLE'];
    return CTS.map(ct => {
      const activos = viajeros.filter(v => v.operacion_actual === ct && v.estatus === 'EN PROCESO');
      const atrasados = activos.filter(v => v.riesgo === 'atrasado' || v.riesgo === 'en_riesgo');
      return { ct, activos: activos.length, atrasados: atrasados.length };
    });
  }, [viajeros]);

  if (panelMode === 'kpi') return <ViajeroKPIPanel viajeros={viajeros} onBack={() => setPanelMode('produccion')} />;
  if (panelMode === 'admin') return <ViajeroAdminPanel onBack={() => setPanelMode('produccion')} />;

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header Panel — Agus Pro Standard */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Monitor className="text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              MONITOREO <span className="text-blue-500">PISO PROD.</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Live Feed · Seguimiento de Viajeros · McVill</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Actualización</span>
            <span className="text-[10px] font-mono text-white font-bold">{lastUpdate.toLocaleTimeString()}</span>
          </div>
          <button onClick={fetchData} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95">
            <RefreshCw size={12} className={loading ? 'animate-spin text-blue-500' : ''} {...(loading ? { role: 'status', 'aria-label': 'Cargando' } : {})} />
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="mx-4 mt-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[11px] font-bold shrink-0">
          {fetchError}
        </div>
      )}
      <div className="flex-1 flex flex-col p-8 gap-8 overflow-hidden">
        {/* ── Centro de Trabajo Load ── */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 shrink-0">
          {ctLoad.map(c => (
            <div key={c.ct} className={clsx(
              "px-6 py-4 rounded-[20px] border flex flex-col gap-2 transition-all shadow-lg",
              c.activos === 0 
                ? "bg-slate-900/20 border-white/5 opacity-40" 
                : c.atrasados > 0 
                  ? "bg-red-950/20 border-red-500/40 shadow-red-500/5" 
                  : "bg-blue-950/20 border-blue-500/40 shadow-blue-500/5"
            )}>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{c.ct}</span>
              <div className="flex items-end justify-between">
                <span className={clsx("text-3xl font-black leading-none", c.atrasados > 0 ? "text-red-400" : "text-blue-400")}>{c.activos}</span>
                {c.atrasados > 0 && <AlertTriangle size={16} className="text-red-500 mb-1" />}
              </div>
            </div>
          ))}
        </div>

        {/* ── Travelers Grid (TV Focus) ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((v) => {
              const risk = RISK_CONFIG[v.riesgo as RiskLevel] || RISK_CONFIG.ok;
              return (
                <div key={v.id} className={clsx(
                  "bg-slate-900/40 border border-white/5 rounded-[24px] p-6 flex flex-col gap-5 transition-all hover:border-white/10 relative overflow-hidden group",
                  risk.row
                )}>
                  {/* Background Glow */}
                  <div className={clsx("absolute -right-10 -top-10 w-32 h-32 blur-[60px] opacity-10 rounded-full", risk.dot)} />

                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ID:</span>
                        <span className="text-sm font-black text-white font-mono">{v.id}</span>
                      </div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-tight group-hover:text-blue-400 transition-colors">
                        {v.numero_parte}
                      </h3>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">{v.cliente || 'PROD. STOCK'}</p>
                    </div>
                    <div className={clsx("px-3 py-1.5 rounded-xl border flex items-center gap-2", risk.badge)}>
                      {RISK_ICONS[v.riesgo as RiskLevel]}
                      <span className="text-[9px] font-black uppercase tracking-widest">{risk.label}</span>
                    </div>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">OPERACIÓN ACTUAL</span>
                      <span className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">{v.operacion_actual || 'PENDIENTE'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">PROGRESO TOTAL</span>
                      <span className={clsx("text-sm font-black", v.avance_porcentaje > 80 ? 'text-emerald-400' : 'text-blue-400')}>{v.avance_porcentaje}%</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div 
                        className={clsx("h-full rounded-full transition-all duration-1000", risk.dot, risk.glow)} 
                        style={{ width: `${v.avance_porcentaje}%` }} 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Fecha de Entrega</span>
                      <span className="text-[10px] font-black text-slate-300">
                        {v.fecha_entrega ? new Date(v.fecha_entrega).toLocaleDateString() : '---'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Tiempo Estimado</span>
                      <span className="text-[10px] font-black text-slate-300">{v.horas_est_totales || 0}H TOTALES</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && !loading && (
              <div className="col-span-full py-20 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
                Sin registros
              </div>
            )}
          </div>
        </div>

        {/* ── Dashboard Footer (TV Scale) ── */}
        <div className="flex items-center justify-between p-6 bg-slate-900/60 border border-white/5 rounded-[20px] shrink-0 backdrop-blur-xl">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">TOTAL VIAJEROS</span>
              <span className="text-2xl font-black text-white leading-none">{viajeros.length}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">ACTIVOS EN PISO</span>
              <span className="text-2xl font-black text-blue-500 leading-none">{viajeros.filter(v => v.estatus === 'EN PROCESO').length}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">ALERTAS CRÍTICAS</span>
              <span className="text-2xl font-black text-red-500 leading-none">{viajeros.filter(v => v.riesgo === 'atrasado').length}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <Zap size={16} className="text-blue-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">McVILL INTELLIGENCE ENGINE v4.2</span>
          </div>
        </div>
      </div>
    </div>
  );
};
