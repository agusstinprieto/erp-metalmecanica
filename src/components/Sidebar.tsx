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
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarSection {
  title: string;
  items: { id: string; label: string; icon: any }[];
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Operaciones',
    items: [
      { id: 'portada', label: 'Portada', icon: Layout },
      { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard },
      { id: 'planeacion', label: 'Planeación', icon: CalendarDays },
      { id: 'inventory', label: 'Inventarios', icon: Package },
      { id: 'viajeros', label: 'Viajeros', icon: Route },
      { id: 'production', label: 'Planta', icon: Factory },
      { id: 'logistica', label: 'Logística', icon: Truck },
      { id: 'lead_time_predictor', label: 'Predicciones IA', icon: Clock },
      { id: 'branding_studio', label: 'Estudio Branding', icon: Palette },
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
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);
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
      operaciones:  ['portada', 'dashboard', 'inventory', 'production', 'viajeros', 'shop_floor', 'compras', 'ventas', 'agente_cot', 'rfq_kanban', 'factibilidad', 'factibilidad_ia', 'metal_quoter', 'roi', 'maintenance', 'logistica', 'lead_time_predictor', 'branding_studio'],
      ventas:       ['portada', 'dashboard', 'ventas', 'agente_cot', 'rfq_kanban', 'factibilidad', 'factibilidad_ia', 'metal_quoter', 'roi', 'logistica', 'lead_time_predictor', 'branding_studio'],
      compras:      ['portada', 'dashboard', 'compras', 'inventory', 'logistica', 'lead_time_predictor', 'branding_studio'],
      almacen:      ['portada', 'dashboard', 'inventory', 'viajeros', 'hse', 'logistica', 'lead_time_predictor', 'branding_studio'],
      rh:           ['portada', 'dashboard', 'rh', 'payroll', 'attendance', 'recruitment', 'desempeno', 'logistica', 'lead_time_predictor', 'branding_studio'],
      finanzas:     ['portada', 'dashboard', 'finance', 'banco', 'costing', 'costeo', 'payroll', 'logistica', 'lead_time_predictor', 'branding_studio'],
      contabilidad: ['portada', 'dashboard', 'finance', 'banco', 'costing', 'payroll', 'logistica', 'lead_time_predictor', 'branding_studio'],
      auditoria:    ['portada', 'dashboard', 'reports', 'quality', 'spc', 'trazabilidad', 'logistica', 'lead_time_predictor', 'branding_studio'],
      soporte:      ['portada', 'dashboard', 'voc', 'quality', 'logistica', 'lead_time_predictor', 'branding_studio'],
      marketing:    ['portada', 'dashboard', 'ventas', 'voc', 'logistica', 'lead_time_predictor', 'branding_studio'],
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
    { id: 'agente_cot',        label: 'Agente Cotiz.',    icon: Sparkles,        godmode: true },
    { id: 'rfq_kanban',        label: 'Kanban RFQ',       icon: KanbanSquare,    godmode: true },
    { id: 'factibilidad',      label: 'Factibilidad',     icon: ShieldCheck,     godmode: true },
    { id: 'factibilidad_ia',   label: 'Factibilidad IA',  icon: BrainCircuit,    godmode: true },
    { id: 'metal_quoter',      label: 'Cotizador Metal',  icon: Calculator,      godmode: true },
    { id: 'roi',               label: 'Cotizador ROI',    icon: TrendingUp,      godmode: true },
    { id: 'engineering',       label: 'Ingeniería',       icon: Cpu,             godmode: true },
    { id: 'work_instructions', label: 'Inst. Trabajo',    icon: ClipboardList,   godmode: true },
    { id: 'layout_design',     label: 'Layout Planta',    icon: Layout,          godmode: true },
    { id: 'process_simulator', label: 'Simulador',        icon: FlaskConical,    godmode: true },
    { id: 'nesting',           label: 'Nesting',          icon: Layers,          godmode: true },
    { id: 'energy_monitor',    label: 'Energía IA',       icon: Zap,             godmode: true },
    { id: 'preventive_maintenance_ia', label: 'Mantto. Predictivo', icon: Wrench, godmode: true },
    { id: 'rh',                label: 'RH',               icon: MembersIcon,     godmode: true },
    { id: 'payroll',           label: 'Nómina',           icon: FileText,        godmode: true },
    { id: 'attendance',        label: 'Asistencia',       icon: CalendarCheck,   godmode: true },
    { id: 'recruitment',       label: 'Reclutamiento',    icon: UserSearch,      godmode: true },
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
                V.10
              </span>
            )}
          </div>
          
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-mcvill-text tracking-tight leading-none uppercase truncate">
                  {config.systemName}
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-mcvill-accent text-[7px] font-black text-slate-950 tracking-widest shrink-0 shadow-[0_0_10px_var(--theme-glow)]">
                  V.10
                </span>
              </div>
              <p className="text-xs font-medium text-mcvill-accent tracking-widest uppercase mt-1 truncate">{config.brandName}</p>
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

        {/* Normal sections (hidden while searching) */}
        {!searchQuery.trim() && (
          <>
            {sidebarSections.map((section) => (
              <div key={section.title} className="space-y-2">
                {!isSidebarCollapsed && (
                  <p className="px-3 mb-1 text-[9px] font-black text-mcvill-text-muted/60 tracking-[0.25em] uppercase flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-mcvill-accent/50" />
                    {section.items[0].id === 'dashboard' ? t('section.operations', section.title) : t('section.quality', section.title)}
                  </p>
                )}
                {section.items.map(item => {
                  if (!hasAccess(item.id)) return null;
                  let dynamicLabel = t(`sidebar.${item.id}`, item.label);
                  if (item.id === 'viajeros') {
                    dynamicLabel = 'Viajeros';
                  }
                  return (
                    <SidebarItem
                      key={item.id}
                      icon={item.icon}
                      label={dynamicLabel}
                      active={activeView === item.id}
                      onClick={() => navigate(item.id)}
                      collapsed={isSidebarCollapsed}
                    />
                  );
                })}
              </div>
            ))}

        <div className="pt-3 border-t border-mcvill-accent/30">
          {!isSidebarCollapsed && (
            <p className="px-3 mb-1 text-[9px] font-black text-slate-500/70 tracking-[0.25em] uppercase flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-600/50" />
              {t('section.intelligence', 'Inteligencia')}
            </p>
          )}
          <SidebarItem
            icon={MessageSquare}
            label={t('sidebar.chat_ia', 'Chat IA')}
            active={isChatOpen}
            onClick={onToggleChat}
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem
            icon={Zap}
            label={t('sidebar.voice_link', 'Voice Link')}
            active={isChatOpen && panelType === 'voice'}
            onClick={onOpenVoice}
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem
            icon={ScrollText}
            label={t('sidebar.minutas', 'Minutas IA')}
            active={activeView === 'minutas'}
            onClick={() => navigate('minutas')}
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem
            icon={BookOpen}
            label={`${t('topbar.manual', 'Manual')} ${config.systemName}`}
            active={false}
            onClick={handleOpenGuideModal}
            collapsed={isSidebarCollapsed}
          />
        </div>

        {showAdvancedContainer && (
          <div className="space-y-2 pt-3 border-t border-mcvill-accent/30">
            {/* Calidad Avanzada */}
            {showQualitySection && (
              <>
                {!isSidebarCollapsed && (
                  <p className="px-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                    {t('section.advanced_quality', 'Calidad Avanzada')}
                  </p>
                )}
                {hasAccess('spc') && <SidebarItem icon={LineChart} label={t('sidebar.spc', 'SPC Alertas')} active={activeView === 'spc'} onClick={() => navigate('spc')} collapsed={isSidebarCollapsed} />}
                {hasAccess('visual_ia') && <SidebarItem icon={ScanSearch} label={t('sidebar.visual_ia', 'Inspección IA')} active={activeView === 'visual_ia'} onClick={() => navigate('visual_ia')} collapsed={isSidebarCollapsed} />}
                {hasAccess('trazabilidad') && <SidebarItem icon={GitBranch} label={t('sidebar.trazabilidad', 'Trazabilidad')} active={activeView === 'trazabilidad'} onClick={() => navigate('trazabilidad')} collapsed={isSidebarCollapsed} />}
                {hasAccess('defect_library') && <SidebarItem icon={Library} label={t('sidebar.defect_library', 'Bib. Defectos')} active={activeView === 'defect_library'} onClick={() => navigate('defect_library')} collapsed={isSidebarCollapsed} />}
                {hasAccess('ppap') && <SidebarItem icon={FileCheck2} label="PPAP / FAI" active={activeView === 'ppap'} onClick={() => navigate('ppap')} collapsed={isSidebarCollapsed} />}
                {hasAccess('voc') && <SidebarItem icon={MessageCircle} label={t('sidebar.voc', 'VOC')} active={activeView === 'voc'} onClick={() => navigate('voc')} collapsed={isSidebarCollapsed} />}
                {hasAccess('shop_floor') && <SidebarItem icon={Scan} label={t('sidebar.shop_floor', 'Shop Floor')} active={activeView === 'shop_floor'} onClick={() => navigate('shop_floor')} collapsed={isSidebarCollapsed} />}
                {hasAccess('seguridad') && <SidebarItem icon={Camera} label={t('sidebar.seguridad', 'Seguridad')} active={activeView === 'seguridad'} onClick={() => navigate('seguridad')} collapsed={isSidebarCollapsed} />}
              </>
            )}

            {/* Comercial */}
            {showCommercialSection && (
              <>
                {!isSidebarCollapsed && (
                  <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                    {t('section.commercial', 'Comercial')}
                  </p>
                )}
                {hasAccess('ventas') && <SidebarItem icon={TrendingUp} label={t('sidebar.ventas', 'Ventas')} active={activeView === 'ventas'} onClick={() => navigate('ventas')} collapsed={isSidebarCollapsed} />}
                {hasAccess('compras') && <SidebarItem icon={ShoppingCart} label={t('sidebar.compras', 'Compras')} active={activeView === 'compras'} onClick={() => navigate('compras')} collapsed={isSidebarCollapsed} />}
                {hasAccess('agente_cot') && <SidebarItem icon={Sparkles} label={t('sidebar.agente_cot', 'Agente Cot.')} active={activeView === 'agente_cot'} onClick={() => navigate('agente_cot')} collapsed={isSidebarCollapsed} />}
                {hasAccess('rfq_kanban') && <SidebarItem icon={KanbanSquare} label={t('sidebar.rfq_kanban', 'Kanban RFQ')} active={activeView === 'rfq_kanban'} onClick={() => navigate('rfq_kanban')} collapsed={isSidebarCollapsed} />}
                {hasAccess('factibilidad') && <SidebarItem icon={ShieldCheck} label={t('sidebar.factibilidad', 'Factibilidad')} active={activeView === 'factibilidad'} onClick={() => navigate('factibilidad')} collapsed={isSidebarCollapsed} />}
                {hasAccess('factibilidad_ia') && <SidebarItem icon={BrainCircuit} label={t('sidebar.factibilidad_ia', 'Fact. IA')} active={activeView === 'factibilidad_ia'} onClick={() => navigate('factibilidad_ia')} collapsed={isSidebarCollapsed} />}
                {hasAccess('metal_quoter') && <SidebarItem icon={Calculator} label={t('sidebar.metal_quoter', 'Cotizador Metal')} active={activeView === 'metal_quoter'} onClick={() => navigate('metal_quoter')} collapsed={isSidebarCollapsed} />}
                {hasAccess('roi') && <SidebarItem icon={TrendingUp} label={t('sidebar.roi', 'Cotizador ROI')} active={activeView === 'roi'} onClick={() => navigate('roi')} collapsed={isSidebarCollapsed} />}
              </>
            )}

            {/* Ingeniería */}
            {showEngineeringSection && (
              <>
                {!isSidebarCollapsed && (
                  <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                    {t('section.engineering', 'Ingeniería')}
                  </p>
                )}
                {hasAccess('engineering') && <SidebarItem icon={Cpu} label={t('sidebar.engineering', 'Ingeniería')} active={activeView === 'engineering'} onClick={() => navigate('engineering')} collapsed={isSidebarCollapsed} />}
                {hasAccess('work_instructions') && <SidebarItem icon={ClipboardList} label="Inst. Trabajo" active={activeView === 'work_instructions'} onClick={() => navigate('work_instructions')} collapsed={isSidebarCollapsed} />}
                {hasAccess('layout_design') && <SidebarItem icon={Layout} label={t('sidebar.layout_design', 'Layout Planta')} active={activeView === 'layout_design'} onClick={() => navigate('layout_design')} collapsed={isSidebarCollapsed} />}
                {hasAccess('process_simulator') && <SidebarItem icon={FlaskConical} label={t('sidebar.process_simulator', 'Simulador')} active={activeView === 'process_simulator'} onClick={() => navigate('process_simulator')} collapsed={isSidebarCollapsed} />}
                {hasAccess('nesting') && <SidebarItem icon={Layers} label={t('sidebar.nesting', 'Nesting')} active={activeView === 'nesting'} onClick={() => navigate('nesting')} collapsed={isSidebarCollapsed} />}
                {hasAccess('energy_monitor') && <SidebarItem icon={Zap} label={t('sidebar.energy_monitor', 'Energía IA')} active={activeView === 'energy_monitor'} onClick={() => navigate('energy_monitor')} collapsed={isSidebarCollapsed} />}
                {hasAccess('preventive_maintenance_ia') && <SidebarItem icon={Wrench} label={t('sidebar.preventive_maintenance_ia', 'Mantto. Predictivo')} active={activeView === 'preventive_maintenance_ia'} onClick={() => navigate('preventive_maintenance_ia')} collapsed={isSidebarCollapsed} />}
              </>
            )}

            {/* Capital Humano */}
            {showHRSection && (
              <>
                {!isSidebarCollapsed && (
                  <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                    {t('section.hr', 'Capital Humano')}
                  </p>
                )}
                {hasAccess('rh') && <SidebarItem icon={MembersIcon} label={t('sidebar.rh', 'RH')} active={activeView === 'rh'} onClick={() => navigate('rh')} collapsed={isSidebarCollapsed} />}
                {hasAccess('payroll') && <SidebarItem icon={FileText} label={t('sidebar.payroll', 'Nómina')} active={activeView === 'payroll'} onClick={() => navigate('payroll')} collapsed={isSidebarCollapsed} />}
                {hasAccess('attendance') && <SidebarItem icon={CalendarCheck} label={t('sidebar.attendance', 'Asistencia')} active={activeView === 'attendance'} onClick={() => navigate('attendance')} collapsed={isSidebarCollapsed} />}
                {hasAccess('recruitment') && <SidebarItem icon={UserSearch} label={t('sidebar.recruitment', 'Reclutamiento')} active={activeView === 'recruitment'} onClick={() => navigate('recruitment')} collapsed={isSidebarCollapsed} />}
                {hasAccess('desempeno') && <SidebarItem icon={Medal} label={t('sidebar.desempeno', 'Desempeño')} active={activeView === 'desempeno'} onClick={() => navigate('desempeno')} collapsed={isSidebarCollapsed} />}
              </>
            )}

            {/* Finanzas */}
            {showFinanceSection && (
              <>
                {!isSidebarCollapsed && (
                  <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                    {t('section.finance', 'Finanzas')}
                  </p>
                )}
                {hasAccess('finance') && <SidebarItem icon={CircleDollarSign} label={t('sidebar.finance', 'Finanzas')} active={activeView === 'finance'} onClick={() => navigate('finance')} collapsed={isSidebarCollapsed} />}
                {hasAccess('banco') && <SidebarItem icon={Landmark} label={t('sidebar.banco', 'Banco')} active={activeView === 'banco'} onClick={() => navigate('banco')} collapsed={isSidebarCollapsed} />}
                {hasAccess('costing') && <SidebarItem icon={BarChart3} label={t('sidebar.costing', 'Costos')} active={activeView === 'costing'} onClick={() => navigate('costing')} collapsed={isSidebarCollapsed} />}
                {hasAccess('costeo') && <SidebarItem icon={Gauge} label={t('sidebar.costeo', 'Costeo Live')} active={activeView === 'costeo'} onClick={() => navigate('costeo')} collapsed={isSidebarCollapsed} />}
              </>
            )}

            {/* Sistema */}
            {showSystemSection && (
              <>
                {!isSidebarCollapsed && (
                  <p className="px-3 mt-3 mb-1 text-[9px] font-black text-mcvill-accent/70 tracking-[0.25em] uppercase flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-mcvill-accent/60" />
                    {t('section.system', 'Sistema')}
                  </p>
                )}
                {hasAccess('reports') && <SidebarItem icon={FileBarChart} label={t('sidebar.reports', 'Reportes')} active={activeView === 'reports'} onClick={() => navigate('reports')} collapsed={isSidebarCollapsed} />}
                {isSuperAdmin && <SidebarItem icon={Settings2} label={t('sidebar.settings', 'CONFIGURACION')} active={activeView === 'settings'} onClick={() => navigate('settings')} collapsed={isSidebarCollapsed} />}
              </>
            )}
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
