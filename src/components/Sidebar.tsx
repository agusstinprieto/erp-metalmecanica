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
  Landmark,
  Search,
  Camera,
  Smartphone,
  Truck,
  Clock,
  Palette,
  ChevronDown,
  Printer,
  IdCard,
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';

interface WorkflowSection {
  id: string;
  label: string;
  icon: any;
  items: { id: string; label: string; icon: any }[];
}

const WORKFLOW_SECTIONS: WorkflowSection[] = [
  {
    id: 'comercial', label: 'Comercial', icon: TrendingUp,
    items: [
      { id: 'metal_quoter',    label: 'Cotizador Metal',  icon: Calculator },
      { id: 'roi',             label: 'Cotizador ROI',    icon: TrendingUp },
      { id: 'factibilidad',    label: 'Factibilidad',     icon: ShieldCheck },
      { id: 'factibilidad_ia', label: 'Factibilidad IA',  icon: BrainCircuit },
      { id: 'agente_cot',       label: 'Agente Cotiz.',      icon: Sparkles },
      { id: 'rfq_kanban',       label: 'Kanban RFQ',         icon: KanbanSquare },
      { id: 'cotizacion_flow',  label: 'Flujo Cotizaciones', icon: FileText },
      { id: 'ventas',           label: 'Ventas',             icon: TrendingUp },
      { id: 'ventas_flow',      label: 'Flujo Ventas',       icon: Route },
      { id: 'compras',          label: 'Compras',            icon: ShoppingCart },
      { id: 'compras_flow',     label: 'Flujo Compras',      icon: Route },
    ],
  },
  {
    id: 'ingenieria', label: 'Ingeniería', icon: Cpu,
    items: [
      { id: 'engineering',       label: 'Proyectos',       icon: Cpu },
      { id: 'work_instructions', label: 'Inst. Trabajo',   icon: ClipboardList },
      { id: 'layout_design',     label: 'Layout Planta',   icon: Layout },
      { id: 'process_simulator', label: 'Simulador',       icon: FlaskConical },
      { id: 'nesting',           label: 'Nesting',         icon: Layers },
      { id: 'ingenieria_flow',   label: 'Flujo Proyectos', icon: Route },
    ],
  },
  {
    id: 'produccion', label: 'Producción', icon: Factory,
    items: [
      { id: 'flujo_procesos',       label: 'Flujo de Proceso',   icon: GitBranch },
      { id: 'ordenes_trabajo',      label: 'Órdenes de Trabajo', icon: ClipboardList },
      { id: 'viajeros',             label: 'Viajeros',           icon: Route },
      { id: 'planeacion',           label: 'Planeación',         icon: CalendarDays },
      { id: 'production',           label: 'Control de Planta',  icon: Factory },
      { id: 'shop_floor',           label: 'Shop Floor',         icon: Scan },
      { id: 'inventory',            label: 'Inventarios',        icon: Package },
      { id: 'logistica',            label: 'Logística',          icon: Truck },
      { id: 'lead_time_predictor',  label: 'Predicciones IA',    icon: Clock },
    ],
  },
  {
    id: 'calidad', label: 'Calidad', icon: ClipboardCheck,
    items: [
      { id: 'quality',        label: 'Calidad',          icon: ClipboardCheck },
      { id: 'visual_ia',      label: 'Inspección IA',    icon: ScanSearch },
      { id: 'spc',            label: 'SPC Alertas',      icon: LineChart },
      { id: 'trazabilidad',   label: 'Trazabilidad',     icon: GitBranch },
      { id: 'ppap',           label: 'PPAP / FAI',       icon: FileCheck2 },
      { id: 'defect_library', label: 'Bib. Defectos',    icon: Library },
      { id: 'voc',            label: 'VOC',              icon: MessageCircle },
      { id: 'hse',            label: 'HSE',              icon: ShieldAlert },
      { id: 'seguridad',      label: 'Seguridad',        icon: Camera },
    ],
  },
  {
    id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench,
    items: [
      { id: 'maintenance',               label: 'Mantenimiento',      icon: Wrench },
      { id: 'preventive_maintenance_ia', label: 'Mantto. Predictivo', icon: Wrench },
      { id: 'energy_monitor',            label: 'Energía IA',         icon: Zap },
    ],
  },
  {
    id: 'capital_humano', label: 'Capital Humano', icon: MembersIcon,
    items: [
      { id: 'rh',          label: 'Empleados',        icon: MembersIcon },
      { id: 'payroll',     label: 'Nómina',           icon: FileText },
      { id: 'attendance',  label: 'Asistencia',       icon: CalendarCheck },
      { id: 'recruitment', label: 'Bolsa de Trabajo', icon: UserSearch },
      { id: 'rh_flow',     label: 'Flujo RH',         icon: Route },
      { id: 'gafetes',     label: 'Imprimir Gafetes', icon: Printer },
      { id: 'desempeno',   label: 'Desempeño',        icon: Medal },
    ],
  },
  {
    id: 'finanzas', label: 'Finanzas', icon: CircleDollarSign,
    items: [
      { id: 'finance',       label: 'Finanzas',    icon: CircleDollarSign },
      { id: 'banco',         label: 'Banco',       icon: Landmark },
      { id: 'costing',       label: 'Costos',      icon: BarChart3 },
      { id: 'costeo',        label: 'Costeo Live', icon: Gauge },
    ],
  },
];

// Map every view id to its parent section id for auto-expand
const VIEW_TO_SECTION: Record<string, string> = {};
WORKFLOW_SECTIONS.forEach(s => s.items.forEach(item => { VIEW_TO_SECTION[item.id] = s.id; }));

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
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Collapsible sections state — persisted in localStorage
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('erp_sidebar_expanded');
      const initial = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
      // Auto-open section of the current active view
      const activeSection = VIEW_TO_SECTION[activeView];
      if (activeSection) initial.add(activeSection);
      return initial;
    } catch { return new Set<string>([VIEW_TO_SECTION[activeView]].filter(Boolean)); }
  });

  React.useEffect(() => {
    const s = VIEW_TO_SECTION[activeView];
    if (s) setExpandedSections(prev => { const n = new Set(prev); n.add(s); return n; });
  }, [activeView]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      localStorage.setItem('erp_sidebar_expanded', JSON.stringify([...n]));
      return n;
    });
  };
  const navigate = (view: string) => { setView(view); onCloseMobile?.(); };
  const { config, isDarkMode } = useConfig();
  const { t } = useLanguage();
  const role = userRole?.toLowerCase() || 'empleado';
  const isGodmode    = role === 'ceo' || role === 'sistemas' || role === 'gerencia';
  const isSuperAdmin = role === 'ceo' || role === 'sistemas';

  const hasAccess = (module: string) => {
    // Dynamic industry vertical module exclusions
    if (isGodmode) return true;
    if (['chat_ia', 'voice_link'].includes(module)) return true;
    const permissions: Record<string, string[]> = {
      empleado:     ['portada', 'dashboard', 'inventory', 'production', 'viajeros', 'quality', 'hse', 'logistica', 'lead_time_predictor', 'branding_studio'],
      supervisor:   ['portada', 'dashboard', 'inventory', 'production', 'viajeros', 'quality', 'hse', 'engineering', 'maintenance', 'logistica', 'lead_time_predictor', 'branding_studio'],
      ingenieria:   ['portada', 'dashboard', 'inventory', 'production', 'viajeros', 'quality', 'hse', 'engineering', 'maintenance', 'work_instructions', 'layout_design', 'process_simulator', 'nesting', 'energy_monitor', 'preventive_maintenance_ia', 'logistica', 'lead_time_predictor', 'branding_studio'],
      calidad:      ['portada', 'dashboard', 'inventory', 'production', 'viajeros', 'quality', 'hse', 'spc', 'visual_ia', 'trazabilidad', 'defect_library', 'ppap', 'voc', 'seguridad', 'preventive_maintenance_ia', 'logistica', 'lead_time_predictor', 'branding_studio'],
      operaciones:  ['portada', 'dashboard', 'inventory', 'production', 'viajeros', 'shop_floor', 'compras', 'compras_flow', 'ventas', 'ventas_flow', 'agente_cot', 'rfq_kanban', 'cotizacion_flow', 'factibilidad', 'factibilidad_ia', 'metal_quoter', 'roi', 'maintenance', 'logistica', 'lead_time_predictor', 'branding_studio', 'whatsapp_center'],
      ventas:       ['portada', 'dashboard', 'ventas', 'ventas_flow', 'agente_cot', 'rfq_kanban', 'cotizacion_flow', 'factibilidad', 'factibilidad_ia', 'metal_quoter', 'roi', 'logistica', 'lead_time_predictor', 'branding_studio', 'whatsapp_center'],
      compras:      ['portada', 'dashboard', 'compras', 'compras_flow', 'inventory', 'logistica', 'lead_time_predictor', 'branding_studio'],
      almacen:      ['portada', 'dashboard', 'inventory', 'viajeros', 'hse', 'logistica', 'lead_time_predictor', 'branding_studio'],
      rh:           ['portada', 'dashboard', 'rh', 'payroll', 'attendance', 'recruitment', 'rh_flow', 'desempeno', 'logistica', 'lead_time_predictor', 'branding_studio', 'whatsapp_center'],
      finanzas:     ['portada', 'dashboard', 'finance', 'banco', 'costing', 'costeo', 'payroll', 'logistica', 'lead_time_predictor', 'branding_studio'],
      contabilidad: ['portada', 'dashboard', 'finance', 'banco', 'costing', 'payroll', 'logistica', 'lead_time_predictor', 'branding_studio'],
      auditoria:    ['portada', 'dashboard', 'reports', 'quality', 'spc', 'trazabilidad', 'logistica', 'lead_time_predictor', 'branding_studio'],
      soporte:      ['portada', 'dashboard', 'voc', 'quality', 'logistica', 'lead_time_predictor', 'branding_studio'],
      marketing:    ['portada', 'dashboard', 'ventas', 'voc', 'logistica', 'lead_time_predictor', 'branding_studio', 'whatsapp_center'],
      seguridad:    ['portada', 'dashboard', 'hse', 'seguridad', 'logistica', 'lead_time_predictor', 'branding_studio'],
    };
    return permissions[role]?.includes(module) ?? false;
  };

  const showQualitySection = isGodmode || ['calidad', 'auditoria', 'soporte', 'seguridad'].includes(role);
  const showCommercialSection = isGodmode || ['operaciones', 'ventas', 'compras', 'marketing'].includes(role);
  const showEngineeringSection = isGodmode || ['ingenieria', 'supervisor'].includes(role);
  const showHRSection = isGodmode || ['rh'].includes(role);
  const showFinanceSection = isGodmode || ['finanzas', 'contabilidad'].includes(role);
  const showSystemSection = isGodmode || ['auditoria'].includes(role);
  const showAdvancedContainer = showQualitySection || showCommercialSection || showEngineeringSection || showHRSection || showFinanceSection || showSystemSection;

  const ALL_NAV_ITEMS: { id: string; label: string; icon: any; godmode?: boolean; superadmin?: boolean; special?: 'chat' | 'voice' }[] = [
    { id: 'portada',           label: 'Portada',         icon: Layout },
    { id: 'dashboard',         label: 'Tablero',         icon: LayoutDashboard },
    { id: 'planeacion',        label: 'Planeación',       icon: CalendarDays },
    { id: 'inventory',         label: 'Inventarios',      icon: Package },
    { id: 'viajeros',          label: 'Viajeros',         icon: Route },
    { id: 'ordenes_trabajo',   label: 'Órdenes de Trabajo', icon: ClipboardList },
    { id: 'production',        label: 'Planta',           icon: Factory },
    { id: 'logistica',         label: 'Logística',        icon: Truck },
    { id: 'lead_time_predictor', label: 'Predicciones IA', icon: Clock },
    { id: 'branding_studio',   label: 'Estudio Branding', icon: Palette },
    { id: 'quality',           label: 'Calidad',          icon: ClipboardCheck },
    { id: 'hse',               label: 'HSE',              icon: ShieldAlert },
    { id: 'maintenance',       label: 'Mantenimiento',    icon: Wrench },
    { id: 'chat_ia',           label: 'Chat IA',          icon: MessageSquare, special: 'chat' },
    { id: 'voice_link',        label: 'Voice Link',       icon: Zap, special: 'voice' },
    { id: 'minutas',           label: 'Minutas IA',       icon: ScrollText },
    { id: 'spc',               label: 'SPC Alertas',      icon: LineChart,       godmode: true },
    { id: 'visual_ia',         label: 'Inspección IA',    icon: ScanSearch,      godmode: true },
    { id: 'trazabilidad',      label: 'Trazabilidad',     icon: GitBranch,       godmode: true },
    { id: 'defect_library',    label: 'Bib. Defectos',    icon: Library,         godmode: true },
    { id: 'ppap',              label: 'PPAP',             icon: FileCheck2,      godmode: true },
    { id: 'voc',               label: 'VOC',              icon: MessageCircle,   godmode: true },
    { id: 'shop_floor',        label: 'Shop Floor',       icon: Scan,            godmode: true },
    { id: 'seguridad',         label: 'Seguridad',        icon: Camera,          godmode: true },
    { id: 'ventas',            label: 'Ventas',           icon: TrendingUp,      godmode: true },
    { id: 'compras',           label: 'Compras',          icon: ShoppingCart,    godmode: true },
    { id: 'compras_flow',      label: 'Flujo Compras',    icon: Route,           godmode: true },
    { id: 'agente_cot',        label: 'Agente Cotiz.',      icon: Sparkles,     godmode: true },
    { id: 'rfq_kanban',        label: 'Kanban RFQ',         icon: KanbanSquare, godmode: true },
    { id: 'cotizacion_flow',   label: 'Flujo Cotizaciones', icon: FileText,     godmode: true },
    { id: 'factibilidad',      label: 'Factibilidad',       icon: ShieldCheck,  godmode: true },
    { id: 'factibilidad_ia',   label: 'Factibilidad IA',  icon: BrainCircuit,    godmode: true },
    { id: 'metal_quoter',      label: 'Cotizador Metal',  icon: Calculator,      godmode: true },
    { id: 'roi',               label: 'Cotizador ROI',    icon: TrendingUp,      godmode: true },
    { id: 'whatsapp_center',   label: 'Hub Mensajería',   icon: MessageCircle,   godmode: true },
    { id: 'engineering',       label: 'Ingeniería',       icon: Cpu,             godmode: true },
    { id: 'work_instructions', label: 'Inst. Trabajo',    icon: ClipboardList,   godmode: true },
    { id: 'layout_design',     label: 'Layout Planta',    icon: Layout,          godmode: true },
    { id: 'process_simulator', label: 'Simulador',        icon: FlaskConical,    godmode: true },
    { id: 'nesting',           label: 'Nesting',          icon: Layers,          godmode: true },
    { id: 'ingenieria_flow',   label: 'Flujo Proyectos',  icon: Route,           godmode: true },
    { id: 'energy_monitor',    label: 'Energía IA',       icon: Zap,             godmode: true },
    { id: 'preventive_maintenance_ia', label: 'Mantto. Predictivo', icon: Wrench, godmode: true },
    { id: 'rh',                label: 'RH',               icon: MembersIcon,     godmode: true },
    { id: 'payroll',           label: 'Nómina',           icon: FileText,        godmode: true },
    { id: 'attendance',        label: 'Asistencia',       icon: CalendarCheck,   godmode: true },
    { id: 'recruitment',       label: 'Reclutamiento',    icon: UserSearch,      godmode: true },
    { id: 'rh_flow',           label: 'Flujo RH',         icon: Route,           godmode: true },
    { id: 'desempeno',         label: 'Desempeño',        icon: Medal,           godmode: true },
    { id: 'finance',           label: 'Finanzas',         icon: CircleDollarSign, godmode: true },
    { id: 'banco',             label: 'Banco',            icon: Landmark,        godmode: true },
    { id: 'costing',           label: 'Costos',           icon: BarChart3,       godmode: true },
    { id: 'costeo',            label: 'Costeo Live',      icon: Gauge,           godmode: true },
    { id: 'reports',           label: 'Reportes',         icon: FileBarChart,    godmode: true },
    { id: 'ceo_mobile_sim',    label: 'CEO Móvil Sim',    icon: Smartphone,      godmode: true },
    { id: 'settings',          label: 'Configuración',    icon: Settings2,       godmode: true, superadmin: true },
  ];

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? ALL_NAV_ITEMS.filter(item => {
        if (item.superadmin && !isSuperAdmin) return false;
        return hasAccess(item.id) && (item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q));
      })
    : [];

  const handleSearchNavigate = (item: typeof ALL_NAV_ITEMS[number]) => {
    setSearchQuery('');
    if (item.special === 'chat') onToggleChat?.();
    else if (item.special === 'voice') onOpenVoice?.();
    else navigate(item.id);
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
            {isSidebarCollapsed && (
              <span className="absolute -top-1 -right-1 px-1 rounded bg-mcvill-accent text-[7px] font-black text-slate-950 uppercase tracking-tighter shadow-[0_0_8px_var(--theme-glow)] z-20">
                V.16
              </span>
            )}
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-mcvill-text tracking-tight leading-none uppercase truncate">
                  ERP IA
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-mcvill-accent text-[7px] font-black text-slate-950 tracking-widest shrink-0 shadow-[0_0_10px_var(--theme-glow)]">
                  V.16
                </span>
              </div>
              <p className="text-xs font-medium text-mcvill-accent tracking-widest uppercase mt-1 truncate">{config.companyName}</p>
            </div>
          )}
        </div>
        
        {isGodmode && !isSidebarCollapsed && (
          <div className="mt-3 px-3 py-1.5 bg-mcvill-accent/10 border border-mcvill-accent/40 text-mcvill-accent text-[10px] font-black tracking-widest rounded-2xl uppercase text-center shadow-sm">
            {t('topbar.total_access', '◆ ACCESO TOTAL')}
          </div>
        )}
      </div>

      {/* Search bar */}
      {!isSidebarCollapsed && (
        <div className="relative mb-3 z-10">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mcvill-text-muted/50 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') setSearchQuery('');
              if (e.key === 'Enter' && searchResults.length > 0) handleSearchNavigate(searchResults[0]);
            }}
            placeholder="Buscar módulo..."
            className="w-full bg-mcvill-bg/80 border border-mcvill-accent/20 rounded-xl pl-8 pr-8 py-2 text-[11px] text-mcvill-text placeholder:text-mcvill-text-muted/40 focus:outline-none focus:border-mcvill-accent/60 focus:bg-mcvill-accent/5 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mcvill-text-muted/40 hover:text-mcvill-text-muted transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto pr-1 custom-scrollbar relative z-10">
        {/* Search results */}
        {searchQuery.trim() && (
          <div className="space-y-1">
            {searchResults.length === 0 ? (
              <p className="text-center text-mcvill-text-muted/40 text-[11px] py-10">Sin resultados</p>
            ) : (
              <>
                <p className="px-3 mb-2 text-[9px] font-black text-mcvill-accent/60 tracking-[0.25em] uppercase flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-mcvill-accent/50" />
                  {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                </p>
                {searchResults.map(item => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeView === item.id}
                    onClick={() => handleSearchNavigate(item)}
                    collapsed={false}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Normal nav (hidden while searching) */}
        {!searchQuery.trim() && (
          <>
            {/* Always visible top items */}
            <SidebarItem icon={Layout} label={t('sidebar.portada','Portada')} active={activeView==='portada'} onClick={()=>navigate('portada')} collapsed={isSidebarCollapsed} />
            <SidebarItem icon={LayoutDashboard} label={t('sidebar.dashboard','Tablero')} active={activeView==='dashboard'} onClick={()=>navigate('dashboard')} collapsed={isSidebarCollapsed} />

            {/* Workflow sections */}
            {WORKFLOW_SECTIONS.map(section => {
              const visibleItems = section.items.filter(item => hasAccess(item.id));
              if (visibleItems.length === 0) return null;
              const isExpanded = expandedSections.has(section.id);
              const SectionIcon = section.icon;
              const hasActive = visibleItems.some(i => i.id === activeView || (i.id === 'gafetes' && activeView === 'rh'));
              return (
                <div key={section.id}>
                  {isSidebarCollapsed ? (
                    <div
                      title={section.label}
                      onClick={() => { setIsSidebarCollapsed(false); toggleSection(section.id); }}
                      className={clsx(
                        'flex justify-center items-center w-7 h-7 rounded-2xl mx-auto my-0.5 cursor-pointer transition-all',
                        hasActive ? 'bg-mcvill-accent/20 text-mcvill-accent' : 'bg-mcvill-bg/50 text-mcvill-text-muted hover:text-mcvill-text hover:bg-mcvill-accent/10'
                      )}
                    >
                      <SectionIcon size={14} />
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200',
                        hasActive ? 'text-mcvill-accent' : 'text-mcvill-text-muted hover:text-mcvill-text'
                      )}
                    >
                      <SectionIcon size={13} className='shrink-0' />
                      <span className='flex-1 text-left text-[10px] font-black uppercase tracking-[0.2em] truncate'>
                        {section.label}
                      </span>
                      <ChevronDown size={12} className={clsx('shrink-0 transition-transform duration-200', isExpanded ? 'rotate-180' : '')} />
                    </button>
                  )}

                  {isExpanded && !isSidebarCollapsed && (
                    <div className='ml-3 pl-2 border-l border-mcvill-accent/15 space-y-0.5 mt-0.5 mb-1'>
                      {visibleItems.map(item => (
                        <SidebarItem
                          key={item.id}
                          icon={item.icon}
                          label={item.label}
                          active={activeView === item.id || (item.id === 'gafetes' && activeView === 'rh')}
                          onClick={() => navigate(item.id === 'gafetes' ? 'rh' : item.id)}
                          collapsed={false}
                        />
                      ))}
                    </div>
                  )}

                  {isSidebarCollapsed && visibleItems.map(item => (
                    <SidebarItem key={item.id} icon={item.icon} label={item.label} active={activeView === item.id} onClick={() => navigate(item.id === 'gafetes' ? 'rh' : item.id)} collapsed={true} />
                  ))}
                </div>
              );
            })}

            {/* Standalone items */}
            <div className='pt-2 border-t border-mcvill-accent/10'>
              {hasAccess('reports') && <SidebarItem icon={FileBarChart} label='Reportes' active={activeView==='reports'} onClick={()=>navigate('reports')} collapsed={isSidebarCollapsed} />}
              {hasAccess('ceo_mobile_sim') && <SidebarItem icon={Smartphone} label='CEO Móvil' active={activeView==='ceo_mobile_sim'} onClick={()=>navigate('ceo_mobile_sim')} collapsed={isSidebarCollapsed} />}
              {hasAccess('branding_studio') && <SidebarItem icon={Palette} label='Estudio Branding' active={activeView==='branding_studio'} onClick={()=>navigate('branding_studio')} collapsed={isSidebarCollapsed} />}
              {hasAccess('whatsapp_center') && <SidebarItem icon={MessageCircle} label='Hub Mensajería' active={activeView==='whatsapp_center'} onClick={()=>navigate('whatsapp_center')} collapsed={isSidebarCollapsed} />}
            </div>

            {/* Inteligencia IA */}
            <div className='pt-2 border-t border-mcvill-accent/30'>
              {!isSidebarCollapsed && (
                <p className='px-3 mb-1 text-[9px] font-black text-slate-500/70 tracking-[0.25em] uppercase flex items-center gap-2'>
                  <span className='w-1 h-1 rounded-full bg-slate-600/50' />
                  {t('section.intelligence','Inteligencia IA')}
                </p>
              )}
              <SidebarItem icon={MessageSquare} label={t('sidebar.chat_ia','Chat IA')} active={isChatOpen && panelType==='chat'} onClick={onToggleChat} collapsed={isSidebarCollapsed} />
              <SidebarItem icon={Zap} label={t('sidebar.voice_link','Voice Link')} active={isChatOpen && panelType==='voice'} onClick={onOpenVoice} collapsed={isSidebarCollapsed} />
              <SidebarItem icon={ScrollText} label={t('sidebar.minutas','Minutas IA')} active={activeView==='minutas'} onClick={()=>navigate('minutas')} collapsed={isSidebarCollapsed} />
              <SidebarItem icon={BookOpen} label={`${t('topbar.manual','Manual')} ${config.systemName}`} active={false} onClick={handleOpenGuideModal} collapsed={isSidebarCollapsed} />
            </div>

            {isSuperAdmin && (
              <div className='pt-2 border-t border-mcvill-accent/10'>
                <SidebarItem icon={Settings2} label='Configuración' active={activeView==='settings'} onClick={()=>navigate('settings')} collapsed={isSidebarCollapsed} />
              </div>
            )}
          </>
        )}
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
                {t('topbar.designed_by', 'Diseñado por')}
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
