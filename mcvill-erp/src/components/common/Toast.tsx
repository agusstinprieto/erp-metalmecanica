import React, { useEffect } from 'react';
import { CheckCircle2, Info, AlertOctagon, X } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'info' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const styles = {
    success: 'bg-mcvill-accent/10 border-mcvill-card-border text-mcvill-accent shadow-[0_0_20px_rgba(59,130,246,0.1)]',
    info: 'bg-mcvill-accent/10 border-mcvill-accent/20 text-mcvill-accent shadow-[0_0_20px_rgba(0,128,255,0.1)]',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
  };

  const icons = {
    success: <CheckCircle2 size={18} />,
    info: <Info size={18} />,
    error: <AlertOctagon size={18} />
  };

  return (
    <div className={clsx(
      "fixed bottom-10 right-10 z-[100] flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-xl animate-in slide-in-from-right-10 duration-500",
      styles[type]
    )}>
      <div className="shrink-0">{icons[type]}</div>
      <p className="text-[10px] font-black uppercase tracking-widest">{message}</p>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
};
