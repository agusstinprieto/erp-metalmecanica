// Central guide data for every ERP module.
// Each module has a title, icon name, color, and up to 5 steps with tips.

export interface GuideStep {
  icon: string;
  color: string;
  bg: string;
  title: string;
  subtitle: string;
  tips: string[];
}

export interface ModuleGuide {
  moduleId: string;
  label: string;
  emoji: string;
  description: string;
  steps: GuideStep[];
}

export const MODULE_GUIDES: Record<string, ModuleGuide> = {

  dashboard: {
    moduleId: 'dashboard',
    label: 'Tablero Principal',
    emoji: '📊',
    description: 'Tu centro de comando en tiempo real',
    steps: [
      {
        icon: 'LayoutDashboard', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'KPIs en Tiempo Real',
        subtitle: 'El pulso de la planta de un vistazo',
        tips: [
          '⚡ Los indicadores OEE, Eficiencia y ROI se actualizan automáticamente con datos reales de producción.',
          '🔴 Un KPI en rojo significa que está por debajo del umbral objetivo — toca para ver el detalle.',
          '📈 Usa el Dashboard en la reunión diaria de 10 minutos para revisar el estado de la planta.',
          '🤖 El ícono de cerebro en cada card activa el análisis IA de ese indicador.',
        ],
      },
      {
        icon: 'Bell', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Alertas Predictivas',
        subtitle: 'El ERP te avisa antes de que ocurra el problema',
        tips: [
          '🔔 Las alertas aparecen en la parte superior — amarillo = atención, rojo = acción inmediata.',
          '📦 Stock crítico, mantenimientos vencidos y órdenes retrasadas se consolidan aquí.',
          '✅ Toca "Resolver" en cada alerta para marcarla como atendida y limpiar el panel.',
        ],
      },
      {
        icon: 'Zap', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Acciones Rápidas',
        subtitle: 'Lanza operaciones sin navegar por menús',
        tips: [
          '➕ El botón "Nueva Orden" crea una orden de producción desde el Dashboard directamente.',
          '💬 El chat de IA en la esquina inferior derecha responde preguntas y ejecuta acciones del ERP.',
          '🎙️ El Voice Link (ícono de micrófono) te permite hablar con el ERP manos libres.',
        ],
      },
    ],
  },

  inventory: {
    moduleId: 'inventory',
    label: 'Inventarios Pro',
    emoji: '📦',
    description: 'Control absoluto de materia prima y stock',
    steps: [
      {
        icon: 'Package', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Catálogo de Materiales',
        subtitle: 'Todos tus materiales con stock en tiempo real',
        tips: [
          '🔍 Usa la barra de búsqueda para encontrar cualquier material por descripción, clave o proveedor.',
          '🔴 Los materiales en rojo tienen stock por debajo del mínimo definido — requieren compra urgente.',
          '📸 El botón de IA puede identificar materiales por foto (escaneo visual de almacén).',
          '📊 El indicador de barra muestra qué tan lleno está el almacén vs su máximo.',
        ],
      },
      {
        icon: 'AlertTriangle', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30',
        title: 'Stock Crítico y Alertas',
        subtitle: 'Nunca pares por falta de material',
        tips: [
          '⚠️ La pestaña "Críticos" filtra automáticamente materiales bajo el nivel mínimo de seguridad.',
          '📱 El botón de WhatsApp envía alerta directa al equipo de compras con la lista de faltantes.',
          '🤖 La IA puede sugerir cantidad óptima de reorden basada en consumo histórico.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Movimientos y Trazabilidad',
        subtitle: 'Historial completo de entradas y salidas',
        tips: [
          '📋 Cada entrada o salida queda registrada con fecha, usuario y orden de producción relacionada.',
          '🔄 "Ajuste de inventario" permite corregir discrepancias tras un conteo físico.',
          '📈 El gráfico de consumo muestra tendencia semanal para anticipar necesidades.',
        ],
      },
    ],
  },

  production: {
    moduleId: 'production',
    label: 'Control de Planta',
    emoji: '🏭',
    description: 'Órdenes de producción y trabajo en proceso',
    steps: [
      {
        icon: 'Factory', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Órdenes de Trabajo',
        subtitle: 'El corazón de la operación de manufactura',
        tips: [
          '📋 Cada tarjeta es una Orden de Trabajo (OT) con su progreso, etapas y operadores asignados.',
          '🎨 El color indica el estado: azul = en proceso, verde = completada, gris = pendiente.',
          '➕ "Nueva Orden" vincula automáticamente el proyecto de ingeniería y genera las etapas estándar.',
          '🔍 Filtra por estación (Corte, Soldadura, Maquinado) para ver solo tu área.',
        ],
      },
      {
        icon: 'GitBranch', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Etapas de Manufactura',
        subtitle: 'Rastreo pieza por pieza en cada estación',
        tips: [
          '▶️ Al iniciar una etapa, el sistema registra la hora de inicio y el operador responsable.',
          '✅ Al completar una etapa, avanza automáticamente a la siguiente en la secuencia.',
          '📸 Puedes adjuntar fotos de evidencia al completar cada etapa para trazabilidad.',
          '⏱️ El tiempo real vs estimado te dice si la orden va en tiempo o retrasada.',
        ],
      },
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'IA en Producción',
        subtitle: 'Detección automática de problemas',
        tips: [
          '🤖 El Neural Inspection Engine analiza fotos de piezas y detecta defectos automáticamente.',
          '🔴 Si detecta un fallo, crea una No Conformidad (NC) de manera autónoma en Calidad.',
          '📊 TV Mode proyecta el estado de producción en pantalla grande para el piso de planta.',
        ],
      },
    ],
  },

  viajeros: {
    moduleId: 'viajeros',
    label: 'Viajeros de Producción',
    emoji: '📄',
    description: 'Documentos de ruta que acompañan cada pieza',
    steps: [
      {
        icon: 'Route', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: '¿Qué es un Viajero?',
        subtitle: 'El pasaporte de tu pieza por la planta',
        tips: [
          '📄 El Viajero acompaña físicamente a cada pieza: número de parte, ruta, materiales y tolerancias.',
          '📱 Se genera en PDF profesional con código QR para rastreo en tiempo real.',
          '🏭 Cada estación firma electrónicamente al completar su operación.',
        ],
      },
      {
        icon: 'FileText', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Crear un Viajero',
        subtitle: 'De la orden al documento en segundos',
        tips: [
          '➕ "Nuevo Viajero": ingresa número de parte, cliente y cantidad — el resto lo calcula la IA.',
          '⚙️ La Ruta define la secuencia de operaciones + tiempos estándar.',
          '🖨️ Genera el PDF profesional con logo McVill listo para imprimir con un solo clic.',
        ],
      },
      {
        icon: 'QrCode', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Rastreo con QR',
        subtitle: 'Saber dónde está cada pieza en tiempo real',
        tips: [
          '📲 El QR se escanea en cada estación con la app móvil para actualizar el estado.',
          '🗺️ El mapa de producción muestra en qué etapa está cada pieza en tiempo real.',
          '📊 El historial de tiempos por operación da datos reales para mejorar los estándares.',
        ],
      },
    ],
  },

  planeacion: {
    moduleId: 'planeacion',
    label: 'Planeación IA',
    emoji: '📅',
    description: 'Gantt, MRP, capacidad y forecast en un solo lugar',
    steps: [
      {
        icon: 'CalendarDays', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Gantt de Producción',
        subtitle: 'Timeline visual de todas las órdenes activas',
        tips: [
          '📅 Cada barra es una OT. Los segmentos de color muestran el avance por etapa.',
          '⚡ "Optimizar con IA" sugiere reordenamientos para reducir tiempos muertos.',
          '🔵 Azul = en proceso | 🟢 Verde = completada | ⬜ Gris = pendiente.',
        ],
      },
      {
        icon: 'ShoppingCart', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'MRP — Materiales',
        subtitle: 'Detecta déficits antes de que paren la producción',
        tips: [
          '📦 El MRP cruza órdenes abiertas vs inventario y calcula qué hay que comprar.',
          '🤖 "Sugerencia IA Compras" genera la lista de compras priorizada automáticamente.',
          '🔴 Rojo = déficit crítico. Toca el material para ver qué órdenes lo requieren.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'S&OP: Ventas y Operaciones',
        subtitle: 'Valida si puedes cumplir lo que ventas promete',
        tips: [
          '💰 Muestra el pipeline de cotizaciones vs la capacidad operativa disponible.',
          '🤖 El análisis S&OP con IA responde: ¿podemos aceptar estas cotizaciones? ¿Qué riesgos hay?',
          '📈 Úsalo en la junta directiva para tomar decisiones con datos reales.',
        ],
      },
    ],
  },

  quality: {
    moduleId: 'quality',
    label: 'Calidad SGC',
    emoji: '✅',
    description: 'Inspección visual IA, no conformidades y auditorías ISO',
    steps: [
      {
        icon: 'Camera', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Inspección Visual con IA',
        subtitle: 'Sube fotos y detecta defectos en segundos',
        tips: [
          '📸 Botón "ANÁLISIS IA" → selecciona el tipo: 🔥 Soldadura, ⚙️ Ensamble, 🎨 Pintura, 📐 Dimensional, 🔩 Materia Prima.',
          '🤖 Gemini AI analiza la foto y entrega: veredicto PASS/FAIL, nivel de confianza y lista de defectos específicos.',
          '🔥 Modo Soldadura detecta: porosidades, fisuras, socavación, penetración incompleta y spatter.',
          '🎨 Modo Pintura detecta: chorreos, burbujas, cáscara de naranja y delaminación.',
          '📝 Agrega notas del inspector (ej. "MIG-MAG, acero A36") para un análisis más preciso.',
        ],
      },
      {
        icon: 'AlertTriangle', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30',
        title: 'No Conformidades (NC)',
        subtitle: 'Gestión completa del ciclo CAPA',
        tips: [
          '⚡ Cuando la IA detecta FAIL, crea una NC automáticamente con número único y severidad proporcional.',
          '📝 Una NC registra: tipo, severidad, causa raíz, acción correctiva y acción preventiva.',
          '🔄 Flujo: Abierta → En Proceso → Verificación → Cerrada.',
          '🏷️ Menor (cosmético) | Mayor (funcional) | Crítica (seguridad o cliente).',
        ],
      },
      {
        icon: 'Shield', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30',
        title: 'Auditorías ISO 9001',
        subtitle: 'Programa y documenta tus auditorías internas',
        tips: [
          '📋 Crea auditorías con alcance, auditor, área y fecha programada.',
          '📊 Al finalizar, registra hallazgos y resultado: Conforme / No Conforme / Observado.',
          '🔗 Las NCs encontradas en auditoría se vinculan automáticamente al registro.',
          '📈 Las métricas Six Sigma muestran la tasa de éxito y distribución de defectos.',
        ],
      },
    ],
  },

  factibilidad: {
    moduleId: 'factibilidad',
    label: 'Factibilidad IA',
    emoji: '🎯',
    description: 'Evalúa si una oportunidad vale la pena antes de cotizar',
    steps: [
      {
        icon: 'ShieldCheck', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: '¿Qué es la Factibilidad?',
        subtitle: 'El filtro inteligente antes de invertir en cotizar',
        tips: [
          '🎯 Evalúa si un proyecto es técnica, operativa y financieramente viable para McVill.',
          '📋 Sigue el formato FT-IG-01 — el estándar de evaluación aprobado por dirección.',
          '⚡ La IA analiza la descripción y da un dictamen en segundos vs horas de análisis manual.',
          '✅ Puntuación ≥70 = Viable. 45-69 = Viable con condiciones. <45 = No recomendado.',
        ],
      },
      {
        icon: 'Eye', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Análisis Visual de Plano',
        subtitle: 'Sube un plano o foto de la pieza',
        tips: [
          '📸 La IA identifica procesos requeridos (láser, doblez, soldadura) automáticamente desde la imagen.',
          '🔍 Detecta materiales, calibres y complejidad de la pieza.',
          '💰 Genera una pre-cotización estimada de tiempos por proceso.',
          '✅ Los resultados se envían directamente al módulo de Cotizaciones.',
        ],
      },
    ],
  },

  ventas: {
    moduleId: 'ventas',
    label: 'Ventas y CRM',
    emoji: '💼',
    description: 'Clientes, cotizaciones y pipeline comercial',
    steps: [
      {
        icon: 'CircleDollarSign', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Gestión de Clientes',
        subtitle: 'Tu base de clientes centralizada',
        tips: [
          '👥 Cada cliente tiene: contacto, historial de órdenes, crédito disponible y estado de cuenta.',
          '🔍 Busca por nombre, RFC o sector para encontrar rápidamente cualquier cliente.',
          '📊 El resumen muestra: órdenes activas, facturación acumulada y días de crédito.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Pipeline de Cotizaciones',
        subtitle: 'Sigue el avance de cada oportunidad',
        tips: [
          '📋 Las cotizaciones fluyen: Borrador → Enviada → Aprobada → Convertida a Orden.',
          '💰 El valor del pipeline te dice cuánto dinero potencial tienes en proceso.',
          '🤖 El Agente de Cotizaciones genera propuestas completas desde una descripción en lenguaje natural.',
        ],
      },
    ],
  },

  engineering: {
    moduleId: 'engineering',
    label: 'Ingeniería y Diseño',
    emoji: '⚙️',
    description: 'Proyectos, BOM, Blueprint Analyzer y Cotizador Industrial',
    steps: [
      {
        icon: 'Cpu', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Proyectos de Ingeniería',
        subtitle: 'De la idea al diseño controlado',
        tips: [
          '📐 Cada proyecto define: material, proceso, especificaciones técnicas y BOM.',
          '🔗 Al aprobar un proyecto, se convierte directamente en una Orden de Trabajo.',
          '📋 Las versiones del diseño quedan registradas — siempre sabes qué revisión se fabricó.',
        ],
      },
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'Blueprint Analyzer IA',
        subtitle: 'Extrae BOM de planos con inteligencia artificial',
        tips: [
          '📄 Sube un plano PDF o imagen — la IA extrae automáticamente la Lista de Materiales (BOM).',
          '⚡ Lo que antes tardaba horas de lectura manual, ahora toma 15 segundos.',
          '✏️ Puedes revisar y ajustar la BOM extraída antes de guardarla en el proyecto.',
          '🔗 La BOM se vincula al inventario para verificar disponibilidad inmediatamente.',
        ],
      },
      {
        icon: 'Calculator', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Cotizador Industrial IA',
        subtitle: 'Del plano al precio en segundos',
        tips: [
          '📸 Sube el plano de la pieza y la IA detecta procesos: corte, doblez, soldadura, maquinado.',
          '💰 Genera el desglose de costos por proceso con tasas reales de McVill.',
          '🔩 Analiza archivos STEP 3D para extracción automática de geometría y materiales.',
        ],
      },
    ],
  },

  nesting: {
    moduleId: 'nesting',
    label: 'Nesting & Optimizador',
    emoji: '🧩',
    description: 'Optimización de corte de lámina y gestión de retazos',
    steps: [
      {
        icon: 'Maximize', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Optimización de Corte',
        subtitle: 'Minimiza el desperdicio de lámina y placa',
        tips: [
          '🧩 El algoritmo organiza las piezas para aprovechar el máximo porcentaje del área disponible.',
          '📊 Reporte de aprovechamiento: el ERP te dice exactamente cuánto material se usó y cuánto sobró.',
          '📉 Reduce los costos de materia prima mediante un mejor acomodo de piezas.',
          '⚙️ Compatible con láminas estándar (1.22×2.44m) y tamaños personalizados.',
        ],
      },
      {
        icon: 'Recycle', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/20',
        title: 'Gestión de Retazos',
        subtitle: 'Recupera y reutiliza sobrantes útiles',
        tips: [
          '♻️ Los retazos con área útil se reingresan al inventario con una clave especial.',
          '🔍 Al buscar material, el ERP sugiere primero usar retazos antes de abrir una lámina nueva.',
          '⚖️ Control de mermas: reporta el desperdicio real para auditorías de materiales.',
          '💰 Ahorro estimado del 15-30% en materia prima con uso consistente del módulo.',
        ],
      },
    ],
  },

  agente_cot: {
    moduleId: 'agente_cot',
    label: 'Agente de Cotizaciones',
    emoji: '🤖',
    description: 'IA que genera cotizaciones profesionales automáticamente',
    steps: [
      {
        icon: 'BrainCircuit', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Cómo Funciona el Agente',
        subtitle: 'Describe en español — el agente hace el resto',
        tips: [
          '💬 Escribe en lenguaje natural: "50 estructuras de acero A36 para PEMEX, entrega en 30 días".',
          '🤖 El agente calcula: material, corte, soldadura, maquinado, pintura y overhead automáticamente.',
          '📄 Genera cotización profesional en PDF con logo McVill, lista para enviar al cliente.',
          '💾 Todas las cotizaciones se guardan con historial para referencia futura.',
        ],
      },
      {
        icon: 'FileText', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Ajustes y Personalización',
        subtitle: 'El agente sugiere — tú decides',
        tips: [
          '✏️ Puedes modificar cualquier partida, precio o descripción antes de generar el PDF.',
          '💹 El margen de utilidad se ajusta con el slider — el precio final se recalcula al instante.',
          '📊 La vista de análisis muestra el desglose de costos para entender la rentabilidad.',
          '🔄 Convierte la cotización aprobada en Orden de Producción con un solo clic.',
        ],
      },
    ],
  },

  rfq_kanban: {
    moduleId: 'rfq_kanban',
    label: 'Kanban de RFQs',
    emoji: '🗂️',
    description: 'Gestión visual de solicitudes de cotización',
    steps: [
      {
        icon: 'KanbanSquare', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Tablero Kanban de Cotizaciones',
        subtitle: 'Pipeline visual de todas tus oportunidades',
        tips: [
          '🗂️ Columnas: Nuevo → Análisis → Propuesta → Negociación → Cerrado.',
          '🖱️ Arrastra las tarjetas entre columnas para actualizar el estado.',
          '⚡ "Análisis IA" evalúa automáticamente la factibilidad de una RFQ.',
          '📊 El resumen superior muestra el valor total de cada etapa del pipeline.',
        ],
      },
      {
        icon: 'Zap', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'RFQ → Cotización Automática',
        subtitle: 'Del requerimiento a la propuesta en minutos',
        tips: [
          '📄 Carga el correo o PDF del cliente y la IA extrae automáticamente los requerimientos.',
          '💰 El Agente Cotizador calcula materiales, procesos, overhead y genera la propuesta.',
          '🔄 Puedes ajustar manualmente cualquier partida antes de enviar al cliente.',
        ],
      },
    ],
  },

  finance: {
    moduleId: 'finance',
    label: 'Finanzas y ROI',
    emoji: '💰',
    description: 'Flujo de caja, rentabilidad y costos proyectados',
    steps: [
      {
        icon: 'CircleDollarSign', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Flujo de Caja',
        subtitle: 'El dinero que entra y sale, proyectado semana a semana',
        tips: [
          '📊 El gráfico muestra cobros esperados vs pagos comprometidos para las próximas 8 semanas.',
          '🔴 Una semana en rojo significa flujo negativo — hay que acelerar cobranza o retrasar pagos.',
          '🤖 La IA proyecta el flujo basándose en órdenes activas y condiciones de crédito.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Rentabilidad por Proyecto',
        subtitle: 'Saber exactamente cuánto gana cada orden',
        tips: [
          '💹 Cada orden muestra: costo real acumulado vs precio de venta vs margen proyectado.',
          '⚠️ Si el costo real supera el presupuesto, aparece alerta de erosión de margen.',
          '📈 El ROI del ERP calcula el retorno basado en eficiencias logradas en tiempo real.',
        ],
      },
    ],
  },

  rh: {
    moduleId: 'rh',
    label: 'Capital Humano y RH',
    emoji: '👥',
    description: 'Empleados, reclutamiento IA y gestión de talento',
    steps: [
      {
        icon: 'Users', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Directorio de Empleados',
        subtitle: 'Expediente digital completo de cada colaborador',
        tips: [
          '📂 Almacena foto, documentos, certificaciones, IMSS y contrato de forma segura.',
          '📈 Matriz de habilidades: visualiza qué operador está capacitado para cada máquina o proceso.',
          '🔍 Filtra por área, turno o certificación para asignar personal al instante.',
          '⏰ Integrado con Asistencia y Nómina — los cambios se propagan automáticamente.',
        ],
      },
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'Reclutamiento con IA',
        subtitle: 'Del CV al candidato ideal en minutos',
        tips: [
          '📄 Crea vacantes con perfil de puesto — la IA lo usa como criterio de evaluación.',
          '🤖 Sube CVs en PDF: el agente los analiza, los califica y detecta fortalezas y brechas.',
          '📊 Cada candidato recibe puntuación de compatibilidad con recomendación de entrevista.',
          '🚀 Genera guía de entrevista personalizada basada en las brechas detectadas automáticamente.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Onboarding y Capacitación',
        subtitle: 'Integración acelerada de nuevos ingresos',
        tips: [
          '📋 El plan de onboarding se genera automáticamente según el puesto y área asignada.',
          '🎯 Lista de verificación de capacitaciones obligatorias (seguridad, calidad, proceso).',
          '📅 Seguimiento del avance de nuevos empleados durante los primeros 90 días.',
        ],
      },
    ],
  },

  payroll: {
    moduleId: 'payroll',
    label: 'Nómina',
    emoji: '💵',
    description: 'Cálculo automático de nómina basado en asistencia real',
    steps: [
      {
        icon: 'CircleDollarSign', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Cálculo de Nómina',
        subtitle: 'Nómina automática basada en asistencia real',
        tips: [
          '💰 La nómina se calcula automáticamente usando las asistencias y el salario registrado.',
          '⏱️ Las horas extra detectadas en asistencia se incluyen automáticamente.',
          '📋 Genera el recibo de nómina en PDF para cada empleado con un clic.',
        ],
      },
      {
        icon: 'FileText', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Deducciones e Incidencias',
        subtitle: 'Control de faltas, permisos y descuentos',
        tips: [
          '📝 Registra incidencias: falta justificada, permiso con goce, incapacidad, etc.',
          '🔗 Las incidencias del módulo de Asistencia se sincronizan automáticamente con Nómina.',
          '✅ Aprueba la nómina antes de procesar para validar que todo esté correcto.',
        ],
      },
    ],
  },

  attendance: {
    moduleId: 'attendance',
    label: 'Control de Asistencia',
    emoji: '🕐',
    description: 'Check-in, check-out y reportes de asistencia',
    steps: [
      {
        icon: 'CalendarCheck', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Registro de Entrada y Salida',
        subtitle: 'Asistencia digital con código o QR',
        tips: [
          '📲 El empleado escanea su código o QR en la tablet de entrada para registrar su asistencia.',
          '⏰ El sistema detecta automáticamente tardanzas (después de la hora de inicio de turno).',
          '🟢 Verde = a tiempo | 🟡 Amarillo = tardanza | 🔴 Rojo = ausente.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Reportes de Asistencia',
        subtitle: 'Analiza patrones y detecta ausentismo',
        tips: [
          '📊 El reporte diario muestra quién está presente, con tardanza o ausente en tiempo real.',
          '📈 El reporte semanal identifica empleados con patrón de ausencias recurrentes.',
          '💬 Desde el chat IA puedes pedir "reporte de faltas de hoy" y lo obtienes al instante.',
        ],
      },
    ],
  },

  desempeno: {
    moduleId: 'desempeno',
    label: 'Desempeño e Incentivos',
    emoji: '🏆',
    description: 'KPIs de operadores, ranking y sistema de bonos',
    steps: [
      {
        icon: 'Medal', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Métricas de Desempeño',
        subtitle: 'Evalúa a tu equipo con datos objetivos',
        tips: [
          '📊 Cada operador tiene KPIs: eficiencia, calidad, asistencia y cumplimiento de tiempos.',
          '🏆 El ranking muestra quiénes son los mejores operadores por área y turno.',
          '📈 Las métricas se actualizan automáticamente con datos de producción y asistencia.',
        ],
      },
      {
        icon: 'CircleDollarSign', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Sistema de Incentivos',
        subtitle: 'Premia el desempeño excepcional automáticamente',
        tips: [
          '💰 Define bonos basados en umbrales de KPI (ej. bono si eficiencia >95%).',
          '✅ El supervisor aprueba los incentivos calculados antes de enviarlos a Nómina.',
          '📋 Historial completo de incentivos pagados por empleado y período.',
        ],
      },
    ],
  },

  maintenance: {
    moduleId: 'maintenance',
    label: 'Mantenimiento',
    emoji: '🔧',
    description: 'Activos, mantenimiento preventivo y correctivo',
    steps: [
      {
        icon: 'Wrench', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30',
        title: 'Gestión de Activos',
        subtitle: 'Registro y salud de cada máquina',
        tips: [
          '🏭 Cada activo tiene: número de serie, fecha de compra, ubicación y Health Score.',
          '💚 Health Score 80-100 = excelente. 60-79 = atención. <60 = mantenimiento urgente.',
          '📸 Puedes adjuntar fotos del activo y su estado para documentación visual.',
        ],
      },
      {
        icon: 'Clock', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Mantenimiento Preventivo',
        subtitle: 'Anticípate a las fallas antes de que ocurran',
        tips: [
          '📅 Define planes preventivos con frecuencia: diaria, semanal, mensual o por horas de uso.',
          '🔔 El sistema genera alertas automáticas cuando se acerca la fecha del próximo mantenimiento.',
          '✅ Al ejecutar, registra: técnico, duración, partes usadas y observaciones.',
          '🤖 La IA analiza el historial y predice cuándo podría fallar una máquina.',
        ],
      },
    ],
  },

  hse: {
    moduleId: 'hse',
    label: 'Seguridad HSE',
    emoji: '🦺',
    description: 'Seguridad industrial, incidentes y cumplimiento NOM',
    steps: [
      {
        icon: 'ShieldAlert', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30',
        title: 'Registro de Incidentes',
        subtitle: 'Documenta y analiza cada evento de seguridad',
        tips: [
          '⚠️ Registra incidentes: tipo, área, empleado involucrado, descripción y acción inmediata.',
          '📊 El mapa de calor muestra qué áreas tienen mayor frecuencia de eventos.',
          '🔍 Cada incidente requiere análisis de causa raíz y medida correctiva documentada.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Cumplimiento y EPP',
        subtitle: 'Control de equipo de protección y capacitaciones',
        tips: [
          '🦺 Registro del EPP asignado a cada empleado con fecha de entrega y vida útil.',
          '📋 Las capacitaciones de seguridad se registran con fecha y vencimiento para renovación.',
          '🔔 Alertas automáticas cuando vence el EPP o la certificación de un empleado.',
          '📑 Cumplimiento de NOMs: NOM-001, NOM-017, NOM-026 y más.',
        ],
      },
    ],
  },

  spc: {
    moduleId: 'spc',
    label: 'Control Estadístico (SPC)',
    emoji: '📉',
    description: 'Cartas de control X̄-R y análisis de capacidad de proceso',
    steps: [
      {
        icon: 'Activity', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: '¿Qué es el SPC?',
        subtitle: 'Detecta variación del proceso antes de producir defectos',
        tips: [
          '📊 El SPC usa datos de medición para detectar si un proceso está fuera de control estadístico.',
          '📏 Define una característica (ej. diámetro 50±0.05mm) y registra mediciones en tiempo real.',
          '🔔 Si una medición cae fuera de los límites, el sistema alerta automáticamente.',
          '🤖 La IA detecta las 4 reglas de Nelson: cambios de nivel, tendencias y ciclos.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Capacidad de Proceso (Cp, Cpk)',
        subtitle: 'Mide qué tan bueno es tu proceso estadísticamente',
        tips: [
          '📈 Cp ≥1.33 = proceso capaz (menos de 63 ppm de defectos).',
          '⚠️ Cpk <1.0 = proceso no capaz — hay que investigar y ajustar.',
          '🏭 Monitorea varios procesos simultáneamente desde la vista de características.',
        ],
      },
    ],
  },

  work_instructions: {
    moduleId: 'work_instructions',
    label: 'Instrucciones WI',
    emoji: '📖',
    description: 'Manuales digitales de operación por estación',
    steps: [
      {
        icon: 'BookOpen', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30',
        title: 'Guías de Operación',
        subtitle: 'Instrucciones paso a paso con apoyo visual',
        tips: [
          '🖼️ Cada instrucción incluye fotos del "Cómo debe quedar" para asegurar la calidad.',
          '⚠️ Los puntos críticos de seguridad se resaltan en rojo para prevenir accidentes.',
          '🔄 Al actualizar una WI en ingeniería, el cambio llega a toda la planta al instante.',
        ],
      },
      {
        icon: 'CheckSquare', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/20',
        title: 'Puntos de Control',
        subtitle: 'Validación en cada etapa del proceso',
        tips: [
          '✅ El operador confirma puntos de control antes de avanzar a la siguiente operación.',
          '📏 Incluye tolerancias y herramientas de medición requeridas para cada paso.',
          '📋 Los registros de cumplimiento se guardan en el historial del Viajero automáticamente.',
        ],
      },
    ],
  },

  visual_ia: {
    moduleId: 'visual_ia',
    label: 'Inspección Visual IA',
    emoji: '👁️',
    description: 'Detección automática de defectos por visión neural con IA',
    steps: [
      {
        icon: 'Camera', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Captura y Análisis',
        subtitle: 'Inspección de piezas desde cualquier dispositivo',
        tips: [
          '📱 Funciona desde celular, tablet o computadora — no se requieren cámaras especiales.',
          '🔥 Tipo Soldadura: detecta porosidades, fisuras, socavación, salpicaduras y cráteres.',
          '⚙️ Tipo Ensamble: detecta piezas faltantes, tornillos sueltos y desalineaciones.',
          '🎨 Tipo Pintura: detecta chorreos, burbujas, cáscara de naranja y delaminación.',
          '📐 Tipo Dimensional: detecta rebabas, deformaciones y perforaciones mal ubicadas.',
        ],
      },
      {
        icon: 'AlertCircle', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/30',
        title: 'Alertas y NCs Automáticas',
        subtitle: 'Gestión automática de no conformidades',
        tips: [
          '⚠️ Si la IA detecta FAIL, crea automáticamente una No Conformidad con número único.',
          '📊 La severidad se asigna según la confianza: >85% = Crítica, >60% = Mayor, <60% = Menor.',
          '🔔 Envía alerta inmediata al supervisor si se detecta un defecto crítico.',
          '📈 Historial de inspecciones para detectar tendencias de fallos por proceso o máquina.',
        ],
      },
    ],
  },
};

export const DEFAULT_GUIDE: ModuleGuide = {
  moduleId: 'default',
  label: 'Control ERP McVill',
  emoji: '⚡',
  description: 'Asistente de operaciones industriales con IA',
  steps: [
    {
      icon: 'Cpu', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
      title: 'Control Core v2.5',
      subtitle: 'Tu sistema ERP con inteligencia artificial',
      tips: [
        '💬 El chat IA en la esquina inferior derecha responde preguntas y ejecuta acciones del ERP.',
        '🎙️ El Voice Link (ícono de micrófono) te guía por voz — pregunta cualquier cosa sobre este módulo.',
        '❓ El botón "Guía" en cualquier módulo abre este tutorial paso a paso.',
        '⚡ El sistema aprende de los datos de McVill y da respuestas contextuales en tiempo real.',
      ],
    },
  ],
};
