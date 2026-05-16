import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Building2, ClipboardList,
  Plus, Pencil, Trash2, Save, X, Loader2,
  AlertCircle, Search, ChevronRight,
  CheckCircle2, Clock, XCircle, Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ImportDataModal, IMPORT_CONFIGS } from './ImportDataModal';
import { useTenant } from '../hooks/useTenant';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'maquinas' | 'edificio' | 'ordenes';

interface Maquina {
  id?: string;
  codigo: string;
  nombre: string;
  modelo?: string;
  fabricante?: string;
  numero_serie?: string;
  ubicacion?: string;
  area?: string;
  fecha_adquisicion?: string;
  horas_uso?: number;
  ultimo_mantenimiento?: string;
  proximo_mantenimiento?: string;
  frecuencia_mant_dias?: number;
  estado?: string;
  notas?: string;
  activo?: boolean;
}

interface Edificio {
  id?: string;
  nombre: string;
  tipo?: string;
  ubicacion?: string;
  area_m2?: number;
  responsable?: string;
  ultimo_mantenimiento?: string;
  proximo_mantenimiento?: string;
  frecuencia_mant_dias?: number;
  estado?: string;
  notas?: string;
  activo?: boolean;
}

interface OrdenMant {
  id?: string;
  numero_orden?: string;
  tipo_activo: string;
  activo_id?: string;
  activo_nombre?: string;
  tipo_mantenimiento?: string;
  prioridad?: string;
  descripcion: string;
  tecnico_asignado?: string;
  fecha_programada?: string;
  fecha_realizada?: string;
  duracion_horas?: number;
  estado?: string;
  costo_estimado?: number;
  costo_real?: number;
  observaciones?: string;
}

// ─── Tab config ─────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'maquinas', label: 'Máquinas',          icon: Wrench,        color: 'brand'  },
  { id: 'edificio', label: 'Edificio',           icon: Building2,     color: 'amber'  },
  { id: 'ordenes',  label: 'Órdenes de Trabajo', icon: ClipboardList, color: 'brand'  },
];

const COLOR: Record<string, string> = {
  brand:  'text-mcvill-accent border-mcvill-accent/30 bg-mcvill-accent/10',
  amber:  'text-amber-400  border-amber-500/30  bg-amber-500/10',
};

// ─── Status badges ──────────────────────────────────────────────────────────────

const ESTADO_MAQUINA: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  operativa:        { label: 'Operativa',        cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  en_mantenimiento: { label: 'En mantenimiento', cls: 'bg-amber-500/10  text-amber-400  border-amber-500/20',    icon: Wrench },
  fuera_servicio:   { label: 'Fuera de servicio',cls: 'bg-rose-500/10   text-rose-400   border-rose-500/20',     icon: XCircle },
};

const ESTADO_EDIFICIO: Record<string, { label: string; cls: string }> = {
  bueno:             { label: 'Bueno',             cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  regular:           { label: 'Regular',           cls: 'bg-yellow-500/10  text-yellow-400  border-yellow-500/20' },
  requiere_atencion: { label: 'Requiere atención', cls: 'bg-amber-500/10   text-amber-400   border-amber-500/20'  },
  critico:           { label: 'Crítico',           cls: 'bg-rose-500/10    text-rose-400    border-rose-500/20'   },
};

const PRIORIDAD_CLS: Record<string, string> = {
  baja:    'bg-slate-700/50 text-slate-400 border-white/5',
  media:   'bg-mcvill-accent/10  text-mcvill-accent  border-mcvill-accent/20',
  alta:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  critica: 'bg-rose-500/10  text-rose-400  border-rose-500/20',
};

const ESTADO_ORDEN: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-slate-700/50   text-slate-400  border-white/5',          icon: Clock },
  en_proceso: { label: 'En proceso', cls: 'bg-mcvill-accent/10    text-mcvill-accent   border-mcvill-accent/20',       icon: Wrench },
  completada: { label: 'Completada', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',   icon: CheckCircle2 },
  cancelada:  { label: 'Cancelada',  cls: 'bg-rose-500/10    text-rose-400   border-rose-500/20',       icon: XCircle },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm font-mono text-white focus:outline-none focus:border-mcvill-accent/50 transition-all';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{label}</label>
    {children}
  </div>
);

const Sel: React.FC<{ value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className={inputCls + ' mt-1'}>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

function isVencido(fecha?: string) {
  if (!fecha) return false;
  return new Date(fecha) < new Date();
}

function isProximo(fecha?: string, dias = 15) {
  if (!fecha) return false;
  const diff = (new Date(fecha).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= dias;
}

function nextOrden(n: number) {
  return `OT-${new Date().getFullYear()}-${String(n + 1).padStart(4, '0')}`;
}

// ─── Main component ─────────────────────────────────────────────────────────────

export const MantenimientoPanel: React.FC = () => {
  const [tab, setTab] = useState<TabId>('maquinas');
  const tenantId = useTenant();

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header Section — Compact Industrial Style */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Wrench className="text-blue-500" size={20} />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tighter uppercase">
              CONTROL DE <span className="text-mcvill-accent">MANTENIMIENTO</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              Gestión de Activos <span className="hidden sm:inline px-1.5 py-0.5 rounded-lg bg-mcvill-accent/10 border border-mcvill-accent/30 text-[8px]">MTTO-PRO</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar — Compact */}
      <div className="px-4 pt-1 flex items-end gap-1 border-b border-white/5 bg-slate-900/20 shrink-0">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = t.id === tab;
          const cls = COLOR[t.color];
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-t-xl border-x border-t text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive
                  ? `bg-slate-900 border-white/10 ${cls.split(' ')[0]} border-b-slate-900`
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={12} />{t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }} className="h-full overflow-y-auto custom-scrollbar">
            {tab === 'maquinas' && <MaquinasTab />}
            {tab === 'edificio' && <EdificioTab />}
            {tab === 'ordenes'  && <OrdenesTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── MÁQUINAS TAB ───────────────────────────────────────────────────────────────

const EMPTY_MAQ: Maquina = { codigo: '', nombre: '', modelo: '', fabricante: '', numero_serie: '', ubicacion: '', area: '', horas_uso: 0, frecuencia_mant_dias: 90, estado: 'operativa', notas: '', activo: true };

const MaquinasTab: React.FC = () => {
  const [rows, setRows]           = useState<Maquina[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [edit, setEdit]           = useState<Maquina | null>(null);
  const [isNew, setIsNew]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [delId, setDelId]         = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('activos_maquinas').select('*').order('codigo');
    if (e) setError(e.message); else setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    const { id, ...payload } = edit as any;
    const rec = { ...payload, tenant_id: tenantId, updated_at: new Date().toISOString() };
    const { error: e } = isNew
      ? await supabase.from('activos_maquinas').insert(rec)
      : await supabase.from('activos_maquinas').update(rec).eq('id', id);
    if (e) setError(e.message); else { setEdit(null); load(); }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    await supabase.from('activos_maquinas').delete().eq('id', delId);
    setDelId(null); load();
  };

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center gap-3">
        <Toolbar search={search} onSearch={setSearch} placeholder="Buscar máquinas..." color="brand"
          onNew={() => { setEdit({ ...EMPTY_MAQ }); setIsNew(true); }} label="Nueva Máquina" />
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all text-slate-400 border-white/10 bg-white/3 hover:text-white hover:border-white/20 shrink-0">
          <Upload size={13} /> Importar CSV
        </button>
      </div>
      {error && <ErrorBar msg={error} onClose={() => setError(null)} />}

      <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
        {loading ? <LoadingRow /> : filtered.length === 0 ? (
          <EmptyRow icon={Wrench} label="máquinas" onNew={() => { setEdit({ ...EMPTY_MAQ }); setIsNew(true); }} color="blue" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <THead cols={['Código', 'Nombre', 'Modelo / Fab.', 'Ubicación', 'Horas Uso', 'Próx. Mant.', 'Estado', '']} />
              <tbody>
                {filtered.map((r, i) => {
                  const est = ESTADO_MAQUINA[r.estado || 'operativa'] || ESTADO_MAQUINA.operativa;
                  const vencido = isVencido(r.proximo_mantenimiento);
                  const proximo = isProximo(r.proximo_mantenimiento);
                  return (
                    <motion.tr key={(r as any).id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.03 } }}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-1 font-mono text-[10px] text-mcvill-accent font-bold">{r.codigo}</td>
                      <td className="px-4 py-1 text-white text-[11px] font-bold uppercase">{r.nombre}</td>
                      <td className="px-4 py-1 text-slate-400 text-[10px] uppercase">{[r.modelo, r.fabricante].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="px-4 py-1 text-slate-400 text-[10px] uppercase">{r.ubicacion || '—'}</td>
                      <td className="px-4 py-1 text-slate-400 text-[10px] font-mono">{r.horas_uso ?? '—'} h</td>
                      <td className="px-4 py-1 text-[10px]">
                        <span className={`font-mono ${vencido ? 'text-rose-400 font-bold' : proximo ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                          {r.proximo_mantenimiento || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-1">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase w-fit ${est.cls}`}>
                          <est.icon size={8} />{est.label}
                        </span>
                      </td>
                      <td className="px-4 py-1 text-right">
                        <RowActions onEdit={() => { setEdit({ ...r }); setIsNew(false); }} onDel={() => setDelId((r as any).id)} />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ImportDataModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={() => { setShowImport(false); load(); }}
        config={IMPORT_CONFIGS.maquinas}
      />

      <AnimatePresence>
        {edit && (
          <Drawer title={isNew ? 'Nueva Máquina' : 'Editar Máquina'} onClose={() => setEdit(null)}>
            <Field label="Código *"><input value={edit.codigo} onChange={e => setEdit(p => ({ ...p!, codigo: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <Field label="Nombre *"><input value={edit.nombre} onChange={e => setEdit(p => ({ ...p!, nombre: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Modelo"><input value={edit.modelo || ''} onChange={e => setEdit(p => ({ ...p!, modelo: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Fabricante"><input value={edit.fabricante || ''} onChange={e => setEdit(p => ({ ...p!, fabricante: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Número de Serie"><input value={edit.numero_serie || ''} onChange={e => setEdit(p => ({ ...p!, numero_serie: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Área"><input value={edit.area || ''} onChange={e => setEdit(p => ({ ...p!, area: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Ubicación"><input value={edit.ubicacion || ''} onChange={e => setEdit(p => ({ ...p!, ubicacion: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horas de Uso"><input type="number" value={edit.horas_uso ?? 0} onChange={e => setEdit(p => ({ ...p!, horas_uso: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Frec. Mant. (días)"><input type="number" value={edit.frecuencia_mant_dias ?? 90} onChange={e => setEdit(p => ({ ...p!, frecuencia_mant_dias: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Próx. Mantenimiento"><input type="date" value={edit.proximo_mantenimiento || ''} onChange={e => setEdit(p => ({ ...p!, proximo_mantenimiento: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Fecha Adquisición"><input type="date" value={edit.fecha_adquisicion || ''} onChange={e => setEdit(p => ({ ...p!, fecha_adquisicion: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Estado">
              <Sel value={edit.estado || 'operativa'} onChange={v => setEdit(p => ({ ...p!, estado: v }))}
                options={[['operativa','Operativa'],['en_mantenimiento','En mantenimiento'],['fuera_servicio','Fuera de servicio']]} />
            </Field>
            <Field label="Notas"><textarea value={edit.notas || ''} onChange={e => setEdit(p => ({ ...p!, notas: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} /></Field>
            {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
            <SaveBtn saving={saving} onClick={save} color="brand" />
          </Drawer>
        )}
        {delId && <DeleteConfirm onCancel={() => setDelId(null)} onConfirm={del} />}
      </AnimatePresence>
    </div>
  );
};

// ─── EDIFICIO TAB ───────────────────────────────────────────────────────────────

const EMPTY_EDI: Edificio = { nombre: '', tipo: 'civil', ubicacion: '', area_m2: undefined, responsable: '', frecuencia_mant_dias: 180, estado: 'bueno', notas: '', activo: true };

const EdificioTab: React.FC = () => {
  const [rows, setRows]           = useState<Edificio[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [edit, setEdit]           = useState<Edificio | null>(null);
  const [isNew, setIsNew]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [delId, setDelId]         = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('activos_edificio').select('*').order('nombre');
    if (e) setError(e.message); else setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    const { id, ...payload } = edit as any;
    const rec = { ...payload, tenant_id: tenantId, updated_at: new Date().toISOString() };
    const { error: e } = isNew
      ? await supabase.from('activos_edificio').insert(rec)
      : await supabase.from('activos_edificio').update(rec).eq('id', id);
    if (e) setError(e.message); else { setEdit(null); load(); }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    await supabase.from('activos_edificio').delete().eq('id', delId);
    setDelId(null); load();
  };

  const TIPO_LABEL: Record<string, string> = { civil: 'Civil', electrico: 'Eléctrico', hvac: 'HVAC', plomeria: 'Plomería', contra_incendio: 'Contra Incendio', otro: 'Otro' };

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center gap-3">
        <Toolbar search={search} onSearch={setSearch} placeholder="Buscar instalaciones..." color="amber"
          onNew={() => { setEdit({ ...EMPTY_EDI }); setIsNew(true); }} label="Nueva Instalación" />
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all text-slate-400 border-white/10 bg-white/3 hover:text-white hover:border-white/20 shrink-0">
          <Upload size={13} /> Importar CSV
        </button>
      </div>
      {error && <ErrorBar msg={error} onClose={() => setError(null)} />}

      <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
        {loading ? <LoadingRow /> : filtered.length === 0 ? (
          <EmptyRow icon={Building2} label="instalaciones" onNew={() => { setEdit({ ...EMPTY_EDI }); setIsNew(true); }} color="amber" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <THead cols={['Nombre', 'Tipo', 'Ubicación', 'Responsable', 'Próx. Mant.', 'Estado', '']} />
              <tbody>
                {filtered.map((r, i) => {
                  const est = ESTADO_EDIFICIO[r.estado || 'bueno'] || ESTADO_EDIFICIO.bueno;
                  const vencido = isVencido(r.proximo_mantenimiento);
                  const proximo = isProximo(r.proximo_mantenimiento);
                  return (
                    <motion.tr key={(r as any).id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.03 } }}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-1 text-white text-[11px] font-bold uppercase">{r.nombre}</td>
                      <td className="px-4 py-1 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {TIPO_LABEL[r.tipo || 'otro'] || r.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-1 text-slate-400 text-[10px] uppercase">{r.ubicacion || '—'}</td>
                      <td className="px-4 py-1 text-slate-400 text-[10px] uppercase">{r.responsable || '—'}</td>
                      <td className="px-4 py-1 text-[10px]">
                        <span className={`font-mono ${vencido ? 'text-rose-400 font-bold' : proximo ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                          {r.proximo_mantenimiento || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-1">
                        <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${est.cls}`}>{est.label}</span>
                      </td>
                      <td className="px-4 py-1 text-right">
                        <RowActions onEdit={() => { setEdit({ ...r }); setIsNew(false); }} onDel={() => setDelId((r as any).id)} />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ImportDataModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={() => { setShowImport(false); load(); }}
        config={IMPORT_CONFIGS.edificio}
      />

      <AnimatePresence>
        {edit && (
          <Drawer title={isNew ? 'Nueva Instalación' : 'Editar Instalación'} onClose={() => setEdit(null)}>
            <Field label="Nombre *"><input value={edit.nombre} onChange={e => setEdit(p => ({ ...p!, nombre: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <Field label="Tipo">
              <Sel value={edit.tipo || 'civil'} onChange={v => setEdit(p => ({ ...p!, tipo: v }))}
                options={[['civil','Civil'],['electrico','Eléctrico'],['hvac','HVAC / Climatización'],['plomeria','Plomería / Hidráulico'],['contra_incendio','Contra Incendio'],['otro','Otro']]} />
            </Field>
            <Field label="Ubicación"><input value={edit.ubicacion || ''} onChange={e => setEdit(p => ({ ...p!, ubicacion: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Área (m²)"><input type="number" value={edit.area_m2 ?? ''} onChange={e => setEdit(p => ({ ...p!, area_m2: +e.target.value || undefined }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Responsable"><input value={edit.responsable || ''} onChange={e => setEdit(p => ({ ...p!, responsable: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Próx. Mantenimiento"><input type="date" value={edit.proximo_mantenimiento || ''} onChange={e => setEdit(p => ({ ...p!, proximo_mantenimiento: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Frec. Mant. (días)"><input type="number" value={edit.frecuencia_mant_dias ?? 180} onChange={e => setEdit(p => ({ ...p!, frecuencia_mant_dias: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Estado">
              <Sel value={edit.estado || 'bueno'} onChange={v => setEdit(p => ({ ...p!, estado: v }))}
                options={[['bueno','Bueno'],['regular','Regular'],['requiere_atencion','Requiere atención'],['critico','Crítico']]} />
            </Field>
            <Field label="Notas"><textarea value={edit.notas || ''} onChange={e => setEdit(p => ({ ...p!, notas: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} /></Field>
            {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
            <SaveBtn saving={saving} onClick={save} color="amber" />
          </Drawer>
        )}
        {delId && <DeleteConfirm onCancel={() => setDelId(null)} onConfirm={del} />}
      </AnimatePresence>
    </div>
  );
};

// ─── NUEVA ORDEN MODAL (maintenance_requests) ───────────────────────────────────

interface NuevaOrdenForm {
  title:          string;
  asset_id:       string;
  priority:       'normal' | 'urgente' | 'critical';
  description:    string;
  scheduled_date: string;
  assigned_to:    string;
}

const EMPTY_NUEVA_ORDEN: NuevaOrdenForm = {
  title:          '',
  asset_id:       '',
  priority:       'normal',
  description:    '',
  scheduled_date: '',
  assigned_to:    '',
};

interface MaintenanceAsset {
  id: string;
  nombre?: string;
  name?: string;
  codigo?: string;
}

const NuevaOrdenModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [form, setForm]     = useState<NuevaOrdenForm>({ ...EMPTY_NUEVA_ORDEN });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [assets, setAssets] = useState<MaintenanceAsset[]>([]);

  useEffect(() => {
    // Try to load assets; silently ignore if table doesn't exist
    supabase
      .from('maintenance_assets')
      .select('id, nombre, name, codigo')
      .order('nombre')
      .then(({ data }) => { if (data) setAssets(data as MaintenanceAsset[]); });
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) { setError('El título es requerido'); return; }
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      title:          form.title,
      description:    form.description || null,
      priority:       form.priority,
      status:         'pending',
      scheduled_date: form.scheduled_date || null,
      assigned_to:    form.assigned_to || null,
    };
    if (form.asset_id) payload.asset_id = form.asset_id;
    const { error: e } = await supabase.from('maintenance_requests').insert(payload);
    if (e) { setError(e.message); setSaving(false); return; }
    onSaved();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 top-16 left-64 bg-black/60 backdrop-blur-sm z-40" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 top-16 left-64 flex items-center justify-center z-50 p-6"
      >
        <div className="bg-slate-950 border border-white/5 rounded-[2rem] p-6 w-full max-w-lg space-y-4 shadow-2xl">
          {/* Modal header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-mcvill-accent/10 rounded-xl border border-mcvill-accent/20">
                <ClipboardList className="w-4 h-4 text-mcvill-accent" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Nueva Orden de Trabajo</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all">
              <X size={16} />
            </button>
          </div>

          {/* Fields */}
          <Field label="Título *">
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ej: Cambio de aceite — TORNO CNC MQ-001"
              className={inputCls + ' mt-1'}
            />
          </Field>

          <Field label="Activo">
            {assets.length > 0 ? (
              <select
                value={form.asset_id}
                onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}
                className={inputCls + ' mt-1'}
              >
                <option value="">— Sin activo específico —</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {[a.codigo, a.nombre ?? a.name].filter(Boolean).join(' — ')}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.asset_id}
                onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}
                placeholder="ID o nombre del activo (opcional)"
                className={inputCls + ' mt-1'}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prioridad">
              <Sel
                value={form.priority}
                onChange={v => setForm(p => ({ ...p, priority: v as NuevaOrdenForm['priority'] }))}
                options={[['normal', 'Normal'], ['urgente', 'Urgente'], ['critical', 'Crítica']]}
              />
            </Field>
            <Field label="Fecha Programada">
              <input
                type="date"
                value={form.scheduled_date}
                onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
                className={inputCls + ' mt-1'}
              />
            </Field>
          </div>

          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Describe el trabajo de mantenimiento requerido..."
              className={inputCls + ' mt-1 resize-none'}
            />
          </Field>

          <Field label="Técnico Asignado">
            <input
              value={form.assigned_to}
              onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
              placeholder="Nombre del técnico responsable"
              className={inputCls + ' mt-1'}
            />
          </Field>

          {error && <ErrorBar msg={error} onClose={() => setError(null)} />}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest border border-white/5 transition-all">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-mcvill-accent/20 hover:bg-mcvill-accent/30 text-mcvill-accent text-xs font-black uppercase tracking-widest border border-mcvill-accent/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" role="status" aria-label="Cargando" /> : <Plus size={14} />}
              {saving ? 'Guardando...' : 'Crear Orden'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ─── ÓRDENES DE TRABAJO TAB ─────────────────────────────────────────────────────

const EMPTY_OT: OrdenMant = { tipo_activo: 'maquina', activo_nombre: '', tipo_mantenimiento: 'preventivo', prioridad: 'media', descripcion: '', tecnico_asignado: '', estado: 'pendiente', costo_estimado: 0 };

const OrdenesTab: React.FC = () => {
  const [rows, setRows]       = useState<OrdenMant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [edit, setEdit]       = useState<OrdenMant | null>(null);
  const [isNew, setIsNew]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [delId, setDelId]     = useState<string | null>(null);
  const [showNuevaOrden, setShowNuevaOrden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('ordenes_mantenimiento').select('*').order('created_at', { ascending: false });
    if (e) setError(e.message); else setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    const matchSearch = !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    const { id, ...payload } = edit as any;
    const rec = {
      ...payload,
      numero_orden: isNew ? nextOrden(rows.length) : payload.numero_orden,
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    };
    const { error: e } = isNew
      ? await supabase.from('ordenes_mantenimiento').insert(rec)
      : await supabase.from('ordenes_mantenimiento').update(rec).eq('id', id);
    if (e) setError(e.message); else { setEdit(null); load(); }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    await supabase.from('ordenes_mantenimiento').delete().eq('id', delId);
    setDelId(null); load();
  };

  const counts = {
    pendiente:  rows.filter(r => r.estado === 'pendiente').length,
    en_proceso: rows.filter(r => r.estado === 'en_proceso').length,
    completada: rows.filter(r => r.estado === 'completada').length,
  };

  return (
    <div className="px-4 py-3 space-y-3">
      {/* KPI Cards — Compact Matrix */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {[
          { label: 'PENDIENTES',  val: counts.pendiente,  cls: 'text-slate-400 bg-slate-900 border-white/5' },
          { label: 'EN PROCESO',  val: counts.en_proceso, cls: 'text-mcvill-accent  bg-mcvill-accent/10  border-mcvill-accent/20' },
          { label: 'COMPLETADAS', val: counts.completada, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border px-3 py-2 flex items-center justify-between group hover:bg-white/[0.02] transition-all ${k.cls}`}>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{k.label}</p>
            <p className="text-xl font-black">{k.val}</p>
          </div>
        ))}
      </div>

      {/* Toolbar + estado filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar órdenes..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-all placeholder:text-slate-700" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-2xl py-2.5 px-4 text-sm text-slate-300 focus:outline-none focus:border-mcvill-accent/40 transition-all">
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <button onClick={() => setShowNuevaOrden(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all text-mcvill-accent border-mcvill-accent/30 bg-mcvill-accent/10 hover:opacity-80">
          <Plus size={14} /> Nueva Orden
        </button>
        <button onClick={() => { setEdit({ ...EMPTY_OT }); setIsNew(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all text-slate-400 border-white/10 bg-white/3 hover:text-white hover:border-white/20">
          <Plus size={14} /> Nueva OT
        </button>
      </div>

      {error && <ErrorBar msg={error} onClose={() => setError(null)} />}

      <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
        {loading ? <LoadingRow /> : filtered.length === 0 ? (
          <EmptyRow icon={ClipboardList} label="órdenes de trabajo" onNew={() => { setEdit({ ...EMPTY_OT }); setIsNew(true); }} color="cyan" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <THead cols={['N° OT', 'Activo', 'Tipo', 'Descripción', 'Técnico', 'F. Programada', 'Prioridad', 'Estado', '']} />
              <tbody>
                {filtered.map((r, i) => {
                  const est = ESTADO_ORDEN[r.estado || 'pendiente'] || ESTADO_ORDEN.pendiente;
                  const priorCls = PRIORIDAD_CLS[r.prioridad || 'media'] || PRIORIDAD_CLS.media;
                  return (
                    <motion.tr key={(r as any).id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.03 } }}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-1 font-mono text-[10px] text-mcvill-accent font-bold whitespace-nowrap">{r.numero_orden || '—'}</td>
                      <td className="px-4 py-1 text-[10px]">
                        <div className="text-white font-bold uppercase">{r.activo_nombre || '—'}</div>
                        <div className="text-slate-600 text-[8px] uppercase">{r.tipo_activo}</div>
                      </td>
                      <td className="px-4 py-1 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-700/50 text-slate-400 border border-white/5">{r.tipo_mantenimiento}</span>
                      </td>
                      <td className="px-4 py-1 text-slate-300 text-[10px] uppercase truncate max-w-[150px]">{r.descripcion}</td>
                      <td className="px-4 py-1 text-slate-400 text-[10px] uppercase whitespace-nowrap">{r.tecnico_asignado || '—'}</td>
                      <td className="px-4 py-1 text-slate-400 text-[10px] font-mono whitespace-nowrap">{r.fecha_programada || '—'}</td>
                      <td className="px-4 py-1 text-center">
                        <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${priorCls}`}>{r.prioridad}</span>
                      </td>
                      <td className="px-4 py-1 text-center">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase w-fit mx-auto ${est.cls}`}>
                          <est.icon size={8} />{est.label}
                        </span>
                      </td>
                      <td className="px-4 py-1 text-right">
                        <RowActions onEdit={() => { setEdit({ ...r }); setIsNew(false); }} onDel={() => setDelId((r as any).id)} />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNuevaOrden && (
          <NuevaOrdenModal
            onClose={() => setShowNuevaOrden(false)}
            onSaved={() => { setShowNuevaOrden(false); load(); }}
          />
        )}
        {edit && (
          <Drawer title={isNew ? 'Nueva Orden de Trabajo' : 'Editar Orden'} onClose={() => setEdit(null)}>
            <Field label="Tipo de Activo">
              <Sel value={edit.tipo_activo} onChange={v => setEdit(p => ({ ...p!, tipo_activo: v }))}
                options={[['maquina','Máquina'],['edificio','Edificio / Instalación']]} />
            </Field>
            <Field label="Nombre del Activo"><input value={edit.activo_nombre || ''} onChange={e => setEdit(p => ({ ...p!, activo_nombre: e.target.value }))} className={inputCls + ' mt-1'} placeholder="Ej: TORNO CNC MQ-001" /></Field>
            <Field label="Descripción del trabajo *"><textarea value={edit.descripcion} onChange={e => setEdit(p => ({ ...p!, descripcion: e.target.value }))} rows={3} className={inputCls + ' mt-1 resize-none'} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo Mantenimiento">
                <Sel value={edit.tipo_mantenimiento || 'preventivo'} onChange={v => setEdit(p => ({ ...p!, tipo_mantenimiento: v }))}
                  options={[['preventivo','Preventivo'],['correctivo','Correctivo'],['predictivo','Predictivo']]} />
              </Field>
              <Field label="Prioridad">
                <Sel value={edit.prioridad || 'media'} onChange={v => setEdit(p => ({ ...p!, prioridad: v }))}
                  options={[['baja','Baja'],['media','Media'],['alta','Alta'],['critica','Crítica']]} />
              </Field>
            </div>
            <Field label="Técnico Asignado"><input value={edit.tecnico_asignado || ''} onChange={e => setEdit(p => ({ ...p!, tecnico_asignado: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha Programada"><input type="date" value={edit.fecha_programada || ''} onChange={e => setEdit(p => ({ ...p!, fecha_programada: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Fecha Realizada"><input type="date" value={edit.fecha_realizada || ''} onChange={e => setEdit(p => ({ ...p!, fecha_realizada: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Costo Estimado ($)"><input type="number" value={edit.costo_estimado ?? 0} onChange={e => setEdit(p => ({ ...p!, costo_estimado: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Costo Real ($)"><input type="number" value={edit.costo_real ?? ''} onChange={e => setEdit(p => ({ ...p!, costo_real: +e.target.value || undefined }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Estado">
              <Sel value={edit.estado || 'pendiente'} onChange={v => setEdit(p => ({ ...p!, estado: v }))}
                options={[['pendiente','Pendiente'],['en_proceso','En proceso'],['completada','Completada'],['cancelada','Cancelada']]} />
            </Field>
            <Field label="Observaciones"><textarea value={edit.observaciones || ''} onChange={e => setEdit(p => ({ ...p!, observaciones: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} /></Field>
            {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
            <SaveBtn saving={saving} onClick={save} color="brand" />
          </Drawer>
        )}
        {delId && <DeleteConfirm onCancel={() => setDelId(null)} onConfirm={del} />}
      </AnimatePresence>
    </div>
  );
};

// ─── Shared UI helpers ──────────────────────────────────────────────────────────

const Toolbar: React.FC<{ search: string; onSearch: (v: string) => void; placeholder: string; color: string; onNew: () => void; label: string }> =
  ({ search, onSearch, placeholder, color, onNew, label }) => {
    const cls = COLOR[color] || COLOR.cyan;
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder={placeholder}
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-700" />
        </div>
        <button onClick={onNew} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all hover:opacity-80 ${cls}`}>
          <Plus size={14} />{label}
        </button>
      </div>
    );
  };

const THead: React.FC<{ cols: string[] }> = ({ cols }) => (
  <thead>
    <tr className="border-b border-white/5">
      {cols.map(h => (
        <th key={h} className="px-4 py-2 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
      ))}
    </tr>
  </thead>
);

const RowActions: React.FC<{ onEdit: () => void; onDel: () => void }> = ({ onEdit, onDel }) => (
  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <button onClick={onEdit} className="p-1.5 rounded-lg bg-mcvill-accent/10 border border-mcvill-accent/20 text-mcvill-accent hover:bg-mcvill-accent/20 transition-all"><Pencil size={12} /></button>
    <button onClick={onDel}  className="p-1.5 rounded-lg bg-rose-500/10  border border-rose-500/20  text-rose-400  hover:bg-rose-500/20  transition-all"><Trash2  size={12} /></button>
  </div>
);

const LoadingRow: React.FC = () => (
  <div className="flex items-center justify-center py-16 gap-3">
    <Loader2 className="w-5 h-5 text-slate-500 animate-spin" role="status" aria-label="Cargando" />
    <span className="text-sm text-slate-500">Cargando...</span>
  </div>
);

const EmptyRow: React.FC<{ icon: React.ElementType; label: string; onNew: () => void; color: string }> = ({ icon: Icon, label, onNew, color }) => {
  const cls = COLOR[color] || COLOR.cyan;
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Icon className="w-10 h-10 text-slate-700" />
      <p className="text-sm text-slate-600">No hay {label} registrados</p>
      <button onClick={onNew} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest ${cls}`}>
        <Plus size={12} /> Agregar primero
      </button>
    </div>
  );
};

const ErrorBar: React.FC<{ msg: string; onClose: () => void }> = ({ msg, onClose }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
    <p className="text-xs text-rose-300">{msg}</p>
    <button onClick={onClose} className="ml-auto text-rose-400"><X size={14} /></button>
  </motion.div>
);

const Drawer: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 top-16 left-64 bg-black/60 backdrop-blur-sm z-40" />
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-full max-w-md bg-slate-950 border-l border-white/10 z-50 overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400"><X size={16} /></button>
        </div>
        {children}
      </div>
    </motion.div>
  </>
);

const SaveBtn: React.FC<{ saving: boolean; onClick: () => void; color: string }> = ({ saving, onClick, color }) => {
  const cls = COLOR[color] || COLOR.cyan;
  return (
    <button onClick={onClick} disabled={saving}
      className={`w-full py-3.5 rounded-[1.5rem] font-black text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all border hover:opacity-80 disabled:opacity-50 ${cls}`}>
      {saving ? <Loader2 size={14} className="animate-spin" role="status" aria-label="Cargando" /> : <Save size={14} />}
      {saving ? 'Guardando...' : 'Guardar'}
    </button>
  );
};

const DeleteConfirm: React.FC<{ onCancel: () => void; onConfirm: () => void }> = ({ onCancel, onConfirm }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel} className="fixed inset-0 top-16 left-64 bg-black/70 backdrop-blur-sm z-50" />
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 top-16 left-64 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950 border border-rose-500/20 rounded-[2rem] p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/20">
            <Trash2 className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Confirmar eliminación</h3>
            <p className="text-xs text-slate-500 mt-0.5">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest border border-white/5">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-widest border border-rose-500/30">Eliminar</button>
        </div>
      </div>
    </motion.div>
  </>
);

export default MantenimientoPanel;
