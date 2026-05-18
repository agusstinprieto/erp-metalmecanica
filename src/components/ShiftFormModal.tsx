import React, { useState, useEffect } from 'react';
import { X, Clock, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { shiftService, type WorkShift } from '../services/shiftService';
import { useTenant } from '../hooks/useTenant';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: WorkShift | null;
}

export const ShiftFormModal: React.FC<ShiftFormModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const tenantId = useTenant();
  const [formData, setFormData] = useState<Partial<WorkShift>>({
    name: '',
    start_time: '08:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    is_active: true,
    tenant_id: tenantId,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        monday: initialData.monday !== false,
        tuesday: initialData.tuesday !== false,
        wednesday: initialData.wednesday !== false,
        thursday: initialData.thursday !== false,
        friday: initialData.friday !== false,
        saturday: !!initialData.saturday,
        sunday: !!initialData.sunday
      });
    } else {
      setFormData({
        name: '',
        start_time: '08:00',
        end_time: '18:00',
        grace_period_minutes: 15,
        is_active: true,
        tenant_id: tenantId,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      });
    }
  }, [initialData, isOpen, tenantId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name || !formData.start_time || !formData.end_time) {
        throw new Error('Por favor completa todos los campos.');
      }

      if (initialData?.id) {
        await shiftService.updateShift(initialData.id, formData);
      } else {
        await shiftService.createShift(formData);
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el turno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 top-16 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/40">
          <h2 className="text-sm font-black text-white flex items-center gap-2 tracking-tight uppercase">
            <Clock size={16} className="text-mcvill-accent" />
            {initialData ? 'EDITAR TURNO' : 'NUEVO TURNO'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-[10px] font-bold">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Turno</label>
            <input 
              type="text" 
              required
              className="cyber-input w-full h-11 text-sm bg-black/40"
              placeholder="Ej. Matutino Industrial"
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora Entrada</label>
              <input 
                type="time" 
                required
                className="cyber-input w-full h-11 text-sm bg-black/40 px-4"
                value={formData.start_time || ''}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Hora Salida</label>
              <input 
                type="time" 
                required
                className="cyber-input w-full h-11 text-sm bg-black/40 px-4"
                value={formData.end_time || ''}
                onChange={e => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Días Aplicables</label>
            <div className="flex justify-between items-center gap-1.5">
              {[
                { key: 'monday', label: 'L', name: 'Lunes' },
                { key: 'tuesday', label: 'M', name: 'Martes' },
                { key: 'wednesday', label: 'M', name: 'Miércoles' },
                { key: 'thursday', label: 'J', name: 'Jueves' },
                { key: 'friday', label: 'V', name: 'Viernes' },
                { key: 'saturday', label: 'S', name: 'Sábado' },
                { key: 'sunday', label: 'D', name: 'Domingo' }
              ].map(day => {
                const isActive = !!formData[day.key as keyof WorkShift];
                return (
                  <button
                    key={day.key}
                    type="button"
                    title={day.name}
                    onClick={() => setFormData({ ...formData, [day.key]: !isActive })}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center border ${
                      isActive 
                        ? 'bg-mcvill-accent text-slate-950 border-mcvill-accent shadow-[0_0_12px_rgba(26,140,255,0.25)]' 
                        : 'bg-black/40 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tolerancia (Minutos)</label>
            <input 
              type="number" 
              min="0"
              max="60"
              className="cyber-input w-full h-11 text-sm bg-black/40"
              value={formData.grace_period_minutes || 0}
              onChange={e => setFormData({...formData, grace_period_minutes: parseInt(e.target.value)})}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="mcvill-btn-primary flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {initialData ? 'ACTUALIZAR TURNO' : 'CREAR TURNO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
