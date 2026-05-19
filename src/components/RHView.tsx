import React, { useState, useEffect } from 'react';
import { 
  Users as MembersIcon, 
  UserPlus, 
  Search, 
  Filter, 
  Briefcase, 
  TrendingUp, 
  Calendar,
  MoreVertical,
  Mail,
  Phone,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  Trash2,
  Edit3,
  Upload,
  FileSpreadsheet,
  Download,
  Zap,
  X,
  Award, 
  Shield, 
  HardHat,
  ClipboardList,
  AlertCircle,
  BadgeCheck,
  Package,
  RefreshCw,
  LayoutGrid,
  List,
  Check
} from 'lucide-react';
import { RecruitmentView } from './RecruitmentView';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearch } from '../contexts/SearchContext';
import { toast } from '../lib/dialogs';
import { employeeService } from '../services/employeeService';
import { rhService } from '../services/rhService';
import { reportUtils } from '../utils/reportUtils';
import { EmployeeFormModal } from './EmployeeFormModal';
import { ImportEmployeesModal } from './ImportEmployeesModal';
import { EmployeeBadgeModal } from './EmployeeBadgeModal';
import { eventBus } from '../utils/eventBus';
import { User } from 'lucide-react';
import clsx from 'clsx';

interface Employee {
  id: string;
  tenant_id: string;
  employee_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  rfc?: string;
  nss?: string;
  curp?: string;
  job_title: string;
  department: string;
  daily_salary: number;
  hire_date: string;
  photo_url?: string;
  status: 'active' | 'inactive' | 'on_leave' | 'vacation' | 'medical_leave';
}

const StatusBadge: React.FC<{ status: Employee['status'] }> = ({ status }) => {
  const { language } = useLanguage();
  const configs: Record<Employee['status'], { label: string; color: string; icon: any }> = {
    active: { label: language === 'en' ? 'ACTIVE' : 'ACTIVO', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    inactive: { label: language === 'en' ? 'INACTIVE' : 'INACTIVO', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: ShieldAlert },
    vacation: { label: language === 'en' ? 'VACATION' : 'VACACIONES', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Calendar },
    medical_leave: { label: language === 'en' ? 'MEDICAL LEAVE' : 'INCAPACIDAD', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
    on_leave: { label: language === 'en' ? 'ON LEAVE' : 'LICENCIA', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: UserCheck }
  };

  const config = configs[status] || configs.active;
  const Icon = config.icon;

  return (
    <div className={clsx("flex items-center gap-1.5 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest", config.color)}>
      <Icon size={10} />
      {config.label}
    </div>
  );
};

// ── MODAL CHECKLIST DE BAJA DE EMPLEADO ─────────────────────────────────────
const CHECKLIST_ITEMS = [
  { id: 'herramientas', icon: '🔧', label: 'Herramientas de trabajo',      desc: 'Llaves, calibradores, machuelos, brocas, manómetros, etc.' },
  { id: 'epp',          icon: '⛑️',  label: 'Equipo de protección personal', desc: 'Casco, guantes, lentes, botas, chaleco, careta, arnés.' },
  { id: 'uniforme',     icon: '👕',  label: 'Uniforme / Ropa de trabajo',   desc: 'Camisas, pantalones, overol con logotipo de la empresa.' },
  { id: 'equipo',       icon: '💻',  label: 'Equipo electrónico',           desc: 'Tablet, radio, escáner, lector de código, celular corporativo.' },
  { id: 'accesos',      icon: '🪪',  label: 'Credencial y accesos',         desc: 'Gafete, tarjeta de proximidad, llaves, candados asignados.' },
  { id: 'imss',         icon: '🏥',  label: 'Baja en el IMSS',             desc: 'Aviso de baja patronal dentro de los 5 días hábiles siguientes (Art. 15 LSS).' },
  { id: 'finiquito',    icon: '📄',  label: 'Finiquito / Liquidación',      desc: 'Cálculo de días proporcionales, vacaciones, aguinaldo y prima de antigüedad.' },
  { id: 'no_adeudo',    icon: '✅',  label: 'Carta de no adeudo',           desc: 'Firmada por el empleado confirmando entrega de todo el material.' },
];

interface BajaEmpleadoModalProps {
  employee: { first_name: string; last_name: string; job_title?: string };
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const BajaEmpleadoModal: React.FC<BajaEmpleadoModalProps> = ({ employee, onConfirm, onCancel }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  const allChecked = CHECKLIST_ITEMS.every(item => checked[item.id]);

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-5 py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Baja de Empleado</h2>
            <p className="text-[10px] text-rose-400 font-semibold truncate">
              {employee.first_name} {employee.last_name}
              {employee.job_title ? ` · ${employee.job_title}` : ''}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Checklist */}
        <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <p className="text-[10px] text-slate-400 mb-3">
            Confirma que se completaron todos los pasos antes de proceder con la baja:
          </p>
          {CHECKLIST_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                checked[item.id]
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-all ${
                checked[item.id] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
              }`}>
                {checked[item.id] && <CheckCircle2 size={10} className="text-white" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">{item.icon}</span>
                  <span className={`text-[11px] font-black uppercase tracking-wide ${
                    checked[item.id] ? 'text-emerald-400' : 'text-slate-200'
                  }`}>{item.label}</span>
                </div>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[9px] text-slate-600">
            {CHECKLIST_ITEMS.filter(i => checked[i.id]).length} / {CHECKLIST_ITEMS.length} completados
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!allChecked || confirming}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                allChecked && !confirming
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              {confirming ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Confirmar baja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RHView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useConfig();
  const { language } = useLanguage();
  const { searchTerm, setSearchTerm } = useSearch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'skills' | 'certs' | 'epp'>('info');
  const [employeeSkills, setEmployeeSkills] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [eppDeliveries, setEppDeliveries] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'census' | 'recruitment'>('census');
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgeEmployee, setBadgeEmployee] = useState<Employee | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bajaModal, setBajaModal] = useState<{ employee: Employee; onConfirm: () => Promise<void> } | null>(null);
  const [employeeLayout, setEmployeeLayout] = useState<'list' | 'card'>('list');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.listEmployees();
      setEmployees(data);
      setSelectedIds([]);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const loadEmployeeDetails = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setLoadingDetails(true);
    try {
      const [skills, certs, epp] = await Promise.all([
        rhService.getEmployeeSkills(employee.id),
        rhService.getCertifications(employee.id),
        rhService.getEPPDeliveries(employee.id)
      ]);
      setEmployeeSkills(skills);
      setCertifications(certs);
      setEppDeliveries(epp);
    } catch (err) {
      console.error('Error loading employee details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadReport = () => {
    reportUtils.exportToPDF(
      "Censo de Capital Humano",
      employees.map(e => ({
        ID: e.employee_number,
        NOMBRE: `${e.first_name} ${e.last_name}`,
        CARGO: e.job_title,
        DEPTO: e.department,
        INGRESO: e.hire_date,
      })),
      "censo_rh",
      "RECURSOS HUMANOS"
    );
  };

  const handleDelete = (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    setBajaModal({
      employee: emp,
      onConfirm: async () => {
        await employeeService.deleteEmployee(id);
        setEmployees(prev => prev.filter(e => e.id !== id));
        if (selectedEmployee?.id === id) setSelectedEmployee(null);
        setSelectedIds(prev => prev.filter(x => x !== id));
        toast('Empleado dado de baja correctamente', 'success');
      },
    });
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmployees.map(e => e.id));
    }
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.length;
    if (count === 0) return;
    // Usa el primer empleado seleccionado como representante del modal de baja
    const first = employees.find(e => e.id === selectedIds[0]);
    if (!first) return;
    const representative: Employee = {
      ...first,
      first_name: `${count} colaboradores`,
      last_name: 'seleccionados',
    };
    setBajaModal({
      employee: representative,
      onConfirm: async () => {
        setLoading(true);
        try {
          await Promise.all(selectedIds.map(id => employeeService.deleteEmployee(id)));
          setEmployees(prev => prev.filter(e => !selectedIds.includes(e.id)));
          if (selectedEmployee && selectedIds.includes(selectedEmployee.id)) setSelectedEmployee(null);
          setSelectedIds([]);
          toast(`${count} colaboradores dados de baja correctamente`, 'success');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header Panel — Compact Industrial */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MembersIcon size={16} className="text-blue-500" />
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              {language === 'en' ? 'HUMAN' : 'CAPITAL'} <span className="text-blue-500">{language === 'en' ? 'CAPITAL' : 'HUMANO'}</span>
            </h2>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest hidden md:block">
            {language === 'en' ? 'Personnel Census · Recruitment · Talent Development' : 'Censo de Personal · Reclutamiento · Desarrollo de Talento'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('census')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
              viewMode === 'census' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-white"
            )}
          >
            {language === 'en' ? 'Census' : 'Censo'}
          </button>
          <button 
            onClick={() => setViewMode('recruitment')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
              viewMode === 'recruitment' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-white"
            )}
          >
            {language === 'en' ? 'Recruitment' : 'Reclutamiento'}
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={() => setIsModalOpen(true)} className="mcvill-btn-create flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20">
            <UserPlus size={12} /> {language === 'en' ? 'HIRE' : 'CONTRATAR'}
          </button>
        </div>
      </div>

        {viewMode === 'census' ? (
          <div className="space-y-4">
            {/* KPI Matrix — Compact */}
            <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/20">
              {[
                { label: language === 'en' ? 'TOTAL STAFF' : 'PLANTILLA TOTAL', value: employees.length, icon: MembersIcon, color: 'text-blue-500' },
                { label: language === 'en' ? 'DEPARTMENTS' : 'DEPARTAMENTOS', value: new Set(employees.map(e => e.department)).size, icon: Briefcase, color: 'text-indigo-500' },
                { label: language === 'en' ? 'ON VACATION' : 'EN VACACIONES', value: employees.filter(e => e.status === 'vacation').length, icon: Calendar, color: 'text-amber-500' },
                { label: language === 'en' ? 'MEDICAL LEAVE' : 'INCAPACIDADES', value: employees.filter(e => e.status === 'medical_leave').length, icon: ShieldAlert, color: 'text-rose-500' }
              ].map((k, i) => (
                <div key={i} className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 group hover:bg-white/[0.04] transition-all">
                  <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shrink-0 bg-slate-900", k.color)}>
                    <k.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">{k.label}</p>
                    <p className={clsx("text-xl font-black tracking-tighter leading-none", k.color)}>{k.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Employee Ledger */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md">
            {/* Control Bar — Compact */}
            <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-4 shrink-0">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={12} />
                <input 
                  type="text" placeholder={language === 'en' ? 'TRACK EMPLOYEES...' : 'RASTREAR COLABORADORES...'} 
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-[10px] font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700" 
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {selectedIds.length > 0 && (
                  <button 
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-600/20"
                  >
                    <Trash2 size={12} /> {language === 'en' ? 'DELETE SELECTED' : 'ELIMINAR SELECCIONADOS'} ({selectedIds.length})
                  </button>
                )}
                <button onClick={handleDownloadReport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                  <Download size={12} /> {language === 'en' ? 'REPORT' : 'REPORTE'}
                </button>
                <button onClick={fetchEmployees} className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all mr-1">
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setEmployeeLayout('card')}
                    className={clsx(
                      "p-1.5 rounded-lg transition-all",
                      employeeLayout === 'card' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-white"
                    )}
                    title={language === 'en' ? 'Card View' : 'Vista Tarjetas'}
                  >
                    <LayoutGrid size={12} />
                  </button>
                  <button
                    onClick={() => setEmployeeLayout('list')}
                    className={clsx(
                      "p-1.5 rounded-lg transition-all",
                      employeeLayout === 'list' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-white"
                    )}
                    title={language === 'en' ? 'List View' : 'Vista Lista'}
                  >
                    <List size={12} />
                  </button>
                </div>
              </div>
            </div>
              {loading ? (
                <div className="py-20 text-center">
                  <Loader2 className="animate-spin text-blue-500 mx-auto" size={24} />
                </div>
              ) : employeeLayout === 'list' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/30 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                        <th className="px-4 py-3 w-10 text-center">
                          <input 
                            type="checkbox" 
                            checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length}
                            onChange={handleSelectAll}
                            className="rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3">{language === 'en' ? 'Employee / ID' : 'Colaborador / ID'}</th>
                        <th className="px-4 py-3">{language === 'en' ? 'Job Title' : 'Cargo'}</th>
                        <th className="px-4 py-3 text-center">{language === 'en' ? 'Status' : 'Estado'}</th>
                        <th className="px-4 py-3 text-right">{language === 'en' ? 'Actions' : 'Acciones'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredEmployees.map(e => (
                        <tr key={e.id} onClick={() => loadEmployeeDetails(e)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                          <td className="px-4 py-2 w-10 text-center" onClick={ev => ev.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(e.id)}
                              onChange={() => handleSelectRow(e.id)}
                              className="rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                {e.photo_url ? (
                                  <img src={e.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User size={14} className="text-slate-700" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white uppercase group-hover:text-blue-400 transition-colors">{e.first_name} {e.last_name}</span>
                                <span className="text-[8px] text-slate-500 font-mono">{e.employee_number}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">{e.job_title}</span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <StatusBadge status={e.status} />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={ev => { 
                                  ev.stopPropagation(); 
                                  setBadgeEmployee(e); 
                                  setIsBadgeModalOpen(true); 
                                }} 
                                className="p-1.5 hover:text-indigo-400"
                                title="Generar Gafete"
                              >
                                <Award size={11} />
                              </button>
                              <button onClick={ev => { ev.stopPropagation(); setEditingEmployee(e); setIsModalOpen(true); }} className="p-1.5 hover:text-blue-400"><Edit3 size={11} /></button>
                              <button onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }} className="p-1.5 hover:text-rose-400"><Trash2 size={11} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-600 uppercase font-black tracking-widest text-[9px]">
                            {language === 'en' ? 'NO EMPLOYEES FOUND' : 'NO SE ENCONTRARON COLABORADORES'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Gorgeous cards layout */
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {filteredEmployees.map(e => {
                    const isSelected = selectedIds.includes(e.id);
                    return (
                      <div 
                        key={e.id}
                        onClick={() => loadEmployeeDetails(e)}
                        className={clsx(
                          "glass-premium p-5 border border-white/5 hover:border-blue-500/30 rounded-2xl cursor-pointer transition-all group relative flex flex-col justify-between h-44",
                          isSelected && "border-blue-500/50 bg-blue-500/5"
                        )}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox */}
                            <div 
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleSelectRow(e.id);
                              }}
                              className={clsx(
                                "w-4.5 h-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0",
                                isSelected
                                  ? "border-blue-500 bg-blue-500 text-slate-950"
                                  : "border-white/10 bg-slate-950 hover:border-white/30"
                              )}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>

                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                              {e.photo_url ? (
                                <img src={e.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User size={18} className="text-slate-700" />
                              )}
                            </div>
                            
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-white group-hover:text-blue-400 transition-colors uppercase truncate leading-tight">
                                {e.first_name} {e.last_name}
                              </h4>
                              <span className="text-[8px] text-slate-500 font-mono tracking-wider">{e.employee_number || 'SIN ID'}</span>
                            </div>
                          </div>
                          <div onClick={ev => ev.stopPropagation()}>
                            <StatusBadge status={e.status} />
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide truncate">{e.job_title || 'SIN PUESTO'}</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{e.department || 'SIN DEPARTAMENTO'}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">
                            Ingreso: {e.hire_date || '—'}
                          </span>
                          
                          <div className="flex gap-1.5" onClick={ev => ev.stopPropagation()}>
                            <button 
                              onClick={() => { 
                                setBadgeEmployee(e); 
                                setIsBadgeModalOpen(true); 
                              }} 
                              className="p-1.5 bg-slate-950 border border-white/5 text-slate-400 hover:text-indigo-400 hover:border-indigo-400/20 rounded-lg transition-all"
                              title="Generar Gafete"
                            >
                              <Award size={11} />
                            </button>
                            <button 
                              onClick={() => { setEditingEmployee(e); setIsModalOpen(true); }} 
                              className="p-1.5 bg-slate-950 border border-white/5 text-slate-400 hover:text-blue-400 hover:border-blue-400/20 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button 
                              onClick={() => handleDelete(e.id)} 
                              className="p-1.5 bg-slate-950 border border-white/5 text-slate-400 hover:text-rose-400 hover:border-rose-400/20 rounded-lg transition-all"
                              title="Dar de Baja"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-600 uppercase font-black tracking-widest text-[9px]">
                      {language === 'en' ? 'NO EMPLOYEES FOUND' : 'NO SE ENCONTRARON COLABORADORES'}
                    </div>
                  )}
                </div>
            </div>
          </div>
        ) : (
          <RecruitmentView />
        )}
      {/* Details Overlay */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)} />
          <div className="relative w-full max-w-xl h-full bg-slate-900 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
                  {selectedEmployee.photo_url ? (
                    <img src={selectedEmployee.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-slate-800" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedEmployee.first_name} {selectedEmployee.last_name}</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{selectedEmployee.job_title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Email Corporativo</p>
                  <p className="text-[10px] font-bold text-white">{selectedEmployee.email || 'N/A'}</p>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Teléfono Directo</p>
                  <p className="text-[10px] font-bold text-white">{selectedEmployee.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Tabs Context */}
              <div className="flex gap-2 border-b border-white/5 pb-2">
                {['info', 'skills', 'certs'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t as any)} className={clsx("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", activeTab === t ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : "text-slate-500 hover:text-white")}>
                    {t}
                  </button>
                ))}
              </div>

              {loadingDetails ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" size={30} /></div>
              ) : (
                <div className="space-y-6">
                  {activeTab === 'info' && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2 border-b border-white/5 pb-1">Identificación</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-[8px] text-slate-500 uppercase">RFC</p><p className="text-[10px] text-white font-mono">{selectedEmployee.rfc || 'N/A'}</p></div>
                          <div><p className="text-[8px] text-slate-500 uppercase">CURP</p><p className="text-[10px] text-white font-mono">{selectedEmployee.curp || 'N/A'}</p></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'skills' && (
                    <div className="grid grid-cols-2 gap-3">
                      {employeeSkills.map((s, i) => (
                        <div key={i} className="bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                          <span className="text-[10px] font-black text-white uppercase">{s.skill_name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded uppercase">{s.skill_level}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <EmployeeFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEmployee(null); }}
        onSuccess={fetchEmployees}
        employee={editingEmployee}
      />
      
      <ImportEmployeesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={fetchEmployees}
      />

      <EmployeeBadgeModal
        isOpen={isBadgeModalOpen}
        onClose={() => { setIsBadgeModalOpen(false); setBadgeEmployee(null); }}
        employee={badgeEmployee}
      />

      {bajaModal && (
        <BajaEmpleadoModal
          employee={bajaModal.employee}
          onConfirm={async () => {
            try {
              await bajaModal.onConfirm();
            } catch (err: any) {
              toast(`Error al dar de baja: ${err.message}`, 'error');
            } finally {
              setBajaModal(null);
            }
          }}
          onCancel={() => setBajaModal(null)}
        />
      )}
    </div>
  );
};

export default RHView;
