import React, { useRef } from 'react';
import { X, Download, Printer, ShieldCheck, Mail, Phone, Cpu, User } from 'lucide-react';
import type { Employee } from '../services/employeeService';
import { useConfig } from '../contexts/ConfigContext';
import clsx from 'clsx';
import Barcode from 'react-barcode';

interface EmployeeBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export const EmployeeBadgeModal: React.FC<EmployeeBadgeModalProps> = ({ isOpen, onClose, employee }) => {
  const { isDarkMode } = useConfig();
  const badgeRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-950/40">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              GENERADOR DE <span className="text-blue-500">GAFETE</span>
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">IDENTIDAD CORPORATIVA MCVILL</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-8 bg-slate-950/20">
          {/* Badge Preview */}
          <div 
            ref={badgeRef}
            className="w-[300px] h-[480px] bg-white rounded-[24px] shadow-2xl relative overflow-hidden flex flex-col items-center text-slate-900 print:shadow-none border-4 border-blue-600/20"
          >
            {/* Header / Brand */}
            <div className="w-full h-[120px] bg-slate-900 flex flex-col items-center justify-center p-4 relative">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent" />
              <div className="flex items-center gap-2 mb-1 relative z-10">
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(37,99,235,0.5)]">
                  <Cpu className="text-white" size={14} />
                </div>
                <span className="text-lg font-black tracking-tighter text-white">MCVILL</span>
              </div>
              <p className="text-[8px] font-black tracking-[0.4em] text-blue-400 relative z-10">CONTROL INDUSTRIAL</p>
              
              {/* Slit Hole */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-800 rounded-full border border-white/5" />
            </div>

            {/* Photo Container */}
            <div className="relative -mt-10 mb-4">
              <div className="w-32 h-32 rounded-3xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                {employee.photo_url ? (
                  <img src={employee.photo_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-300" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg">
                <ShieldCheck size={16} className="text-white" />
              </div>
            </div>

            {/* Name & Title */}
            <div className="text-center px-6 mb-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                {employee.first_name}<br/>{employee.last_name}
              </h3>
              <div className="mt-2 inline-block px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{employee.job_title}</p>
              </div>
            </div>

            {/* Barcode Code */}
            <div className="flex-1 flex flex-col items-center justify-center w-full bg-white px-4 py-4 border-t border-slate-100">
              <div className="scale-75 origin-center">
                <Barcode 
                  value={employee.employee_number} 
                  width={1.5}
                  height={50}
                  fontSize={12}
                  background="transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="w-full py-3 bg-slate-900 flex items-center justify-center gap-4 text-[7px] font-bold text-slate-500 uppercase tracking-widest">
              <span>EXP: {new Date(employee.hire_date).toLocaleDateString()}</span>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span>SANGRE: N/A</span>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <button 
              onClick={handlePrint}
              className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Printer size={16} /> IMPRIMIR GAFETE
            </button>
            <button 
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <Download size={16} /> DESCARGAR PDF
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #badge-print-area, #badge-print-area * {
            visibility: visible;
          }
          #badge-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
