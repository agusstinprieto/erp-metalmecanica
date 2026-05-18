import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, Briefcase, Mail, Phone, Calendar, ShieldCheck,
  DollarSign, Loader2, CreditCard, Scan, Camera, Upload,
  Trash2, CheckCircle2, FileText, Download, Plus, AlertCircle,
  FileBadge, Users, Factory, HardHat, ChevronDown
} from 'lucide-react';
import { employeeService } from '../services/employeeService';
import type { Employee } from '../services/employeeService';
import { shiftService, type WorkShift } from '../services/shiftService';
import { createOperador, updateOperador, CELULAS } from '../services/desempenoService';
import { toast } from '../lib/dialogs';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import Webcam from 'react-webcam';
import clsx from 'clsx';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee?: Employee | null;
}

type TabType = 'general' | 'expediente' | 'contratacion';

// ── Mexican ID validators ─────────────────────────────────────────────────────
const RFC_RE   = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const CURP_RE  = /^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/;
const NSS_RE   = /^\d{11}$/;

function validateRFC(v: string)  { return RFC_RE.test(v.trim().toUpperCase()); }
function validateCURP(v: string) { return CURP_RE.test(v.trim().toUpperCase()); }
function validateNSS(v: string)  { return NSS_RE.test(v.trim()); }

const DOCUMENT_TYPES = [
  { id: 'ine', label: 'INE / Identificación Oficial' },
  { id: 'curp', label: 'CURP' },
  { id: 'rfc', label: 'RFC (Constancia)' },
  { id: 'estudios', label: 'Comprobante de Estudios' },
  { id: 'domicilio', label: 'Comprobante de Domicilio' },
  { id: 'nss', label: 'Número de Seguridad Social' },
  { id: 'acta', label: 'Acta de Nacimiento' },
  { id: 'contrato', label: 'Contrato Firmado' }
];

const CATEGORIAS_EMPLEADO = [
  { value: '',              label: 'Seleccionar categoría…', dept: '' },
  { value: 'operador',      label: '🏭  Operador de Producción', dept: 'Producción' },
  { value: 'supervisor',    label: '👷  Supervisor / Jefe de Área', dept: 'Producción' },
  { value: 'almacenista',   label: '📦  Almacenista / Logística', dept: 'Logística' },
  { value: 'administrativo',label: '💼  Administrativo / Oficinas', dept: 'Administración' },
  { value: 'ingeniero',     label: '⚙️  Ingeniero / Técnico', dept: 'Ingeniería' },
  { value: 'mantenimiento', label: '🔧  Mantenimiento', dept: 'Producción' },
  { value: 'vigilancia',    label: '🛡️  Vigilancia / Seguridad', dept: 'Administración' },
  { value: 'rh',            label: '👥  Recursos Humanos', dept: 'RH' },
  { value: 'ventas',        label: '📊  Ventas / Comercial', dept: 'Ventas' },
];

const PUESTOS_POR_CELULA: Record<string, string[]> = {
  SOLDADURA:  ['Soldador Senior', 'Soldador Semi Senior', 'Soldador Junior', 'Soldador MIG/TIG'],
  MAQUINADO:  ['Operador Torno CNC', 'Operador Fresadora CNC', 'Operador Centro de Mecanizado', 'Rectificador', 'Operador Torno Convencional'],
  CORTE:      ['Operador Corte Láser', 'Operador Corte Plasma', 'Operador Cizalla', 'Operador Punzonado'],
  ENSAMBLE:   ['Ensamblador Senior', 'Ensamblador Junior', 'Operador de Ensamble'],
  PINTURA:    ['Aplicador de Pintura', 'Operador Cabina Pintura', 'Preparador de Superficies'],
};
const PUESTOS_GENERALES = ['Operador General', 'Otro (especificar)'];

const TURNOS_OP = [
  { value: 'matutino',   label: 'Matutino  (06:00 – 14:00)' },
  { value: 'vespertino', label: 'Vespertino (14:00 – 22:00)' },
  { value: 'nocturno',   label: 'Nocturno  (22:00 – 06:00)' },
];

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSuccess, employee }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(false);
  const [scanningBadge, setScanningBadge] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ rfc?: string; curp?: string; nss?: string }>({});
  const [showCamera, setShowCamera] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    shiftService.listShifts()
      .then(setShifts)
      .catch(err => {
        console.error('Error cargando turnos:', err);
        // Fallback local para que el dropdown siempre muestre opciones
        setShifts([
          { id: 'mat', name: 'Matutino',   start_time: '06:00:00', end_time: '14:00:00', grace_period_minutes: 10, is_active: true, tenant_id: '' },
          { id: 'ves', name: 'Vespertino', start_time: '14:00:00', end_time: '22:00:00', grace_period_minutes: 10, is_active: true, tenant_id: '' },
          { id: 'noc', name: 'Nocturno',   start_time: '22:00:00', end_time: '06:00:00', grace_period_minutes: 10, is_active: true, tenant_id: '' },
        ]);
      });
  }, []);
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    department: 'Producción',
    employee_number: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'active',
    daily_salary: 0,
    monthly_salary: 0,
    contract_type: 'Indefinido',
    benefits: ['IMSS', 'Infonavit', 'Aguinaldo (15 días)', 'Prima Vacacional'],
    hire_date: new Date().toISOString().split('T')[0],
    rfc: '',
    curp: '',
    nss: '',
    photo_url: '',
    documents: {},
    tipo_empleado: '',
    celula_operador: CELULAS[0],
    turno_operador: 'matutino',
    puesto_operador: '',
    notes: '',
  });
  const [puestoOtro, setPuestoOtro] = useState('');

  useBarcodeScanner((code) => {
    if (scanningBadge) {
      setFormData(prev => ({ ...prev, employee_number: code.toUpperCase() }));
      setScanningBadge(false);
      toast(`Gafete capturado: ${code}`, 'success');
    }
  }, scanningBadge);

  useEffect(() => {
    if (employee) {
      setFormData({
        ...employee,
        hire_date: employee.hire_date ? new Date(employee.hire_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        documents: employee.documents || {},
        benefits: employee.benefits || ['IMSS', 'Infonavit', 'Aguinaldo (15 días)', 'Prima Vacacional'],
        monthly_salary: employee.monthly_salary || (employee.daily_salary * 30)
      });
    } else {
      resetForm();
    }
    setShowCamera(false);
    setActiveTab('general');
  }, [employee, isOpen]);

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      job_title: '',
      department: 'Producción',
      employee_number: `EMP-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      status: 'active',
      daily_salary: 0,
      monthly_salary: 0,
      contract_type: 'Indefinido',
      benefits: ['IMSS', 'Infonavit', 'Aguinaldo (15 días)', 'Prima Vacacional'],
      hire_date: new Date().toISOString().split('T')[0],
      rfc: '',
      curp: '',
      nss: '',
      photo_url: '',
      documents: {},
      tipo_empleado: '',
      celula_operador: CELULAS[0],
      turno_operador: 'matutino',
      puesto_operador: '',
      notes: '',
    });
    setPuestoOtro('');
  };

  const capturePhoto = React.useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      handleImageUpload(imageSrc);
      setShowCamera(false);
    }
  }, [webcamRef, formData.employee_number]);

  const handleImageUpload = async (imageSrc: string) => {
    try {
      setUploadingPhoto(true);
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      
      const url = await employeeService.uploadPhoto(formData.employee_number || 'temp', file);
      setFormData(prev => ({ ...prev, photo_url: url }));
      toast('Fotografía capturada y sincronizada', 'success');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast('Error al procesar la fotografía', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUploadingPhoto(true);
        const url = await employeeService.uploadPhoto(formData.employee_number || 'temp', file);
        setFormData(prev => ({ ...prev, photo_url: url }));
        toast('Imagen subida correctamente', 'success');
      } catch (err) {
        toast('Error al subir imagen', 'error');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleDocUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUploadingDoc(docType);
        const url = await employeeService.uploadDocument(formData.employee_number || 'temp', docType, file);
        setFormData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [docType]: url
          }
        }));
        toast(`Documento ${docType.toUpperCase()} subido`, 'success');
      } catch (err) {
        toast('Error al subir documento', 'error');
      } finally {
        setUploadingDoc(null);
      }
    }
  };

  const removeDoc = (docType: string) => {
    const newDocs = { ...formData.documents };
    delete newDocs[docType];
    setFormData({ ...formData, documents: newDocs });
    toast('Documento removido del expediente', 'info');
  };

  const handleDailySalaryChange = (val: number) => {
    setFormData({
      ...formData,
      daily_salary: val,
      monthly_salary: val * 30
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side format validation for Mexican IDs
    const errors: typeof fieldErrors = {};
    if (formData.rfc && !validateRFC(formData.rfc))
      errors.rfc = 'Formato inválido — debe ser 12-13 caracteres (ej. XAXX010101000)';
    if (formData.curp && !validateCURP(formData.curp))
      errors.curp = 'Formato inválido — debe ser 18 caracteres (ej. XEXX010101HNEXXN00)';
    if (formData.nss && !validateNSS(formData.nss))
      errors.nss = 'El NSS debe ser exactamente 11 dígitos';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setActiveTab('general');
      toast('Corrige los campos marcados en rojo antes de guardar', 'error');
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);
      if (employee?.id) {
        await employeeService.updateEmployee(employee.id, formData);
        toast('Colaborador actualizado correctamente', 'success');
      } else {
        await employeeService.createEmployee(formData);
        toast('Colaborador registrado correctamente', 'success');
      }

      // ── Vínculo automático con módulo de Desempeño ──────────────────────────
      if (formData.tipo_empleado === 'operador') {
        const fullName = `${formData.first_name ?? ''} ${formData.last_name ?? ''}`.trim();
        const puestoFinal = formData.puesto_operador === 'Otro (especificar)'
          ? (puestoOtro || 'Operador General')
          : (formData.puesto_operador || 'Operador General');
        try {
          if (employee?.id && employee.tipo_empleado === 'operador') {
            // Si ya era operador, actualizamos via número de empleado
            // (no tenemos el operador_id directamente, así que upsert por número)
          }
          await createOperador({
            nombre:          fullName,
            numero_empleado: formData.employee_number ?? '',
            celula:          formData.celula_operador ?? CELULAS[0],
            turno:           formData.turno_operador as any ?? 'matutino',
            puesto:          puestoFinal,
          });
          toast('Operador vinculado al módulo de Desempeño automáticamente.', 'success');
        } catch (opErr: any) {
          // Si ya existe (duplicate), no es error crítico
          if (!opErr?.message?.includes('duplicate') && !opErr?.message?.includes('unique')) {
            console.warn('[EmployeeForm] No se pudo vincular con Desempeño:', opErr?.message);
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast('Ya existe un colaborador con ese RFC, CURP o número de empleado', 'error');
      } else {
        toast('Error al guardar el colaborador — intenta nuevamente', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 lg:left-64 top-14 z-[999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Users className="text-blue-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                {employee ? 'EXPEDIENTE DE' : 'NUEVO'} <span className="text-blue-500">COLABORADOR</span>
              </h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">RH & CAPITAL HUMANO MCVILL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all border border-transparent hover:border-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 border-b border-white/5 bg-slate-900/50 shrink-0">
          <button 
            onClick={() => setActiveTab('general')}
            className={clsx(
              "px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative",
              activeTab === 'general' ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Datos Generales
            {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
          </button>
          <button 
            onClick={() => setActiveTab('expediente')}
            className={clsx(
              "px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative",
              activeTab === 'expediente' ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Expediente Digital
            {activeTab === 'expediente' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
          </button>
          <button 
            onClick={() => setActiveTab('contratacion')}
            className={clsx(
              "px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative",
              activeTab === 'contratacion' ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Contratación & Prestaciones
            {activeTab === 'contratacion' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form id="employee-form" onSubmit={handleSubmit} className="p-5">

            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-in slide-in-from-left-4 duration-300">
                {/* Photo Section */}
                <div className="md:col-span-3 flex flex-col items-center space-y-3">
                  <div className="relative group w-full aspect-square max-w-[160px]">
                    <div className="w-full h-full rounded-[2.5rem] bg-slate-950 border-2 border-dashed border-slate-800 overflow-hidden flex items-center justify-center relative shadow-inner">
                      {uploadingPhoto ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="animate-spin text-blue-500" size={40} />
                          <span className="text-[10px] font-black text-slate-500 tracking-widest">PROCESANDO...</span>
                        </div>
                      ) : showCamera ? (
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="w-full h-full object-cover scale-110"
                        />
                      ) : formData.photo_url ? (
                        <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-700">
                          <User size={80} strokeWidth={1} />
                          <p className="text-[11px] font-black uppercase mt-4 tracking-[0.2em]">Capture Foto</p>
                        </div>
                      )}

                      {showCamera && (
                        <div className="absolute bottom-6 left-0 w-full flex justify-center px-4">
                          <button 
                            type="button"
                            onClick={capturePhoto}
                            className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:scale-110 transition-transform active:scale-95"
                          >
                            <Camera size={28} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full max-w-[280px] grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowCamera(!showCamera)}
                      className={clsx(
                        "flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all",
                        showCamera ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                      )}
                    >
                      {showCamera ? <X size={14} /> : <Camera size={14} />}
                      {showCamera ? 'CANCELAR' : 'CÁMARA'}
                    </button>
                    <label className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 cursor-pointer transition-all text-[10px] font-black uppercase">
                      <Upload size={14} /> ARCHIVO
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>

                {/* Fields Section */}
                <div className="md:col-span-8 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre(s)</label>
                      <input 
                        type="text" required
                        className="cyber-input w-full h-14 text-sm bg-black/40"
                        placeholder="Ej. Juan Carlos"
                        value={formData.first_name}
                        onChange={e => setFormData({...formData, first_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Apellidos</label>
                      <input 
                        type="text" required
                        className="cyber-input w-full h-14 text-sm bg-black/40"
                        placeholder="Ej. Pérez García"
                        value={formData.last_name}
                        onChange={e => setFormData({...formData, last_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Personal</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="email" required
                          className="cyber-input w-full pl-12 h-14 text-sm bg-black/40"
                          placeholder="juan@email.com"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Teléfono</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="text" required
                          className="cyber-input w-full pl-12 h-14 text-sm bg-black/40"
                          placeholder="871 000 0000"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className={clsx("text-[10px] font-black uppercase tracking-widest ml-1", fieldErrors.rfc ? 'text-rose-400' : 'text-slate-500')}>RFC</label>
                      <input
                        type="text" required
                        className={clsx("cyber-input w-full h-14 text-sm bg-black/40 font-mono uppercase", fieldErrors.rfc && 'border-rose-500/60 ring-1 ring-rose-500/30')}
                        placeholder="XAXX010101000"
                        maxLength={13}
                        value={formData.rfc}
                        onChange={e => {
                          const v = e.target.value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '');
                          setFormData({...formData, rfc: v});
                          if (fieldErrors.rfc && validateRFC(v)) setFieldErrors(p => ({ ...p, rfc: undefined }));
                        }}
                      />
                      {fieldErrors.rfc && <p className="text-[9px] text-rose-400 font-black ml-1 flex items-center gap-1"><AlertCircle size={10}/>{fieldErrors.rfc}</p>}
                    </div>
                    <div className="space-y-2.5">
                      <label className={clsx("text-[10px] font-black uppercase tracking-widest ml-1", fieldErrors.curp ? 'text-rose-400' : 'text-slate-500')}>CURP</label>
                      <input
                        type="text" required
                        className={clsx("cyber-input w-full h-14 text-sm bg-black/40 font-mono uppercase", fieldErrors.curp && 'border-rose-500/60 ring-1 ring-rose-500/30')}
                        placeholder="XEXX010101HNEXXN00"
                        maxLength={18}
                        value={formData.curp}
                        onChange={e => {
                          const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                          setFormData({...formData, curp: v});
                          if (fieldErrors.curp && validateCURP(v)) setFieldErrors(p => ({ ...p, curp: undefined }));
                        }}
                      />
                      {fieldErrors.curp && <p className="text-[9px] text-rose-400 font-black ml-1 flex items-center gap-1"><AlertCircle size={10}/>{fieldErrors.curp}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <label className={clsx("text-[10px] font-black uppercase tracking-widest ml-1", fieldErrors.nss ? 'text-rose-400' : 'text-slate-500')}>IMSS (NSS)</label>
                      <input
                        type="text" required
                        className={clsx("cyber-input w-full h-14 text-sm bg-black/40 font-mono", fieldErrors.nss && 'border-rose-500/60 ring-1 ring-rose-500/30')}
                        placeholder="00000000000"
                        maxLength={11}
                        value={formData.nss}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '');
                          setFormData({...formData, nss: v});
                          if (fieldErrors.nss && validateNSS(v)) setFieldErrors(p => ({ ...p, nss: undefined }));
                        }}
                      />
                      {fieldErrors.nss && <p className="text-[9px] text-rose-400 font-black ml-1 flex items-center gap-1"><AlertCircle size={10}/>{fieldErrors.nss}</p>}
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Ingreso</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="date" required
                          className="cyber-input w-full pl-12 h-14 text-sm bg-black/40"
                          value={formData.hire_date}
                          onChange={e => setFormData({...formData, hire_date: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'expediente' && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl mb-8 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <FileBadge className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Repositorio de Documentos</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Sube los documentos originales escaneados en formato PDF o Imagen. El sistema mantendrá el expediente digital vinculado al perfil del colaborador.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOCUMENT_TYPES.map(doc => {
                    const isUploaded = !!formData.documents?.[doc.id];
                    const isUploading = uploadingDoc === doc.id;

                    return (
                      <div 
                        key={doc.id}
                        className={clsx(
                          "p-5 rounded-2xl border transition-all group",
                          isUploaded 
                            ? "bg-emerald-500/5 border-emerald-500/20" 
                            : "bg-slate-950/40 border-white/5 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={clsx(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                              isUploaded ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500"
                            )}>
                              {isUploaded ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                            </div>
                            <div>
                              <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{doc.label}</h4>
                              <p className={clsx(
                                "text-[9px] font-black uppercase tracking-widest mt-1",
                                isUploaded ? "text-emerald-500/60" : "text-slate-600"
                              )}>
                                {isUploaded ? 'Documento Cargado' : 'Pendiente de Carga'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isUploaded ? (
                              <>
                                <a 
                                  href={formData.documents?.[doc.id]} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all"
                                  title="Ver Documento"
                                >
                                  <Download size={16} />
                                </a>
                                <button 
                                  type="button"
                                  onClick={() => removeDoc(doc.id)}
                                  className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all"
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            ) : (
                              <label className={clsx(
                                "p-2 rounded-xl transition-all cursor-pointer",
                                isUploading ? "animate-pulse bg-blue-500/20 text-blue-400" : "hover:bg-white/10 text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10"
                              )}>
                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="application/pdf,image/*" 
                                  onChange={(e) => handleDocUpload(doc.id, e)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'contratacion' && (
              <div className="space-y-10 animate-in fade-in duration-500">

                {/* ── Categoría de empleado ─────────────────────────────────── */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-mcvill-accent uppercase tracking-[0.2em] flex items-center gap-2">
                    <HardHat size={14} /> Categoría de Empleado
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {CATEGORIAS_EMPLEADO.filter(c => c.value).map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          const dept = cat.dept || formData.department || 'Producción';
                          setFormData(prev => ({
                            ...prev,
                            tipo_empleado: cat.value,
                            department: dept,
                            celula_operador: prev.celula_operador ?? CELULAS[0],
                            turno_operador:  prev.turno_operador  ?? 'matutino',
                            puesto_operador: cat.value === 'operador' ? '' : prev.puesto_operador,
                          }));
                        }}
                        className={clsx(
                          'relative px-3 py-3 rounded-2xl border text-left transition-all group',
                          formData.tipo_empleado === cat.value
                            ? 'bg-blue-500/15 border-blue-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                        )}
                      >
                        <span className="text-base">{cat.label.split('  ')[0]}</span>
                        <span className={clsx(
                          'block text-[10px] font-black uppercase tracking-wider mt-1 truncate',
                          formData.tipo_empleado === cat.value ? 'text-blue-300' : 'text-slate-500'
                        )}>
                          {cat.label.split('  ')[1]}
                        </span>
                        {formData.tipo_empleado === cat.value && (
                          <span className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={10} className="text-white" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Sección Piso de Producción (solo si es Operador) ──────── */}
                {formData.tipo_empleado === 'operador' && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-blue-500/20" />
                      <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
                        <Factory size={14} /> Datos de Piso de Producción
                      </h3>
                      <div className="flex-1 h-px bg-blue-500/20" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Célula */}
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Célula</label>
                        <select
                          className="cyber-select w-full h-14 text-sm bg-black/40 px-6"
                          value={formData.celula_operador}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            celula_operador: e.target.value,
                            puesto_operador: '',
                          }))}
                        >
                          {CELULAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {/* Turno */}
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Turno de Piso</label>
                        <select
                          className="cyber-select w-full h-14 text-sm bg-black/40 px-6"
                          value={formData.turno_operador}
                          onChange={e => setFormData(prev => ({ ...prev, turno_operador: e.target.value }))}
                        >
                          {TURNOS_OP.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      {/* Puesto específico */}
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Puesto en Célula</label>
                        <select
                          className="cyber-select w-full h-14 text-sm bg-black/40 px-6"
                          value={formData.puesto_operador}
                          onChange={e => {
                            setFormData(prev => ({ ...prev, puesto_operador: e.target.value, job_title: e.target.value !== 'Otro (especificar)' ? e.target.value : prev.job_title }));
                            if (e.target.value !== 'Otro (especificar)') setPuestoOtro('');
                          }}
                        >
                          <option value="">Seleccionar puesto…</option>
                          {[...(PUESTOS_POR_CELULA[formData.celula_operador ?? ''] ?? []), ...PUESTOS_GENERALES].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {/* Campo libre si elige "Otro" */}
                    {formData.puesto_operador === 'Otro (especificar)' && (
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Especificar puesto</label>
                        <input
                          type="text"
                          className="cyber-input w-full h-14 text-sm bg-black/40"
                          placeholder="Describe el puesto exacto…"
                          value={puestoOtro}
                          onChange={e => {
                            setPuestoOtro(e.target.value);
                            setFormData(prev => ({ ...prev, job_title: e.target.value }));
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <CheckCircle2 size={14} className="text-blue-400 shrink-0" />
                      <p className="text-[10px] text-blue-300/80 leading-relaxed">
                        Al guardar, este colaborador se registrará automáticamente en el módulo de <strong>Desempeño + Incentivos</strong> para seguimiento de KPIs semanales.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Briefcase size={14} /> Puesto & Jerarquía
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Departamento</label>
                        <select
                          className="cyber-select w-full h-14 text-sm bg-black/40 px-6"
                          value={formData.department}
                          onChange={e => setFormData({...formData, department: e.target.value})}
                        >
                          <option value="Producción">Producción</option>
                          <option value="Ingeniería">Ingeniería</option>
                          <option value="Administración">Administración</option>
                          <option value="Logística">Logística</option>
                          <option value="RH">Recursos Humanos</option>
                          <option value="Ventas">Ventas / Comercial</option>
                        </select>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Puesto Nominal</label>
                        <input
                          type="text" required
                          className="cyber-input w-full h-14 text-sm bg-black/40"
                          placeholder="Ej. Operador CNC Senior"
                          value={formData.job_title}
                          onChange={e => setFormData({...formData, job_title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <CreditCard size={12} /> No. Empleado / Gafete
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text" required
                            className={`cyber-input flex-1 h-14 text-sm font-mono bg-black/40 ${scanningBadge ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}
                            value={formData.employee_number}
                            onChange={e => setFormData({...formData, employee_number: e.target.value.toUpperCase()})}
                          />
                          <button
                            type="button"
                            onClick={() => setScanningBadge(!scanningBadge)}
                            className={clsx(
                              "px-4 h-14 rounded-xl border text-[9px] font-black uppercase transition-all flex items-center gap-2",
                              scanningBadge ? "bg-blue-600 border-blue-500 text-white animate-pulse" : "bg-white/5 border-white/10 text-slate-500 hover:text-white"
                            )}
                          >
                            <Scan size={14} /> SCAN
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Turno Asignado</label>
                        <select 
                          className="cyber-select w-full h-14 text-sm bg-black/40 px-6"
                          value={formData.shift_id || ''}
                          onChange={e => setFormData({...formData, shift_id: e.target.value})}
                          required
                        >
                          <option value="">Seleccionar Turno...</option>
                          {shifts.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <DollarSign size={14} /> Esquema de Compensación
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Contrato</label>
                        <select 
                          className="cyber-select w-full h-14 text-sm bg-black/40 px-6"
                          value={formData.contract_type}
                          onChange={e => setFormData({...formData, contract_type: e.target.value})}
                        >
                          <option value="Indefinido">Indefinido (Planta)</option>
                          <option value="Temporal">Temporal (Determinado)</option>
                          <option value="Prueba">Periodo de Prueba (3 meses)</option>
                          <option value="Honorarios">Honorarios (Asimilados)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Salario Diario (SBC)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input 
                              type="number" required
                              className="cyber-input w-full pl-10 h-14 text-sm font-mono bg-black/40"
                              value={formData.daily_salary || ''}
                              onChange={e => handleDailySalaryChange(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Salario Mensual Bruto</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50" size={14} />
                            <input 
                              type="number" readOnly
                              className="cyber-input w-full pl-10 h-14 text-sm font-mono bg-emerald-500/5 text-emerald-400 border-emerald-500/20"
                              value={formData.monthly_salary || ''}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prestaciones & Beneficios</label>
                        <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
                          {formData.benefits?.map((benefit, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="text-emerald-500" size={12} />
                              </div>
                              <span className="text-[11px] font-bold text-slate-300">{benefit}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                              <AlertCircle size={10} /> Prestaciones de Ley Incluidas por Default
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notas Especiales */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText size={14} /> Notas Especiales
                  </h3>
                  <textarea
                    rows={4}
                    className="cyber-input w-full text-sm bg-black/40 resize-none py-4 px-5 leading-relaxed"
                    placeholder="Condiciones especiales del contrato, restricciones médicas, acuerdos particulares, observaciones de RH…"
                    value={formData.notes ?? ''}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-slate-950/40 shrink-0 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
          >
            CANCELAR
          </button>
          <button
            type="submit"
            form="employee-form"
            disabled={loading || uploadingPhoto}
            className="flex-[2] h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />}
            {employee ? 'ACTUALIZAR EXPEDIENTE' : 'CREAR COLABORADOR & EXPEDIENTE'}
          </button>
        </div>
      </div>
    </div>
  );
};
