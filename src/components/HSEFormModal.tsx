import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, GraduationCap, ShieldAlert, User, Calendar, Clock, Loader2, FileText } from 'lucide-react';
import { hseService } from '../services/hseService';
import type { HSECourse, HSECertification } from '../services/hseService';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';

interface HSEFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'certs' | 'courses';
  onSuccess: () => void;
}

export const HSEFormModal: React.FC<HSEFormModalProps> = ({ isOpen, onClose, type, onSuccess }) => {
  const { isDarkMode } = useConfig();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<HSECourse[]>([]);
  
  // Cert form
  const [certForm, setCertForm] = useState({
    employee_id: '',
    course_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    status: 'active' as const,
    document_url: ''
  });

  // Course form
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    duration_hours: 8,
    category: 'SEGURIDAD',
    validity_months: 12
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    try {
      const [{ data: emps }, { data: crs }] = await Promise.all([
        supabase.from('employees').select('id, first_name, last_name').eq('status', 'active'),
        supabase.from('hse_courses').select('*')
      ]);
      setEmployees(emps?.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` })) || []);
      setCourses(crs || []);
    } catch (err) {
      console.error('Error loading modal dependencies:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'certs') {
        await hseService.createCertification(certForm);
      } else {
        await hseService.createCourse(courseForm);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving HSE record:', err);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = isDarkMode
    ? "w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-[11px] text-white font-bold outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700"
    : "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] text-slate-900 font-bold outline-none focus:border-rose-500 transition-all";

  const labelCls = "text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 lg:left-64 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className={isDarkMode 
          ? "relative w-full max-w-lg bg-slate-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden" 
          : "relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
              {type === 'certs' ? <GraduationCap size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                {type === 'certs' ? 'REGISTRAR CERTIFICACIÓN' : 'NUEVO CURSO / NORMATIVA'}
              </h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Control de Cumplimiento HSE</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {type === 'certs' ? (
            <>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className={labelCls}>Colaborador</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                    <select 
                      required
                      value={certForm.employee_id}
                      onChange={e => setCertForm({...certForm, employee_id: e.target.value})}
                      className={inputCls + " pl-10 appearance-none"}
                    >
                      <option value="">Seleccionar Colaborador...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Curso / Certificación</label>
                  <div className="relative">
                    <ShieldAlert className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                    <select 
                      required
                      value={certForm.course_id}
                      onChange={e => setCertForm({...certForm, course_id: e.target.value})}
                      className={inputCls + " pl-10 appearance-none"}
                    >
                      <option value="">Seleccionar Curso...</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Fecha de Emisión</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="date"
                        required
                        value={certForm.issue_date}
                        onChange={e => setCertForm({...certForm, issue_date: e.target.value})}
                        className={inputCls + " pl-10"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Vencimiento</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="date"
                        required
                        value={certForm.expiry_date}
                        onChange={e => setCertForm({...certForm, expiry_date: e.target.value})}
                        className={inputCls + " pl-10"}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Enlace a Documento (URL)</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                    <input 
                      type="url"
                      placeholder="https://..."
                      value={certForm.document_url}
                      onChange={e => setCertForm({...certForm, document_url: e.target.value})}
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className={labelCls}>Título del Curso</label>
                  <input 
                    required
                    value={courseForm.title}
                    onChange={e => setCourseForm({...courseForm, title: e.target.value})}
                    className={inputCls}
                    placeholder="Ej: NOM-035 Prevención de Riesgos"
                  />
                </div>
                <div>
                  <label className={labelCls}>Descripción</label>
                  <textarea 
                    value={courseForm.description}
                    onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                    className={inputCls + " resize-none h-20"}
                    placeholder="Detalles del curso..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Duración (Horas)</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="number"
                        value={courseForm.duration_hours}
                        onChange={e => setCourseForm({...courseForm, duration_hours: +e.target.value})}
                        className={inputCls + " pl-10"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Vigencia (Meses)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input 
                        type="number"
                        value={courseForm.validity_months}
                        onChange={e => setCourseForm({...courseForm, validity_months: +e.target.value})}
                        className={inputCls + " pl-10"}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Categoría</label>
                  <select 
                    value={courseForm.category}
                    onChange={e => setCourseForm({...courseForm, category: e.target.value})}
                    className={inputCls + " appearance-none"}
                  >
                    <option value="SEGURIDAD">SEGURIDAD</option>
                    <option value="HIGIENE">HIGIENE</option>
                    <option value="NORMATIVA">NORMATIVA</option>
                    <option value="TECNICO">TÉCNICO</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              GUARDAR REGISTRO
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
