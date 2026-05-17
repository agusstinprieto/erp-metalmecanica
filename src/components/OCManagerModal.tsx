import React, { useState, useEffect } from 'react'; // McVill OC Manager
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Plus, Search, FileText, 
  Calendar, User, DollarSign, Trash2,
  RefreshCw, CheckCircle2, AlertCircle,
  ChevronDown, ExternalLink, UserPlus,
  List, LayoutGrid
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { appConfirm } from '../lib/dialogs';
import { ClientManagerModal } from './ClientManagerModal';

interface Cliente {
  id: string;
  razon_social: string;
}

interface OCCliente {
  id?: string;
  tenant_id?: string;
  numero_oc: string;
  cliente_id?: string;
  cliente_nombre?: string;
  numero_parte?: string;
  descripcion?: string;
  cantidad?: number;
  fecha_emision: string;
  fecha_entrega_esperada?: string;
  monto_total: number;
  moneda: string;
  estatus: string;
  notas?: string;
}

interface OCManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
}

export const OCManagerModal: React.FC<OCManagerModalProps> = ({ isOpen, onClose, isInline }) => {
  const [ocs, setOcs] = useState<OCCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [activeOCIndex, setActiveOCIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

  useEffect(() => {
    if (isOpen || isInline) {
      fetchData();
    }
  }, [isOpen, isInline]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: ocData }, { data: cliData }] = await Promise.all([
        supabase.from('ordenes_compra_cliente').select('*').order('created_at', { ascending: false }),
        supabase.from('clientes').select('id, razon_social').order('razon_social')
      ]);

      setOcs(ocData || []);
      setClientes(cliData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOC = () => {
    const newOC: OCCliente = {
      numero_oc: '',
      numero_parte: '',
      descripcion: '',
      cantidad: 1,
      fecha_emision: new Date().toISOString().split('T')[0],
      estatus: 'ABIERTA',
      moneda: 'MXN',
      monto_total: 0
    };
    setOcs([newOC, ...ocs]);
    setViewMode('card'); // Switch to card to edit the new one
  };

  const updateOC = (index: number, field: keyof OCCliente, value: any) => {
    const updated = [...ocs];
    updated[index] = { ...updated[index], [field]: value };
    
    // If client changes, update denormalized name
    if (field === 'cliente_id') {
      const client = clientes.find(c => c.id === value);
      updated[index].cliente_nombre = client?.razon_social || '';
    }
    
    setOcs(updated);
  };

  const handleSave = async (oc: OCCliente) => {
    if (!oc.numero_oc) {
      setError('El número de OC es obligatorio');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { id, ...payload } = oc;
      payload.tenant_id = 'mcvill';
      
      let result;
      
      if (id) {
        result = await supabase.from('ordenes_compra_cliente').update(payload).eq('id', id);
      } else {
        result = await supabase.from('ordenes_compra_cliente').insert(payload);
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
    if (!await appConfirm('¿Seguro que deseas eliminar esta Orden de Compra?')) return;
    
    try {
      const { error } = await supabase.from('ordenes_compra_cliente').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredOcs = ocs.filter(oc => 
    oc.numero_oc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (oc.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ABIERTA': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'EN PROCESO': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'SURTIDA': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'CERRADA': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'CANCELADA': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default: return 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  if (!isOpen && !isInline) return null;

  const content = (
    <div className={`relative ${isInline ? 'w-full h-full' : 'w-full max-w-5xl bg-[#0a0f1d] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'}`}>
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
            <FileText className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Órdenes de Compra Clientes</h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Control de pedidos y trazabilidad</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all shadow-inner"
            title="Refrescar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {!isInline && (
            <button 
              onClick={onClose}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 transition-all shadow-inner"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-[#060b18]">
        {/* Search & Actions */}
        <div className="px-8 py-5 border-b border-white/5 bg-slate-900/20 flex items-center justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Buscar por número de OC o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none transition-all placeholder:text-slate-600 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
            <button 
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'card' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vista de Lista"
            >
              <List size={18} />
            </button>
          </div>

          <button 
            onClick={handleAddOC}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
          >
            <Plus size={16} />
            Nueva OC
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              <span className="text-xs font-bold">{error}</span>
            </div>
          )}

          {viewMode === 'list' && filteredOcs.length > 0 ? (
            <div className="bg-slate-900/40 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Orden</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">P/N & Descripción</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Cant.</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Estatus</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOcs.map((oc, idx) => (
                    <tr key={oc.id || `row-${idx}`} className="hover:bg-blue-500/[0.02] transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-black text-blue-400 uppercase tracking-tighter">{oc.numero_oc || 'SIN FOLIO'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-white font-bold">{oc.cliente_nombre || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{oc.numero_parte || '—'}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{oc.descripcion || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-black text-white">{oc.cantidad || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-black text-emerald-400">
                          {oc.monto_total ? new Intl.NumberFormat('en-US', { style: 'currency', currency: oc.moneda || 'MXN' }).format(oc.monto_total) : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(oc.estatus)}`}>
                          {oc.estatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setViewMode('card')} 
                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20"
                            title="Editar en Tarjeta"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {loading && ocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando datos...</p>
                </div>
              ) : filteredOcs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600 border-2 border-dashed border-white/5 rounded-[40px]">
                  <FileText size={48} className="opacity-20 mb-4" />
                  <p className="text-sm font-bold">No se encontraron órdenes de compra</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-60">Inicia un nuevo registro arriba</p>
                </div>
              ) : (
                filteredOcs.map((oc, idx) => (
                  <div 
                    key={oc.id || `new-${idx}`}
                    className="bg-slate-900/40 border border-white/5 rounded-[32px] overflow-hidden hover:border-blue-500/30 transition-all group"
                  >
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left: Client & Core Info */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Número de OC</label>
                            <input 
                              type="text"
                              value={oc.numero_oc}
                              onChange={e => updateOC(idx, 'numero_oc', e.target.value.toUpperCase())}
                              placeholder="OC-001"
                              className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-sm text-blue-400 font-bold outline-none focus:border-blue-500/40 transition-all shadow-inner"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Cliente</label>
                            <div className="flex gap-2">
                              <select 
                                value={oc.cliente_id || ''}
                                onChange={e => updateOC(idx, 'cliente_id', e.target.value)}
                                className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/40 transition-all appearance-none shadow-inner"
                              >
                                <option value="">Seleccionar cliente...</option>
                                {clientes.map(c => (
                                  <option key={c.id} value={c.id}>{c.razon_social}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => { setIsClientModalOpen(true); setActiveOCIndex(idx); }}
                                className="p-3 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded-2xl transition-all border border-blue-500/20 shadow-inner"
                                title="Nuevo Cliente"
                              >
                                <UserPlus size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Center: Product Details */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Número de Parte</label>
                            <input 
                              type="text"
                              value={oc.numero_parte || ''}
                              onChange={e => updateOC(idx, 'numero_parte', e.target.value.toUpperCase())}
                              placeholder="P/N-000"
                              className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/40 transition-all shadow-inner"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Cant. OC</label>
                            <input 
                              type="number"
                              value={oc.cantidad === undefined ? 1 : oc.cantidad}
                              onFocus={e => e.target.select()}
                              onChange={e => updateOC(idx, 'cantidad', e.target.value === '' ? undefined : Number(e.target.value))}
                              className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/40 transition-all shadow-inner"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Descripción del Producto</label>
                          <input 
                            type="text"
                            value={oc.descripcion || ''}
                            onChange={e => updateOC(idx, 'descripcion', e.target.value)}
                            placeholder="Descripción técnica..."
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/40 transition-all shadow-inner"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Fecha Emisión</label>
                            <div className="relative">
                              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                type="date"
                                value={oc.fecha_emision}
                                onChange={e => updateOC(idx, 'fecha_emision', e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-xs text-slate-300 outline-none shadow-inner"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Entrega Esperada</label>
                            <div className="relative">
                              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                type="date"
                                value={oc.fecha_entrega_esperada || ''}
                                onChange={e => updateOC(idx, 'fecha_entrega_esperada', e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-xs text-slate-300 outline-none shadow-inner"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Financials & Status */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Monto Total</label>
                            <div className="relative">
                              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                type="text"
                                value={oc.monto_total ? new Intl.NumberFormat('en-US').format(oc.monto_total) : ''}
                                onFocus={e => e.target.select()}
                                onChange={e => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '');
                                  updateOC(idx, 'monto_total', val === '' ? 0 : Number(val));
                                }}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-base text-emerald-400 font-black outline-none shadow-inner"
                              />
                            </div>
                          </div>
                          <div className="w-24">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Moneda</label>
                            <select
                              value={oc.moneda || 'MXN'}
                              onChange={e => updateOC(idx, 'moneda', e.target.value)}
                              className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs text-slate-300 outline-none appearance-none shadow-inner"
                            >
                              <option value="MXN">MXN</option>
                              <option value="USD">USD</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 block ml-1">Estatus</label>
                          <select 
                            value={oc.estatus}
                            onChange={e => updateOC(idx, 'estatus', e.target.value)}
                            className={`w-full border rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none transition-all shadow-inner ${getStatusColor(oc.estatus)}`}
                          >
                            <option value="ABIERTA">ABIERTA</option>
                            <option value="EN PROCESO">EN PROCESO</option>
                            <option value="SURTIDA">SURTIDA</option>
                            <option value="CERRADA">CERRADA</option>
                            <option value="CANCELADA">CANCELADA</option>
                          </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                          {oc.id && (
                            <button 
                              onClick={() => handleDelete(oc.id!)}
                              className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-2xl transition-all border border-rose-500/20 shadow-inner"
                              title="Eliminar OC"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleSave(oc)}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                          >
                            {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={18} />}
                            Guardar OC
                          </button>
                        </div>
                        
                        <div className="mt-2 p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group/traz">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Trazabilidad</span>
                          <div className="flex items-center gap-2 text-indigo-400 group-hover/traz:text-indigo-300 cursor-pointer transition-all">
                            <span className="text-[10px] font-bold">Ver Viajeros</span>
                            <ChevronDown size={14} className="group-hover/traz:translate-y-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <ClientManagerModal
        isOpen={isClientModalOpen}
        onClose={() => { setIsClientModalOpen(false); setActiveOCIndex(null); }}
        onSuccess={(newClient) => {
          fetchData(); // Refresh clients
          if (activeOCIndex !== null) {
            updateOC(activeOCIndex, 'cliente_id', newClient.id);
          }
        }}
      />
    </div>
  );

  if (isInline) return content;

  return (
    <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-6xl flex"
      >
        {content}
      </motion.div>
    </div>
  );
};
