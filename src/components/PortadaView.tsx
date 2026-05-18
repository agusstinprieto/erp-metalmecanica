import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Factory, Route, CalendarDays, Package, 
  Camera, Zap, Cpu, Sparkles, Shield, Clock, Terminal,
  ExternalLink, ArrowRight, Play, Pause, Activity, ChevronRight, Settings, X,
  Truck, Palette, ClipboardCheck, ShieldAlert, Wrench, LineChart, ScanSearch,
  GitBranch, Library, FileCheck2, MessageCircle, Scan, TrendingUp, ShoppingCart,
  KanbanSquare, ShieldCheck, BrainCircuit, Calculator, ClipboardList, Layers,
  Users, FileText, CalendarCheck, UserSearch, Medal, CircleDollarSign, Landmark,
  BarChart3, Gauge, FileBarChart, Layout as LayoutIcon
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useLanguage } from '../contexts/LanguageContext';

interface PortadaViewProps {
  setView: (view: string) => void;
  onToggleChat?: () => void;
  onOpenVoice?: () => void;
  userRole?: string;
}

export const PortadaView: React.FC<PortadaViewProps> = ({ setView, onToggleChat, onOpenVoice, userRole = 'empleado' }) => {
  const { config, updateConfig } = useConfig();
  const { t } = useLanguage();
  const [time, setTime] = useState(new Date());
  const [isMuted, setIsMuted] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'Iniciando Orquestador Raíz McVill...',
    'Conexión con Supabase DB establecida [OK]',
    'Red Neuronal de Inspección Visual lista en celdas 1-4',
    'Sensores de vibración CNC enviando telemetría',
    'Voice Link procesador conversacional activo'
  ]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // System logs simulation
  useEffect(() => {
    const logInterval = setInterval(() => {
      const logs = [
        'Inspección IA: Tasa de acierto del modelo de calidad en 99.8%',
        'Monitoreo CCTV: Canal 2 [Área de Soldadura] - Sin incidentes activos',
        'Consumo de Energía: Estabilizado en 185 KWh/t',
        'Licitaciones RFQ: 3 nuevas requisiciones recibidas en Kanban',
        'Mantenimiento Predictivo: Trumpf Laser calibración exitosa',
        'Sincronización de Base de Datos: Latencia 12ms',
        'Orquestador Raíz: Ejecutando auto-curación de caché [OK]'
      ];
      const randomLog = `[${new Date().toLocaleTimeString()}] ${logs[Math.floor(Math.random() * logs.length)]}`;
      setSystemLogs(prev => [randomLog, ...prev.slice(0, 4)]);
    }, 4000);
    return () => clearInterval(logInterval);
  }, []);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getYoutubeId = (url: string): string => {
    if (!url) return 'wxx7A63LpSo';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url.replace('https://www.youtube.com/embed/', '').split('?')[0];
  };

  const videoId = getYoutubeId(config.cctvYoutubeUrl || 'wxx7A63LpSo');

  const handleSaveYoutubeUrl = () => {
    if (youtubeInput.trim()) {
      updateConfig({ cctvYoutubeUrl: youtubeInput.trim() });
    }
    setIsConfigModalOpen(false);
  };

  // Role based access logic exactly as configured in Sidebar
  const role = userRole.toLowerCase();
  const isGodmode = role === 'ceo' || role === 'sistemas' || role === 'gerencia';

  const hasAccess = (module: string) => {
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

  const [activeCategory, setActiveCategory] = useState<'ops' | 'qa_eng' | 'com' | 'hr_fin'>('ops');

  const menuItems = [
    // Operaciones
    { id: 'dashboard', label: 'Tablero', subtitle: 'Monitoreo Ejecutivo', desc: 'KPI generales, métricas críticas y telemetría OEE.', icon: LayoutDashboard, category: 'ops' },
    { id: 'planeacion', label: 'Planeación', subtitle: 'Planificación Planta', desc: 'Demanda de clientes, calendario maestro y asignación de celdas.', icon: CalendarDays, category: 'ops' },
    { id: 'inventory', label: 'Inventarios', subtitle: 'Control de Almacenes', desc: 'Materia prima, productos terminados y trazabilidad de resguardo.', icon: Package, category: 'ops' },
    { id: 'viajeros', label: 'Viajeros', subtitle: 'Hojas Viajeras', desc: 'Procesos de ruteo de piezas, control de operaciones y firmas de liberación.', icon: Route, category: 'ops' },
    { id: 'production', label: 'Planta', subtitle: 'Piso de Manufactura', desc: 'Control de corte, mecanizado, forja y estaciones de ensamble.', icon: Factory, category: 'ops' },
    { id: 'logistica', label: 'Logística', subtitle: 'Control de Embarques', desc: 'Gestión de flotas, rutas de entrega e insumos en tránsito.', icon: Truck, category: 'ops' },
    { id: 'lead_time_predictor', label: 'Predicciones IA', subtitle: 'Estimador de Tiempos', desc: 'Red neuronal predictiva para estimar tiempos de entrega (Lead Time).', icon: Clock, category: 'ops' },
    { id: 'branding_studio', label: 'Estudio Branding', subtitle: 'Diseñador de Marca', desc: 'Personalización de logotipos, colores del ERP y reportes oficiales.', icon: Palette, category: 'ops' },

    // Calidad e Ingeniería
    { id: 'quality', label: 'Calidad', subtitle: 'Control de Calidad', desc: 'Inspecciones dimensionales, reportes de scrap y no conformidades.', icon: ClipboardCheck, category: 'qa_eng' },
    { id: 'visual_ia', label: 'Inspección IA', subtitle: 'Auditoría Visual IA', desc: 'Detección automatizada de defectos superficiales mediante cámaras.', icon: ScanSearch, category: 'qa_eng' },
    { id: 'spc', label: 'SPC Alertas', subtitle: 'Control Estadístico', desc: 'Alertas en tiempo real sobre desviaciones en dimensiones críticas de piezas.', icon: LineChart, category: 'qa_eng' },
    { id: 'trazabilidad', label: 'Trazabilidad', subtitle: 'Árbol de Trazabilidad', desc: 'Historial completo de materia prima, operador y lotes de producción.', icon: GitBranch, category: 'qa_eng' },
    { id: 'ppap', label: 'PPAP / FAI', subtitle: 'Homologación de Partes', desc: 'Carpeta técnica de aprobación de partes para clientes automotrices/industriales.', icon: FileCheck2, category: 'qa_eng' },
    { id: 'hse', label: 'HSE', subtitle: 'Seguridad e Higiene', desc: 'Reportes de actos inseguros, dotación de EPP y auditorías de seguridad.', icon: ShieldAlert, category: 'qa_eng' },
    { id: 'seguridad', label: 'Seguridad', subtitle: 'Video Inteligente', desc: 'Analítica en tiempo real de cámaras de seguridad y celdas Trumpf.', icon: Camera, category: 'qa_eng' },
    { id: 'maintenance', label: 'Mantenimiento', subtitle: 'Mantenimiento General', desc: 'Órdenes de trabajo preventivas y correctivas en maquinaria.', icon: Wrench, category: 'qa_eng' },
    { id: 'engineering', label: 'Ingeniería', subtitle: 'Centro de Ingeniería', desc: 'Hojas de proceso técnico, parámetros y especificaciones de soldadura.', icon: Cpu, category: 'qa_eng' },
    { id: 'work_instructions', label: 'Inst. Trabajo', subtitle: 'Instrucciones de Trabajo', desc: 'Ayudas visuales animadas y paso a paso digital para ensambladores.', icon: ClipboardList, category: 'qa_eng' },
    { id: 'layout_design', label: 'Layout Planta', subtitle: 'Plano Digital 2D/3D', desc: 'Simulación de flujo físico y acomodo de maquinaria en piso.', icon: LayoutIcon, category: 'qa_eng' },
    { id: 'process_simulator', label: 'Simulador', subtitle: 'Procesos Físicos', desc: 'Simulador de procesos de corte, soldadura y tratamiento térmico.', icon: Zap, category: 'qa_eng' },
    { id: 'nesting', label: 'Nesting', subtitle: 'Optimización Láminas', desc: 'Algoritmo de acomodo de piezas en láminas metálicas para mínimo desperdicio.', icon: Layers, category: 'qa_eng' },
    { id: 'energy_monitor', label: 'Energía IA', subtitle: 'Eficiencia Energética', desc: 'Recomendador predictivo de ahorro eléctrico por celda de soldadura.', icon: Zap, category: 'qa_eng' },
    { id: 'preventive_maintenance_ia', label: 'Mantto. Predictivo', subtitle: 'Predicción Fallas', desc: 'Algoritmo predictivo de fallas críticas en herramentales y CNC.', icon: Wrench, category: 'qa_eng' },

    // Comercial y Ventas
    { id: 'ventas', label: 'Ventas', subtitle: 'Panel de Ventas', desc: 'Cotizaciones cerradas, pipeline comercial y clientes de metalmecánica.', icon: TrendingUp, category: 'com' },
    { id: 'compras', label: 'Compras', subtitle: 'Abastecimiento', desc: 'Órdenes de compra a proveedores, cotizaciones recibidas y requisiciones.', icon: ShoppingCart, category: 'com' },
    { id: 'agente_cot', label: 'Agente Cot.', subtitle: 'Cotizador IA', desc: 'IA entrenada para leer requisiciones y pre-llenar presupuestos de piezas.', icon: Sparkles, category: 'com' },
    { id: 'rfq_kanban', label: 'Kanban RFQ', subtitle: 'Embudo RFQ', desc: 'Tablero ágil para solicitudes de cotización de clientes.', icon: KanbanSquare, category: 'com' },
    { id: 'factibilidad', label: 'Factibilidad', subtitle: 'Estudio de Factibilidad', desc: 'Auditoría técnica previa a cotizar para confirmar capacidades.', icon: ShieldCheck, category: 'com' },
    { id: 'factibilidad_ia', label: 'Factibilidad IA', subtitle: 'Factibilidad Predictiva', desc: 'Red neuronal que evalúa viabilidad dimensional y material en segundos.', icon: BrainCircuit, category: 'com' },
    { id: 'metal_quoter', label: 'Cotizador Metal', subtitle: 'Cotizador Paramétrico', desc: 'Cálculo exacto de peso de piezas, tiempos de maquinado y precio final.', icon: Calculator, category: 'com' },
    { id: 'roi', label: 'Cotizador ROI', subtitle: 'Simulador de Retorno', desc: 'Cálculo automatizado de retorno de inversión para contratos multianuales.', icon: TrendingUp, category: 'com' },

    // Capital Humano y Finanzas
    { id: 'rh', label: 'RH', subtitle: 'Capital Humano', desc: 'Expedientes de personal, habilidades técnicas y credenciales.', icon: Users, category: 'hr_fin' },
    { id: 'attendance', label: 'Asistencia', subtitle: 'Control Asistencias', desc: 'Reloj checador por código de barras y monitoreo de incidencias.', icon: CalendarCheck, category: 'hr_fin' },
    { id: 'payroll', label: 'Nómina', subtitle: 'Gestión de Nóminas', desc: 'Cálculo de pre-nóminas, horas extra McVill y bonos por desempeño.', icon: FileText, category: 'hr_fin' },
    { id: 'recruitment', label: 'Reclutamiento', subtitle: 'Atracción Talento', desc: 'Bolsa de trabajo, requisiciones de personal y entrevistas por IA.', icon: UserSearch, category: 'hr_fin' },
    { id: 'desempeno', label: 'Desempeño', subtitle: 'Evaluaciones y KPI', desc: 'Tablero de incentivos, productividad de operarios y metas alcanzadas.', icon: Medal, category: 'hr_fin' },
    { id: 'finance', label: 'Finanzas', subtitle: 'Consola Finanzas', desc: 'Cuentas por cobrar (CxC), cuentas por pagar (CxP) y flujo de caja proyectado.', icon: CircleDollarSign, category: 'hr_fin' },
    { id: 'banco', label: 'Banco', subtitle: 'Tesorería y Bancos', desc: 'Registro de egresos, conciliaciones y transferencias bancarias de la planta.', icon: Landmark, category: 'hr_fin' },
    { id: 'costing', label: 'Costos', subtitle: 'Costos Industriales', desc: 'Asignación de costos fijos, variables e insumos indirectos de manufactura.', icon: BarChart3, category: 'hr_fin' },
    { id: 'costeo', label: 'Costeo Live', subtitle: 'Márgenes en Vivo', desc: 'Telemetría financiera instantánea del margen por orden de fabricación en curso.', icon: Gauge, category: 'hr_fin' }
  ];

  const filteredItems = menuItems.filter(item => item.category === activeCategory && hasAccess(item.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* ── HEADER DE BIENVENIDA PREMIUM ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-950/40 border border-mcvill-accent/20 backdrop-blur relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-mcvill-accent/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-mcvill-accent/20 border border-mcvill-accent/40 text-[9px] font-black text-mcvill-accent uppercase tracking-widest animate-pulse">
              ● Sistema de Control Maestro
            </span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
            Bienvenido al Portal de Mando {config.brandName}
          </h1>
          <p className="text-xs text-slate-400">
            Orquestador predictivo y visual para manufactura pesada y metalmecánica.
          </p>
        </div>

        {/* Live Clock Widget */}
        <div className="relative z-10 flex items-center gap-4 bg-slate-950/60 border border-white/5 rounded-2xl p-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/20 flex items-center justify-center text-mcvill-accent">
            <Clock size={20} className="animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white tracking-widest font-mono">
              {formatTime(time)}
            </p>
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">
              {formatDate(time)}
            </p>
          </div>
        </div>
      </div>

      {/* ── MAIN PORTADA CONTAINER: CINEMATIC FEED & SYSTEM TELEMETRY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2/3: Live CCTV Cinematic Video Feed */}
        <div className="lg:col-span-2 rounded-3xl bg-slate-950/40 border border-mcvill-accent/20 backdrop-blur p-4 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-slate-950/40 pointer-events-none z-10" />
          
          {/* Header Indicators */}
          <div className="relative z-10 flex items-center justify-between p-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-[9px] font-black uppercase text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CCTV Planta: En Línea
            </div>
            <span className="text-[9px] font-mono text-slate-400 px-2 py-1 rounded-xl bg-slate-950/80 border border-white/5">
              CAMARA 02: ÁREA DE SOLDADURA
            </span>
          </div>

          {/* YouTube Cinematic Live Loop */}
          <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-700">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3`}
              title="Industrial Live Loop"
              className="w-full h-[300%] -translate-y-1/3 scale-[1.3] object-cover"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>

          {/* Placeholder/Fallback container height to hold space */}
          <div className="h-64 lg:h-80" />

          {/* Footer Overlays */}
          <div className="relative z-10 p-2 space-y-3">
            <div className="max-w-md bg-slate-950/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <Camera size={13} className="text-mcvill-accent" />
                Control de Videovigilancia Activo
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Monitoreo continuo asistido por IA para detección en caliente de fallas de EPP e intrusiones en celdas de soldadura automatizada Trumpf.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button 
                  onClick={() => setView('seguridad')}
                  className="px-3 py-1.5 rounded-xl bg-mcvill-accent text-[9px] font-black text-slate-950 uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-1 shadow-[0_0_12px_var(--theme-glow)]"
                >
                  Ver Todas las Cámaras <ArrowRight size={10} />
                </button>
                <button 
                  onClick={() => {
                    setYoutubeInput(config.cctvYoutubeUrl || 'https://www.youtube.com/embed/wxx7A63LpSo');
                    setIsConfigModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white hover:border-white/30 transition-all flex items-center gap-1"
                >
                  <Settings size={10} /> Configurar Feed
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1/3: Real-Time Telemetry & Systems Terminal */}
        <div className="rounded-3xl bg-slate-950/40 border border-mcvill-accent/20 backdrop-blur p-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Title */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={15} className="text-mcvill-accent" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Telemetría y Diagnóstico</h3>
              </div>
              <Activity size={13} className="text-emerald-400 animate-pulse" />
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">OEE Promedio</p>
                <p className="text-lg font-black text-white tracking-tight mt-1">84.6%</p>
                <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-mcvill-accent h-full shadow-[0_0_6px_var(--theme-glow)]" style={{ width: '84.6%' }} />
                </div>
              </div>
              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tasa de Scrap</p>
                <p className="text-lg font-black text-emerald-400 tracking-tight mt-1">1.62%</p>
                <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: '30%' }} />
                </div>
              </div>
            </div>

            {/* Live Terminal Log */}
            <div className="space-y-2">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Consola Orquestador</span>
              <div className="bg-black/40 border border-white/5 rounded-2xl p-3 font-mono text-[9px] text-slate-400 space-y-2 max-h-40 overflow-y-auto">
                {systemLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-mcvill-accent shrink-0 font-black">❯</span>
                    <span className="truncate">{log}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick AI Diagnostics Button */}
          <div className="pt-4 border-t border-white/5 mt-4 space-y-2">
            <div className="flex items-center gap-2 text-mcvill-accent text-[9px] font-black uppercase tracking-widest bg-mcvill-accent/10 border border-mcvill-accent/30 rounded-xl p-2.5">
              <Zap size={12} className="animate-pulse" />
              <span>Orquestador: Estado Óptimo</span>
            </div>
          </div>

        </div>

      </div>

      {/* ── COCKPIT DE ÁREAS Y DEPARTAMENTOS (MENÚ DE ACCESO RÁPIDO) ── */}
      <div className="bg-slate-950/20 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-mcvill-accent/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Sparkles size={16} className="text-mcvill-accent animate-pulse" />
              Menú Principal de Áreas y Departamentos
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Cockpit de navegación rápido para todos los departamentos autorizados de la planta
            </p>
          </div>
          
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 border border-white/5 px-2.5 py-1 rounded-xl shrink-0">
            Rol de Acceso: {role}
          </span>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap gap-2.5 mb-6">
          <button
            onClick={() => setActiveCategory('ops')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border ${
              activeCategory === 'ops'
                ? 'bg-mcvill-accent text-slate-950 border-mcvill-accent shadow-[0_0_15px_var(--theme-glow)] font-black'
                : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:border-white/20'
            }`}
          >
            <Factory size={12} />
            Operaciones y Planta
          </button>
          <button
            onClick={() => setActiveCategory('qa_eng')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border ${
              activeCategory === 'qa_eng'
                ? 'bg-mcvill-accent text-slate-950 border-mcvill-accent shadow-[0_0_15px_var(--theme-glow)] font-black'
                : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:border-white/20'
            }`}
          >
            <Shield size={12} />
            Calidad e Ingeniería
          </button>
          <button
            onClick={() => setActiveCategory('com')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border ${
              activeCategory === 'com'
                ? 'bg-mcvill-accent text-slate-950 border-mcvill-accent shadow-[0_0_15px_var(--theme-glow)] font-black'
                : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:border-white/20'
            }`}
          >
            <CircleDollarSign size={12} />
            Comercial y Ventas
          </button>
          <button
            onClick={() => setActiveCategory('hr_fin')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border ${
              activeCategory === 'hr_fin'
                ? 'bg-mcvill-accent text-slate-950 border-mcvill-accent shadow-[0_0_15px_var(--theme-glow)] font-black'
                : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white hover:border-white/20'
            }`}
          >
            <Users size={12} />
            Finanzas y Capital Humano (RH)
          </button>
        </div>

        {/* Categories Dynamic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setView(item.id)}
                className="group cursor-pointer rounded-2xl p-4 bg-slate-950/60 border border-white/5 hover:border-mcvill-accent/30 hover:bg-mcvill-accent/5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-mcvill-accent group-hover:border-mcvill-accent/30 group-hover:scale-105 transition-all">
                    <IconComponent size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest mt-4">
                    {item.label}
                  </h3>
                  <p className="text-[8px] font-black text-mcvill-accent/60 uppercase tracking-widest mt-0.5">
                    {item.subtitle}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[8px] font-black text-slate-600 group-hover:text-mcvill-accent uppercase tracking-widest">
                    Acceder Módulo
                  </span>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-mcvill-accent transition-colors" />
                </div>
              </div>
            );
          })}
          
          {filteredItems.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-2xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                No tienes módulos autorizados en esta categoría
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL CONFIGURACIÓN YOUTUBE ── */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mcvill-accent/10 border border-mcvill-accent/30 flex items-center justify-center text-mcvill-accent">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Configurar Feed CCTV</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Ingresa la URL del video de YouTube</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">URL del Video o Enlace Copiado</label>
                <input
                  type="text"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="Ej: https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-900 border border-white/10 text-sm text-white rounded-xl p-3 focus:outline-none focus:border-mcvill-accent/50 focus:bg-slate-900/80 transition-all"
                />
              </div>
              <button
                onClick={handleSaveYoutubeUrl}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-mcvill-accent to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity shadow-[0_0_20px_var(--theme-glow)]"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
