import React, { useState, useEffect } from 'react';
import { 
  X, 
  Loader2, 
  Cpu, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import type { Machine } from '../services/maintenanceService';

interface MachineFormModalProps {
  onClose: () => void;
  onMachineSaved: () => void;
  editingMachine: Machine | null;
}

export const MachineFormModal: React.FC<MachineFormModalProps> = ({ onClose, onMachineSaved, editingMachine }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: 'operational' as 'operational' | 'warning' | 'maintenance',
    usage: 0,
    next_maintenance: new Date().toISOString().split('T')[0],
    health: 100,
    critical: false,
    purchase_date: '',
    warranty_expiration: '',
    cost: 0,
    spare_parts: [] as string[],
    manual_url: ''
  });
  const [newSparePart, setNewSparePart] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (editingMachine) {
      setFormData({
        name: editingMachine.name,
        status: editingMachine.status,
        usage: editingMachine.usage,
        next_maintenance: new Date(editingMachine.next_maintenance).toISOString().split('T')[0],
        health: editingMachine.health,
        critical: editingMachine.critical,
        purchase_date: editingMachine.purchase_date || '',
        warranty_expiration: editingMachine.warranty_expiration || '',
        cost: editingMachine.cost || 0,
        spare_parts: editingMachine.spare_parts || [],
        manual_url: editingMachine.manual_url || ''
      });
    }
  }, [editingMachine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingMachine) {
        await maintenanceService.updateMachine(editingMachine.id, formData);
      } else {
        await maintenanceService.createMachine(formData);
      }
      onMachineSaved();
      onClose();
    } catch (error) {
      console.error('Error saving machine:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSparePart = () => {
    if (newSparePart.trim()) {
      setFormData({ ...formData, spare_parts: [...formData.spare_parts, newSparePart.toUpperCase()] });
      setNewSparePart('');
    }
  };

  const removeSparePart = (index: number) => {
    const updated = [...formData.spare_parts];
    updated.splice(index, 1);
    setFormData({ ...formData, spare_parts: updated });
  };

  return (
    <div className="fixed inset-0 lg:left-64 top-16 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-950 border border-mcvill-card-border rounded-2xl overflow-hidden shadow-[0_0_120px_var(--theme-glow)] relative my-8">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mcvill-accent to-transparent" />
        
        <div className="p-10 border-b border-mcvill-card-border bg-mcvill-accent/5 flex justify-between items-center">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tight uppercase">
              {editingMachine ? 'ACTUALIZAR' : 'REGISTRAR'} <span className="text-mcvill-accent">ACTIVO</span>
            </h3>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">
              Gestión Maestra de Infraestructura Industrial
            </p>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-mcvill-accent/10 text-mcvill-accent hover:text-rose-500 hover:bg-rose-500/10 transition-all">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Info */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Nombre del Equipo</label>
              <div className="relative group">
                <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mcvill-accent transition-colors" size={18} />
                <input 
                  required
                  type="text" 
                  className="cyber-input w-full h-14 pl-12"
                  placeholder="CNC HAAS VF-4..."
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Estado Operativo</label>
              <select 
                className="cyber-select w-full h-14"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="operational">SISTEMA_OK (OPERATIVO)</option>
                <option value="warning">WARN_L2 (ALERTA)</option>
                <option value="maintenance">DOWNTIME_L3 (MANTENIMIENTO)</option>
              </select>
            </div>

            {/* Financial & Warranty */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Costo de Adquisición (USD)</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mcvill-accent transition-colors" size={18} />
                <input 
                  type="number" 
                  className="cyber-input w-full h-14 pl-12"
                  value={formData.cost}
                  onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Fecha de Compra</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mcvill-accent transition-colors" size={18} />
                <input 
                  type="date" 
                  className="cyber-input w-full h-14 pl-12"
                  value={formData.purchase_date}
                  onChange={e => setFormData({...formData, purchase_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Vencimiento de Garantía</label>
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mcvill-accent transition-colors" size={18} />
                <input 
                  type="date" 
                  className="cyber-input w-full h-14 pl-12"
                  value={formData.warranty_expiration}
                  onChange={e => setFormData({...formData, warranty_expiration: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Próximo Mantenimiento</label>
              <div className="relative group">
                <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mcvill-accent transition-colors" size={18} />
                <input 
                  required
                  type="date" 
                  className="cyber-input w-full h-14 pl-12"
                  value={formData.next_maintenance}
                  onChange={e => setFormData({...formData, next_maintenance: e.target.value})}
                />
              </div>
            </div>

            {/* Critical Switch */}
            <div className="flex items-center gap-4 col-span-full p-4 bg-mcvill-accent/5 rounded-2xl border border-mcvill-card-border">
              <input 
                type="checkbox" 
                id="is-critical"
                className="w-6 h-6 accent-mcvill-accent rounded bg-slate-950 border-mcvill-card-border"
                checked={formData.critical}
                onChange={e => setFormData({...formData, critical: e.target.checked})}
              />
              <label htmlFor="is-critical" className="text-[10px] font-black text-white uppercase tracking-widest cursor-pointer">
                Activo Crítico (Requiere monitoreo 24/7)
              </label>
            </div>

            {/* Spare Parts / Refacciones */}
            <div className="space-y-3 col-span-full">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Refacciones y Componentes</label>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  className="cyber-input flex-1 h-14"
                  placeholder="EJ: SERVOMOTOR X-AXIS"
                  value={newSparePart}
                  onChange={e => setNewSparePart(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSparePart())}
                />
                <button 
                  type="button" 
                  onClick={addSparePart}
                  className="w-14 h-14 bg-mcvill-accent/5 hover:bg-mcvill-accent/10 text-mcvill-accent rounded-2xl flex items-center justify-center transition-all border border-mcvill-card-border"
                >
                  <Plus size={24} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {formData.spare_parts.map((part, idx) => (
                  <div key={idx} className="px-4 py-2 bg-mcvill-accent/10 border border-mcvill-card-border text-mcvill-accent rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    {part}
                    <button onClick={() => removeSparePart(idx)} className="hover:text-rose-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-6">
            <button type="button" onClick={onClose} className="flex-1 h-14 border border-mcvill-card-border text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-mcvill-accent/5 transition-all">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-4 bg-mcvill-accent hover:bg-mcvill-cyber text-slate-950 font-black py-6 rounded-2xl transition-all shadow-[0_0_30px_var(--theme-glow)] hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Settings size={20} />}
              <span className="uppercase tracking-[0.3em] text-sm">
                {editingMachine ? 'GUARDAR CAMBIOS' : 'CONFIRMAR REGISTRO'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
