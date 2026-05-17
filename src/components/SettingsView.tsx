import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  Users,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Search,
  Loader2,
  History,
  Activity,
  Clock,
  Cpu,
  Key,
  Globe,
  Zap,
  Terminal,
  Database,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Filter,
  Palette,
  Layout,
  Server,
  Save,
  BookOpen,
  Plus,
  Trash2,
  Upload,
  FileText,
  Edit3,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { UserFormModal } from './UserFormModal';
import { Toast } from './common/Toast';
import { userService } from '../services/userService';
import { auditService } from '../services/auditService';
import type { AuditLog } from '../services/auditService';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { useConfig } from '../contexts/ConfigContext';
import { tenantService } from '../services/tenantService';
import { appConfirm } from '../lib/dialogs';
import type { TenantConfig } from '../services/tenantService';
import { shiftService, type WorkShift } from '../services/shiftService';
import { ShiftFormModal } from './ShiftFormModal';

interface UserConfig {
  id: string;
  name: string;
  email: string;
  role: 'ceo' | 'gerente' | 'sistemas' | 'empleado' | 'rh' | 'finanzas' | 'contabilidad' | 'supervisor';
  status: 'active' | 'pending' | 'suspended';
  lastActive: string;
}

const ROLES_CONFIG = {
  ceo: { color: 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/20 shadow-[0_0_10px_rgba(var(--mcvill-accent-rgb),0.1)]', label: 'CEO / DIRECTOR', level: 10 },
  gerente: { color: 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/20', label: 'GERENCIA GENERAL', level: 8 },
  sistemas: { color: 'text-green-400 bg-green-400/10 border-green-400/20', label: 'ADMIN SISTEMAS', level: 9 },
  rh: { color: 'text-pink-400 bg-pink-400/10 border-pink-400/20', label: 'TALENTO HUMANO', level: 7 },
  finanzas: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: 'FINANZAS', level: 7 },
  contabilidad: { color: 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/20', label: 'CONTABILIDAD', level: 6 },
  supervisor: { color: 'text-mcvill-accent bg-mcvill-accent/10 border-mcvill-accent/20', label: 'SUPERVISOR', level: 5 },
  empleado: { color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', label: 'COLABORADOR', level: 1 },
};

interface SettingsViewProps {
  userRole: 'ceo' | 'gerente' | 'sistemas' | 'empleado' | 'rh' | 'finanzas' | 'contabilidad' | 'supervisor';
}

// ─── Tarifas Tab ─────────────────────────────────────────────────────────────

interface Tarifa {
  id: string; concepto_key: string; etiqueta: string; unidad: string; precio_unitario: number; updated_at?: string;
}

const TarifasTab: React.FC = () => {
  const [tarifas, setTarifas]     = useState<Tarifa[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [editando, setEditando]   = useState<Record<string, string>>({});
  const [saved, setSaved]         = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('tarifas_cotizacion').select('*').eq('activo', true).order('etiqueta');
    setTarifas(data || []);
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const handleChange = (id: string, val: string) => {
    setEditando(prev => ({ ...prev, [id]: val }));
  };

  const guardar = async (t: Tarifa) => {
    const nuevo = parseFloat(editando[t.id] ?? String(t.precio_unitario));
    if (isNaN(nuevo)) return;
    setSaving(t.id);
    const now = new Date().toISOString();
    await supabase.from('tarifas_cotizacion').update({ precio_unitario: nuevo, updated_at: now }).eq('id', t.id);
    setTarifas(prev => prev.map(x => x.id === t.id ? { ...x, precio_unitario: nuevo, updated_at: now } : x));
    setEditando(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    setSaving(null);
    setSaved(t.id);
    setTimeout(() => setSaved(null), 2000);
  };

  const fmtFecha = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  const inputCls = 'w-24 bg-mcvill-bg/40 border border-mcvill-card-border rounded-md py-1 px-2 text-[11px] text-mcvill-text text-right focus:border-mcvill-accent/50 transition-all';

  return (
    <div className="h-full flex flex-col bg-mcvill-bg/20 p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <div className="w-10 h-10 bg-mcvill-accent/10 rounded-lg flex items-center justify-center border border-mcvill-accent/20">
          <Zap size={20} className="text-mcvill-accent" />
        </div>
        <div>
          <h3 className="text-xs font-black text-mcvill-text uppercase tracking-widest">Protocolos de Costeo</h3>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Tarifario de Manufactura</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-[1fr_70px_110px_90px_50px] gap-2 px-4 pb-2 border-b border-white/5 mb-2">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Concepto</span>
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Unidad</span>
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-right">Precio</span>
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Update</span>
            <span></span>
          </div>

          <div className="space-y-1">
            {tarifas.map(t => {
              const val = editando[t.id] !== undefined ? editando[t.id] : String(t.precio_unitario);
              const dirty = editando[t.id] !== undefined && parseFloat(editando[t.id]) !== t.precio_unitario;
              const isSaved = saved === t.id;

              return (
                <div key={t.id} className="grid grid-cols-[1fr_70px_110px_90px_50px] gap-2 items-center px-4 py-1.5 rounded bg-black/20 border border-white/5 hover:border-white/10 transition-all group">
                  <span className="text-[10px] font-bold text-slate-300 uppercase truncate">{t.etiqueta}</span>
                  <span className="text-[9px] text-center text-slate-500 font-black bg-white/5 rounded px-1.5 py-0.5">{t.unidad}</span>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-slate-600 text-[10px]">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={val}
                      onChange={e => handleChange(t.id, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && guardar(t)}
                      className={clsx(inputCls, dirty && 'border-orange-500/50')}
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-600 font-mono">{fmtFecha(t.updated_at)}</span>
                  </div>
                  <div className="flex justify-center">
                    {isSaved ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : dirty ? (
                      <button onClick={() => guardar(t)} disabled={saving === t.id}
                        className="p-1 rounded bg-mcvill-accent text-slate-950 hover:opacity-80 transition-all">
                        {saving === t.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Knowledge Base Tab ───────────────────────────────────────────────────────

interface DocMeta {
  id: string; titulo: string; tipo: string;
  total_chunks: number; estado: string; created_at: string;
}

const TIPO_OPTS = ['procedimiento', 'manual', 'ficha', 'politica', 'documento'];

const KnowledgeBaseTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [docs, setDocs]         = useState<DocMeta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo]     = useState('');
  const [tipo, setTipo]         = useState('procedimiento');
  const [contenido, setContenido] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('documentos_rag_meta').select('id, titulo, tipo, total_chunks, estado, created_at').order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTitulo(prev => prev || file.name.replace(/\.[^/.]+$/, ""));
    if (file.name.match(/\.(txt|md|csv)$/i)) {
      const reader = new FileReader();
      reader.onload = e => setContenido(e.target?.result as string || '');
      reader.readAsText(file, 'utf-8');
    } else {
      setUploading(true); setMsg({ ok: true, text: `Subiendo ${file.name}...` });
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/${fileName}`;
      try {
        const { error } = await supabase.storage.from('rag_documents').upload(filePath, file);
        if (error) throw error;
        setContenido(`[FILE_REFERENCE:${filePath}]`);
        setMsg({ ok: true, text: `✓ Archivo subido.` });
      } catch (err: any) { setMsg({ ok: false, text: `Error: ${err.message}` }); }
      finally { setUploading(false); }
    }
  };

  const ingest = async () => {
    if (!titulo.trim() || !contenido.trim()) { setMsg({ ok: false, text: 'Requerido: Título y Contenido' }); return; }
    setUploading(true); setMsg(null);
    try {
      const payload: any = { titulo: titulo.trim(), tipo };
      if (contenido.startsWith('[FILE_REFERENCE:')) {
        payload.file_path = contenido.match(/\[FILE_REFERENCE:(.*?)\]/)?.[1];
        payload.contenido = '';
      } else { payload.contenido = contenido.trim(); }
      const { data, error } = await supabase.functions.invoke('rag-ingest', { body: payload });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      setMsg({ ok: true, text: `✓ Indexado` });
      setShowForm(false); setTitulo(''); setContenido(''); setTipo('procedimiento');
      load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    setUploading(false);
  };

  const deleteDoc = async (id: string) => {
    await supabase.from('documentos_rag_meta').delete().eq('id', id);
    setDocs(d => d.filter(x => x.id !== id));
  };

  const estadoBadge = (e: string) => {
    if (e === 'listo')     return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (e === 'indexando') return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5 animate-pulse';
    return 'text-red-400 border-red-500/20 bg-red-500/5';
  };

  const inputCls = 'w-full bg-mcvill-bg/40 border border-mcvill-card-border rounded-lg py-1.5 px-3 text-[11px] text-mcvill-text focus:border-mcvill-accent/50 transition-all placeholder:text-slate-700';

  return (
    <div className="h-full flex flex-col bg-slate-950/20 p-6 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mcvill-accent/10 rounded-lg flex items-center justify-center border border-mcvill-accent/20">
            <BookOpen size={20} className="text-mcvill-accent" />
          </div>
          <div>
            <h3 className="text-xs font-black text-mcvill-text uppercase tracking-widest">Base de Conocimiento IA</h3>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Orquestación RAG</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setMsg(null); }} className="h-8 px-4 rounded-lg bg-mcvill-accent text-slate-950 text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2">
          <Plus size={13} /> Agregar Nodo
        </button>
      </div>

      {msg && (
        <div className={clsx("px-4 py-2 rounded-lg border text-[10px] font-bold flex items-center gap-2", msg.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
          {msg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {msg.text}
        </div>
      )}

      {showForm && (
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ingesta de Datos</p>
            <button onClick={() => setShowForm(false)}><X size={14} className="text-slate-500 hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Título</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} className={inputCls} placeholder="Nombre del proceso..." />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Protocolo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
                {TIPO_OPTS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Contenido Técnico</label>
              <button onClick={() => fileRef.current?.click()} className="text-[9px] text-blue-400 font-bold hover:text-blue-300 flex items-center gap-1.5"><Upload size={11} /> Cargar Binario</button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            </div>
            <textarea value={contenido} onChange={e => setContenido(e.target.value)} rows={5} className={clsx(inputCls, "resize-none font-mono")} placeholder="Inserte texto crudo o cargue un archivo..." />
          </div>
          <button onClick={ingest} disabled={uploading} className="w-full h-10 rounded-lg bg-mcvill-accent text-slate-950 text-[9px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-mcvill-accent/20">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} {uploading ? 'PROCESANDO...' : 'Sincronizar con Cerebro IA'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
          {docs.length === 0 ? (
            <div className="text-center py-12 space-y-2 opacity-50">
              <BookOpen size={32} className="mx-auto text-slate-700" />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Base de datos vacía</p>
            </div>
          ) : (
            docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-all group">
                <FileText size={14} className="text-mcvill-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-mcvill-text truncate uppercase tracking-tight">{doc.titulo}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">{doc.tipo} · {doc.total_chunks} fragmentos</p>
                </div>
                <span className={clsx("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border", estadoBadge(doc.estado))}>{doc.estado}</span>
                <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Shifts Tab ─────────────────────────────────────────────────────────────

const ShiftsTab: React.FC = () => {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await shiftService.listShifts();
      setShifts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (shift: WorkShift) => {
    setSelectedShift(shift);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!await appConfirm('¿Eliminar este turno? Los empleados vinculados podrían perder su horario.')) return;
    try {
      await shiftService.updateShift(id, { is_active: false });
      load();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/20 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mcvill-accent/10 rounded-lg flex items-center justify-center border border-mcvill-accent/20">
            <Clock size={20} className="text-mcvill-accent" />
          </div>
          <div>
            <h3 className="text-xs font-black text-mcvill-text uppercase tracking-widest">Gestión de Turnos</h3>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Horarios de Producción</p>
          </div>
        </div>
        <button 
          onClick={() => { setSelectedShift(null); setIsModalOpen(true); }}
          className="mcvill-btn-create h-8 px-4 rounded-lg text-[9px] font-black uppercase flex items-center gap-2"
        >
          <Plus size={13} /> Agregar Turno
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-mcvill-accent" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar">
          {shifts.map(shift => (
            <div key={shift.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <Clock size={16} className="text-mcvill-accent" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(shift)} className="p-1.5 hover:text-mcvill-accent transition-colors"><Edit3 size={12} /></button>
                  <button onClick={() => handleDelete(shift.id)} className="p-1.5 hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-tight mb-1">{shift.name}</h4>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Entrada</span>
                  <span className="text-[10px] font-mono text-emerald-400">{shift.start_time.substring(0, 5)}</span>
                </div>
                <div className="w-px h-6 bg-white/5" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Salida</span>
                  <span className="text-[10px] font-mono text-rose-400">{shift.end_time.substring(0, 5)}</span>
                </div>
                <div className="w-px h-6 bg-white/5 ml-auto" />
                <div className="flex flex-col text-right">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Tolerancia</span>
                  <span className="text-[10px] font-mono text-slate-300">{shift.grace_period_minutes}m</span>
                </div>
              </div>
            </div>
          ))}
          {shifts.length === 0 && (
            <div className="col-span-full py-12 text-center opacity-50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No hay turnos configurados</p>
            </div>
          )}
        </div>
      )}

      <ShiftFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={load}
        initialData={selectedShift}
      />
    </div>
  );
};

// ─── Settings View ────────────────────────────────────────────────────────────

export const SettingsView: React.FC<SettingsViewProps> = ({ userRole }) => {
  const isPrivileged = userRole === 'ceo' || userRole === 'sistemas';
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'api' | 'tarifas' | 'brand' | 'security' | 'knowledge' | 'shifts'>(isPrivileged ? 'users' : 'security');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<UserConfig[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig>({
    gemini_api_key: '',
    deepseek_api_key: '',
    together_api_key: '',
    openai_api_key: '',
    anthropic_api_key: '',
    qwen_api_key: '',
    github_api_key: '',
    brand_name: '',
    system_name: '',
    slogan: '',
    selected_api: 'gemini-2.5-flash-lite'
  });
  const [savingKeys, setSavingKeys] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setNotification({ message: 'Solo se permiten archivos de imagen (PNG, JPG, SVG)', type: 'error' });
      return;
    }
    // Preview local inmediato
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `tenant-${tenantId || 'default'}/logo.${ext}`;

      // Crear bucket si no existe (falla silenciosamente si ya existe)
      await supabase.storage.createBucket('logos', { public: true }).catch(() => null);

      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);

      // Actualizar contexto local (sidebar se actualiza instantáneamente)
      updateConfig({ logo: publicUrl, logoDark: publicUrl });

      // Persistir en tenants.config
      const { data: tenant } = await supabase.from('tenants').select('id, config').single();
      if (tenant) {
        await supabase.from('tenants').update({
          config: { ...(tenant.config || {}), logo_url: publicUrl }
        }).eq('id', tenant.id);
      }

      setNotification({ message: 'Logotipo actualizado correctamente', type: 'success' });
    } catch (e: any) {
      setNotification({ message: `Error al subir logo: ${e.message}`, type: 'error' });
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };

  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // API Config State
  const { config, updateConfig, setSelectedApi, setThemeName } = useConfig();
  const selectedApi = config.selectedApi;

  const fetchUsers = async () => {
    try {
      // Get tenant — use maybeSingle so 0 or 2+ rows don't throw
      const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      const tid = tenantData?.id;
      if (tid) setTenantId(tid);

      // Query profiles — with tenant filter if we have it, otherwise all
      const query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      const { data: profileData } = tid ? await query.eq('tenant_id', tid) : await query;
      let rows: any[] = profileData || [];

      // Fallback: merge current auth user if profiles is empty
      if (rows.length === 0) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          rows = [{
            id: authUser.id,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
            email: authUser.email || '',
            role: 'sistemas',
            updated_at: authUser.updated_at || new Date().toISOString(),
            tenant_id: tid,
          }];
        }
      }

      const formattedUsers: UserConfig[] = rows.map((u: any) => ({
        id: u.id,
        name: u.full_name || u.email || 'Sin nombre',
        email: u.email || '',
        role: (u.role as UserConfig['role']) || 'empleado',
        status: 'active',
        lastActive: u.updated_at ? new Date(u.updated_at).toLocaleDateString() : '-',
      }));
      setUsers(formattedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const logs = await auditService.getLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  const fetchTenantConfig = async () => {
    try {
      const configData = await tenantService.getConfig();
      setTenantConfig(configData);
      
      // Update local context with Supabase brand data if available
      if (configData.brand_name) {
        updateConfig({
          brandName: configData.brand_name,
          systemName: configData.system_name,
          slogan: configData.slogan,
          selectedApi: configData.selected_api
        });
      }
    } catch (err) {
      console.error('Error fetching tenant config:', err);
    }
  };

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  const handleUpdateConfig = async (updates: Partial<TenantConfig>) => {
    setSavingKeys(true);
    try {
      await tenantService.updateConfig(updates);
      setTenantConfig(prev => ({ ...prev, ...updates }));
      setNotification({ message: 'PROTOCOL_UPDATE_SUCCESS: Configuración Sincronizada con Supabase', type: 'success' });
    } catch (err) {
      console.error('Error saving config:', err);
      setNotification({ message: 'CRITICAL_ERROR: Fallo al persistir en Supabase', type: 'error' });
    } finally {
      setSavingKeys(false);
    }
  };

  const handleEditUser = (user: UserConfig) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!await appConfirm('¿Seguro que deseas revocar el acceso a este usuario?')) return;
    try {
      await userService.deleteUser(userId);
      setNotification({ message: 'PROTOCOL_DELETION_COMPLETE: Usuario removido del sistema', type: 'error' });
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setNotification({ message: 'CRITICAL_ERROR: No se pudo eliminar el usuario', type: 'error' });
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setNotification({ message: 'CRITICAL_AUTH_FAILURE: Las contraseñas no coinciden', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setNotification({ message: 'SECURITY_VIOLATION: La contraseña debe tener al menos 8 caracteres', type: 'error' });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNotification({ message: 'ENCRYPTION_COMPLETE: Contraseña actualizada con éxito', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      await auditService.log('CHANGE_PASSWORD', 'auth', 'self', { success: true });
    } catch (err: any) {
      console.error('Error updating password:', err);
      setNotification({ message: `AUTH_OVERRIDE_FAILED: ${err.message}`, type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchAuditLogs(), fetchTenantConfig()]);
      setLoading(false);
    };
    init();
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Compact Industrial Header */}
      <div className="px-6 py-3 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="text-mcvill-accent" size={16} />
            <h2 className="text-base font-black text-mcvill-text tracking-tight uppercase">
              CENTRAL DE <span className="text-mcvill-accent">CONFIGURACIÓN</span>
            </h2>
          </div>
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          <p className="text-[10px] text-slate-500 font-medium hidden md:block uppercase tracking-widest">
            Gestión técnica de protocolos y seguridad
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
          {[
            isPrivileged && { id: 'users', label: 'Usuarios', icon: Users },
            isPrivileged && { id: 'audit', label: 'Auditoría', icon: History },
            isPrivileged && { id: 'api', label: 'Motores IA', icon: Cpu },
            isPrivileged && { id: 'tarifas', label: 'Tarifas', icon: Zap },
            isPrivileged && { id: 'shifts', label: 'Turnos', icon: Clock },
            isPrivileged && { id: 'knowledge', label: 'Base IA', icon: BookOpen },
            isPrivileged && { id: 'brand', label: 'Identidad', icon: Globe },
            { id: 'security', label: 'Seguridad', icon: Key },
          ].filter(Boolean).map((tab: any) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "px-2.5 h-7 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === tab.id 
                  ? "bg-mcvill-accent text-slate-950 shadow-lg shadow-mcvill-accent/20" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <tab.icon size={12} />
              <span className="hidden xl:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <UserFormModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }} 
        onSuccess={fetchUsers}
        tenantId={tenantId || ''}
        initialData={selectedUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        {activeTab === 'users' && (
          <div className="h-full flex flex-col overflow-hidden bg-mcvill-card/50">
            <div className="px-6 py-2.5 border-b border-mcvill-card-border bg-mcvill-card flex items-center justify-between shrink-0">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mcvill-accent transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="FILTRO USUARIOS..."
                  className="bg-mcvill-bg/40 border border-mcvill-card-border rounded-lg w-full pl-10 pr-4 h-8 text-[10px] font-black uppercase tracking-widest text-mcvill-text focus:outline-none focus:border-mcvill-accent/50 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => {
                  setSelectedUser(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 h-8 px-4 rounded-lg bg-mcvill-accent text-slate-950 text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all ml-4"
              >
                <UserPlus size={14} />
                NUEVO USUARIO
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/60 sticky top-0 z-10 backdrop-blur-md">
                  <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-6 py-2.5">Usuario</th>
                    <th className="px-6 py-2.5 text-center">Protocolo de Rol</th>
                    <th className="px-6 py-2.5 text-center">Estado</th>
                    <th className="px-6 py-2.5 text-center">Último Acceso</th>
                    <th className="px-6 py-2.5 text-right">ACC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="w-8 h-8 text-mcvill-accent animate-spin mx-auto mb-3" />
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Sincronizando Usuarios...</p>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic text-[10px]">
                        Sin resultados en la base de datos.
                      </td>
                    </tr>
                  ) : (
                    users.filter(u => 
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      u.email.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((user) => (
                      <tr key={user.id} className="hover:bg-blue-500/5 transition-all group/row">
                        <td className="px-6 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent font-black text-[9px] uppercase">
                              {user.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-mcvill-text truncate uppercase tracking-tight">{user.name}</p>
                              <p className="text-[9px] font-mono text-slate-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-center">
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                            ROLES_CONFIG[user.role]?.color || 'text-slate-400 bg-slate-400/10 border-slate-400/20'
                          )}>
                            {ROLES_CONFIG[user.role]?.label || 'SIN ASIGNAR'}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className={clsx("w-1 h-1 rounded-full", user.status === 'active' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-500')} />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {user.status === 'active' ? 'ACTIVO' : 'OFFLINE'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-center text-[10px] font-mono text-slate-600">
                          {user.lastActive}
                        </td>
                        <td className="px-6 py-2 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all translate-x-2 group-hover/row:translate-x-0">
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="p-1.5 hover:bg-mcvill-accent/20 rounded text-slate-500 hover:text-mcvill-accent transition-all"
                              title="Editar"
                            >
                              <Shield size={13} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-all"
                              title="Revocar"
                            >
                              <Lock size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-slate-950/20">
            {/* Sidebar Summary */}
            <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/5 p-4 space-y-4 bg-slate-900/40 shrink-0">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={12} className="text-mcvill-accent" />
                  Métricas de Seguridad
                </p>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Total Eventos</span>
                    <span className="text-mcvill-text font-mono text-xs">{auditLogs.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Estado</span>
                    <span className="text-emerald-400 font-black text-[8px] uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">ESTABLE</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nodos de Monitoreo</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {['AUTH', 'VENTAS', 'RH', 'NOMINA'].map(node => (
                    <div key={node} className="bg-black/20 border border-white/5 rounded p-1.5 text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight">{node}</p>
                      <div className="h-0.5 w-full bg-mcvill-accent/20 mt-1 overflow-hidden">
                        <div className="h-full bg-mcvill-accent w-[70%]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dense Log Feed */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-2.5 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
                <h3 className="text-[10px] font-black text-mcvill-text uppercase tracking-widest flex items-center gap-2">
                  <Clock size={14} className="text-slate-500" />
                  HISTORIAL DE EVENTOS
                </h3>
                <button onClick={fetchAuditLogs} className="text-[9px] font-black text-mcvill-accent uppercase tracking-widest hover:opacity-80 transition-all">REFRESCAR</button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-1.5">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 bg-black/20 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-all group/log">
                    <div className="w-1.5 h-1.5 rounded-full bg-mcvill-accent shadow-[0_0_5px_var(--theme-glow)] mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black text-mcvill-text uppercase truncate">{log.profiles?.full_name || 'SISTEMA'}</span>
                        <span className="px-1.5 py-0.5 bg-mcvill-accent/10 text-mcvill-accent text-[7px] rounded font-black uppercase tracking-widest border border-mcvill-accent/20">{log.action}</span>
                        <span className="ml-auto text-[9px] font-mono text-slate-600 shrink-0">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">Acción ejecutada en el sector <span className="text-slate-400 uppercase font-bold">{log.entity_type}</span>.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'brand' && (
          <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-slate-950/20">
            {/* Form Section */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2">
                <Globe size={18} className="text-mcvill-accent" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Identidad Visual</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Empresa</label>
                  <input type="text" value={config.brandName} onChange={(e) => updateConfig({ brandName: e.target.value })} className="bg-black/40 border border-white/5 rounded-lg w-full px-3 h-9 text-[11px] text-white focus:border-mcvill-accent/50 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Sistema</label>
                  <input type="text" value={config.systemName} onChange={(e) => updateConfig({ systemName: e.target.value })} className="bg-black/40 border border-white/5 rounded-lg w-full px-3 h-9 text-[11px] text-white focus:border-mcvill-accent/50 transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Eslogan</label>
                <input type="text" value={config.slogan} onChange={(e) => updateConfig({ slogan: e.target.value })} className="bg-black/40 border border-white/5 rounded-lg w-full px-3 h-9 text-[11px] text-white focus:border-mcvill-accent/50 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tema de Color</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: 'blue',    label: 'Azul Industrial', desc: 'Corporativo · Default', dark: '#4FA5FF', light: '#1D4ED8' },
                    { id: 'slate',   label: 'Slate Neutro',    desc: 'Minimalista · Sobrio',  dark: '#94A3B8', light: '#475569' },
                    { id: 'emerald', label: 'Esmeralda',       desc: 'Producción · Planta',   dark: '#34D399', light: '#059669' },
                  ] as const).map(t => {
                    const active = (config.themeName ?? 'blue') === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setThemeName(t.id)}
                        className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                          active
                            ? 'border-mcvill-accent bg-mcvill-accent/10 shadow-lg shadow-mcvill-accent/20'
                            : 'border-white/5 bg-black/30 hover:border-white/20 hover:bg-black/50'
                        }`}
                      >
                        {active && (
                          <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-mcvill-accent flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <div className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: t.dark }} />
                          <div className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: t.light }} />
                        </div>
                        <p className={`text-[9px] font-black uppercase tracking-wider leading-tight text-center ${active ? 'text-mcvill-accent' : 'text-slate-300'}`}>{t.label}</p>
                        <p className="text-[7.5px] text-slate-500 text-center leading-tight">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Logotipo</label>
                <div onClick={() => logoFileRef.current?.click()} className="p-3 bg-black/40 border border-white/5 border-dashed rounded-lg hover:border-mcvill-accent/40 cursor-pointer flex items-center gap-3 transition-all group">
                  <div className="w-10 h-10 rounded bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {(logoPreview || config.logo) ? (
                      <img src={logoPreview || config.logo} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-mcvill-accent font-black text-sm">{config.brandName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">{logoUploading ? 'PROCESANDO...' : 'SUBIR LOGO'}</p>
                    <p className="text-[8px] text-slate-600 truncate uppercase">PNG / JPG / SVG — Transparente</p>
                  </div>
                  <Upload size={14} className="text-slate-600 group-hover:text-mcvill-accent transition-all" />
                </div>
                <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Versión</label>
                  <input type="text" value={config.version} onChange={(e) => updateConfig({ version: e.target.value })} className="bg-black/40 border border-white/5 rounded-lg w-full px-3 h-9 text-[11px] text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Soporte</label>
                  <input type="email" value={config.supportEmail} onChange={(e) => updateConfig({ supportEmail: e.target.value })} className="bg-black/40 border border-white/5 rounded-lg w-full px-3 h-9 text-[11px] text-white" />
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="w-full lg:w-80 bg-slate-900/40 border-l border-white/5 p-6 flex flex-col items-center justify-center text-center shrink-0">
              <div className="w-20 h-20 bg-mcvill-accent/10 rounded-xl flex items-center justify-center border border-mcvill-accent/20 shadow-2xl mb-4 overflow-hidden">
                {(logoPreview || config.logo) ? (
                  <img src={logoPreview || config.logo} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-mcvill-accent font-black text-4xl">{config.brandName.charAt(0)}</span>
                )}
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight">{config.brandName}</h4>
              <p className="text-mcvill-accent font-black text-[10px] uppercase tracking-[0.2em]">{config.systemName}</p>
              
              <div className="mt-8 w-full space-y-3">
                <button 
                  onClick={() => handleUpdateConfig({
                    brand_name: config.brandName,
                    system_name: config.systemName,
                    slogan: config.slogan,
                    theme_name: config.themeName,
                  })}
                  disabled={savingKeys}
                  className="w-full h-10 rounded-lg bg-mcvill-accent text-slate-950 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-mcvill-accent/20"
                >
                  {savingKeys ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Sincronizar Supabase
                </button>
                <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">
                  <span>STATUS: LIVE</span>
                  <span>{config.version}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="h-full flex flex-col overflow-hidden bg-slate-950/20 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 bg-mcvill-accent rounded-lg flex items-center justify-center shadow-lg shadow-mcvill-accent/20">
                <Cpu size={20} className="text-slate-950" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Orquestador de IA</h3>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Configuración de Inferencia</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {[
                { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash', provider: 'Google', speed: 'MAX' },
                { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', speed: 'FAST' },
                { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', speed: 'SMART' },
                { id: 'deepseek-chat', name: 'DeepSeek V4', provider: 'DeepSeek', speed: 'ULTRA' },
              ].map(api => (
                <button
                  key={api.id}
                  onClick={() => { setSelectedApi(api.id); handleUpdateConfig({ selected_api: api.id }); }}
                  className={clsx(
                    "p-3 rounded-xl border transition-all duration-300 text-left relative",
                    selectedApi === api.id ? "bg-mcvill-accent/10 border-mcvill-accent/40" : "bg-slate-900/40 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className={clsx("w-6 h-6 rounded flex items-center justify-center border", selectedApi === api.id ? "bg-mcvill-accent text-slate-950 border-mcvill-accent/20" : "bg-black/40 text-slate-600 border-white/5")}>
                      <Server size={12} />
                    </div>
                    <span className="text-[7px] font-black text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-widest">{api.speed}</span>
                  </div>
                  <h4 className={clsx("text-[10px] font-black uppercase tracking-tight", selectedApi === api.id ? "text-mcvill-accent" : "text-white")}>{api.name}</h4>
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">{api.provider}</p>
                </button>
              ))}
            </div>

            <div className="bg-slate-900/40 p-5 rounded-xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-mcvill-accent" />
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Bóveda de Credenciales</h4>
                </div>
                <button onClick={() => setShowKeys(!showKeys)} className="text-slate-500 hover:text-white transition-colors">{showKeys ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: 'gemini', label: 'Gemini 2.5 API', key: 'gemini_api_key' },
                  { id: 'anthropic', label: 'Claude API', key: 'anthropic_api_key' },
                  { id: 'openai', label: 'GPT API', key: 'openai_api_key' },
                  { id: 'deepseek', label: 'DeepSeek API', key: 'deepseek_api_key' },
                  { id: 'github', label: 'GitHub TOKEN', key: 'github_api_key' },
                ].map(k => (
                  <div key={k.id} className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{k.label}</label>
                    <input 
                      type={showKeys ? "text" : "password"}
                      value={(tenantConfig as any)[k.key] || ''}
                      onChange={(e) => setTenantConfig({ ...tenantConfig, [k.key]: e.target.value })}
                      className="bg-black/60 border border-white/5 rounded-lg w-full px-3 h-8 font-mono text-[10px] text-white focus:border-blue-500/50 transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button onClick={() => handleUpdateConfig(tenantConfig)} disabled={savingKeys} className="h-9 px-6 rounded-lg bg-mcvill-accent text-slate-950 text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-mcvill-accent/20">
                  {savingKeys ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                  Guardar Bóveda
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tarifas' && <TarifasTab />}

        {activeTab === 'shifts' && <ShiftsTab />}

        {activeTab === 'knowledge' && <KnowledgeBaseTab tenantId={tenantId || ''} />}

        {activeTab === 'security' && (
          <div className="h-full flex items-center justify-center bg-slate-950/20 p-6">
            <div className="w-full max-w-sm bg-slate-900/40 border border-white/5 rounded-xl p-6 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 bg-mcvill-accent/10 rounded flex items-center justify-center border border-mcvill-accent/20">
                  <ShieldAlert size={20} className="text-mcvill-accent" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Seguridad de Acceso</h3>
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Rol: {ROLES_CONFIG[userRole]?.label}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-black/60 border border-white/5 rounded-lg w-full px-3 h-9 font-mono text-[11px] text-white focus:border-blue-500/50 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-black/60 border border-white/5 rounded-lg w-full px-3 h-9 font-mono text-[11px] text-white focus:border-blue-500/50 transition-all" />
                </div>
                <button onClick={handleUpdatePassword} disabled={changingPassword || !newPassword} className="w-full h-10 rounded-lg bg-mcvill-accent text-slate-950 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-mcvill-accent/20">
                  {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  Actualizar Acceso
                </button>
              </div>

              <div className="p-3 bg-mcvill-accent/5 border border-mcvill-accent/10 rounded flex gap-3">
                <AlertCircle className="w-4 h-4 text-mcvill-accent shrink-0" />
                <p className="text-[9px] text-slate-500 leading-tight uppercase font-medium">Recomendado: Usar combinaciones alfanuméricas complejas de 12+ caracteres.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {notification && (
        <Toast 
          message={notification.message}
          type={notification.type}
          isVisible={!!notification}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};
