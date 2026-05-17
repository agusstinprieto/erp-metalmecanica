import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'es' | 'en';

export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇲🇽' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
] as const;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Sidebar Sections
    'section.operations': 'Operaciones',
    'section.quality': 'Calidad',
    'section.advanced_quality': 'Calidad Avanzada',
    'section.commercial': 'Comercial',
    'section.engineering': 'Ingeniería',
    'section.hr': 'Capital Humano',
    'section.finance': 'Finanzas',
    'section.system': 'Sistema',
    'section.intelligence': 'Inteligencia',

    // Sidebar Items
    'sidebar.dashboard': 'Tablero',
    'sidebar.production': 'Planta',
    'sidebar.viajeros': 'Viajeros',
    'sidebar.planeacion': 'Planeación',
    'sidebar.inventory': 'Inventarios',
    'sidebar.quality': 'Calidad',
    'sidebar.hse': 'Seguridad',
    'sidebar.maintenance': 'Mantto.',
    'sidebar.spc': 'SPC Alertas',
    'sidebar.visual_ia': 'Inspección IA',
    'sidebar.trazabilidad': 'Trazabilidad',
    'sidebar.defect_library': 'Bib. Defectos',
    'sidebar.ppap': 'PPAP',
    'sidebar.voc': 'VOC',
    'sidebar.shop_floor': 'Shop Floor',
    'sidebar.ventas': 'Ventas',
    'sidebar.compras': 'Compras',
    'sidebar.agente_cot': 'Agente Cot.',
    'sidebar.rfq_kanban': 'Kanban RFQ',
    'sidebar.factibilidad': 'Factibilidad',
    'sidebar.factibilidad_ia': 'Fact. IA',
    'sidebar.metal_quoter': 'Cotizador Metal',
    'sidebar.roi': 'Cotizador ROI',
    'sidebar.engineering': 'Ingeniería',
    'sidebar.work_instructions': 'Inst. Trabajo',
    'sidebar.layout_design': 'Layout Planta',
    'sidebar.process_simulator': 'Simulador',
    'sidebar.nesting': 'Nesting',
    'sidebar.rh': 'RH',
    'sidebar.payroll': 'Nómina',
    'sidebar.attendance': 'Asistencia',
    'sidebar.recruitment': 'Reclutamiento',
    'sidebar.desempeno': 'Desempeño',
    'sidebar.finance': 'Finanzas',
    'sidebar.banco': 'Banco',
    'sidebar.costing': 'Costos',
    'sidebar.costeo': 'Costeo Live',
    'sidebar.reports': 'Reportes',
    'sidebar.settings': 'CONFIGURACION',
    'sidebar.chat_ia': 'Chat IA',
    'sidebar.voice_link': 'Voice Link',
    'sidebar.minutas': 'Minutas IA',
    'sidebar.accelerator': 'Acelerador',

    // Header & Topbar
    'topbar.guide': 'Guía',
    'topbar.manual': 'Manual',
    'topbar.master_control': 'Control Maestro',
    'topbar.orchestrator': 'Orquestador Raíz',
    'topbar.total_access': '◆ ACCESO TOTAL',
    'topbar.profile': 'Mi Perfil',
    'topbar.logout': 'Cerrar Sesión',
    'topbar.designed_by': 'Diseñado por',
    'topbar.dark_mode': 'Cambiar a modo oscuro',
    'topbar.light_mode': 'Cambiar a modo claro',

    // Common terms
    'common.active': 'Activo',
    'common.search': 'Buscar...',
    'common.loading': 'Cargando...',
  },
  en: {
    // Sidebar Sections
    'section.operations': 'Operations',
    'section.quality': 'Quality',
    'section.advanced_quality': 'Advanced Quality',
    'section.commercial': 'Commercial',
    'section.engineering': 'Engineering',
    'section.hr': 'Human Capital',
    'section.finance': 'Finance',
    'section.system': 'System',
    'section.intelligence': 'Intelligence',

    // Sidebar Items
    'sidebar.dashboard': 'Dashboard',
    'sidebar.production': 'Shop Floor',
    'sidebar.viajeros': 'Travelers',
    'sidebar.planeacion': 'Planning',
    'sidebar.inventory': 'Inventories',
    'sidebar.quality': 'QC Audit',
    'sidebar.hse': 'SAFETY',
    'sidebar.maintenance': 'Maintenance',
    'sidebar.spc': 'SPC Alerts',
    'sidebar.visual_ia': 'AI Inspection',
    'sidebar.trazabilidad': 'Traceability',
    'sidebar.defect_library': 'Defect Library',
    'sidebar.ppap': 'PPAP / FAI',
    'sidebar.voc': 'VOC Client',
    'sidebar.shop_floor': 'Shop Floor',
    'sidebar.ventas': 'Sales & CRM',
    'sidebar.compras': 'Purchasing',
    'sidebar.agente_cot': 'RFQ Agent',
    'sidebar.rfq_kanban': 'Kanban RFQ',
    'sidebar.factibilidad': 'Feasibility',
    'sidebar.factibilidad_ia': 'Feasibility IA',
    'sidebar.metal_quoter': 'Metal Quoting',
    'sidebar.roi': 'ROI Calculator',
    'sidebar.engineering': 'Engineering',
    'sidebar.work_instructions': 'Work Instructions',
    'sidebar.layout_design': 'Plant Layout',
    'sidebar.process_simulator': 'Simulator',
    'sidebar.nesting': 'Nesting Optimizer',
    'sidebar.rh': 'HR / Personnel',
    'sidebar.payroll': 'Payroll & Tax',
    'sidebar.attendance': 'Attendance',
    'sidebar.recruitment': 'AI Recruitment',
    'sidebar.desempeno': 'Performance',
    'sidebar.finance': 'Finance & ROI',
    'sidebar.banco': 'Banking',
    'sidebar.costing': 'Cost Control',
    'sidebar.costeo': 'Live Costing',
    'sidebar.reports': 'KPI Reports',
    'sidebar.settings': 'SETTINGS',
    'sidebar.chat_ia': 'AI Chat',
    'sidebar.voice_link': 'Voice Link',
    'sidebar.minutas': 'AI Minutes',
    'sidebar.accelerator': 'Accelerator',

    // Header & Topbar
    'topbar.guide': 'Guide',
    'topbar.manual': 'Manual',
    'topbar.master_control': 'Master Control',
    'topbar.orchestrator': 'Root Orchestrator',
    'topbar.total_access': '◆ TOTAL ACCESS',
    'topbar.profile': 'My Profile',
    'topbar.logout': 'Sign Out',
    'topbar.designed_by': 'Designed by',
    'topbar.dark_mode': 'Switch to dark mode',
    'topbar.light_mode': 'Switch to light mode',

    // Common terms
    'common.active': 'Active',
    'common.search': 'Search...',
    'common.loading': 'Loading...',
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('mcvill_language');
    return (saved as Language) || 'es';
  });

  useEffect(() => {
    localStorage.setItem('mcvill_language', language);
  }, [language]);

  const t = (key: string, fallback?: string) => {
    return translations[language][key] || translations['es'][key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
