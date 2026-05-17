import React from 'react';
import clsx from 'clsx';
import {
  LayoutDashboard,
  CircleDollarSign,
  ShieldCheck,
  FileText,
  BarChart3,
  ShieldAlert,
  Wrench,
  Zap,
  ChevronRight,
  ChevronLeft,
  Users as MembersIcon,
  Package,
  Gauge,
  BookOpen,
  FileBarChart,
  Settings2,
  Cpu,
  Factory,
  ClipboardCheck,
  MessageSquare,
  Route,
  TrendingUp,
  ShoppingCart,
  CalendarCheck,
  GitBranch,
  ScrollText,
  Sparkles,
  KanbanSquare,
  BrainCircuit,
  ClipboardList,
  LineChart,
  Medal,
  CalendarDays,
  X,
  Library,
  FileCheck2,
  MessageCircle,
  Layout,
  FlaskConical,
  Layers,
  Calculator,
  UserSearch,
  ScanSearch,
  Scan,
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';

interface SidebarSection {
  title: string;
  items: { id: string; label: string; icon: any }[];
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Operaciones',
    items: [
      { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard },
      { id: 'production', label: 'Planta', icon: Factory },
      { id: 'viajeros', label: 'Viajeros', icon: Route },
      { id: 'planeacion', label: 'Planeación', icon: CalendarDays },
      { id: 'inventory', label: 'Inventarios', icon: Package },
    ]
  },
  {
    title: 'Calidad',
    items: [
      { id: 'quality', label: 'Calidad', icon: ClipboardCheck },
      { id: 'hse', label: 'HSE', icon: ShieldAlert },
      { id: 'maintenance', label: 'Mantto.', icon: Wrench },
    ]
  }
];

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick,
  collapsed = false
}: { 
  icon: any, 
  label: string, 
  active?: boolean,
  onClick?: () => void,
  collapsed?: boolean
}) => (
  <div 
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={clsx(
      "flex items-center gap-2.5 px-2 py-2 rounded-2xl cursor-pointer transition-all duration-300 group relative overflow-hidden",
      active 
        ? "bg-gradient-to-r from-mcvill-accent/20 to-mcvill-accent/5 border border-mcvill-accent/30 text-mcvill-text shadow-[0_0_20px_rgba(0,128,255,0.15)]" 
        : "text-mcvill-text-muted hover:bg-mcvill-accent/5 hover:text-mcvill-text border border-transparent hover:border-mcvill-accent/30",
      collapsed && "justify-center px-0"
    )}
  >
    {active && !collapsed && (
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-mcvill-accent to-mcvill-accent/50 rounded-full shadow-[0_0_8px_rgba(0,128,255,0.8)]" />
    )}
    
    <div className={clsx(
      "w-7 h-7 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0",
      active 
        ? "bg-mcvill-bg text-mcvill-accent shadow-[0_0_12px_var(--theme-glow)]" 
        : "bg-mcvill-bg/50 text-mcvill-text-muted group-hover:text-mcvill-text group-hover:bg-mcvill-accent/10"
    )}>
      <Icon size={14} className={clsx(
        "transition-all duration-300",
        active ? "drop-shadow-[0_0_6px_rgba(0,128,255,0.8)]" : "group-hover:scale-110"
      )} />
    </div>

    {!collapsed && (
      <span className={clsx(
        "text-[11px] font-bold tracking-wider transition-all duration-300 flex-1 truncate uppercase",
        active ? "text-mcvill-text" : "text-mcvill-text-muted group-hover:text-mcvill-text"
      )}>
        {label}
      </span>
    )}

    {active && !collapsed && (
      <ChevronRight size={12} className="text-mcvill-accent/70 shrink-0" />
    )}
  </div>
);

export const Sidebar = (props: {
  activeView: string,
  setView: (view: string) => void,
  userRole?: string,
  onLogout?: () => void,
  onToggleChat?: () => void,
  isMobileOpen?: boolean,
  onCloseMobile?: () => void,
  onOpenGuide?: () => void,
  onOpenVoice?: () => void,
  isChatOpen?: boolean,
  panelType?: 'chat' | 'voice',
}) => {
  const {
    activeView,
    setView,
    userRole = 'empleado',
    onToggleChat,
    isMobileOpen = false, 
    onCloseMobile, 
    onOpenGuide: handleOpenGuideModal,
    onOpenVoice,
    isChatOpen = false,
    panelType = 'chat'
  } = props;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const navigate = (view: string) => { setView(view); onCloseMobile?.(); };
  const { config, isDarkMode } = useConfig();
  const role = userRole?.toLowerCase() || 'empleado';
  const isGodmode    = role === 'ceo' || role === 'sistemas' || role === 'gerente';
  const isSuperAdmin = role === 'ceo' || role === 'sistemas'; // acceso a Configuración

  const hasAccess = (module: string) => {
    if (isGodmode) return true;
    const permissions: Record<string, string[]> = {
      empleado:     ['dashboard', 'inventory', 'production', 'viajeros', 'quality', 'hse'],
      supervisor:   ['dashboard', 'inventory', 'production', 'viajeros', 'quality', 'hse', 'engineering', 'maintenance'],
      rh:           ['dashboard', 'rh', 'payroll'],
      finanzas:     ['dashboard', 'finance', 'costing', 'costeo', 'payroll'],
      contabilidad: ['dashboard', 'finance', 'costing', 'costeo', 'payroll'],
    };
    return permissions[role]?.includes(module) ?? false;
  };

  return (
    <div className={clsx(
      "bg-mcvill-bg border-r border-mcvill-accent/30 flex flex-col p-3 overflow-hidden transition-all duration-500",
      "fixed lg:sticky top-0 left-0 h-screen lg:h-full",
      "z-[60]",
      isSidebarCollapsed ? "w-64 lg:w-20" : "w-64",
      isMobileOpen
        ? "translate-x-0 shadow-[4px_0_40px_rgba(0,0,0,0.7)]"
        : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-mcvill-accent/10 to-transparent pointer-events-none" />

      {/* Botón cerrar en mobile */}
      <button
        onClick={onCloseMobile}
        className="lg:hidden absolute top-4 right-3 p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/15 hover:text-rose-400 text-slate-400 border border-white/10 transition-all z-20"
      >
        <X size={15} />
      </button>
      
      {/* LOGO SECTION */}
      <div className={clsx(
        "relative mb-5 p-2 rounded-2xl bg-mcvill-accent/5 border border-mcvill-accent/30 group cursor-pointer hover:border-mcvill-accent/40 transition-all duration-500",
        isSidebarCollapsed && "flex items-center justify-center p-2"
      )}>
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative shrink-0">
            <div className="absolute -inset-3 bg-mcvill-accent/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="relative w-12 h-12 bg-mcvill-bg border border-mcvill-accent/30 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-500 overflow-hidden">
              {config.logo ? (
                <img 
                  src={config.logo} 
                  alt="Logo" 
                  className="w-8 h-8 object-contain relative z-10 drop-shadow-[0_0_10px_var(--theme-glow)]" 
                />
              ) : (
                <span className="text-xl font-black text-mcvill-accent relative z-10">
                  {config.brandName?.charAt(0) || 'M'}
                </span>
              )}
            </div>
          </div>
          
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-base font-bold text-mcvill-text tracking-tight leading-none uppercase truncate">
                {config.systemName}
              </h1>
              <p className="text-xs font-medium text-mcvill-accent tracking-widest uppercase mt-1 truncate">{config.brandName}</p>
            </div>
          )}
        </div>
        
        {isGodmode && !isSidebarCollapsed && (
          <div className="mt-3 px-3 py-1.5 bg-mcvill-accent/10 border border-mcvill-accent/40 text-mcvill-accent text-[10px] font-black tracking-widest rounded-2xl uppercase text-center shadow-sm">
            ◆ ACCESO TOTAL
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto pr-1 custom-scrollbar relative z-10">
        {sidebarSections.map((section) => (
          <div key={section.title} className="space-y-2">
            {!isSidebarCollapsed && (
              <p className="px-3 mb-1 text-[9px] font-black text-mcvill-text-muted/60 tracking-[0.25em] uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-mcvill-accent/50" />
                {section.title}
              </p>
            )}
            
            {section.items.map(item => {
              if (!hasAccess(item.id)) return null;
              return (
                <SidebarItem 
                  key={item.id}
                  icon={item.icon} 
                  label={item.label} 
                  active={activeView === item.id} 
                  onClick={() => navigate(item.id)} 
                  collapsed={isSidebarCollapsed}
                />
              );
            })}
          </div>
        ))}
        
        {isGodmode && (
          <div className="space-y-2 pt-3 border-t border-mcvill-accent/30">
            {!isSidebarCollapsed && (
              <p className="px-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                Calidad Avanzada
              </p>
            )}
            <SidebarItem icon={LineChart} label="SPC Alertas" active={activeView === 'spc'} onClick={() => navigate('spc')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={ScanSearch} label="Inspección IA" active={activeView === 'visual_ia'} onClick={() => navigate('visual_ia')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={GitBranch} label="Trazabilidad" active={activeView === 'trazabilidad'} onClick={() => navigate('trazabilidad')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={Library} label="Bib. Defectos" active={activeView === 'defect_library'} onClick={() => navigate('defect_library')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={FileCheck2} label="PPAP" active={activeView === 'ppap'} onClick={() => navigate('ppap')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={MessageCircle} label="VOC" active={activeView === 'voc'} onClick={() => navigate('voc')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={Scan} label="Shop Floor" active={activeView === 'shop_floor'} onClick={() => navigate('shop_floor')} collapsed={isSidebarCollapsed} />

            {!isSidebarCollapsed && (
              <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                Comercial
              </p>
            )}
            <SidebarItem icon={TrendingUp} label="Ventas" active={activeView === 'ventas'} onClick={() => navigate('ventas')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={ShoppingCart} label="Compras" active={activeView === 'compras'} onClick={() => navigate('compras')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={Sparkles} label="Agente Cot." active={activeView === 'agente_cot'} onClick={() => navigate('agente_cot')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={KanbanSquare} label="Kanban RFQ" active={activeView === 'rfq_kanban'} onClick={() => navigate('rfq_kanban')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={ShieldCheck} label="Factibilidad" active={activeView === 'factibilidad'} onClick={() => navigate('factibilidad')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={BrainCircuit} label="Fact. IA" active={activeView === 'factibilidad_ia'} onClick={() => navigate('factibilidad_ia')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={Calculator} label="Cotizador Metal" active={activeView === 'metal_quoter'} onClick={() => navigate('metal_quoter')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={TrendingUp} label="Cotizador ROI" active={activeView === 'roi'} onClick={() => navigate('roi')} collapsed={isSidebarCollapsed} />

            {!isSidebarCollapsed && (
              <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                Ingeniería
              </p>
            )}
            <SidebarItem icon={Cpu} label="Ingeniería" active={activeView === 'engineering'} onClick={() => navigate('engineering')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={ClipboardList} label="Inst. Trabajo" active={activeView === 'work_instructions'} onClick={() => navigate('work_instructions')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={Layout} label="Layout Planta" active={activeView === 'layout_design'} onClick={() => navigate('layout_design')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={FlaskConical} label="Simulador" active={activeView === 'process_simulator'} onClick={() => navigate('process_simulator')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={Layers} label="Nesting" active={activeView === 'nesting'} onClick={() => navigate('nesting')} collapsed={isSidebarCollapsed} />

            {!isSidebarCollapsed && (
              <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                Capital Humano
              </p>
            )}
            <SidebarItem icon={MembersIcon} label="RH" active={activeView === 'rh'} onClick={() => navigate('rh')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={FileText} label="Nómina" active={activeView === 'payroll'} onClick={() => navigate('payroll')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={CalendarCheck} label="Asistencia" active={activeView === 'attendance'} onClick={() => navigate('attendance')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={UserSearch} label="Reclutamiento" active={activeView === 'recruitment'} onClick={() => navigate('recruitment')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={Medal} label="Desempeño" active={activeView === 'desempeno'} onClick={() => navigate('desempeno')} collapsed={isSidebarCollapsed} />

            {!isSidebarCollapsed && (
              <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                Finanzas
              </p>
            )}
            <SidebarItem icon={CircleDollarSign} label="Finanzas" active={activeView === 'finance'} onClick={() => navigate('finance')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={BarChart3} label="Costos" active={activeView === 'costing'} onClick={() => navigate('costing')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={Gauge} label="Costeo Live" active={activeView === 'costeo'} onClick={() => navigate('costeo')} collapsed={isSidebarCollapsed} />

            {!isSidebarCollapsed && (
              <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                Sistema
              </p>
            )}
            <SidebarItem icon={FileBarChart} label="Reportes" active={activeView === 'reports'} onClick={() => navigate('reports')} collapsed={isSidebarCollapsed} />
            {isSuperAdmin && <SidebarItem icon={Settings2} label="CONFIGURACION" active={activeView === 'settings'} onClick={() => navigate('settings')} collapsed={isSidebarCollapsed} />}
            <div
              onClick={() => window.open(config.software_accelerator_url, '_blank')}
              className={clsx(
                "flex items-center gap-2.5 px-2 py-2 rounded-2xl cursor-pointer transition-all duration-300 group text-mcvill-text-muted hover:text-mcvill-text hover:bg-mcvill-accent/5 border border-transparent hover:border-mcvill-accent/20",
                isSidebarCollapsed && "justify-center"
              )}
            >
              <div className="w-7 h-7 rounded-2xl flex items-center justify-center bg-slate-900/50 group-hover:bg-slate-800/80 transition-all">
                <Zap size={14} className="text-mcvill-accent group-hover:text-white" />
              </div>
              {!isSidebarCollapsed && <span className="text-[11px] font-bold tracking-wider uppercase">Acelerador</span>}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-mcvill-accent/30">
          {!isSidebarCollapsed && (
            <p className="px-3 mb-1 text-[9px] font-black text-slate-500/70 tracking-[0.25em] uppercase flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-600/50" />
              Inteligencia
            </p>
          )}
          <SidebarItem
            icon={MessageSquare}
            label="Chat IA"
            active={isChatOpen}
            onClick={onToggleChat}
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem
            icon={Zap}
            label="Voice Link"
            active={isChatOpen && panelType === 'voice'}
            onClick={onOpenVoice}
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem
            icon={ScrollText}
            label="Minutas IA"
            active={activeView === 'minutas'}
            onClick={() => navigate('minutas')}
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem
            icon={BookOpen}
            label={`Manual ${config.systemName}`}
            active={false}
            onClick={handleOpenGuideModal}
            collapsed={isSidebarCollapsed}
          />
        </div>
      </div>

      <div className={clsx(
        "mt-auto p-4 border-t relative z-10 transition-all duration-500",
        isDarkMode ? 'border-mcvill-accent/10 bg-black/10' : 'border-mcvill-accent/10 bg-mcvill-accent/5'
      )}>
        <div className="flex items-center justify-between gap-2">
          {!isSidebarCollapsed ? (
            <div className="flex flex-col items-start gap-0.5">
              <span className={clsx(
                "text-[7px] font-bold tracking-[0.4em] uppercase",
                isDarkMode ? "text-blue-400/40" : "text-blue-500/40"
              )}>
                Diseñado por
              </span>
              <a
                href={config.developerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
              >
                <span className={clsx(
                  "relative text-[10px] font-black tracking-[0.3em] uppercase transition-all duration-500 group-hover:text-mcvill-accent",
                  isDarkMode ? "text-white/80" : "text-slate-900"
                )}>
                  {config.developerName}
                </span>
              </a>
            </div>
          ) : (
             <div className="w-1.5 h-1.5 rounded-full bg-mcvill-accent animate-pulse mx-auto" />
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-2xl border transition-all duration-300",
              isDarkMode 
                ? "bg-slate-900/40 border-white/10 text-mcvill-accent hover:border-mcvill-accent/50 hover:bg-mcvill-accent/10" 
                : "bg-white border-blue-100 text-blue-500 hover:border-blue-300 shadow-sm"
            )}
            title={isSidebarCollapsed ? "Expandir" : "Contraer"}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
