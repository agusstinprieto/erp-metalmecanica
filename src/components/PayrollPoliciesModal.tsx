import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Save, Loader2, Award
} from 'lucide-react';
import clsx from 'clsx';
import { useConfig } from '../contexts/ConfigContext';

interface PayrollPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AUTHORIZERS_CONFIG = {
  supervisor: { label: '1. SUPERVISOR INMEDIATO', desc: 'Valida tiempo laborado en campo' },
  gerencia: { label: '2. GERENCIA DEL ÁREA', desc: 'Autoriza justificación operativa' },
  produccion: { label: '3. DIRECCIÓN DE PRODUCCIÓN', desc: 'Filtra contra plan de producción' },
  rh: { label: '4. RECURSOS HUMANOS', desc: 'Valida incidencias y pre-nómina' },
  operaciones: { label: '5. GERENCIA DE OPERACIONES', desc: 'Autorización técnica y logística' },
  administracion: { label: '6. GERENCIA ADMINISTRATIVA', desc: 'Liberación de flujo y pago final' },
};

export const PayrollPoliciesModal: React.FC<PayrollPoliciesModalProps> = ({
  isOpen,
  onClose
}) => {
  const { isDarkMode, config, updateConfig } = useConfig();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // States mirroring context
  const [overtimeCutoffStartDay, setOvertimeCutoffStartDay] = useState('martes');
  const [overtimeCutoffEndDay, setOvertimeCutoffEndDay] = useState('lunes');
  const [overtimePaymentDay, setOvertimePaymentDay] = useState('viernes');
  const [overtimeStrictAccess, setOvertimeStrictAccess] = useState(true);
  const [overtimeServicesLimitTime, setOvertimeServicesLimitTime] = useState('14:00');
  const [overtimeRequiredAuthorizers, setOvertimeRequiredAuthorizers] = useState<string[]>([
    'supervisor', 'gerencia', 'operaciones', 'rh', 'administracion'
  ]);

  useEffect(() => {
    if (isOpen) {
      setOvertimeCutoffStartDay(config.overtimeCutoffStartDay ?? 'martes');
      setOvertimeCutoffEndDay(config.overtimeCutoffEndDay ?? 'lunes');
      setOvertimePaymentDay(config.overtimePaymentDay ?? 'viernes');
      setOvertimeStrictAccess(config.overtimeStrictAccess ?? true);
      setOvertimeServicesLimitTime(config.overtimeServicesLimitTime ?? '14:00');
      setOvertimeRequiredAuthorizers(config.overtimeRequiredAuthorizers ?? ['supervisor', 'gerencia', 'operaciones', 'rh', 'administracion']);
    }
  }, [isOpen, config]);

  const handleSave = async () => {
    setSaving(true);
    await updateConfig({
      overtimeCutoffStartDay,
      overtimeCutoffEndDay,
      overtimePaymentDay,
      overtimeStrictAccess,
      overtimeServicesLimitTime,
      overtimeRequiredAuthorizers,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const inputCls = 'bg-slate-900/90 border border-white/10 rounded-xl w-full px-4 h-11 font-mono text-[11px] text-white focus:border-mcvill-accent/50 focus:ring-1 focus:ring-mcvill-accent/30 transition-all outline-none';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 lg:left-64 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 lg:p-8"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={clsx(
              "w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/5 shadow-2xl flex flex-col overflow-hidden",
              isDarkMode ? "bg-slate-950 text-white" : "bg-slate-900 text-white"
            )}
          >
            {/* Modal Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5 shrink-0 bg-slate-900/40">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center">
                  <Award className="text-mcvill-accent" size={24} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-widest text-white">
                    POLÍTICAS DE TIEMPO EXTRA (RH & NÓMINAS)
                  </h2>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-0.5">
                    Parámetros Operativos de Planta y Matriz de Firmas McVill
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 rounded-2xl hover:bg-white/5 text-slate-500 hover:text-white transition-all border border-transparent hover:border-white/5"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Periodo de Corte */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-5 space-y-4">
                  <h4 className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest border-b border-white/5 pb-2">Período Operativo</h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Inicio de Corte</label>
                    <select
                      value={overtimeCutoffStartDay}
                      onChange={(e) => setOvertimeCutoffStartDay(e.target.value)}
                      className={inputCls}
                    >
                      <option value="lunes" className="bg-slate-950 text-white">Lunes</option>
                      <option value="martes" className="bg-slate-950 text-white">Martes</option>
                      <option value="miercoles" className="bg-slate-950 text-white">Miércoles</option>
                      <option value="jueves" className="bg-slate-950 text-white">Jueves</option>
                      <option value="viernes" className="bg-slate-950 text-white">Viernes</option>
                      <option value="sabado" className="bg-slate-950 text-white">Sábado</option>
                      <option value="domingo" className="bg-slate-950 text-white">Domingo</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Fin de Corte</label>
                    <select
                      value={overtimeCutoffEndDay}
                      onChange={(e) => setOvertimeCutoffEndDay(e.target.value)}
                      className={inputCls}
                    >
                      <option value="lunes" className="bg-slate-950 text-white">Lunes</option>
                      <option value="martes" className="bg-slate-950 text-white">Martes</option>
                      <option value="miercoles" className="bg-slate-950 text-white">Miércoles</option>
                      <option value="jueves" className="bg-slate-950 text-white">Jueves</option>
                      <option value="viernes" className="bg-slate-950 text-white">Viernes</option>
                      <option value="sabado" className="bg-slate-950 text-white">Sábado</option>
                      <option value="domingo" className="bg-slate-950 text-white">Domingo</option>
                    </select>
                  </div>
                  
                  <p className="text-[8px] text-slate-600 font-medium ml-1">McVill Standard: Corte semanal de martes a lunes validado por RH.</p>
                </div>

                {/* Día de Pago y Servicios */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-5 space-y-4">
                  <h4 className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest border-b border-white/5 pb-2">Pago y Logística</h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Día de Dispersión</label>
                    <select
                      value={overtimePaymentDay}
                      onChange={(e) => setOvertimePaymentDay(e.target.value)}
                      className={inputCls}
                    >
                      <option value="lunes" className="bg-slate-950 text-white">Lunes</option>
                      <option value="martes" className="bg-slate-950 text-white">Martes</option>
                      <option value="miercoles" className="bg-slate-950 text-white">Miércoles</option>
                      <option value="jueves" className="bg-slate-950 text-white">Jueves</option>
                      <option value="viernes" className="bg-slate-950 text-white">Viernes</option>
                      <option value="sabado" className="bg-slate-950 text-white">Sábado</option>
                      <option value="domingo" className="bg-slate-950 text-white">Domingo</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Límite Comida/Transporte</label>
                    <input
                      type="text"
                      value={overtimeServicesLimitTime}
                      onChange={(e) => setOvertimeServicesLimitTime(e.target.value)}
                      placeholder="ej. 14:00"
                      className={inputCls}
                    />
                  </div>
                  
                  <p className="text-[8px] text-slate-600 font-medium ml-1">Pago semanal programado para el día viernes de la semana autorizada.</p>
                </div>

                {/* Control de Acceso Estricto */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest border-b border-white/5 pb-2">Control de Checadas</h4>
                    
                    <div className="space-y-1.5 mt-3">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Acceso sin Solicitud Previa</label>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-white/5 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setOvertimeStrictAccess(!overtimeStrictAccess)}
                          className={clsx(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-mcvill-accent",
                            overtimeStrictAccess ? "bg-mcvill-accent" : "bg-slate-800"
                          )}
                        >
                          <span
                            className={clsx(
                              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out",
                              overtimeStrictAccess ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                          {overtimeStrictAccess ? "Bloqueo Activo" : "Permisivo"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] text-amber-300">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>Si el bloqueo está activo, el sistema impedirá que el colaborador registre asistencia fuera del horario oficial si no existe un reporte de TE previamente cargado.</span>
                  </div>
                </div>

              </div>

              {/* Matriz de Firmas / Autorizaciones */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-[10px] font-black text-mcvill-accent uppercase tracking-widest">Matriz Jerárquica de Autorizaciones</h4>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                    Selecciona los departamentos autorizadores que deben firmar digitalmente la solicitud impresa para procesar y liberar el pago del tiempo extra:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                  {Object.entries(AUTHORIZERS_CONFIG).map(([key, item]) => {
                    const isSelected = overtimeRequiredAuthorizers.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setOvertimeRequiredAuthorizers(prev => prev.filter(r => r !== key));
                          } else {
                            setOvertimeRequiredAuthorizers(prev => [...prev, key]);
                          }
                        }}
                        className={clsx(
                          "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                          isSelected
                            ? "bg-mcvill-accent/10 border-mcvill-accent/40 text-white"
                            : "bg-slate-950/40 border-white/5 text-slate-500 hover:border-white/10"
                        )}
                      >
                        <div className={clsx(
                          "w-4 h-4 rounded flex items-center justify-center border text-[10px] font-black transition-colors shrink-0",
                          isSelected ? "border-mcvill-accent bg-mcvill-accent text-slate-950" : "border-slate-700 bg-transparent text-transparent"
                        )}>
                          ✓
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-tight truncate">{item.label}</p>
                          <p className="text-[7.5px] font-bold text-slate-600 uppercase tracking-widest truncate mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Regla de Penalización */}
              <div className="p-4 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-start gap-3">
                <ShieldCheck size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Condición de Penalización / Auditoría Interna:</h5>
                  <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed mt-1">
                    "Queda prohibida la autorización de tiempo extra posterior a su ejecución. En caso de detectarse horas no pre-aprobadas bajo el reporte oficial del ERP, el costo financiero correspondiente será cargado y absorbido directamente por el presupuesto del Supervisor Autorizante."
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-slate-900/40 shrink-0">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white font-black text-[9px] uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-2.5 rounded-xl bg-mcvill-accent text-slate-950 font-black text-[9px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-mcvill-accent/20"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
                {saved ? 'Guardado Exitosamente' : 'Aplicar Políticas'}
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
