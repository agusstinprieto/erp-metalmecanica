import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Plus, Search, Truck, 
  Calendar, DollarSign, Trash2,
  RefreshCw, CheckCircle2, AlertCircle,
  ChevronDown, Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { appConfirm } from '../lib/dialogs';

interface Proveedor {
  id: string;
  razon_social: string;
}

interface OCProveedor {
  id?: string;
  numero_oc: string;
  proveedor_id?: string;
  proveedor_nombre?: string;
  fecha_emision?: string;
  fecha_recepcion_estimada?: string;
  monto_total?: number;
  moneda?: string;
  estatus?: string;
  notas?: string;
}

interface OCProveedorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OCProveedorManagerModal: React.FC<OCProveedorManagerModalProps> = ({ isOpen, onClose }) => {
  const [ocs, setOcs] = useState<OCProveedor[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: ocData }, { data: provData }] = await Promise.all([
        supabase.from('ordenes_compra_proveedor').select('*').order('created_at', { ascending: false }),
        supabase.from('proveedores').select('id, razon_social').order('razon_social')
      ]);

      setOcs(ocData || []);
      setProveedores(provData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOC = () => {
    const newOC: OCProveedor = {
      numero_oc: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      estatus: 'BORRADOR',
      moneda: 'MXN',
      monto_total: 0
    };
    setOcs([newOC, ...ocs]);
  };

  const updateOC = (index: number, field: keyof OCProveedor, value: any) => {
    const updated = [...ocs];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'proveedor_id') {
      const prov = proveedores.find(p => p.id === value);
      updated[index].proveedor_nombre = prov?.razon_social || '';
    }
    
    setOcs(updated);
  };

  const handleSave = async (oc: OCProveedor) => {
    if (!oc.numero_oc) {
      setError('El número de OC es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const { id, ...payload } = oc;
      let result;
      
      if (id) {
        result = await supabase.from('ordenes_compra_proveedor').update(payload).eq('id', id);
      } else {
        result = await supabase.from('ordenes_compra_proveedor').insert(payload);
      }

      if (result.error) throw result.error;
      
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await appConfirm('¿Seguro que deseas eliminar esta Orden de Compra de Proveedor?')) return;
    
    try {
      const { error } = await supabase.from('ordenes_compra_proveedor').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredOcs = ocs.filter(oc => 
    oc.numero_oc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (oc.proveedor_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BORRADOR': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'SOLICITADA': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'RECIBIDA': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PARCIAL': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CANCELADA': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default: return 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 left-64 top-16 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md -left-64 -top-16" 
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-5xl bg-[#0a0f1d] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Órdenes de Compra Proveedores</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Gestión de Abastecimiento y Recepción</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 bg-white/[0.01] flex items-center gap-4 border-b border-white/5">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por número de OC o proveedor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-amber-500/40 outline-none transition-all placeholder:text-slate-700"
            />
          </div>
          <button 
            onClick={handleAddOC}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-600/20"
          >
            <Plus size={16} /> Nueva OC Proveedor
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400">
              <AlertCircle size={18} />
              <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-500/10 rounded-lg"><X size={14} /></button>
            </div>
          )}

          <div className="space-y-4">
            {loading && ocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <RefreshCw className="animate-spin text-amber-500 mb-4" size={40} />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargando OCs...</p>
              </div>
            ) : filteredOcs.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-[40px]">
                <Package className="mx-auto text-slate-800 mb-4" size={48} />
                <p className="text-sm font-black text-slate-600 uppercase tracking-widest">No hay Órdenes de Compra registradas</p>
              </div>
            ) : (
              filteredOcs.map((oc, idx) => (
                <div 
                  key={oc.id || `new-${idx}`}
                  className="group bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-[32px] p-6 transition-all"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* OC Info */}
                    <div className="space-y-4 col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Número de OC</label>
                          <input 
                            type="text"
                            value={oc.numero_oc}
                            onChange={e => updateOC(idx, 'numero_oc', e.target.value)}
                            placeholder="COMP-0000"
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-2.5 text-sm text-amber-400 font-black focus:border-amber-500/40 outline-none"
                          />
                        </div>
                        <div className="w-48">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Proveedor</label>
                          <select
                            value={oc.proveedor_id || ''}
                            onChange={e => updateOC(idx, 'proveedor_id', e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-2.5 text-sm text-white focus:border-amber-500/40 outline-none appearance-none"
                          >
                            <option value="">Seleccionar Proveedor</option>
                            {proveedores.map(p => (
                              <option key={p.id} value={p.id}>{p.razon_social}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Fecha Emisión</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input 
                              type="date"
                              value={oc.fecha_emision}
                              onChange={e => updateOC(idx, 'fecha_emision', e.target.value)}
                              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-300 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Recepción Estimada</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input 
                              type="date"
                              value={oc.fecha_recepcion_estimada || ''}
                              onChange={e => updateOC(idx, 'fecha_recepcion_estimada', e.target.value)}
                              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-300 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financials & Status */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Monto Total</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input 
                              type="number"
                              value={oc.monto_total || 0}
                              onChange={e => updateOC(idx, 'monto_total', Number(e.target.value))}
                              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-emerald-400 font-bold outline-none"
                            />
                          </div>
                        </div>
                        <div className="w-20">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Moneda</label>
                          <select
                            value={oc.moneda || 'MXN'}
                            onChange={e => updateOC(idx, 'moneda', e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-3 py-2.5 text-xs text-slate-300 outline-none appearance-none"
                          >
                            <option value="MXN">MXN</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Estatus</label>
                        <select
                          value={oc.estatus || 'BORRADOR'}
                          onChange={e => updateOC(idx, 'estatus', e.target.value)}
                          className={`w-full border rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none transition-all ${getStatusColor(oc.estatus || 'BORRADOR')}`}
                        >
                          <option value="BORRADOR">BORRADOR</option>
                          <option value="SOLICITADA">SOLICITADA</option>
                          <option value="RECIBIDA">RECIBIDA</option>
                          <option value="PARCIAL">PARCIAL</option>
                          <option value="CANCELADA">CANCELADA</option>
                        </select>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col justify-between">
                      <div className="flex justify-end gap-2">
                        {oc.id && (
                          <button 
                            onClick={() => handleDelete(oc.id!)}
                            className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-2xl transition-all border border-rose-500/20"
                            title="Eliminar OC"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleSave(oc)}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                        >
                          {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={16} />}
                          Guardar
                        </button>
                      </div>
                      
                      <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Almacén</span>
                        <div className="flex items-center gap-2 text-amber-400 hover:text-amber-300 cursor-pointer transition-all">
                          <span className="text-[10px] font-bold">Ver Recepciones</span>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
