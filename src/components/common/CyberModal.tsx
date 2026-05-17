import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, Info, HelpCircle, ShieldAlert } from 'lucide-react';

export type ModalType = 'success' | 'error' | 'info' | 'confirm' | 'warning';

interface CyberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
}

export const CyberModal: React.FC<CyberModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-400" size={28} />;
      case 'error': return <ShieldAlert className="text-red-400" size={28} />;
      case 'warning': return <AlertCircle className="text-amber-400" size={28} />;
      case 'confirm': return <HelpCircle className="text-blue-400" size={28} />;
      default: return <Info className="text-blue-400" size={28} />;
    }
  };

  const getColorClass = () => {
    switch (type) {
      case 'success': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'error': return 'border-red-500/30 bg-red-500/5';
      case 'warning': return 'border-amber-500/30 bg-amber-500/5';
      case 'confirm': return 'border-blue-500/30 bg-blue-500/5';
      default: return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'success': return 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20';
      case 'error': return 'bg-red-600 hover:bg-red-500 shadow-red-900/20';
      case 'warning': return 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20';
      default: return 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 top-16 left-0 md:left-64 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`relative w-full max-w-md border rounded-[2rem] overflow-hidden shadow-2xl ${getColorClass()}`}
          >
            {/* Glossy Header Effect */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            <div className="p-8 relative">
              <div className="flex items-start gap-5">
                <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner`}>
                  {getIcon()}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                {type === 'confirm' && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    else onClose();
                  }}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-lg ${getButtonClass()}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
