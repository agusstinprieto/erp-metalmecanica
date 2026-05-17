import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, ChevronRight, ChevronLeft, AlertTriangle,
  CheckCircle2, Clock, BookOpen, Edit3, Trash2, Save, X,
  ShieldCheck, Wrench, Eye, Search, Filter, ArrowUp, ArrowDown,
  AlertCircle, CheckSquare, Square, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import {
  fetchWIs, fetchPasos, createWI, updateWI, deleteWI,
  createPaso, updatePaso, deletePaso,
  OPERACIONES,
  type WorkInstruction, type WIPaso, type WIEstado, type NewWIInput, type NewPasoInput
} from '../services/wiService';

// ── Badges ────────────────────────────────────────────────────────────────────
const EstadoBadge = ({ estado }: { estado: WIEstado }) => {
  const map: Record<WIEstado, string> = {
    activa:   'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    borrador: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    obsoleta: 'bg-slate-500/15 text-slate-400 border-slate-600/30',
  };
  return <span className={clsx('px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider', map[estado])}>{estado}</span>;
};

const OpBadge = ({ op }: { op?: string }) => {
  const colors: Record<string, string> = {
    CORTE:         'bg-blue-500/15 text-blue-300 border-blue-400/30',
    SOLDADURA:     'bg-orange-500/15 text-orange-300 border-orange-400/30',
    MAQUINADO:     'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
    ENSAMBLE:      'bg-purple-500/15 text-purple-300 border-purple-400/30',
    PINTURA:       'bg-pink-500/15 text-pink-300 border-pink-400/30',
    DOBLADO:       'bg-teal-500/15 text-teal-300 border-teal-400/30',
    TRATAMIENTO:   'bg-rose-500/15 text-rose-300 border-rose-400/30',
    INSPECCION:    'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  };
  return <span className={clsx('px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase', colors[op || ''] || 'bg-white/5 text-slate-400 border-white/10')}>{op || '—'}</span>;
};

// ── WI Card ───────────────────────────────────────────────────────────────────
const WICard = ({ wi, selected, onClick }: { wi: WorkInstruction; selected: boolean; onClick: () => void }) => (
  <div
    onClick={onClick}
    className={clsx(
      'p-3 rounded-xl border cursor-pointer transition-all duration-200',
      selected
        ? 'bg-mcvill-accent/15 border-mcvill-accent/40'
        : 'bg-white/2 border-white/8 hover:bg-white/5 hover:border-white/15'
    )}
  >
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono text-mcvill-accent/70">{wi.wi_numero} Rev.{wi.revision}</p>
        <p className="text-xs font-bold text-mcvill-text truncate mt-0.5">{wi.nombre}</p>
      </div>
      <EstadoBadge estado={wi.estado} />
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <OpBadge op={wi.operacion} />
      {wi.numero_parte && <span className="text-[10px] text-slate-500 font-mono">{wi.numero_parte}</span>}
      {wi.tiempo_ciclo_min && (
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Clock size={9} />{wi.tiempo_ciclo_min}min
        </span>
      )}
    </div>
  </div>
);

// ── Paso visor ────────────────────────────────────────────────────────────────
const PasoCard = ({
  paso, index, total, editMode, onUpdate, onDelete, onMoveUp, onMoveDown
}: {
  paso: WIPaso; index: number; total: number;
  editMode: boolean;
  onUpdate: (id: string, updates: Partial<WIPaso>) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ titulo: paso.titulo, instruccion: paso.instruccion, herramienta: paso.herramienta || '', advertencia: paso.advertencia || '', punto_control: paso.punto_control });

  const handleSave = () => {
    onUpdate(paso.id, draft);
    setEditing(false);
  };

  return (
    <div className={clsx(
      'rounded-xl border transition-all',
      paso.punto_control
        ? 'bg-amber-500/5 border-amber-400/25'
        : 'bg-white/3 border-white/8'
    )}>
      <div className="flex items-start gap-3 p-4">
        {/* Step number */}
        <div className={clsx(
          'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black border',
          paso.punto_control
            ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
            : 'bg-mcvill-accent/15 border-mcvill-accent/30 text-mcvill-accent'
        )}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-mcvill-accent/50"
                placeholder="Título del paso" />
              <textarea value={draft.instruccion} onChange={e => setDraft(d => ({ ...d, instruccion: e.target.value }))}
                rows={3}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-mcvill-accent/50 resize-none"
                placeholder="Instrucción detallada..." />
              <input value={draft.herramienta} onChange={e => setDraft(d => ({ ...d, herramienta: e.target.value }))}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-mcvill-accent/50"
                placeholder="Herramienta / equipo" />
              <input value={draft.advertencia} onChange={e => setDraft(d => ({ ...d, advertencia: e.target.value }))}
                className="w-full bg-rose-500/10 border border-rose-400/20 rounded-lg px-3 py-1.5 text-xs text-rose-300 placeholder-rose-400/40 outline-none"
                placeholder="⚠ Advertencia de seguridad (opcional)" />
              <label className="flex items-center gap-2 cursor-pointer">
                <button onClick={() => setDraft(d => ({ ...d, punto_control: !d.punto_control }))}
                  className="text-amber-400">
                  {draft.punto_control ? <CheckSquare size={15} /> : <Square size={15} />}
                </button>
                <span className="text-xs text-slate-400">Punto de control (verificación obligatoria)</span>
              </label>
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-xs font-bold hover:bg-mcvill-accent/25 transition-all">
                  <Save size={12} /> Guardar
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:bg-white/10 transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-mcvill-text">{paso.titulo}</p>
                {paso.punto_control && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-lg px-2 py-0.5">
                    <AlertCircle size={9} /> PUNTO DE CONTROL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{paso.instruccion}</p>
              {paso.herramienta && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Wrench size={11} className="text-slate-500" />
                  <span className="text-[11px] text-slate-400">{paso.herramienta}</span>
                </div>
              )}
              {paso.advertencia && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-400/20">
                  <AlertTriangle size={12} className="text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-rose-300">{paso.advertencia}</span>
                </div>
              )}
            </>
          )}
        </div>

        {editMode && !editing && (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-mcvill-accent hover:bg-mcvill-accent/10 transition-all"><Edit3 size={11} /></button>
            <button onClick={onMoveUp} disabled={index === 0} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"><ArrowUp size={11} /></button>
            <button onClick={onMoveDown} disabled={index === total - 1} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all"><ArrowDown size={11} /></button>
            <button onClick={() => onDelete(paso.id)} className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-400/20 text-rose-400 hover:bg-rose-500/20 transition-all"><Trash2 size={11} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── WI Form (create) ──────────────────────────────────────────────────────────
const WIForm = ({ onSave, onCancel }: { onSave: (input: NewWIInput) => void; onCancel: () => void }) => {
  const [form, setForm] = useState<NewWIInput>({ wi_numero: '', nombre: '', operacion: '', numero_parte: '', tiempo_ciclo_min: undefined });
  const set = (k: keyof NewWIInput, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="bg-mcvill-accent/5 border border-mcvill-accent/20 rounded-2xl p-5 space-y-3">
      <p className="text-xs font-bold text-mcvill-accent uppercase tracking-widest mb-3">Nueva Instrucción de Trabajo</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Número WI *</label>
          <input value={form.wi_numero} onChange={e => set('wi_numero', e.target.value)} placeholder="WI-2026-007"
            className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-mcvill-accent/50" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Operación</label>
          <select value={form.operacion} onChange={e => set('operacion', e.target.value)}
            className="mt-1 w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-mcvill-accent/50">
            <option value="">Seleccionar...</option>
            {OPERACIONES.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-slate-400 uppercase tracking-wider">Nombre / Título *</label>
        <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Descripción del proceso"
          className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-mcvill-accent/50" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Número de Parte</label>
          <input value={form.numero_parte} onChange={e => set('numero_parte', e.target.value)} placeholder="NP-XXXX o VARIOS"
            className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-mcvill-accent/50" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Tiempo ciclo (min)</label>
          <input type="number" value={form.tiempo_ciclo_min || ''} onChange={e => set('tiempo_ciclo_min', Number(e.target.value))}
            className="mt-1 w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-mcvill-accent/50" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => form.wi_numero && form.nombre && onSave(form)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mcvill-accent/20 border border-mcvill-accent/40 text-mcvill-accent text-xs font-bold hover:bg-mcvill-accent/30 transition-all">
          <Save size={13} /> Crear WI
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs hover:bg-white/10 transition-all">Cancelar</button>
      </div>
    </div>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────
type Tab = 'lista' | 'visor';

export function WorkInstructionsView() {
  const [wis, setWis] = useState<WorkInstruction[]>([]);
  const [pasos, setPasos] = useState<WIPaso[]>([]);
  const [selected, setSelected] = useState<WorkInstruction | null>(null);
  const [tab, setTab] = useState<Tab>('lista');
  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState('');
  const [filterEstado, setFilterEstado] = useState<WIEstado | ''>('');
  const [loading, setLoading] = useState(true);
  const [loadingPasos, setLoadingPasos] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddPaso, setShowAddPaso] = useState(false);
  const [newPaso, setNewPaso] = useState<Partial<NewPasoInput>>({ titulo: '', instruccion: '', herramienta: '', advertencia: '', punto_control: false });

  useEffect(() => {
    fetchWIs().then(data => { setWis(data); setLoading(false); }).catch(() => { setLoading(false); setLoadError('Error al cargar datos.'); });
  }, []);

  const selectWI = useCallback((wi: WorkInstruction) => {
    setSelected(wi);
    setTab('visor');
    setEditMode(false);
    setLoadingPasos(true);
    fetchPasos(wi.id).then(data => { setPasos(data); setLoadingPasos(false); }).catch(() => { setLoadingPasos(false); setLoadError('Error al cargar datos.'); });
  }, []);

  const handleCreateWI = useCallback(async (input: NewWIInput) => {
    const wi = await createWI(input);
    setWis(prev => [wi, ...prev]);
    setShowForm(false);
    selectWI(wi);
  }, [selectWI]);

  const handleUpdateWI = useCallback(async (updates: Partial<WorkInstruction>) => {
    if (!selected) return;
    await updateWI(selected.id, updates);
    setSelected(prev => prev ? { ...prev, ...updates } : prev);
    setWis(prev => prev.map(w => w.id === selected.id ? { ...w, ...updates } : w));
  }, [selected]);

  const handleDeleteWI = useCallback(async (id: string) => {
    await deleteWI(id);
    setWis(prev => prev.filter(w => w.id !== id));
    setSelected(null);
    setTab('lista');
  }, []);

  const handleUpdatePaso = useCallback(async (id: string, updates: Partial<WIPaso>) => {
    await updatePaso(id, updates);
    setPasos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const handleDeletePaso = useCallback(async (id: string) => {
    await deletePaso(id);
    setPasos(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleMovePaso = useCallback(async (index: number, dir: 'up' | 'down') => {
    const newPasos = [...pasos];
    const swap = dir === 'up' ? index - 1 : index + 1;
    [newPasos[index], newPasos[swap]] = [newPasos[swap], newPasos[index]];
    const updated = newPasos.map((p, i) => ({ ...p, orden: i + 1 }));
    setPasos(updated);
    await Promise.all(updated.map(p => updatePaso(p.id, { orden: p.orden })));
  }, [pasos]);

  const handleAddPaso = useCallback(async () => {
    if (!selected || !newPaso.titulo || !newPaso.instruccion) return;
    const paso = await createPaso({
      wi_id: selected.id,
      orden: pasos.length + 1,
      titulo: newPaso.titulo!,
      instruccion: newPaso.instruccion!,
      herramienta: newPaso.herramienta,
      advertencia: newPaso.advertencia,
      punto_control: newPaso.punto_control ?? false,
    });
    setPasos(prev => [...prev, paso]);
    setNewPaso({ titulo: '', instruccion: '', herramienta: '', advertencia: '', punto_control: false });
    setShowAddPaso(false);
  }, [selected, pasos, newPaso]);

  const filtered = wis.filter(w => {
    const q = search.toLowerCase();
    const matchQ = !q || w.nombre.toLowerCase().includes(q) || w.wi_numero.toLowerCase().includes(q) || (w.numero_parte || '').toLowerCase().includes(q);
    const matchOp = !filterOp || w.operacion === filterOp;
    const matchEst = !filterEstado || w.estado === filterEstado;
    return matchQ && matchOp && matchEst;
  });

  const puntosControl = pasos.filter(p => p.punto_control).length;

  return (
    <div className="flex h-full bg-mcvill-bg text-mcvill-text overflow-hidden flex-col">
      {loadError && <div className="mx-4 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-bold">{loadError}</div>}
      <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar lista ── */}
      <div className={clsx(
        'flex flex-col border-r border-mcvill-accent/20 bg-mcvill-bg transition-all duration-300',
        tab === 'visor' ? 'w-0 lg:w-72 overflow-hidden' : 'w-full lg:w-72'
      )}>
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-mcvill-accent/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-mcvill-accent" />
              <span className="text-sm font-black text-mcvill-text uppercase tracking-wider">WI — Instrucciones</span>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-xs font-bold hover:bg-mcvill-accent/25 transition-all">
              <Plus size={13} /> Nueva
            </button>
          </div>
          {/* Search */}
          <div className="relative mb-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar WI..."
              className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-mcvill-accent/40" />
          </div>
          {/* Filters */}
          <div className="flex gap-1.5">
            <select value={filterOp} onChange={e => setFilterOp(e.target.value)}
              className="flex-1 bg-slate-900/60 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none">
              <option value="">Todas operaciones</option>
              {OPERACIONES.map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value as WIEstado | '')}
              className="flex-1 bg-slate-900/60 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-300 outline-none">
              <option value="">Todos estados</option>
              <option value="activa">Activa</option>
              <option value="borrador">Borrador</option>
              <option value="obsoleta">Obsoleta</option>
            </select>
          </div>
        </div>

        {/* WI list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {showForm && <WIForm onSave={handleCreateWI} onCancel={() => setShowForm(false)} />}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw size={20} className="text-mcvill-accent animate-spin" role="status" aria-label="Cargando" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">Sin resultados</div>
          ) : filtered.map(wi => (
            <WICard key={wi.id} wi={wi} selected={selected?.id === wi.id} onClick={() => selectWI(wi)} />
          ))}
        </div>

        {/* Stats bar */}
        <div className="shrink-0 px-4 py-2 border-t border-white/5 flex gap-4 text-[10px] text-slate-500">
          <span>{filtered.length} WIs</span>
          <span className="text-emerald-400">{wis.filter(w => w.estado === 'activa').length} activas</span>
          <span className="text-amber-400">{wis.filter(w => w.estado === 'borrador').length} borrador</span>
        </div>
      </div>

      {/* ── Detail / Visor ── */}
      <div className={clsx('flex-1 flex flex-col overflow-hidden', tab === 'lista' && 'hidden lg:flex')}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center">
              <BookOpen size={28} className="text-mcvill-accent/40" />
            </div>
            <p className="text-slate-400 font-bold">Selecciona una Instrucción de Trabajo</p>
            <p className="text-sm text-slate-600">Elige una WI de la lista para ver sus pasos detallados o editarla.</p>
          </div>
        ) : (
          <>
            {/* WI Header */}
            <div className="shrink-0 px-5 py-4 border-b border-mcvill-accent/20 bg-mcvill-bg/95 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setTab('lista')} className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                    <ChevronLeft size={15} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-mcvill-accent/70">{selected.wi_numero}</span>
                      <span className="text-[10px] text-slate-500">Rev.{selected.revision}</span>
                      <EstadoBadge estado={selected.estado} />
                      <OpBadge op={selected.operacion} />
                    </div>
                    <h2 className="text-base font-black text-mcvill-text mt-0.5">{selected.nombre}</h2>
                    {selected.numero_parte && <p className="text-xs text-slate-500 mt-0.5">NP: {selected.numero_parte}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selected.tiempo_ciclo_min && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                      <Clock size={13} className="text-slate-400" />
                      <span className="text-xs text-slate-300 font-bold">{selected.tiempo_ciclo_min} min</span>
                    </div>
                  )}
                  {puntosControl > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/20">
                      <ShieldCheck size={13} className="text-amber-400" />
                      <span className="text-xs text-amber-300 font-bold">{puntosControl} controles</span>
                    </div>
                  )}
                  <button
                    onClick={() => setEditMode(e => !e)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                      editMode
                        ? 'bg-mcvill-accent/20 border-mcvill-accent/40 text-mcvill-accent'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    )}
                  >
                    <Edit3 size={13} /> {editMode ? 'Editando' : 'Editar'}
                  </button>
                  {editMode && (
                    <button onClick={() => handleDeleteWI(selected.id)}
                      className="p-1.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-400 hover:bg-rose-500/20 transition-all">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Edit estado / aprobado */}
              {editMode && (
                <div className="flex gap-3 mt-3 flex-wrap">
                  <select value={selected.estado} onChange={e => handleUpdateWI({ estado: e.target.value as WIEstado })}
                    className="bg-slate-900/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none">
                    <option value="borrador">Borrador</option>
                    <option value="activa">Activa</option>
                    <option value="obsoleta">Obsoleta</option>
                  </select>
                  <input
                    defaultValue={selected.aprobado_por || ''}
                    onBlur={e => handleUpdateWI({ aprobado_por: e.target.value })}
                    placeholder="Aprobado por..."
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-mcvill-accent/40"
                  />
                </div>
              )}
            </div>

            {/* Pasos */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {loadingPasos ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={20} className="text-mcvill-accent animate-spin" role="status" aria-label="Cargando" />
                </div>
              ) : (
                <div className="space-y-3 max-w-3xl mx-auto">
                  {pasos.length === 0 && !editMode && (
                    <div className="text-center py-10 text-slate-500">
                      <ClipboardList size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Sin pasos. Activa el modo edición para añadir instrucciones.</p>
                    </div>
                  )}

                  {pasos.map((paso, i) => (
                    <PasoCard
                      key={paso.id}
                      paso={paso}
                      index={i}
                      total={pasos.length}
                      editMode={editMode}
                      onUpdate={handleUpdatePaso}
                      onDelete={handleDeletePaso}
                      onMoveUp={() => handleMovePaso(i, 'up')}
                      onMoveDown={() => handleMovePaso(i, 'down')}
                    />
                  ))}

                  {/* Add paso */}
                  {editMode && (
                    showAddPaso ? (
                      <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nuevo paso #{pasos.length + 1}</p>
                        <input value={newPaso.titulo || ''} onChange={e => setNewPaso(p => ({ ...p, titulo: e.target.value }))}
                          placeholder="Título del paso *"
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-mcvill-accent/50" />
                        <textarea value={newPaso.instruccion || ''} onChange={e => setNewPaso(p => ({ ...p, instruccion: e.target.value }))}
                          rows={3} placeholder="Instrucción detallada *"
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-mcvill-accent/50 resize-none" />
                        <input value={newPaso.herramienta || ''} onChange={e => setNewPaso(p => ({ ...p, herramienta: e.target.value }))}
                          placeholder="Herramienta / equipo"
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-mcvill-accent/50" />
                        <input value={newPaso.advertencia || ''} onChange={e => setNewPaso(p => ({ ...p, advertencia: e.target.value }))}
                          placeholder="⚠ Advertencia de seguridad (opcional)"
                          className="w-full bg-rose-500/5 border border-rose-400/15 rounded-lg px-3 py-2 text-xs text-rose-300 placeholder-rose-400/40 outline-none" />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <button onClick={() => setNewPaso(p => ({ ...p, punto_control: !p.punto_control }))} className="text-amber-400">
                            {newPaso.punto_control ? <CheckSquare size={15} /> : <Square size={15} />}
                          </button>
                          <span className="text-xs text-slate-400">Punto de control</span>
                        </label>
                        <div className="flex gap-2">
                          <button onClick={handleAddPaso} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mcvill-accent/15 border border-mcvill-accent/30 text-mcvill-accent text-xs font-bold hover:bg-mcvill-accent/25 transition-all">
                            <Plus size={12} /> Agregar paso
                          </button>
                          <button onClick={() => setShowAddPaso(false)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:bg-white/10 transition-all">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddPaso(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 text-slate-500 text-xs hover:border-mcvill-accent/30 hover:text-mcvill-accent transition-all">
                        <Plus size={14} /> Agregar paso
                      </button>
                    )
                  )}

                  {/* Summary footer */}
                  {pasos.length > 0 && (
                    <div className="mt-4 p-4 bg-white/3 border border-white/8 rounded-xl flex flex-wrap gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" />{pasos.length} pasos totales</span>
                      <span className="flex items-center gap-1.5"><AlertCircle size={13} className="text-amber-400" />{puntosControl} puntos de control</span>
                      {selected.tiempo_ciclo_min && <span className="flex items-center gap-1.5"><Clock size={13} className="text-mcvill-accent" />Tiempo ciclo: {selected.tiempo_ciclo_min} min</span>}
                      {selected.aprobado_por && <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-slate-400" />Aprobado: {selected.aprobado_por}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default WorkInstructionsView;
