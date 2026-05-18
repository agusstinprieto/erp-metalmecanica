import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';
import {
  Users, TrendingUp, Award, AlertTriangle, CheckCircle,
  ChevronUp, ChevronDown, Minus, Star, Shield, Zap,
  DollarSign, BarChart2, Factory, RefreshCw, Plus, X, FileDown,
  UserPlus, Pencil, ToggleLeft, ToggleRight
} from 'lucide-react';
import { reportUtils } from '../utils/reportUtils';
import { toast } from '../lib/dialogs';
import type {
  Operador, DesempenoKPI, Incentivo, CelulaDesempeno,
  TipoPeriodo, TipoIncentivo,
} from '../services/desempenoService';
import {
  fetchOperadores, fetchKPIs, fetchIncentivos, fetchCelulaDesempeno,
  upsertKPI, createIncentivo, aprobarIncentivo, calcularKPIs, calcularIncentivo,
  createOperador, updateOperador,
  CELULAS, SALARIO_BASE_DEFAULT,
} from '../services/desempenoService';

import { useConfig } from '../contexts/ConfigContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getThisWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
  return d.toISOString().split('T')[0];
}

function kpiColor(val: number | undefined, target: number, warn: number): string {
  if (val === undefined) return 'text-mcvill-text-muted';
  if (val >= target) return 'text-emerald-400';
  if (val >= warn)   return 'text-amber-400';
  return 'text-rose-500';
}

const KPIBar: React.FC<{ value: number; max?: number; color: string }> = ({ value, max = 100, color }) => (
  <div className="w-full h-1.5 bg-mcvill-bg rounded-full overflow-hidden">
    <div className={clsx('h-full rounded-full transition-all duration-700', color)}
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
  </div>
);

const TrendIcon: React.FC<{ val?: number; prev?: number }> = ({ val, prev }) => {
  if (val === undefined || prev === undefined) return <Minus size={12} className="text-slate-600" />;
  if (val > prev) return <ChevronUp size={12} className="text-emerald-400" />;
  if (val < prev) return <ChevronDown size={12} className="text-rose-400" />;
  return <Minus size={12} className="text-slate-600" />;
};

// ── Operador KPI Card ─────────────────────────────────────────────────────────
const OperadorCard: React.FC<{
  operador: Operador;
  kpi?: DesempenoKPI;
  incentivos: Incentivo[];
  onSelect: () => void;
  selected: boolean;
}> = ({ operador, kpi, incentivos, onSelect, selected }) => {
  const efColor = kpiColor(kpi?.eficiencia, 100, 85);
  const calColor = kpiColor(kpi?.tasa_calidad, 98, 90);
  const totalBono = incentivos.filter(i => i.operador_id === operador.id).reduce((s, i) => s + i.monto, 0);

  return (
    <div onClick={onSelect}
      className={clsx(
        'p-4 rounded-2xl border cursor-pointer transition-all duration-200',
        selected
          ? 'bg-mcvill-accent/10 border-mcvill-accent/40'
          : 'bg-mcvill-card border-mcvill-accent/10 hover:border-mcvill-accent/30'
      )}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className={clsx('text-xs font-black truncate uppercase tracking-wide', selected && 'text-mcvill-accent')}>
            {operador.nombre}
          </p>
          <p className="text-[10px] text-mcvill-text-muted mt-0.5">{operador.numero_empleado} · {operador.celula}</p>
        </div>
        {totalBono > 0 && (
          <span className="shrink-0 shrink-0 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-[10px] font-black text-amber-400">
            ${totalBono.toLocaleString('es-MX')}
          </span>
        )}
      </div>

      {kpi ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-mcvill-text-muted font-black uppercase tracking-wider">Eficiencia</span>
            <span className={clsx('font-black tabular-nums', efColor)}>{kpi.eficiencia?.toFixed(1) ?? '—'}%</span>
          </div>
          <KPIBar value={kpi.eficiencia ?? 0} color={kpi.eficiencia && kpi.eficiencia >= 100 ? 'bg-emerald-500' : 'bg-amber-500'} />
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-mcvill-text-muted font-black uppercase tracking-wider">Calidad</span>
            <span className={clsx('font-black tabular-nums', calColor)}>{kpi.tasa_calidad?.toFixed(1) ?? '—'}%</span>
          </div>
          <KPIBar value={kpi.tasa_calidad ?? 0} color={kpi.tasa_calidad && kpi.tasa_calidad >= 98 ? 'bg-emerald-500' : 'bg-rose-500'} />
          {kpi.oee !== undefined && (
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className="text-mcvill-text-muted font-black uppercase tracking-wider">OEE</span>
              <span className={clsx('font-black tabular-nums', kpiColor(kpi.oee, 85, 65))}>{kpi.oee.toFixed(1)}%</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-mcvill-text-muted italic">Sin datos este período</p>
      )}
    </div>
  );
};

// ── Célula summary card ───────────────────────────────────────────────────────
const CelulaCard: React.FC<{ cel: CelulaDesempeno }> = ({ cel }) => (
  <div className="bg-mcvill-card border border-mcvill-accent/10 rounded-2xl p-4">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-black uppercase tracking-widest text-mcvill-text flex items-center gap-2">
        <Factory size={14} className="text-mcvill-accent" /> {cel.celula}
      </p>
      {cel.bono_celula > 0 && (
        <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-[10px] font-black text-amber-400">
          Bono ${cel.bono_celula.toLocaleString('es-MX')}
        </span>
      )}
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Eficiencia', val: cel.eficiencia_prom, target: 100, warn: 85 },
        { label: 'Calidad', val: cel.calidad_prom, target: 98, warn: 90 },
        { label: 'OEE', val: cel.oee_prom, target: 85, warn: 65 },
      ].map(k => (
        <div key={k.label} className="text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-mcvill-text-muted mb-1">{k.label}</p>
          <p className={clsx('text-lg font-black tabular-nums', kpiColor(k.val, k.target, k.warn))}>
            {k.val?.toFixed(1) ?? '—'}%
          </p>
          {k.val !== undefined && (
            <KPIBar value={k.val} color={k.val >= k.target ? 'bg-emerald-500' : k.val >= k.warn ? 'bg-amber-500' : 'bg-rose-500'} />
          )}
        </div>
      ))}
    </div>
  </div>
);

// ── KPI entry form ────────────────────────────────────────────────────────────
const KPIForm: React.FC<{
  operador: Operador;
  existing?: DesempenoKPI;
  periodo: string;
  onSave: (kpi: DesempenoKPI) => void;
  onClose: () => void;
}> = ({ operador, existing, periodo, onSave, onClose }) => {
  const [form, setForm] = useState({
    piezas_meta: existing?.piezas_meta?.toString() ?? '',
    piezas_real: existing?.piezas_real?.toString() ?? '',
    piezas_ok: existing?.piezas_ok?.toString() ?? '',
    horas_trabajadas: existing?.horas_trabajadas?.toString() ?? '40',
    horas_paro: existing?.horas_paro?.toString() ?? '0',
    incidentes: existing?.incidentes?.toString() ?? '0',
    score_5s: existing?.score_5s?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const saved = await upsertKPI({
      operador_id: operador.id, periodo, tipo_periodo: 'semanal' as TipoPeriodo,
      piezas_meta: form.piezas_meta ? parseInt(form.piezas_meta) : undefined,
      piezas_real: form.piezas_real ? parseInt(form.piezas_real) : undefined,
      piezas_ok: form.piezas_ok ? parseInt(form.piezas_ok) : undefined,
      piezas_rechazo: form.piezas_real && form.piezas_ok ? parseInt(form.piezas_real) - parseInt(form.piezas_ok) : undefined,
      horas_trabajadas: form.horas_trabajadas ? parseFloat(form.horas_trabajadas) : undefined,
      horas_paro: form.horas_paro ? parseFloat(form.horas_paro) : 0,
      incidentes: parseInt(form.incidentes) || 0,
      score_5s: form.score_5s ? parseInt(form.score_5s) : undefined,
    });
    setSaving(false);
    onSave(saved);
    onClose();
  };

  const fields = [
    { key: 'piezas_meta', label: 'Meta Piezas', type: 'number' },
    { key: 'piezas_real', label: 'Real Piezas', type: 'number' },
    { key: 'piezas_ok', label: 'Piezas OK', type: 'number' },
    { key: 'horas_trabajadas', label: 'Horas Trabajadas', type: 'number' },
    { key: 'horas_paro', label: 'Horas Paro', type: 'number' },
    { key: 'incidentes', label: 'Incidentes', type: 'number' },
    { key: 'score_5s', label: 'Score 5S (0-100)', type: 'number' },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="bg-mcvill-card border border-mcvill-accent/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-widest text-mcvill-text">
          KPIs — {operador.nombre.split(' ')[0]}
        </p>
        <button type="button" onClick={onClose}><X size={16} className="text-mcvill-text-muted hover:text-rose-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1">{f.label}</label>
            <input type={f.type} value={form[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-3 py-2 text-sm text-mcvill-text focus:outline-none focus:border-mcvill-accent/50"
            />
          </div>
        ))}
      </div>
      <button type="submit" disabled={saving}
        className="w-full py-2.5 bg-mcvill-accent/20 hover:bg-mcvill-accent/30 border border-mcvill-accent/40 rounded-xl text-mcvill-accent text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
        {saving ? 'Guardando...' : 'Guardar KPIs'}
      </button>
    </form>
  );
};

// ── Incentivo badge ───────────────────────────────────────────────────────────
const IncentivoBadge: React.FC<{ tipo: TipoIncentivo }> = ({ tipo }) => {
  const map: Record<TipoIncentivo, { icon: React.FC<any>; label: string; cls: string }> = {
    productividad: { icon: TrendingUp, label: 'Productividad', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    calidad:       { icon: CheckCircle, label: 'Calidad', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    seguridad:     { icon: Shield, label: 'Seguridad', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
    puntualidad:   { icon: Zap, label: 'Puntualidad', cls: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    '5s':          { icon: Star, label: '5S', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    especial:      { icon: Award, label: 'Especial', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  };
  const { icon: Icon, label, cls } = map[tipo];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border', cls)}>
      <Icon size={10} /> {label}
    </span>
  );
};

// ── Operador Form Modal ───────────────────────────────────────────────────────
const TURNOS = ['matutino', 'vespertino', 'nocturno'] as const;

const OperadorFormModal: React.FC<{
  operador?: Operador;
  onSave: (op: Operador) => void;
  onClose: () => void;
}> = ({ operador, onSave, onClose }) => {
  const isEdit = !!operador;
  const [form, setForm] = useState({
    nombre:           operador?.nombre           ?? '',
    numero_empleado:  operador?.numero_empleado  ?? '',
    celula:           operador?.celula           ?? CELULAS[0],
    turno:            operador?.turno            ?? 'matutino',
    puesto:           operador?.puesto           ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.numero_empleado.trim() || !form.puesto.trim()) {
      setErr('Nombre, número de empleado y puesto son obligatorios.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const saved = isEdit
        ? await updateOperador(operador!.id, form)
        : await createOperador(form as any);
      toast(isEdit ? 'Operador actualizado.' : 'Operador dado de alta.', 'success');
      onSave(saved);
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-mcvill-card border border-mcvill-accent/20 rounded-3xl shadow-2xl p-8 z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-mcvill-text">
                {isEdit ? 'Editar Operador' : 'Alta de Operador'}
              </h3>
              <p className="text-[10px] text-mcvill-text-muted mt-0.5">Módulo Desempeño + Incentivos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-mcvill-text-muted hover:text-rose-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1.5">
              Nombre completo *
            </label>
            <input
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Ej. Juan Martínez López"
              className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-4 py-2.5 text-sm text-mcvill-text placeholder-mcvill-text-muted/40 focus:outline-none focus:border-mcvill-accent/50"
            />
          </div>

          {/* Número de empleado */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1.5">
              Número de empleado *
            </label>
            <input
              value={form.numero_empleado}
              onChange={e => set('numero_empleado', e.target.value.toUpperCase())}
              placeholder="Ej. EMP-001"
              className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-4 py-2.5 text-sm text-mcvill-text font-mono placeholder-mcvill-text-muted/40 focus:outline-none focus:border-mcvill-accent/50"
            />
          </div>

          {/* Puesto */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1.5">
              Puesto *
            </label>
            <input
              value={form.puesto}
              onChange={e => set('puesto', e.target.value)}
              placeholder="Ej. Soldador Senior, Operador CNC…"
              className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-4 py-2.5 text-sm text-mcvill-text placeholder-mcvill-text-muted/40 focus:outline-none focus:border-mcvill-accent/50"
            />
          </div>

          {/* Célula + Turno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1.5">
                Célula
              </label>
              <select
                value={form.celula}
                onChange={e => set('celula', e.target.value)}
                className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-3 py-2.5 text-sm text-mcvill-text focus:outline-none focus:border-mcvill-accent/50"
              >
                {CELULAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted block mb-1.5">
                Turno
              </label>
              <select
                value={form.turno}
                onChange={e => set('turno', e.target.value)}
                className="w-full bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-3 py-2.5 text-sm text-mcvill-text focus:outline-none focus:border-mcvill-accent/50"
              >
                {TURNOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {err && (
            <p className="text-xs text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2">
              {err}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-mcvill-bg border border-mcvill-accent/10 text-mcvill-text-muted rounded-xl text-xs font-black uppercase tracking-widest hover:text-mcvill-text transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-mcvill-accent/20 border border-mcvill-accent/40 text-mcvill-accent rounded-xl text-xs font-black uppercase tracking-widest hover:bg-mcvill-accent/30 transition-all disabled:opacity-50">
              {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Dar de Alta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────
export const DesempenoView: React.FC = () => {
  const { config } = useConfig();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [kpis, setKpis] = useState<DesempenoKPI[]>([]);
  const [incentivos, setIncentivos] = useState<Incentivo[]>([]);
  const [celulas, setCelulas] = useState<CelulaDesempeno[]>([]);
  const [selectedOp, setSelectedOp] = useState<Operador | null>(null);
  const [activeTab, setActiveTab] = useState<'tablero' | 'celulas' | 'incentivos' | 'operadores'>('tablero');
  const [filterCelula, setFilterCelula] = useState<string>('TODAS');
  const [showKPIForm, setShowKPIForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [opModal, setOpModal] = useState<{ open: boolean; editing?: Operador }>({ open: false });
  const periodo = getThisWeek();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchOperadores(),
      fetchKPIs(periodo),
      fetchIncentivos(periodo),
      fetchCelulaDesempeno(periodo),
    ]).then(([ops, k, inc, cels]) => {
      setOperadores(ops);
      setKpis(k);
      setIncentivos(inc);
      setCelulas(cels);
      if (ops.length > 0 && !selectedOp) setSelectedOp(ops[0]);
    }).catch((err) => {
      console.error('[DesempenoView] load error:', err);
      setErrorMsg('No se pudieron cargar los datos de desempeño. Verifica tu conexión.');
    }).finally(() => setLoading(false));
  }, [periodo]);

  const filteredOps = filterCelula === 'TODAS' ? operadores : operadores.filter(o => o.celula === filterCelula);
  const selectedKPI = kpis.find(k => k.operador_id === selectedOp?.id);
  const selectedIncentivos = incentivos.filter(i => i.operador_id === selectedOp?.id);

  const handleExportPDF = () => {
    const data = operadores.map(op => {
      const kpi = kpis.find(k => k.operador_id === op.id);
      const bono = incentivos.filter(i => i.operador_id === op.id).reduce((s, i) => s + i.monto, 0);
      return {
        EMPLEADO: op.numero_empleado ?? '—',
        OPERADOR: op.nombre,
        CELULA: op.celula ?? '—',
        EFICIENCIA_PCT: kpi?.eficiencia != null ? `${kpi.eficiencia.toFixed(1)}%` : '—',
        CALIDAD_PCT: kpi?.tasa_calidad != null ? `${kpi.tasa_calidad.toFixed(1)}%` : '—',
        OEE_PCT: kpi?.oee != null ? `${kpi.oee.toFixed(1)}%` : '—',
        INCIDENTES: kpi?.incidentes != null ? String(kpi.incidentes) : '0',
        BONO_MXN: bono > 0 ? `$${bono.toLocaleString('es-MX')}` : '$0',
      };
    });
    reportUtils.exportToPDF('Reporte de Desempeño de Operadores', data, 'desempeno_operadores', 'PRODUCCIÓN');
  };

  const handleKPISave = (newKPI: DesempenoKPI) => {
    setKpis(prev => {
      const idx = prev.findIndex(k => k.operador_id === newKPI.operador_id && k.periodo === newKPI.periodo);
      if (idx >= 0) { const a = [...prev]; a[idx] = newKPI; return a; }
      return [...prev, newKPI];
    });
    if (selectedOp && newKPI.operador_id === selectedOp.id) {
      const suggested = calcularIncentivo(newKPI, config.salarioBaseDefault ?? SALARIO_BASE_DEFAULT, config);
      if (suggested.length > 0) {
        setIncentivos(prev => [...prev.filter(i => i.operador_id !== selectedOp.id), ...suggested]);
      }
    }
  };

  const handleAprobar = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const approver = user?.user_metadata?.full_name || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Sistema';
      await aprobarIncentivo(id, approver);
      setIncentivos(prev => prev.map(i => i.id === id ? { ...i, aprobado: true, aprobado_por: approver } : i));
    } catch (err) {
      console.error('[DesempenoView] handleAprobar error:', err);
      setErrorMsg('No se pudo aprobar el incentivo. Intenta de nuevo.');
    }
  };

  const totalBonosSemana = incentivos.filter(i => i.aprobado).reduce((s, i) => s + i.monto, 0);
  const pendientesAprobacion = incentivos.filter(i => !i.aprobado).length;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
          {errorMsg}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-mcvill-text flex items-center gap-3">
            <BarChart2 size={28} className="text-mcvill-accent" />
            Desempeño + Incentivos
          </h1>
          <p className="text-xs text-mcvill-text-muted mt-1 tracking-widest uppercase">
            KPIs por Operador · Bonos por Célula — Resp.: Arianna Carrillo / Jorge Villarreal
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendientesAprobacion > 0 && (
            <span className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-black uppercase tracking-wider">
              <Award size={14} /> {pendientesAprobacion} bono{pendientesAprobacion > 1 ? 's' : ''} pendiente{pendientesAprobacion > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <FileDown size={11} /> EXPORTAR PDF
          </button>
          <div className="text-right">
            <p className="text-[10px] text-mcvill-text-muted font-black uppercase tracking-wider">Semana</p>
            <p className="text-sm font-black text-mcvill-text tabular-nums">{periodo}</p>
          </div>
        </div>
      </div>

      {/* KPI summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Operadores Activos', val: operadores.length.toString(), sub: `${kpis.length} con KPIs`, color: 'text-blue-400' },
          { icon: TrendingUp, label: 'Eficiencia Promedio', val: (() => { const r = kpis.filter(k => k.eficiencia != null); return r.length ? `${(r.reduce((s, k) => s + k.eficiencia!, 0) / r.length).toFixed(1)}%` : '—'; })(), sub: 'Meta: 100%', color: kpiColor(kpis.filter(k => k.eficiencia != null).length ? kpis.filter(k => k.eficiencia != null).reduce((s, k) => s + k.eficiencia!, 0) / kpis.filter(k => k.eficiencia != null).length : 0, 100, 85) },
          { icon: CheckCircle, label: 'Calidad Promedio', val: (() => { const r = kpis.filter(k => k.tasa_calidad != null); return r.length ? `${(r.reduce((s, k) => s + k.tasa_calidad!, 0) / r.length).toFixed(1)}%` : '—'; })(), sub: 'Meta: 98%', color: kpiColor(kpis.filter(k => k.tasa_calidad != null).length ? kpis.filter(k => k.tasa_calidad != null).reduce((s, k) => s + k.tasa_calidad!, 0) / kpis.filter(k => k.tasa_calidad != null).length : 0, 98, 90) },
          { icon: DollarSign, label: 'Bonos Aprobados', val: `$${totalBonosSemana.toLocaleString('es-MX')}`, sub: `${pendientesAprobacion} pendientes`, color: 'text-amber-400' },
        ].map(k => (
          <div key={k.label} className="bg-mcvill-card border border-mcvill-accent/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={16} className={k.color} />
              <p className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted">{k.label}</p>
            </div>
            <p className={clsx('text-xl font-black tabular-nums', k.color)}>{k.val}</p>
            <p className="text-[10px] text-mcvill-text-muted mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-mcvill-card border border-mcvill-accent/10 rounded-xl p-1 w-fit">
        {(['tablero', 'celulas', 'incentivos', 'operadores'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
              activeTab === t
                ? 'bg-mcvill-accent/20 text-mcvill-accent border border-mcvill-accent/30'
                : 'text-mcvill-text-muted hover:text-mcvill-text'
            )}>
            {t === 'tablero' ? 'Tablero' : t === 'celulas' ? 'Por Célula' : t === 'incentivos' ? 'Incentivos' : 'Operadores'}
          </button>
        ))}
      </div>

      {/* ── TABLERO tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'tablero' && (
        <div className="flex gap-6">
          {/* Left: operador list */}
          <div className="w-72 shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <select value={filterCelula} onChange={e => setFilterCelula(e.target.value)}
                className="flex-1 bg-mcvill-bg border border-mcvill-accent/20 rounded-xl px-3 py-2 text-xs text-mcvill-text focus:outline-none focus:border-mcvill-accent/50">
                <option value="TODAS">Todas las células</option>
                {CELULAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto pr-1 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-mcvill-text-muted">
                  <div className="w-5 h-5 border-2 border-mcvill-accent/20 border-t-mcvill-accent rounded-full animate-spin" role="status" aria-label="Cargando" />
                </div>
              ) : filteredOps.map(op => (
                <OperadorCard key={op.id} operador={op}
                  kpi={kpis.find(k => k.operador_id === op.id)}
                  incentivos={incentivos}
                  onSelect={() => { setSelectedOp(op); setShowKPIForm(false); }}
                  selected={selectedOp?.id === op.id}
                />
              ))}
            </div>
          </div>

          {/* Right: detail */}
          <div className="flex-1 min-w-0 space-y-4">
            {!selectedOp ? (
              <div className="flex items-center justify-center h-64 text-mcvill-text-muted text-sm">
                Selecciona un operador para ver su detalle.
              </div>
            ) : (
              <>
                {/* Op header */}
                <div className="bg-mcvill-card border border-mcvill-accent/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-lg font-black text-mcvill-text uppercase tracking-wide">{selectedOp.nombre}</p>
                      <p className="text-xs text-mcvill-text-muted mt-0.5">
                        {selectedOp.numero_empleado} · {selectedOp.celula} · Turno {selectedOp.turno} · {selectedOp.puesto}
                      </p>
                    </div>
                    <button onClick={() => setShowKPIForm(!showKPIForm)}
                      className="flex items-center gap-2 px-4 py-2 bg-mcvill-accent/10 border border-mcvill-accent/30 rounded-xl text-mcvill-accent text-xs font-black uppercase tracking-wider hover:bg-mcvill-accent/20 transition-all">
                      <Plus size={14} /> {showKPIForm ? 'Cancelar' : 'Capturar KPIs'}
                    </button>
                  </div>
                </div>

                {showKPIForm && (
                  <KPIForm operador={selectedOp} existing={selectedKPI} periodo={periodo}
                    onSave={handleKPISave} onClose={() => setShowKPIForm(false)} />
                )}

                {/* KPI metrics */}
                {selectedKPI ? (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Eficiencia', val: selectedKPI.eficiencia, unit: '%', target: 100, warn: 85, sub: `${selectedKPI.piezas_real ?? 0}/${selectedKPI.piezas_meta ?? 0} pzas` },
                        { label: 'Calidad', val: selectedKPI.tasa_calidad, unit: '%', target: 98, warn: 90, sub: `${selectedKPI.piezas_rechazo ?? 0} rechazos` },
                        { label: 'OEE', val: selectedKPI.oee, unit: '%', target: 85, warn: 65, sub: `${selectedKPI.horas_paro ?? 0}h paro` },
                        { label: 'Score 5S', val: selectedKPI.score_5s, unit: '/100', target: 90, warn: 70, sub: `${selectedKPI.incidentes} incidentes` },
                      ].map(k => (
                        <div key={k.label} className="bg-mcvill-card border border-mcvill-accent/10 rounded-xl p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted mb-1">{k.label}</p>
                          <p className={clsx('text-2xl font-black tabular-nums', kpiColor(k.val, k.target, k.warn))}>
                            {k.val?.toFixed(1) ?? '—'}{k.unit}
                          </p>
                          {k.val !== undefined && (
                            <KPIBar value={k.val} max={k.unit === '/100' ? 100 : 100}
                              color={k.val >= k.target ? 'bg-emerald-500' : k.val >= k.warn ? 'bg-amber-500' : 'bg-rose-500'} />
                          )}
                          <p className="text-[10px] text-mcvill-text-muted mt-1">{k.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Incentivos for this op */}
                    {selectedIncentivos.length > 0 && (
                      <div className="bg-mcvill-card border border-mcvill-accent/10 rounded-2xl p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-mcvill-text mb-3 flex items-center gap-2">
                          <Award size={14} className="text-amber-400" /> Bonos Generados
                        </p>
                        <div className="space-y-2">
                          {selectedIncentivos.map(inc => (
                            <div key={inc.id} className="flex items-center justify-between gap-4 p-3 bg-mcvill-bg/50 rounded-xl">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <IncentivoBadge tipo={inc.tipo_incentivo} />
                                <span className="text-xs text-mcvill-text-muted truncate">{inc.descripcion}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-black text-amber-400 tabular-nums">${inc.monto.toLocaleString('es-MX')}</span>
                                {inc.aprobado ? (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase">Aprobado</span>
                                ) : (
                                  <button onClick={() => handleAprobar(inc.id)}
                                    className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-black uppercase hover:bg-amber-500/20 transition-all">
                                    Aprobar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-mcvill-text-muted text-sm">
                    No hay KPIs registrados para este operador en la semana actual.
                    <br />
                    <button onClick={() => setShowKPIForm(true)} className="mt-3 text-mcvill-accent text-xs font-black uppercase tracking-wider hover:underline">
                      Capturar KPIs ahora →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CÉLULA tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'celulas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {celulas.map(cel => <CelulaCard key={cel.id} cel={cel} />)}
        </div>
      )}

      {/* ── INCENTIVOS tab ────────────────────────────────────────────────────── */}
      {activeTab === 'incentivos' && (
        <div className="bg-mcvill-card border border-mcvill-accent/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-mcvill-accent/10 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-mcvill-text">
              Todos los bonos — Semana {periodo}
            </p>
            <div className="flex items-center gap-3 text-xs text-mcvill-text-muted">
              <span className="font-black">Total aprobado: <span className="text-amber-400">${totalBonosSemana.toLocaleString('es-MX')} MXN</span></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-mcvill-accent/10">
                  {['Operador', 'Célula', 'Tipo', 'Descripción', 'Monto', 'Estado', 'Aprobado por'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incentivos.map(inc => {
                  const op = operadores.find(o => o.id === inc.operador_id);
                  return (
                    <tr key={inc.id} className="border-b border-mcvill-accent/5 hover:bg-mcvill-accent/5 transition-colors">
                      <td className="px-4 py-3 font-black text-mcvill-text">{op?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-mcvill-text-muted">{op?.celula ?? '—'}</td>
                      <td className="px-4 py-3"><IncentivoBadge tipo={inc.tipo_incentivo} /></td>
                      <td className="px-4 py-3 text-mcvill-text-muted max-w-xs truncate">{inc.descripcion ?? '—'}</td>
                      <td className="px-4 py-3 font-black text-amber-400 tabular-nums">${inc.monto.toLocaleString('es-MX')}</td>
                      <td className="px-4 py-3">
                        {inc.aprobado ? (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase">Aprobado</span>
                        ) : (
                          <button onClick={() => handleAprobar(inc.id)}
                            className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-black uppercase hover:bg-amber-500/20 transition-all">
                            Aprobar
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-mcvill-text-muted">{inc.aprobado_por ?? '—'}</td>
                    </tr>
                  );
                })}
                {incentivos.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-mcvill-text-muted">No hay bonos registrados para este período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── OPERADORES tab ────────────────────────────────────────────────────── */}
      {activeTab === 'operadores' && (
        <div className="space-y-4">
          {/* Header del tab */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-mcvill-text-muted">
                {operadores.length} operador{operadores.length !== 1 ? 'es' : ''} registrado{operadores.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setOpModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-mcvill-accent/10 border border-mcvill-accent/30 rounded-xl text-mcvill-accent text-xs font-black uppercase tracking-wider hover:bg-mcvill-accent/20 transition-all"
            >
              <UserPlus size={14} /> Nuevo Operador
            </button>
          </div>

          {/* Filtro célula */}
          <div className="flex gap-2 flex-wrap">
            {['TODAS', ...CELULAS].map(c => (
              <button key={c} onClick={() => setFilterCelula(c)}
                className={clsx(
                  'px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border',
                  filterCelula === c
                    ? 'bg-mcvill-accent/20 text-mcvill-accent border-mcvill-accent/30'
                    : 'bg-mcvill-card text-mcvill-text-muted border-mcvill-accent/10 hover:text-mcvill-text'
                )}>
                {c}
              </button>
            ))}
          </div>

          {/* Tabla de operadores */}
          <div className="bg-mcvill-card border border-mcvill-accent/10 rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-mcvill-accent/10">
                  {['#', 'Nombre', 'N° Empleado', 'Puesto', 'Célula', 'Turno', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-mcvill-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOps.map((op, idx) => (
                  <tr key={op.id} className="border-b border-mcvill-accent/5 hover:bg-mcvill-accent/5 transition-colors">
                    <td className="px-4 py-3 text-mcvill-text-muted font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-black text-mcvill-text">{op.nombre}</td>
                    <td className="px-4 py-3 font-mono text-mcvill-accent">{op.numero_empleado ?? '—'}</td>
                    <td className="px-4 py-3 text-mcvill-text-muted">{op.puesto ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-mcvill-accent/10 text-mcvill-accent border border-mcvill-accent/20 rounded-full text-[9px] font-black uppercase">
                        {op.celula ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-mcvill-text-muted capitalize">{op.turno ?? '—'}</td>
                    <td className="px-4 py-3">
                      {op.activo ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase">
                          <ToggleRight size={14} /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-mcvill-text-muted text-[10px] font-black uppercase">
                          <ToggleLeft size={14} /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setOpModal({ open: true, editing: op })}
                          className="p-1.5 rounded-lg bg-mcvill-accent/10 text-mcvill-accent hover:bg-mcvill-accent/20 transition-all"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const updated = await updateOperador(op.id, { activo: !op.activo });
                              setOperadores(prev => prev.map(o => o.id === op.id ? updated : o));
                              toast(`Operador ${updated.activo ? 'activado' : 'desactivado'}.`, 'success');
                            } catch { toast('Error al cambiar estado.', 'error'); }
                          }}
                          className={clsx(
                            'p-1.5 rounded-lg transition-all text-[10px] font-black uppercase flex items-center gap-1',
                            op.activo
                              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          )}
                          title={op.activo ? 'Desactivar' : 'Activar'}
                        >
                          {op.activo ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOps.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-mcvill-text-muted">
                        <Users size={32} className="opacity-30" />
                        <p className="text-xs font-bold">No hay operadores registrados en esta célula.</p>
                        <button
                          onClick={() => setOpModal({ open: true })}
                          className="mt-1 text-mcvill-accent text-xs font-black uppercase tracking-wider hover:underline flex items-center gap-1"
                        >
                          <UserPlus size={12} /> Dar de alta el primero →
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Alta / Edición de Operador ─────────────────────────────────── */}
      {opModal.open && (
        <OperadorFormModal
          operador={opModal.editing}
          onSave={saved => {
            setOperadores(prev => {
              const idx = prev.findIndex(o => o.id === saved.id);
              if (idx >= 0) { const a = [...prev]; a[idx] = saved; return a; }
              return [...prev, saved];
            });
          }}
          onClose={() => setOpModal({ open: false })}
        />
      )}
    </div>
  );
};

export default DesempenoView;
