import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, FileText, Plus, Pencil, Trash2, Save, X,
  Loader2, AlertCircle, Search, ChevronRight, Sparkles,
  Download, Route, CheckCircle2, ChevronDown, Upload, Zap,
  DollarSign as MoneyIcon, ShieldAlert
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';
import { reportUtils } from '../utils/reportUtils';
import { FileDown } from 'lucide-react';
import { OCManagerModal } from './OCManagerModal';
import { FactibilidadGatekeeper } from './FactibilidadGatekeeper';
import { appConfirm } from '../lib/dialogs';
import { PrintButton } from './common/PrintButton';

type TabId = 'clientes' | 'ordenes_compra' | 'cotizaciones' | 'tarifas' | 'factibilidad';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'clientes',       label: 'Clientes',           icon: Users    },
  { id: 'factibilidad',   label: 'Factibilidad',        icon: ShieldAlert },
  { id: 'cotizaciones',   label: 'Cotizaciones',        icon: FileText },
  { id: 'ordenes_compra', label: 'Órdenes de Compra',  icon: FileText },
  { id: 'tarifas',        label: 'Tarifas',             icon: Zap      },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Cliente {
  id?: string;
  razon_social: string;
  rfc?: string;
  nombre_contacto?: string;
  email?: string;
  telefono?: string;
  ciudad?: string;
  condicion_pago?: string;
  notas?: string;
  activo?: boolean;
}

interface CotizacionPartida {
  concepto: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
}

interface Cotizacion {
  id?: string;
  numero_cotizacion?: string;
  cliente_id?: string;
  cliente_nombre?: string;
  numero_parte?: string;
  descripcion?: string;
  estado?: string;
  vigencia_horas?: number;
  precio_total?: number;
  texto_propuesta?: string;
  partidas?: CotizacionPartida[];
  viajero_id?: string;
  notas?: string;
}

interface ViajeroRef {
  id: string;
  numero_parte: string;
  cliente: string;
  descripcion?: string;
  cantidad_orden?: number;
  horas_est_totales?: number;
  estatus: string;
  operaciones?: any[];
}

// ─── Shared UI helpers ───────────────────────────────────────────────────────

const inputCls = 'w-full bg-black/40 border border-white/10 rounded-lg py-3 px-3.5 text-sm text-white focus:outline-none focus:border-mcvill-accent/50 transition-all placeholder:text-slate-700';

const Field: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

// ── Combobox: input con dropdown de opciones fijas (permite escribir libremente) ──
const Combobox: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; sub?: string }[];
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, options, placeholder, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter(o =>
    !value || o.label.toLowerCase().includes(value.toLowerCase()) || o.value.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputCls + ' pr-8 mt-1'}
      />
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        className="absolute right-2 top-1/2 translate-y-[-40%] text-slate-600 hover:text-slate-400 transition-colors"
      >
        <ChevronDown size={13} />
      </button>
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden z-[80] shadow-2xl"
            style={{ maxHeight: 220, overflowY: 'auto' }}
          >
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(o.label); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${value === o.label ? 'bg-mcvill-accent/5' : ''}`}
              >
                <span className="text-xs text-white font-medium block">{o.label}</span>
                {o.sub && <span className="text-[10px] text-slate-500">{o.sub}</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Select styled (no escritura libre, solo clic) ──
const Sel: React.FC<{ value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className={inputCls + ' mt-1'}>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

const Toolbar: React.FC<{ search: string; onSearch: (v: string) => void; placeholder: string; onNew: () => void; label: string }> =
  ({ search, onSearch, placeholder, onNew, label }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder={placeholder}
          className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-[10px] text-white focus:outline-none focus:border-emerald-500/40 transition-all placeholder:text-slate-700" />
      </div>
      <button onClick={onNew} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80 text-mcvill-accent border-mcvill-accent/30 bg-mcvill-accent/10">
        <Plus size={12} />{label}
      </button>
    </div>
  );

const THead: React.FC<{ cols: string[] }> = ({ cols }) => (
  <thead><tr className="border-b border-white/5 bg-slate-900/40">
    {cols.map(h => <th key={h} className="px-4 py-2 text-left text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>)}
  </tr></thead>
);

const RowActions: React.FC<{ onEdit: () => void; onDel: () => void }> = ({ onEdit, onDel }) => (
  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <button onClick={onEdit} className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"><Pencil size={12} /></button>
    <button onClick={onDel}  className="p-1.5 rounded-lg bg-rose-500/10  border border-rose-500/20  text-rose-400  hover:bg-rose-500/20  transition-all"><Trash2  size={12} /></button>
  </div>
);

const LoadingRow = () => (
  <div className="flex items-center justify-center py-16 gap-3">
    <Loader2 role="status" aria-label="Cargando" className="w-5 h-5 text-slate-500 animate-spin" />
    <span className="text-sm text-slate-500">Cargando...</span>
  </div>
);

const EmptyRow: React.FC<{ label: string; onNew: () => void }> = ({ label, onNew }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <Users className="w-10 h-10 text-slate-700" />
    <p className="text-sm text-slate-600">No hay {label} registrados</p>
    <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest text-mcvill-accent border-mcvill-accent/30 bg-mcvill-accent/10">
      <Plus size={12} /> Agregar primero
    </button>
  </div>
);

const ErrorBar: React.FC<{ msg: string; onClose: () => void }> = ({ msg, onClose }) => (
  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
    <p className="text-xs text-rose-300 flex-1">{msg}</p>
    <button onClick={onClose} className="text-rose-400"><X size={14} /></button>
  </div>
);

const Drawer: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, footer, wide }) => {
  const { config } = useConfig();
  return (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 top-16 left-64 bg-black/70 backdrop-blur-sm z-40" />
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      className={`fixed top-0 right-0 h-full bg-[#0a0f1d] border-l border-white/10 z-50 flex flex-col ${wide ? 'w-full max-w-2xl' : 'w-full max-w-sm shadow-2xl'}`}>
      
      {/* Drawer Header */}
      <div className="p-6 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent">
            <ChevronRight size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none">{title}</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{`${config.logoText} Flow`}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10">
          <X size={18} />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
        {children}
      </div>

      {/* Drawer Footer (Optional but recommended for buttons) */}
      {footer && (
        <div className="p-6 border-t border-white/5 bg-slate-900/40 shrink-0">
          {footer}
        </div>
      )}
    </motion.div>
  </>
  );
};

const SaveBtn: React.FC<{ saving: boolean; onClick: () => void; label?: string }> = ({ saving, onClick, label = 'Guardar Cambios' }) => (
  <button onClick={onClick} disabled={saving}
    className="w-full py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-3 transition-all border shadow-lg shadow-mcvill-accent/10 disabled:opacity-50 text-white bg-mcvill-accent border-mcvill-accent/50 hover:opacity-90">
    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
    {saving ? 'PROCESANDO...' : label}
  </button>
);

const DeleteConfirm: React.FC<{ onCancel: () => void; onConfirm: () => void }> = ({ onCancel, onConfirm }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel} className="fixed inset-0 top-16 left-64 bg-black/70 backdrop-blur-sm z-[60]" />
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 top-16 left-64 flex items-center justify-center z-[60] p-4">
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

// ─── Viajero Dropdown (inline combobox con búsqueda) ────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'EN PROCESO': 'bg-blue-500/20 text-blue-400',
  'COMPLETADO': 'bg-emerald-500/20 text-emerald-400',
  'PENDIENTE':  'bg-slate-600/30 text-slate-400',
  'DETENIDO':   'bg-orange-500/20 text-orange-400',
  'RECHAZADO':  'bg-rose-500/20 text-rose-400',
};

const ViajeroDropdown: React.FC<{
  selected: ViajeroRef | null;
  onSelect: (v: ViajeroRef) => void;
  onClear: () => void;
}> = ({ selected, onSelect, onClear }) => {
  const [search, setSearch]     = useState('');
  const [open, setOpen]         = useState(false);
  const [viajeros, setViajeros] = useState<ViajeroRef[]>([]);
  const [loading, setLoading]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('viajeros')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) console.error('ViajeroDropdown error:', error);
        setViajeros(data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = viajeros.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return String(v.id).toLowerCase().includes(q) ||
           (v.numero_parte || '').toLowerCase().includes(q) ||
           (v.cliente || '').toLowerCase().includes(q);
  });

  if (selected) {
    return (
      <div className="flex items-center gap-2 w-full bg-blue-500/10 border border-blue-500/30 rounded-xl py-2.5 px-3">
        <Route size={13} className="text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-blue-200 text-xs font-bold truncate block">{selected.id} · {selected.numero_parte}</span>
          <span className="text-[10px] text-emerald-400 font-bold">{selected.cliente}</span>
        </div>
        <button onClick={onClear} className="p-1 text-slate-500 hover:text-white transition-colors shrink-0" title="Limpiar">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por ID, número de parte o cliente..."
          className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/40 placeholder:text-slate-700 transition-all"
        />
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
        >
          <ChevronDown size={13} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden z-[80] shadow-2xl"
            style={{ maxHeight: 260, overflowY: 'auto' }}
          >
            {loading ? (
              <div className="flex items-center gap-2 py-5 px-4">
                <Loader2 role="status" aria-label="Cargando" size={14} className="animate-spin text-slate-500" />
                <span className="text-xs text-slate-500">Cargando viajeros...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-5 px-4 text-xs text-slate-600 text-center">Sin resultados</div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                  <Route size={11} className="text-slate-600" />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    {filtered.length} viajero{filtered.length !== 1 ? 's' : ''}{!search ? ' — escribe para filtrar' : ''}
                  </span>
                </div>
                {filtered.slice(0, 60).map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { onSelect(v); setSearch(''); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black text-xs">{v.id}</span>
                        <span className="text-slate-400 text-xs font-mono">· {v.numero_parte}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-emerald-400 font-bold">{v.cliente || 'S/C'}</span>
                        {v.horas_est_totales && <span className="text-[9px] text-slate-600">{v.horas_est_totales}h est.</span>}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[v.estatus] || 'bg-slate-600/30 text-slate-400'}`}>
                      {v.estatus}
                    </span>
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── CLIENTES TAB ────────────────────────────────────────────────────────────

const COND_PAGO_OPTS: [string, string][] = [
  ['contado','Contado'],['credito_15','Crédito 15 días'],['credito_30','Crédito 30 días'],
  ['credito_60','Crédito 60 días'],['credito_90','Crédito 90 días'],
];

const CIUDADES_MX = [
  'Monterrey','Guadalajara','Ciudad de México','Saltillo','San Luis Potosí',
  'Querétaro','Torreón','Chihuahua','Ciudad Juárez','Mexicali','Tijuana',
  'Puebla','León','Toluca','Mérida','Hermosillo',
];

const EMPTY_CLI: Cliente = { razon_social: '', rfc: '', nombre_contacto: '', email: '', telefono: '', ciudad: '', condicion_pago: 'credito_30', notas: '', activo: true };

const ClientesTab: React.FC = () => {
  const [rows, setRows]       = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [edit, setEdit]       = useState<Cliente | null>(null);
  const [isNew, setIsNew]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [delId, setDelId]     = useState<string | null>(null);
  const { tenantId }          = useConfig();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('clientes').select('*').order('razon_social');
    if (e) setError(e.message); else setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const filtered = rows.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    const { id, ...payload } = edit as any;
    const rec = { ...payload, tenant_id: tenantId || 'mcvill', updated_at: new Date().toISOString() };
    const { error: e } = isNew
      ? await supabase.from('clientes').insert(rec)
      : await supabase.from('clientes').update(rec).eq('id', id);
    if (e) setError(e.message); else { setEdit(null); load(); }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    await supabase.from('clientes').delete().eq('id', delId);
    setDelId(null); load();
  };

  return (
    <div className="p-4 space-y-3">
      <Toolbar search={search} onSearch={setSearch} placeholder="Filtro clientes..." onNew={() => { setEdit({ ...EMPTY_CLI }); setIsNew(true); }} label="Nuevo Cliente" />
      {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
      <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
        {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyRow label="clientes" onNew={() => { setEdit({ ...EMPTY_CLI }); setIsNew(true); }} /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <THead cols={['Razón Social', 'RFC', 'Contacto', 'Email', 'Ciudad', 'Cond. Pago', '']} />
              <tbody className="divide-y divide-white/5">
                {filtered.map((r, i) => (
                  <tr key={(r as any).id} className="hover:bg-blue-500/5 transition-colors group">
                    <td className="px-4 py-1 text-white text-[11px] font-black uppercase">{r.razon_social}</td>
                    <td className="px-4 py-1 text-slate-500 text-[10px] font-mono uppercase">{r.rfc || '—'}</td>
                    <td className="px-4 py-1 text-slate-400 text-[10px] uppercase">{r.nombre_contacto || '—'}</td>
                    <td className="px-4 py-1 text-slate-500 text-[10px] uppercase">{r.email || '—'}</td>
                    <td className="px-4 py-1 text-slate-400 text-[10px] uppercase">{r.ciudad || '—'}</td>
                    <td className="px-4 py-1">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {r.condicion_pago?.replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-1 text-right"><RowActions onEdit={() => { setEdit({ ...r }); setIsNew(false); }} onDel={() => setDelId((r as any).id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AnimatePresence>
        {edit && (
          <Drawer 
            title={isNew ? 'Nuevo Cliente' : 'Editar Cliente'} 
            onClose={() => setEdit(null)}
            footer={<SaveBtn saving={saving} onClick={save} />}
          >
            <Field label="Razón Social *">
              <input value={edit.razon_social} onChange={e => setEdit(p => ({ ...p!, razon_social: e.target.value }))} className={inputCls + ' mt-1'} placeholder="Ej: Industrias García S.A. de C.V." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="RFC">
                <input value={edit.rfc || ''} onChange={e => setEdit(p => ({ ...p!, rfc: e.target.value.toUpperCase() }))} className={inputCls + ' mt-1'} placeholder="XAXX010101000" maxLength={13} />
              </Field>
              <Field label="Ciudad">
                <Combobox
                  value={edit.ciudad || ''}
                  onChange={v => setEdit(p => ({ ...p!, ciudad: v }))}
                  options={CIUDADES_MX.map(c => ({ value: c, label: c }))}
                  placeholder="Monterrey..."
                />
              </Field>
            </div>
            <Field label="Nombre del Contacto">
              <input value={edit.nombre_contacto || ''} onChange={e => setEdit(p => ({ ...p!, nombre_contacto: e.target.value }))} className={inputCls + ' mt-1'} placeholder="Ing. Juan Pérez" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input type="email" value={edit.email || ''} onChange={e => setEdit(p => ({ ...p!, email: e.target.value }))} className={inputCls + ' mt-1'} placeholder="contacto@empresa.mx" />
              </Field>
              <Field label="Teléfono">
                <input value={edit.telefono || ''} onChange={e => setEdit(p => ({ ...p!, telefono: e.target.value }))} className={inputCls + ' mt-1'} placeholder="81 1234 5678" />
              </Field>
            </div>
            <Field label="Condición de Pago">
              <Sel value={edit.condicion_pago || 'credito_30'} onChange={v => setEdit(p => ({ ...p!, condicion_pago: v }))} options={COND_PAGO_OPTS} />
            </Field>
            <Field label="Notas">
              <textarea value={edit.notas || ''} onChange={e => setEdit(p => ({ ...p!, notas: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} placeholder="Observaciones internas..." />
            </Field>
            {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
          </Drawer>
        )}
        {delId && <DeleteConfirm onCancel={() => setDelId(null)} onConfirm={del} />}
      </AnimatePresence>
    </div>
  );
};

// ─── PDF Generator ───────────────────────────────────────────────────────────

function generateCotizacionPDF(cot: Cotizacion, clienteInfo?: Cliente | null, brandConfig?: { brandName: string; companyCity: string; supportEmail: string }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;

  // ── HEADER (fondo navy oscuro — imprime sólido) ──
  doc.setFillColor(2, 8, 32);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 40, pageW, 1.5, 'F');

  // Logo mark: cuadrado azul + M blanca
  const logoX = margin;
  const logoY = 9;
  const logoSize = 14;
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.4);
  doc.lines([[0, -8], [5, 5], [5, -5], [0, 8]], logoX + 2, logoY + 12, [1, 1], 'S', false);
  doc.setLineWidth(0.5);

  const textX = logoX + logoSize + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(brandConfig ? brandConfig.brandName.toUpperCase() : 'MCVILL', textX, 19);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 190, 220);
  doc.text('MANUFACTURING EXCELLENCE · TORREÓN, MX', textX, 26);
  doc.text(`${brandConfig ? brandConfig.supportEmail : 'soporte@mcvill.mx'}`, textX, 33);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(59, 130, 246);
  doc.text(cot.numero_cotizacion || 'BORRADOR', pageW - margin, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(210, 225, 245);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageW - margin, 26, { align: 'right' });
  doc.text(`Vigencia: ${cot.vigencia_horas ?? 72} horas`, pageW - margin, 33, { align: 'right' });

  // ── CAJAS CLIENTE / REFERENCIA (fondo blanco, texto negro) ──
  let y = 50;
  const halfW = (pageW - 3 * margin) / 2;
  const boxH = 34;

  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(190, 205, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, halfW, boxH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(59, 100, 180);
  doc.text('PARA / CLIENTE', margin + 5, y + 8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(10, 10, 10);
  doc.text(cot.cliente_nombre || 'Cliente No Definido', margin + 5, y + 17, { maxWidth: halfW - 10 });
  if (clienteInfo) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(55, 65, 80);
    if (clienteInfo.nombre_contacto) doc.text(`Attn: ${clienteInfo.nombre_contacto}`, margin + 5, y + 24);
    if (clienteInfo.ciudad) doc.text(clienteInfo.ciudad, margin + 5, y + 30);
  }

  const rx = margin + halfW + margin;
  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(190, 205, 220);
  doc.roundedRect(rx, y, halfW, boxH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(59, 100, 180);
  doc.text('REFERENCIA', rx + 5, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(10, 10, 10);
  if (cot.numero_parte) doc.text(`N° Parte: ${cot.numero_parte}`, rx + 5, y + 16);
  if (cot.viajero_id) doc.text(`Viajero: ${cot.viajero_id}`, rx + 5, y + 23);
  doc.text(`Estado: ${cot.estado?.toUpperCase() || 'BORRADOR'}`, rx + 5, y + 30);
  y += boxH + 8;

  // ── DESCRIPCIÓN ──
  if (cot.descripcion) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 100, 140);
    doc.text('DESCRIPCIÓN DEL SERVICIO', margin, y);
    doc.setDrawColor(190, 205, 220); doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 15, 15);
    const descLines = doc.splitTextToSize(cot.descripcion, pageW - 2 * margin);
    doc.text(descLines, margin, y + 7);
    y += 10 + descLines.length * 5.2;
  }
  y += 4;

  // ── TABLA DE PARTIDAS ──
  const partidas: CotizacionPartida[] = cot.partidas || [];
  if (partidas.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 100, 140);
    doc.text('DESGLOSE DE COSTOS', margin, y);
    doc.setDrawColor(190, 205, 220); doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: pageW - 2 * margin,
      head: [['#', 'Concepto', 'Cant.', 'U.M.', 'Precio Unit.', 'Subtotal']],
      body: partidas.map((p, i) => [
        String(i + 1), p.concepto, String(p.cantidad), p.unidad,
        `$${Number(p.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${Number(p.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      ]),
      styles: {
        fontSize: 8.5, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
        font: 'helvetica', valign: 'middle',
        textColor: [10, 10, 10], fillColor: [255, 255, 255],
        lineColor: [200, 210, 225], lineWidth: 0.25,
      },
      headStyles: {
        fillColor: [15, 30, 70], textColor: [255, 255, 255],
        fontStyle: 'bold', fontSize: 8, halign: 'center', valign: 'middle',
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      alternateRowStyles: { fillColor: [246, 249, 253] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12, valign: 'middle' },
        1: { halign: 'left',   cellWidth: 'auto', valign: 'middle' },
        2: { halign: 'center', cellWidth: 14, valign: 'middle' },
        3: { halign: 'center', cellWidth: 20, valign: 'middle' },
        4: { halign: 'right',  cellWidth: 32, valign: 'middle' },
        5: { halign: 'right',  cellWidth: 32, valign: 'middle' },
      },
    });

    y = (doc as any).lastAutoTable?.finalY ?? y + 40;
    y += 7;

    const subtotal = partidas.reduce((acc, p) => acc + (p.subtotal || 0), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    const totX = pageW - margin - 75;

    // Caja totales: fondo claro + fila total oscura
    doc.setFillColor(245, 248, 252);
    doc.setDrawColor(190, 205, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(totX, y, 75, 32, 3, 3, 'FD');
    doc.setFillColor(15, 30, 70);
    doc.roundedRect(totX, y + 23, 75, 9, 3, 3, 'F');

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 60, 75);
    doc.text('Subtotal:', totX + 5, y + 9);
    doc.text('IVA (16%):', totX + 5, y + 17);
    doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totX + 70, y + 9, { align: 'right' });
    doc.text(`$${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totX + 70, y + 17, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totX + 5, y + 29);
    doc.setFontSize(10);
    doc.text(`$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totX + 70, y + 29, { align: 'right' });
    y += 40;
  }

  // ── PROPUESTA TÉCNICA ──
  if (cot.texto_propuesta) {
    y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(80, 100, 140);
    doc.text('PROPUESTA TÉCNICA', margin, y);
    doc.setDrawColor(190, 205, 220); doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 15, 15);
    const lines = doc.splitTextToSize(cot.texto_propuesta, pageW - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 8;
  }

  // ── FOOTER (más alto, letras más grandes) ──
  const footerY = 280;
  doc.setFillColor(2, 8, 32);
  doc.rect(0, footerY, pageW, 17, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(0, footerY, pageW, 1, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(190, 210, 235);
  doc.text(`Cotización válida por ${cot.vigencia_horas ?? 72} horas. Precios en MXN + IVA. Sujeto a disponibilidad.`, margin, footerY + 7);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(220, 235, 255);
  doc.text(`${brandConfig ? brandConfig.brandName : 'McVill'} Manufacturing — ${brandConfig ? brandConfig.companyCity : 'Torreón, Coah.'}  ·  ${brandConfig ? brandConfig.supportEmail : 'soporte@mcvill.mx'}`, margin, footerY + 13);
  doc.setTextColor(59, 130, 246);
  doc.save(`${cot.numero_cotizacion || 'Cotizacion'}_${cot.cliente_nombre || 'Cliente'}.pdf`);
}

// ─── AI Quotation Generator ──────────────────────────────────────────────────

async function generateAIQuotation(viajero: ViajeroRef): Promise<{ partidas: CotizacionPartida[]; texto_propuesta: string; total: number } | null> {
  // Fetch catalogs + viajero ops in parallel, tolerating individual failures
  const [opsCatRes, matsRes, viajeroOpsRes] = await Promise.all([
    supabase.from('operaciones_catalogo').select('centro_trabajo, nombre, tarifa_hora').limit(30),
    supabase.from('materiales_catalogo').select('clave, descripcion, unidad_medida, precio_unitario').gt('precio_unitario', 0).limit(15),
    supabase.from('viajero_operaciones').select('*').eq('viajero_id', viajero.id),
  ]);

  const opsCat   = opsCatRes.data   || [];
  const mats     = matsRes.data     || [];
  const viajeroOps = viajeroOpsRes.data || viajero.operaciones || [];

  const opsList = viajeroOps.length > 0
    ? viajeroOps.map((o: any) => o.centro_trabajo || o.nombre_operacion || '').filter(Boolean).join(', ')
    : 'LASER, DOBLEZ, CNC, SOLDADURA, PINTURA, ENSAMBLE';

  const opsRates = opsCat.length > 0
    ? opsCat.map(o => `- ${o.centro_trabajo}: $${o.tarifa_hora}/hr`).join('\n')
    : '- LASER: $450/hr\n- DOBLEZ: $280/hr\n- CNC: $520/hr\n- SOLDADURA: $350/hr\n- PINTURA: $320/hr\n- ENSAMBLE: $250/hr';

  const matsList = mats.length > 0
    ? mats.slice(0, 8).map(m => `- ${m.clave}: ${m.descripcion} $${m.precio_unitario}/${m.unidad_medida}`).join('\n')
    : '- Lámina HR Cal.14: $1,850/kg\n- Pintura epóxica: $380/lt';

  const prompt = `Eres un cotizador industrial de manufactura de precisión metalmecánica.

ORDEN DE PRODUCCIÓN:
Número de Parte: ${viajero.numero_parte}
Descripción: ${viajero.descripcion || 'Pieza metalmecánica de precisión'}
Cliente: ${viajero.cliente}
Cantidad: ${viajero.cantidad_orden || 1} piezas
Horas estimadas: ${viajero.horas_est_totales || 8} hrs
Operaciones del proceso: ${opsList}

TARIFAS DE OPERACIONES:
${opsRates}

MATERIALES DISPONIBLES:
${matsList}

INSTRUCCIONES:
1. Crea una partida por cada operación del proceso (horas × tarifa).
2. Agrega partidas de materiales estimados.
3. Agrega una partida de Overhead fabril (12% del subtotal de operaciones).
4. Agrega una partida de Margen comercial (18% del subtotal total).
5. Escribe un texto de propuesta comercial profesional de 3-4 oraciones.

RESPONDE ÚNICAMENTE con este JSON exacto, sin markdown ni texto adicional:
{"partidas":[{"concepto":"string","cantidad":number,"unidad":"string","precio_unitario":number,"subtotal":number}],"texto_propuesta":"string"}`;

  try {
    const { data, error } = await supabase.functions.invoke('gemini-generate', {
      body: {
        prompt,
        systemInstruction: 'Eres un cotizador industrial. Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto extra.',
        provider: 'google',
        model: 'gemini-2.5-flash-lite',
        language: 'text',
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      return null;
    }

    // The edge function returns data.content (string) or data.result
    const raw: string = data?.content || data?.result || '';
    if (!raw) {
      console.error('Empty AI response:', data);
      return null;
    }

    // Strip markdown fences if AI ignores instructions
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

    // Find JSON object in the response (in case there's extra text)
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', cleaned);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const partidas: CotizacionPartida[] = (parsed.partidas || []).map((p: any) => {
      const cantidad = Number(p.cantidad) || 1;
      const pu = Number(p.precio_unitario) || 0;
      const subtotal = Number(p.subtotal) || cantidad * pu;
      return { concepto: String(p.concepto || ''), cantidad, unidad: String(p.unidad || 'hrs'), precio_unitario: pu, subtotal };
    });

    const total = partidas.reduce((a, p) => a + p.subtotal, 0);
    return { partidas, texto_propuesta: String(parsed.texto_propuesta || ''), total };

  } catch (e) {
    console.error('AI quotation parse error:', e);
    return null;
  }
}

// ─── Partidas Editor ─────────────────────────────────────────────────────────

const UNIDADES = ['hrs', 'pzas', 'kg', 'lt', 'm', 'm2', 'lote', 'servicio', 'juego', 'set'];
const EMPTY_PARTIDA: CotizacionPartida = { concepto: '', cantidad: 1, unidad: 'hrs', precio_unitario: 0, subtotal: 0 };

const PartidasEditor: React.FC<{
  partidas: CotizacionPartida[];
  onChange: (p: CotizacionPartida[]) => void;
}> = ({ partidas, onChange }) => {
  const update = (i: number, field: keyof CotizacionPartida, val: string | number) => {
    const next = partidas.map((p, idx) => {
      if (idx !== i) return p;
      const updated = { ...p, [field]: val };
      if (field === 'cantidad' || field === 'precio_unitario') {
        updated.subtotal = Number(updated.cantidad) * Number(updated.precio_unitario);
      }
      if (field === 'subtotal') updated.subtotal = Number(val);
      return updated;
    });
    onChange(next);
  };

  const remove = (i: number) => onChange(partidas.filter((_, idx) => idx !== i));
  const add = () => onChange([...partidas, { ...EMPTY_PARTIDA }]);

  const subtotal = partidas.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const cellInput = 'bg-transparent border-0 outline-none text-white text-xs w-full focus:bg-white/5 rounded px-1 py-0.5 transition-colors';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Partidas de Costo</label>
        <button onClick={add} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all">
          <Plus size={10} /> Agregar
        </button>
      </div>

      {partidas.length === 0 ? (
        <div className="text-center py-4 text-slate-600 text-[10px] border border-dashed border-white/10 rounded-lg">
          Sin partidas — usa "Generar con IA" o agrega manualmente
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/60 border-b border-white/10">
                <th className="px-2 py-1.5 text-left text-[8px] font-black text-slate-500 uppercase tracking-widest">Concepto</th>
                <th className="px-2 py-1.5 text-center text-[8px] font-black text-slate-500 uppercase w-12">Cant.</th>
                <th className="px-2 py-1.5 text-center text-[8px] font-black text-slate-500 uppercase w-14">U.M.</th>
                <th className="px-2 py-1.5 text-right text-[8px] font-black text-slate-500 uppercase w-20">P.U.</th>
                <th className="px-2 py-1.5 text-right text-[8px] font-black text-slate-500 uppercase w-20">Subtotal</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {partidas.map((p, i) => (
                <tr key={i} className="hover:bg-blue-500/5 transition-colors group">
                  <td className="px-2 py-1"><input value={p.concepto} onChange={e => update(i, 'concepto', e.target.value)} className={cellInput} placeholder="Descripción..." /></td>
                  <td className="px-2 py-1"><input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    value={p.cantidad === 0 ? '' : p.cantidad}
                    onChange={e => {
                      const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                      update(i, 'cantidad', isNaN(n) ? 0 : n);
                    }}
                    className={cellInput + ' text-center'}
                  /></td>
                  <td className="px-2 py-1">
                    <select value={p.unidad} onChange={e => update(i, 'unidad', e.target.value)}
                      className="bg-transparent border-0 outline-none text-white text-[10px] w-full text-center focus:bg-white/5 rounded transition-colors">
                      {UNIDADES.map(u => <option key={u} value={u} style={{ background: '#0f172a' }}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <div className="relative flex items-center">
                      <span className="absolute left-1 text-slate-500 text-[10px]">$</span>
                      <input
                        type="text" inputMode="decimal"
                        value={p.precio_unitario === 0 ? '' : p.precio_unitario}
                        onChange={e => {
                          const clean = e.target.value.replace(/[^0-9.]/g, '').replace(/^0+(?=[1-9])/, '');
                          const n = parseFloat(clean);
                          update(i, 'precio_unitario', isNaN(n) ? 0 : n);
                        }}
                        className={cellInput + ' text-right pl-3'}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <span className="font-black text-emerald-400 text-[10px] tracking-tighter">
                      ${p.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => remove(i)} className="p-1 text-rose-500 hover:text-rose-400"><Trash2 size={10} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-black/40 px-3 py-2 border-t border-white/10 space-y-0.5">
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-500 uppercase font-black">Subtotal</span>
              <span className="text-slate-300 font-mono">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[9px] border-b border-white/5 pb-0.5">
              <span className="text-slate-500 uppercase font-black">IVA 16%</span>
              <span className="text-slate-300 font-mono">${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[11px] font-black pt-0.5">
              <span className="text-white uppercase">TOTAL</span>
              <span className="text-emerald-400 font-mono">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COTIZACIONES TAB ────────────────────────────────────────────────────────

const ESTADO_COT: Record<string, string> = {
  borrador:  'bg-slate-700/50 text-slate-400 border-white/5',
  enviada:   'bg-blue-500/10  text-blue-400  border-blue-500/20',
  aprobada:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rechazada: 'bg-rose-500/10  text-rose-400  border-rose-500/20',
  vencida:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const VIGENCIA_OPTS: [string, string][] = [
  ['24','24 horas'],['48','48 horas'],['72','72 horas (estándar)'],
  ['120','5 días'],['168','7 días'],['336','14 días'],['720','30 días'],
];

function nextNumCot(n: number) {
  return `COT-${new Date().getFullYear()}-${String(n + 1).padStart(4, '0')}`;
}

// URL del microservicio Python local (step-analyzer/api.py)
const STEP_API_URL = 'http://localhost:8765';

interface StepPieza {
  index: number; nombre: string; tipo: string; es_chapa: boolean;
  area_cm2: number; volumen_cm3: number; peso_kg: number;
  bbox_mm: { x: number; y: number; z: number };
  perimetro_corte_mm: number; agujeros: number; metros_soldadura: number;
}
interface StepAnalysisResult {
  material: string; total_piezas: number; total_peso_kg: number;
  total_area_cm2: number; total_metros_soldadura: number; piezas: StepPieza[];
}

interface TarifaCotizacion {
  concepto_key: string;
  precio_unitario: number;
}

function stepResultToPartidas(data: StepAnalysisResult, tarifas: TarifaCotizacion[]): CotizacionPartida[] {
  const precio = (key: string) => Number(tarifas.find(t => t.concepto_key === key)?.precio_unitario ?? 0);
  const partida = (concepto: string, cantidad: number, unidad: string, pu: number): CotizacionPartida => ({
    concepto, cantidad, unidad, precio_unitario: pu, subtotal: Math.round(cantidad * pu * 100) / 100,
  });

  const partidas: CotizacionPartida[] = [];
  const matKey = `material_${data.material.toLowerCase()}`;

  if (data.total_peso_kg > 0)
    partidas.push(partida(
      `Material ${data.material.toUpperCase()} — ${data.total_piezas} pzas (${data.total_peso_kg} kg)`,
      data.total_peso_kg, 'kg', precio(matKey)
    ));

  const laminas = data.piezas.filter(p => p.es_chapa && p.perimetro_corte_mm > 0);
  if (laminas.length > 0) {
    const totalM = Math.round(laminas.reduce((s, p) => s + p.perimetro_corte_mm, 0)) / 1000;
    partidas.push(partida(
      `Corte lámina — ${laminas.length} pza(s)`,
      Math.round(totalM * 100) / 100, 'm', precio('corte_lamina')
    ));
  }

  if (data.total_metros_soldadura > 0)
    partidas.push(partida(
      'Soldadura (detectada por geometría STEP)',
      data.total_metros_soldadura, 'm', precio('soldadura')
    ));

  if (data.total_area_cm2 > 0)
    partidas.push(partida(
      'Pintura / recubrimiento',
      Math.round(data.total_area_cm2 / 100) / 100, 'm2', precio('pintura')
    ));

  return partidas;
}

const EMPTY_COT: Cotizacion = {
  cliente_nombre: '', numero_parte: '', descripcion: '', estado: 'borrador',
  vigencia_horas: 72, precio_total: 0, partidas: [], texto_propuesta: '', notas: '',
};

const CotizacionesTab: React.FC = () => {
  const { tenantId, config } = useConfig();
  const [rows, setRows]         = useState<Cotizacion[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [edit, setEdit]         = useState<Cotizacion | null>(null);
  const [isNew, setIsNew]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [delId, setDelId]       = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [selectedViajero, setSelectedViajero] = useState<ViajeroRef | null>(null);
  const [aiSuccess, setAiSuccess]   = useState(false);
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [stepLoading, setStepLoading] = useState(false);
  const [stepMaterial, setStepMaterial] = useState('acero');
  const [stepSuccess, setStepSuccess] = useState<string | null>(null);
  const stepInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('cotizaciones').select('*').order('created_at', { ascending: false });
    if (e) setError(e.message); else setRows(data || []);
    setSelectedIds([]);
    setLoading(false);
  }, []);

  const handleBulkDelete = async () => {
    if (!await appConfirm(`¿Deseas dar de baja las ${selectedIds.length} cotizaciones seleccionadas?`)) return;
    try {
      setLoading(true);
      await Promise.all(selectedIds.map(id => supabase.from('cotizaciones').delete().eq('id', id)));
      setSelectedIds([]);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('clientes').select('id, razon_social, nombre_contacto, ciudad, email').order('razon_social')
      .then(({ data }) => setClientes(data || []));
  }, []);

  const filtered = rows.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setEdit({ ...EMPTY_COT }); setIsNew(true); setSelectedViajero(null); setAiSuccess(false); };
  const openEdit = (r: Cotizacion) => { setEdit({ ...r }); setIsNew(false); setSelectedViajero(null); setAiSuccess(false); };
  const closeEdit = () => { setEdit(null); setSelectedViajero(null); };

  const handleSelectViajero = (v: ViajeroRef) => {
    setSelectedViajero(v);
    setEdit(prev => ({
      ...prev!,
      viajero_id: v.id,
      numero_parte: v.numero_parte || prev?.numero_parte || '',
      descripcion: v.descripcion || prev?.descripcion || '',
      cliente_nombre: prev?.cliente_nombre || v.cliente || '',
    }));
  };

  const handleGenerateAI = async () => {
    if (!selectedViajero) return;
    setGeneratingAI(true);
    setAiSuccess(false);
    setError(null);
    try {
      const result = await generateAIQuotation(selectedViajero);
      if (result && result.partidas.length > 0) {
        setEdit(prev => ({
          ...prev!,
          partidas: result.partidas,
          precio_total: Math.round(result.total * 1.16),
          texto_propuesta: result.texto_propuesta,
        }));
        setAiSuccess(true);
      } else {
        setError('La IA no retornó partidas. Revisa la consola del navegador para más detalles, o agrega partidas manualmente.');
      }
    } catch (e: any) {
      setError(`Error al generar: ${e?.message || 'desconocido'}`);
    }
    setGeneratingAI(false);
  };

  const handleStepFile = async (file: File) => {
    setStepLoading(true);
    setStepSuccess(null);
    setError(null);
    try {
      // Cargar tarifas y analizar STEP en paralelo
      const [tarifasRes, stepRes] = await Promise.all([
        supabase.from('tarifas_cotizacion').select('concepto_key, precio_unitario').eq('activo', true),
        fetch(`${STEP_API_URL}/analyze`, { method: 'POST', body: (() => { const f = new FormData(); f.append('file', file); f.append('material', stepMaterial); return f; })() }),
      ]);

      if (!stepRes.ok) {
        const err = await stepRes.json().catch(() => ({}));
        throw new Error(err.detail || `API error ${stepRes.status}`);
      }

      const data: StepAnalysisResult = await stepRes.json();
      const tarifas: TarifaCotizacion[] = tarifasRes.data || [];
      const partidas = stepResultToPartidas(data, tarifas);

      setEdit(prev => ({ ...prev!, partidas, descripcion: prev?.descripcion || file.name.replace(/\.(step|stp)$/i, '') }));

      const tienenPrecio = partidas.filter(p => p.precio_unitario > 0).length;
      const msg = `${data.total_piezas} piezas · ${data.total_peso_kg} kg · ${data.total_metros_soldadura} m soldadura`;
      setStepSuccess(tienenPrecio > 0 ? msg : `${msg} — configura tarifas en Ajustes para auto-precios`);
    } catch (e: any) {
      setError(`Error STEP: ${e?.message || 'No se pudo conectar con el analizador. ¿Está corriendo api.py?'}`);
    }
    setStepLoading(false);
  };

  const calcTotal = (partidas: CotizacionPartida[]) =>
    Math.round(partidas.reduce((acc, p) => acc + p.subtotal, 0) * 1.16);

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    const { id, ...payload } = edit as any;
    const precio_total = edit.partidas?.length ? calcTotal(edit.partidas) : edit.precio_total ?? 0;
    const rec = {
      ...payload,
      precio_total,
      numero_cotizacion: isNew ? nextNumCot(rows.length) : payload.numero_cotizacion,
      tenant_id: tenantId || 'mcvill',
      updated_at: new Date().toISOString(),
    };
    const { error: e } = isNew
      ? await supabase.from('cotizaciones').insert(rec)
      : await supabase.from('cotizaciones').update(rec).eq('id', id);
    if (e) setError(e.message); else { closeEdit(); load(); }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    await supabase.from('cotizaciones').delete().eq('id', delId);
    setDelId(null); load();
  };

  const downloadPDF = (r: Cotizacion) => {
    const cliente = clientes.find(c => c.razon_social === r.cliente_nombre) || null;
    generateCotizacionPDF(r, cliente, { brandName: config.brandName, companyCity: config.companyCity, supportEmail: config.supportEmail });
  };

  // Opciones de clientes para el combobox
  const clienteOpts = clientes.map(c => ({ value: c.razon_social, label: c.razon_social, sub: c.ciudad || undefined }));

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <Toolbar search={search} onSearch={setSearch} placeholder="Filtro cotizaciones..." onNew={openNew} label="Nueva Cotización" />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-in fade-in duration-200 shrink-0">
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{selectedIds.length} SELECCIONADOS</span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
            >
              <Trash2 size={10} /> DAR DE BAJA
            </button>
          </div>
        )}
      </div>
      {error && <ErrorBar msg={error} onClose={() => setError(null)} />}

      <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
        {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyRow label="cotizaciones" onNew={openNew} /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/40">
                  <th className="w-10 px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-white/10 bg-black/40 text-mcvill-accent focus:ring-mcvill-accent w-3 h-3 cursor-pointer"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filtered.map(r => (r as any).id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  {['N° Cot.', 'Cliente', 'N° Parte', 'Total c/IVA', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((r, i) => {
                  const isSelected = selectedIds.includes((r as any).id);
                  return (
                    <tr key={(r as any).id} className={`hover:bg-blue-500/5 transition-colors group ${isSelected ? 'bg-white/[0.02]' : ''}`}>
                      <td className="w-10 px-4 py-1.5 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-white/10 bg-black/40 text-mcvill-accent focus:ring-mcvill-accent w-3 h-3 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, (r as any).id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== (r as any).id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[10px] text-emerald-300 font-black">{r.numero_cotizacion || '—'}</td>
                      <td className="px-4 py-1.5 text-white text-[11px] font-black">{r.cliente_nombre || '—'}</td>
                      <td className="px-4 py-1.5 text-slate-500 text-[10px] font-mono">{r.numero_parte || '—'}</td>
                      <td className="px-4 py-1.5 text-[10px] font-mono text-white font-black">
                        ${(r.precio_total ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${ESTADO_COT[r.estado || 'borrador'] || ESTADO_COT.borrador}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => downloadPDF(r)} title="PDF"
                            className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                            <Download size={10} />
                          </button>
                          <button onClick={() => openEdit(r)} className="p-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"><Pencil size={10} /></button>
                          <button onClick={() => setDelId((r as any).id)} className="p-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"><Trash2 size={10} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {edit && (
          <Drawer 
            title={isNew ? 'Nueva Cotización' : `Editar ${edit.numero_cotizacion || 'Cotización'}`} 
            onClose={closeEdit} 
            wide
            footer={
              <div className="flex gap-3">
                <SaveBtn saving={saving} onClick={save} />
                {(edit.partidas?.length ?? 0) > 0 && (
                  <button onClick={() => downloadPDF(edit)}
                    className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase border transition-all hover:bg-blue-500/10 text-blue-400 border-blue-500/30 bg-blue-500/5">
                    <Download size={16} /> PDF
                  </button>
                )}
              </div>
            }
          >

            {/* ── Viajero selector (inline dropdown) ── */}
            <Field label={<>Viajero de Producción <span className="text-slate-600 normal-case font-normal">(opcional)</span></>}>
              <div className="mt-1">
                <ViajeroDropdown
                  selected={selectedViajero}
                  onSelect={handleSelectViajero}
                  onClear={() => { setSelectedViajero(null); setEdit(p => ({ ...p!, viajero_id: undefined })); }}
                />
              </div>
            </Field>

            {/* ── Analizar STEP ── */}
            <Field label={<>Archivo STEP <span className="text-slate-600 normal-case font-normal">(opcional — extrae geometría automáticamente)</span></>}>
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={stepMaterial}
                    onChange={e => setStepMaterial(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all"
                  >
                    {['acero', 'inoxidable', 'aluminio', 'cobre', 'bronce'].map(m => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => stepInputRef.current?.click()}
                    disabled={stepLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-dashed border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-white text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {stepLoading
                      ? <><Loader2 size={15} className="animate-spin" /> Analizando…</>
                      : <><Upload size={15} /> Cargar STEP</>}
                  </button>
                  <input
                    ref={stepInputRef}
                    type="file"
                    accept=".step,.stp"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleStepFile(f); e.target.value = ''; }}
                  />
                </div>
                {stepSuccess && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-bold">
                    <CheckCircle2 size={13} className="shrink-0" />
                    {stepSuccess} — partidas pre-llenadas, agrega precios unitarios
                  </motion.div>
                )}
              </div>
            </Field>

            {/* ── Generar con IA ── */}
            {selectedViajero && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                {aiSuccess ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                    <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                    <p className="text-xs font-black text-blue-400 flex-1">Cotización generada — revisa las partidas</p>
                    <button onClick={handleGenerateAI} disabled={generatingAI}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider hover:opacity-80 disabled:opacity-40 transition-all">
                      <Sparkles size={11} /> Regenerar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateAI}
                    disabled={generatingAI}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/70 text-blue-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {generatingAI
                      ? <Loader2 size={18} className="animate-spin text-blue-400" />
                      : <Sparkles size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />}
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-widest">
                        {generatingAI ? 'Generando cotización...' : 'Generar con IA'}
                      </p>
                      {!generatingAI && (
                        <p className="text-[10px] text-slate-500 font-normal normal-case tracking-normal">
                          Calcula costos de operaciones y materiales para {selectedViajero.numero_parte}
                        </p>
                      )}
                    </div>
                  </button>
                )}
              </motion.div>
            )}

            {/* ── Campos principales ── */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cliente *">
                <Combobox
                  value={edit.cliente_nombre || ''}
                  onChange={v => setEdit(p => ({ ...p!, cliente_nombre: v }))}
                  options={clienteOpts}
                  placeholder="Razón social del cliente..."
                />
              </Field>
              <Field label="Número de Parte">
                <input value={edit.numero_parte || ''} onChange={e => setEdit(p => ({ ...p!, numero_parte: e.target.value }))} className={inputCls + ' mt-1'} placeholder="MC-2024-001" />
              </Field>
            </div>

            <Field label="Descripción del servicio">
              <textarea value={edit.descripcion || ''} onChange={e => setEdit(p => ({ ...p!, descripcion: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} placeholder="Fabricación de piezas de precisión..." />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vigencia">
                <Combobox
                  value={String(edit.vigencia_horas ?? 72)}
                  onChange={v => setEdit(p => ({ ...p!, vigencia_horas: parseInt(v) || 72 }))}
                  options={VIGENCIA_OPTS.map(([val, lbl]) => ({ value: val, label: lbl }))}
                  placeholder="72 horas..."
                />
              </Field>
              <Field label="Estado">
                <Sel value={edit.estado || 'borrador'} onChange={v => setEdit(p => ({ ...p!, estado: v }))}
                  options={[['borrador','Borrador'],['enviada','Enviada'],['aprobada','Aprobada'],['rechazada','Rechazada'],['vencida','Vencida']]} />
              </Field>
            </div>

            {/* ── Partidas ── */}
            <PartidasEditor
              partidas={edit.partidas || []}
              onChange={partidas => setEdit(p => ({ ...p!, partidas, precio_total: calcTotal(partidas) }))}
            />

            {/* ── Propuesta y notas ── */}
            <Field label="Texto de propuesta (para PDF)">
              <textarea value={edit.texto_propuesta || ''} onChange={e => setEdit(p => ({ ...p!, texto_propuesta: e.target.value }))} rows={3} className={inputCls + ' mt-1 resize-none'} placeholder="Estimado cliente, nos complace presentar nuestra propuesta..." />
            </Field>
            <Field label="Notas internas">
              <textarea value={edit.notas || ''} onChange={e => setEdit(p => ({ ...p!, notas: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} placeholder="Observaciones internas..." />
            </Field>

            {error && <ErrorBar msg={error} onClose={() => setError(null)} />}

          </Drawer>
        )}
        {delId && <DeleteConfirm onCancel={() => setDelId(null)} onConfirm={del} />}
      </AnimatePresence>
    </div>
  );
};

// ─── Tarifas Tab ─────────────────────────────────────────────────────────────

interface TarifaRow {
  id: string;
  concepto_key: string;
  etiqueta: string;
  unidad: string;
  precio_unitario: number;
  updated_at?: string;
}

const TarifasTab: React.FC = () => {
  const [tarifas, setTarifas]   = useState<TarifaRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [editando, setEditando] = useState<Record<string, string>>({});
  const [saved, setSaved]       = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('tarifas_cotizacion').select('*').eq('activo', true).order('etiqueta');
    setTarifas(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChange = (id: string, val: string) => setEditando(prev => ({ ...prev, [id]: val }));

  const guardar = async (t: TarifaRow) => {
    const nuevo = parseFloat(editando[t.id] ?? String(t.precio_unitario));
    if (isNaN(nuevo)) return;
    setSaving(t.id);
    const now = new Date().toISOString();
    await supabase.from('tarifas_cotizacion').update({ precio_unitario: nuevo, updated_at: now }).eq('id', t.id);
    setTarifas(prev => prev.map(x => x.id === t.id ? { ...x, precio_unitario: nuevo, updated_at: now } : x));
    setEditando(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    setSaving(null);
    setSaved(t.id);
    setTimeout(() => setSaved(null), 2500);
  };

  const fmtFecha = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const inputCls2 = 'w-32 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm text-white text-right focus:outline-none focus:border-emerald-500/50 transition-all';

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
          <Zap size={20} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-tight">TARIFAS DE COTIZACIÓN</h3>
          <p className="text-[10px] text-slate-500">Precios base para analítica STEP</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 role="status" aria-label="Cargando" size={24} className="animate-spin text-emerald-400" /></div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_60px_120px_100px_40px] gap-2 px-3 pb-1">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Concepto</span>
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Unidad</span>
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-right">P. Unitario</span>
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Update</span>
            <span></span>
          </div>

          {tarifas.length === 0 ? (
            <div className="py-12 text-center text-[10px] text-slate-600 font-bold uppercase">Sin registros</div>
          ) : tarifas.map(t => {
            const val   = editando[t.id] !== undefined ? editando[t.id] : String(t.precio_unitario);
            const dirty = editando[t.id] !== undefined && parseFloat(editando[t.id]) !== t.precio_unitario;
            const ok    = saved === t.id;

            return (
              <div key={t.id} className="grid grid-cols-[1fr_60px_120px_100px_40px] gap-2 items-center px-3 py-1.5 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-all">
                <span className="text-[10px] text-white font-bold uppercase truncate">{t.etiqueta}</span>
                <span className="text-[9px] text-center text-slate-400 font-mono bg-white/5 rounded px-1.5 py-0.5">{t.unidad}</span>
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-slate-600 text-[10px]">$</span>
                  <input
                    type="number" min="0" step="0.01" value={val}
                    onChange={e => handleChange(t.id, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && guardar(t)}
                    className={inputCls2 + (dirty ? ' border-orange-500/50' : '') + ' h-7 py-0 text-[10px]'}
                  />
                </div>
                <div className="text-center">
                  <span className="text-[8px] text-slate-600 font-mono uppercase">{fmtFecha(t.updated_at)}</span>
                </div>
                <div className="flex justify-center">
                  {ok ? (
                    <CheckCircle2 size={12} className="text-emerald-400" />
                  ) : dirty ? (
                    <button onClick={() => guardar(t)} disabled={saving === t.id}
                      className="flex items-center gap-1 p-1 rounded bg-emerald-500 text-white hover:opacity-90 disabled:opacity-50 transition-all">
                      {saving === t.id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main ────────────────────────────────────────────────────────────────────

export const VentasPanel: React.FC<{ initialTab?: TabId }> = ({ initialTab }) => {
  const { language } = useLanguage();
  const [tab, setTab] = useState<TabId>(initialTab || 'clientes');
  const [isOCModalOpen, setIsOCModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const isFactibilidad = tab === 'factibilidad';

  const handleExportPDF = async () => {
    if (tab === 'cotizaciones') {
      const { data } = await supabase
        .from('cotizaciones')
        .select('numero_cotizacion, cliente_nombre, fecha_cotizacion, monto_total, estatus, fecha_vigencia')
        .order('fecha_cotizacion', { ascending: false })
        .limit(200);
      const rows = (data ?? []).map((r: any) => ({
        NO_COTIZACION: r.numero_cotizacion ?? '—',
        CLIENTE: r.cliente_nombre ?? '—',
        FECHA: r.fecha_cotizacion ? new Date(r.fecha_cotizacion).toLocaleDateString('es-MX') : '—',
        MONTO_TOTAL: r.monto_total != null ? `$${Number(r.monto_total).toLocaleString('es-MX')}` : '—',
        ESTATUS: r.estatus?.toUpperCase() ?? '—',
        VIGENCIA: r.fecha_vigencia ? new Date(r.fecha_vigencia).toLocaleDateString('es-MX') : '—',
      }));
      reportUtils.exportToPDF('Reporte de Cotizaciones — Ventas', rows.length ? rows : [{ AVISO: 'Sin cotizaciones registradas' }], 'reporte_cotizaciones', 'VENTAS');
    } else if (tab === 'clientes') {
      const { data } = await supabase.from('clientes').select('nombre, rfc, ciudad, contacto_nombre, email').order('nombre');
      const rows = (data ?? []).map((r: any) => ({
        CLIENTE: r.nombre ?? '—',
        RFC: r.rfc ?? '—',
        CIUDAD: r.ciudad ?? '—',
        CONTACTO: r.contacto_nombre ?? '—',
        EMAIL: r.email ?? '—',
      }));
      reportUtils.exportToPDF('Directorio de Clientes', rows.length ? rows : [{ AVISO: 'Sin clientes registrados' }], 'directorio_clientes', 'VENTAS');
    } else {
      reportUtils.exportToPDF('Resumen Ventas & CRM', [{ MODULO: tab.toUpperCase(), NOTA: 'Selecciona la pestaña Cotizaciones o Clientes para exportar.' }], 'ventas_resumen', 'VENTAS');
    }
  };

  const tabLabels: Record<TabId, string> = {
    clientes: language === 'en' ? 'Clients' : 'Clientes',
    factibilidad: language === 'en' ? 'Feasibility' : 'Factibilidad',
    cotizaciones: language === 'en' ? 'Quotes' : 'Cotizaciones',
    ordenes_compra: language === 'en' ? 'Purchase Orders' : 'Órdenes de Compra',
    tarifas: language === 'en' ? 'Rates' : 'Tarifas',
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header Section — Compact Industrial Style */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            {isFactibilidad ? (
              <ShieldAlert className="text-blue-500" size={20} />
            ) : (
              <MoneyIcon className="text-blue-500" size={20} />
            )}
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tighter uppercase">
              {isFactibilidad ? (
                language === 'en' ? <>FEASIBILITY <span className="text-blue-500">REPORT</span></> : <>DICTAMEN DE <span className="text-blue-500">FACTIBILIDAD</span></>
              ) : (
                language === 'en' ? <>SALES & CRM <span className="text-blue-500">MANAGEMENT</span></> : <>CONTROL DE <span className="text-blue-500">VENTAS & CRM</span></>
              )}
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              {isFactibilidad 
                ? (language === 'en' ? 'Risk Analysis' : 'Análisis de Riesgos') 
                : (language === 'en' ? 'Commercial Pipeline' : 'Pipeline Comercial')}{' '}
              <span className="hidden sm:inline px-1.5 py-0.5 rounded-lg bg-mcvill-accent/10 border border-mcvill-accent/30 text-[8px]">
                {isFactibilidad ? 'RISK-PRO' : 'SALES-PRO'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <FileDown size={11} /> EXPORTAR PDF
          </button>
          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            {isFactibilidad ? 'RISK_ANALYSIS: ' : 'CRM_ACTIVE_FLOW: '}
            <span className={isFactibilidad ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}>SYNCED</span>
          </div>
          <PrintButton />
        </div>
      </div>

      {/* Tab bar — Compact */}
      <div className="px-4 pt-1 flex items-end gap-1 border-b border-white/5 bg-slate-900/20 shrink-0">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-t-xl border-x border-t text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive ? 'bg-slate-900 border-white/10 text-blue-400 border-b-slate-900 shadow-[0_-4px_12px_rgba(59,130,246,0.05)]' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              <Icon size={12} />{tabLabels[t.id]}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }} className="h-full overflow-y-auto custom-scrollbar">
            {tab === 'clientes'       && <ClientesTab />}
            {tab === 'factibilidad'   && <div className="p-6"><FactibilidadGatekeeper hideHeader={true} /></div>}
            {tab === 'cotizaciones'   && <CotizacionesTab />}
            {tab === 'ordenes_compra' && <div className="p-4 h-full"><OCManagerModal isOpen={true} onClose={() => {}} isInline={true} /></div>}
            {tab === 'tarifas'        && <TarifasTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      <OCManagerModal
        isOpen={isOCModalOpen}
        onClose={() => setIsOCModalOpen(false)}
      />
    </div>
  );
};

export default VentasPanel;
