import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, RefreshCw, CheckCircle2, UserX,
  LogOut, Zap, Loader2, Brain,
  Users, Timer, LogIn, CheckCheck, Scan, AlertTriangle, TrendingDown, FileDown, Search
} from 'lucide-react';
import { ScannerStation } from './ScannerStation';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import geminiService from '../services/geminiService';
import { reportUtils } from '../utils/reportUtils';
import { attendanceService } from '../services/attendanceService';
import type { AttendanceRecord as MyRecord } from '../services/attendanceService';
import { employeeService, type Employee } from '../services/employeeService';
import { shiftService, type WorkShift } from '../services/shiftService';
import { User } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  minutes_worked: number | null;
  overtime_minutes: number;
  status: string;
  is_late: boolean;
  early_departure: boolean;
  missing_checkout: boolean;
  excessive_overtime: boolean;
}

interface KPIs {
  present: number;
  late: number;
  absent: number;
  missing_checkout: number;
  total_overtime_h: number;
}

type AnomalyFilter = 'all' | 'late' | 'absent' | 'missing_checkout' | 'overtime';
type ViewMode = 'anomalias' | 'ausentismo';

interface AbsenceRow {
  employee_id: string;
  employee_name: string;
  total_days: number;
  present: number;
  absences: number;
  late_count: number;
  missing_checkouts: number;
  attendance_pct: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

function fmtMin(min: number | null) {
  if (!min || min <= 0) return '—';
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  present:    { label: 'Presente',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  late:       { label: 'Retardo',    cls: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
  absent:     { label: 'Ausente',    cls: 'bg-red-500/10    text-red-400    border-red-500/20'    },
  incomplete: { label: 'Incompleto', cls: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
  holiday:    { label: 'Festivo',    cls: 'bg-slate-500/10  text-slate-400  border-slate-500/20'  },
  vacation:   { label: 'Vacaciones', cls: 'bg-blue-500/10   text-blue-400   border-blue-500/20'   },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const AttendanceView: React.FC = () => {
  const { config } = useConfig();

  const [records, setRecords]         = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [syncing, setSyncing]         = useState(false);
  const [filter, setFilter]           = useState<AnomalyFilter>('all');
  const [aiInsight, setAiInsight]     = useState('');
  const [aiLoading, setAiLoading]     = useState(false);
  const [dateRange, setDateRange]     = useState({
    start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    end:   format(new Date(), 'yyyy-MM-dd'),
  });
  const [empSearch, setEmpSearch]     = useState('');

  const [showScanner, setShowScanner] = useState(false);
  const [viewMode, setViewMode]       = useState<ViewMode>('anomalias');
  const [shifts, setShifts]           = useState<WorkShift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>('all');

  // — Fichaje personal —
  const [employee, setEmployee]       = useState<{ id: string; full_name: string; tenant_id?: string } | null>(null);
  const [todayRecord, setTodayRecord] = useState<MyRecord | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [employeesMap, setEmployeesMap] = useState<Record<string, Employee>>({});
  const [employeesNumMap, setEmployeesNumMap] = useState<Record<string, Employee>>({});

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    attendanceService.getCurrentEmployee()
      .then(emp => {
        if (!emp) return;
        setEmployee(emp as { id: string; full_name: string; tenant_id?: string });
        return attendanceService.getTodayRecord(emp.id).then(setTodayRecord);
      })
      .catch(e => console.error('[AttendanceView] employee init error:', e));
  }, []);

  const handleCheckIn = async () => {
    if (!employee) return;
    setPunchLoading(true);
    try {
      const rec = await attendanceService.checkIn(employee.id, employee.full_name, employee.tenant_id);
      setTodayRecord(rec);
    } catch (e) {
      console.error('[AttendanceView] checkIn error:', e);
      alert('Error al registrar entrada. Verifica tu conexión.');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord?.check_in) return;
    setPunchLoading(true);
    try {
      const rec = await attendanceService.checkOut(todayRecord.id, todayRecord.check_in);
      setTodayRecord(rec);
      fetchRecords();
    } catch (e) {
      console.error('[AttendanceView] checkOut error:', e);
      alert('Error al registrar salida. Verifica tu conexión.');
    } finally {
      setPunchLoading(false);
    }
  };

  const fetchRecords = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('attendance_anomalies')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false })
        .order('employee_id');

      if (!error && data) setRecords(data as AttendanceRecord[]);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [dateRange.start, dateRange.end]);

  const fetchEmployeesData = useCallback(async () => {
    try {
      const emps = await employeeService.listEmployees();
      const map: Record<string, Employee> = {};
      const numMap: Record<string, Employee> = {};
      emps.forEach(e => {
        map[e.id] = e;
        if (e.employee_number) numMap[e.employee_number] = e;
      });
      setEmployeesMap(map);
      setEmployeesNumMap(numMap);
      
      const shiftList = await shiftService.listShifts();
      setShifts(shiftList);
    } catch (e) {
      console.error('Error fetching data for attendance view:', e);
    }
  }, []);

  useEffect(() => { 
    fetchRecords();
    fetchEmployeesData();
  }, [fetchRecords, fetchEmployeesData]);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Filtrado por Turno
  const recordsWithShift = records.filter(r => {
    if (selectedShift === 'all') return true;
    return employeesMap[r.employee_id]?.shift_id === selectedShift;
  });

  const todayRecs = recordsWithShift.filter(r => r.date === today);

  const kpis: KPIs = {
    present:          todayRecs.filter(r => ['present', 'late'].includes(r.status)).length,
    late:             todayRecs.filter(r => r.is_late).length,
    absent:           todayRecs.filter(r => r.status === 'absent').length,
    missing_checkout: recordsWithShift.filter(r => r.missing_checkout).length,
    total_overtime_h: Math.round(
      recordsWithShift.reduce((s, r) => s + (r.overtime_minutes || 0), 0) / 60 * 10
    ) / 10,
  };

  const filtered = recordsWithShift.filter(r => {
    if (filter === 'late')            return r.is_late;
    if (filter === 'absent')          return r.status === 'absent';
    if (filter === 'missing_checkout') return r.missing_checkout;
    if (filter === 'overtime')        return r.excessive_overtime;
    return r.is_late || r.status === 'absent' || r.missing_checkout || r.excessive_overtime;
  });

  // Reporte de ausentismo agrupado por empleado (usando registros filtrados por turno)
  const absenceReport: AbsenceRow[] = Object.values(
    recordsWithShift.reduce<Record<string, AbsenceRow>>((acc, r) => {
      if (!acc[r.employee_id]) {
        acc[r.employee_id] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          total_days: 0, present: 0, absences: 0,
          late_count: 0, missing_checkouts: 0, attendance_pct: 0,
        };
      }
      const row = acc[r.employee_id];
      row.total_days++;
      if (r.status === 'absent') row.absences++;
      else row.present++;
      if (r.is_late) row.late_count++;
      if (r.missing_checkout) row.missing_checkouts++;
      row.attendance_pct = Math.round((row.present / row.total_days) * 100);
      return acc;
    }, {})
  ).sort((a, b) => a.attendance_pct - b.attendance_pct);

  const generateInsight = async () => {
    setAiLoading(true);
    setAiInsight('');
    try {
      const top3Absent = absenceReport.slice(0, 3).map(r => `${r.employee_name}: ${r.absences} faltas, ${r.late_count} retardos`).join('; ');
      const prompt = `Eres analista de RH industrial en ${config.companyName}. Resumen de asistencia últimos 7 días: ${records.length} registros. Hoy: ${kpis.present} presentes, ${kpis.late} retardos, ${kpis.absent} ausentes, ${kpis.missing_checkout} sin check-out. Empleados con mayor ausentismo: ${top3Absent || 'sin datos suficientes'}. Genera un análisis breve (máx 3 puntos) con acciones concretas para RH. Responde en español.`;
      const insight = await geminiService.generateText(prompt);
      setAiInsight(insight);
    } catch {
      setAiInsight('Error en análisis IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const statCards = [
    { label: 'Presentes hoy', value: kpis.present, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Retardos hoy',  value: kpis.late,    icon: Clock,         color: 'text-amber-400' },
    { label: 'Ausentes hoy',  value: kpis.absent,  icon: UserX,         color: 'text-red-400' },
    { label: 'Sin check-out', value: kpis.missing_checkout, icon: LogOut, color: 'text-orange-400' },
    { label: 'Horas extra',   value: `${kpis.total_overtime_h}h`, icon: Zap, color: 'text-purple-400' },
  ];

  const empQ = empSearch.toLowerCase();
  const filteredWithSearch = filtered.filter(r => !empQ || r.employee_name.toLowerCase().includes(empQ));
  const absenceReportFiltered = absenceReport.filter(r => !empQ || r.employee_name.toLowerCase().includes(empQ));

  const handleExportPDF = () => {
    reportUtils.exportToPDF(
      `Reporte de Ausentismo ${dateRange.start} al ${dateRange.end}`,
      absenceReportFiltered.map(r => ({
        Colaborador: r.employee_name,
        'Días Reg.': r.total_days,
        Presentes: r.present,
        Faltas: r.absences,
        Retardos: r.late_count,
        'Sin C/O': r.missing_checkouts,
        '% Asist.': `${r.attendance_pct}%`,
      })),
      `ausentismo_${dateRange.start}`,
      'CAPITAL HUMANO'
    );
  };

  return (
    <>
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden -m-8">
      {/* Header — Industrial Style */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Timer className="text-blue-500" size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              CONTROL DE <span className="text-blue-500">ASISTENCIA</span>
            </h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{`Gestión de Personal · NOM-STPS · ${config.brandName}`}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Tabs de vista */}
          <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
            <button onClick={() => setViewMode('anomalias')} className={clsx('px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1', viewMode === 'anomalias' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white')}>
              <Zap size={10} /> Anomalías
            </button>
            <button onClick={() => setViewMode('ausentismo')} className={clsx('px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1', viewMode === 'ausentismo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white')}>
              <TrendingDown size={10} /> Ausentismo
            </button>
          </div>
          <button onClick={fetchRecords} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95">
            <RefreshCw size={12} className={clsx(syncing && 'animate-spin')} /> ACTUALIZAR
          </button>
          <button onClick={generateInsight} disabled={aiLoading} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />} ANÁLISIS IA
          </button>
          <button onClick={() => setShowScanner(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
            <Scan size={12} /> MODO ESCÁNER
          </button>
        </div>
      </div>

      {/* Panel de Fichaje Personal */}
      {employee && (
        <div className={clsx(
          "px-4 py-3 border-b border-white/5 shrink-0 flex items-center justify-between gap-4",
          todayRecord?.check_out ? "bg-emerald-950/20" : todayRecord?.check_in ? "bg-blue-950/20" : "bg-slate-900/30"
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black",
              todayRecord?.check_out ? "bg-emerald-500/20 text-emerald-400" : todayRecord?.check_in ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"
            )}>
              {employee.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-wide">{employee.full_name}</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                {format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {todayRecord?.check_in && (
              <div className="text-center">
                <p className="text-[7px] text-slate-600 font-black uppercase tracking-widest">Entrada</p>
                <p className="text-[11px] font-mono font-black text-blue-400">
                  {new Date(todayRecord.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </div>
            )}
            {todayRecord?.check_out && (
              <div className="text-center">
                <p className="text-[7px] text-slate-600 font-black uppercase tracking-widest">Salida</p>
                <p className="text-[11px] font-mono font-black text-emerald-400">
                  {new Date(todayRecord.check_out).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </div>
            )}
            {todayRecord?.minutes_worked && (
              <div className="text-center">
                <p className="text-[7px] text-slate-600 font-black uppercase tracking-widest">Trabajado</p>
                <p className="text-[11px] font-mono font-black text-slate-300">
                  {Math.floor(todayRecord.minutes_worked / 60)}h {todayRecord.minutes_worked % 60}m
                </p>
              </div>
            )}

            {!todayRecord?.check_in && (
              <button
                onClick={handleCheckIn}
                disabled={punchLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
              >
                {punchLoading ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
                CHECK IN
              </button>
            )}
            {todayRecord?.check_in && !todayRecord?.check_out && (
              <button
                onClick={handleCheckOut}
                disabled={punchLoading}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-50"
              >
                {punchLoading ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                CHECK OUT
              </button>
            )}
            {todayRecord?.check_out && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCheck size={12} className="text-emerald-400" />
                <span className="text-[9px] font-black text-emerald-400 uppercase">Jornada Completa</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Date range + search + export bar */}
      <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Desde</span>
          <input type="date" value={dateRange.start}
            onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white outline-none focus:border-blue-500/40" />
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Hasta</span>
          <input type="date" value={dateRange.end}
            onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white outline-none focus:border-blue-500/40" />
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={11} />
          <input type="text" placeholder="BUSCAR COLABORADOR..." value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-1 pl-8 pr-3 text-[9px] font-bold text-white outline-none focus:border-blue-500/40" />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Turno</span>
          <select 
            value={selectedShift}
            onChange={e => setSelectedShift(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-[9px] font-bold text-white outline-none focus:border-blue-500/40 appearance-none min-w-[120px]"
          >
            <option value="all">TODOS LOS TURNOS</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {viewMode === 'ausentismo' && (
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <FileDown size={11} /> EXPORTAR PDF
          </button>
        )}
      </div>

      {/* KPI Matrix */}
      <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-900/20 shrink-0">
        {statCards.map((s, i) => (
          <div key={i} className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 group hover:bg-white/[0.04] transition-all">
            <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shrink-0 bg-slate-900", s.color)}>
              <s.icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
              <p className={clsx("text-xl font-black tracking-tighter leading-none", s.color)}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar — solo en modo anomalías */}
      {viewMode === 'anomalias' && (
        <div className="px-4 py-2 border-b border-white/5 bg-slate-900/10 flex items-center justify-between shrink-0">
          <h3 className="font-black text-[10px] uppercase tracking-wider text-white">Anomalías: {filteredWithSearch.length}</h3>
          <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
            {([
              { id: 'all', label: 'Todas' },
              { id: 'late', label: 'Retardos' },
              { id: 'absent', label: 'Ausencias' },
              { id: 'missing_checkout', label: 'Sin Check-out' },
              { id: 'overtime', label: 'Extras' }
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)} className={clsx('px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all', filter === tab.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white')}>{tab.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Encabezado ausentismo */}
      {viewMode === 'ausentismo' && (
        <div className="px-4 py-2 border-b border-white/5 bg-rose-950/10 flex items-center gap-3 shrink-0">
          <TrendingDown size={12} className="text-rose-400" />
          <h3 className="font-black text-[10px] uppercase tracking-wider text-white">
            Reporte de Ausentismo — <span className="text-rose-400">{absenceReport.length} colaboradores</span>
          </h3>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{dateRange.start} → {dateRange.end}</span>
        </div>
      )}

      {/* Tabla principal */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/40">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin" /></div>
        ) : viewMode === 'anomalias' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-4 py-2">Colaborador</th>
                <th className="px-4 py-2 text-center">Fecha</th>
                <th className="px-4 py-2 text-center">Check-In</th>
                <th className="px-4 py-2 text-center">Check-Out</th>
                <th className="px-4 py-2 text-center">Extras</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Foco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredWithSearch.map((rec, idx) => {
                const st = STATUS_CFG[rec.status] ?? STATUS_CFG.present;
                return (
                  <tr key={rec.id || `rec-${idx}`} className="hover:bg-blue-500/5 transition-all group">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          { (employeesMap[rec.employee_id]?.photo_url || employeesNumMap[rec.employee_id]?.photo_url) ? (
                            <img 
                              src={employeesMap[rec.employee_id]?.photo_url || employeesNumMap[rec.employee_id]?.photo_url} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <User size={14} className="text-slate-700" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-black text-white uppercase group-hover:text-blue-400 transition-colors">
                              {rec.employee_name}
                            </p>
                            { (employeesMap[rec.employee_id]?.job_title?.toUpperCase().includes('LIDER') || 
                               employeesMap[rec.employee_id]?.job_title?.toUpperCase().includes('JEFE') ||
                               employeesMap[rec.employee_id]?.job_title?.toUpperCase().includes('GERENTE') ||
                               employeesMap[rec.employee_id]?.job_title?.toUpperCase().includes('PM')) && (
                              <span className="px-1 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[6px] font-black uppercase rounded tracking-tighter">CRÍTICO</span>
                            )}
                          </div>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                            {(employeesMap[rec.employee_id]?.job_title || employeesNumMap[rec.employee_id]?.job_title) || 'Puesto no definido'}
                            {employeesMap[rec.employee_id]?.shift_id && (
                              <span className="text-blue-500/60 ml-1.5">
                                • {shifts.find(s => s.id === employeesMap[rec.employee_id]?.shift_id)?.name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-center text-[10px] text-slate-400 font-bold">{format(parseISO(rec.date), 'EEE dd MMM', { locale: es })}</td>
                    <td className="px-4 py-1.5 text-center text-[11px] font-mono font-black">{fmtTime(rec.check_in)}</td>
                    <td className="px-4 py-1.5 text-center text-[11px] font-mono font-black">{fmtTime(rec.check_out)}</td>
                    <td className="px-4 py-1.5 text-center font-mono font-black text-[11px] text-emerald-500">{rec.overtime_minutes > 0 ? `+${fmtMin(rec.overtime_minutes)}` : '—'}</td>
                    <td className="px-4 py-1.5 text-center">
                      <span className={clsx('px-2 py-0.5 rounded-lg border text-[7px] font-black uppercase', st.cls)}>{st.label}</span>
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <div className="flex justify-end gap-2">
                        {rec.is_late && <Clock size={12} className="text-amber-400" />}
                        {rec.missing_checkout && <LogOut size={12} className="text-orange-400" />}
                        {rec.excessive_overtime && <Zap size={12} className="text-red-400" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* ── Reporte de Ausentismo ── */
          absenceReportFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <Users size={32} className="mb-3 opacity-30" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sin registros en el período</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-white/10 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-2">Colaborador ({absenceReportFiltered.length})</th>
                  <th className="px-4 py-2 text-center">Días Registrados</th>
                  <th className="px-4 py-2 text-center">Presentes</th>
                  <th className="px-4 py-2 text-center">Faltas</th>
                  <th className="px-4 py-2 text-center">Retardos</th>
                  <th className="px-4 py-2 text-center">Sin Check-out</th>
                  <th className="px-4 py-2 text-center">% Asistencia</th>
                  <th className="px-4 py-2 text-center">Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {absenceReportFiltered.map((row, idx) => (
                  <tr key={idx} className={clsx('hover:bg-rose-500/5 transition-all', row.attendance_pct < 80 && 'bg-rose-950/10')}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className={clsx('w-8 h-8 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 transition-colors',
                          row.attendance_pct >= 95 ? 'bg-emerald-500/10 border-emerald-500/20' :
                          row.attendance_pct >= 80 ? 'bg-amber-500/10 border-amber-500/20' :
                          'bg-rose-500/10 border-rose-500/20'
                        )}>
                          { (employeesMap[row.employee_id]?.photo_url) ? (
                            <img 
                              src={employeesMap[row.employee_id]?.photo_url} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span className={clsx('text-[10px] font-black',
                              row.attendance_pct >= 95 ? 'text-emerald-400' :
                              row.attendance_pct >= 80 ? 'text-amber-400' :
                              'text-rose-400'
                            )}>
                              {row.employee_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-black text-white uppercase">{row.employee_name}</p>
                            { (employeesMap[row.employee_id]?.job_title?.toUpperCase().includes('LIDER') || 
                               employeesMap[row.employee_id]?.job_title?.toUpperCase().includes('JEFE') ||
                               employeesMap[row.employee_id]?.job_title?.toUpperCase().includes('GERENTE') ||
                               employeesMap[row.employee_id]?.job_title?.toUpperCase().includes('PM')) && (
                              <span className="px-1 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[6px] font-black uppercase rounded tracking-tighter">CRÍTICO</span>
                            )}
                          </div>
                          <p className="text-[8px] font-black text-slate-500 uppercase">
                            {employeesMap[row.employee_id]?.job_title || 'Colaborador'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-[11px] font-mono font-black text-slate-400">{row.total_days}</td>
                    <td className="px-4 py-2 text-center text-[11px] font-mono font-black text-emerald-400">{row.present}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={clsx('text-[11px] font-black', row.absences > 0 ? 'text-rose-400' : 'text-slate-600')}>
                        {row.absences}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={clsx('text-[11px] font-black', row.late_count > 0 ? 'text-amber-400' : 'text-slate-600')}>
                        {row.late_count}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={clsx('text-[11px] font-black', row.missing_checkouts > 0 ? 'text-orange-400' : 'text-slate-600')}>
                        {row.missing_checkouts}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full transition-all',
                            row.attendance_pct >= 95 ? 'bg-emerald-500' :
                            row.attendance_pct >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                          )} style={{ width: `${row.attendance_pct}%` }} />
                        </div>
                        <span className={clsx('text-[10px] font-black',
                          row.attendance_pct >= 95 ? 'text-emerald-400' :
                          row.attendance_pct >= 80 ? 'text-amber-400' : 'text-rose-400'
                        )}>{row.attendance_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {row.attendance_pct < 80 && <AlertTriangle size={12} className="text-rose-400 mx-auto animate-pulse" />}
                      {row.attendance_pct >= 80 && row.attendance_pct < 95 && <AlertTriangle size={12} className="text-amber-400 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>

    {showScanner && <ScannerStation onClose={() => { setShowScanner(false); fetchRecords(); }} />}
    </>
  );
};

export default AttendanceView;
