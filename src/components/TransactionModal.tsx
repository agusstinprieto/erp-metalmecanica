import React, { useState } from 'react';
import { X, Receipt, DollarSign, Calendar, Tag, User, Loader2, CheckCircle2 } from 'lucide-react';
import { financeService } from '../services/financeService';
import type { Transaction } from '../services/financeService';
import { toast } from '../lib/dialogs';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess, editingTransaction }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    entity: '',
    category: 'Materia Prima',
    amount: 0,
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    description: '',
    status: 'completed' as const
  });

  React.useEffect(() => {
    if (editingTransaction) {
      setFormData({
        entity: editingTransaction.entity,
        category: editingTransaction.category,
        amount: Math.abs(editingTransaction.amount),
        type: editingTransaction.type,
        date: editingTransaction.date,
        description: editingTransaction.description || '',
        status: editingTransaction.status
      });
    } else {
      setFormData({
        entity: '',
        category: 'Materia Prima',
        amount: 0,
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        description: '',
        status: 'completed'
      });
    }
  }, [editingTransaction, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingTransaction) {
        await financeService.updateTransaction(editingTransaction.id, formData);
      } else {
        await financeService.createTransaction(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving transaction:', err);
      toast('Error al procesar el movimiento', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 top-16 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-slate-900 border border-mcvill-card-border rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-mcvill-accent to-transparent" />
        
        <div className="flex items-center justify-between p-4 border-b border-mcvill-card-border bg-slate-950/50">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">
              {editingTransaction ? 'ACTUALIZAR' : 'REGISTRO'} <span className="text-mcvill-accent">CONTABLE</span>
            </h2>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">GESTIÓN DE TESORERÍA</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex p-1 bg-slate-950 rounded-2xl border border-mcvill-card-border">
            <button 
              type="button"
              onClick={() => setFormData({...formData, type: 'income'})}
              className={`flex-1 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.type === 'income' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Ingreso
            </button>
            <button 
              type="button"
              onClick={() => setFormData({...formData, type: 'expense'})}
              className={`flex-1 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.type === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Egreso
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Entidad / Beneficiario</label>
            <div className="relative group">
              <User className="absolute left-4 top-2.5 text-slate-600 group-focus-within:text-mcvill-accent transition-colors" size={16} />
              <input 
                type="text" required
                className="cyber-input w-full pl-10 h-10 text-sm"
                placeholder="Nombre de la empresa o persona"
                value={formData.entity}
                onChange={e => setFormData({...formData, entity: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Monto</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-2.5 text-slate-600 group-focus-within:text-mcvill-accent transition-colors" size={16} />
                <input 
                  type="number" step="0.01" required
                  className="cyber-input w-full pl-10 h-10 text-sm font-mono"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fecha</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-2.5 text-slate-600 group-focus-within:text-mcvill-accent transition-colors" size={16} />
                <input 
                  type="date" required
                  className="cyber-input w-full pl-10 h-10 text-sm"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Categoría</label>
            <div className="relative group">
              <Tag className="absolute left-4 top-2.5 text-slate-600 group-focus-within:text-mcvill-accent transition-colors" size={16} />
              <select 
                className="cyber-select w-full pl-10 h-10 text-sm appearance-none px-4"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="Materia Prima">Materia Prima</option>
                <option value="Venta Producto">Venta Producto</option>
                <option value="Nómina">Nómina</option>
                <option value="Servicios">Servicios (CFE, Agua, etc)</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Logística">Logística</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="mcvill-btn mcvill-btn-primary w-full py-3 h-auto rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl"
            >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
              {editingTransaction ? 'ACTUALIZAR_SISTEMA' : 'EJECUTAR TRANSACCIÓN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
