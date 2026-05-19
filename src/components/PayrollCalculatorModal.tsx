import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, X, ChevronDown, ChevronUp, Download, Printer,
  Info, Loader2, User, DollarSign, Percent, Shield, Heart,
  Home, CreditCard, Banknote, FileText, CheckCircle2, AlertTriangle,
  Clock, ToggleLeft, ToggleRight
} from 'lucide-react';
import clsx from 'clsx';
import { useConfig } from '../contexts/ConfigContext';
import { format } from 'date-fns';
import { payrollService, type AttendanceSummary } from '../services/payrollService';

interface PayrollCalculation {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  job_title: string;
  daily_salary: number;
  worked_days: number;
  
  gross_salary: number;
  overtime_hours: number;
  overtime_amount: number;
  bonus_oee: number;
  perception_total: number;
  
  imss_employee: number;
  imss_employer: number;
  isr: number;
  infonavit_credit: number;
  infonavit_discount: number;
  absences_discount: number;
  other_deductions: number;
  deduction_total: number;
  
  net_salary: number;
}

interface PayrollCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (calculations: PayrollCalculation[]) => void;
  employees?: any[];
}

const SBC_CALCULATION = {
  prima_vacacional: 0.25,
  aguinaldo_days: 15,
  integration_factor: 1.0532
};

const calculateIMSS = (sbc: number, days: number, annualSalary: number, config?: any) => {
  const uma = config?.uma_value ?? 108.57;
  const iv_rate = (config?.imss_iv ?? 0.625) / 100;
  const cv_rate = (config?.imss_cv ?? 1.125) / 100;
  const em_rate = (config?.imss_em ?? 0.40) / 100;

  const cuotafija = Math.min(annualSalary, uma * 30 * 0.20) * 0.20;
  const excedente = Math.max(0, annualSalary - (uma * 30)) * 0.01125;
  const seguroEnfermedadMaternidad = Math.min(annualSalary, uma * 30 * 3) * em_rate;
  const seguroInvalidezVida = Math.min(annualSalary, uma * 30 * 3) * (iv_rate + cv_rate);
  const guarderia = Math.min(annualSalary, uma * 30 * 3) * 0.01;
  
  const employee = (excedente + seguroEnfermedadMaternidad + seguroInvalidezVida) * (days / 365);
  const employer = (cuotafija + excedente * 0.007 + seguroEnfermedadMaternidad * 0.007 + seguroInvalidezVida * 0.0125 + guarderia) * (days / 365);
  
  return { employee: Math.round(employee * 100) / 100, employer: Math.round(employer * 100) / 100 };
};

const calculateISR = (annualTaxable: number) => {
  const table = [
    { limit: 8952.49, rate: 0.0192, quota: 0 },
    { limit: 75984.55, rate: 0.0640, quota: 171.88 },
    { limit: 133536.07, rate: 0.1088, quota: 4492.35 },
    { limit: 155229.80, rate: 0.16, quota: 10744.24 },
    { limit: 185852.57, rate: 0.1792, quota: 15495.19 },
    { limit: 374837.88, rate: 0.2136, quota: 21048.77 },
    { limit: 590795.99, rate: 0.2352, quota: 65658.83 },
    { limit: 1127926.84, rate: 0.30, quota: 116615.64 },
    { limit: 1503902.46, rate: 0.32, quota: 226233.44 },
    { limit: 4511707.37, rate: 0.35, quota: 350244.66 },
    { limit: Infinity, rate: 0.40, quota: 1299926.65 }
  ];
  
  let tax = 0;
  let prevLimit = 0;
  
  for (const row of table) {
    if (annualTaxable <= row.limit) {
      tax = row.quota + (annualTaxable - prevLimit) * row.rate;
      break;
    }
    prevLimit = row.limit;
  }
  
  return Math.round((tax / 12) * 100) / 100;
};

export const PayrollCalculatorModal: React.FC<PayrollCalculatorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employees = []
}) => {
  const { isDarkMode, config } = useConfig();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [calculations, setCalculations] = useState<PayrollCalculation[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState<PayrollCalculation | null>(null);
  const [useAttendance, setUseAttendance] = useState(true);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceSummary>>({});
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), 'yyyy-MM-dd'),
    workedDays: 15
  });

  useEffect(() => {
    if (isOpen && config.overtimeCutoffStartDay) {
      const today = new Date();
      const startDayStr = config.overtimeCutoffStartDay.toLowerCase();
      const dayMap: Record<string, number> = {
        domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6
      };
      
      const startDayNum = dayMap[startDayStr] ?? 2; // Martes por defecto
      const currentDayNum = today.getDay();
      
      const diffStart = (currentDayNum >= startDayNum) 
        ? (currentDayNum - startDayNum) 
        : (currentDayNum + 7 - startDayNum);
        
      const startDate = new Date();
      startDate.setDate(today.getDate() - diffStart - 7); // Período semanal anterior completo
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Lunes siguiente
      
      setPayrollPeriod({
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        workedDays: 7
      });
    }
  }, [isOpen, config.overtimeCutoffStartDay, config.overtimeCutoffEndDay]);

  const performCalculation = (employee: any, daysOverride?: number) => {
    const dailySalary = employee.daily_salary || 350;
    const workedDays = daysOverride ?? payrollPeriod.workedDays;
    const hourlyRate = dailySalary / 8;
    
    const grossSalary = dailySalary * workedDays;
    
    // LFT Overtime calculation: First 9 hours double, exceeding hours triple
    const otHours = employee.overtime_hours || 0;
    const doubleHours = Math.min(9, otHours);
    const tripleHours = Math.max(0, otHours - 9);
    const overtimeAmount = (doubleHours * hourlyRate * 2) + (tripleHours * hourlyRate * 3);
    
    // OEE Bonus dynamically computed based on OEE threshold and OEE bonus amount in config
    const oeeThreshold = config?.oee_bono_umbral ?? 85;
    const oeeBonoMontoPct = (config?.oee_bono_monto ?? 5.0) / 100;
    const empOee = employee.oee_percentage ?? 90; // Default fallback to 90% (triggers bonus if OEE is above threshold)
    const bonusOEE = employee.bonus_oee || ((empOee >= oeeThreshold) ? grossSalary * oeeBonoMontoPct : 0);
    
    const perceptionTotal = grossSalary + overtimeAmount + bonusOEE;
    
    const sbc = dailySalary * SBC_CALCULATION.integration_factor;
    const annualSalary = sbc * 365;
    const imss = calculateIMSS(sbc, workedDays, annualSalary, config);
    
    const isr = calculateISR(annualSalary);
    const infonavit = employee.infonavit_credit ? Math.min(employee.infonavit_credit, perceptionTotal * 0.3) : 0;
    const absences = (employee.absences || 0) * dailySalary;
    const otherDed = employee.other_deductions || 0;
    
    const deductionTotal = imss.employee + isr + infonavit + absences + otherDed;
    const netSalary = perceptionTotal - deductionTotal;

    return {
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      employee_number: employee.employee_number,
      department: employee.department,
      job_title: employee.job_title,
      daily_salary: dailySalary,
      worked_days: workedDays,
      gross_salary: Math.round(grossSalary * 100) / 100,
      overtime_hours: employee.overtime_hours || 0,
      overtime_amount: Math.round(overtimeAmount * 100) / 100,
      bonus_oee: Math.round(bonusOEE * 100) / 100,
      perception_total: Math.round(perceptionTotal * 100) / 100,
      imss_employee: imss.employee,
      imss_employer: imss.employer,
      isr: Math.round(isr * 100) / 100,
      infonavit_credit: employee.infonavit_credit || 0,
      infonavit_discount: Math.round(infonavit * 100) / 100,
      absences_discount: Math.round(absences * 100) / 100,
      other_deductions: Math.round(otherDed * 100) / 100,
      deduction_total: Math.round(deductionTotal * 100) / 100,
      net_salary: Math.round(netSalary * 100) / 100
    };
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setAttendanceLoaded(false);

    const empsToCalc = selectedEmployees.length > 0
      ? employees.filter(e => selectedEmployees.includes(e.id))
      : employees.filter(e => e.status === 'active');

    let attendance: Record<string, AttendanceSummary> = {};

    if (useAttendance) {
      const ids = empsToCalc.map(e => e.id);
      attendance = await payrollService.getAttendanceSummaryForPeriod(
        ids,
        payrollPeriod.start,
        payrollPeriod.end
      );
      
      // Map result keys from UUID back to employee_number if needed by the modal logic
      // Actually, looking at line 187: att = attendance[emp.employee_number]
      // I should probably return a map keyed by UUID to be safer, or keep numbers if preferred.
      // But attendanceService uses UUID for employee_id.
      setAttendanceData(attendance);
      setAttendanceLoaded(Object.keys(attendance).length > 0);
    }

    const results = empsToCalc.map(emp => {
      const att = attendance[emp.id];
      const enriched = att
        ? { ...emp, overtime_hours: att.overtime_hours }
        : emp;
      const daysOverride = att?.days_present ?? payrollPeriod.workedDays;
      return performCalculation(enriched, daysOverride);
    });

    setCalculations(results);
    setCalculating(false);
  };

  const handleSave = () => {
    onSave(calculations);
    onClose();
  };

  const printReceipt = (calc: PayrollCalculation) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;
    
    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo de Nomina - ${calc.employee_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { font-size: 18px; margin-bottom: 5px; }
          .header h2 { font-size: 14px; font-weight: normal; }
          .period { text-align: center; background: #f0f0f0; padding: 8px; margin-bottom: 15px; }
          .employee-info { display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .section { margin-bottom: 15px; }
          .section-title { background: #333; color: #fff; padding: 5px 10px; font-weight: bold; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 5px 10px; border: 1px solid #ddd; }
          td:first-child { font-weight: bold; width: 60%; }
          .text-right { text-align: right; }
          .totals { font-weight: bold; background: #f9f9f9; }
          .neto { font-size: 16px; background: #e0ffe0; }
          .deductions { color: #c00; }
          .footer { margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; font-size: 10px; text-align: center; }
          .break { page-break-after: always; }
          @media print { .break { page-break-after: always; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>M CVILL Control ERP</h1>
          <h2>RECIBO DE NOMINA</h2>
        </div>
        
        <div class="period">
          <strong>PERIODO:</strong> ${format(new Date(payrollPeriod.start), 'dd/MM/yyyy')} - ${format(new Date(payrollPeriod.end), 'dd/MM/yyyy')}
          | DIAS TRABAJADOS: ${calc.worked_days}
        </div>
        
        <div class="employee-info">
          <div>
            <strong>EMPLEADO:</strong> ${calc.employee_name}<br/>
            <strong>NO. EMPLEADO:</strong> ${calc.employee_number}
          </div>
          <div>
            <strong>DEPARTAMENTO:</strong> ${calc.department}<br/>
            <strong>PUESTO:</strong> ${calc.job_title}
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">PERCEPCIONES</div>
          <table>
            <tr><td>Salario Diario</td><td class="text-right">$${calc.daily_salary.toLocaleString()}</td></tr>
            <tr><td>Dias Trabajados</td><td class="text-right">${calc.worked_days}</td></tr>
            <tr><td>SUELDO BRUTO</td><td class="text-right"><strong>$${calc.gross_salary.toLocaleString()}</strong></td></tr>
            ${calc.overtime_hours > 0 ? `<tr><td>Horas Extra (${calc.overtime_hours}h)</td><td class="text-right">$${calc.overtime_amount.toLocaleString()}</td></tr>` : ''}
            ${calc.bonus_oee > 0 ? `<tr><td>Bono OEE</td><td class="text-right">$${calc.bonus_oee.toLocaleString()}</td></tr>` : ''}
            <tr class="totals"><td>TOTAL PERCEPCIONES</td><td class="text-right">$${calc.perception_total.toLocaleString()}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">DEDUCCIONES</div>
          <table>
            <tr><td>IMSS (Cuota Obrera)</td><td class="text-right deductions">-$${calc.imss_employee.toLocaleString()}</td></tr>
            <tr><td>ISR (Impuesto Sobre la Renta)</td><td class="text-right deductions">-$${calc.isr.toLocaleString()}</td></tr>
            ${calc.infonavit_discount > 0 ? `<tr><td>INFONAVIT</td><td class="text-right deductions">-$${calc.infonavit_discount.toLocaleString()}</td></tr>` : ''}
            ${calc.absences_discount > 0 ? `<tr><td>Descuento por Ausencias</td><td class="text-right deductions">-$${calc.absences_discount.toLocaleString()}</td></tr>` : ''}
            ${calc.other_deductions > 0 ? `<tr><td>Otras Deducciones</td><td class="text-right deductions">-$${calc.other_deductions.toLocaleString()}</td></tr>` : ''}
            <tr class="totals"><td>TOTAL DEDUCCIONES</td><td class="text-right deductions">-$${calc.deduction_total.toLocaleString()}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <table>
            <tr class="neto"><td>NETO A PAGAR</td><td class="text-right"><strong>$${calc.net_salary.toLocaleString()}</strong></td></tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">INFORMACION COMPLEMENTARIA</div>
          <table>
            <tr><td>IMSS Patron</td><td class="text-right">$${calc.imss_employer.toLocaleString()}</td></tr>
            ${calc.infonavit_credit > 0 ? `<tr><td>Credito INFONAVIT (UMA)</td><td class="text-right">$${calc.infonavit_credit.toLocaleString()}</td></tr>` : ''}
          </table>
        </div>
        
        <div class="footer">
          <p>Este recibo es un documento informativo. ${config.logoText} v6.2</p>
          <p>Generado el ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 lg:left-64 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 lg:p-8"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={clsx(
              "w-full max-w-6xl max-h-[90vh] rounded-2xl border border-mcvill-card-border shadow-2xl flex flex-col overflow-hidden",
              isDarkMode ? "bg-slate-950" : "bg-white"
            )}
          >
            <div className={clsx(
              "p-6 flex items-center justify-between border-b shrink-0",
              isDarkMode ? "border-mcvill-card-border" : "border-mcvill-card-border"
            )}>
              <div className="flex items-center gap-4">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  isDarkMode ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-100"
                )}>
                  <Calculator className={clsx(isDarkMode ? "text-emerald-400" : "text-emerald-600")} size={24} />
                </div>
                <div>
                  <h2 className={clsx(
                    "text-xl font-black uppercase tracking-tight",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}>
                    CALCULO DE NOMINA
                  </h2>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    IMSS, ISR, INFONAVIT - Desglose Completo
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className={clsx(
                    "p-3 rounded-2xl transition-all",
                    showInfo 
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" 
                      : isDarkMode ? "hover:bg-white/10 text-slate-500" : "hover:bg-slate-100 text-slate-400"
                  )}
                >
                  <Info size={18} />
                </button>
                <button
                  onClick={onClose}
                  className={clsx(
                    "p-3 rounded-2xl transition-all",
                    isDarkMode ? "hover:bg-white/10 text-slate-500" : "hover:bg-slate-100 text-slate-400"
                  )}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {showInfo && (
              <div className={clsx(
                "p-6 border-b space-y-4",
                isDarkMode ? "border-mcvill-card-border bg-slate-900/50" : "border-mcvill-card-border bg-blue-50"
              )}>
                <h3 className="font-black text-sm uppercase tracking-wider text-blue-400">Como se Calcula la Nomina?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                  <div className={clsx(
                    "p-4 rounded-2xl",
                    isDarkMode ? "bg-slate-900 border border-mcvill-card-border" : "bg-white border border-mcvill-card-border"
                  )}>
                    <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
                      <DollarSign size={14} /> PERCEPCIONES
                    </h4>
                    <ul className="space-y-1 text-slate-400">
                      <li>- <strong>Sueldo Base:</strong> Salario Diario x Dias Trabajados</li>
                      <li>- <strong>Horas Extra:</strong> (Salario Diario / 8) x 2 x Horas</li>
                      <li>- <strong>Bono OEE:</strong> Productividad del periodo</li>
                    </ul>
                  </div>
                  <div className={clsx(
                    "p-4 rounded-2xl",
                    isDarkMode ? "bg-slate-900 border border-mcvill-card-border" : "bg-white border border-mcvill-card-border"
                  )}>
                    <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                      <Percent size={14} /> DEDUCCIONES
                    </h4>
                    <ul className="space-y-1 text-slate-400">
                      <li>- <strong>IMSS Obrera:</strong> Cuota fija + Excedente + SEM + IVIM + Guarderia</li>
                      <li>- <strong>ISR:</strong> Tabla LISR mensual segun salario anual</li>
                      <li>- <strong>INFONAVIT:</strong> Descuento crediticio (max 30% del salario)</li>
                    </ul>
                  </div>
                </div>
                <div className={clsx(
                  "p-4 rounded-2xl flex items-start gap-3",
                  isDarkMode ? "bg-amber-500/10 border border-mcvill-card-border" : "bg-amber-50 border border-mcvill-card-border"
                )}>
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                  <p className="text-[10px] text-amber-300">
                    <strong>Factor de Integracion SBC:</strong> El Salario Base de Cotizacion incluye el salario diario + prima vacacional (25%) + aguinaldo (15 dias). 
                    Factor = 1 + (Prima Vacacional 0.25 + Aguinaldo/365) = <strong>1.0532</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-6">
                <div className={clsx(
                  "p-6 rounded-2xl border",
                  isDarkMode ? "bg-slate-900/50 border-mcvill-card-border" : "bg-slate-50 border-mcvill-card-border"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider">Configurar Periodo</h3>
                    <button
                      onClick={() => setUseAttendance(v => !v)}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all",
                        useAttendance
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : isDarkMode
                            ? "bg-slate-800 border-mcvill-card-border text-slate-500"
                            : "bg-white border-mcvill-card-border text-slate-400"
                      )}
                    >
                      {useAttendance
                        ? <ToggleRight size={14} />
                        : <ToggleLeft size={14} />
                      }
                      <Clock size={12} />
                      Asistencia Real
                    </button>
                  </div>

                  {useAttendance && (
                    <div className={clsx(
                      "flex items-start gap-2 mb-4 p-3 rounded-xl text-[10px]",
                      isDarkMode ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"
                    )}>
                      <Clock size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span className={isDarkMode ? "text-emerald-300" : "text-emerald-700"}>
                        Los días trabajados y horas extra se tomarán automáticamente de los registros de entrada/salida del periodo seleccionado. El campo "Días Trabajados" solo se usará si el empleado no tiene checadas.
                      </span>
                    </div>
                  )}

                  {attendanceLoaded && (
                    <div className={clsx(
                      "flex items-center gap-2 mb-4 p-3 rounded-xl text-[10px]",
                      isDarkMode ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"
                    )}>
                      <CheckCircle2 size={12} className="text-blue-400 shrink-0" />
                      <span className={isDarkMode ? "text-blue-300" : "text-blue-700"}>
                        Asistencia cargada: {Object.keys(attendanceData).length} empleados con checadas reales — días y horas extra aplicados.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Fecha Inicio</label>
                      <input
                        type="date"
                        value={payrollPeriod.start}
                        onChange={e => setPayrollPeriod(prev => ({ ...prev, start: e.target.value }))}
                        className={clsx(
                          "w-full h-11 px-4 rounded-2xl border text-sm font-bold",
                          isDarkMode 
                            ? "bg-slate-900 border-mcvill-card-border text-white" 
                            : "bg-white border-mcvill-card-border text-slate-900"
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Fecha Fin</label>
                      <input
                        type="date"
                        value={payrollPeriod.end}
                        onChange={e => setPayrollPeriod(prev => ({ ...prev, end: e.target.value }))}
                        className={clsx(
                          "w-full h-11 px-4 rounded-2xl border text-sm font-bold",
                          isDarkMode 
                            ? "bg-slate-900 border-mcvill-card-border text-white" 
                            : "bg-white border-mcvill-card-border text-slate-900"
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Dias Trabajados</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={payrollPeriod.workedDays}
                        onChange={e => setPayrollPeriod(prev => ({ ...prev, workedDays: parseInt(e.target.value) || 15 }))}
                        className={clsx(
                          "w-full h-11 px-4 rounded-2xl border text-sm font-bold",
                          isDarkMode 
                            ? "bg-slate-900 border-mcvill-card-border text-white" 
                            : "bg-white border-mcvill-card-border text-slate-900"
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className={clsx(
                  "p-6 rounded-2xl border",
                  isDarkMode ? "bg-slate-900/50 border-mcvill-card-border" : "bg-slate-50 border-mcvill-card-border"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider">
                      Seleccionar Empleados ({selectedEmployees.length > 0 ? `${selectedEmployees.length} seleccionados` : 'Todos'})
                    </h3>
                    <button
                      onClick={toggleAll}
                      className="text-[10px] font-black text-blue-400 uppercase tracking-widest"
                    >
                      {selectedEmployees.length === employees.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-auto custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {employees.map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => toggleEmployee(emp.id)}
                          className={clsx(
                            "p-3 rounded-2xl text-left text-xs font-bold transition-all border",
                            selectedEmployees.includes(emp.id)
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                              : isDarkMode
                                ? "bg-slate-900 border-mcvill-card-border text-slate-400 hover:border-white/10"
                                : "bg-white border-mcvill-card-border text-slate-600 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={clsx(
                              "w-5 h-5 rounded flex items-center justify-center",
                              selectedEmployees.includes(emp.id) ? "bg-blue-500 text-white" : isDarkMode ? "bg-slate-800" : "bg-slate-100"
                            )}>
                              {selectedEmployees.includes(emp.id) && <CheckCircle2 size={12} />}
                            </div>
                            <span className="truncate">{emp.first_name} {emp.last_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {calculations.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider">Resultados del Calculo</h3>
                    
                    <div className={clsx(
                      "rounded-2xl border overflow-hidden",
                      isDarkMode ? "border-mcvill-card-border" : "border-mcvill-card-border"
                    )}>
                      <div className={clsx(
                        "p-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-between",
                        isDarkMode ? "bg-slate-900 text-slate-500" : "bg-slate-100 text-slate-500"
                      )}>
                        <span>Resumen de Calculos</span>
                        <span className="flex items-center gap-4">
                          <span className="text-emerald-400">Bruto Total: ${calculations.reduce((a, c) => a + c.gross_salary, 0).toLocaleString()}</span>
                          <span className="text-blue-400">Neto Total: ${calculations.reduce((a, c) => a + c.net_salary, 0).toLocaleString()}</span>
                        </span>
                      </div>
                      
                      <div className="max-h-80 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[10px]">
                          <thead className={clsx(
                            isDarkMode ? "bg-slate-900/50" : "bg-slate-50"
                          )}>
                            <tr className="font-black uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3">Empleado</th>
                              <th title="Sueldo Base: (Salario Diario × Días Trabajados)" className="px-4 py-3 text-right">Bruto</th>
                              <th title="Retención IMSS: (Cuota Fija + Excedente + Enf/Mat + Inv/Vida) × (Días/365)" className="px-4 py-3 text-right">IMSS</th>
                              <th title="Retención LISR: Calculada en base a las tablas mensuales del Art. 96 LISR vigente" className="px-4 py-3 text-right">ISR</th>
                              <th title="Descuento INFONAVIT: (Monto Crediticio o % de Salario Tope 30%)" className="px-4 py-3 text-right">Infonavit</th>
                              <th title="Salario Neto Final: (Percepciones Totales - Deducciones Totales)" className="px-4 py-3 text-right">Neto</th>
                              <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {calculations.map((calc, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-bold text-white">{calc.employee_name}</div>
                                  <div className="text-[9px] text-slate-500">{calc.department}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-amber-400">
                                  ${calc.gross_salary.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-red-400">
                                  -${calc.imss_employee.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-red-400">
                                  -${calc.isr.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-red-400">
                                  ${calc.infonavit_discount > 0 ? `-$${calc.infonavit_discount.toLocaleString()}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                                  ${calc.net_salary.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => setSelectedCalculation(calc)}
                                    className="p-2 hover:bg-blue-500/20 rounded-2xl transition-all text-blue-400"
                                    title="Ver Detalle"
                                  >
                                    <FileText size={14} />
                                  </button>
                                  <button
                                    onClick={() => printReceipt(calc)}
                                    className="p-2 hover:bg-emerald-500/20 rounded-2xl transition-all text-emerald-400 ml-1"
                                    title="Imprimir Recibo"
                                  >
                                    <Printer size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={clsx(
              "p-6 border-t flex justify-between items-center shrink-0",
              isDarkMode ? "border-mcvill-card-border" : "border-mcvill-card-border"
            )}>
              <div className="text-[10px] text-slate-500">
                {calculations.length > 0 && (
                  <span>{calculations.length} empleados calculados</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className={clsx(
                    "px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all",
                    isDarkMode 
                      ? "bg-slate-800 text-slate-400 hover:text-white" 
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCalculate}
                  disabled={calculating || employees.length === 0}
                  className="px-8 py-3 rounded-2xl bg-blue-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {calculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                  {calculating ? 'Calculando...' : 'Calcular Nomina'}
                </button>
                {calculations.length > 0 && (
                  <button
                    onClick={handleSave}
                    className="px-8 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Guardar Nominas
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PayrollCalculatorModal;
