import React, { useState, useEffect } from 'react';
import { X, AlertOctagon, MapPin, Calendar, Users, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { hseService } from '../services/hseService';
import type { HSEIncident } from '../services/hseService';
import { toast } from '../lib/dialogs';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingIncident?: HSEIncident | null;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({ isOpen, onClose, onSuccess, editingIncident }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    incident_date: new Date().toISOString().split('T')[0],
    severity: 'low' as 'low' | 'medium' | 'high' | 'critical',
    involved_employees: [] as string[],
    corrective_actions: '',
    photos_url: [] as string[]
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (editingIncident) {
      setFormData({
        title: editingIncident.title,
        description: editingIncident.description,
        location: editingIncident.location,
        incident_date: editingIncident.incident_date.split('T')[0],
        severity: editingIncident.severity,
        involved_employees: editingIncident.involved_employees || [],
        corrective_actions: editingIncident.corrective_actions || '',
        photos_url: editingIncident.photos_url || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        location: '',
        incident_date: new Date().toISOString().split('T')[0],
        severity: 'low',
        involved_employees: [],
        corrective_actions: '',
        photos_url: []
      });
    }
  }, [editingIncident, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingIncident) {
        await hseService.updateIncident(editingIncident.id, formData);
      } else {
        await hseService.createIncident(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving incident:', err);
      toast('Error al procesar el reporte de incidente', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-[999] flex items-center justify-center p-4 lg:p-8 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-transparent" />
        
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-950/40">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              {editingIncident ? 'ACTUALIZAR' : 'REGISTRO DE'} <span className="text-rose-500">INCIDENTE</span>
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">PROTOCOLO DE SEGURIDAD HSE MCVILL</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Título del Evento</label>
              <div className="relative group">
                <AlertOctagon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-rose-500 transition-colors" size={18} />
                <input 
                  type="text" required
                  className="cyber-input w-full pl-12 h-14 text-sm"
                  placeholder="Ej: Caída de material..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Ubicación / Sector</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-rose-500 transition-colors" size={18} />
                <input 
                  type="text" required
                  className="cyber-input w-full pl-12 h-14 text-sm"
                  placeholder="Ej: Bahía 3"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha del Incidente</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-rose-500 transition-colors" size={18} />
                <input 
                  type="date" required
                  className="cyber-input w-full pl-12 h-14 text-sm"
                  value={formData.incident_date}
                  onChange={e => setFormData({...formData, incident_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nivel de Gravedad</label>
              <div className="relative group">
                <select 
                  className="cyber-select w-full h-14 text-sm px-6"
                  value={formData.severity}
                  onChange={e => setFormData({...formData, severity: e.target.value as any})}
                >
                  <option value="low">BAJO (Sin lesiones)</option>
                  <option value="medium">MEDIO (Primeros auxilios)</option>
                  <option value="high">ALTO (Atención médica)</option>
                  <option value="critical">CRÍTICO (Grave)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción Detallada</label>
            <div className="relative group">
              <FileText className="absolute left-4 top-3 text-slate-600 group-focus-within:text-rose-500 transition-colors" size={18} />
              <textarea 
                required
                className="cyber-input w-full pl-12 py-3 min-h-[100px] text-sm resize-none"
                placeholder="Describa lo ocurrido, causas inmediatas y consecuencias detectadas..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acciones Correctivas Tomadas</label>
            <textarea 
              className="cyber-input w-full p-4 min-h-[80px] text-sm resize-none"
              placeholder="¿Qué se hizo para mitigar el riesgo de inmediato?"
              value={formData.corrective_actions}
              onChange={e => setFormData({...formData, corrective_actions: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl border border-mcvill-card-border text-[11px] font-black uppercase tracking-[0.2em] text-mcvill-text-muted hover:bg-[var(--mcvill-bg)] transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-[2] mcvill-btn mcvill-btn-primary h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-500/10"
            >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
              {editingIncident ? 'ACTUALIZAR_REPORTE' : 'REGISTRAR INCIDENTE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
