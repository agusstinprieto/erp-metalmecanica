import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ShieldCheck, Zap } from 'lucide-react';
import clsx from 'clsx';
import { eventBus } from '../utils/eventBus';

interface ConfirmPayload {
  message: string;
  title: string;
  isAlert?: boolean;
  resolve: (value: boolean) => void;
}

interface PromptPayload {
  message: string;
  title: string;
  defaultValue: string;
  resolve: (value: string | null) => void;
}

export const GlobalDialogs: React.FC = () => {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmPayload | null>(null);
  const [promptDialog, setPromptDialog] = useState<PromptPayload | null>(null);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    const unsubConfirm = eventBus.subscribe('SHOW_CONFIRM', (payload: ConfirmPayload) => {
      setConfirmDialog(payload);
    });
    const unsubPrompt = eventBus.subscribe('SHOW_PROMPT', (payload: PromptPayload) => {
      setPromptDialog(payload);
      setPromptValue(payload.defaultValue || '');
    });
    return () => {
      unsubConfirm();
      unsubPrompt();
    };
  }, []);

  const handleConfirm = (val: boolean) => {
    confirmDialog?.resolve(val);
    setConfirmDialog(null);
  };

  const handlePromptSubmit = () => {
    promptDialog?.resolve(promptValue);
    setPromptDialog(null);
  };

  const handlePromptCancel = () => {
    promptDialog?.resolve(null);
    setPromptDialog(null);
  };

  return (
    <>
      {/* Confirm/Alert Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 lg:left-64 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !confirmDialog.isAlert && handleConfirm(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={clsx(
              "h-1.5 w-full bg-gradient-to-r",
              confirmDialog.isAlert ? "from-mcvill-accent to-blue-600" : "from-rose-700 via-rose-500 to-rose-700"
            )} />
            <div className="p-8">
              <div className="flex items-start gap-5 mb-6">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                  confirmDialog.isAlert ? "bg-mcvill-accent/10 border-mcvill-accent/20 text-mcvill-accent" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                )}>
                  {confirmDialog.isAlert ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white mb-2">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 justify-end">
                {!confirmDialog.isAlert && (
                  <button
                    onClick={() => handleConfirm(false)}
                    className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => handleConfirm(true)}
                  className={clsx(
                    "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all shadow-lg",
                    confirmDialog.isAlert ? "bg-mcvill-accent hover:bg-white hover:text-slate-950" : "bg-rose-600 hover:bg-rose-500"
                  )}
                >
                  {confirmDialog.isAlert ? 'Entendido' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Dialog */}
      {promptDialog && (
        <div className="fixed inset-0 lg:left-64 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={handlePromptCancel} />
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-mcvill-accent via-indigo-500 to-mcvill-accent" />
            <div className="p-10">
              <div className="flex items-start gap-6 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center shrink-0 text-mcvill-accent">
                  <Zap size={28} />
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white mb-2">
                    {promptDialog.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-widest">
                    {promptDialog.message}
                  </p>
                </div>
              </div>
              
              <div className="mb-8">
                <input
                  autoFocus
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePromptSubmit()}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-black italic outline-none focus:border-mcvill-accent transition-all"
                  placeholder="Escribe aquí..."
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={handlePromptCancel}
                  className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePromptSubmit}
                  className="px-10 py-3 bg-mcvill-accent text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-lg shadow-mcvill-accent/20"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
