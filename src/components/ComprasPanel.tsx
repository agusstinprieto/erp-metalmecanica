import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Package, Wrench, Plus, Pencil, Trash2, Save, X,
  Loader2, AlertCircle, Search, ChevronRight, FileText, ShoppingCart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OCProveedorManagerModal } from './OCProveedorManagerModal';
import { useTenant } from '../hooks/useTenant';

type TabId = 'proveedores' | 'materiales' | 'operaciones' | 'ordenes_compra';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'proveedores',   label: 'Proveedores',      icon: Truck         },
  { id: 'materiales',   label: 'Materiales',        icon: Package       },
  { id: 'operaciones',  label: 'Operaciones',       icon: Wrench        },
  { id: 'ordenes_compra', label: 'Órdenes de Compra', icon: ShoppingCart },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Proveedor {
  id?: string;
  razon_social: string;
  rfc?: string;
  categoria?: string;
  nombre_contacto?: string;
  email?: string;
  telefono?: string;
  ciudad?: string;
  condicion_pago?: string;
  notas?: string;
  activo?: boolean;
}

interface Material {
  id?: string;
  clave: string;
  descripcion: string;
  tipo?: string;
  unidad_medida?: string;
  precio_unitario?: number;
  stock_actual?: number;
  stock_minimo?: number;
  notas?: string;
}

interface Operacion {
  id?: string;
  clave: string;
  nombre: string;
  centro_trabajo?: string;
  tarifa_hora?: number;
  tiempo_configuracion_default?: number;
  notas?: string;
}

// ─── Shared helpers ─────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-black/40 border border-white/10 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-700';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

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
          className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-[10px] text-white focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-slate-700" />
      </div>
      <button onClick={onNew} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80 text-amber-400 border-amber-500/30 bg-amber-500/10">
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

const EmptyRow: React.FC<{ icon: React.ElementType; label: string; onNew: () => void }> = ({ icon: Icon, label, onNew }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <Icon className="w-10 h-10 text-slate-700" />
    <p className="text-sm text-slate-600">No hay {label} registrados</p>
    <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest text-amber-400 border-amber-500/30 bg-amber-500/10">
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

const Drawer: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 top-16 left-64 bg-black/60 backdrop-blur-sm z-40" />
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-950 border-l border-white/10 z-50 overflow-y-auto">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between sticky top-0 bg-slate-950 pb-3 border-b border-white/5 z-10">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-all"><X size={14} /></button>
        </div>
        {children}
      </div>
    </motion.div>
  </>
);

const SaveBtn: React.FC<{ saving: boolean; onClick: () => void }> = ({ saving, onClick }) => (
  <button onClick={onClick} disabled={saving}
    className="w-full py-2.5 rounded-lg font-black text-[9px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all border hover:opacity-80 disabled:opacity-50 text-amber-400 border-amber-500/30 bg-amber-500/10">
    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
    {saving ? 'Guardando...' : 'Guardar Cambios'}
  </button>
);

const DeleteConfirm: React.FC<{ onCancel: () => void; onConfirm: () => void }> = ({ onCancel, onConfirm }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel} className="fixed inset-0 top-16 left-64 bg-black/70 backdrop-blur-sm z-50" />
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 top-16 left-64 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950 border border-rose-500/20 rounded-[2rem] p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/20"><Trash2 className="w-5 h-5 text-rose-400" /></div>
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

// ─── PROVEEDORES TAB ────────────────────────────────────────────────────────────

const EMPTY_PROV: Proveedor = { razon_social: '', rfc: '', categoria: 'material', nombre_contacto: '', email: '', telefono: '', ciudad: '', condicion_pago: 'credito_30', notas: '', activo: true };

const ProveedoresTab: React.FC = () => {
  const tenantId = useTenant();
  const [rows, setRows]     = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [edit, setEdit]     = useState<Proveedor | null>(null);
  const [isNew, setIsNew]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId]   = useState<string | null>(null);

  const [schemaError, setSchemaError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSchemaError(false);
    const { data, error: e } = await supabase.from('proveedores').select('*').order('razon_social');
    if (e) {
      setError(e.message);
      if (e.message.includes('Could not find the table')) setSchemaError(true);
    } else {
      setRows(data || []);
    }
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
      ? await supabase.from('proveedores').insert(rec)
      : await supabase.from('proveedores').update(rec).eq('id', id);
    if (e) setError(e.message); else { setEdit(null); load(); }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    const { error: e } = await supabase.from('proveedores').delete().eq('id', delId);
    if (e) { setError(e.message); setDelId(null); return; }
    setDelId(null); load();
  };

  const CAT_LABEL: Record<string, string> = { material: 'Material', servicio: 'Servicio', maquila: 'Maquila', herramienta: 'Herramienta', otro: 'Otro' };

  return (
    <div className="p-4 space-y-3">
      <Toolbar search={search} onSearch={setSearch} placeholder="Filtro proveedores..." onNew={() => { setEdit({ ...EMPTY_PROV }); setIsNew(true); }} label="Nuevo Proveedor" />
      {error && <ErrorBar msg={error} onClose={() => setError(null)} />}

      {schemaError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertCircle size={20} />
            <span className="font-black text-[10px] uppercase tracking-widest">Error de Base de Datos Detectado</span>
          </div>
          <p className="text-[11px] text-slate-400">
            La tabla <code className="text-rose-300">proveedores</code> no existe. Ejecuta este SQL en Supabase:
          </p>
          <pre className="bg-black/40 p-3 rounded-lg text-[9px] font-mono text-emerald-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    razon_social TEXT NOT NULL,
    rfc TEXT,
    categoria TEXT DEFAULT 'material',
    nombre_contacto TEXT,
    email TEXT,
    telefono TEXT,
    ciudad TEXT,
    condicion_pago TEXT DEFAULT 'credito_30',
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON proveedores FOR ALL USING (true);`}
          </pre>
        </div>
      )}

      <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
        {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyRow icon={Truck} label="proveedores" onNew={() => { setEdit({ ...EMPTY_PROV }); setIsNew(true); }} /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <THead cols={['Razón Social', 'RFC', 'Categoría', 'Contacto', 'Cond. Pago', '']} />
              <tbody className="divide-y divide-white/5">
                {filtered.map((r, i) => (
                  <tr key={(r as any).id} className="hover:bg-amber-500/5 transition-colors group">
                    <td className="px-4 py-1.5 text-white text-[11px] font-black">{r.razon_social}</td>
                    <td className="px-4 py-1.5 text-slate-500 text-[10px] font-mono">{r.rfc || '—'}</td>
                    <td className="px-4 py-1.5 text-xs">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {CAT_LABEL[r.categoria || 'otro'] || r.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-slate-400 text-[10px]">{r.nombre_contacto || '—'}</td>
                    <td className="px-4 py-1.5 text-slate-500 text-[10px] font-mono">{r.condicion_pago?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-1.5 text-right"><RowActions onEdit={() => { setEdit({ ...r }); setIsNew(false); }} onDel={() => setDelId((r as any).id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AnimatePresence>
        {edit && (
          <Drawer title={isNew ? 'Nuevo Proveedor' : 'Editar Proveedor'} onClose={() => setEdit(null)}>
            <Field label="Razón Social *"><input value={edit.razon_social} onChange={e => setEdit(p => ({ ...p!, razon_social: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="RFC"><input value={edit.rfc || ''} onChange={e => setEdit(p => ({ ...p!, rfc: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Ciudad"><input value={edit.ciudad || ''} onChange={e => setEdit(p => ({ ...p!, ciudad: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Categoría">
              <Sel value={edit.categoria || 'material'} onChange={v => setEdit(p => ({ ...p!, categoria: v }))}
                options={[['material','Material'],['servicio','Servicio'],['maquila','Maquila'],['herramienta','Herramienta'],['otro','Otro']]} />
            </Field>
            <Field label="Contacto"><input value={edit.nombre_contacto || ''} onChange={e => setEdit(p => ({ ...p!, nombre_contacto: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email"><input type="email" value={edit.email || ''} onChange={e => setEdit(p => ({ ...p!, email: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Teléfono"><input value={edit.telefono || ''} onChange={e => setEdit(p => ({ ...p!, telefono: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Condición de Pago">
              <Sel value={edit.condicion_pago || 'credito_30'} onChange={v => setEdit(p => ({ ...p!, condicion_pago: v }))}
                options={[['contado','Contado'],['credito_15','Crédito 15 días'],['credito_30','Crédito 30 días'],['credito_60','Crédito 60 días'],['credito_90','Crédito 90 días']]} />
            </Field>
            <Field label="Notas"><textarea value={edit.notas || ''} onChange={e => setEdit(p => ({ ...p!, notas: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} /></Field>
            {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
            <SaveBtn saving={saving} onClick={save} />
          </Drawer>
        )}
        {delId && <DeleteConfirm onCancel={() => setDelId(null)} onConfirm={del} />}
      </AnimatePresence>
    </div>
  );
};

// ─── MATERIALES TAB ─────────────────────────────────────────────────────────────

const EMPTY_MAT: Material = { clave: '', descripcion: '', tipo: 'placa', unidad_medida: 'kg', precio_unitario: 0, stock_actual: 0, stock_minimo: 0, notas: '' };

const MaterialesTab: React.FC = () => {
  const tenantId = useTenant();
  const [rows, setRows]     = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [edit, setEdit]     = useState<Material | null>(null);
  const [isNew, setIsNew]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId]   = useState<string | null>(null);

  const [schemaError, setSchemaError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSchemaError(false);
    const { data, error: e } = await supabase.from('materiales_catalogo').select('*').order('clave');
    if (e) {
      setError(e.message);
      if (e.message.includes('Could not find the table') || e.code === 'PGRST116') {
        setSchemaError(true);
      }
    } else {
      setRows(data || []);
    }
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
      ? await supabase.from('materiales_catalogo').insert(rec)
      : await supabase.from('materiales_catalogo').update(rec).eq('id', id);
    if (e) setError(e.message); else { setEdit(null); load(); }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    const { error: e } = await supabase.from('materiales_catalogo').delete().eq('id', delId);
    if (e) { setError(e.message); setDelId(null); return; }
    setDelId(null); load();
  };

  return (
    <div className="p-4 space-y-3">
      <Toolbar search={search} onSearch={setSearch} placeholder="Filtro materiales..." onNew={() => { setEdit({ ...EMPTY_MAT }); setIsNew(true); }} label="Nuevo Material" />
      {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
      
      {schemaError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertCircle size={20} />
            <span className="font-black text-[10px] uppercase tracking-widest">Error de Base de Datos Detectado</span>
          </div>
          <p className="text-[11px] text-slate-400">
            La tabla <code className="text-rose-300">materiales_catalogo</code> no existe en el esquema actual. 
            Para solucionar esto, copia y ejecuta el siguiente SQL en el **SQL Editor** de tu Dashboard de Supabase:
          </p>
          <pre className="bg-black/40 p-3 rounded-lg text-[9px] font-mono text-emerald-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS materiales_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    clave TEXT UNIQUE NOT NULL,
    descripcion TEXT NOT NULL,
    tipo TEXT DEFAULT 'placa',
    unidad_medida TEXT DEFAULT 'kg',
    precio_unitario NUMERIC DEFAULT 0,
    stock_actual NUMERIC DEFAULT 0,
    stock_minimo NUMERIC DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE materiales_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON materiales_catalogo FOR ALL USING (true);`}
          </pre>
          <button 
            onClick={load}
            className="text-[9px] font-black uppercase text-white bg-rose-500/20 hover:bg-rose-500/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            Reintentar Conexión
          </button>
        </div>
      )}

      <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
        {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyRow icon={Package} label="materiales" onNew={() => { setEdit({ ...EMPTY_MAT }); setIsNew(true); }} /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <THead cols={['Clave', 'Descripción', 'U/M', 'P. Unit', 'Stock', 'Min', '']} />
              <tbody className="divide-y divide-white/5">
                {filtered.map((r, i) => (
                  <tr key={(r as any).id} className="hover:bg-blue-500/5 transition-colors group">
                    <td className="px-4 py-1.5 font-mono text-[10px] text-amber-300 font-black">{r.clave}</td>
                    <td className="px-4 py-1.5 text-white text-[11px] font-black max-w-[180px] truncate">{r.descripcion}</td>
                    <td className="px-4 py-1.5 text-slate-500 text-[10px] uppercase">{r.unidad_medida || '—'}</td>
                    <td className="px-4 py-1.5 text-[10px] font-mono text-white">${(r.precio_unitario ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-[10px] font-mono">
                      <span className={`font-black ${(r.stock_actual ?? 0) <= (r.stock_minimo ?? 0) ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {r.stock_actual ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-slate-500 text-[10px] font-mono">{r.stock_minimo ?? 0}</td>
                    <td className="px-4 py-1.5 text-right"><RowActions onEdit={() => { setEdit({ ...r }); setIsNew(false); }} onDel={() => setDelId((r as any).id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AnimatePresence>
        {edit && (
          <Drawer title={isNew ? 'Nuevo Material' : 'Editar Material'} onClose={() => setEdit(null)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Clave *"><input value={edit.clave} onChange={e => setEdit(p => ({ ...p!, clave: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Unidad de Medida"><input value={edit.unidad_medida || ''} onChange={e => setEdit(p => ({ ...p!, unidad_medida: e.target.value }))} className={inputCls + ' mt-1'} placeholder="kg, pza, m, lt..." /></Field>
            </div>
            <Field label="Descripción *"><input value={edit.descripcion} onChange={e => setEdit(p => ({ ...p!, descripcion: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <Field label="Tipo">
              <Sel value={edit.tipo || 'placa'} onChange={v => setEdit(p => ({ ...p!, tipo: v }))}
                options={[['placa','Placa / Lámina'],['tubo','Tubo / Perfil'],['barra','Barra'],['consumible','Consumible'],['refaccion','Refacción'],['herramienta','Herramienta'],['otro','Otro']]} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Precio Unit. ($)"><input type="number" value={edit.precio_unitario ?? 0} onChange={e => setEdit(p => ({ ...p!, precio_unitario: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Stock Actual"><input type="number" value={edit.stock_actual ?? 0} onChange={e => setEdit(p => ({ ...p!, stock_actual: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="Stock Mínimo"><input type="number" value={edit.stock_minimo ?? 0} onChange={e => setEdit(p => ({ ...p!, stock_minimo: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Notas"><textarea value={edit.notas || ''} onChange={e => setEdit(p => ({ ...p!, notas: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} /></Field>
            {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
            <SaveBtn saving={saving} onClick={save} />
          </Drawer>
        )}
        {delId && <DeleteConfirm onCancel={() => setDelId(null)} onConfirm={del} />}
      </AnimatePresence>
    </div>
  );
};

// ─── OPERACIONES TAB ────────────────────────────────────────────────────────────

const EMPTY_OP: Operacion = { clave: '', nombre: '', centro_trabajo: '', tarifa_hora: 0, tiempo_configuracion_default: 0, notas: '' };

const OperacionesTab: React.FC = () => {
  const tenantId = useTenant();
  const [rows, setRows]     = useState<Operacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [edit, setEdit]     = useState<Operacion | null>(null);
  const [isNew, setIsNew]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId]   = useState<string | null>(null);

  const [schemaError, setSchemaError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSchemaError(false);
    const { data, error: e } = await supabase.from('operaciones_catalogo').select('*').order('clave');
    if (e) {
      setError(e.message);
      if (e.message.includes('Could not find the table')) setSchemaError(true);
    } else {
      setRows(data || []);
    }
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
      ? await supabase.from('operaciones_catalogo').insert(rec)
      : await supabase.from('operaciones_catalogo').update(rec).eq('id', id);
    if (e) setError(e.message); else { setEdit(null); load(); }
    setSaving(false);
  };

  const del = async () => {
    if (!delId) return;
    const { error: e } = await supabase.from('operaciones_catalogo').delete().eq('id', delId);
    if (e) { setError(e.message); setDelId(null); return; }
    setDelId(null); load();
  };

  return (
    <div className="p-4 space-y-3">
      <Toolbar search={search} onSearch={setSearch} placeholder="Filtro operaciones..." onNew={() => { setEdit({ ...EMPTY_OP }); setIsNew(true); }} label="Nueva Operación" />
      {error && <ErrorBar msg={error} onClose={() => setError(null)} />}

      {schemaError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertCircle size={20} />
            <span className="font-black text-[10px] uppercase tracking-widest">Error de Base de Datos Detectado</span>
          </div>
          <p className="text-[11px] text-slate-400">
            La tabla <code className="text-rose-300">operaciones_catalogo</code> no existe. Ejecuta este SQL en Supabase:
          </p>
          <pre className="bg-black/40 p-3 rounded-lg text-[9px] font-mono text-emerald-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS operaciones_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT 'mcvill',
    clave TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    centro_trabajo TEXT,
    tarifa_hora NUMERIC DEFAULT 0,
    tiempo_configuracion_default NUMERIC DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE operaciones_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON operaciones_catalogo FOR ALL USING (true);`}
          </pre>
        </div>
      )}

      <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
        {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyRow icon={Wrench} label="operaciones" onNew={() => { setEdit({ ...EMPTY_OP }); setIsNew(true); }} /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <THead cols={['Clave', 'Nombre', 'Tarifa/Hr', '$/Min', 'Config', '']} />
              <tbody className="divide-y divide-white/5">
                {filtered.map((r, i) => (
                  <tr key={(r as any).id} className="hover:bg-blue-500/5 transition-colors group">
                    <td className="px-4 py-1.5 font-mono text-[10px] text-amber-300 font-black">{r.clave}</td>
                    <td className="px-4 py-1.5 text-white text-[11px] font-black">{r.nombre}</td>
                    <td className="px-4 py-1.5 text-[10px] font-mono text-white">${(r.tarifa_hora ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-[10px] font-mono text-amber-400 font-black">${((r.tarifa_hora ?? 0) / 60).toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-slate-500 text-[10px] font-mono">{r.tiempo_configuracion_default ?? 0}m</td>
                    <td className="px-4 py-1.5 text-right"><RowActions onEdit={() => { setEdit({ ...r }); setIsNew(false); }} onDel={() => setDelId((r as any).id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AnimatePresence>
        {edit && (
          <Drawer title={isNew ? 'Nueva Operación' : 'Editar Operación'} onClose={() => setEdit(null)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Clave *"><input value={edit.clave} onChange={e => setEdit(p => ({ ...p!, clave: e.target.value }))} className={inputCls + ' mt-1'} placeholder="CNC-01, SOLD-01..." /></Field>
              <Field label="Centro de Trabajo"><input value={edit.centro_trabajo || ''} onChange={e => setEdit(p => ({ ...p!, centro_trabajo: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Nombre *"><input value={edit.nombre} onChange={e => setEdit(p => ({ ...p!, nombre: e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tarifa por Hora ($)"><input type="number" value={edit.tarifa_hora ?? 0} onChange={e => setEdit(p => ({ ...p!, tarifa_hora: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
              <Field label="T. Configuración (min)"><input type="number" value={edit.tiempo_configuracion_default ?? 0} onChange={e => setEdit(p => ({ ...p!, tiempo_configuracion_default: +e.target.value }))} className={inputCls + ' mt-1'} /></Field>
            </div>
            <Field label="Notas"><textarea value={edit.notas || ''} onChange={e => setEdit(p => ({ ...p!, notas: e.target.value }))} rows={2} className={inputCls + ' mt-1 resize-none'} /></Field>
            {error && <ErrorBar msg={error} onClose={() => setError(null)} />}
            <SaveBtn saving={saving} onClick={save} />
          </Drawer>
        )}
        {delId && <DeleteConfirm onCancel={() => setDelId(null)} onConfirm={del} />}
      </AnimatePresence>
    </div>
  );
};

// ─── Main ───────────────────────────────────────────────────────────────────────

export const ComprasPanel: React.FC = () => {
  const [tab, setTab] = useState<TabId>('proveedores');
  const tenantId = useTenant();

  const TAB_COLOR: Record<TabId, string> = {
    proveedores:   'text-amber-400',
    materiales:    'text-blue-400',
    operaciones:   'text-blue-400',
    ordenes_compra: 'text-amber-400',
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header Panel — Compact Industrial */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Truck size={20} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tighter uppercase">
              ABASTECIMIENTO <span className="text-blue-500">& COMPRAS</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              Cadena de Suministro <span className="hidden sm:inline px-1.5 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[8px]">SUPPLY-PRO</span>
            </p>
          </div>
        </div>
        
        <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
          CADENA DE SUMINISTRO: <span className="text-amber-400">ACTIVO</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-0 flex items-end gap-1 border-b border-white/5 bg-slate-900/20">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl border-x border-t text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive ? `bg-slate-900 border-white/10 ${TAB_COLOR[t.id]} border-b-slate-900` : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              <Icon size={12} />{t.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }} className="h-full overflow-y-auto custom-scrollbar">
            {tab === 'proveedores'    && <ProveedoresTab />}
            {tab === 'materiales'     && <MaterialesTab />}
            {tab === 'operaciones'    && <OperacionesTab />}
            {tab === 'ordenes_compra' && (
              <OCProveedorManagerModal isOpen={true} onClose={() => {}} isInline={true} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ComprasPanel;
