import React, { useState } from 'react';
import {
  X, BookOpen, Zap, Users, Box, Hammer, Cpu, Mic,
  LayoutDashboard, ShieldCheck, Target, CircleDollarSign, TrendingUp,
  Wrench, Camera, BrainCircuit, Puzzle,
  ClipboardCheck, BarChart3, Trophy, Shield
} from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import clsx from 'clsx';

interface ERPGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getDepartments(brandName: string) { return [
  {
    id: 'dashboard',
    name: 'Dashboard Maestro',
    icon: LayoutDashboard,
    color: 'text-blue-400',
    badge: 'CORE',
    description: 'Vista de 360° de la planta en tiempo real.',
    features: [
      'KPIs de OEE, Eficiencia y ROI actualizados en vivo.',
      'Alertas predictivas: stock crítico, mantenimientos y órdenes retrasadas.',
      'Acceso rápido a nuevas Órdenes de Producción.',
      'Chat IA y Voice Link integrados para consultas manos libres.',
    ],
  },
  {
    id: 'engineering',
    name: 'Ingeniería & Diseño',
    icon: Cpu,
    color: 'text-purple-400',
    badge: 'IA',
    description: 'Del plano a la orden de producción con inteligencia artificial.',
    features: [
      'Blueprint Analyzer: extrae BOM de planos PDF en 15 segundos.',
      'Cotizador Industrial IA: analiza planos y genera precios por proceso automáticamente.',
      'Analizador de archivos STEP 3D para extracción de geometría y materiales.',
      'Control de versiones de diseño vinculado a Órdenes de Trabajo.',
    ],
  },
  {
    id: 'nesting',
    name: 'Nesting & Optimizador',
    icon: Puzzle,
    color: 'text-cyan-400',
    badge: 'NUEVO',
    description: 'Maximiza el aprovechamiento de lámina y reduce mermas.',
    features: [
      'Algoritmo de nesting: organiza piezas para aprovechar hasta un 90% de la lámina.',
      'Retazos con área útil se reingresan automáticamente al inventario.',
      'Reporte de aprovechamiento y merma real por orden de producción.',
      'Compatible con láminas estándar y tamaños personalizados.',
    ],
  },
  {
    id: 'agente_cot',
    name: 'Agente de Cotizaciones',
    icon: BrainCircuit,
    color: 'text-amber-400',
    badge: 'IA',
    description: 'IA que genera cotizaciones profesionales desde lenguaje natural.',
    features: [
      'Describe el proyecto en español y la IA calcula material, procesos y overhead.',
      `Genera PDF profesional con logo ${brandName} listo para enviar al cliente.`,
      'Slider de margen: ajusta la utilidad y el precio se recalcula al instante.',
      'Convierte cotizaciones aprobadas en Órdenes de Producción con un clic.',
    ],
  },
  {
    id: 'rfq_kanban',
    name: 'Kanban de RFQs',
    icon: ClipboardCheck,
    color: 'text-blue-400',
    badge: 'NUEVO',
    description: 'Pipeline visual de todas tus oportunidades comerciales.',
    features: [
      'Columnas Kanban: Nuevo → Análisis → Propuesta → Negociación → Cerrado.',
      'Análisis de factibilidad IA con un clic sobre cualquier RFQ.',
      'Valor total del pipeline visible por etapa en tiempo real.',
      'Integrado con el Agente Cotizador para generar propuestas al instante.',
    ],
  },
  {
    id: 'inventory',
    name: 'Inventarios Pro',
    icon: Box,
    color: 'text-green-400',
    badge: 'CORE',
    description: 'Control absoluto de materia prima y stock.',
    features: [
      'Monitoreo de stock con alertas críticas dinámicas por debajo del mínimo.',
      'Notificaciones instantáneas a compras vía WhatsApp con la lista de faltantes.',
      'Importación masiva de materiales mediante CSV/Excel.',
      'Identificación de materiales por foto con IA visual.',
    ],
  },
  {
    id: 'production',
    name: 'Producción & Planta',
    icon: Hammer,
    color: 'text-orange-400',
    badge: 'CORE',
    description: 'Órdenes de trabajo y rastreo en tiempo real.',
    features: [
      'Seguimiento visual del progreso de OTs por etapa y estación.',
      'Viajeros de producción PDF con QR para rastreo en piso de planta.',
      'TV Mode: proyecta el estado de producción en pantalla grande.',
      'Asignación dinámica de operadores y recursos por estación.',
    ],
  },
  {
    id: 'quality',
    name: 'Calidad SGC + IA Visual',
    icon: Camera,
    color: 'text-emerald-400',
    badge: 'MEJORADO',
    description: 'Inspección por foto, no conformidades y auditorías ISO.',
    features: [
      '🔥 Inspección Soldadura: detecta porosidades, fisuras, socavación y spatter por foto.',
      '🎨 Inspección Pintura: detecta chorreos, burbujas y cáscara de naranja automáticamente.',
      'NC automática al detectar FAIL — severidad proporcional a la confianza de la IA.',
      'Auditorías ISO 9001 con registro de hallazgos y métricas Six Sigma.',
    ],
  },
  {
    id: 'rh',
    name: 'Capital Humano & RH',
    icon: Users,
    color: 'text-violet-400',
    badge: 'MEJORADO',
    description: 'Empleados, reclutamiento IA y gestión de talento.',
    features: [
      'Expediente digital completo: foto, documentos, IMSS y certificaciones.',
      'Reclutador IA: analiza CVs y califica candidatos contra el perfil del puesto.',
      'Guía de entrevista personalizada generada automáticamente por la IA.',
      'Onboarding acelerado con plan de capacitación inicial sugerido por IA.',
    ],
  },
  {
    id: 'desempeno',
    name: 'Desempeño & Incentivos',
    icon: Trophy,
    color: 'text-yellow-400',
    badge: 'NUEVO',
    description: 'KPIs de operadores, ranking y sistema de bonos automático.',
    features: [
      'KPIs por operador: eficiencia, calidad, asistencia y cumplimiento de tiempos.',
      'Ranking visual de mejores operadores por área y turno.',
      'Sistema de incentivos: define umbrales y los bonos se calculan automáticamente.',
      'Historial de incentivos pagados por empleado y período.',
    ],
  },
  {
    id: 'payroll',
    name: 'Nómina & Asistencia',
    icon: CircleDollarSign,
    color: 'text-green-400',
    badge: 'CORE',
    description: 'Nómina automática basada en asistencia real.',
    features: [
      'Nómina calculada automáticamente con asistencias, horas extra e incidencias.',
      'Check-in/out por QR o código — detecta tardanzas automáticamente.',
      'Recibo de nómina en PDF por empleado con un solo clic.',
      'Reporte de ausentismo semanal con identificación de patrones.',
    ],
  },
  {
    id: 'finance',
    name: 'Finanzas & Tesorería',
    icon: TrendingUp,
    color: 'text-blue-400',
    badge: 'CORE',
    description: 'Flujo de caja, rentabilidad y control financiero.',
    features: [
      'Flujo de Caja Predictivo: cobros vs pagos proyectados a 8 semanas.',
      'Rentabilidad por orden: costo real vs precio de venta vs margen proyectado.',
      'CxC y CxP con alertas de vencimiento automáticas.',
      'ROI del ERP calculado en tiempo real basado en eficiencias logradas.',
    ],
  },
  {
    id: 'maintenance',
    name: 'Mantenimiento Industrial',
    icon: Wrench,
    color: 'text-orange-400',
    badge: 'NUEVO',
    description: 'Activos, mantenimiento preventivo y correctivo.',
    features: [
      'Health Score por activo: 0-100 con alertas automáticas de degradación.',
      'Planes preventivos configurables: diario, semanal, mensual o por horas de uso.',
      'IA predictiva: analiza historial y estima cuándo podría fallar una máquina.',
      'Control de refacciones y herramientas de planta integrado con inventario.',
    ],
  },
  {
    id: 'hse',
    name: 'SEGURIDAD',
    icon: Shield,
    color: 'text-red-400',
    badge: 'NUEVO',
    description: 'Seguridad industrial, incidentes y cumplimiento NOM.',
    features: [
      'Registro de incidentes con análisis de causa raíz y medida correctiva.',
      'Mapa de calor de incidentes por área para identificar zonas de riesgo.',
      'Control de EPP asignado a cada empleado con vida útil y renovación.',
      'Alertas de vencimiento de certificaciones de seguridad (NOM-001, NOM-017).',
    ],
  },
  {
    id: 'spc',
    name: 'SPC & Six Sigma',
    icon: BarChart3,
    color: 'text-mcvill-accent',
    badge: 'CORE',
    description: 'Cartas de control X̄-R y capacidad de proceso estadística.',
    features: [
      'Cartas de control con límites UCL/LCL calculados automáticamente.',
      'Detección automática de las 4 reglas de Nelson (tendencias, ciclos, etc.).',
      'Índices Cp y Cpk con semáforo: verde ≥1.33 / amarillo ≥1.0 / rojo <1.0.',
      'Monitoreo simultáneo de múltiples características por proceso.',
    ],
  },
  {
    id: 'ai_voice',
    name: 'Voice Link & Chat IA',
    icon: Mic,
    color: 'text-purple-400',
    badge: 'IA',
    description: 'Interacción inteligente con el ERP por voz o chat.',
    features: [
      'Consultas en lenguaje natural: "¿Cuántos kilos de acero tenemos en almacén?"',
      'Ejecuta acciones del ERP por voz: crear órdenes, registrar incidencias.',
      'Cambia entre personalidades IA: Técnica, Ejecutiva o Soporte.',
      'Análisis de datos avanzado mediante preguntas en español.',
    ],
  },
]; }

const BADGE_COLORS: Record<string, string> = {
  'CORE':     'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'IA':       'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'NUEVO':    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'MEJORADO': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export const ERPGuideModal: React.FC<ERPGuideModalProps> = ({ isOpen, onClose }) => {
  const { isDarkMode, config } = useConfig();
  const DEPARTMENTS = getDepartments(config.brandName);
  const [filter, setFilter] = useState<'ALL' | 'CORE' | 'IA' | 'NUEVO' | 'MEJORADO'>('ALL');

  if (!isOpen) return null;

  const filtered = filter === 'ALL' ? DEPARTMENTS : DEPARTMENTS.filter(d => d.badge === filter);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={onClose} />

      <div className={clsx(
        'relative w-full max-w-6xl h-[90vh] cyber-panel flex flex-col overflow-hidden',
        isDarkMode ? 'bg-slate-900' : 'bg-white'
      )}>
        {/* Header */}
        <div className="px-8 py-5 border-b border-mcvill-card-border flex justify-between items-center bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-mcvill-accent/10 flex items-center justify-center text-mcvill-accent border border-mcvill-accent/20">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Manual Operativo — ERP MetalMecánica</h3>
              <p className="text-mcvill-accent text-[9px] font-black uppercase tracking-[0.4em] mt-0.5">
                {`${config.companyName} · ${DEPARTMENTS.length} Módulos · v2.5`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="px-8 py-3 border-b border-white/5 flex items-center gap-2 bg-slate-950/20 shrink-0 flex-wrap">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mr-2">Filtrar:</span>
          {(['ALL', 'CORE', 'IA', 'NUEVO', 'MEJORADO'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all',
                filter === f
                  ? f === 'ALL' ? 'bg-mcvill-accent text-white border-mcvill-accent' : BADGE_COLORS[f]
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
              )}
            >
              {f === 'ALL' ? `Todos (${DEPARTMENTS.length})` : f}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((dept) => (
              <div key={dept.id} className="cyber-panel p-5 bg-slate-950/20 border-mcvill-card-border hover:border-mcvill-accent/30 transition-all group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={clsx('w-9 h-9 rounded-xl bg-slate-900 border border-mcvill-card-border flex items-center justify-center group-hover:scale-110 transition-transform shrink-0', dept.color)}>
                      <dept.icon size={18} />
                    </div>
                    <h4 className="font-black text-[10px] text-white uppercase tracking-wider leading-tight">{dept.name}</h4>
                  </div>
                  <span className={clsx('px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border shrink-0 ml-1', BADGE_COLORS[dept.badge])}>
                    {dept.badge}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">{dept.description}</p>

                <div className="space-y-1.5 flex-1">
                  {dept.features.map((feature, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <Target size={9} className="text-mcvill-accent mt-[3px] shrink-0" />
                      <span className="text-[9px] text-slate-500 leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tips */}
          <div className="mt-8 p-6 rounded-3xl bg-mcvill-accent/5 border border-mcvill-accent/10">
            <div className="flex items-center gap-3 mb-5">
              <Zap size={18} className="text-mcvill-accent animate-pulse" />
              <h4 className="font-black text-[10px] text-white uppercase tracking-[0.3em]">Consejos Clave de Operación</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { n: '1', text: 'Usa el botón <b>WhatsApp</b> en Inventarios para notificar a compras instantáneamente sobre faltantes — sin llamadas, sin emails.' },
                { n: '2', text: 'El <b>Botón "ANÁLISIS IA"</b> en Calidad te permite subir una foto desde el celular y detectar defectos de soldadura, pintura o ensamble sin necesidad de instalar cámaras.' },
                { n: '3', text: 'El <b>Agente Cotizador</b> genera una propuesta completa en PDF desde una descripción de texto — listo para enviar al cliente en menos de 2 minutos.' },
                { n: '4', text: 'Usa <b>Nesting IA</b> antes de cada orden de corte — el sistema sugiere automáticamente retazos disponibles en inventario antes de abrir una lámina nueva.' },
                { n: '5', text: 'El <b>Reclutador IA</b> analiza CVs en PDF y genera la guía de entrevista personalizada — lo que tardaba días ahora se hace en minutos.' },
                { n: '6', text: 'El <b>Voice Link</b> (ícono de micrófono) funciona manos libres en el piso de planta — pregunta el stock de cualquier material sin tocar la pantalla.' },
              ].map(tip => (
                <div key={tip.n} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-900 border border-mcvill-card-border flex items-center justify-center text-[9px] font-black text-mcvill-accent shrink-0 mt-0.5">{tip.n}</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: tip.text }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-mcvill-card-border bg-slate-950/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{`${config.logoText} MetalMecánica · v2.5 · Desarrollado por ${config.developerName}`}</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-mcvill-accent text-white font-black text-[9px] tracking-widest uppercase rounded-xl transition-all shadow-lg hover:shadow-mcvill-accent/20 hover:opacity-90"
          >
            ¡Entendido, a Trabajar!
          </button>
        </div>
      </div>
    </div>
  );
};
