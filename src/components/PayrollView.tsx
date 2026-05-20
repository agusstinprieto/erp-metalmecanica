import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  CreditCard,
  Trash2,
  Calculator
} from 'lucide-react';
import clsx from 'clsx';
import { payrollService } from '../services/payrollService';
import type { Payroll } from '../services/payrollService';
import { employeeService } from '../services/employeeService';
import { reportUtils } from '../utils/reportUtils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useConfig } from '../contexts/ConfigContext';
import { useSearch } from '../contexts/SearchContext';
import { appConfirm } from '../lib/dialogs';
import { PayrollCalculatorModal } from './PayrollCalculatorModal';
import { PayrollPoliciesModal } from './PayrollPoliciesModal';
import { FormulaPanel, FORMULAS } from './common/FormulaPanel';
import { PrintButton } from './common/PrintButton';

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    paid: { icon: ShieldCheck, text: 'Dispersado', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    approved: { icon: CheckCircle2, text: 'Autorizado', classes: 'bg-mcvill-accent/10 text-mcvill-accent border-mcvill-card-border' },
    draft: { icon: Clock, text: 'Borrador', classes: 'bg-slate-500/10 text-slate-500 border-mcvill-card-border' },
    calculated: { icon: Zap, text: 'Calculado', classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  };

  const config = configs[status] || configs.draft;
  const Icon = config.icon;

  return (
    <div className={clsx(
      "flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500", 
      config.classes
    )}>
      <Icon size={12} className={clsx(status === 'calculated' && "animate-pulse")} />
      {config.text}
    </div>
  );
};

export const PayrollView = () => {
  const { isDarkMode } = useConfig();
  const { searchTerm, setSearchTerm } = useSearch();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notifyError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const data = await payrollService.listPayrolls();
      setPayrolls(data);
    } catch (err) {
      console.error('Error fetching payrolls:', err);
      notifyError('No se pudieron cargar las nóminas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.listEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      notifyError('No se pudo cargar la lista de empleados.');
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPayrolls();
    fetchEmployees();
  }, []);

  const handleDownloadReport = () => {
    reportUtils.exportToPDF(
      "Estado General de Nómina y Dispersión Control",
      payrolls.map(p => ({
        NOMBRE: `${p.empleados?.first_name} ${p.empleados?.last_name}`,
        BRUTO: `$${Number(p.gross_salary).toLocaleString()}`,
        NETO: `$${Number(p.net_salary).toLocaleString()}`,
        DEDUCCIONES: `$${Number(p.deductions).toLocaleString()}`,
        ESTADO: p.status.toUpperCase(),
        PERIODO: `${format(new Date(p.period_start), 'dd/MM')} - ${format(new Date(p.period_end), 'dd/MM')}`
      })),
      "reporte_nomina_Control",
      "FINANZAS / NÓMINA"
    );
  };

  const handleSavePayrollCalculations = async (calculations: any[]) => {
    const now = new Date();
    const periodStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const periodEnd   = format(endOfMonth(now),   'yyyy-MM-dd');
    try {
      setLoading(true);
      await payrollService.bulkSavePayrolls(calculations, periodStart, periodEnd);
      await fetchPayrolls();
    } catch (err) {
      console.error('Error saving payroll calculations:', err);
      notifyError('Error al guardar los cálculos de nómina.');
    } finally {
      setLoading(false);
    }
  };

  const totalGross = payrolls.reduce((acc, p) => acc + Number(p.gross_salary), 0);
  const pendingCount = payrolls.filter(p => p.status !== 'paid').length;

  const handleDelete = async (id: string) => {
    if (!await appConfirm('¿Seguro que deseas eliminar este registro de nómina?')) return;
    try {
      await payrollService.deletePayroll(id);
      fetchPayrolls();
    } catch (err) {
      console.error('Error deleting payroll:', err);
      notifyError('Error al eliminar el registro de nómina.');
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      'calculated': 'approved',
      'approved': 'paid',
      'paid': 'calculated'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'calculated';
    
    try {
      await payrollService.updatePayroll(id, { status: nextStatus as any });
      fetchPayrolls();
    } catch (err) {
      console.error('Error updating payroll status:', err);
      notifyError('Error al actualizar el estado de nómina.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {errorMsg && (
        <div className="px-4 py-2 bg-rose-600/20 border-b border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-widest shrink-0">
          {errorMsg}
        </div>
      )}
      {/* Header Section — Compact Industrial Style */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="text-emerald-500" size={16} />
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              GESTIÓN DE <span className="text-blue-500">NÓMINA</span>
            </h2>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden md:block">
            Control Maestro de Dispersión · Cumplimiento Fiscal
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowPoliciesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <ShieldCheck size={12} className="text-mcvill-accent" /> POLÍTICAS TE
          </button>
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Download size={12} /> REPORTE
          </button>
          <button
            onClick={() => setShowCalculatorModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Calculator size={12} /> CALCULADORA
          </button>
          <PrintButton />
        </div>
      </div>

      {/* Formula Panel — Nómina */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 shrink-0">
        <FormulaPanel formulas={FORMULAS.nomina} variant="emerald" label="Fórmulas Nómina" />
      </div>

      {/* Financial Summary — Compact Matrix */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 bg-slate-900/20 shrink-0">
        {[
          { label: 'DISPERSIÓN BRUTA', value: `$${totalGross.toLocaleString()}`, sub: 'Ciclo Actual', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'PROCESADOS', value: `${payrolls.filter(p => p.status === 'paid').length}/${payrolls.length}`, sub: 'Eficiencia', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'PENDIENTES', value: pendingCount, sub: 'Autorización', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 group hover:bg-white/[0.04] transition-all">
            <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shrink-0", stat.bg, stat.color)}>
              <stat.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
              <p className={clsx("text-xl font-black tracking-tighter leading-none", stat.color)}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar — Compact */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-4 shrink-0">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={12} />
          <input 
            type="text" 
            placeholder="RASTREAR NÓMINAS POR COLABORADOR..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 outline-none text-[10px] font-bold text-white placeholder:text-slate-700 focus:border-blue-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 h-8 border-l border-white/10 pl-4">
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">CICLO ACTUAL</p>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter leading-none mt-1">{format(new Date(), 'MMMM yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Payroll Database — Industrial Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
              <th className="px-4 py-2">COLABORADOR</th>
              <th className="px-4 py-2 text-center">RFC / ID</th>
              <th className="px-4 py-2 text-center">HRS EXTRAS</th>
              <th className="px-4 py-2 text-center">BONO OEE</th>
              <th className="px-4 py-2 text-center">NETO</th>
              <th className="px-4 py-2 text-center">ESTADO</th>
              <th className="px-4 py-2 text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-8 py-32 text-center">
                  <Loader2 className="w-12 h-12 text-mcvill-accent animate-spin mx-auto mb-6" role="status" aria-label="Cargando" />
                  <p className="text-[10px] font-black text-mcvill-text-muted uppercase tracking-[0.4em]">Sincronizando Dispersión...</p>
                </td>
              </tr>
            ) : payrolls.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-32 text-center">
                  <div className="max-w-md mx-auto space-y-4 opacity-50">
                    <AlertCircle className="w-16 h-16 text-mcvill-text-muted mx-auto" />
                    <p className="text-mcvill-text-muted font-black text-[10px] uppercase tracking-[0.2em]">
                      No hay registros de nómina para este ciclo.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              payrolls
                .filter((p) => {
                  const fullName = `${p.empleados?.first_name} ${p.empleados?.last_name}`.toLowerCase();
                  return fullName.includes(searchTerm.toLowerCase());
                })
                .map((p) => (
                  <tr key={p.id} className="hover:bg-blue-500/5 transition-all group">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform font-black text-[10px]">
                          {p.empleados?.first_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-white tracking-tight uppercase leading-none">{p.empleados?.first_name} {p.empleados?.last_name}</p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">{p.empleados?.job_title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <span className="font-mono text-[9px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                        {p.empleados?.rfc || 'XAXX010101000'}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <div className="flex flex-col items-center">
                        <p className="text-[10px] font-bold text-amber-500 leading-none">{p.overtime_hours || 0}h</p>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-tight mt-0.5">+${Number(p.overtime_amount || 0).toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <p className="text-[10px] font-bold text-emerald-500">${Number(p.bonus_oee || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <p className="text-[11px] font-black text-white tracking-tighter">
                        ${Number(p.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => handleUpdateStatus(p.id, p.status)}
                          className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-blue-400 transition-all"
                        >
                          <RefreshCw size={12} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <PayrollCalculatorModal
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
        onSave={handleSavePayrollCalculations}
        employees={employees}
      />
      <PayrollPoliciesModal
        isOpen={showPoliciesModal}
        onClose={() => setShowPoliciesModal(false)}
      />
    </div>
  );
};

export default PayrollView;
