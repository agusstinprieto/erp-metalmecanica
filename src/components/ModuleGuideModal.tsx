import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, CheckCircle2,
  LayoutDashboard, Bell, Zap, Package, AlertTriangle, TrendingUp,
  Factory, GitBranch, BrainCircuit, Route, FileText, QrCode,
  CalendarDays, ShoppingCart, BarChart3, ClipboardCheck, Shield, ShieldCheck,
  CircleDollarSign, Cpu, Users, Activity, CalendarCheck, Wrench,
  Clock, ShieldAlert, Medal, KanbanSquare,
} from 'lucide-react';
import type { ModuleGuide } from '../data/moduleGuides';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MODULE_GUIDES_EN, DEFAULT_GUIDE_EN } from '../data/moduleGuidesEn';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  LayoutDashboard, Bell, Zap, Package, AlertTriangle, TrendingUp,
  Factory, GitBranch, BrainCircuit, Route, FileText, QrCode,
  CalendarDays, ShoppingCart, BarChart3, ClipboardCheck, Shield, ShieldCheck,
  CircleDollarSign, Cpu, Users, Activity, CalendarCheck, Wrench,
  Clock, ShieldAlert, CheckCircle2, Medal, KanbanSquare,
};

interface ModuleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  guide: ModuleGuide | null;
}

export const ModuleGuideModal: React.FC<ModuleGuideModalProps> = ({ isOpen, onClose, guide }) => {
  const [step, setStep] = useState(0);
  const { isDarkMode } = useConfig();
  const { language } = useLanguage();

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen, guide?.moduleId]);

  if (!isOpen || !guide) return null;

  // Resolve localized guide
  const activeGuide = language === 'en'
    ? (MODULE_GUIDES_EN[guide.moduleId] ?? DEFAULT_GUIDE_EN)
    : guide;

  const current = activeGuide.steps[step] || activeGuide.steps[0];
  const IconComponent = ICON_MAP[current?.icon] ?? Zap;
  const isLast = step === activeGuide.steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="guide-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4 pb-4 bg-black/80 backdrop-blur-lg"
        onClick={onClose}
      >
        <motion.div
          key="guide-card"
          initial={{ scale: 0.88, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden max-h-[calc(100vh-5.5rem)] flex flex-col ${
            isDarkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-slate-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-white/8' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{activeGuide.emoji}</span>
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-mcvill-accent mb-0.5">
                  {language === 'en' ? 'Module Guide' : 'Guía del Módulo'}
                </p>
                <h2 className={`text-[15px] font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {activeGuide.label}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/8 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400'}`}
            >
              <X size={17} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 custom-scrollbar">

          {/* Description */}
          <div className="px-6 pt-4">
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{activeGuide.description}</p>
          </div>

          {/* Step content */}
          <div className="px-6 pt-3 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className={`rounded-xl border p-4 mb-5 ${current.bg}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${current.bg}`}>
                    <IconComponent className={current.color} size={20} />
                  </div>
                  <div>
                    <h3 className={`font-black text-sm leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {current.title}
                    </h3>
                    <p className={`text-[11px] leading-snug mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {current.subtitle}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {current.tips.map((tip, i) => (
                    <li key={i} className={`text-[12px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>

            {/* Step dots */}
            {activeGuide.steps.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mb-5">
                {activeGuide.steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === step ? 'w-6 h-2 bg-mcvill-accent' : `w-2 h-2 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-500' : 'bg-slate-300 hover:bg-slate-400'}`
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 ${
                  isDarkMode
                    ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ChevronLeft size={13} />
                {language === 'en' ? 'Previous' : 'Anterior'}
              </button>

              <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                {step + 1} / {activeGuide.steps.length}
              </span>

              {!isLast ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mcvill-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all"
                >
                  {language === 'en' ? 'Next' : 'Siguiente'}
                  <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
                >
                  {language === 'en' ? 'Got it!' : '¡Entendido!'}
                  <CheckCircle2 size={13} />
                </button>
              )}
            </div>
          </div>

          </div>{/* end scrollable body */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
