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
    description: 'Check-in, check-out, Face ID Biométrico e IP Geofencing',
    steps: [
      {
        icon: 'CalendarCheck', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Kiosco Face ID Biométrico',
        subtitle: 'Asistencia rápida para personal de taller',
        tips: [
          '👤 Pestaña "Face ID IA": Una tablet o pantalla única en la entrada actúa como Kiosco colectivo para operarios.',
          '🤖 Usa una sola licencia global con supervisor: Sin necesidad de que los operarios tengan contraseñas o PCs.',
          '⚡ Escaneo ultra veloz: Captura de rostro en <2s con mapa térmico corporal de 36.5 °C y prueba de vitalidad.',
          '🔗 Integración neural: Gemini Vision reconoce al operario y procesa el fichaje directo en Supabase.',
        ],
      },
      {
        icon: 'Laptop', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30',
        title: 'Fichaje de Escritorio con IP/GPS',
        subtitle: 'Asistencia para personal administrativo',
        tips: [
          '💼 Los administrativos fichan directo con 1 clic desde el Dashboard del ERP con su usuario activo.',
          '🔒 Blindaje Geográfico: El botón solo se habilita si se conectan desde la IP pública corporativa de la planta.',
          '📍 Geocerca GPS: El sistema valida que el navegador esté dentro de un radio de 50 metros de las oficinas.',
          '🚫 Evita el fraude: Bloquea automáticamente intentos de fichaje fuera de la zona autorizada.',
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
          '🎙️ Por Voice Link puedes preguntar: "Quién llegó tarde hoy" o "Lista de ausentes de la planta".',
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
    label: 'SEGURIDAD',
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
          '📑 Cumplimiento de NOMs: NOM-017-STPS-2008 (EPP), NOM-010-STPS-2014 (Sustancias), NOM-113-STPS-2009 (Calzado).',
        ],
      },
      {
        icon: 'Eye', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/30',
        title: 'Inspección Neural EPP en Piso',
        subtitle: 'Escaneo de seguridad automatizado con IA',
        tips: [
          '🤖 Escaneo de EPP por IA: El botón "Scan EPP" en las cámaras de seguridad analiza el equipo de los operarios.',
          '📹 Simulación en planta: Celdas activas (Soldadura C2 con chispas, Almacén C3, Pintura C5) muestran estados de EPP.',
          '⚡ Barrido Láser IA: Toma captura base64 y envía a Gemini Vision para auditar casco, guantes, careta y lentes.',
          '🔊 Alarma Industrial: Web Audio API genera un zumbador nativo de 120dB si detecta operarios sin EPP.',
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

  roi: {
    moduleId: 'roi',
    label: 'Cotizador ROI',
    emoji: '📈',
    description: 'Calcula el retorno de inversión de proyectos y propuestas',
    steps: [
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Análisis de Retorno',
        subtitle: 'Evalúa la rentabilidad antes de comprometerte',
        tips: [
          '💰 Ingresa el costo del proyecto y los ahorros o ingresos esperados por período.',
          '📊 El sistema calcula automáticamente: ROI, Payback Period y VPN.',
          '🤖 La IA compara con proyectos similares del historial para validar supuestos.',
          '📄 Genera reporte ejecutivo en PDF listo para presentar a dirección.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Escenarios Comparativos',
        subtitle: 'Compara opción A vs opción B',
        tips: [
          '🔄 Crea múltiples escenarios con diferentes supuestos para ver cuál conviene más.',
          '📈 El gráfico de flujo acumulado muestra cuándo se recupera la inversión visualmente.',
          '⚠️ El análisis de sensibilidad indica qué variables impactan más el ROI.',
        ],
      },
    ],
  },

  compras: {
    moduleId: 'compras',
    label: 'Gestión de Compras',
    emoji: '🛒',
    description: 'Órdenes de compra, proveedores y seguimiento',
    steps: [
      {
        icon: 'ShoppingCart', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Órdenes de Compra',
        subtitle: 'Desde la solicitud hasta la recepción',
        tips: [
          '📋 Crea una OC desde la lista de materiales críticos del módulo de Inventarios.',
          '📄 Genera PDF de orden de compra profesional con términos y condiciones.',
          '🔄 Flujo: Borrador → Aprobada → Enviada al Proveedor → Recibida → Cerrada.',
          '📦 Al recibir, el stock del almacén se actualiza automáticamente.',
        ],
      },
      {
        icon: 'Users', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Directorio de Proveedores',
        subtitle: 'Evalúa y selecciona el mejor proveedor',
        tips: [
          '⭐ Cada proveedor tiene score de desempeño: cumplimiento, calidad y precio.',
          '🤖 La IA sugiere el proveedor óptimo para cada material basado en historial.',
          '📊 Compara cotizaciones de varios proveedores en una sola pantalla.',
        ],
      },
    ],
  },

  factibilidad_ia: {
    moduleId: 'factibilidad_ia',
    label: 'Factibilidad IA Avanzada',
    emoji: '🧠',
    description: 'Análisis profundo de factibilidad con IA generativa',
    steps: [
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'Análisis IA Profundo',
        subtitle: 'Más allá del formulario estándar',
        tips: [
          '💬 Describe el proyecto en lenguaje natural — la IA hace las preguntas clave.',
          '🔍 Analiza: complejidad técnica, capacidad disponible, riesgo de mercado y margen estimado.',
          '📊 Dictamen con score 0-100 y lista de factores de riesgo priorizados.',
          '📄 Genera reporte de factibilidad formal para archivo o presentación al cliente.',
        ],
      },
      {
        icon: 'Camera', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Análisis por Imagen',
        subtitle: 'Sube plano o foto de la pieza',
        tips: [
          '📸 La IA extrae procesos, materiales y estimados de tiempo desde la imagen del plano.',
          '⚡ Respuesta en segundos vs horas de análisis manual.',
          '✅ Los resultados fluyen directamente al Agente de Cotizaciones.',
        ],
      },
    ],
  },

  metal_quoter: {
    moduleId: 'metal_quoter',
    label: 'Cotizador Metal',
    emoji: '🔩',
    description: 'Cotización especializada para piezas metálicas',
    steps: [
      {
        icon: 'Calculator', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Cotización por Proceso',
        subtitle: 'Desglose detallado por operación metalmecánica',
        tips: [
          '🔩 Define el proceso: Corte Láser, Doblez, Soldadura, Maquinado CNC, Pintura o Ensamble.',
          '📐 Ingresa dimensiones, calibre y material — el sistema calcula el costo de materia prima.',
          '⏱️ Los tiempos estándar de McVill se aplican automáticamente por proceso.',
          '💰 El overhead y margen se configuran globalmente desde Configuración.',
        ],
      },
      {
        icon: 'FileText', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Cotización Multi-Partida',
        subtitle: 'Cotiza ensambles con múltiples piezas',
        tips: [
          '📋 Agrega todas las piezas del ensamble como partidas individuales.',
          '📄 Genera cotización PDF con logo, desglose y condiciones comerciales.',
          '🔄 Convierte la cotización aprobada en Orden de Producción directamente.',
        ],
      },
    ],
  },

  costing: {
    moduleId: 'costing',
    label: 'Control de Costos',
    emoji: '💲',
    description: 'Análisis de costos reales vs presupuestados por orden',
    steps: [
      {
        icon: 'BarChart3', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Costo Real por Orden',
        subtitle: 'Lo que realmente te costó vs lo cotizado',
        tips: [
          '📊 Cada OT acumula: material consumido + horas-hombre reales + overhead aplicado.',
          '⚠️ Si el costo real supera el presupuesto, aparece alerta de erosión de margen.',
          '💹 El margen neto se actualiza en tiempo real conforme avanza la producción.',
          '🔍 Drill-down por categoría para identificar dónde se fue el presupuesto.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Análisis de Rentabilidad',
        subtitle: 'Qué productos y clientes son más rentables',
        tips: [
          '📈 Ranking de órdenes por margen — identifica las más y menos rentables.',
          '👥 Rentabilidad por cliente: quiénes generan más valor real para McVill.',
          '🤖 La IA identifica patrones de pérdida y sugiere ajustes de precio o proceso.',
        ],
      },
    ],
  },

  costeo: {
    moduleId: 'costeo',
    label: 'Costeo en Vivo',
    emoji: '⚡',
    description: 'Costeo dinámico en tiempo real con variaciones de precio',
    steps: [
      {
        icon: 'Gauge', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Costeo Dinámico',
        subtitle: 'El costo del producto se actualiza con el mercado',
        tips: [
          '📡 Los precios de materia prima se actualizan en tiempo real desde proveedores.',
          '⚡ Al cambiar el precio del acero, todas las cotizaciones activas se recalculan.',
          '🔔 Alerta cuando el costo real supera el precio de venta comprometido.',
        ],
      },
      {
        icon: 'LineChart', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Simulador de Precios',
        subtitle: 'Qué pasa si el acero sube 10%',
        tips: [
          '🎚️ Ajusta los sliders de materia prima y mano de obra para ver el impacto en margen.',
          '📊 Analiza qué porcentaje del costo es fijo vs variable para cada producto.',
          '💰 Úsalo antes de negociar contratos a largo plazo para blindar el margen.',
        ],
      },
    ],
  },

  recruitment: {
    moduleId: 'recruitment',
    label: 'Reclutamiento IA',
    emoji: '🎯',
    description: 'Análisis de CVs con IA y gestión de candidatos',
    steps: [
      {
        icon: 'UserSearch', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Análisis de CVs con IA',
        subtitle: 'Del CV al candidato ideal en minutos',
        tips: [
          '📄 Crea una vacante con el perfil de puesto — la IA lo usa como criterio de evaluación.',
          '🤖 Sube CVs en PDF: el agente los analiza, califica y detecta fortalezas y brechas.',
          '📊 Cada candidato recibe puntuación de compatibilidad (0-100) con justificación.',
          '🚀 Genera guía de entrevista personalizada basada en las brechas detectadas.',
        ],
      },
      {
        icon: 'ClipboardList', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Pipeline de Candidatos',
        subtitle: 'Gestión visual del proceso de selección',
        tips: [
          '🗂️ Tablero Kanban: Nuevo → Revisión → Entrevista → Oferta → Contratado.',
          '📅 Agenda entrevistas y registra notas directamente en la tarjeta del candidato.',
          '✅ Al contratar, los datos fluyen automáticamente al módulo de RH y onboarding.',
        ],
      },
    ],
  },

  trazabilidad: {
    moduleId: 'trazabilidad',
    label: 'Trazabilidad de Partes',
    emoji: '🔗',
    description: 'Rastrea cada número de parte a través de su ciclo de vida',
    steps: [
      {
        icon: 'GitBranch', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Árbol de Trazabilidad',
        subtitle: 'El historial completo de cada pieza',
        tips: [
          '🔍 Busca por número de parte y ve: cuándo entró, qué proceso tuvo y a quién se entregó.',
          '🌳 El árbol BOM muestra la relación entre componentes y ensambles.',
          '📦 Rastreo de lote: de qué materia prima vino y en qué órdenes se usó.',
          '🚨 En caso de un defecto, identifica en segundos todos los productos afectados.',
        ],
      },
      {
        icon: 'QrCode', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Trazabilidad por QR',
        subtitle: 'Escanea y conoce todo sobre esa pieza',
        tips: [
          '📲 Escanea el QR del Viajero para ver el historial completo de la pieza al instante.',
          '📸 Evidencia fotográfica por etapa: qué aspecto tenía en cada punto del proceso.',
          '📋 Informe de trazabilidad en PDF para auditorías de cliente o certificaciones.',
        ],
      },
    ],
  },

  defect_library: {
    moduleId: 'defect_library',
    label: 'Biblioteca de Defectos',
    emoji: '📚',
    description: 'Catálogo visual de defectos y lecciones aprendidas',
    steps: [
      {
        icon: 'Library', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Catálogo de Defectos',
        subtitle: 'Aprende de los errores del pasado',
        tips: [
          '📸 Cada defecto tiene: foto de referencia, descripción, causa raíz y acción correctiva.',
          '🔍 Busca por tipo de proceso (soldadura, maquinado) o severidad para referencia rápida.',
          '🤖 La IA vincula nuevas NCs con defectos similares del catálogo automáticamente.',
          '📚 Úsalo como material de capacitación para nuevos inspectores y operadores.',
        ],
      },
      {
        icon: 'BrainCircuit', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30',
        title: 'Lecciones Aprendidas',
        subtitle: 'El conocimiento de McVill documentado',
        tips: [
          '💡 Cada lección tiene: situación, lo que pasó, impacto y cómo evitarlo.',
          '🔔 Cuando se abre una NC similar, el sistema sugiere la lección aprendida relevante.',
          '📊 Dashboard de frecuencia: qué defectos se repiten más y en qué áreas.',
        ],
      },
    ],
  },

  ppap: {
    moduleId: 'ppap',
    label: 'PPAP / FAI',
    emoji: '📋',
    description: 'Paquete de aprobación de producción de partes',
    steps: [
      {
        icon: 'FileCheck2', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Creación de PPAP',
        subtitle: 'Aprobación formal de partes nuevas',
        tips: [
          '📋 El PPAP incluye: plano de control, FMEA, resultados dimensionales y muestras.',
          '📐 Registra las mediciones de la primera pieza (FAI) contra las tolerancias del plano.',
          '✅ El sistema verifica que todos los elementos requeridos estén completos antes de enviar.',
          '📄 Genera el paquete PPAP en PDF con todos los elementos del nivel seleccionado.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Seguimiento de Aprobación',
        subtitle: 'Estado en tiempo real del proceso PPAP',
        tips: [
          '🔄 Flujo: En Preparación → Enviado al Cliente → En Revisión → Aprobado / Rechazado.',
          '🔔 Alertas automáticas cuando el cliente solicita correcciones.',
          '📁 Archivo digital de todos los PPAPs por parte y cliente para auditorías.',
        ],
      },
    ],
  },

  voc: {
    moduleId: 'voc',
    label: 'Voz del Cliente (VOC)',
    emoji: '💬',
    description: 'Captura y gestiona retroalimentación del cliente',
    steps: [
      {
        icon: 'MessageCircle', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Registro de Feedback',
        subtitle: 'Lo que el cliente dice, documentado y accionable',
        tips: [
          '📝 Registra quejas, sugerencias y felicitaciones directamente del cliente.',
          '🔗 Vincula el feedback con la orden de producción y el área responsable.',
          '⚡ Las quejas se convierten automáticamente en No Conformidades con seguimiento.',
          '📊 El NPS y satisfacción del cliente se calculan automáticamente.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Análisis de Tendencias',
        subtitle: 'Qué aspectos mejorar primero',
        tips: [
          '📈 Pareto de quejas: las 3 causas más frecuentes son las que más impactan.',
          '🤖 La IA analiza el sentimiento del feedback y prioriza acciones de mejora.',
          '📋 Reportes de VOC para revisión de dirección y auditorías de cliente.',
        ],
      },
    ],
  },

  layout_design: {
    moduleId: 'layout_design',
    label: 'Diseño de Layout',
    emoji: '🗺️',
    description: 'Diseño y optimización del flujo de estaciones de trabajo',
    steps: [
      {
        icon: 'Layout', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Layout de Planta',
        subtitle: 'Diseña el flujo óptimo de producción',
        tips: [
          '🗺️ Arrastra y coloca estaciones de trabajo en el plano de la planta.',
          '🔄 Las flechas de flujo muestran el recorrido del material entre estaciones.',
          '⚡ El análisis de distancias identifica movimientos innecesarios (muda de transporte).',
          '🤖 La IA sugiere reordenamientos para minimizar distancia recorrida por pieza.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Análisis de Capacidad',
        subtitle: 'Balancea la carga entre estaciones',
        tips: [
          '⚖️ La gráfica de balance de línea muestra qué estaciones son el cuello de botella.',
          '📊 Eficiencia de línea: qué porcentaje del tiempo está el operador productivo.',
          '🏭 Simula el impacto de agregar o mover una estación antes de mover el equipo real.',
        ],
      },
    ],
  },

  process_simulator: {
    moduleId: 'process_simulator',
    label: 'Simulador de Procesos',
    emoji: '🧪',
    description: 'Simula y optimiza procesos antes de implementarlos',
    steps: [
      {
        icon: 'FlaskConical', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Simulación de Proceso',
        subtitle: 'Prueba cambios sin riesgo en la planta real',
        tips: [
          '🧪 Define el proceso: etapas, tiempos, recursos y tasas de fallo por etapa.',
          '▶️ Corre la simulación con el volumen de producción del mes y ve el resultado.',
          '📊 Métricas de salida: throughput, WIP promedio, utilización y tiempo de ciclo.',
          '🤖 La IA sugiere el proceso óptimo basado en los parámetros definidos.',
        ],
      },
      {
        icon: 'TrendingUp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Comparación de Escenarios',
        subtitle: 'Antes vs después de la mejora',
        tips: [
          '🔄 Simula el proceso actual vs el proceso propuesto lado a lado.',
          '💰 Calcula el impacto económico de la mejora: horas ahorradas × costo hora.',
          '📋 Genera reporte de análisis para justificar la inversión en el cambio.',
        ],
      },
    ],
  },

  shop_floor: {
    moduleId: 'shop_floor',
    label: 'Shop Floor Monitor',
    emoji: '🏭',
    description: 'Monitor en tiempo real del piso de producción',
    steps: [
      {
        icon: 'Scan', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Panel de Piso en Vivo',
        subtitle: 'El estado de cada máquina y operador en tiempo real',
        tips: [
          '🟢 Verde = produciendo | 🟡 Amarillo = setup/cambio | 🔴 Rojo = paro / falla.',
          '📡 Los datos se actualizan cada 30 segundos desde los registros de producción.',
          '📺 Activa el modo TV para proyectar en la pantalla del piso de planta.',
          '⚡ Al detectar un paro, se genera alerta automática al supervisor del área.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'OEE y Tiempos Muertos',
        subtitle: 'Mide la efectividad real del equipo',
        tips: [
          '📊 OEE = Disponibilidad × Rendimiento × Calidad — el índice más completo de planta.',
          '⏱️ Registra tiempos muertos con categoría: mecánico, material, operador, cambio.',
          '📈 Pareto de paros: los 5 problemas que causan el 80% del tiempo perdido.',
        ],
      },
    ],
  },

  minutas: {
    moduleId: 'minutas',
    label: 'Minutas IA',
    emoji: '📝',
    description: 'Generación automática de minutas de reunión con IA',
    steps: [
      {
        icon: 'ScrollText', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Crear Minuta con IA',
        subtitle: 'De la reunión al documento en segundos',
        tips: [
          '🎙️ Pega el transcript de la reunión o escribe los puntos tratados.',
          '🤖 La IA estructura automáticamente: asistentes, temas, acuerdos y responsables.',
          '📅 Cada acuerdo tiene responsable y fecha límite — queda en el sistema para seguimiento.',
          '📄 Genera el PDF de la minuta con formato profesional McVill en un clic.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Seguimiento de Acuerdos',
        subtitle: 'Nadie olvida un compromiso',
        tips: [
          '📋 El panel de acuerdos muestra todos los pendientes con semáforo de vencimiento.',
          '🔔 Notificación automática al responsable cuando se acerca la fecha límite.',
          '✅ Al marcar como cumplido, queda documentado quién y cuándo lo cerró.',
        ],
      },
    ],
  },

  seguridad: {
    moduleId: 'seguridad',
    label: 'Cámaras & Seguridad Neural',
    emoji: '📹',
    description: 'Monitoreo de cámaras IP con escaneo de EPP por IA',
    steps: [
      {
        icon: 'Camera', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30',
        title: 'Cámaras de Seguridad en Vivo',
        subtitle: 'Monitoreo continuo del piso de planta',
        tips: [
          '📹 Panel de 4 cámaras en tiempo real: Soldadura C2, Almacén C3, Pintura C5 y Ensamble C7.',
          '🟢 Indicador de estado por celda: PRODUCIENDO, SETUP, PARO o SIN SEÑAL.',
          '🔊 Alarma Industrial: si detecta operario sin EPP, Web Audio genera alerta de 120dB.',
          '📡 Las cámaras IP se conectan mediante RTSP — sin hardware propietario.',
        ],
      },
      {
        icon: 'ScanSearch', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Barrido Neural de EPP',
        subtitle: 'IA detecta si el operario lleva el equipo de protección',
        tips: [
          '🤖 Botón "Scan EPP" captura el frame de la cámara y lo envía a Gemini Vision.',
          '⚡ En menos de 3 segundos el sistema audita: casco, guantes, careta, lentes y calzado.',
          '🔴 Si detecta incumplimiento, crea alerta HSE automáticamente con foto de evidencia.',
          '📊 El registro diario de escaneos alimenta el dashboard de cumplimiento HSE.',
        ],
      },
      {
        icon: 'ShieldAlert', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Integración con HSE',
        subtitle: 'Seguridad preventiva conectada al módulo HSE',
        tips: [
          '🔗 Cada alerta de EPP se registra automáticamente en el historial HSE del empleado.',
          '📋 Reporte semanal de cumplimiento por área: % de escaneos con EPP completo.',
          '🎯 Meta: 100% de cumplimiento — el sistema envía recordatorio si baja del 90%.',
        ],
      },
    ],
  },

  banco: {
    moduleId: 'banco',
    label: 'Módulo de Banco',
    emoji: '🏦',
    description: 'Gestión de cuentas bancarias, movimientos y conciliación',
    steps: [
      {
        icon: 'Landmark', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Cuentas Bancarias',
        subtitle: 'Todas las cuentas de McVill en un solo lugar',
        tips: [
          '🏦 Registra tus cuentas: banco, número de cuenta, CLABE, moneda y saldo actual.',
          '💳 Cuentas en MXN y USD — el saldo en USD se convierte al tipo de cambio del día.',
          '📊 El saldo total consolidado aparece en el Dashboard de Finanzas automáticamente.',
          '🔒 Solo roles CEO, Sistemas y Finanzas tienen acceso a este módulo.',
        ],
      },
      {
        icon: 'ArrowLeftRight', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Registro de Movimientos',
        subtitle: 'Entradas y salidas bancarias con trazabilidad',
        tips: [
          '⬆️ Depósitos: abono de clientes, transferencias entrantes, intereses.',
          '⬇️ Pagos: proveedores, nómina, impuestos, servicios.',
          '🔗 Vincula cada movimiento con la factura, OC o nómina correspondiente.',
          '📅 El estado de cuenta del ERP debe coincidir con el estado real del banco.',
        ],
      },
      {
        icon: 'GitCompare', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Conciliación Bancaria',
        subtitle: 'Verifica que el ERP y el banco coincidan',
        tips: [
          '📄 Sube el estado de cuenta del banco (Excel o PDF) para iniciar la conciliación.',
          '🤖 La IA cruza automáticamente los movimientos del ERP con los del estado de cuenta.',
          '✅ Marca como conciliado cada movimiento que coincide — los no conciliados quedan pendientes.',
          '📊 El reporte de conciliación muestra diferencias, partidas en tránsito y ajustes necesarios.',
        ],
      },
    ],
  },

  conciliacion: {
    moduleId: 'conciliacion',
    label: 'Conciliación Bancaria',
    emoji: '🔄',
    description: 'Proceso formal de conciliación entre ERP y banco',
    steps: [
      {
        icon: 'FileCheck2', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Proceso de Conciliación',
        subtitle: 'Cierra el mes con el banco cuadrado',
        tips: [
          '📅 Abre una conciliación por período: selecciona cuenta, mes y saldo inicial del banco.',
          '📄 Importa el estado de cuenta en formato Excel o CSV del banco.',
          '🤖 El motor de matching IA empareja movimientos automáticamente por monto y fecha.',
          '📊 Los no emparejados se listan para revisión manual — cheques en tránsito, depósitos pendientes.',
        ],
      },
      {
        icon: 'CheckCircle2', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30',
        title: 'Cierre y Certificación',
        subtitle: 'Conciliación aprobada lista para contabilidad',
        tips: [
          '✅ El saldo conciliado del ERP debe igualar el saldo del estado de cuenta del banco.',
          '📋 Genera el reporte de conciliación firmado digitalmente para el cierre contable.',
          '🔒 Una conciliación cerrada no puede modificarse — auditoría completa de quién la aprobó.',
          '📤 Exporta a Excel el reporte final para enviar al contador o auditor externo.',
        ],
      },
    ],
  },

  reports: {
    moduleId: 'reports',
    label: 'Reportes KPI',
    emoji: '📊',
    description: 'Reportes automáticos de indicadores clave de desempeño',
    steps: [
      {
        icon: 'FileBarChart', color: 'text-mcvill-accent', bg: 'bg-mcvill-accent/10 border-mcvill-accent/30',
        title: 'Reportes Automáticos',
        subtitle: 'KPIs consolidados de toda la operación',
        tips: [
          '📊 Selecciona el período (día, semana, mes) y el módulo (producción, calidad, finanzas).',
          '📄 El reporte se genera en PDF con gráficas, tablas y análisis comparativo.',
          '🤖 La IA añade un resumen ejecutivo con los 3 puntos más importantes del período.',
          '📧 Configura reportes automáticos que se envían por correo cada lunes.',
        ],
      },
      {
        icon: 'BarChart3', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30',
        title: 'Dashboard Gerencial',
        subtitle: 'La vista que necesita la dirección',
        tips: [
          '📈 Consolida: OEE, FTT, entregas a tiempo, margen promedio y rotación de inventario.',
          '🔴 Los KPIs fuera de meta se resaltan con su tendencia: subiendo o bajando.',
          '💼 Ideal para la junta directiva mensual — todo en una sola pantalla.',
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
