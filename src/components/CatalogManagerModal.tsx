import React, { useState, useEffect } from 'react';
import {
  X, Search, Plus, Trash2, Save,
  Settings, Box, Check, AlertCircle,
  Database, RefreshCw, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface CatalogEntry {
  id?: string;
  _isNew?: boolean;
  // Operaciones
  centro_trabajo?: string;
  nombre_operacion?: string;
  instrucciones_default?: string;
  tiempo_min_base?: number;
  // Materiales
  clave?: string;
  descripcion?: string;
  unidad?: string;
  costo_unitario_mxn?: number;
  costo_unitario_usd?: number;
}

interface CatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'operaciones' | 'materiales';
}

export const CatalogManagerModal: React.FC<CatalogManagerModalProps> = ({ isOpen, onClose, type = 'operaciones' }) => {
  const [activeTab, setActiveTab] = useState<'operaciones' | 'materiales'>(type);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CatalogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dangerMsg, setDangerMsg] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const tableName = activeTab === 'operaciones' ? 'catalogo_operaciones' : 'catalogo_materiales';

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (isOpen) setActiveTab(type);
  }, [isOpen, type]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      fetchData();
      setSearchTerm('');
      setPendingDelete(null);
      setError(null);
    }
  }, [isOpen, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code === '42P01') { setData([]); return; }
        throw fetchError;
      }
      setData(result || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const showDanger = (msg: string) => {
    setDangerMsg(msg);
    setTimeout(() => setDangerMsg(null), 2500);
  };

  const handleAdd = () => {
    const newEntry: CatalogEntry = activeTab === 'operaciones'
      ? { _isNew: true, centro_trabajo: '', nombre_operacion: '', instrucciones_default: '', tiempo_min_base: 0 }
      : { _isNew: true, clave: '', descripcion: '', unidad: 'PZA', costo_unitario_mxn: 0, costo_unitario_usd: 0 };
    setData([newEntry, ...data]);
  };

  const handleClone = (idx: number) => {
    const { id, ...rest } = data[idx];
    const clone: CatalogEntry = { ...rest, _isNew: true };
    if (activeTab === 'operaciones' && clone.nombre_operacion) {
      clone.nombre_operacion = clone.nombre_operacion + ' (copia)';
    } else if (activeTab === 'materiales' && clone.descripcion) {
      clone.descripcion = clone.descripcion + ' (copia)';
    }
    const newData = [...data];
    newData.splice(idx + 1, 0, clone);
    setData(newData);
  };

  const handleUpdate = (index: number, updates: Partial<CatalogEntry>) => {
    const newData = [...data];
    newData[index] = { ...newData[index], ...updates };
    setData(newData);
  };

  const handleRemove = (index: number) => {
    const item = data[index];
    if (!item.id) {
      setData(data.filter((_, i) => i !== index));
      return;
    }
    setPendingDelete(index);
  };

  const confirmDelete = async (index: number) => {
    const item = data[index];
    try {
      const { error: deleteError } = await supabase.from(tableName).delete().eq('id', item.id);
      if (deleteError) throw deleteError;
      setData(data.filter((_, i) => i !== index));
      showDanger('Registro eliminado');
    } catch (err: any) {
      setError('Error al eliminar: ' + err.message);
    } finally {
      setPendingDelete(null);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const toUpdate = data.filter(item => item.id);
      const toInsert = data.filter(item => !item.id).map(({ _isNew, ...rest }) => rest);

      if (toInsert.length > 0) {
        const { error: insError } = await supabase.from(tableName).insert(toInsert);
        if (insError) throw insError;
      }

      for (const item of toUpdate) {
        const { id, _isNew, created_at, updated_at, ...updateData } = item as any;
        const { error: updError } = await supabase.from(tableName).update(updateData).eq('id', id);
        if (updError) throw updError;
      }

      showSuccess('Catálogo guardado correctamente');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredData = data.filter(item => {
    const s = searchTerm.toLowerCase();
    if (activeTab === 'operaciones') {
      return item.centro_trabajo?.toLowerCase().includes(s) || item.nombre_operacion?.toLowerCase().includes(s);
    }
    return item.clave?.toLowerCase().includes(s) || item.descripcion?.toLowerCase().includes(s);
  });

  const unsavedCount = data.filter(d => !d.id).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 top-16 left-64 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-400">
                  <Database size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">Catálogos Maestros</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">McVill ERP</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AnimatePresence>
                  {successMsg && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-4 py-2 rounded-2xl text-[10px] font-black"
                    >
                      <Check size={12} /> {successMsg}
                    </motion.div>
                  )}
                  {dangerMsg && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/25 text-rose-400 px-4 py-2 rounded-2xl text-[10px] font-black"
                    >
                      <Trash2 size={12} /> {dangerMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar{unsavedCount > 0 ? ` (${unsavedCount})` : ''}
                </button>
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs + Search + Add */}
            <div className="px-8 py-4 bg-black/20 border-b border-white/5 flex items-center gap-4">
              <div className="flex gap-1 bg-black/30 p-1 rounded-2xl shrink-0">
                <button
                  onClick={() => setActiveTab('operaciones')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'operaciones' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <Settings size={11} /> Operaciones
                </button>
                <button
                  onClick={() => setActiveTab('materiales')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'materiales' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <Box size={11} /> Materiales
                </button>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  type="text"
                  placeholder={activeTab === 'operaciones' ? 'Buscar por CT o nombre...' : 'Buscar por clave o descripción...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-white text-xs focus:border-blue-500/50 outline-none transition-all"
                />
              </div>
              <button
                onClick={handleAdd}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                  activeTab === 'operaciones'
                    ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                }`}
              >
                <Plus size={13} /> Nueva
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="animate-spin text-blue-500 mb-4" size={36} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargando catálogo...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[32px]">
                  <Database className="text-slate-700 mb-4" size={40} />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-5">
                    {searchTerm ? 'Sin resultados' : `El catálogo de ${activeTab} está vacío`}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleAdd}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeTab === 'operaciones' ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                      }`}
                    >
                      <Plus size={13} /> Agregar primero
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredData.map((item, idx) => {
                    const isNew = !item.id;
                    const isDeleting = pendingDelete === idx;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-2xl p-5 transition-all ${
                          isDeleting
                            ? 'bg-red-950/20 border-red-500/30'
                            : isNew
                            ? 'bg-violet-950/20 border-violet-500/25'
                            : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15'
                        }`}
                      >
                        {isNew && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Nuevo — sin guardar</span>
                          </div>
                        )}

                        <div className="flex items-start gap-4">
                          {activeTab === 'operaciones' ? (
                            <>
                              <div className="w-28 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Centro Trabajo</label>
                                <input
                                  type="text"
                                  value={item.centro_trabajo || ''}
                                  onChange={e => handleUpdate(idx, { centro_trabajo: e.target.value.toUpperCase() })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-blue-500/50 outline-none"
                                />
                              </div>
                              <div className="w-52 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Nombre Operación</label>
                                <input
                                  type="text"
                                  value={item.nombre_operacion || ''}
                                  onChange={e => handleUpdate(idx, { nombre_operacion: e.target.value.toUpperCase() })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-blue-400 font-bold focus:border-blue-500/50 outline-none"
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Instrucciones Default</label>
                                <textarea
                                  value={item.instrucciones_default || ''}
                                  onChange={e => handleUpdate(idx, { instrucciones_default: e.target.value })}
                                  rows={2}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none resize-none"
                                />
                              </div>
                              <div className="w-20 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Min Base</label>
                                <input
                                  type="number" min="0" step="5"
                                  value={item.tiempo_min_base ?? 0}
                                  onChange={e => handleUpdate(idx, { tiempo_min_base: Number(e.target.value) })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:border-blue-500/50 outline-none text-center"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-32 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Clave</label>
                                <input
                                  type="text"
                                  value={item.clave || ''}
                                  onChange={e => handleUpdate(idx, { clave: e.target.value.toUpperCase() })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-emerald-500/50 outline-none"
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Descripción</label>
                                <input
                                  type="text"
                                  value={item.descripcion || ''}
                                  onChange={e => handleUpdate(idx, { descripcion: e.target.value })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500/50 outline-none"
                                />
                              </div>
                              <div className="w-16 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">UM</label>
                                <input
                                  type="text"
                                  value={item.unidad || ''}
                                  onChange={e => handleUpdate(idx, { unidad: e.target.value.toUpperCase() })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-emerald-500/50 outline-none text-center"
                                />
                              </div>
                              <div className="w-24 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">$ MXN</label>
                                <input
                                  type="number" min="0" step="0.01"
                                  value={item.costo_unitario_mxn ?? 0}
                                  onChange={e => handleUpdate(idx, { costo_unitario_mxn: Number(e.target.value) })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:border-emerald-500/50 outline-none"
                                />
                              </div>
                              <div className="w-24 space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">$ USD</label>
                                <input
                                  type="number" min="0" step="0.01"
                                  value={item.costo_unitario_usd ?? 0}
                                  onChange={e => handleUpdate(idx, { costo_unitario_usd: Number(e.target.value) })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-blue-400 font-bold focus:border-blue-500/50 outline-none"
                                />
                              </div>
                            </>
                          )}

                          {/* Acciones por fila */}
                          <div className="flex flex-col gap-1.5 pt-5 shrink-0">
                            {isDeleting ? (
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => confirmDelete(idx)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                  Eliminar
                                </button>
                                <button
                                  onClick={() => setPendingDelete(null)}
                                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleClone(idx)}
                                  title="Clonar"
                                  className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  onClick={() => handleRemove(idx)}
                                  title="Eliminar"
                                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}{searchTerm ? ' encontrados' : ''}
              </span>
              {unsavedCount > 0 && (
                <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
                  {unsavedCount} pendiente{unsavedCount !== 1 ? 's' : ''} de guardar
                </span>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CatalogManagerModal;
