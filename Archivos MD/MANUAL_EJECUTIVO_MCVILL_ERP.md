# MANUAL EJECUTIVO — McVill ERP con Inteligencia Artificial
### Sistema de Gestión Empresarial para la Industria Metalmecánica
**Versión 2.6 — Mayo 2026**
**Desarrollado por IA.AGUS — ia-agus.com**

---

## ÍNDICE

1. [¿Qué es un ERP para la Industria Metalmecánica?](#1-qué-es-un-erp-para-la-industria-metalmecánica)
2. [Arquitectura Tecnológica del Sistema](#2-arquitectura-tecnológica-del-sistema)
3. [Base de Datos, Seguridad y Plan de Respaldo](#3-base-de-datos-seguridad-y-plan-de-respaldo)
4. [Módulos del ERP — 36 Módulos Descripción Completa](#4-módulos-del-erp--descripción-completa)
5. [Cómo se Conecta Todo el ERP](#5-cómo-se-conecta-todo-el-erp)
6. [Inteligencia Artificial por Módulo](#6-inteligencia-artificial-por-módulo)
7. [Agente de Acción IA — 19 Comandos Disponibles](#7-agente-de-acción-ia--19-comandos-disponibles)
8. [Chat IA y Voice Link](#8-chat-ia-y-voice-link)
9. [Roles y Permisos de Usuario](#9-roles-y-permisos-de-usuario)
10. [Guía de Capacitación por Rol](#10-guía-de-capacitación-por-rol)
11. [Errores Comunes y Cómo Resolverlos](#11-errores-comunes-y-cómo-resolverlos)
12. [Motores de IA Utilizados](#12-motores-de-ia-utilizados)
13. [Costo Estimado de IA](#13-costo-estimado-de-ia)
14. [ROI Esperado del ERP](#14-roi-esperado-del-erp)
15. [Comparativa vs SAP / Odoo / ERP Tradicionales](#15-comparativa-vs-sap--odoo--erp-tradicionales)
16. [Roadmap — Versiones Futuras](#16-roadmap--versiones-futuras)
17. [Política de Datos y Privacidad](#17-política-de-datos-y-privacidad)
18. [Soporte IA.AGUS](#18-soporte-iaagus)
19. [Glosario de Términos](#19-glosario-de-términos)

---

## 1. ¿Qué es un ERP para la Industria Metalmecánica?

Un **ERP** (Enterprise Resource Planning — Sistema de Planificación de Recursos Empresariales) es el software central que unifica todas las operaciones de una empresa en una sola plataforma digital. En lugar de manejar producción en una hoja de Excel, finanzas en otra, y recursos humanos en papel, el ERP conecta todo en tiempo real.

### Por qué la metalmecánica necesita un ERP especializado

La industria metalmecánica tiene características únicas que los ERP genéricos no resuelven bien:

| Reto Operativo | Sin ERP | Con McVill ERP |
|---|---|---|
| Trazabilidad de piezas | Manual, en papel | QR en cada pieza, historial digital completo |
| Control de materiales | Conteo físico periódico | Stock en tiempo real con alertas automáticas |
| Estimación de costos | Cálculo manual por ingeniero | IA calcula materiales, procesos y overhead en segundos |
| Inspección de calidad | Visual humana, registro en papel | IA analiza fotos y detecta defectos automáticamente |
| Planeación de producción | Pizarrón o Excel | Gantt dinámico, MRP y carga de planta con IA |
| Reportes ejecutivos | Días de recolección de datos | Dashboard en tiempo real con un clic |

### El estándar McVill ERP

McVill ERP fue diseñado específicamente para plantas metalmecánicas medianas (20–500 empleados) en México, con:
- **Viajeros de producción digitales** con escaneo QR en cada estación
- **Factibilidad IA** basada en el formato FT-IG-01 del sector
- **Trazabilidad de lotes** desde materia prima hasta entrega
- **Integración con PEMEX, T-MEC y normativas nacionales** de seguridad industrial

---

## 2. Arquitectura Tecnológica del Sistema

McVill ERP es una aplicación web moderna basada en tecnología de nube, accesible desde cualquier dispositivo con navegador (PC, tablet, celular).

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO FINAL                        │
│         Navegador Web / Tablet / Celular                │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│               FRONTEND — Vercel CDN                     │
│   React 19 + TypeScript + Vite + TailwindCSS v4          │
│   Desplegado globalmente en Edge Network de Vercel      │
│   URL: mcvill-erp.vercel.app                            │
└──────────────────────┬──────────────────────────────────┘
                       │ API REST / Realtime WebSocket
┌──────────────────────▼──────────────────────────────────┐
│              BACKEND — Supabase                         │
│   PostgreSQL 16 (base de datos principal)               │
│   Row Level Security (RLS) por tenant/empresa           │
│   Edge Functions Deno (lógica de servidor)              │
│   Storage (archivos, documentos, imágenes)              │
│   Auth (autenticación multi-rol)                        │
│   Realtime (actualizaciones en vivo)                    │
└──────────────────────┬──────────────────────────────────┘
                       │ API Key segura
┌──────────────────────▼──────────────────────────────────┐
│           MOTORES DE IA — Google Gemini                 │
│   gemini-2.5-flash-lite    → Chat, análisis, visión     │
│   gemini-2.5-flash-native  → Voice Link (audio nativo)  │
│   text-embedding-004       → Búsqueda semántica RAG     │
└─────────────────────────────────────────────────────────┘
```

### Multi-Tenancy (Multi-Empresa)

El sistema soporta múltiples empresas en la misma infraestructura. Cada empresa (tenant) tiene:
- Sus propios datos completamente aislados
- Su propia API Key de Gemini configurable
- Su propia configuración de marca (logo, colores, nombre)
- Usuarios propios con roles diferenciados

---

## 3. Base de Datos, Seguridad y Plan de Respaldo

### Base de Datos PostgreSQL en Supabase

Supabase utiliza **PostgreSQL 16**, el motor de base de datos relacional más confiable y de código abierto del mundo. La base de datos de McVill incluye más de 40 tablas interconectadas.

**Tablas principales:**

| Área | Tablas |
|---|---|
| Producción | `work_orders`, `manufacturing_stages`, `viajeros`, `viajero_operaciones` |
| Inventario | `materiales`, `materiales_catalogo` |
| Calidad | `quality_inspections`, `no_conformidades`, `auditorias_internas` |
| Capital Humano | `employees`, `profiles`, `attendance_records`, `nominas` |
| Ventas | `clientes`, `cotizaciones`, `tarifas_cotizacion` |
| Ingeniería | `engineering_projects`, `operaciones_catalogo` |
| Finanzas | `financial_transactions`, `cuentas_cobrar`, `cuentas_pagar` |
| Mantenimiento | `maintenance_requests`, `maintenance_assets` |
| IA / RAG | `documentos_rag_meta`, `documentos_rag_chunks` |
| Desempeño | `operadores`, `desempeno_kpis`, `incentivos` |

### Seguridad de Datos

**Row Level Security (RLS):** Cada fila de datos tiene una política de seguridad que garantiza que una empresa solo puede leer y escribir sus propios datos. Es imposible acceder a datos de otra empresa aunque compartan infraestructura.

**Autenticación:** Supabase Auth con JWT tokens firmados. Las contraseñas se almacenan hasheadas con bcrypt. Las sesiones expiran automáticamente.

**Cifrado:** Todos los datos en tránsito usan TLS 1.3. Los datos en reposo están cifrados con AES-256 en los servidores de Supabase (alojados en AWS us-east-1).

### Plan de Respaldo (Backup)

**Respaldo automático en Supabase:**
- **Diario:** Supabase hace snapshot completo de la base de datos cada 24 horas
- **Retención:** 7 días para plan Pro, 30 días para plan Enterprise
- **Point-in-time recovery:** Se puede restaurar la base de datos a cualquier momento de los últimos 7 días
- **Geo-redundancia:** Los datos se replican en múltiples zonas de disponibilidad de AWS

**Respaldo adicional recomendado para McVill:**

```
1. Exportar respaldo mensual manual:
   → Panel de Supabase → Settings → Database → Backups → Download

2. Exportar datos críticos a CSV cada semana:
   → Reportes → Exportar a PDF/Excel (disponible en el módulo de Reportes)

3. Mantener copia local en servidor NAS de la planta
   (opcional, para cumplimiento ISO 9001)
```

**Plan de contingencia ante caída de internet:**
- El ERP es 100% en la nube. Sin internet no hay acceso.
- **Recomendación:** Contratar doble línea de internet (fibra óptica principal + respaldo LTE/4G) para la oficina y piso de planta.
- Los datos del turno actual se pueden exportar en PDF antes de iniciar el turno como contingencia.

---

## 4. Módulos del ERP — Descripción Completa

### 📊 Tablero Principal (Dashboard)
Centro de comando ejecutivo en tiempo real. Muestra KPIs críticos: OEE de planta, eficiencia de producción, órdenes activas, stock crítico, alertas de mantenimiento y ROI del ERP. Pensado para la revisión diaria de 10 minutos de la gerencia o director.

### 📦 Inventarios Pro
Control absoluto de materia prima. Registro de entradas y salidas, alertas de stock mínimo, historial de movimientos por orden de producción, e identificación visual de materiales por IA (sube foto del material para identificarlo).

### 🏭 Control de Planta (Producción)
Gestión de Órdenes de Trabajo (OT) con etapas de manufactura: Corte, Maquinado, Soldadura, Armado, Pintura, Inspección. Cada etapa se firma electrónicamente al completarse. Incluye TV Mode para proyectar en el piso de planta.

### 📄 Viajeros de Producción
El "pasaporte digital" de cada pieza. El viajero acompaña la pieza por todas las estaciones, se escanea con QR en cada una, y genera el PDF profesional con logo McVill. Permite saber en tiempo real dónde está cada pieza.

### 📅 Planeación IA
- **Gantt de Producción:** Timeline visual de todas las órdenes activas con optimización IA
- **MRP (Material Requirements Planning):** Cruza órdenes vs inventario y genera lista de compras
- **Carga de Planta:** Capacidad disponible por estación de trabajo
- **Forecast IA:** Proyección de demanda basada en histórico
- **S&OP:** Ventas y Operaciones — valida si se puede cumplir lo que ventas promete

### ✅ Calidad SGC
- Inspecciones de calidad con resultado PASS/FAIL
- Neural Inspection Engine: IA analiza fotos de piezas y detecta defectos visuales
- Creación automática de No Conformidades cuando la IA detecta un FAIL
- Gestión completa del ciclo CAPA (Correctiva-Preventiva)
- Auditorías internas ISO 9001
- Control Estadístico de Proceso (SPC) con cartas de control

### 🎯 Factibilidad IA
Evalúa si una nueva oportunidad de negocio es viable ANTES de invertir tiempo en cotizar. Sigue el formato FT-IG-01. La IA da puntuación 0-100 en segundos con riesgos, recomendación y tiempo estimado.

### 💼 Ventas y CRM
Gestión de clientes, historial de órdenes, estado de cuenta y crédito disponible. Pipeline de cotizaciones por etapas: Borrador → Enviada → Aprobada → Convertida a Orden.

### 🗂️ Kanban de RFQs
Tablero Kanban visual de solicitudes de cotización. Drag & drop entre columnas. El Agente Cotizador genera propuestas completas desde una descripción en lenguaje natural.

### 🤖 Agente de Cotizaciones
IA especializada en generar cotizaciones metalmecánicas. Describe el proyecto en español → el agente calcula materiales, procesos, overhead y genera PDF profesional para el cliente.

### ⚙️ Ingeniería y Diseño
Proyectos de ingeniería con BOM (Lista de Materiales), especificaciones técnicas y revisiones controladas. 
- **Blueprint Analyzer:** Sube un plano PDF → la IA extrae automáticamente la BOM completa.
- **Cotizador Industrial IA:** Sube planos técnicos, DXF o capturas → la IA realiza un análisis multimodal para detectar material, calibres, perímetros de corte, barrenos y dobleces, calculando costos instantáneos.
- **Nesting IA & Scrap Manager:** Optimización de acomodo de piezas en 2D para reducir mermas y sistema de recuperación de retazos (scrap) para reintegrarlos al inventario con valor económico.

### 💰 Finanzas y ROI
Flujo de caja semanal proyectado, rentabilidad por proyecto, cuentas por cobrar y pagar, y el ROI del ERP calculado en tiempo real basado en eficiencias logradas.

### 👥 Capital Humano (RH)
Directorio de empleados con certificaciones y documentos. **Reclutamiento IA:** sube CVs en PDF → la IA los puntúa automáticamente contra el perfil de puesto.

### 💵 Nómina
Cálculo automático de nómina basado en asistencia real. Generación de recibos PDF. Manejo de incidencias: faltas, permisos, incapacidades, horas extra.

### 🕐 Control de Asistencia
Check-in/Check-out con código de empleado o QR. Detección automática de tardanzas. Reportes diarios y semanales de ausentismo. Sincronización directa con el módulo de Nómina.

### 🏆 Desempeño
KPIs de operadores: eficiencia, calidad, asistencia y OEE por turno y área. Ranking automático. Sistema de incentivos basado en umbrales configurables. Historial de evaluaciones.

### 🔧 Mantenimiento
Activos de planta con Health Score (0-100). Planes de mantenimiento preventivo con alertas automáticas. Registro de mantenimientos correctivos con partes usadas y técnico responsable. IA predice cuándo podría fallar un activo.

### 🦺 Seguridad HSE
Registro de incidentes de seguridad con causa raíz y acción correctiva. Control de EPP (equipo de protección) por empleado. Capacitaciones de seguridad con vencimiento y alertas de renovación.

### 📉 Control Estadístico (SPC)
Cartas de control X̄-R y X̄-S. Detección automática de las 4 reglas de Nelson. Cálculo de Cp y Cpk. Alertas cuando el proceso sale de control estadístico.

### 📊 Reportes Ejecutivos & Exportación PDF Corporativa
Centro neurálgico de consolidación de datos y distribución de inteligencia operativa. El módulo cuenta con un **Motor de Generación de PDFs Corporativo de Alta Fidelidad** (`reportUtils.ts`) y un sistema de distribución omnicanal:
- **Motor de PDFs Integrado:** Produce de manera instantánea reportes con diseño sobrio y moderno (encabezados de color azul industrial oscuro, logotipos dinámicos del tenant, y metadatos de compilación en tiempo real). El motor realiza carga diferida (*lazy loading*) de jsPDF en el cliente para conservar el desempeño óptimo de la aplicación.
- **Identidad de Marca Dinámica:** Carga de forma automática la firma, nombre de empresa, y lemas corporativos desde Supabase/LocalStorage en los pies de página de cada hoja para garantizar la confidencialidad técnica.
- **Fichas Técnicas y Reportes por Módulo:**
  - **Gerencia General (Reporte KPI Consolidado):** Compila en un solo documento la salud de la planta (OTs, Almacén, Finanzas, y Calidad SGC) al instante.
  - **Ingenieros y Operadores (Viajero QR e Instrucciones):** Genera la ficha de viajero de producción que acompaña a las piezas, incluyendo códigos QR para escaneo y registro inmediato de avances.
  - **Calidad (Six Sigma y CAPA):** Genera PDFs de análisis de no conformidad con fotos de defectos analizadas por visión IA y reportes Six Sigma.
  - **Almacén (Valuación de Almacén y Mínimos):** Reporte de stock físico valorizado para planeación de compras.
  - **RH y Finanzas (Nóminas y Cash Flow):** Exporta resúmenes de egresos por turnos e incidencias, y el flujo de caja semanal.
- **Distribución Omnicanal e Inteligente:**
  - **Compartir al Instante:** Permite despachar resúmenes ejecutivos directamente a los supervisores por **WhatsApp**, **Microsoft Teams**, o **Correo Electrónico**.
  - **Programación Recurrente de Envíos:** Permite calendarizar envíos automáticos del reporte seleccionado a destinatarios definidos con frecuencia diaria, semanal o mensual a una hora específica.

### 📋 Minutas de Reunión
Generador de actas con IA. Registra los puntos de la reunión y la IA estructura el acta formal. Compartir por Email, WhatsApp o Teams.

### 📐 Instrucciones de Trabajo
Procedimientos paso a paso con puntos de control, imágenes y operaciones de ruta. Estados: Borrador → Activo → Obsoleto.

### 🔍 Trazabilidad de Partes
Rastreo completo de cada número de parte desde la materia prima de origen hasta la entrega al cliente. Árbol BOM que muestra relaciones entre componentes y ensambles. En caso de detectarse un defecto en campo, el sistema identifica en segundos todos los productos del mismo lote que pudieran estar afectados. ECOs (Engineering Change Orders) con historial de revisiones controladas.

### 👁️ Inspección Visual IA (Módulo Dedicado)
Módulo independiente para detección automática de defectos por visión neural. Funciona desde celular, tablet o PC sin cámaras especiales. Modos de inspección:
- **Soldadura:** porosidades, fisuras, socavación, penetración incompleta, spatter
- **Ensamble:** piezas faltantes, tornillos sueltos, desalineaciones
- **Pintura:** chorreos, burbujas, cáscara de naranja, delaminación
- **Dimensional:** rebabas, deformaciones, perforaciones mal ubicadas

Si la IA detecta FAIL (confianza >60%), crea automáticamente una No Conformidad con número único y notifica al supervisor.

### 📚 Biblioteca de Defectos y Lecciones Aprendidas
Catálogo visual de todos los defectos históricos con foto de referencia, descripción, causa raíz y acción correctiva documentada. Cuando se abre una nueva No Conformidad, el sistema sugiere automáticamente los defectos similares del catálogo para acelerar el diagnóstico. Las lecciones aprendidas quedan vinculadas a procesos, materiales y operadores para que el conocimiento institucional no se pierda.

### 📋 PPAP / FAI
Gestión completa del **Production Part Approval Process** y **First Article Inspection**. Genera el paquete de aprobación con todos los elementos del nivel requerido: plano de control, FMEA, mediciones dimensionales, muestras y certificados. Flujo de aprobación con el cliente: En Preparación → Enviado → En Revisión → Aprobado / Rechazado. Archivo digital de todos los PPAPs por parte y cliente para auditorías internas y de cliente.

### 💬 VOC — Voz del Cliente
Captura, clasifica y da seguimiento a toda la retroalimentación del cliente: quejas, sugerencias y felicitaciones. Las quejas se convierten automáticamente en No Conformidades con seguimiento CAPA. Dashboard de NPS y satisfacción del cliente actualizado en tiempo real. Análisis de Pareto por tipo de queja para priorizar acciones de mejora. La IA analiza el sentimiento de los comentarios y genera resumen ejecutivo para revisión de dirección.

### 🛒 Gestión de Compras
Gestión completa del ciclo de compras desde la solicitud hasta la recepción. Las alertas de stock crítico del módulo de Inventarios generan solicitudes de compra automáticamente. El módulo genera PDF de Orden de Compra profesional con términos y condiciones. Al registrar la recepción, el inventario se actualiza automáticamente. Directorio de proveedores con **score de desempeño** (cumplimiento, calidad, precio) para seleccionar siempre la mejor opción. La IA sugiere el proveedor óptimo para cada material basado en historial.

### 📈 Cotizador ROI
Herramienta para calcular el Retorno de Inversión de proyectos de capital, propuestas de mejora o nuevas líneas de producto. Ingresa el costo del proyecto y los ahorros/ingresos esperados y el sistema calcula automáticamente: ROI, Payback Period y Valor Presente Neto (VPN). Permite crear múltiples escenarios comparativos y genera reporte ejecutivo en PDF listo para presentar a dirección o al cliente.

### 🔩 Cotizador Metalmecánico (Metal Quoter)
Cotizador especializado para piezas metálicas con desglose detallado por proceso productivo: Corte Láser, Doblez, Soldadura, Maquinado CNC, Pintura y Ensamble. Calcula el costo de materia prima según dimensiones, calibre y material. Aplica automáticamente los tiempos estándar y tasas de planta configuradas por McVill. Soporta cotizaciones multi-partida para ensambles completos y genera PDF con logo listo para el cliente.

### 💲 Control de Costos
Análisis en tiempo real del costo real vs presupuestado por cada Orden de Trabajo. Acumula: material consumido + horas-hombre reales + overhead aplicado. Si el costo real supera el presupuesto, genera alerta de erosión de margen. Ranking de órdenes por margen para identificar las más y menos rentables. Análisis de rentabilidad por cliente para identificar quiénes generan más valor real para McVill.

### ⚡ Costeo en Vivo (Dynamic Costing)
Costeo dinámico donde los precios de materia prima se actualizan en tiempo real. Al cambiar el precio del acero, todas las cotizaciones activas se recalculan automáticamente. **Simulador de escenarios:** ajusta sliders de materia prima y mano de obra para ver el impacto en el margen antes de firmar un contrato a largo plazo. Ideal para negociaciones con clientes donde el precio del material es volátil.

### 🗺️ Diseño de Layout de Planta
Herramienta visual para diseñar y optimizar el flujo de estaciones de trabajo. Arrastra y posiciona estaciones en el plano de planta; las flechas de flujo muestran el recorrido del material. El análisis de distancias detecta movimientos innecesarios (muda de transporte según Lean Manufacturing). La IA sugiere reordenamientos para minimizar la distancia total recorrida por pieza. El gráfico de balance de línea muestra qué estaciones son el cuello de botella.

### 🧪 Simulador de Procesos
Permite simular y optimizar procesos productivos antes de implementarlos en la planta real. Define el proceso con sus etapas, tiempos, recursos y tasas de fallo, luego ejecuta la simulación con el volumen de producción objetivo y obtiene métricas: throughput, WIP promedio, utilización de recursos y tiempo de ciclo. Compara el proceso actual vs el proceso propuesto y calcula el impacto económico de la mejora en horas y pesos.

### 🏭 Shop Floor Monitor
Panel de monitoreo del piso de producción en tiempo real. Muestra el estado de cada estación: 🟢 Produciendo / 🟡 Setup-Cambio / 🔴 Paro-Falla. Los datos se actualizan cada 30 segundos desde los registros de producción. **Modo TV:** proyecta el estado en la pantalla del piso de planta. Al detectar un paro, genera alerta automática al supervisor del área. Métricas de OEE en vivo y Pareto de tiempos muertos por categoría (mecánico, material, operador, cambio).

---

## 5. Cómo se Conecta Todo el ERP

El siguiente diagrama muestra el flujo de información entre módulos:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   VENTAS    │─────▶│ FACTIBILIDAD │─────▶│   COTIZACIÓN    │
│ (CRM/RFQs)  │      │     IA       │      │   (Agente IA)   │
└─────────────┘      └──────────────┘      └────────┬────────┘
                                                    │ Aprobada
                                                    ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  INGENIERÍA │◀─────│  PLANEACIÓN  │◀─────│    PRODUCCIÓN   │
│ (BOM/Planos)│─────▶│  (MRP/Gantt) │      │  (OTs/Viajeros) │
└─────────────┘      └──────┬───────┘      └────────┬────────┘
                            │                       │
                            ▼                       ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   COMPRAS   │◀─────│  INVENTARIO  │      │    CALIDAD      │
│(Órdenes OC) │─────▶│  (Stock/MP)  │      │  (SPC/NC/Insp.) │
└─────────────┘      └──────────────┘      └─────────────────┘
                                                    │
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   NÓMINA    │◀─────│CAPITAL HUMANO│◀─────│   ASISTENCIA    │
│(Cálculo auto│      │(RH/Reclut.)  │      │  (Check-in QR)  │
└─────────────┘      └──────────────┘      └─────────────────┘
      │                                            │
      ▼                                            ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  FINANZAS   │◀─────│   COSTOS     │      │   DESEMPEÑO     │
│(Flujo/CxC)  │      │(Real vs Pres)│      │ (KPIs/Incentiv) │
└─────────────┘      └──────────────┘      └─────────────────┘

                    TRANSVERSALES (todos los módulos):
              ┌──────────────────────────────────────┐
              │  MANTENIMIENTO → HSE → CHAT IA       │
              │  VOICE LINK → REPORTES → MINUTAS     │
              └──────────────────────────────────────┘
```

### Flujo principal de un pedido

1. **Cliente solicita cotización** → Ventas registra el RFQ en el Kanban
2. **Factibilidad IA** evalúa si es técnica y financieramente viable
3. **Agente Cotizador** genera la propuesta con precios calculados por IA
4. **Cliente aprueba** → se convierte en Orden de Trabajo en Producción
5. **Ingeniería** define la BOM y ruta de operaciones
6. **Planeación MRP** verifica si hay materiales; si no, genera solicitud a Compras
7. **Producción** ejecuta la OT con Viajero digital; cada etapa se firma con QR
8. **Calidad** inspecciona con IA visual; si hay falla → NC automática
9. **Finanzas** registra el cobro y actualiza el flujo de caja

---

## 6. Inteligencia Artificial por Módulo

| Módulo | Función de IA | Motor |
|---|---|---|
| Dashboard | Análisis predictivo de KPIs, alertas tempranas | Gemini Flash |
| Factibilidad | Evaluación automática FT-IG-01, puntuación 0-100 | Gemini Flash |
| Cotizaciones | Generación completa de propuestas en lenguaje natural | Gemini Flash |
| Producción | Detección de cuellos de botella, riesgo de paro | Agente (datos reales) |
| Calidad | Inspección visual de piezas (detección de defectos en fotos) | Gemini Vision |
| Calidad | Creación automática de No Conformidades en FAILs | Automatización |
| Inventario | Identificación de materiales por foto | Gemini Vision |
| Ingeniería | Blueprint Analyzer: extracción de BOM desde planos PDF | Gemini Vision |
| Ingeniería | Cotizador Industrial: análisis de planos y costeo metalmecánico | Gemini Vision |
| Ingeniería | Nesting IA: optimización 2D de piezas en placa | Algoritmos + IA |
| Ingeniería | Scrap Manager: gestión y valuación de retazos de material | IA.AGUS Core |
| Capital Humano | Evaluación y puntuación de CVs contra perfil de puesto | Gemini Flash |
| Planeación | Optimización de Gantt, sugerencias de reorden MRP | Gemini Flash |
| Mantenimiento | Predicción de fallas basada en historial de activos | Gemini Flash |
| SPC | Detección automática de reglas de Nelson (tendencias, ciclos) | Algoritmos + IA |
| Voice Link | Asistente de voz en tiempo real, contexto por módulo | Gemini Live API |
| Chat IA | Agente de acción con 19 herramientas del ERP | Gemini Flash |
| RAG | Búsqueda semántica en documentos corporativos | text-embedding-004 |
| Minutas | Estructuración automática de actas de reunión | Gemini Flash |
| Reclutamiento | Análisis y puntuación de CVs contra perfil de puesto | Gemini Flash |
| VOC | Análisis de sentimiento de retroalimentación de clientes | Gemini Flash |
| Inspección Visual IA | Detección de defectos por visión neural (módulo dedicado) | Gemini Vision |
| PPAP / FAI | Verificación de completitud de elementos del paquete | Automatización |
| Biblioteca Defectos | Vinculación automática de NCs con defectos históricos similares | Gemini Flash |
| Cotizador ROI | Cálculo de VPN y análisis de escenarios | Algoritmos |
| Metal Quoter | Cálculo de tiempos estándar y costos por proceso metalmecánico | Algoritmos + IA |
| Costeo en Vivo | Recálculo automático de cotizaciones ante cambios de precios | Automatización |
| Layout Planta | Sugerencias de reordenamiento para minimizar distancias | Gemini Flash |
| Simulador | Análisis de throughput y detección de cuellos de botella | Algoritmos + IA |
| Shop Floor | Detección automática de paros y alertas en tiempo real | Automatización |
| Compras | Sugerencia de proveedor óptimo por historial de desempeño | Gemini Flash |

---

## 7. Agente de Acción IA — 19 Comandos Disponibles

El Chat IA no solo responde preguntas — ejecuta acciones reales en el ERP. Escribe en lenguaje natural y el agente actúa.

### PRODUCCIÓN (7 herramientas)

| Comando | Ejemplo de uso | Qué hace |
|---|---|---|
| `generar_viajero` | "genera el viajero del Job 4012" | Muestra etapas y avance de esa orden |
| `status_viajero` | "¿en qué etapa está la orden 4012?" | Etapa actual, operador, notas |
| `listar_ordenes_activas` | "lista todas las órdenes abiertas" | Tabla de OTs en proceso/pendientes |
| `eficiencia_turno` | "¿cómo va el turno de hoy?" | OEE, asistencia, progreso promedio |
| `proximas_entregas` | "¿qué entregas vencen esta semana?" | Órdenes por vencer con días restantes |
| `cuellos_de_botella` | "¿hay órdenes atascadas?" | Órdenes retrasadas >7 días |
| `alerta_paro_produccion` | "¿hay riesgo de paro?" | Inventario crítico + mantenimientos + órdenes lentas |

### CAPITAL HUMANO (3 herramientas)

| Comando | Ejemplo de uso | Qué hace |
|---|---|---|
| `reporte_faltas_hoy` | "¿cuántas faltas hoy?" | Presentes, ausentes, tardanzas del día |
| `kpis_operadores` | "¿cómo van los operadores?" | Ranking de eficiencia por operador |
| `proximas_nominas` | "¿hay nóminas pendientes?" | Nóminas por procesar con días restantes |

### CALIDAD (2 herramientas)

| Comando | Ejemplo de uso | Qué hace |
|---|---|---|
| `nc_abiertas` | "¿hay NCs abiertas?" | Lista de No Conformidades pendientes |
| `crear_nc` | "crea una NC de soldadura deficiente en armado" | Crea la NC directamente en el sistema |

### INVENTARIO / COMPRAS (2 herramientas)

| Comando | Ejemplo de uso | Qué hace |
|---|---|---|
| `stock_critico` | "¿qué materiales nos faltan?" | Materiales bajo mínimo de seguridad |
| `generar_orden_compra` | "pide 500 kg de acero A36" | Crea solicitud de compra en el sistema |

### VENTAS / FINANZAS (2 herramientas)

| Comando | Ejemplo de uso | Qué hace |
|---|---|---|
| `pipeline_ventas` | "¿cuánto vale el pipeline de ventas?" | Valor total por etapa de cotización |
| `estado_financiero` | "dame el resumen financiero" | CxC, CxP, flujo de caja 30 días |

### ANÁLISIS IA (2 herramientas)

| Comando | Ejemplo de uso | Qué hace |
|---|---|---|
| `analizar_factibilidad` | "analiza factibilidad para estructuras para PEMEX" | Puntuación 0-100 con riesgos |
| `buscar_documentos` | "busca el procedimiento de pintura epóxica" | Búsqueda semántica en documentos RAG |

---

## 8. Chat IA y Voice Link

### Chat IA (McVill Cerebro Neural)

El chat aparece en el panel derecho de la aplicación. Acepta preguntas en español natural sobre cualquier aspecto del ERP. Funciona en dos modos:

**Modo Consulta:** Responde preguntas informativas
> "¿Cuál es el proceso estándar para soldadura TIG en acero inoxidable?"

**Modo Agente:** Ejecuta acciones reales en el sistema (ver sección 7)
> "Genera el viajero de la orden OT-2045"

**Memoria Corporativa (RAG):** El chat puede buscar en documentos que tú subas (procedimientos, normas, especificaciones). Para activarlo:
1. Ve al módulo de Ayuda
2. Sube documentos PDF o TXT
3. El sistema los indexa con IA y los hace buscables

### Voice Link (Enlace de Voz IA)

Asistente de voz en tiempo real usando Gemini Live API (la misma tecnología detrás de Google Gemini Live).

**Cómo activarlo:** Clic en el ícono de micrófono en la barra lateral → "Iniciar Voz IA"

**Capacidades:**
- Responde preguntas sobre el módulo que estás viendo actualmente
- Enseña cómo usar cada módulo si le preguntas
- Contexto automático: si estás en Calidad, sabe que hablas de calidad
- 5 voces disponibles: Aoede (F), Puck (M), Charon (M), Kore (F), Fenrir (M)

**Guía Visual de Módulos:** Cada módulo tiene el botón `[emoji] Guía` en el encabezado. Al tocarlo se abre un tutorial paso a paso interactivo de ese módulo específico.

---

## 9. Roles y Permisos de Usuario

| Rol | Módulos Disponibles | Puede Crear | Puede Aprobar |
|---|---|---|---|
| **CEO** | Todos + Configuración | Todo | Todo |
| **Sistemas** | Todos + Configuración | Configuración del tenant | Todo |
| **Admin** | Todos + Configuración | Todo | Todo |
| **Gerencia** | Todos excepto Configuración | Órdenes, cotizaciones, reportes | Nóminas, NCs, compras |
| **Ingeniería** | Dashboard, Inventarios, Planta, Viajeros, Calidad, HSE, Ingeniería, Mantenimiento | Instrucciones de trabajo, Layouts, Simulaciones | Procesos técnicos |
| **Supervisor** | Producción, Calidad, Asistencia, Mantenimiento, Ingeniería | OTs, viajeros, inspecciones | NCs menores |
| **RH** | Dashboard, Capital Humano, Asistencia, Nómina, Desempeño | Empleados, nóminas | Incidencias |
| **Finanzas** | Dashboard, Finanzas, Costos, Costeo, Nómina, Reportes | Transacciones | Pagos |
| **Contabilidad** | Dashboard, Finanzas, Costos, Nómina (lectura), Reportes | — | — |
| **Empleado** | Dashboard, Inventarios, Planta, Viajeros, Calidad, HSE | Registro de etapas completadas | — |

> **Nota:** Los roles CEO, Sistemas y Admin tienen acceso total incluyendo el módulo de **Configuración** del sistema (branding, API Keys, multi-tenant). Los roles se asignan desde **Configuración → Administración de Usuarios**.

---

## 10. Guía de Capacitación por Rol

### Para el CEO / Director General
**Tiempo de capacitación:** 2 horas
1. Dashboard: interpretar KPIs y alertas (30 min)
2. Reportes ejecutivos y exportación (30 min)
3. Chat IA y Voice Link para consultas ejecutivas (30 min)
4. Factibilidad IA para evaluar nuevos negocios (30 min)

### Para el Gerente de Producción
**Tiempo de capacitación:** 4 horas
1. Módulo de Producción y gestión de OTs (1 h)
2. Planeación: Gantt, MRP y carga de planta (1 h)
3. Viajeros de Producción y escaneo QR (1 h)
4. Agente IA: comandos de producción y alertas (1 h)

### Para el Gerente de Calidad
**Tiempo de capacitación:** 3 horas
1. Inspecciones y Neural Inspection Engine (1 h)
2. No Conformidades y ciclo CAPA (1 h)
3. SPC: cartas de control y alertas (1 h)

### Para Operadores de Piso
**Tiempo de capacitación:** 1 hora
1. Cómo registrar entrada y salida (Check-in QR) (20 min)
2. Cómo avanzar etapas en el Viajero (20 min)
3. Cómo registrar una inspección y tomar foto (20 min)

### Para RH y Nómina
**Tiempo de capacitación:** 3 horas
1. Alta de empleados y gestión de perfiles (1 h)
2. Control de asistencia e incidencias (1 h)
3. Cálculo y aprobación de nómina (1 h)

### Para Ventas y Cotizaciones
**Tiempo de capacitación:** 3 horas
1. Gestión de clientes y CRM (1 h)
2. Agente Cotizador y Kanban de RFQs (1 h)
3. Factibilidad IA y análisis de viabilidad (1 h)

---

## 11. Errores Comunes y Cómo Resolverlos

### Error: "API Key no detectada"
**Síntoma:** El Chat IA o Voice Link muestran "API Key no configurada"
**Solución:**
1. Ve a **Configuración → Administración**
2. En el campo "Gemini API Key", ingresa tu clave de Google AI Studio
3. Guarda cambios
4. La clave se almacena cifrada en Supabase, nunca en el navegador

### Error: "No autorizado" al iniciar sesión
**Síntoma:** La pantalla vuelve al login inmediatamente
**Solución:**
- Verifica que el correo esté registrado en el sistema
- Solicita al administrador que revise tu perfil en Supabase Auth
- Limpia el caché del navegador (Ctrl+Shift+Delete)

### Error: Datos no aparecen en un módulo
**Síntoma:** Un módulo muestra tabla vacía cuando debería tener datos
**Causas posibles:**
1. **Primer uso:** El módulo está vacío porque es un sistema nuevo — comienza ingresando datos
2. **Filtro activo:** Revisa si hay algún filtro o búsqueda aplicado y bórralo
3. **Permisos:** Tu rol no tiene acceso a esos datos — consulta al administrador

### Error: El Voice Link no conecta
**Síntoma:** El botón de voz muestra "Error de conexión"
**Solución:**
1. Verifica que el navegador tenga permiso de micrófono (ícono de candado en la barra de dirección)
2. Verifica que la API Key de Gemini tenga habilitado el modelo `gemini-2.5-flash-native-audio`
3. Comprueba la conexión a internet (el audio en tiempo real requiere baja latencia)
4. Usa Chrome o Edge — Safari tiene soporte limitado para Web Audio API

### Error: El QR del Viajero no escanea
**Síntoma:** La app móvil no reconoce el código QR
**Solución:**
- Asegúrate de tener buena iluminación al escanear
- El PDF debe imprimirse a mínimo 100% de tamaño (no reducir al imprimir)
- Usa la app nativa de cámara del celular o una app de QR dedicada

### Error: La IA Visual no detecta el defecto
**Síntoma:** El Neural Inspection Engine da PASS cuando hay un defecto visible
**Solución:**
- Toma la foto con buena iluminación, sin reflejos
- Asegúrate de que la pieza esté limpia y visible en el encuadre
- La confianza mínima para FAIL es 60% — defectos muy sutiles pueden quedar en zona gris
- Complementa siempre con inspección humana para decisiones críticas

### Error: "Error al generar PDF"
**Síntoma:** El botón de exportar/imprimir PDF no funciona
**Solución:**
- Verifica que el navegador no tenga bloqueador de ventanas emergentes activo
- En Chrome: haz clic en el ícono de PDF bloqueado en la barra de dirección y permite
- Si persiste, usa Edge o Firefox

---

## 12. Motores de IA Utilizados

McVill ERP usa exclusivamente modelos de **Google Gemini**, la familia de IA más avanzada disponible actualmente para aplicaciones industriales.

### Gemini 2.5 Flash Lite — Chat y Análisis
- **Uso:** Chat IA, Factibilidad, Análisis de CVs, Minutas, Planeación, Blueprint Analyzer
- **Características:** 1 millón de tokens de contexto, multimodal (texto + imágenes + PDF), velocidad < 1 segundo
- **Idioma:** Español nativo de México optimizado en los prompts
- **Costo:** Bajo (diseñado para alto volumen a bajo precio)

### Gemini 2.5 Flash Native Audio — Voice Link
- **Uso:** Voice Link (voz en tiempo real)
- **Características:** Audio nativo bidireccional, latencia < 300ms, interrupciones naturales
- **Voces disponibles:** Aoede, Puck, Charon, Kore, Fenrir
- **Diferencia con TTS tradicional:** Es IA nativa de audio, no texto convertido a voz — entiende el contexto y responde naturalmente

### Text Embedding 004 — Memoria Corporativa (RAG)
- **Uso:** Indexación y búsqueda semántica de documentos corporativos
- **Características:** Vectores de 768 dimensiones, búsqueda por similitud semántica
- **Cómo funciona:** Los documentos se convierten en vectores matemáticos almacenados en PostgreSQL con extensión pgvector. Cuando buscas, tu pregunta también se convierte en vector y se compara con todos los documentos para encontrar los más relevantes.

### pgvector — Base de Datos Vectorial
- **Uso:** Almacenamiento de embeddings para búsqueda semántica RAG
- **Índice HNSW:** Búsqueda aproximada de vecinos más cercanos, < 10ms para miles de documentos

---

## 13. Costo Estimado de IA

Los costos de IA de Google Gemini se cobran por **tokens** (fragmentos de texto, aproximadamente 4 caracteres = 1 token). A continuación, el estimado para una planta como McVill con **~50 empleados** y operación normal.

### Precios de Google Gemini (Mayo 2026)

| Modelo | Input | Output |
|---|---|---|
| Gemini 2.5 Flash Lite | $0.075 / 1M tokens | $0.30 / 1M tokens |
| Gemini 2.5 Flash Native Audio | $0.40 / 1M tokens audio | $0.40 / 1M tokens audio |
| Text Embedding 004 | $0.0001 / 1M tokens | — |

### Estimado de Uso Mensual — Planta McVill (50 empleados)

| Función | Uso Estimado | Tokens/Mes | Costo USD/Mes |
|---|---|---|---|
| Chat IA (preguntas) | 80 consultas/día × 30 días | ~7.2M tokens | ~$2.16 |
| Agente de Acción (19 tools) | 40 ejecuciones/día × 30 días | ~3.6M tokens | ~$1.08 |
| Factibilidad IA | 20 análisis/mes | ~1M tokens | ~$0.30 |
| Blueprint Analyzer | 15 planos/mes | ~3M tokens (con visión) | ~$0.90 |
| Cotizador Industrial | 20 cotizaciones/mes | ~4M tokens (visión) | ~$1.20 |
| Nesting IA | 50 optimizaciones/mes | ~2M tokens | ~$0.60 |
| Inspección Visual IA | 30 inspecciones/mes | ~2M tokens | ~$0.60 |
| Voice Link | 10 sesiones/día × 5 min × 30 días | ~4.5h audio/mes | ~$5.40 |
| RAG Ingest (indexación) | 10 docs nuevos/mes | ~0.5M tokens | ~$0.05 |
| RAG Search (búsquedas) | 50 búsquedas/mes | ~0.5M tokens embed | ~$0.05 |
| **TOTAL ESTIMADO** | | | **~$10.54 USD/mes** |

> **Nota:** Este estimado puede variar según el uso real. El Voice Link es el componente más costoso por el audio en tiempo real. Si se usa poco Voice Link, el costo puede bajar a $5-6 USD/mes. Con uso intensivo (sesiones largas frecuentes), puede subir a $20-30 USD/mes.

### Comparativa de costo vs valor

| Punto de comparación | Datos |
|---|---|
| Costo IA mensual estimado | $10-30 USD (~$180-550 MXN) |
| Costo de un inspector de calidad | ~$18,000 MXN/mes |
| Tiempo ahorrado en cotizaciones (antes 4h, ahora 15 min) | ~45 horas/mes × $200/h = $9,000 MXN |
| Reducción de errores de inventario (20% menos paros) | Variable, typically $50,000+ MXN/mes |
| **ROI del costo de IA** | **+1,000%** |

---

## 14. ROI Esperado del ERP

Basado en implementaciones similares en plantas metalmecánicas medianas en México:

### Eficiencias Directas

| Área | Tiempo Antes | Tiempo con ERP | Ahorro Mensual |
|---|---|---|---|
| Cotización de proyecto | 4-8 horas | 15 minutos | 40h ingeniería/mes |
| Cierre de nómina | 2 días | 2 horas | 15h RH/mes |
| Reporte de KPIs para dirección | 1 día | 10 minutos | 8h gerencia/mes |
| Inspección visual de piezas | 30 min/pieza | 3 min/pieza | Depende del volumen |
| Detección de faltantes de material | Semanal (reactivo) | Tiempo real (proactivo) | Evita 1-2 paros/mes |

### Reducción de Errores

- **-80%** errores de inventario (materia prima incorrecta en producción)
- **-60%** tiempo en búsqueda de información (viajeros, especificaciones, normas)
- **-40%** retrabajo por mala comunicación ingeniería → producción
- **-30%** errores de nómina por cálculo manual

### Payback Time (Recuperación de Inversión)

Para una planta con $2-5M MXN de facturación mensual:
- **Inversión inicial** (implementación + capacitación): $150,000-$250,000 MXN
- **Ahorro mensual estimado** (eficiencias + errores evitados): $80,000-$150,000 MXN
- **Tiempo de recuperación:** 2-3 meses

---

## 15. Comparativa vs SAP / Odoo / ERP Tradicionales

| Criterio | McVill ERP | SAP S/4HANA | Odoo Enterprise |
|---|---|---|---|
| **Costo implementación** | $150-250K MXN | $2-10M MXN | $500K-2M MXN |
| **Tiempo implementación** | 2-4 semanas | 6-18 meses | 3-9 meses |
| **Especialización metalmecánica** | ✅ Nativo | ❌ Requiere customización | ❌ Módulos genéricos |
| **IA generativa integrada** | ✅ Nativo (Gemini) | 🟡 Módulo add-on costoso | 🟡 Beta/limitado |
| **Voice Link en tiempo real** | ✅ Sí | ❌ No | ❌ No |
| **Inspección visual por IA** | ✅ Nativo | ❌ No | ❌ No |
| **Viajeros con QR** | ✅ Nativo | 🟡 Customización | 🟡 Módulo adicional |
| **Cotizador IA en lenguaje natural** | ✅ Sí | ❌ No | ❌ No |
| **Mantenimiento requerido** | Mínimo (SaaS) | Alto (servidores) | Medio |
| **Acceso móvil nativo** | ✅ PWA | 🟡 App separada | 🟡 App separada |
| **Soporte en México** | ✅ Local IA.AGUS | ❌ Partners globales | 🟡 Community |
| **Curva de aprendizaje** | Baja (IA asiste) | Muy alta | Media-alta |

> **McVill ERP es la opción estratégica para pymes metalmecánicas mexicanas que quieren tecnología de vanguardia a un costo accesible, con soporte local y IA nativa desde el primer día.**

---

## 16. Roadmap — Versiones Futuras

### v2.5 — Entregado (Mayo 2026) ✅
- [x] 36 módulos en producción (30 listos, 5 pendientes de hardware McVill, 1 en progreso)
- [x] Tema visual "Acero Azul Profesional" — interfaz clara para entorno de oficina
- [x] Multi-tenant dinámico — 100% white-label configurable desde Supabase
- [x] Sidebar reorganizado por áreas lógicas industriales (Operaciones, Calidad, Comercial, etc.)
- [x] Guías de módulo específicas para los 36 módulos (cada panel muestra su propia guía)
- [x] Fix de permisos por rol (Admin, CEO, Sistemas con acceso total a Configuración)
- [x] Inspección Visual IA como módulo independiente
- [x] PPAP/FAI, VOC, Biblioteca de Defectos, Shop Floor Monitor completados
- [x] Cotizador ROI, Metal Quoter, Control de Costos, Costeo en Vivo completados
- [x] Layout de Planta, Simulador de Procesos completados

### v2.6 — Q3 2026
- [ ] App móvil nativa (iOS/Android) para operadores de piso — en progreso
- [ ] Notificaciones push para alertas críticas en celular
- [ ] Integración con CFDI 4.0 para facturación electrónica
- [ ] Videograbadores IA en líneas de producción (requiere hardware McVill)
- [ ] Microscopía de microdefectos (requiere microscopio digital McVill)

### v3.0 — Q4 2026
- [ ] Cámaras Go/No-Go en ensamble (requiere cámaras industriales McVill)
- [ ] Visión en soldadura con cámara industrial/IR (requiere hardware McVill)
- [ ] Sensores IoT en ensamble/soldadura + gateway (requiere hardware McVill)
- [ ] Portal de clientes (cliente consulta estado de su orden directamente)
- [ ] Integración con PEMEX, T-MEC y clientes tier-1 (Vitro, etc.)
- [ ] BI avanzado con drill-down interactivo

### v3.5 — 2027
- [ ] Agente autónomo de producción (ajusta el plan de producción sin intervención humana)
- [ ] Integración ERP-to-ERP con clientes principales via EDI

---

## 17. Política de Datos y Privacidad

### Propiedad de los Datos
**Los datos son 100% propiedad de McVill.** IA.AGUS no tiene acceso a la base de datos de producción. Supabase actúa como proveedor de infraestructura bajo acuerdo de confidencialidad.

### Datos que se envían a la IA de Google
Cuando el Chat IA o Voice Link procesan una consulta, el texto de la pregunta y el contexto del ERP (snapshot de datos del momento) se envían a la API de Google Gemini para generar la respuesta. **No se envían**: contraseñas, datos bancarios completos, ni información personal identificable de empleados más allá del nombre y área.

Google Gemini API tiene política de no uso de datos de clientes para entrenar modelos (ver: ai.google.dev/terms).

### Cumplimiento
- **LGPD (Ley General de Protección de Datos Personales México):** El sistema permite exportar y eliminar datos de empleados bajo solicitud
- **ISO 27001:** La infraestructura de Supabase está certificada
- **SOC 2 Type II:** Supabase y Vercel están certificados

### Retención de Datos
- **Datos operativos** (órdenes, inventario, nómina): Sin límite mientras la suscripción esté activa
- **Logs de auditoría:** 12 meses
- **Backup automático:** 7-30 días según el plan

---

## 18. Soporte IA.AGUS

McVill ERP es desarrollado y mantenido por **IA.AGUS**, la firma de automatización e inteligencia artificial industrial con sede en Torreón, Coahuila, México.

### Canales de Soporte

| Canal | Disponibilidad | Tipo de Soporte |
|---|---|---|
| **WhatsApp Ejecutivo** | L-V 9am-7pm CST | Problemas urgentes, consultas |
| **Email:** soporte@ia-agus.com | 24h | Reportes de bugs, solicitudes |
| **Web:** ia-agus.com | Siempre | Documentación, tutoriales |
| **Chat IA dentro del ERP** | Siempre | Guía de uso, preguntas del sistema |

### Niveles de Soporte

**Soporte Estándar (incluido):**
- Corrección de bugs críticos: 24-48h
- Actualizaciones de seguridad: automáticas
- Documentación y guías: acceso permanente

**Soporte Premium (plan adicional):**
- Tiempo de respuesta garantizado: < 4h
- Capacitaciones adicionales
- Desarrollo de módulos personalizados
- Acceso a roadmap privado y versiones beta

### Actualizaciones del Sistema
Las actualizaciones se despliegan automáticamente en Vercel sin tiempo de inactividad. El sistema siempre está en la última versión sin que el usuario tenga que hacer nada.

---

## 19. Glosario de Términos

| Término | Definición |
|---|---|
| **API Key** | Llave de acceso a los servicios de IA de Google. Se configura una vez en Administración. |
| **BOM** | Bill of Materials — Lista de Materiales. Componentes necesarios para fabricar una pieza. |
| **CAPA** | Acción Correctiva y Acción Preventiva. Ciclo de gestión de No Conformidades. |
| **CDN** | Content Delivery Network. Red global que entrega la aplicación rápidamente desde el servidor más cercano. |
| **Cp / Cpk** | Índices de Capacidad de Proceso. Miden qué tan bien un proceso cumple tolerancias. Cp ≥ 1.33 = capaz. |
| **ECO** | Engineering Change Order. Cambio formal en el diseño de ingeniería con trazabilidad. |
| **Embedding** | Representación matemática de texto como vector numérico, usada para búsqueda semántica. |
| **ERP** | Enterprise Resource Planning. Sistema integrado de gestión empresarial. |
| **Gantt** | Diagrama de barras que muestra el cronograma de órdenes de producción en el tiempo. |
| **HNSW** | Hierarchical Navigable Small World. Algoritmo de búsqueda vectorial ultrarrápida. |
| **HSE** | Health, Safety & Environment. Seguridad industrial y medio ambiente. |
| **JWT** | JSON Web Token. Mecanismo de autenticación seguro que funciona como "pasaporte digital". |
| **KPI** | Key Performance Indicator. Indicador Clave de Desempeño. |
| **MRP** | Material Requirements Planning. Cálculo de materiales necesarios según el plan de producción. |
| **NC** | No Conformidad. Desviación de un requisito de calidad que requiere acción correctiva. |
| **OEE** | Overall Equipment Effectiveness. Eficiencia global del equipo = Disponibilidad × Rendimiento × Calidad. |
| **OT** | Orden de Trabajo. Documento que autoriza y controla la ejecución de un trabajo de producción. |
| **pgvector** | Extensión de PostgreSQL para almacenar y buscar vectores de embeddings. |
| **Pipeline** | Tubería de ventas. Conjunto de cotizaciones en diferentes etapas de avance. |
| **RAG** | Retrieval-Augmented Generation. Técnica que combina búsqueda en documentos con generación de IA. |
| **RFQ** | Request for Quotation. Solicitud de Cotización de un cliente potencial. |
| **RLS** | Row Level Security. Seguridad a nivel de fila en PostgreSQL — cada empresa solo ve sus datos. |
| **ROI** | Return on Investment. Retorno sobre la Inversión. |
| **S&OP** | Sales & Operations Planning. Proceso de alineación entre ventas y capacidad operativa. |
| **SPC** | Statistical Process Control. Control Estadístico de Proceso. |
| **Supabase** | Plataforma backend open-source basada en PostgreSQL. Proporciona base de datos, autenticación y almacenamiento. |
| **Tenant** | Empresa o cliente que usa el ERP. Cada tenant tiene sus datos aislados. |
| **Token** | Unidad mínima de texto procesada por la IA (≈ 4 caracteres). Los costos de IA se miden en tokens. |
| **TLS** | Transport Layer Security. Protocolo de cifrado que protege los datos en tránsito (el "candado" en HTTPS). |
| **Vercel** | Plataforma de despliegue del frontend. Entrega la aplicación web globalmente con latencia mínima. |
| **Viajero** | Documento de ruta que acompaña físicamente cada pieza durante su fabricación. |
| **Voice Link** | Asistente de voz en tiempo real integrado en el ERP, powered by Gemini Live API. |

---

*Manual preparado por IA.AGUS — ia-agus.com*
*Para soporte: soporte@ia-agus.com*
*McVill ERP v2.6 — Mayo 2026*
