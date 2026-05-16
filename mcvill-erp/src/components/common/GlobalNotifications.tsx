import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, Info, X, Zap } from 'lucide-react';
import { eventBus } from '../../utils/eventBus';
import clsx from 'clsx';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'quality_fail' | 'protocol';
  title: string;
  message: string;
}

export const GlobalNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsub = eventBus.subscribe('SHOW_NOTIFICATION', (notif: Omit<Notification, 'id'>) => {
      const id = Math.random().toString(36).substring(7);
      const newNotif = { ...notif, id };
      setNotifications(prev => [newNotif, ...prev]);

      // Auto remove after 6 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 6000);
    });

    return unsub;
  }, []);

  const removeNotif = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 pointer-events-none">
      {notifications.map((n) => (
        <div 
          key={n.id}
          className={clsx(
            "pointer-events-auto w-80 p-5 rounded-[1.5rem] border backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-10 duration-500 flex gap-4 relative overflow-hidden group",
            n.type === 'quality_fail' ? "bg-rose-950/40 border-rose-500/30 text-rose-500 shadow-rose-500/20" :
            n.type === 'success' ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-500 shadow-emerald-500/20" :
            n.type === 'protocol' ? "bg-blue-950/40 border-mcvill-accent/30 text-mcvill-accent shadow-mcvill-accent/20" :
            "bg-slate-900/60 border-white/10 text-white"
          )}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
          
          <div className="flex-shrink-0">
            {n.type === 'quality_fail' ? (
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center animate-pulse">
                <AlertTriangle size={20} />
              </div>
            ) : n.type === 'success' ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
            ) : n.type === 'protocol' ? (
              <div className="w-10 h-10 rounded-xl bg-mcvill-accent/10 flex items-center justify-center border border-mcvill-accent/20">
                <Zap size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Info size={20} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              {n.title}
            </h4>
            <p className="text-[11px] font-bold opacity-80 leading-tight">
              {n.message}
            </p>
          </div>

          <button 
            onClick={() => removeNotif(n.id)}
            className="text-slate-500 hover:text-white transition-colors p-1"
          >
            <X size={14} />
          </button>

          {/* Progress bar timer */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 w-full animate-shrink-x origin-left" />
        </div>
      ))}
    </div>
  );
};
