import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Sun, Moon, LogOut, Zap, Menu, Activity, X, Users as UsersIcon, Settings2, Mic, Mail, Shield, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { supabase } from './lib/supabase';
import { eventBus } from './utils/eventBus';
import { useConfig } from './contexts/ConfigContext';
import { useLanguage, SUPPORTED_LANGUAGES } from './contexts/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { GlobalNotifications } from './components/common/GlobalNotifications';
import { GlobalDialogs } from './components/GlobalDialogs';
import { ERPGuideModal } from './components/ERPGuideModal';
import { ModuleGuideModal } from './components/ModuleGuideModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MODULE_GUIDES, DEFAULT_GUIDE } from './data/moduleGuides';
import { setSentryUser, clearSentryUser } from './lib/sentry';

// Lazy-loaded view components — split into separate chunks to reduce initial bundle
const lz = <T extends object>(fn: () => Promise<{ [k: string]: T }>, key: string) =>
  lazy(() => fn().then(m => ({ default: (m as any)[key] as React.ComponentType<any> })));

const Dashboard              = lz(() => import('./components/Dashboard'),              'Dashboard');
const McVillChat             = lz(() => import('./components/McVillChat'),             'McVillChat');
const AIChatBubble           = lz(() => import('./components/AIChatBubble'),           'AIChatBubble');
const LiveVoiceModalERP      = lz(() => import('./components/LiveVoiceModalERP'),      'LiveVoiceModalERP');
const InventoryView          = lz(() => import('./components/InventoryView'),          'InventoryView');
const PayrollView            = lz(() => import('./components/PayrollView'),            'PayrollView');
const RHView                 = lz(() => import('./components/RHView'),                 'RHView');
const CostingView            = lz(() => import('./components/CostingView'),            'CostingView');
const EngineeringView        = lz(() => import('./components/EngineeringView'),        'EngineeringView');
const ProductionView         = lz(() => import('./components/ProductionView'),         'ProductionView');
const QualityView            = lz(() => import('./components/QualityView'),            'QualityView');
const FinanceView            = lz(() => import('./components/FinanceView'),            'FinanceView');
const SettingsView           = lz(() => import('./components/SettingsView'),           'SettingsView');
const HSEView                = lz(() => import('./components/HSEView'),                'HSEView');
const MantenimientoPanel     = lz(() => import('./components/MantenimientoPanel'),     'MantenimientoPanel');
const VentasPanel            = lz(() => import('./components/VentasPanel'),            'VentasPanel');
const ComprasPanel           = lz(() => import('./components/ComprasPanel'),           'ComprasPanel');
const HelpView               = lz(() => import('./components/HelpView'),               'HelpView');
const ReportsView            = lz(() => import('./components/ReportsView'),            'ReportsView');
const AttendanceView         = lz(() => import('./components/AttendanceView'),         'AttendanceView');
const ViajeroProduccionView  = lz(() => import('./components/ViajeroProduccionView'),  'ViajeroProduccionView');
const ViajeroAdminPanel      = lz(() => import('./components/ViajeroAdminPanel'),      'ViajeroAdminPanel');
const ViajeroProduccionDetailView = lz(() => import('./components/ViajeroProduccionDetailView'), 'ViajeroProduccionDetailView');
const CosteoDashboard        = lz(() => import('./components/CosteoDashboard'),        'CosteoDashboard');
const TrazabilidadView       = lz(() => import('./components/TrazabilidadView'),       'TrazabilidadView');
const MinutasView            = lz(() => import('./components/MinutasView'),            'MinutasView');
const AgenteCotizacionesView = lz(() => import('./components/AgenteCotizacionesView'),'AgenteCotizacionesView');
const CotizacionesKanbanView = lz(() => import('./components/CotizacionesKanbanView'),'CotizacionesKanbanView');
const FactibilidadIAView     = lz(() => import('./components/FactibilidadIAView'),     'FactibilidadIAView');
const WorkInstructionsView   = lz(() => import('./components/WorkInstructionsView'),   'WorkInstructionsView');
const SPCView                = lz(() => import('./components/SPCView'),                'SPCView');
const DesempenoView          = lz(() => import('./components/DesempenoView'),          'DesempenoView');
const PlanningView           = lz(() => import('./components/PlanningView'),           'PlanningView');
const DefectLibraryView      = lz(() => import('./components/DefectLibraryView'),      'DefectLibraryView');
const PPAPView               = lz(() => import('./components/PPAPView'),               'PPAPView');
const VOCDashboardView       = lz(() => import('./components/VOCDashboardView'),       'VOCDashboardView');
const LayoutDesignView       = lz(() => import('./components/LayoutDesignView'),       'LayoutDesignView');
const ProcessSimulatorView   = lz(() => import('./components/ProcessSimulatorView'),   'ProcessSimulatorView');
const NestingView            = lz(() => import('./components/NestingView'),            'NestingView');
const MetalQuoterView        = lz(() => import('./components/MetalQuoterView'),        'MetalQuoterView');
const RecruitmentView        = lz(() => import('./components/RecruitmentView'),        'RecruitmentView');
const VisualIAInspection     = lz(() => import('./components/VisualIAInspection'),     'VisualIAInspection');
const ShopFloorTracking      = lz(() => import('./components/ShopFloorTracking'),      'ShopFloorTracking');
const BancoView               = lz(() => import('./components/BancoView'),               'BancoView');
const SeguridadIndustrialView = lz(() => import('./components/SeguridadIndustrialView'), 'SeguridadIndustrialView');
const EnergyMonitorView      = lz(() => import('./components/EnergyMonitorView'),      'EnergyMonitorView');
const PreventiveMaintenanceIAView = lz(() => import('./components/PreventiveMaintenanceIAView'), 'PreventiveMaintenanceIAView');
const CeoMobileSim = lz(() => import('./components/CeoMobileSim'), 'CeoMobileSim');
const PortadaView = lz(() => import('./components/PortadaView'), 'PortadaView');
const DeliveryTrackerView = lz(() => import('./components/DeliveryTrackerView'), 'DeliveryTrackerView');
const LeadTimePredictorView = lz(() => import('./components/LeadTimePredictorView'), 'LeadTimePredictorView');
const BrandingStudioView = lz(() => import('./components/BrandingStudioView'), 'BrandingStudioView');

type UserRole = 'ceo' | 'gerencia' | 'sistemas' | 'empleado' | 'rh' | 'finanzas' | 'contabilidad' | 'supervisor' | 'ingenieria' | 'calidad' | 'operaciones' | 'ventas' | 'compras' | 'almacen' | 'auditoria' | 'soporte' | 'marketing' | 'seguridad';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [activeView, setActiveView] = useState('portada');
  const [userRole, setUserRole] = useState<UserRole>('empleado');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [panelType, setPanelType] = useState<'chat' | 'voice'>('chat');
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isModuleGuideOpen, setIsModuleGuideOpen] = useState(false);
  const [selectedViajeroId, setSelectedViajeroId] = useState<string | null>(null);

  const handleAnalyzeRFQ = useCallback((rfqId: string) => {
    sessionStorage.setItem('mcvill_fact_rfq_id', rfqId);
    setActiveView('factibilidad_ia');
  }, []);
  const [isTVMode, setIsTVMode] = useState(false);
  const { config, isDarkMode, toggleTheme, setThemeName } = useConfig();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    // Restore session on page load — verify role against profiles table (not just JWT metadata)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        let role = (session.user.user_metadata?.role as UserRole) || 'empleado';
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (profile?.role) role = profile.role as UserRole;
        } catch { /* profiles query failed — fall back to JWT role */ }
        setLoggedIn(true);
        setUserRole(role);
        setUserEmail(session.user.email || '');
        setUserDisplayName(session.user.user_metadata?.full_name || session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || '');
        setSentryUser(session.user.id, role, session.user.user_metadata?.tenant_id);
      }
      setSessionChecked(true);
    });

    // Handle session changes (sign-in via magic link / OAuth, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const role = (session.user.user_metadata?.role as UserRole) || 'empleado';
        setLoggedIn(true);
        setUserRole(role);
        setUserEmail(session.user.email || '');
        setUserDisplayName(session.user.user_metadata?.full_name || session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || '');
        setSentryUser(session.user.id, role, session.user.user_metadata?.tenant_id);
      } else if (event === 'SIGNED_OUT' || !session) {
        setLoggedIn(false);
        setUserRole('empleado');
        setUserEmail('');
        setUserDisplayName('');
        clearSentryUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Update browser title dynamically
  useEffect(() => {
    document.title = `${config.brandName} | ${config.systemName}`;
  }, [config.brandName, config.systemName]);

  // Intercepta CHAT_ASK cuando el panel está cerrado (McVillChat no montado)
  useEffect(() => {
    const unsub = eventBus.subscribe('CHAT_ASK', (payload: { prompt: string }) => {
      setIsChatOpen(true);
      setPanelType('chat');
      setPendingChatPrompt(payload.prompt);
    });
    return unsub;
  }, []);

  const handleLogin = (role: any) => {
    setUserRole(role as UserRole);
    setLoggedIn(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSentryUser(user.id, role, user.user_metadata?.tenant_id);
        setUserEmail(user.email || '');
        setUserDisplayName(user.user_metadata?.full_name || user.user_metadata?.nombre || user.email?.split('@')[0] || '');
      }
    });
  };

  const handleLogout = async () => {
    clearSentryUser();
    await supabase.auth.signOut();
    localStorage.removeItem('mcvill_chat_history');
    window.location.href = '/';
  };

  if (!sessionChecked) {
    return (
      <div className="fixed inset-0 bg-mcvill-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
    <div className={`w-full h-screen overflow-hidden font-sans flex selection:bg-mcvill-accent/30 ${isDarkMode ? '' : 'light'} bg-mcvill-bg text-mcvill-text`}>
      <GlobalNotifications />
      <GlobalDialogs />

      {/* Overlay mobile — toca fuera para cerrar sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {!isTVMode && (
        <Sidebar
          activeView={activeView}
          setView={(view) => { 
            if (view === 'viajeros') setSelectedViajeroId(null);
            setActiveView(view); 
            setIsMobileSidebarOpen(false); 
          }}
          userRole={userRole}
          onLogout={handleLogout}
          isChatOpen={isChatOpen}
          panelType={panelType}
          onToggleChat={() => {
            if (isChatOpen && panelType === 'chat') {
              setIsChatOpen(false);
            } else {
              setIsChatOpen(true);
              setPanelType('chat');
            }
          }}
          onOpenVoice={() => {
            if (isChatOpen && panelType === 'voice') {
              setIsChatOpen(false);
            } else {
              setIsChatOpen(true);
              setPanelType('voice');
            }
          }}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      )}
      
      <main className={clsx(
        "flex-1 flex flex-col min-w-0 relative bg-mcvill-bg",
        isChatMaximized && "hidden"
      )}>
        <div className="absolute inset-0 scanline opacity-5 pointer-events-none z-0" />
        <div className="absolute inset-0 architect-grid opacity-[0.03] pointer-events-none z-0" />
        
        {/* Top Navigation Bar */}
        {!isTVMode && (
          <header className={clsx(
            "h-16 shrink-0 border-b flex items-center justify-between px-4 lg:px-8 z-50 relative transition-colors duration-500",
            isDarkMode ? "bg-mcvill-bg border-mcvill-card-border/30" : "bg-white border-blue-100"
          )}>
            <div className="flex items-center gap-3 lg:gap-8 flex-1 min-w-0">
              {/* Hamburger — solo mobile */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className={clsx(
                  "lg:hidden shrink-0 p-2 rounded-xl border transition-all",
                  isDarkMode
                    ? "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                )}
              >
                <Menu size={20} />
              </button>

              {/* Module Guide Button */}
              <button
                onClick={() => setIsModuleGuideOpen(true)}
                title={`Guía: ${MODULE_GUIDES[activeView]?.label ?? `ERP ${config.brandName}`}`}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                  isDarkMode
                    ? "border-mcvill-accent/30 bg-mcvill-accent/5 text-mcvill-accent hover:bg-mcvill-accent/15"
                    : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                )}
              >
                <span className="text-sm leading-none">{MODULE_GUIDES[activeView]?.emoji ?? '⚡'}</span>
                <span className="hidden sm:inline">{t('topbar.guide', 'Guía')}</span>
              </button>

              {/* Manual Link */}
              <a
                href={language === 'en' ? '/manual-en.html' : '/manual.html'}
                target="_blank"
                rel="noopener noreferrer"
                title={t('topbar.manual', 'Manual')}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                  isDarkMode
                    ? "border-white/10 bg-white/5 text-slate-400 hover:text-mcvill-accent hover:border-mcvill-accent/30"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:text-blue-600 hover:border-blue-200"
                )}
              >
                <span className="text-sm leading-none">📖</span>
                <span className="hidden lg:inline">{t('topbar.manual', 'Manual')}</span>
              </a>
            </div>

            <div className="flex items-center gap-3 lg:gap-10 shrink-0">
              <div className="hidden xl:flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <p className={clsx(
                    "text-[11px] font-black tracking-tight uppercase",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}>{t('topbar.master_control', 'Control Maestro')}</p>
                </div>
                <p className="text-[8px] font-black text-mcvill-accent uppercase tracking-[0.4em]">{t('topbar.orchestrator', 'Orquestador Raíz')}</p>
              </div>
              
              <div className={clsx(
                "flex items-center gap-2 lg:gap-4 lg:pl-8 lg:border-l",
                isDarkMode ? "border-mcvill-card-border/30" : "border-slate-200"
              )}>
                {/* Language Selector */}
                <div className="relative hidden sm:block">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className={clsx(
                      "appearance-none pl-3 pr-8 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-mcvill-accent",
                      isDarkMode
                        ? "bg-slate-950 border-white/10 text-slate-300 hover:border-mcvill-accent/40"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                    )}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code} className={isDarkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900"}>
                        {lang.flag} {lang.code.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown size={10} className={isDarkMode ? "text-slate-400" : "text-slate-500"} />
                  </div>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={clsx(
                    "p-2 rounded-2xl transition-all duration-300 border",
                    isDarkMode
                      ? "border-white/5 bg-slate-900/50 text-amber-400 hover:border-amber-400/30"
                      : "border-slate-200 bg-slate-50 text-blue-500 hover:border-blue-300"
                  )}
                  title={isDarkMode ? t('topbar.light_mode', 'Cambiar a modo claro') : t('topbar.dark_mode', 'Cambiar a modo oscuro')}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Theme Color Selector */}
                <div className={clsx("hidden sm:flex items-center gap-1 p-1.5 rounded-2xl border", isDarkMode ? "border-white/5 bg-slate-900/50" : "border-slate-200 bg-slate-50")}>
                  {([
                    { id: 'blue',    color: '#4FA5FF', label: 'Azul Industrial' },
                    { id: 'slate',   color: '#94A3B8', label: 'Slate Neutro' },
                    { id: 'emerald', color: '#34D399', label: 'Esmeralda' },
                    { id: 'carbon',  color: '#FF6B00', label: 'Carbon' },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setThemeName(t.id)}
                      title={t.label}
                      className="w-4 h-4 rounded-full transition-all duration-200 hover:scale-125"
                      style={{
                        backgroundColor: t.color,
                        outline: (config.themeName ?? 'blue') === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>

                {/* User Profile Dropdown */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setIsProfileOpen(v => !v)}
                    className={clsx(
                      "flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl border transition-all duration-300",
                      isDarkMode
                        ? "bg-slate-900/60 border-white/10 hover:border-mcvill-accent/40"
                        : "bg-white border-slate-200 hover:border-blue-300 shadow-sm"
                    )}
                  >
                    {/* Avatar circle */}
                    <div className="relative w-7 h-7 rounded-xl flex items-center justify-center bg-mcvill-accent/20 border border-mcvill-accent/40 shrink-0">
                      <span className="text-[11px] font-black text-mcvill-accent uppercase">
                        {(userDisplayName || userRole)?.charAt(0) || 'U'}
                      </span>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-mcvill-bg" />
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
                      <span className={clsx("text-[10px] font-black uppercase tracking-wide", isDarkMode ? "text-mcvill-text" : "text-slate-800")}>
                        {userDisplayName || userRole}
                      </span>
                      <span className="text-[8px] text-mcvill-text-muted uppercase tracking-widest font-bold">{userRole}</span>
                    </div>
                    <ChevronDown size={12} className={clsx("text-mcvill-text-muted transition-transform duration-200", isProfileOpen && "rotate-180")} />
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className={clsx(
                          "absolute top-full right-0 mt-2 w-64 rounded-2xl border shadow-2xl z-[200] overflow-hidden",
                          isDarkMode
                            ? "bg-slate-950 border-white/10"
                            : "bg-white border-slate-200"
                        )}
                      >
                        {/* Profile header */}
                        <div className={clsx("px-4 py-4 border-b", isDarkMode ? "border-white/5 bg-white/[0.02]" : "border-slate-100 bg-slate-50")}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-mcvill-accent/20 border border-mcvill-accent/40 flex items-center justify-center shrink-0">
                              <span className="text-base font-black text-mcvill-accent uppercase">
                                {(userDisplayName || userRole)?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className={clsx("text-xs font-black uppercase tracking-wide truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                                {userDisplayName || userRole}
                              </p>
                              <p className="text-[9px] text-mcvill-text-muted truncate flex items-center gap-1 mt-0.5">
                                <Mail size={9} />
                                {userEmail || '—'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Sesión activa</span>
                            <span className={clsx("ml-auto px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border", isDarkMode ? "border-mcvill-accent/30 bg-mcvill-accent/10 text-mcvill-accent" : "border-blue-200 bg-blue-50 text-blue-600")}>
                              <Shield size={8} className="inline mr-1" />{userRole}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-2 space-y-1">
                          {(['ceo','admin','sistemas'] as string[]).includes(userRole) && (
                            <button
                              onClick={() => { setActiveView('settings'); setIsProfileOpen(false); }}
                              className={clsx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                isDarkMode ? "hover:bg-white/5 text-slate-300 hover:text-white" : "hover:bg-slate-100 text-slate-700"
                              )}
                            >
                              <div className="w-7 h-7 rounded-xl bg-mcvill-accent/10 flex items-center justify-center shrink-0">
                                <Settings2 size={13} className="text-mcvill-accent" />
                              </div>
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-wide">Configuración</p>
                                <p className="text-[8px] text-mcvill-text-muted">Identidad, permisos, integraciones</p>
                              </div>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setIsChatOpen(true);
                              setPanelType('voice');
                              setIsProfileOpen(false);
                            }}
                            className={clsx(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                              isDarkMode ? "hover:bg-white/5 text-slate-300 hover:text-white" : "hover:bg-slate-100 text-slate-700"
                            )}
                          >
                            <div className="w-7 h-7 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                              <Mic size={13} className="text-violet-400" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide">Asistente de Voz</p>
                              <p className="text-[8px] text-mcvill-text-muted">Voice Link — control por voz</p>
                            </div>
                          </button>
                        </div>

                        {/* Logout */}
                        <div className={clsx("p-2 border-t", isDarkMode ? "border-white/5" : "border-slate-100")}>
                          <button
                            onClick={() => { setIsProfileOpen(false); handleLogout(); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 group"
                          >
                            <div className="w-7 h-7 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 group-hover:bg-rose-500/20 transition-all">
                              <LogOut size={13} className="text-rose-500" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wide">Cerrar Sesión</p>
                              <p className="text-[8px] text-rose-500/60">Salir del sistema seguro</p>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Operational Workspace Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10">
          <div key={activeView} className="p-3 sm:p-4 lg:p-8 min-h-full">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-7 h-7 border-2 border-mcvill-accent/20 border-t-mcvill-accent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargando módulo...</p>
            </div>
          }>
            {activeView === 'portada' && <PortadaView setView={setActiveView} userRole={userRole} onToggleChat={() => setIsChatOpen(v => !v)} onOpenVoice={() => { setIsChatOpen(true); setPanelType('voice'); }} />}
            {activeView === 'dashboard' && <Dashboard onNavigateToBanco={() => setActiveView('banco')} />}
            {activeView === 'inventory' && <InventoryView />}
            {activeView === 'payroll' && <PayrollView />}
            {activeView === 'rh' && <RHView />}
            {activeView === 'costing' && <CostingView />}
            {activeView === 'engineering' && <EngineeringView />}
            {activeView === 'trazabilidad' && <TrazabilidadView />}
            {activeView === 'production' && <ProductionView />}
            {activeView === 'viajeros' && (
              selectedViajeroId ? (
                <ViajeroProduccionDetailView 
                  viajeroId={selectedViajeroId} 
                  onBack={() => setSelectedViajeroId(null)} 
                />
              ) : isTVMode ? (
                <ViajeroProduccionView />
              ) : (
                <ViajeroAdminPanel 
                  onSelect={(id) => setSelectedViajeroId(id)} 
                  onToggleTV={() => setIsTVMode(true)}
                />
              )
            )}
            
            {isTVMode && (
              <button 
                onClick={() => setIsTVMode(false)}
                className="fixed bottom-6 right-6 z-[200] p-4 bg-rose-600 text-white rounded-full shadow-2xl hover:bg-rose-500 transition-all border-4 border-slate-950 flex items-center gap-2 font-black text-xs uppercase tracking-widest"
              >
                <X size={20} /> Salir Modo TV
              </button>
            )}
            {activeView === 'quality' && <QualityView />}
            {activeView === 'finance' && <FinanceView />}
            {activeView === 'settings' && <SettingsView userRole={userRole} />}
            {activeView === 'hse' && <HSEView />}
            {activeView === 'maintenance' && <MantenimientoPanel />}
            {activeView === 'ventas' && <VentasPanel />}
            {activeView === 'factibilidad' && <VentasPanel initialTab="factibilidad" />}
            {activeView === 'roi' && <VentasPanel initialTab="cotizaciones" />}
            {activeView === 'compras' && <ComprasPanel />}
            {activeView === 'help' && <HelpView />}
            {activeView === 'reports' && <ReportsView />}
            {activeView === 'attendance' && <AttendanceView />}
            {activeView === 'costeo' && <CosteoDashboard userRole={userRole} />}
            {activeView === 'minutas' && <MinutasView />}
            {activeView === 'agente_cot' && <AgenteCotizacionesView />}
            {activeView === 'rfq_kanban' && <CotizacionesKanbanView onAnalyzeRFQ={handleAnalyzeRFQ} onNavigateToViajeros={() => setActiveView('viajeros')} />}
            {activeView === 'factibilidad_ia' && <FactibilidadIAView />}
            {activeView === 'work_instructions' && <WorkInstructionsView />}
            {activeView === 'spc' && <SPCView />}
            {activeView === 'desempeno' && <DesempenoView />}
            {activeView === 'planeacion' && <PlanningView />}
            {activeView === 'defect_library' && <DefectLibraryView />}
            {activeView === 'ppap' && <PPAPView />}
            {activeView === 'voc' && <VOCDashboardView />}
            {activeView === 'layout_design' && <LayoutDesignView />}
            {activeView === 'process_simulator' && <ProcessSimulatorView />}
            {activeView === 'nesting' && <NestingView />}
            {activeView === 'metal_quoter' && <MetalQuoterView />}
            {activeView === 'recruitment' && <RecruitmentView />}
            {activeView === 'visual_ia' && <VisualIAInspection onClose={() => setActiveView('dashboard')} onComplete={() => setActiveView('quality')} />}
            {activeView === 'shop_floor' && <ShopFloorTracking onBack={() => setActiveView('production')} />}
            {activeView === 'banco' && <BancoView />}
            {activeView === 'seguridad' && <SeguridadIndustrialView />}
            {activeView === 'energy_monitor' && <EnergyMonitorView />}
            {activeView === 'preventive_maintenance_ia' && <PreventiveMaintenanceIAView />}
            {activeView === 'ceo_mobile_sim' && <CeoMobileSim />}
            {activeView === 'logistica' && <DeliveryTrackerView />}
            {activeView === 'lead_time_predictor' && <LeadTimePredictorView />}
            {activeView === 'branding_studio' && <BrandingStudioView />}
          </Suspense>
          </div>
        </div>

        {/* Terminal Style Footer */}
        {!isTVMode && (
          <footer className={clsx(
            "h-14 shrink-0 border-t hidden sm:flex justify-between items-center px-4 lg:px-10 text-[9px] font-black uppercase tracking-[0.4em] transition-colors duration-500",
            isDarkMode ? "bg-mcvill-bg border-mcvill-card-border/30 text-slate-500" : "bg-white border-slate-200 text-slate-400"
          )}>
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <p>© 2026 <span className={isDarkMode ? "text-white" : "text-slate-900"}>{config.brandName} {config.systemName}</span></p>
            </div>
            
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-mcvill-accent animate-pulse" />
                <span className="opacity-40">Latencia: 12ms</span>
              </div>
              <a href={config.developerUrl} target="_blank" rel="noopener noreferrer" className="text-mcvill-accent flex items-center gap-2">
                <Zap size={10} className="fill-mcvill-accent" />
                {config.developerName}
              </a>
            </div>
          </footer>
        )}
        
      </main>

      {/* Manual & Chat IA Panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={clsx(
              "fixed right-0 top-0 bottom-0 z-[70] flex flex-col border-l border-mcvill-accent/30 bg-mcvill-bg/95 backdrop-blur-2xl shadow-2xl",
              isChatMaximized ? "inset-0 w-full" : "w-full sm:w-[400px]"
            )}
          >
            {panelType === 'chat' ? (
              <McVillChat
                isPanel={true}
                onClose={() => setIsChatOpen(false)}
                isMaximized={isChatMaximized}
                onToggleMaximize={() => setIsChatMaximized(!isChatMaximized)}
                autoSendPrompt={pendingChatPrompt}
                onAutoSendConsumed={() => setPendingChatPrompt(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-mcvill-accent/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="text-mcvill-accent" size={20} />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Voice Link Control</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPanelType('chat')}
                      className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-mcvill-accent/30"
                    >
                      Chat
                    </button>
                    <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <LiveVoiceModalERP
                    isOpen={true}
                    onClose={() => setIsChatOpen(false)}
                    isPanel={true}
                    currentModule={activeView}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ERPGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ModuleGuideModal
        isOpen={isModuleGuideOpen}
        onClose={() => setIsModuleGuideOpen(false)}
        guide={MODULE_GUIDES[activeView] ?? DEFAULT_GUIDE}
      />

      <AIChatBubble />
    </div>
    </ErrorBoundary>
  );
}

export default App;
