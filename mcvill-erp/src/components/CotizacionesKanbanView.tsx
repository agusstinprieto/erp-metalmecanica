import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import {
  KanbanSquare, Plus, X, Save, BarChart2, AlertTriangle,
  Clock, Target, TrendingUp, CheckCircle2, Send, Search,
  RefreshCw, ChevronRight, FileText, Activity, BrainCircuit,
  BookOpen,
} from 'lucide-react';
import { RFQDetailDrawer } from './RFQDetailDrawer';
import { CotizacionesGuiaModal, useGuiaCotizaciones } from './CotizacionesGuiaModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  fetchRFQs, createRFQ, calcRiskScore
} from '../services/quoteService';
import type { RFQCotizacion, RFQEstado, NewRFQInput } from '../types/quote.types';
import { useQuoteStatus } from '../hooks/useQuoteStatus';
import { useTenant } from '../hooks/useTenant';
import { useConfig } from '../contexts/ConfigContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLS: { id: RFQEstado; label: string; sub: string; dot: string; bg: string; border: string }[] = [
  { id: 'factibilidad', label: 'FACTIBILIDAD', sub: 'Análisis inicial',  dot: 'bg-indigo-400',  bg: 'bg-indigo-500/5',  border: 'border-indigo-500/25' },
  { id: 'cotizacion',   label: 'COTIZACIÓN',   sub: 'En proceso',        dot: 'bg-mcvill-accent', bg: 'bg-mcvill-accent/5', border: 'border-mcvill-accent/25' },
  { id: 'revision',     label: 'DIRECCIÓN',    sub: 'En revisión',       dot: 'bg-amber-400',   bg: 'bg-amber-500/5',   border: 'border-amber-500/25' },
  { id: 'enviada',      label: 'ENVIADA',      sub: 'Al cliente',        dot: 'bg-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/25' },
];

const RISK = {
  LOW:    { label: 'LOW',   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
  MEDIUM: { label: 'MEDIO', cls: 'text-amber-400   bg-amber-500/10   border-amber-500/30',   dot: 'bg-amber-400' },
  HIGH:   { label: 'HIGH',  cls: 'text-red-400     bg-red-500/10     border-red-500/30',     dot: 'bg-red-500 animate-pulse' },
};

// Historical 2025 data from INFORME ANUAL (Status Quotes 2026.xlsx)
const HIST_2025 = [
  { mes: 'Ene', reg: 11, env: 10, dec: 2, ok: 5 },
  { mes: 'Feb', reg: 22, env: 3,  dec: 6, ok: 0 },
  { mes: 'Mar', reg: 5,  env: 2,  dec: 3, ok: 1 },
  { mes: 'Abr', reg: 11, env: 8,  dec: 1, ok: 2 },
  { mes: 'May', reg: 19, env: 11, dec: 7, ok: 2 },
  { mes: 'Jun', reg: 15, env: 8,  dec: 4, ok: 2 },
  { mes: 'Jul', reg: 11, env: 8,  dec: 1, ok: 2 },
  { mes: 'Ago', reg: 7,  env: 5,  dec: 1, ok: 3 },
  { mes: 'Sep', reg: 12, env: 7,  dec: 6, ok: 5 },
  { mes: 'Oct', reg: 22, env: 11, dec: 5, ok: 4 },
  { mes: 'Nov', reg: 10, env: 5,  dec: 2, ok: 3 },
  { mes: 'Dic', reg: 8,  env: 4,  dec: 3, ok: 2 },
];

const PM_LIST = ['Eduardo Flores', 'Sandra Rodríguez', 'Ruben Delgado', 'Elias Salas', 'JVV', 'Sheccid RMZ', 'Adrian Marquez'];

// ─── Utilities ───────────────────────────────────────────────────────────────

function diasElapsed(fecha?: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const RiskBadge = ({ nivel }: { nivel: 'LOW' | 'MEDIUM' | 'HIGH' }) => {
  const r = RISK[nivel];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest border', r.cls)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', r.dot)} />
      {r.label}
    </span>
  );
};

const SLABar = ({ rfq }: { rfq: RFQCotizacion }) => {
  if (rfq.estado === 'enviada' || rfq.estado === 'declinada') return null;
  const elapsed = diasElapsed(rfq.fecha_recepcion);
  const pct = Math.min((elapsed / rfq.sla_dias) * 100, 100);
  const over = elapsed > rfq.sla_dias;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[9px] font-mono mb-0.5">
        <span className={over ? 'text-red-400' : 'text-slate-500'}>{elapsed}d transcurridos</span>
        <span className={over ? 'text-red-400' : 'text-slate-500'}>SLA {rfq.sla_dias}d</span>
      </div>
      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', over ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-mcvill-accent')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const RFQCard = ({
  rfq, onDragStart, isMoving, onClick, onAnalyzeRFQ
}: {
  rfq: RFQCotizacion;
  onDragStart: () => void;
  isMoving: boolean;
  onClick: () => void;
  onAnalyzeRFQ?: () => void;
}) => {
  const elapsed = diasElapsed(rfq.fecha_recepcion);
  const slaOver = rfq.estado !== 'enviada' && rfq.estado !== 'declinada' && elapsed > rfq.sla_dias;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={clsx(
        'group cursor-grab active:cursor-grabbing rounded-xl border p-3 transition-all duration-200 select-none',
        'bg-slate-900/80 backdrop-blur hover:bg-slate-800/90',
        slaOver
          ? 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse-border'
          : 'border-slate-700/50 hover:border-mcvill-accent/40',
        isMoving && 'opacity-50 scale-95'
      )}
    >
      {/* Header: IDENT + Cliente */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {rfq.ident && (
              <span className="font-mono text-[10px] text-mcvill-accent/70 font-bold shrink-0">#{rfq.ident}</span>
            )}
            <span className="text-[11px] font-black text-white uppercase truncate">{rfq.cliente}</span>
          </div>
          {rfq.descripcion && (
            <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{rfq.descripcion}</p>
          )}
        </div>
        <RiskBadge nivel={rfq.riesgo_nivel} />
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {rfq.cant_np > 0 && (
          <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1 py-0.5 rounded">
            {rfq.cant_np} NP{rfq.cant_np > 1 ? 's' : ''}
          </span>
        )}
        {rfq.eau && (
          <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1 py-0.5 rounded">
            EAU: {rfq.eau}
          </span>
        )}
        {rfq.alcance_general && (
          <span className="text-[9px] text-slate-600 uppercase">{rfq.alcance_general}</span>
        )}
      </div>

      {/* PM */}
      {rfq.pm_asignado && (
        <div className="mt-1.5 flex items-center gap-1">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <span className="text-[7px] font-black text-slate-300">
              {rfq.pm_asignado.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </span>
          </div>
          <span className="text-[9px] text-slate-500 truncate">{rfq.pm_asignado}</span>
        </div>
      )}

      {/* SLA bar */}
      <SLABar rfq={rfq} />

      {/* SLA overrun badge */}
      {slaOver && (
        <div className="mt-1.5 flex items-center gap-1 text-red-400">
          <AlertTriangle size={9} />
          <span className="text-[8px] font-black uppercase tracking-wider">SLA VENCIDO +{elapsed - rfq.sla_dias}d</span>
        </div>
      )}

      {/* Analizar IA button — visible on hover */}
      {onAnalyzeRFQ && (
        <button
          onClick={e => { e.stopPropagation(); onAnalyzeRFQ(); }}
          className="mt-2 w-full hidden group-hover:flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[9px] font-black uppercase tracking-wider hover:bg-mcvill-accent/25 transition-all"
        >
          <BrainCircuit size={10} />
          Analizar IA
        </button>
      )}
    </div>
  );
};

// ─── F001 Risk Matrix Modal ──────────────────────────────────────────────────

const EMPTY_FORM: NewRFQInput = {
  cliente: '', descripcion: '', contacto_cliente: '', pm_asignado: '',
  cant_np: 1, eau: '', cant_aceros: 0, cant_procesos: 0, cant_subensambles: 0, cant_hardwares: 0,
  alcance_general: '', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
  fecha_recepcion: new Date().toISOString().split('T')[0], comentario_pm: '',
};

const F001Modal = ({
  onClose, onSave, tenantId
}: { onClose: () => void; onSave: (rfq: RFQCotizacion) => void; tenantId: string }) => {
  const { config } = useConfig();
  const [form, setForm] = useState<NewRFQInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const risk = calcRiskScore(form.cant_aceros, form.cant_procesos, form.cant_subensambles, form.cant_hardwares);
  const riskCfg = RISK[risk.nivel];

  const set = (k: keyof NewRFQInput, v: any) => setForm(p => ({ ...p, [k]: v }));
  const setNum = (k: keyof NewRFQInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, Math.max(0, parseInt(e.target.value) || 0));

  const handleSave = async () => {
    if (!form.cliente.trim()) return;
    setSaving(true);
    const rfq = await createRFQ(form, tenantId);
    onSave(rfq);
    setSaving(false);
  };

  const ScoreRow = ({ label, pts, max }: { label: string; pts: number; max: number }) => (
    <div className="flex items-center justify-between text-[10px] font-mono">
      <span className="text-slate-400 w-28 truncate">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={clsx('w-3 h-3 rounded-sm', i < pts ? 'bg-mcvill-accent' : 'bg-slate-700')} />
        ))}
      </div>
      <span className="text-mcvill-accent w-6 text-right font-bold">{pts}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-mcvill-accent/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl shadow-mcvill-accent/5">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Nueva Solicitud RFQ</h2>
            <p className="text-[10px] text-mcvill-accent/70 mt-0.5 tracking-widest uppercase">{`Formato PM_F001 • ${config.companyName}`}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Form fields */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Información de la Cotización</p>

            {[
              { label: 'Cliente *', k: 'cliente', placeholder: 'CAT, WABTEC, JABIL…' },
              { label: 'Descripción / Alcance', k: 'descripcion', placeholder: 'NP + descripción breve' },
              { label: 'Contacto Externo', k: 'contacto_cliente', placeholder: 'Nombre quien solicita el RFQ' },
            ].map(({ label, k, placeholder }) => (
              <div key={k}>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">{label}</label>
                <input
                  value={(form as any)[k]}
                  onChange={e => set(k as keyof NewRFQInput, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">PM Asignado</label>
                <select
                  value={form.pm_asignado}
                  onChange={e => set('pm_asignado', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">— Seleccionar —</option>
                  {PM_LIST.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Alcance General</label>
                <input
                  value={form.alcance_general || ''}
                  onChange={e => set('alcance_general', e.target.value)}
                  placeholder="PIEZA, FRAME, ENSAMBLE…"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Cant. de NPs</label>
                <input type="number" min={1} value={form.cant_np} onChange={setNum('cant_np')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">EAU</label>
                <input value={form.eau || ''} onChange={e => set('eau', e.target.value)} placeholder="ej. 500"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Fecha de Recepción</label>
              <input type="date" value={form.fecha_recepcion || ''} onChange={e => set('fecha_recepcion', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
            </div>

            <div className="flex gap-4 pt-1">
              {(['tiene_solido_3d', 'tiene_planos_2d', 'tiene_bom'] as const).map(k => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer group">
                  <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)}
                    className="w-3.5 h-3.5 accent-cyan-400" />
                  <span className="text-[9px] text-slate-400 group-hover:text-white transition-colors uppercase tracking-wider">
                    {k === 'tiene_solido_3d' ? '3D' : k === 'tiene_planos_2d' ? '2D' : 'BOM'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Right: Risk Matrix F001 */}
          <div className="space-y-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Matriz de Riesgo — F001</p>

            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
              {[
                { label: 'Aceros diferentes',  k: 'cant_aceros',       hint: '≤2→1pt / >2→3pts' },
                { label: 'Procesos requeridos', k: 'cant_procesos',    hint: '<3→1 / 3-5→2 / ≥6→3' },
                { label: 'Subensambles',        k: 'cant_subensambles', hint: '≤2→1 / 3→2 / ≥4→3' },
                { label: 'Hardwares',           k: 'cant_hardwares',   hint: '≤2→1 / 3→2 / ≥4→3' },
              ].map(({ label, k, hint }) => (
                <div key={k}>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</label>
                    <span className="text-[8px] text-slate-600 font-mono">{hint}</span>
                  </div>
                  <input type="number" min={0} value={(form as any)[k]} onChange={setNum(k as keyof NewRFQInput)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-cyan-500/50" />
                </div>
              ))}
            </div>

            {/* Score breakdown */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-2">
              <ScoreRow label="Aceros"       pts={risk.sa} max={3} />
              <ScoreRow label="Procesos"     pts={risk.sp} max={3} />
              <ScoreRow label="Subensambles" pts={risk.ss} max={3} />
              <ScoreRow label="Hardwares"    pts={risk.sh} max={3} />
              <div className="border-t border-slate-800 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total F001</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-white">{risk.total}</span>
                    <span className={clsx('px-2 py-0.5 rounded text-[10px] font-black border', riskCfg.cls)}>
                      {riskCfg.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <Clock size={9} className="text-cyan-400/60" />
                  <span className="text-[9px] text-cyan-400/70">SLA: {risk.sla_dias} días hábiles</span>
                  <span className="text-[8px] text-slate-600 ml-auto">Compromiso con cliente</span>
                </div>
              </div>
            </div>

            <textarea
              value={form.comentario_pm || ''}
              onChange={e => set('comentario_pm', e.target.value)}
              placeholder="Comentarios del PM…"
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.cliente.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-40 transition-all"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Guardando…' : 'Registrar RFQ'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Analytics Tab ───────────────────────────────────────────────────────────

const AnalyticsTab = ({ rfqs }: { rfqs: RFQCotizacion[] }) => {
  const total2025 = HIST_2025.reduce((a, m) => a + m.reg, 0);
  const env2025  = HIST_2025.reduce((a, m) => a + m.env, 0);
  const dec2025  = HIST_2025.reduce((a, m) => a + m.dec, 0);
  const ok2025   = HIST_2025.reduce((a, m) => a + m.ok, 0);

  const byRisk = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  rfqs.forEach(r => { if (r.riesgo_nivel in byRisk) byRisk[r.riesgo_nivel]++; });

  const slaAtRisk = rfqs.filter(r =>
    r.estado !== 'enviada' && r.estado !== 'declinada' &&
    diasElapsed(r.fecha_recepcion) > r.sla_dias
  ).length;

  const KPI = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={clsx('text-2xl font-black font-mono', color || 'text-white')}>{value}</p>
      {sub && <p className="text-[9px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Live KPIs */}
      <div>
        <p className="text-[9px] font-black text-mcvill-accent/70 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-mcvill-accent animate-pulse" />
          Estado Actual — {rfqs.filter(r => r.estado !== 'declinada').length} RFQs activos
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="SLA Vencidos" value={slaAtRisk} sub="requieren atención" color={slaAtRisk > 0 ? 'text-red-400' : 'text-emerald-400'} />
          <KPI label="Riesgo HIGH" value={byRisk.HIGH} sub="proyectos críticos" color={byRisk.HIGH > 2 ? 'text-red-400' : 'text-amber-400'} />
          <KPI label="Riesgo MEDIO" value={byRisk.MEDIUM} color="text-amber-400" />
          <KPI label="Riesgo LOW" value={byRisk.LOW} color="text-emerald-400" />
        </div>
      </div>

      {/* Historical 2025 */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest">Histórico 2025</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Fuente: Status Quotes 2026.xlsx — INFORME ANUAL</p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-lg font-black font-mono text-white">{total2025}</p>
              <p className="text-[8px] text-slate-500 uppercase">Registradas</p>
            </div>
            <div>
              <p className="text-lg font-black font-mono text-mcvill-accent">{env2025}</p>
              <p className="text-[8px] text-slate-500 uppercase">Enviadas</p>
            </div>
            <div>
              <p className="text-lg font-black font-mono text-red-400">{dec2025}</p>
              <p className="text-[8px] text-slate-500 uppercase">Declinadas</p>
            </div>
            <div>
              <p className="text-lg font-black font-mono text-emerald-400">{Math.round((ok2025 / env2025) * 100)}%</p>
              <p className="text-[8px] text-slate-500 uppercase">En Tiempo</p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={HIST_2025} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
              labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
            />
            <Bar dataKey="reg" name="Registradas" fill="#4FA5FF" opacity={0.5} radius={[2, 2, 0, 0]} />
            <Bar dataKey="env" name="Enviadas"    fill="#4FA5FF" radius={[2, 2, 0, 0]} />
            <Bar dataKey="dec" name="Declinadas"  fill="#ef4444" opacity={0.6} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="flex gap-4 mt-2">
          {[{ c: 'bg-cyan-500/50', l: 'Registradas' }, { c: 'bg-cyan-400', l: 'Enviadas' }, { c: 'bg-red-500/60', l: 'Declinadas' }].map(({ c, l }) => (
            <div key={l} className="flex items-center gap-1">
              <div className={clsx('w-2 h-2 rounded-sm', c)} />
              <span className="text-[8px] text-slate-500">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs 2025 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Cotizaciones 2025" value={total2025} sub="total año completo" />
        <KPI label="Tasa Envío" value={`${Math.round((env2025 / total2025) * 100)}%`} sub={`${env2025} de ${total2025}`} color="text-mcvill-accent" />
        <KPI label="Tasa Declín." value={`${Math.round((dec2025 / total2025) * 100)}%`} sub={`${dec2025} declinadas`} color="text-red-400" />
        <KPI label="Envíos a Tiempo" value={`${Math.round((ok2025 / env2025) * 100)}%`} sub={`${ok2025} de ${env2025} enviadas`} color="text-emerald-400" />
      </div>
    </div>
  );
};

// ─── Kanban Column ───────────────────────────────────────────────────────────

const KanbanColumn = ({
  col, cards, dragOver, onDragOver, onDrop, onDragStart, movingId, onCardClick, onAnalyzeRFQ
}: {
  col: typeof COLS[0];
  cards: RFQCotizacion[];
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStart: (id: string) => void;
  movingId: string | null;
  onCardClick: (rfq: RFQCotizacion) => void;
  onAnalyzeRFQ?: (id: string) => void;
}) => {
  const slaOverCount = cards.filter(r =>
    r.estado !== 'enviada' && diasElapsed(r.fecha_recepcion) > r.sla_dias
  ).length;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={clsx(
        'flex flex-col rounded-2xl border min-h-[400px] transition-all duration-200',
        col.bg, col.border,
        dragOver && 'border-mcvill-accent/50 shadow-[0_0_20px_rgba(79,165,255,0.15)] scale-[1.01]'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className={clsx('w-2 h-2 rounded-full', col.dot)} />
          <div>
            <p className="text-[10px] font-black text-white uppercase tracking-widest">{col.label}</p>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider">{col.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {slaOverCount > 0 && (
            <span className="text-[8px] font-black text-red-400 bg-red-500/10 border border-red-500/30 rounded px-1 py-0.5">
              {slaOverCount} ⚠
            </span>
          )}
          <span className="text-[10px] font-black font-mono text-slate-500 bg-slate-800 rounded px-1.5 py-0.5">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-24 text-[9px] text-slate-700 uppercase tracking-widest border border-dashed border-slate-800 rounded-xl">
            Arrastra aquí
          </div>
        )}
        {cards.map(rfq => (
          <RFQCard
            key={rfq.id}
            rfq={rfq}
            onDragStart={() => onDragStart(rfq.id)}
            isMoving={movingId === rfq.id}
            onClick={() => onCardClick(rfq)}
            onAnalyzeRFQ={onAnalyzeRFQ ? () => onAnalyzeRFQ(rfq.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};


// ─── Main Component ───────────────────────────────────────────────────────────

export const CotizacionesKanbanView: React.FC<{
  onAnalyzeRFQ?: (id: string) => void;
  onNavigateToViajeros?: () => void;
}> = ({ onAnalyzeRFQ, onNavigateToViajeros }) => {
  const [rfqs, setRfqs] = useState<RFQCotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'kanban' | 'analytics'>('kanban');
  const [showF001, setShowF001] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQCotizacion | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<RFQEstado | null>(null);
  const [filterPM, setFilterPM] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const tenantId = useTenant();
  const { config } = useConfig();
  const { moveTo, movingId } = useQuoteStatus(rfqs, setRfqs, tenantId);
  const guia = useGuiaCotizaciones();

  useEffect(() => {
    fetchRFQs(tenantId)
      .then(data => { setRfqs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tenantId]);

  const activeRfqs = rfqs.filter(r =>
    (!filterPM   || r.pm_asignado === filterPM) &&
    (!filterRisk || r.riesgo_nivel === filterRisk)
  );

  const colCards = (id: RFQEstado) => activeRfqs.filter(r => r.estado === id);

  const slaAtRisk = rfqs.filter(r =>
    r.estado !== 'enviada' && r.estado !== 'declinada' &&
    diasElapsed(r.fecha_recepcion) > r.sla_dias
  ).length;
  const highRisk = rfqs.filter(r => r.riesgo_nivel === 'HIGH' && r.estado !== 'declinada').length;
  const enviadas  = rfqs.filter(r => r.estado === 'enviada').length;
  const activos   = rfqs.filter(r => r.estado !== 'declinada').length;

  const handleDrop = (e: React.DragEvent, colId: RFQEstado) => {
    e.preventDefault();
    if (dragId && dragId !== '') {
      const rfq = rfqs.find(r => r.id === dragId);
      if (rfq && rfq.estado !== colId) moveTo(dragId, colId);
    }
    setDragOverCol(null);
    setDragId(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={20} className="animate-spin text-mcvill-accent" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mcvill-accent/10 rounded-xl flex items-center justify-center border border-mcvill-accent/20">
              <KanbanSquare size={20} className="text-mcvill-accent" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight uppercase">
                TABLERO DE <span className="text-mcvill-accent">COTIZACIONES</span>
              </h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                {`Kanban RFQ · Formato PM_F001 · ${config.companyName}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('kanban')}
            className={clsx('px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
              tab === 'kanban' ? 'bg-mcvill-accent text-slate-950 shadow-lg shadow-mcvill-accent/20' : 'border-white/10 text-slate-500 hover:text-white')}
          >
            <KanbanSquare size={12} className="inline mr-1" />Kanban
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={clsx('px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
              tab === 'analytics' ? 'bg-mcvill-accent text-slate-950 shadow-lg shadow-mcvill-accent/20' : 'border-white/10 text-slate-500 hover:text-white')}
          >
            <BarChart2 size={12} className="inline mr-1" />Analítica
          </button>
          <button
            onClick={guia.abrir}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-[10px] font-black uppercase tracking-widest transition-all"
            title="Guía de uso"
          >
            <BookOpen size={12} />Guía
          </button>
          <button
            onClick={() => setShowF001(true)}
            className="mcvill-btn-create flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus size={12} strokeWidth={3} />Nueva RFQ
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Activity,      label: 'RFQs Activos',  value: activos,   color: 'text-mcvill-accent'    },
          { icon: AlertTriangle, label: 'SLA Vencidos',  value: slaAtRisk, color: slaAtRisk > 0 ? 'text-red-400' : 'text-emerald-400' },
          { icon: TrendingUp,    label: 'Riesgo HIGH',   value: highRisk,  color: highRisk > 2 ? 'text-red-400' : 'text-amber-400' },
          { icon: Send,          label: 'Enviadas',      value: enviadas,  color: 'text-emerald-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <Icon size={16} className={clsx(color, 'shrink-0')} />
            <div>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest">{label}</p>
              <p className={clsx('text-xl font-black font-mono', color)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters (kanban only) */}
      {tab === 'kanban' && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterPM}
            onChange={e => setFilterPM(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">Todos los PMs</option>
            {PM_LIST.map(pm => <option key={pm} value={pm}>{pm}</option>)}
          </select>
          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">Todos los riesgos</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIO</option>
            <option value="HIGH">HIGH</option>
          </select>
          {(filterPM || filterRisk) && (
            <button
              onClick={() => { setFilterPM(''); setFilterRisk(''); }}
              className="text-[9px] text-slate-500 hover:text-white transition-colors px-2 py-1.5 border border-slate-700 rounded-lg"
            >
              Limpiar filtros
            </button>
          )}
          <span className="text-[9px] text-slate-600 ml-auto">
            {activeRfqs.length} RFQs · Arrastra las tarjetas para mover de etapa
          </span>
        </div>
      )}

      {/* Content */}
      {tab === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              cards={colCards(col.id)}
              dragOver={dragOverCol === col.id}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
              onDrop={e => handleDrop(e, col.id)}
              onDragStart={id => setDragId(id)}
              movingId={movingId}
              onCardClick={rfq => setSelectedRFQ(rfq)}
              onAnalyzeRFQ={onAnalyzeRFQ}
            />
          ))}
        </div>
      ) : (
        <AnalyticsTab rfqs={rfqs} />
      )}

      {/* Modals */}
      {guia.visible && <CotizacionesGuiaModal onClose={guia.cerrar} />}
      {showF001 && (
        <F001Modal
          onClose={() => setShowF001(false)}
          onSave={rfq => { setRfqs(p => [rfq, ...p]); setShowF001(false); }}
          tenantId={tenantId}
        />
      )}
      {selectedRFQ && (
        <RFQDetailDrawer
          rfq={selectedRFQ}
          onClose={() => setSelectedRFQ(null)}
          onUpdate={updated => setRfqs(prev => prev.map(r => r.id === updated.id ? updated : r))}
          onAnalyzeRFQ={onAnalyzeRFQ ? () => { setSelectedRFQ(null); onAnalyzeRFQ(selectedRFQ.id); } : undefined}
          onNavigateToViajeros={onNavigateToViajeros ? () => { setSelectedRFQ(null); onNavigateToViajeros(); } : undefined}
        />
      )}
    </div>
  );
};

export default CotizacionesKanbanView;
