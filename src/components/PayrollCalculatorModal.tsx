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

  const buildReceiptHTML = (calc: PayrollCalculation, isLast: boolean) => `
    <div class="receipt${isLast ? '' : ' page-break'}">
      <div class="header">
        <div class="header-left">
          <div class="company-name">${config.logoText || 'McVill Control ERP'}</div>
          <div class="company-sub">RECIBO DE NÓMINA DIGITAL</div>
        </div>
        <div class="header-right">
          <div class="period-label">PERIODO DE PAGO</div>
          <div class="period-value">${format(new Date(payrollPeriod.start + 'T12:00:00'), 'dd/MM/yyyy')} – ${format(new Date(payrollPeriod.end + 'T12:00:00'), 'dd/MM/yyyy')}</div>
        </div>
      </div>

      <div class="employee-box">
        <div class="employee-title">DATOS DEL EMPLEADO</div>
        <div class="employee-grid">
          <div><span class="label">Nombre:</span> <strong>${calc.employee_name}</strong></div>
          <div><span class="label">No. Empleado:</span> ${calc.employee_number}</div>
          <div><span class="label">Puesto:</span> ${calc.job_title}</div>
          <div><span class="label">Departamento:</span> ${calc.department}</div>
          <div><span class="label">Días Trabajados:</span> ${calc.worked_days}</div>
          <div><span class="label">Salario Diario:</span> $${calc.daily_salary.toLocaleString('es-MX')}</div>
        </div>
      </div>

      <div class="concepts-title">DESGLOSE DE CONCEPTOS</div>
      <div class="concepts-grid">
        <div class="col">
          <div class="col-header">PERCEPCIONES (+)</div>
          <div class="row-item"><span>Sueldo Base</span><span>$${calc.gross_salary.toLocaleString('es-MX')}</span></div>
          ${calc.overtime_hours > 0 ? `<div class="row-item"><span>Horas Extra (${calc.overtime_hours}h)</span><span>$${calc.overtime_amount.toLocaleString('es-MX')}</span></div>` : ''}
          ${calc.bonus_oee > 0 ? `<div class="row-item"><span>Bono OEE</span><span>$${calc.bonus_oee.toLocaleString('es-MX')}</span></div>` : ''}
          <div class="row-total"><span>Total Percepciones</span><span>$${calc.perception_total.toLocaleString('es-MX')}</span></div>
        </div>
        <div class="col">
          <div class="col-header deduct">DEDUCCIONES (-)</div>
          <div class="row-item"><span>IMSS Obrero</span><span class="red">-$${calc.imss_employee.toLocaleString('es-MX')}</span></div>
          <div class="row-item"><span>ISR Retención</span><span class="red">-$${calc.isr.toLocaleString('es-MX')}</span></div>
          ${calc.infonavit_discount > 0 ? `<div class="row-item"><span>INFONAVIT</span><span class="red">-$${calc.infonavit_discount.toLocaleString('es-MX')}</span></div>` : ''}
          ${calc.absences_discount > 0 ? `<div class="row-item"><span>Ausencias</span><span class="red">-$${calc.absences_discount.toLocaleString('es-MX')}</span></div>` : ''}
          ${calc.other_deductions > 0 ? `<div class="row-item"><span>Otras Deducciones</span><span class="red">-$${calc.other_deductions.toLocaleString('es-MX')}</span></div>` : ''}
          <div class="row-total"><span>Total Deducciones</span><span class="red">-$${calc.deduction_total.toLocaleString('es-MX')}</span></div>
        </div>
      </div>

      <div class="neto-box">
        <span class="neto-label">NETO A RECIBIR:</span>
        <span class="neto-value">$${calc.net_salary.toLocaleString('es-MX')} MXN</span>
      </div>

      <div class="signatures">
        <div class="sig-block"><div class="sig-line"></div><div class="sig-name">FIRMA DEL EMPLEADO</div></div>
        <div class="sig-block"><div class="sig-line"></div><div class="sig-name">REPRESENTANTE DE LA EMPRESA</div></div>
      </div>

      <div class="footer-legal">
        Este recibo constituye una constancia de pago de conformidad con la Ley Federal del Trabajo mexicana. &nbsp;·&nbsp; ${config.logoText || 'McVill ERP'} &nbsp;·&nbsp; Generado: ${new Date().toLocaleDateString('es-MX')}
      </div>
    </div>`;

  const printReceipt = (calc: PayrollCalculation) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;
    receiptWindow.document.write(buildPrintWindow([calc]));
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const printAllReceipts = () => {
    if (calculations.length === 0) return;
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;
    receiptWindow.document.write(buildPrintWindow(calculations));
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const buildPrintWindow = (calcs: PayrollCalculation[]) => `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Recibos de Nómina</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
        .receipt { padding: 28px 32px; max-width: 800px; margin: 0 auto; }
        .page-break { page-break-after: always; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 1.5px solid #e2e8f0; margin-bottom: 16px; }
        .company-name { font-size: 17px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px; }
        .company-sub { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
        .header-right { text-align: right; }
        .period-label { font-size: 9px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.8px; }
        .period-value { font-size: 11px; color: #475569; margin-top: 2px; }
        .employee-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; }
        .employee-title { font-size: 9px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .employee-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px 20px; }
        .employee-grid div { font-size: 10px; color: #475569; }
        .label { color: #94a3b8; }
        .concepts-title { font-size: 10px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 2px solid #1e3a8a; padding-bottom: 3px; }
        .concepts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; margin-bottom: 18px; }
        .col { }
        .col-header { font-size: 9px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 5px; }
        .col-header.deduct { color: #7f1d1d; }
        .row-item { display: flex; justify-content: space-between; padding: 3px 0; font-size: 10px; color: #334155; border-bottom: 1px solid #f1f5f9; }
        .row-total { display: flex; justify-content: space-between; padding: 5px 0; font-size: 10px; font-weight: 700; color: #0f172a; border-top: 1px solid #cbd5e1; margin-top: 3px; }
        .red { color: #b91c1c; }
        .neto-box { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .neto-label { font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.8px; }
        .neto-value { font-size: 18px; font-weight: 900; color: #1e3a8a; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .sig-block { text-align: center; }
        .sig-line { border-bottom: 1px solid #94a3b8; margin-bottom: 6px; height: 40px; }
        .sig-name { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }
        .footer-legal { font-size: 7.5px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; line-height: 1.5; }
        @media print { .page-break { page-break-after: always; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      ${calcs.map((c, i) => buildReceiptHTML(c, i === calcs.length - 1)).join('')}
    </body>
    </html>`;

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
                        <span className="flex items-center gap-4">
                          <span className="text-emerald-400">Bruto Total: ${calculations.reduce((a, c) => a + c.gross_salary, 0).toLocaleString()}</span>
                          <span className="text-blue-400">Neto Total: ${calculations.reduce((a, c) => a + c.net_salary, 0).toLocaleString()}</span>
                        </span>
                        <button
                          onClick={printAllReceipts}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 font-black rounded-lg hover:bg-slate-100 transition-all text-[9px] uppercase tracking-wider shadow-sm"
                        >
                          <Printer size={11} /> Imprimir Todos ({calculations.length})
                        </button>
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
