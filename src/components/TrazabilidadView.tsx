import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';
import {
  GitBranch, Search, Plus, X, Loader2, Settings, Trash2,
  Package, ArrowRight, ClipboardList, History, ShieldCheck,
  AlertTriangle, CheckCircle2, FileText, Link2, Activity
} from 'lucide-react';
import { engineeringService } from '../services/engineeringService';
import { useSearch } from '../contexts/SearchContext';
import { appConfirm } from '../lib/dialogs';
import { Toast } from './common/Toast';
import { PrintButton } from './common/PrintButton';
import { TraceTimeline } from './TraceTimeline';

type Tab = 'lotes' | 'uso' | 'revisiones' | 'timeline';

const emptyLoteForm = {
  numero_lote: '', material_id: '', descripcion: '', proveedor: '',
  numero_colada: '', fecha_recepcion: new Date().toISOString().slice(0, 10),
  cantidad_inicial: 0, cantidad_disponible: 0, unidad: 'kg',
  status: 'disponible', notas: ''
};

const emptyUsoForm = {
  lote_id: '', viajero_id: '', operacion: '',
  cantidad_usada: 0, registrado_por: '', notas: ''
};

const emptyRevForm = {
  product_id: '', sku: '', revision_anterior: '', revision_nueva: '',
  descripcion_cambio: '', motivo: '', impacto: '',
  fecha_cambio: new Date().toISOString().slice(0, 10), cambiado_por: ''
};

export const TrazabilidadView: React.FC = () => {
  const { searchTerm, setSearchTerm } = useSearch();

  const [activeTab, setActiveTab] = useState<Tab>('lotes');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Lotes
  const [lotes, setLotes] = useState<any[]>([]);
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [editingLote, setEditingLote] = useState<any>(null);
  const [loteForm, setLoteForm] = useState({ ...emptyLoteForm });

  // Uso de lotes
  const [usos, setUsos] = useState<any[]>([]);
  const [showUsoModal, setShowUsoModal] = useState(false);
  const [editingUso, setEditingUso] = useState<any>(null);
  const [usoForm, setUsoForm] = useState({ ...emptyUsoForm });

  // Revisiones
  const [revisiones, setRevisiones] = useState<any[]>([]);
  const [showRevModal, setShowRevModal] = useState(false);
  const [editingRev, setEditingRev] = useState<any>(null);
  const [revForm, setRevForm] = useState({ ...emptyRevForm });

  // Catalogues for selects
  const [materials, setMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [l, u, r, mats, prods] = await Promise.all([
        engineeringService.getLotes(),
        engineeringService.getUsoLotes(),
        engineeringService.getRevisionHistory(),
        engineeringService.getMaterials(),
        engineeringService.getProducts(),
      ]);
      setLotes(l); setUsos(u); setRevisiones(r);
      setMaterials(mats); setProducts(prods);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const nextLoteNumber = () => `LOT-${new Date().getFullYear()}-${String(lotes.length + 1).padStart(3, '0')}`;
  const nextUsoId     = () => `USO-${String(usos.length + 1).padStart(4, '0')}`;

  // ── Lotes handlers ────────────────────────────────────────────────────────────
  const openLoteModal = (lote?: any) => {
    if (lote) { setEditingLote(lote); setLoteForm({ ...emptyLoteForm, ...lote }); }
    else { setEditingLote(null); setLoteForm({ ...emptyLoteForm, numero_lote: nextLoteNumber() }); }
    setShowLoteModal(true);
  };
  const handleSaveLote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = { ...loteForm, cantidad_disponible: loteForm.cantidad_disponible || loteForm.cantidad_inicial };
      if (editingLote) { await engineeringService.updateLote(editingLote.id, payload); notify('Lote actualizado'); }
      else { await engineeringService.createLote(payload); notify('Lote registrado'); }
      setShowLoteModal(false); loadAll();
    } catch (e) { console.error(e); notify('Error al guardar', 'error'); }
    finally { setIsSubmitting(false); }
  };
  const handleDeleteLote = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR ESTE LOTE? Se perderá su trazabilidad.')) return;
    await engineeringService.deleteLote(id);
    loadAll(); notify('Lote eliminado', 'error');
  };

  // ── Uso handlers ─────────────────────────────────────────────────────────────
  const openUsoModal = (uso?: any) => {
    if (uso) {
      setEditingUso(uso);
      setUsoForm({ lote_id: uso.lote_id, viajero_id: uso.viajero_id, operacion: uso.operacion || '', cantidad_usada: uso.cantidad_usada, registrado_por: uso.registrado_por || '', notas: uso.notas || '' });
    } else {
      setEditingUso(null);
      setUsoForm({ ...emptyUsoForm });
    }
    setShowUsoModal(true);
  };

  const handleSaveUso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUso) {
      const selectedLote = lotes.find(l => l.id === usoForm.lote_id);
      if (selectedLote && usoForm.cantidad_usada > selectedLote.cantidad_disponible) {
        notify(`Stock insuficiente: solo hay ${selectedLote.cantidad_disponible} ${selectedLote.unidad} disponibles`, 'error');
        return;
      }
    }
    try {
      setIsSubmitting(true);
      if (editingUso) {
        await engineeringService.updateUsoLote(editingUso.id, usoForm);
        notify('Uso actualizado');
      } else {
        await engineeringService.createUsoLote(usoForm);
        notify('Uso de lote registrado');
      }
      setShowUsoModal(false);
      setUsoForm({ ...emptyUsoForm });
      setEditingUso(null);
      loadAll();
    } catch (e) { console.error(e); notify('Error al guardar', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteUso = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR ESTE REGISTRO DE USO?')) return;
    await engineeringService.deleteUsoLote(id);
    loadAll(); notify('Registro eliminado', 'error');
  };

  // ── Revisiones handlers ───────────────────────────────────────────────────────
  const openRevModal = (rev?: any) => {
    if (rev) {
      setEditingRev(rev);
      setRevForm({ product_id: rev.product_id || '', sku: rev.sku || '', revision_anterior: rev.revision_anterior || '', revision_nueva: rev.revision_nueva || '', descripcion_cambio: rev.descripcion_cambio || '', motivo: rev.motivo || '', impacto: rev.impacto || '', fecha_cambio: rev.fecha_cambio || new Date().toISOString().slice(0, 10), cambiado_por: rev.cambiado_por || '' });
    } else {
      setEditingRev(null);
      setRevForm({ ...emptyRevForm });
    }
    setShowRevModal(true);
  };

  const handleSaveRev = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const prod = products.find(p => p.id === revForm.product_id);
      const payload = { ...revForm, sku: prod?.sku || revForm.sku };
      if (editingRev) {
        await engineeringService.updateRevision(editingRev.id, payload);
      } else {
        await engineeringService.createRevision(payload);
        if (revForm.product_id && revForm.revision_nueva) {
          await supabase.from('productos').update({ revision: revForm.revision_nueva }).eq('id', revForm.product_id);
        }
      }
      notify(editingRev ? 'Revisión actualizada' : 'Revisión registrada');
      setShowRevModal(false);
      setRevForm({ ...emptyRevForm });
      setEditingRev(null);
      loadAll();
    } catch (e) { console.error(e); notify('Error al guardar', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteRev = async (id: string) => {
    if (!await appConfirm('¿ELIMINAR ESTE REGISTRO DE REVISIÓN?')) return;
    await engineeringService.deleteRevision(id);
    loadAll(); notify('Revisión eliminada', 'error');
  };

  // ── Status helpers ────────────────────────────────────────────────────────────
  const getLoteStatusStyle = (s: string) => ({
    disponible:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    agotado:     'text-slate-400 bg-slate-500/10 border-slate-500/20',
    cuarentena:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rechazado:   'text-rose-400 bg-rose-500/10 border-rose-500/20',
  }[s] || 'text-slate-400 bg-slate-500/10 border-slate-500/20');

  // ── Filtered data ─────────────────────────────────────────────────────────────
  const q = searchTerm.toLowerCase();
  const filteredLotes = lotes.filter(l =>
    l.numero_lote?.toLowerCase().includes(q) ||
    l.material?.name?.toLowerCase().includes(q) ||
    l.descripcion?.toLowerCase().includes(q) ||
    l.proveedor?.toLowerCase().includes(q)
  );
  const filteredUsos = usos.filter(u =>
    u.lote?.numero_lote?.toLowerCase().includes(q) ||
    u.viajero_id?.toLowerCase().includes(q) ||
    u.operacion?.toLowerCase().includes(q)
  );
  const filteredRevs = revisiones.filter(r =>
    r.product?.sku?.toLowerCase().includes(q) ||
    r.product?.name?.toLowerCase().includes(q) ||
    r.revision_nueva?.toLowerCase().includes(q) ||
    r.descripcion_cambio?.toLowerCase().includes(q)
  );

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const disponibles  = lotes.filter(l => l.status === 'disponible').length;
  const cuarentena   = lotes.filter(l => l.status === 'cuarentena').length;
  const totalUsos    = usos.length;
  const totalRevs    = revisiones.length;

  const tabs = [
    { id: 'lotes',     label: 'Lotes Recibidos',    icon: Package },
    { id: 'uso',       label: 'Uso de Lotes',        icon: Link2 },
    { id: 'revisiones',label: 'Historial Revisiones',icon: History },
    { id: 'timeline',  label: 'Trazar Pieza',        icon: Activity },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {notification && <Toast message={notification.message} type={notification.type} isVisible={!!notification} onClose={() => setNotification(null)} />}

      {/* Header */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="text-orange-500" size={16} />
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              TRAZABILIDAD <span className="text-orange-500">LOTE/SERIE</span>
            </h2>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden md:block">
            Control de Lotes · Trazabilidad Total · Historial de Revisiones
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'lotes' && (
            <button onClick={() => openLoteModal()} className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
              <Plus size={12} strokeWidth={3} /> REGISTRAR LOTE
            </button>
          )}
          {activeTab === 'uso' && (
            <button onClick={() => openUsoModal()} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
              <Plus size={12} strokeWidth={3} /> REGISTRAR USO
            </button>
          )}
          {activeTab === 'revisiones' && (
            <button onClick={() => openRevModal()} className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
              <Plus size={12} strokeWidth={3} /> NUEVA REVISIÓN
            </button>
          )}
          <PrintButton />
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/20 shrink-0">
        {[
          { label: 'Lotes Disponibles', value: String(disponibles), icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'En Cuarentena',     value: String(cuarentena),  icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Usos Registrados',  value: String(totalUsos),   icon: Link2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Cambios Revisión',  value: String(totalRevs),   icon: History, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((s, i) => (
          <div key={i} className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 hover:bg-white/[0.04] transition-all">
            <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shrink-0', s.bg, s.color)}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
              <p className={clsx('text-xl font-black tracking-tighter leading-none', s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-4 shrink-0">
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-[9px] font-black uppercase tracking-widest',
                activeTab === tab.id ? 'bg-orange-600 text-white shadow-cyber' : 'text-slate-500 hover:text-white')}>
              <tab.icon size={12} />{tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-mcvill-accent transition-colors" size={12} />
          <input type="text" placeholder="BUSCAR POR LOTE, MATERIAL, VIAJERO, PRODUCTO..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 outline-none text-[10px] font-bold text-white placeholder:text-slate-700 focus:border-mcvill-accent/50 transition-all" />
        </div>
      </div>

      {/* Content */}
      <div className={clsx('flex-1 bg-slate-950/40', activeTab === 'timeline' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar')}>

        {/* ── Tab: Lotes ── */}
        {activeTab === 'lotes' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Número de Lote</th>
                <th className="px-4 py-2">Material / Descripción</th>
                <th className="px-4 py-2">Proveedor / Colada</th>
                <th className="px-4 py-2 text-center">Cantidad</th>
                <th className="px-4 py-2 text-center">Fecha Recepción</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-8 py-24 text-center">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargando lotes...</p>
                </td></tr>
              ) : filteredLotes.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-24 text-center">
                  <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 font-black text-[11px] tracking-widest uppercase">Sin lotes registrados</p>
                  <button onClick={() => openLoteModal()} className="mt-4 px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all">
                    + Registrar primer lote
                  </button>
                </td></tr>
              ) : filteredLotes.map(lote => (
                <tr key={lote.id} className="hover:bg-orange-500/5 transition-all group">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                        <Package size={13} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase">{lote.numero_lote}</p>
                        {lote.numero_colada && <p className="text-[8px] text-slate-600 uppercase tracking-widest">Colada: {lote.numero_colada}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[10px] font-black text-slate-300 uppercase">{lote.material?.name || lote.descripcion || '—'}</p>
                    <p className="text-[8px] text-slate-600 uppercase">{lote.unidad}</p>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[10px] font-bold text-slate-400">{lote.proveedor || '—'}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <p className="text-[10px] font-black text-white">{lote.cantidad_disponible} <span className="text-slate-600">/ {lote.cantidad_inicial}</span></p>
                    <p className="text-[8px] text-slate-600 uppercase">{lote.unidad}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <p className="text-[10px] font-black text-slate-400">{lote.fecha_recepcion ? new Date(lote.fecha_recepcion).toLocaleDateString() : '—'}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest uppercase', getLoteStatusStyle(lote.status))}>
                      {lote.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openLoteModal(lote)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-orange-400 transition-all"><Settings size={12} /></button>
                      <button onClick={() => handleDeleteLote(lote.id)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Tab: Uso de Lotes ── */}
        {activeTab === 'uso' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Lote</th>
                <th className="px-4 py-2 text-center"><ArrowRight size={10} className="inline" /></th>
                <th className="px-4 py-2">Viajero / Orden</th>
                <th className="px-4 py-2">Operación</th>
                <th className="px-4 py-2 text-center">Cantidad Usada</th>
                <th className="px-4 py-2 text-center">Fecha</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsos.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-24 text-center">
                  <Link2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 font-black text-[11px] tracking-widest uppercase">Sin registros de uso</p>
                  <button onClick={() => setShowUsoModal(true)} className="mt-4 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                    + Registrar primer uso
                  </button>
                </td></tr>
              ) : filteredUsos.map(uso => (
                <tr key={uso.id} className="hover:bg-blue-500/5 transition-all group">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400"><Package size={11} /></div>
                      <p className="text-[10px] font-black text-orange-300 uppercase">{uso.lote?.numero_lote || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center"><ArrowRight size={14} className="text-slate-600 mx-auto" /></td>
                  <td className="px-4 py-2">
                    <p className="text-[11px] font-black text-white uppercase">{uso.viajero_id}</p>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[10px] font-bold text-slate-400">{uso.operacion || '—'}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <p className="text-[10px] font-black text-white">{uso.cantidad_usada}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <p className="text-[10px] text-slate-400">{new Date(uso.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openUsoModal(uso)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-blue-400 transition-all"><Settings size={12} /></button>
                      <button onClick={() => handleDeleteUso(uso.id)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Tab: Historial Revisiones ── */}
        {activeTab === 'revisiones' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Producto / SKU</th>
                <th className="px-4 py-2 text-center">Cambio de Revisión</th>
                <th className="px-4 py-2">Descripción del Cambio</th>
                <th className="px-4 py-2">Impacto</th>
                <th className="px-4 py-2 text-center">Fecha</th>
                <th className="px-4 py-2">Responsable</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRevs.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-24 text-center">
                  <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 font-black text-[11px] tracking-widest uppercase">Sin historial de revisiones</p>
                  <button onClick={() => setShowRevModal(true)} className="mt-4 px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all">
                    + Registrar primer cambio
                  </button>
                </td></tr>
              ) : filteredRevs.map(rev => (
                <tr key={rev.id} className="hover:bg-purple-500/5 transition-all group">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400"><FileText size={13} /></div>
                      <div>
                        <p className="text-[11px] font-black text-white uppercase">{rev.product?.sku || rev.sku || '—'}</p>
                        <p className="text-[8px] text-slate-600 uppercase">{rev.product?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 bg-white/5 px-2 py-0.5 rounded">{rev.revision_anterior || '—'}</span>
                      <ArrowRight size={12} className="text-slate-600" />
                      <span className="text-[10px] font-black text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">{rev.revision_nueva}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 max-w-xs">
                    <p className="text-[10px] text-slate-400 truncate">{rev.descripcion_cambio || '—'}</p>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase">{rev.impacto || '—'}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <p className="text-[10px] text-slate-400">{rev.fecha_cambio ? new Date(rev.fecha_cambio).toLocaleDateString() : '—'}</p>
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-[10px] text-slate-400">{rev.cambiado_por || '—'}</p>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openRevModal(rev)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-purple-400 transition-all"><Settings size={12} /></button>
                      <button onClick={() => handleDeleteRev(rev.id)} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

        {/* ── Tab: Trazar Pieza ── */}
        {activeTab === 'timeline' && <TraceTimeline />}

      {/* ── Modal: Lote ── */}
      {showLoteModal && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-white uppercase">{editingLote ? 'EDITAR' : 'REGISTRAR'} <span className="text-orange-500">LOTE</span></h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{loteForm.numero_lote}</p>
              </div>
              <button onClick={() => setShowLoteModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveLote} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Número de Lote *</label>
                  <input required className="cyber-input w-full" value={loteForm.numero_lote} onChange={e => setLoteForm({ ...loteForm, numero_lote: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Número de Colada (Heat #)</label>
                  <input className="cyber-input w-full" placeholder="EJ: H-2026-4521" value={loteForm.numero_colada} onChange={e => setLoteForm({ ...loteForm, numero_colada: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Material</label>
                <select className="cyber-select w-full" value={loteForm.material_id} onChange={e => setLoteForm({ ...loteForm, material_id: e.target.value })}>
                  <option value="">— SELECCIONAR MATERIAL —</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Descripción (si no hay material en catálogo)</label>
                <input className="cyber-input w-full" placeholder="EJ: ACERO A36 PLACA 3/16" value={loteForm.descripcion} onChange={e => setLoteForm({ ...loteForm, descripcion: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Proveedor</label>
                  <input className="cyber-input w-full" placeholder="NOMBRE DEL PROVEEDOR" value={loteForm.proveedor} onChange={e => setLoteForm({ ...loteForm, proveedor: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha de Recepción</label>
                  <input type="date" className="cyber-input w-full" value={loteForm.fecha_recepcion} onChange={e => setLoteForm({ ...loteForm, fecha_recepcion: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Cantidad Inicial *</label>
                  <input required type="number" min="0" step="0.01" className="cyber-input w-full" value={loteForm.cantidad_inicial}
                    onChange={e => { const v = parseFloat(e.target.value) || 0; setLoteForm({ ...loteForm, cantidad_inicial: v, cantidad_disponible: v }); }} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Disponible</label>
                  <input type="number" min="0" step="0.01" className="cyber-input w-full" value={loteForm.cantidad_disponible}
                    onChange={e => setLoteForm({ ...loteForm, cantidad_disponible: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Unidad</label>
                  <select className="cyber-select w-full" value={loteForm.unidad} onChange={e => setLoteForm({ ...loteForm, unidad: e.target.value })}>
                    {['kg', 'ton', 'm', 'm2', 'pza', 'lt', 'rollo'].map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Estado</label>
                <select className="cyber-select w-full" value={loteForm.status} onChange={e => setLoteForm({ ...loteForm, status: e.target.value })}>
                  {['disponible', 'cuarentena', 'agotado', 'rechazado'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Notas</label>
                <textarea rows={2} className="cyber-input w-full resize-none" value={loteForm.notas} onChange={e => setLoteForm({ ...loteForm, notas: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowLoteModal(false)} className="flex-1 h-11 border border-white/10 text-slate-500 font-black uppercase tracking-widest rounded-xl text-[9px]">CANCELAR</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] h-11 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Package size={14} /> {editingLote ? 'ACTUALIZAR' : 'REGISTRAR'} LOTE</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Uso de Lote ── */}
      {showUsoModal && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-white uppercase">{editingUso ? 'EDITAR' : 'REGISTRAR'} <span className="text-blue-500">USO DE LOTE</span></h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">TRAZABILIDAD LOTE → ORDEN</p>
              </div>
              <button onClick={() => setShowUsoModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveUso} className="p-5 space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Lote *</label>
                <select required className="cyber-select w-full" value={usoForm.lote_id} onChange={e => setUsoForm({ ...usoForm, lote_id: e.target.value })}>
                  <option value="">— SELECCIONAR LOTE —</option>
                  {lotes.filter(l => l.status === 'disponible').map(l => (
                    <option key={l.id} value={l.id}>{l.numero_lote} — {l.material?.name || l.descripcion} ({l.cantidad_disponible} {l.unidad} disp.)</option>
                  ))}
                </select>
                {usoForm.lote_id && (() => {
                  const lot = lotes.find(l => l.id === usoForm.lote_id);
                  return lot ? <p className="text-[8px] text-emerald-400 font-black mt-1.5">Disponible: {lot.cantidad_disponible} {lot.unidad}</p> : null;
                })()}
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Viajero / Orden *</label>
                <input required className="cyber-input w-full" placeholder="EJ: VJ-2026-0042 o ID del viajero" value={usoForm.viajero_id}
                  onChange={e => setUsoForm({ ...usoForm, viajero_id: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Cantidad Usada *</label>
                  <input required type="number" min="0.01" step="0.01" className="cyber-input w-full" value={usoForm.cantidad_usada}
                    onChange={e => setUsoForm({ ...usoForm, cantidad_usada: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Operación</label>
                  <input className="cyber-input w-full" placeholder="EJ: CORTE LÁSER" value={usoForm.operacion}
                    onChange={e => setUsoForm({ ...usoForm, operacion: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Registrado por</label>
                <input className="cyber-input w-full" placeholder="NOMBRE DEL OPERADOR" value={usoForm.registrado_por}
                  onChange={e => setUsoForm({ ...usoForm, registrado_por: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowUsoModal(false)} className="flex-1 h-11 border border-white/10 text-slate-500 font-black uppercase tracking-widest rounded-xl text-[9px]">CANCELAR</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] h-11 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Link2 size={14} /> {editingUso ? 'ACTUALIZAR' : 'REGISTRAR'} USO</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Revisión ── */}
      {showRevModal && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-white uppercase">{editingRev ? 'EDITAR' : 'NUEVO'} <span className="text-purple-400">CAMBIO DE REVISIÓN</span></h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">ECO — ENGINEERING CHANGE ORDER</p>
              </div>
              <button onClick={() => setShowRevModal(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveRev} className="p-5 space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Producto / Parte *</label>
                <select required className="cyber-select w-full" value={revForm.product_id}
                  onChange={e => {
                    const prod = products.find(p => p.id === e.target.value);
                    setRevForm({ ...revForm, product_id: e.target.value, sku: prod?.sku || '', revision_anterior: prod?.revision || '' });
                  }}>
                  <option value="">— SELECCIONAR PRODUCTO —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} (Rev. {p.revision})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Revisión Anterior</label>
                  <input className="cyber-input w-full" value={revForm.revision_anterior} onChange={e => setRevForm({ ...revForm, revision_anterior: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nueva Revisión *</label>
                  <input required className="cyber-input w-full" placeholder="EJ: B" value={revForm.revision_nueva}
                    onChange={e => setRevForm({ ...revForm, revision_nueva: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Descripción del Cambio</label>
                <textarea rows={2} className="cyber-input w-full resize-none" placeholder="QUÉ CAMBIÓ..." value={revForm.descripcion_cambio}
                  onChange={e => setRevForm({ ...revForm, descripcion_cambio: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Impacto</label>
                  <select className="cyber-select w-full" value={revForm.impacto} onChange={e => setRevForm({ ...revForm, impacto: e.target.value })}>
                    <option value="">— SELECCIONAR —</option>
                    {['BOM', 'Plano', 'Proceso', 'Dimensiones', 'Material', 'BOM + Plano', 'Proceso + Plano'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha del Cambio</label>
                  <input type="date" className="cyber-input w-full" value={revForm.fecha_cambio}
                    onChange={e => setRevForm({ ...revForm, fecha_cambio: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Responsable del Cambio</label>
                <input className="cyber-input w-full" placeholder="INGENIERO / ÁREA" value={revForm.cambiado_por}
                  onChange={e => setRevForm({ ...revForm, cambiado_por: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowRevModal(false)} className="flex-1 h-11 border border-white/10 text-slate-500 font-black uppercase tracking-widest rounded-xl text-[9px]">CANCELAR</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] h-11 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest rounded-xl text-[9px] flex items-center justify-center gap-2 transition-all">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><History size={14} /> {editingRev ? 'ACTUALIZAR' : 'REGISTRAR'} CAMBIO</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrazabilidadView;
