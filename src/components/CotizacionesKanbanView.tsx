import React, { useState, useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import {
  KanbanSquare, Plus, X, Save, BarChart2, AlertTriangle,
  Clock, TrendingUp, Send, RefreshCw, Activity, BrainCircuit,
  BookOpen, List, Trash2, Edit2, Users, UserPlus, Check,
} from 'lucide-react';
import { RFQDetailDrawer } from './RFQDetailDrawer';
import { CotizacionesGuiaModal, useGuiaCotizaciones } from './CotizacionesGuiaModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchRFQs, createRFQ, updateRFQ, deleteRFQ, calcRiskScore
} from '../services/quoteService';
import type { RFQCotizacion, RFQEstado, NewRFQInput } from '../types/quote.types';
import { useQuoteStatus } from '../hooks/useQuoteStatus';
import { useTenant } from '../hooks/useTenant';
import { useConfig } from '../contexts/ConfigContext';
import { appConfirm, toast } from '../lib/dialogs';
import { PrintButton } from './common/PrintButton';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const DEFAULT_PMS = ['Eduardo Flores', 'Sandra Rodríguez', 'Ruben Delgado', 'Elias Salas', 'JVV', 'Sheccid RMZ', 'Adrian Marquez'];
const PM_KEY     = (t: string) => `mcvill_pm_list_${t}`;
const CLIENT_KEY = (t: string) => `mcvill_clients_${t}`;

function loadLS<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); if (r) return JSON.parse(r); } catch {}
  return fallback;
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function diasElapsed(fecha?: string) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

// ─── RiskBadge ────────────────────────────────────────────────────────────────

const RiskBadge = ({ nivel }: { nivel: 'LOW' | 'MEDIUM' | 'HIGH' }) => {
  const r = RISK[nivel];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest border', r.cls)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', r.dot)} />
      {r.label}
    </span>
  );
};

// ─── SLABar ───────────────────────────────────────────────────────────────────

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

// ─── RFQCard ──────────────────────────────────────────────────────────────────

const RFQCard = ({
  rfq, onDragStart, isMoving, onClick, onAnalyzeRFQ, onEdit, onDelete,
}: {
  rfq: RFQCotizacion;
  onDragStart: () => void;
  isMoving: boolean;
  onClick: () => void;
  onAnalyzeRFQ?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {rfq.ident && <span className="font-mono text-[10px] text-mcvill-accent/70 font-bold shrink-0">#{rfq.ident}</span>}
            <span className="text-[11px] font-black text-white uppercase truncate">{rfq.cliente}</span>
          </div>
          {rfq.descripcion && <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{rfq.descripcion}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <RiskBadge nivel={rfq.riesgo_nivel} />
          <div className="hidden group-hover:flex gap-0.5">
            {onEdit && (
              <button onClick={e => { e.stopPropagation(); onEdit(); }} title="Editar RFQ"
                className="p-1 rounded hover:bg-blue-500/10 text-slate-600 hover:text-blue-400 transition-colors">
                <Edit2 size={10} />
              </button>
            )}
            {onDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Eliminar RFQ"
                className="p-1 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-colors">
                <Trash2 size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-1">
        {rfq.cant_np > 0 && <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1 py-0.5 rounded">{rfq.cant_np} NP{rfq.cant_np > 1 ? 's' : ''}</span>}
        {rfq.eau && <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1 py-0.5 rounded">EAU: {rfq.eau}</span>}
        {rfq.alcance_general && <span className="text-[9px] text-slate-600 uppercase">{rfq.alcance_general}</span>}
      </div>

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

      <SLABar rfq={rfq} />

      {slaOver && (
        <div className="mt-1.5 flex items-center gap-1 text-red-400">
          <AlertTriangle size={9} />
          <span className="text-[8px] font-black uppercase tracking-wider">SLA VENCIDO +{elapsed - rfq.sla_dias}d</span>
        </div>
      )}

      {onAnalyzeRFQ && (
        <button
          onClick={e => { e.stopPropagation(); onAnalyzeRFQ(); }}
          className="mt-2 w-full hidden group-hover:flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-[9px] font-black uppercase tracking-wider hover:bg-mcvill-accent/25 transition-all"
        >
          <BrainCircuit size={10} /> Analizar IA
        </button>
      )}
    </div>
  );
};

// ─── ClienteCombobox ──────────────────────────────────────────────────────────

const ClienteCombobox = ({
  value, onChange, clients, onNewClient,
}: {
  value: string;
  onChange: (v: string) => void;
  clients: string[];
  onNewClient: (name: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [addNew, setAddNew] = useState(false);
  const [newName, setNewName] = useState('');

  const filtered = useMemo(() => {
    const q = value.toLowerCase();
    return q ? clients.filter(c => c.toLowerCase().includes(q)) : clients;
  }, [clients, value]);

  const confirmAdd = () => {
    if (!newName.trim()) return;
    onNewClient(newName.trim());
    onChange(newName.trim());
    setAddNew(false);
    setNewName('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-1">
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setAddNew(false); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); setAddNew(false); }, 200)}
          placeholder="CAT, WABTEC, JABIL…"
          title="Cliente — selecciona de la lista o escribe uno nuevo"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
        />
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); setAddNew(v => !v); setOpen(false); }}
          title="Agregar nuevo cliente"
          className="px-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-colors shrink-0"
        >
          <Plus size={12} />
        </button>
      </div>

      {open && filtered.length > 0 && !addNew && (
        <div className="absolute top-full left-0 right-10 z-[60] mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-44 overflow-y-auto custom-scrollbar">
          {filtered.map(c => (
            <button key={c} type="button" onMouseDown={() => { onChange(c); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              {c}
            </button>
          ))}
        </div>
      )}

      {addNew && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-slate-900 border border-emerald-500/40 rounded-lg shadow-xl p-3">
          <p className="text-[9px] text-emerald-400 uppercase tracking-wider font-black mb-2">Nuevo Cliente</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') setAddNew(false); }}
              placeholder="Nombre del cliente…"
              autoFocus
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
            <button type="button" onClick={confirmAdd} disabled={!newName.trim()}
              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-black disabled:opacity-40 flex items-center gap-1">
              <Check size={11} /> OK
            </button>
            <button type="button" onClick={() => setAddNew(false)} className="p-1 text-slate-500 hover:text-white">
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PMAdminModal ─────────────────────────────────────────────────────────────

const PMAdminModal = ({
  tenantId, onClose, onPMsChanged,
}: { tenantId: string; onClose: () => void; onPMsChanged: (pms: string[]) => void }) => {
  const [pms, setPMs] = useState<string[]>(loadLS(PM_KEY(tenantId), DEFAULT_PMS));
  const [newName, setNewName] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const persist = (updated: string[]) => {
    setPMs(updated);
    saveLS(PM_KEY(tenantId), updated);
    onPMsChanged(updated);
  };

  const add = () => { if (!newName.trim()) return; persist([...pms, newName.trim()]); setNewName(''); };
  const remove = (i: number) => persist(pms.filter((_, j) => j !== i));
  const commitEdit = () => {
    if (editIdx === null || !editName.trim()) return;
    const u = [...pms]; u[editIdx] = editName.trim(); persist(u); setEditIdx(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-mcvill-accent" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Gestión de PMs</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
          {pms.length === 0 && <p className="text-[9px] text-slate-600 text-center py-4 uppercase tracking-widest">Sin PMs configurados</p>}
          {pms.map((pm, i) => (
            <div key={i} className="flex items-center gap-2 group">
              {editIdx === i ? (
                <>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditIdx(null); }}
                    className="flex-1 bg-slate-900 border border-mcvill-accent/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" autoFocus />
                  <button onClick={commitEdit} className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><Check size={12} /></button>
                  <button onClick={() => setEditIdx(null)} className="p-1.5 rounded bg-white/5 text-slate-400 hover:bg-white/10"><X size={12} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs text-slate-300 py-1">{pm}</span>
                  <button onClick={() => { setEditIdx(i); setEditName(pm); }}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 transition-all"><Edit2 size={11} /></button>
                  <button onClick={() => remove(i)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all"><Trash2 size={11} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-4 border-t border-white/5">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Nombre del PM…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-mcvill-accent/50" />
          <button onClick={add} disabled={!newName.trim()}
            className="px-3 py-1.5 bg-mcvill-accent text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider disabled:opacity-40 flex items-center gap-1">
            <UserPlus size={11} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── F001Modal ────────────────────────────────────────────────────────────────

const EMPTY_FORM: NewRFQInput = {
  cliente: '', descripcion: '', contacto_cliente: '', pm_asignado: '',
  cant_np: 1, eau: '', cant_aceros: 0, cant_procesos: 0, cant_subensambles: 0, cant_hardwares: 0,
  alcance_general: '', tiene_solido_3d: false, tiene_planos_2d: true, tiene_bom: false,
  fecha_recepcion: new Date().toISOString().split('T')[0], comentario_pm: '',
  revision_np: 'NA', cant_prototipos: 'NA', metodo_empaque: 'CLIENTE', aceros_forecast: false,
};

const F001Modal = ({
  onClose, onSave, tenantId, pmList, clients, onNewClient, initialData, editId,
}: {
  onClose: () => void;
  onSave: (rfq: RFQCotizacion) => void;
  tenantId: string;
  pmList: string[];
  clients: string[];
  onNewClient: (name: string) => void;
  initialData?: Partial<NewRFQInput>;
  editId?: string;
}) => {
  const { config } = useConfig();
  const [form, setForm] = useState<NewRFQInput>({ ...EMPTY_FORM, ...initialData });
  const [saving, setSaving] = useState(false);

  const risk = calcRiskScore(form.cant_aceros, form.cant_procesos, form.cant_subensambles, form.cant_hardwares);
  const riskCfg = RISK[risk.nivel];

  const set = (k: keyof NewRFQInput, v: any) => setForm(p => ({ ...p, [k]: v }));
  const setNum = (k: keyof NewRFQInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, Math.max(0, parseInt(e.target.value) || 0));

  const handleSave = async () => {
    if (!form.cliente.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const r2 = calcRiskScore(form.cant_aceros, form.cant_procesos, form.cant_subensambles, form.cant_hardwares);
        const updates = { ...form, riesgo_score: r2.total, riesgo_nivel: r2.nivel, sla_dias: r2.sla_dias };
        await updateRFQ(editId, updates, tenantId);
        onSave({ id: editId, ...updates } as unknown as RFQCotizacion);
      } else {
        const rfq = await createRFQ(form, tenantId);
        onSave(rfq);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const IC = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors';

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
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 pt-16 pb-8 overflow-y-auto">
      <div className="bg-slate-950 border border-mcvill-accent/20 rounded-2xl w-full max-w-2xl shadow-2xl shadow-mcvill-accent/5">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 rounded-t-2xl bg-slate-950">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">{editId ? 'Editar' : 'Nueva'} Solicitud RFQ</h2>
            <p className="text-[10px] text-mcvill-accent/70 mt-0.5 tracking-widest uppercase">{`Formato PM_F001 · ${config.companyName}`}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Información de la Cotización</p>

            <div>
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Cliente *</label>
              <ClienteCombobox value={form.cliente} onChange={v => set('cliente', v)} clients={clients} onNewClient={onNewClient} />
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Descripción / Alcance</label>
              <input value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)}
                placeholder="NP + descripción breve"
                title="Descripción del trabajo: número de parte y alcance del servicio solicitado"
                className={IC} />
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Contacto Externo</label>
              <input value={form.contacto_cliente || ''} onChange={e => set('contacto_cliente', e.target.value)}
                placeholder="Nombre quien solicita el RFQ"
                title="Nombre del contacto del cliente que envía la solicitud de cotización"
                className={IC} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">PM Asignado</label>
                <select value={form.pm_asignado} onChange={e => set('pm_asignado', e.target.value)}
                  title="Project Manager responsable de coordinar y cerrar esta cotización"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50">
                  <option value="">— Seleccionar —</option>
                  {pmList.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Alcance General</label>
                <input value={form.alcance_general || ''} onChange={e => set('alcance_general', e.target.value)}
                  placeholder="PIEZA, FRAME, ENSAMBLE…"
                  title="Tipo de trabajo: PIEZA, ENSAMBLE, MAQUINADO, CORTE, PINTURA, etc."
                  className={IC} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Cant. de NPs</label>
                <input type="number" min={1} value={form.cant_np} onChange={setNum('cant_np')}
                  title="Número de part numbers (NPs) incluidos en esta solicitud"
                  className={IC + ' font-mono'} />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">EAU</label>
                <input value={form.eau || ''} onChange={e => set('eau', e.target.value)} placeholder="ej. 500"
                  title="Estimated Annual Usage — volumen anual estimado de piezas"
                  className={IC + ' font-mono'} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Revisión NP</label>
                <input value={form.revision_np || ''} onChange={e => set('revision_np', e.target.value)} placeholder="ej. NA, A, B…"
                  title="Nivel de revisión del plano (drawing revision level: NA, A, B, C…)"
                  className={IC} />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Prototipos / PPAP</label>
                <input value={form.cant_prototipos || ''} onChange={e => set('cant_prototipos', e.target.value)} placeholder="ej. NA, 5 pcs…"
                  title="Cantidad de prototipos requeridos o nivel de PPAP solicitado por el cliente"
                  className={IC} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Método de Empaque</label>
                <input value={form.metodo_empaque || ''} onChange={e => set('metodo_empaque', e.target.value)} placeholder="ej. CLIENTE, CAJA…"
                  title="Especificación de empaque requerida (CLIENTE / CAJA / TARIMA / BLISTER)"
                  className={IC} />
              </div>
              <div className="flex items-center pt-4">
                <label className="flex items-center gap-1.5 cursor-pointer group"
                  title="Marcar si el acero ya está en el forecast de compras y no requiere cotización adicional">
                  <input type="checkbox" checked={form.aceros_forecast || false} onChange={e => set('aceros_forecast', e.target.checked)}
                    className="w-3.5 h-3.5 accent-cyan-400" />
                  <span className="text-[9px] text-slate-400 group-hover:text-white transition-colors uppercase tracking-wider font-bold">Aceros en Forecast</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Fecha de Recepción</label>
              <input type="date" value={form.fecha_recepcion || ''} onChange={e => set('fecha_recepcion', e.target.value)}
                title="Fecha en que se recibió la solicitud — se usa para calcular días transcurridos vs SLA"
                className={IC} />
            </div>

            <div className="flex gap-4 pt-1">
              {(['tiene_solido_3d', 'tiene_planos_2d', 'tiene_bom'] as const).map(k => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer group"
                  title={k === 'tiene_solido_3d' ? 'Modelo sólido 3D disponible (STEP/IGES/SolidWorks)' : k === 'tiene_planos_2d' ? 'Planos 2D disponibles (PDF/DXF)' : 'BOM (Bill of Materials) disponible'}>
                  <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} className="w-3.5 h-3.5 accent-cyan-400" />
                  <span className="text-[9px] text-slate-400 group-hover:text-white transition-colors uppercase tracking-wider">
                    {k === 'tiene_solido_3d' ? '3D' : k === 'tiene_planos_2d' ? '2D' : 'BOM'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Right: Risk Matrix */}
          <div className="space-y-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Matriz de Riesgo — F001</p>
            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
              {[
                { label: 'Aceros diferentes',   k: 'cant_aceros',       hint: '≤2→1pt / >2→3pts',    tip: 'Tipos de acero distintos. ≤2 = 1pt, >2 = 3pts' },
                { label: 'Procesos requeridos', k: 'cant_procesos',     hint: '<3→1 / 3-5→2 / ≥6→3', tip: 'Procesos de manufactura. <3=1pt, 3-5=2pts, ≥6=3pts' },
                { label: 'Subensambles',        k: 'cant_subensambles', hint: '≤2→1 / 3→2 / ≥4→3',   tip: 'Subensambles/componentes secundarios. ≤2=1pt, 3=2pts, ≥4=3pts' },
                { label: 'Hardwares',           k: 'cant_hardwares',    hint: '≤2→1 / 3→2 / ≥4→3',   tip: 'Hardware (tornillería, insertos, etc.). ≤2=1pt, 3=2pts, ≥4=3pts' },
              ].map(({ label, k, hint, tip }) => (
                <div key={k}>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] text-slate-400 uppercase tracking-wider" title={tip}>{label}</label>
                    <span className="text-[8px] text-slate-600 font-mono">{hint}</span>
                  </div>
                  <input type="number" min={0} value={(form as any)[k]} onChange={setNum(k as keyof NewRFQInput)}
                    title={tip}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-cyan-500/50" />
                </div>
              ))}
            </div>

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
                    <span className={clsx('px-2 py-0.5 rounded text-[10px] font-black border', riskCfg.cls)}>{riskCfg.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <Clock size={9} className="text-cyan-400/60" />
                  <span className="text-[9px] text-cyan-400/70">SLA: {risk.sla_dias} días hábiles</span>
                  <span className="text-[8px] text-slate-600 ml-auto">Compromiso con cliente</span>
                </div>
              </div>
            </div>

            <textarea value={form.comentario_pm || ''} onChange={e => set('comentario_pm', e.target.value)}
              placeholder="Comentarios del PM…"
              title="Observaciones del Project Manager: riesgos, decisiones, consideraciones especiales"
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.cliente.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-40 transition-all">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Guardando…' : editId ? 'Actualizar RFQ' : 'Registrar RFQ'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Analytics Tab ────────────────────────────────────────────────────────────

const AnalyticsTab = ({ rfqs }: { rfqs: RFQCotizacion[] }) => {
  const total2025 = HIST_2025.reduce((a, m) => a + m.reg, 0);
  const env2025   = HIST_2025.reduce((a, m) => a + m.env, 0);
  const dec2025   = HIST_2025.reduce((a, m) => a + m.dec, 0);
  const ok2025    = HIST_2025.reduce((a, m) => a + m.ok, 0);

  const byRisk = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  rfqs.forEach(r => { if (r.riesgo_nivel in byRisk) byRisk[r.riesgo_nivel]++; });

  const slaAtRisk = rfqs.filter(r =>
    r.estado !== 'enviada' && r.estado !== 'declinada' && diasElapsed(r.fecha_recepcion) > r.sla_dias
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
      <div>
        <p className="text-[9px] font-black text-mcvill-accent/70 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-mcvill-accent animate-pulse" />
          Estado Actual — {rfqs.filter(r => r.estado !== 'declinada').length} RFQs activos
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="SLA Vencidos" value={slaAtRisk} sub="requieren atención" color={slaAtRisk > 0 ? 'text-red-400' : 'text-emerald-400'} />
          <KPI label="Riesgo HIGH"  value={byRisk.HIGH} sub="proyectos críticos" color={byRisk.HIGH > 2 ? 'text-red-400' : 'text-amber-400'} />
          <KPI label="Riesgo MEDIO" value={byRisk.MEDIUM} color="text-amber-400" />
          <KPI label="Riesgo LOW"   value={byRisk.LOW}    color="text-emerald-400" />
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest">Histórico 2025</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Fuente: Status Quotes 2026.xlsx — INFORME ANUAL</p>
          </div>
          <div className="flex gap-4 text-right">
            <div><p className="text-lg font-black font-mono text-white">{total2025}</p><p className="text-[8px] text-slate-500 uppercase">Registradas</p></div>
            <div><p className="text-lg font-black font-mono text-mcvill-accent">{env2025}</p><p className="text-[8px] text-slate-500 uppercase">Enviadas</p></div>
            <div><p className="text-lg font-black font-mono text-red-400">{dec2025}</p><p className="text-[8px] text-slate-500 uppercase">Declinadas</p></div>
            <div><p className="text-lg font-black font-mono text-emerald-400">{Math.round((ok2025 / env2025) * 100)}%</p><p className="text-[8px] text-slate-500 uppercase">En Tiempo</p></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={HIST_2025} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }} labelStyle={{ color: '#94a3b8', fontWeight: 700 }} />
            <Bar dataKey="reg" name="Registradas" fill="#4FA5FF" opacity={0.5} radius={[2, 2, 0, 0]} />
            <Bar dataKey="env" name="Enviadas"    fill="#4FA5FF" radius={[2, 2, 0, 0]} />
            <Bar dataKey="dec" name="Declinadas"  fill="#ef4444" opacity={0.6} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          {[{ c: 'bg-cyan-500/50', l: 'Registradas' }, { c: 'bg-cyan-400', l: 'Enviadas' }, { c: 'bg-red-500/60', l: 'Declinadas' }].map(({ c, l }) => (
            <div key={l} className="flex items-center gap-1"><div className={clsx('w-2 h-2 rounded-sm', c)} /><span className="text-[8px] text-slate-500">{l}</span></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Cotizaciones 2025" value={total2025} sub="total año completo" />
        <KPI label="Tasa Envío"   value={`${Math.round((env2025 / total2025) * 100)}%`} sub={`${env2025} de ${total2025}`} color="text-mcvill-accent" />
        <KPI label="Tasa Declín." value={`${Math.round((dec2025 / total2025) * 100)}%`} sub={`${dec2025} declinadas`}      color="text-red-400" />
        <KPI label="Envíos a Tiempo" value={`${Math.round((ok2025 / env2025) * 100)}%`} sub={`${ok2025} de ${env2025} enviadas`} color="text-emerald-400" />
      </div>
    </div>
  );
};

// ─── Lista RFQ Tab ────────────────────────────────────────────────────────────

const ListaRFQTab = ({
  rfqs, selected, onToggle, onToggleAll, onEdit, onDelete, onOpen,
}: {
  rfqs: RFQCotizacion[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (rfq: RFQCotizacion) => void;
  onDelete: (rfq: RFQCotizacion) => void;
  onOpen: (rfq: RFQCotizacion) => void;
}) => {
  const allSel  = rfqs.length > 0 && rfqs.every(r => selected.has(r.id));
  const someSel = rfqs.some(r => selected.has(r.id)) && !allSel;
  const cbRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cbRef.current) cbRef.current.indeterminate = someSel;
  }, [someSel]);

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-white/5 bg-slate-900/60">
              <th className="pl-4 pr-2 py-2 w-8">
                <input ref={cbRef} type="checkbox" checked={allSel} onChange={onToggleAll} className="accent-mcvill-accent" />
              </th>
              {['#', 'Cliente', 'Descripción', 'PM', 'Riesgo', 'Estado', 'Días/SLA', ''].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rfqs.map(rfq => {
              const elapsed = diasElapsed(rfq.fecha_recepcion);
              const over = rfq.estado !== 'enviada' && rfq.estado !== 'declinada' && elapsed > rfq.sla_dias;
              const col  = COLS.find(c => c.id === rfq.estado);
              return (
                <tr key={rfq.id} onClick={() => onOpen(rfq)}
                  className={clsx('border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group', selected.has(rfq.id) && 'bg-mcvill-accent/5')}>
                  <td className="pl-4 pr-2 py-2.5 w-8" onClick={e => { e.stopPropagation(); onToggle(rfq.id); }}>
                    <input type="checkbox" checked={selected.has(rfq.id)} onChange={() => onToggle(rfq.id)} className="accent-mcvill-accent" />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-mcvill-accent/70 whitespace-nowrap">#{rfq.ident || '—'}</td>
                  <td className="px-3 py-2.5 font-black text-white uppercase whitespace-nowrap">{rfq.cliente}</td>
                  <td className="px-3 py-2.5 text-slate-400 max-w-[180px]"><span className="line-clamp-1">{rfq.descripcion || '—'}</span></td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{rfq.pm_asignado || '—'}</td>
                  <td className="px-3 py-2.5"><RiskBadge nivel={rfq.riesgo_nivel} /></td>
                  <td className="px-3 py-2.5">
                    <span className={clsx('text-[9px] font-black px-1.5 py-0.5 rounded border', col?.bg || 'bg-slate-800', col?.border || 'border-white/5', 'text-white')}>
                      {col?.label || rfq.estado}
                    </span>
                  </td>
                  <td className={clsx('px-3 py-2.5 font-mono whitespace-nowrap', over ? 'text-red-400' : 'text-slate-500')}>
                    {elapsed}d / {rfq.sla_dias}d{over ? ' ⚠' : ''}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onEdit(rfq)} title="Editar" className="p-1 rounded hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 transition-colors"><Edit2 size={11} /></button>
                      <button onClick={() => onDelete(rfq)} title="Eliminar" className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rfqs.length === 0 && (
          <div className="text-center py-12 text-[9px] text-slate-600 uppercase tracking-widest">Sin RFQs registradas</div>
        )}
      </div>
    </div>
  );
};

// ─── Kanban Column ────────────────────────────────────────────────────────────

const KanbanColumn = ({
  col, cards, dragOver, onDragOver, onDrop, onDragStart, movingId, onCardClick, onAnalyzeRFQ, onEdit, onDelete,
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
  onEdit?: (rfq: RFQCotizacion) => void;
  onDelete?: (rfq: RFQCotizacion) => void;
}) => {
  const slaOverCount = cards.filter(r => r.estado !== 'enviada' && diasElapsed(r.fecha_recepcion) > r.sla_dias).length;

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}
      className={clsx('flex flex-col rounded-2xl border min-h-[400px] transition-all duration-200', col.bg, col.border,
        dragOver && 'border-mcvill-accent/50 shadow-[0_0_20px_rgba(79,165,255,0.15)] scale-[1.01]')}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className={clsx('w-2 h-2 rounded-full', col.dot)} />
          <div>
            <p className="text-[10px] font-black text-white uppercase tracking-widest">{col.label}</p>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider">{col.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {slaOverCount > 0 && <span className="text-[8px] font-black text-red-400 bg-red-500/10 border border-red-500/30 rounded px-1 py-0.5">{slaOverCount} ⚠</span>}
          <span className="text-[10px] font-black font-mono text-slate-500 bg-slate-800 rounded px-1.5 py-0.5">{cards.length}</span>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-24 text-[9px] text-slate-700 uppercase tracking-widest border border-dashed border-slate-800 rounded-xl">Arrastra aquí</div>
        )}
        {cards.map(rfq => (
          <RFQCard key={rfq.id} rfq={rfq}
            onDragStart={() => onDragStart(rfq.id)}
            isMoving={movingId === rfq.id}
            onClick={() => onCardClick(rfq)}
            onAnalyzeRFQ={onAnalyzeRFQ ? () => onAnalyzeRFQ(rfq.id) : undefined}
            onEdit={onEdit ? () => onEdit(rfq) : undefined}
            onDelete={onDelete ? () => onDelete(rfq) : undefined}
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
  const [rfqs, setRfqs]             = useState<RFQCotizacion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'kanban' | 'lista' | 'analytics'>('kanban');
  const [showF001, setShowF001]     = useState(false);
  const [selectedRFQ, setSelectedRFQ]   = useState<RFQCotizacion | null>(null);
  const [editingRFQ, setEditingRFQ]     = useState<RFQCotizacion | null>(null);
  const [dragId, setDragId]             = useState<string | null>(null);
  const [dragOverCol, setDragOverCol]   = useState<RFQEstado | null>(null);
  const [filterPM, setFilterPM]         = useState('');
  const [filterRisk, setFilterRisk]     = useState('');
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [showPMAdmin, setShowPMAdmin]   = useState(false);
  const [pmList, setPmList]             = useState<string[]>([]);
  const [extraClients, setExtraClients] = useState<string[]>([]);

  const tenantId = useTenant();
  const { config } = useConfig();
  const { moveTo, movingId } = useQuoteStatus(rfqs, setRfqs, tenantId);
  const guia = useGuiaCotizaciones();

  useEffect(() => {
    setPmList(loadLS(PM_KEY(tenantId), DEFAULT_PMS));
    setExtraClients(loadLS(CLIENT_KEY(tenantId), []));
    fetchRFQs(tenantId)
      .then(data => { setRfqs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tenantId]);

  const allClients = useMemo(() => {
    const combined = [...new Set([...rfqs.map(r => r.cliente).filter(Boolean), ...extraClients])];
    return combined.sort();
  }, [rfqs, extraClients]);

  const handleNewClient = (name: string) => {
    const updated = [...new Set([...extraClients, name])];
    setExtraClients(updated);
    saveLS(CLIENT_KEY(tenantId), updated);
  };

  const activeRfqs = rfqs.filter(r =>
    (!filterPM   || r.pm_asignado === filterPM) &&
    (!filterRisk || r.riesgo_nivel === filterRisk)
  );

  const colCards = (id: RFQEstado) => activeRfqs.filter(r => r.estado === id);

  const slaAtRisk = rfqs.filter(r => r.estado !== 'enviada' && r.estado !== 'declinada' && diasElapsed(r.fecha_recepcion) > r.sla_dias).length;
  const highRisk  = rfqs.filter(r => r.riesgo_nivel === 'HIGH' && r.estado !== 'declinada').length;
  const enviadas  = rfqs.filter(r => r.estado === 'enviada').length;
  const activos   = rfqs.filter(r => r.estado !== 'declinada').length;

  const handleDrop = (e: React.DragEvent, colId: RFQEstado) => {
    e.preventDefault();
    if (dragId) { const rfq = rfqs.find(r => r.id === dragId); if (rfq && rfq.estado !== colId) moveTo(dragId, colId); }
    setDragOverCol(null); setDragId(null);
  };

  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => {
    if (activeRfqs.every(r => selected.has(r.id))) setSelected(new Set());
    else setSelected(new Set(activeRfqs.map(r => r.id)));
  };

  const handleDeleteRFQ = async (rfq: RFQCotizacion) => {
    if (!await appConfirm(`¿Eliminar RFQ #${rfq.ident || rfq.id.slice(0, 6)} — ${rfq.cliente}?`)) return;
    try {
      await deleteRFQ(rfq.id, tenantId);
      setRfqs(prev => prev.filter(r => r.id !== rfq.id));
      toast('RFQ eliminada', 'success');
    } catch { toast('Error al eliminar', 'error'); }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selected].map(id => deleteRFQ(id, tenantId)));
      setRfqs(prev => prev.filter(r => !selected.has(r.id)));
      toast(`${selected.size} RFQs eliminadas`, 'success');
      setSelected(new Set()); setBulkDeletePending(false);
    } catch { toast('Error al eliminar', 'error'); }
  };

  const openEdit = (rfq: RFQCotizacion) => setEditingRFQ(rfq);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={20} className="animate-spin text-mcvill-accent" />
    </div>
  );

  const TabBtn = ({ id, icon: Icon, label, active }: { id: typeof tab; icon: React.ElementType; label: string; active: boolean }) => (
    <button onClick={() => setTab(id)}
      className={clsx('px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
        active ? 'bg-mcvill-accent text-slate-950 shadow-lg shadow-mcvill-accent/20 border-transparent' : 'border-white/10 text-slate-500 hover:text-white')}>
      <Icon size={12} className="inline mr-1" />{label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
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
        <div className="flex items-center gap-2 flex-wrap">
          <TabBtn id="kanban"    icon={KanbanSquare} label="Kanban"   active={tab === 'kanban'} />
          <TabBtn id="lista"     icon={List}         label="Lista"    active={tab === 'lista'} />
          <TabBtn id="analytics" icon={BarChart2}    label="Analítica" active={tab === 'analytics'} />
          <button onClick={() => setShowPMAdmin(true)} title="Gestionar PMs"
            className="px-3 py-1.5 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:border-white/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5">
            <Users size={12} /> PMs
          </button>
          <button onClick={guia.abrir}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-[10px] font-black uppercase tracking-widest transition-all">
            <BookOpen size={12} />Guía
          </button>
          <button onClick={() => setShowF001(true)}
            className="mcvill-btn-create flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20">
            <Plus size={12} strokeWidth={3} />Nueva RFQ
          </button>
          <PrintButton />
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Activity,      label: 'RFQs Activos', value: activos,   color: 'text-mcvill-accent' },
          { icon: AlertTriangle, label: 'SLA Vencidos', value: slaAtRisk, color: slaAtRisk > 0 ? 'text-red-400' : 'text-emerald-400' },
          { icon: TrendingUp,    label: 'Riesgo HIGH',  value: highRisk,  color: highRisk > 2 ? 'text-red-400' : 'text-amber-400' },
          { icon: Send,          label: 'Enviadas',     value: enviadas,  color: 'text-emerald-400' },
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

      {/* Filters */}
      {(tab === 'kanban' || tab === 'lista') && (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterPM} onChange={e => setFilterPM(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500/50">
            <option value="">Todos los PMs</option>
            {pmList.map(pm => <option key={pm} value={pm}>{pm}</option>)}
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500/50">
            <option value="">Todos los riesgos</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIO</option>
            <option value="HIGH">HIGH</option>
          </select>
          {(filterPM || filterRisk) && (
            <button onClick={() => { setFilterPM(''); setFilterRisk(''); }}
              className="text-[9px] text-slate-500 hover:text-white px-2 py-1.5 border border-slate-700 rounded-lg transition-colors">
              Limpiar filtros
            </button>
          )}
          <span className="text-[9px] text-slate-600 ml-auto">{activeRfqs.length} RFQs</span>
        </div>
      )}

      {/* Bulk delete bar */}
      {tab === 'lista' && selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          <span className="text-[10px] text-rose-400 font-black">{selected.size} RFQ{selected.size > 1 ? 's' : ''} seleccionada{selected.size > 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())}
              className="px-3 py-1 text-[9px] text-slate-400 border border-white/10 rounded-lg hover:text-white transition-colors">Cancelar</button>
            {!bulkDeletePending ? (
              <button onClick={() => setBulkDeletePending(true)}
                className="px-3 py-1 text-[9px] font-black text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors flex items-center gap-1">
                <Trash2 size={10} /> Eliminar selección
              </button>
            ) : (
              <div className="flex gap-1">
                <button onClick={handleBulkDelete}
                  className="px-3 py-1 text-[9px] font-black text-white bg-rose-600 rounded-lg hover:bg-rose-500 flex items-center gap-1">
                  <Check size={10} /> Confirmar
                </button>
                <button onClick={() => setBulkDeletePending(false)}
                  className="px-3 py-1 text-[9px] text-slate-400 border border-white/10 rounded-lg hover:text-white">Cancelar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {tab === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLS.map(col => (
            <KanbanColumn key={col.id} col={col} cards={colCards(col.id)}
              dragOver={dragOverCol === col.id}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
              onDrop={e => handleDrop(e, col.id)}
              onDragStart={id => setDragId(id)}
              movingId={movingId}
              onCardClick={rfq => setSelectedRFQ(rfq)}
              onAnalyzeRFQ={onAnalyzeRFQ}
              onEdit={openEdit}
              onDelete={handleDeleteRFQ}
            />
          ))}
        </div>
      ) : tab === 'lista' ? (
        <ListaRFQTab
          rfqs={activeRfqs}
          selected={selected}
          onToggle={toggleSelect}
          onToggleAll={toggleAll}
          onEdit={openEdit}
          onDelete={handleDeleteRFQ}
          onOpen={rfq => setSelectedRFQ(rfq)}
        />
      ) : (
        <AnalyticsTab rfqs={rfqs} />
      )}

      {/* Modals */}
      {guia.visible && <CotizacionesGuiaModal onClose={guia.cerrar} />}

      {showPMAdmin && (
        <PMAdminModal tenantId={tenantId} onClose={() => setShowPMAdmin(false)} onPMsChanged={setPmList} />
      )}

      {showF001 && (
        <F001Modal
          onClose={() => setShowF001(false)}
          onSave={rfq => { setRfqs(p => [rfq, ...p]); setShowF001(false); toast('RFQ registrada', 'success'); }}
          tenantId={tenantId}
          pmList={pmList}
          clients={allClients}
          onNewClient={handleNewClient}
        />
      )}

      {editingRFQ && (
        <F001Modal
          onClose={() => setEditingRFQ(null)}
          onSave={updates => {
            setRfqs(prev => prev.map(r => r.id === editingRFQ.id ? { ...r, ...updates } : r));
            setEditingRFQ(null);
            toast('RFQ actualizada', 'success');
          }}
          tenantId={tenantId}
          pmList={pmList}
          clients={allClients}
          onNewClient={handleNewClient}
          initialData={editingRFQ as unknown as Partial<NewRFQInput>}
          editId={editingRFQ.id}
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
