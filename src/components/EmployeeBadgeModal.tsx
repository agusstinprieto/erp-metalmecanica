import React from 'react';
import { X, Printer, ShieldCheck, User, Building2, Clock, Layers, Hash } from 'lucide-react';
import type { Employee } from '../services/employeeService';
import { useConfig } from '../contexts/ConfigContext';
import Barcode from 'react-barcode';

interface EmployeeBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const TURNO_LABEL: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  nocturno: 'Nocturno',
};

const TURNO_COLOR: Record<string, string> = {
  matutino: '#f59e0b',
  vespertino: '#3b82f6',
  nocturno: '#8b5cf6',
};

function InfoCell({
  icon: Icon,
  label,
  value,
  valueColor,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-slate-50 rounded-lg px-2 py-1.5 flex items-start gap-1.5">
      <Icon size={9} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[7px] text-slate-400 uppercase tracking-wider font-semibold leading-none mb-0.5">{label}</p>
        <p
          className={`text-[9px] font-black truncate leading-none ${mono ? 'font-mono' : ''}`}
          style={{ color: valueColor ?? '#1e293b' }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export const EmployeeBadgeModal: React.FC<EmployeeBadgeModalProps> = ({ isOpen, onClose, employee }) => {
  const { config } = useConfig();

  if (!isOpen || !employee) return null;

  const handlePrint = () => window.print();

  const turno = employee.turno_operador ?? '';
  const turnoLabel = (TURNO_LABEL[turno] ?? turno) || '—';
  const turnoColor = TURNO_COLOR[turno] ?? '#64748b';

  const hireDate = employee.hire_date
    ? new Date(employee.hire_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const statusLabel = {
    active: 'Activo',
    inactive: 'Inactivo',
    vacation: 'Vacaciones',
    medical_leave: 'Incapacidad',
  }[employee.status] ?? employee.status;

  const statusColor = employee.status === 'active' ? '#10b981' : '#f59e0b';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">
              Gafete <span className="text-blue-500">Corporativo</span>
            </h2>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] mt-0.5">
              {config.brandName || 'MCVILL'} · Identidad Digital
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 flex flex-col items-center gap-6 bg-slate-950/20">

          {/* ── BADGE CARD ── */}
          <div
            id="badge-print-area"
            className="w-[280px] rounded-[20px] shadow-2xl overflow-hidden border border-slate-700/40 bg-white print:shadow-none"
          >
            {/* Top brand bar */}
            <div className="bg-slate-900 flex flex-col items-center justify-center pt-7 pb-5 px-4 relative">
              {/* Lanyard hole */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-2 bg-slate-800 rounded-full border border-white/10" />

              {/* Tenant logo from Supabase, fallback to brand text */}
              {config.logo ? (
                <img
                  src={config.logo}
                  alt={config.brandName}
                  className="h-10 object-contain mb-1"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-xl font-black tracking-tighter text-white mb-1">
                  {config.brandName || 'MCVILL'}
                </span>
              )}
              <p className="text-[7px] font-black tracking-[0.4em] text-blue-400 uppercase">
                {config.slogan || 'Control Industrial'}
              </p>
            </div>

            {/* Photo (overlapping) */}
            <div className="flex justify-center -mt-9 mb-3 relative z-10">
              <div className="w-[88px] h-[88px] rounded-2xl bg-slate-100 border-[3px] border-white shadow-lg overflow-hidden flex items-center justify-center">
                {employee.photo_url ? (
                  <img src={employee.photo_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User size={44} className="text-slate-300" />
                )}
              </div>
              <div className="absolute -bottom-1 right-[calc(50%-32px)] w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow">
                <ShieldCheck size={10} className="text-white" />
              </div>
            </div>

            {/* Name + job title */}
            <div className="text-center px-5 mb-3">
              <h3 className="text-[15px] font-black uppercase text-slate-900 leading-tight tracking-tight">
                {employee.first_name} {employee.last_name}
              </h3>
              <span className="inline-block mt-1.5 px-3 py-0.5 bg-blue-50 rounded-full border border-blue-100">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{employee.job_title}</p>
              </span>
            </div>

            {/* Info grid — 2×2 */}
            <div className="mx-3 mb-3 grid grid-cols-2 gap-1.5">
              <InfoCell icon={Building2}  label="Área / Depto"      value={employee.department ?? '—'} />
              <InfoCell icon={Layers}     label="Planta / Célula"   value={employee.celula_operador ?? employee.tipo_empleado ?? '—'} />
              <InfoCell icon={Clock}      label="Turno"             value={turnoLabel} valueColor={turnoColor} />
              <InfoCell icon={Hash}       label="No. Empleado"      value={`#${employee.employee_number}`} mono />
            </div>

            {/* Barcode */}
            <div className="border-t border-slate-100 flex justify-center py-2 px-2 bg-slate-50">
              <div className="scale-[0.72] origin-center">
                <Barcode
                  value={employee.employee_number}
                  width={1.5}
                  height={38}
                  fontSize={10}
                  background="transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 py-2 flex items-center justify-center gap-3 text-[7px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Ingreso: {hireDate}</span>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span style={{ color: statusColor }}>● {statusLabel}</span>
            </div>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="w-full max-w-[280px] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Printer size={15} /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #badge-print-area,
          #badge-print-area * { visibility: visible !important; }
          #badge-print-area {
            position: fixed !important;
            top: 50% !important; left: 50% !important;
            transform: translate(-50%, -50%) !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page { size: 85mm 135mm portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
};
