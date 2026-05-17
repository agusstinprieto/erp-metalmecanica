# ERP Metalmecánica
### Operational Intelligence & Industrial Control System
> *La evolución del control industrial impulsada por Inteligencia Artificial.*

---

## Visión General

**ERP Metalmecánica** es un ecosistema de gestión de recursos empresariales de última generación diseñado para industria metalmecánica y manufactura. Fusiona una estética **Cyber-Industrial** inmersiva con IA avanzada para centralizar, automatizar y optimizar cada proceso de una organización industrial.

Arquitectura **multi-tenant 100% white-label** sobre Supabase (PostgreSQL + Auth + RLS), frontend React/TypeScript con Tailwind CSS v4, y servicio de reportes C# con MigraDoc. Desplegado en Vercel.

---

## Módulos

### Operaciones

| Módulo | Descripción |
|---|---|
| **Tablero de Control** | KPI center en tiempo real: empleados activos, asistencia del día, órdenes de trabajo, stock crítico, ROI mensual y gráfica de actividad 7 días |
| **Inventarios** | Gestión de materiales con stock mínimo, alertas de nivel crítico y fallback automático |
| **Planta / Producción** | Órdenes de trabajo con estados, prioridades y asignación por operador |
| **Dashboard Producción** | Panel ejecutivo de producción con KPIs consolidados y tendencias |
| **Viajeros** | Tarjeta de proceso por pieza: operaciones por centro de trabajo, materiales, trazabilidad de estado, chat IA, escaneo QR y análisis visual con Gemini Vision. Genera reportes PDF premium vía C# (MigraDoc) |
| **Trazabilidad Lote/Serie** | Control total lote→pieza→entrega: registro de lotes, usos por viajero/orden, historial de revisiones ECO. Cuarentena, rechazo y disponibilidad en tiempo real |
| **Shop Floor** | Seguimiento en tiempo real del piso de planta: operadores activos, tiempos por operación y estado de celdas de trabajo |
| **Planeación** | Programación de producción con asignación de recursos y calendario de órdenes |
| **Calidad** | Inspecciones, No-Conformidades con severidad, acciones correctivas/preventivas, Auditorías internas |
| **Inspección IA Visual** | Motor neural de inspección: captura imagen de la pieza, analiza con Gemini Vision y emite veredicto PASS/FAIL con descripción de defecto |
| **Cámaras en Vivo** | Feeds MJPEG de cámaras IP del piso de planta con análisis IA por frame bajo demanda |
| **Bib. Defectos** | Biblioteca de defectos visuales catalogados: código, descripción, imágenes de referencia y criterios de aceptación |
| **Factibilidad** | Gate técnico antes de producción: BOM, capacidad, herramienta, tiempo y riesgo con scoring IA |
| **PPAP** | Production Part Approval Process: gestión de submittals por nivel con documentos requeridos |
| **VOC** | Voice of Customer: registro de feedback de clientes, clasificación y dashboards de tendencia |
| **HSE** | Seguridad, Higiene y Medio Ambiente: incidentes, inspecciones y indicadores |
| **Mantenimiento** | Órdenes de mantenimiento correctivo y preventivo con historial de equipo y alertas predictivas |

### Capital Humano

| Módulo | Descripción |
|---|---|
| **RH** | Alta, edición y baja de empleados con puesto, salario, RFC, número de empleado y fotografía |
| **Nómina** | Cálculo por periodo: salario base, horas extra (2×), bono OEE, deducciones ISR. Exporta recibo PDF |
| **Asistencia** | Registro de asistencia con estados, minutos trabajados y horas extra. Escaneo de badge |
| **Reclutamiento** | Pipeline de candidatos por etapa: aplicación → entrevista → oferta → contratación |
| **Desempeño** | KPIs individuales: eficiencia, tasa de calidad, asistencia y bonos de incentivo |

### Comercial

| Módulo | Descripción |
|---|---|
| **Ventas** | Pipeline comercial y seguimiento de oportunidades |
| **Compras** | Catálogo de proveedores, materiales, operaciones y órdenes de compra con seguimiento |
| **Agente Cotizaciones IA** | Agente conversacional que genera cotizaciones completas con análisis de factibilidad y costeo automático |
| **Kanban RFQ** | Tablero kanban de solicitudes de cotización por etapa: nuevo → en revisión → cotizado → ganado/perdido |
| **Cotizador Express** | Calculadora rápida de costos y precios para cotizaciones informales |
| **OC Cliente** | Gestión de Órdenes de Compra del cliente con autofill en Viajeros |

### Finanzas

| Módulo | Descripción |
|---|---|
| **Finanzas** | CxC y CxP con estados, montos y seguimiento de vencimientos |
| **Costos** | Análisis de márgenes y costeo por proyecto |
| **Costeo Live** | Dashboard en tiempo real por viajero: materiales, operaciones y overhead |

### Ingeniería

| Módulo | Descripción |
|---|---|
| **Ingeniería** | Proyectos con BOM y fases |
| **Instrucciones de Trabajo** | Catálogo por operación con revisión controlada |
| **Nesting** | Optimización de corte y anidamiento de piezas en lámina |
| **Layout Design** | Diseño de distribución de planta (facility layout) |
| **Simulador de Proceso** | Simulación de tiempos y cuellos de botella por ruta de manufactura |
| **Analizador de Planos IA** | Carga un plano técnico (PDF/imagen), Gemini Vision extrae dimensiones, tolerancias y notas |
| **SPC / Alertas** | Control Estadístico de Proceso: gráficas X-R, límites de control y alertas automáticas |
| **Reportes** | Generación de reportes PDF por módulo (jsPDF + servicio C# MigraDoc) |
| **Configuración** | Ajuste de marca, logo, colores por tema, modelo IA activo e integraciones |

### Inteligencia Artificial

| Feature | Descripción |
|---|---|
| **Chat IA** | Chat inmersivo con contexto completo del ERP: inventario, órdenes, empleados y KPIs en lenguaje natural |
| **Voice Link** | Interfaz de voz para operar el ERP por comandos de voz en tiempo real |
| **Minutas IA** | Generación automática de minutas de reunión con puntos de acción y responsables |
| **Gemini Vision (Viajeros)** | Análisis visual de piezas en tarjetas de proceso |
| **Inspección IA Neural** | Motor de inspección en tiempo real con feed de cámaras IP |
| **Analizador de Planos** | Extracción automática de datos técnicos desde planos 2D |
| **Agente Cotizaciones** | Agente con razonamiento multi-paso: factibilidad → BOM → costeo → propuesta |
| **Factibilidad IA** | Scoring automático de factibilidad técnica y comercial |

---

## Sistema de Temas (White-Label)

El ERP incluye un sistema de temas dinámico con cambio en vivo sin recarga:

| Tema | Acento | Descripción |
|---|---|---|
| **Blue Neural** (default) | `#4FA5FF` | Azul neural — estética corporativa tech |
| **Emerald** | `#10B981` | Verde industrial — manufactura y operaciones |
| **Slate** | `#94A3B8` | Gris profesional — neutro y limpio |
| **Carbon** | `#FF6B00` | Negro + naranja — industrial pesado |

Todos los colores de botones, íconos y acentos de paneles se actualizan automáticamente al tema activo vía `--theme-accent`. Los colores semánticos de estado (verde=disponible, ámbar=alerta, rojo=error) permanecen siempre constantes.

Los **botones de IA** tienen estilo propio (gradiente indigo→violet + shimmer) independiente del tema, para identificarlos visualmente de inmediato.

---

## White-Label 100%

Cada tenant configura desde el panel de Configuración:

- Nombre de empresa y razón social
- Logo (dark / light)
- Color de acento y tema visual
- Modelo de IA activo (Gemini, GPT-4, DeepSeek)
- Empresa en PDFs (reportes, viajeros, nómina)
- Mensajes de WhatsApp con nombre de empresa
- Prompts de IA con contexto de la empresa

El prefijo interno de clases CSS es solo el namespace del design system — ningún tenant lo ve.

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS v4 — sistema de temas con CSS variables |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Reportes PDF | C# ASP.NET Core + MigraDoc (servicio independiente) |
| IA Texto | Gemini 2.5 Flash / GPT-4o / DeepSeek (configurable por tenant) |
| IA Visión | Gemini Vision API |
| PDF cliente | jsPDF + jspdf-autotable |
| Gráficas | Recharts |
| Animaciones | Framer Motion |
| Despliegue | Vercel (frontend) + Supabase Cloud (backend) |

---

## Seguridad & Multi-Tenant

- **RLS (Row Level Security)** en todas las tablas — cada tenant aislado completamente
- Función `auth_user_role()` con `SECURITY DEFINER` para evitar recursión en políticas
- Roles: `ceo`, `gerente`, `sistemas`, `rh`, `finanzas`, `contabilidad`, `supervisor`, `empleado`
- Sidebar con visibilidad condicional por rol
- Auto-reload ante errores de chunk dinámico post-deploy (sin pantallas rotas al actualizar versión)

---

## Base de Datos — Tablas Principales

```
tenants                    — Configuración e identidad por empresa
profiles                   — Perfil de usuario + rol
employees                  — Empleados
attendance_records         — Registros de asistencia
nominas                    — Nóminas calculadas
work_orders                — Órdenes de trabajo
viajeros                   — Tarjetas de proceso (industrial travelers)
viajero_operaciones        — Operaciones por viajero
viajero_materiales         — Materiales por viajero
materiales                 — Catálogo de materiales/inventario
lotes_material             — Lotes de material recibidos (trazabilidad)
uso_lotes                  — Registro de uso lote→viajero (trazabilidad)
revision_history           — Historial de cambios de revisión ECO
ordenes_compra_cliente     — OC cliente (autofill en viajeros)
ordenes_mantenimiento      — Órdenes de mantenimiento
quality_inspections        — Inspecciones de calidad
no_conformidades           — No conformidades (NC)
auditorias_internas        — Auditorías internas
cuentas_cobrar             — CxC
cuentas_pagar              — CxP
financial_transactions     — Movimientos financieros
engineering_projects       — Proyectos de ingeniería
clientes                   — Catálogo de clientes
cotizaciones               — Cotizaciones generadas
productos                  — Catálogo de productos/partes
```

---

## Instalación y Desarrollo

```bash
# 1. Clonar
git clone https://github.com/agusstinprieto-eng/erp-metalmecanica.git
cd erp-metalmecanica

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env
# Editar .env con tus claves de Supabase y API keys de IA

# 4. Dev
npm run dev
```

**Variables requeridas:**
```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GEMINI_API_KEY=<gemini-key>
```

---

## Documentación

Todos los documentos están en la carpeta [`Archivos MD/`](./Archivos%20MD/):

| Documento | Descripción |
|---|---|
| `MANUAL_EJECUTIVO_ERP.md` | Manual completo para el usuario final |
| `VIAJEROS_INTELIGENTES.md` | Guía del módulo de Viajeros industriales |
| `GUIA-ENTREGA-MODULOS-ERP.md` | Guía de entrega y activación de módulos |
| `MODELO-NEGOCIO-SAAS.md` | Análisis de modelo de negocio y pricing SaaS |
| `COMPARATIVA_SQL_SERVER_SUPABASE.md` | Comparativa de bases de datos |
| `PLAN_ADAPTACION_JOHN_DEERE.md` | Plan de adaptación para vertical automotriz |
| `REPORTES_SISTEMA.md` | Documentación del servicio de reportes C# |
| `DEMO-ERP-30MIN.md` | Script de demo de 30 minutos |

---

## Contacto

| Canal | Detalle |
|---|---|
| Web | [ia-agus.com](https://www.ia-agus.com) |
| Soporte | soporte@ia-agus.com |
| Desarrollador | [@agusstinprieto-eng](https://github.com/agusstinprieto-eng) |

---

Desarrollado por **[IA.AGUS](https://www.ia-agus.com)** — *Control Total. Inteligencia Infinita.*
