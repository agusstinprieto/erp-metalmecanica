import React, { useState, useEffect } from 'react';
import { X, Factory, Save, Loader2, AlertCircle } from 'lucide-react';
import { plantService, type Planta } from '../services/plantService';

interface PlantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Planta | null;
}

export const PlantFormModal: React.FC<PlantFormModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState<Partial<Planta>>({
    codigo: '',
    nombre: '',
    ciudad: '',
    direccion: '',
    responsable: '',
    activa: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        ciudad: '',
        direccion: '',
        responsable: '',
        activa: true
      });
    }
  }, [initialData, isOpen]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.codigo || !formData.nombre || !formData.ciudad) {
        throw new Error('Por favor completa los campos obligatorios: Código, Nombre y Ciudad.');
      }

      if (initialData?.id) {
        await plantService.updatePlant(initialData.id, formData);
      } else {
        await plantService.createPlant(formData);
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la planta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 top-16 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/40">
          <h2 className="text-sm font-black text-white flex items-center gap-2 tracking-tight uppercase">
            <Factory size={16} className="text-mcvill-accent" />
            {initialData ? 'EDITAR PLANTA' : 'NUEVA PLANTA'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-[10px] font-bold">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Código *</label>
              <input 
                type="text" 
                required
                className="cyber-input w-full h-11 text-sm bg-black/40"
                placeholder="Ej. PLT-01"
                value={formData.codigo || ''}
                onChange={e => setFormData({...formData, codigo: e.target.value})}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre de Planta *</label>
              <input 
                type="text" 
                required
                className="cyber-input w-full h-11 text-sm bg-black/40"
                placeholder="Ej. Planta Principal"
                value={formData.nombre || ''}
                onChange={e => setFormData({...formData, nombre: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Ciudad *</label>
              <input 
                type="text" 
                required
                className="cyber-input w-full h-11 text-sm bg-black/40"
                placeholder="Ej. Torreón"
                value={formData.ciudad || ''}
                onChange={e => setFormData({...formData, ciudad: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">País</label>
              <input 
                type="text" 
                className="cyber-input w-full h-11 text-sm bg-black/40"
                placeholder="México"
                value={formData.pais || 'México'}
                onChange={e => setFormData({...formData, pais: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Dirección Física</label>
            <input 
              type="text" 
              className="cyber-input w-full h-11 text-sm bg-black/40"
              placeholder="Ej. Av. Metalurgia #450, Col. Industrial"
              value={formData.direccion || ''}
              onChange={e => setFormData({...formData, direccion: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsable / Horarios de Turnos</label>
            <textarea 
              className="cyber-input w-full h-16 text-sm bg-black/40 py-2 resize-none"
              placeholder="Ej. Ing. Alejandro Gómez (3 Turnos Rotativos 24/7)"
              value={formData.responsable || ''}
              onChange={e => setFormData({...formData, responsable: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-2 py-1">
            <input 
              type="checkbox" 
              id="plant-active" 
              checked={formData.activa ?? true}
              onChange={e => setFormData({...formData, activa: e.target.checked})}
              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-mcvill-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="plant-active" className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">
              Planta Activa y Operativa
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="mcvill-btn-primary flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {initialData ? 'ACTUALIZAR PLANTA' : 'CREAR PLANTA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
