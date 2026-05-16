# McVill Control ERP
### Operational Intelligence & Industrial Control System
> *La evolución del control industrial impulsada por Inteligencia Artificial.*

---

## Visión General

**McVill Control ERP** es un ecosistema de gestión de recursos empresariales de última generación, diseñado bajo el estándar **Agus Pro**. Fusiona una estética **Cyber-Industrial** inmersiva con IA avanzada para centralizar, automatizar y optimizar cada proceso vital de una organización industrial.

Arquitectura multi-tenant sobre Supabase (PostgreSQL + Auth + RLS), frontend React/TypeScript con Tailwind CSS, desplegado en Vercel.

---

## Módulos

### Operaciones (todos los roles)

| Módulo | Descripción |
|---|---|
| **Tablero de Control** | KPI center en tiempo real: empleados activos, asistencia del día, órdenes de trabajo, stock crítico, ROI mensual y gráfica de actividad 7 días |
| **Inventarios** | Gestión de materiales con stock mínimo, alertas de nivel crítico y fallback automático a tabla `suministros` |
| **Planta / Producción** | Órdenes de trabajo (`work_orders`) con estados, prioridades y asignación por operador |
| **Viajeros** | Tarjeta de proceso por pieza: operaciones por centro de trabajo, materiales, trazabilidad de estado, chat IA por pieza, escaneo QR y análisis visual con Gemini Vision |
| **Calidad** | Inspecciones de calidad, No-Conformidades (NC) con severidad y acciones correctivas/preventivas, Auditorías internas con resultado y hallazgos |
| **Factibilidad** | Gate de factibilidad técnica antes de producción: BOM completo, capacidad, herramienta, tiempo y riesgo |
| **Cotizador ROI** | Calculadora de retorno de inversión para proyectos y propuestas |

### Capital Humano (Godmode: CEO · Gerente · Sistemas)

| Módulo | Descripción |
|---|---|
| **RH** | Alta, edición y baja de empleados con puesto, salario diario, RFC, número de empleado y fotografía |
| **Nómina** | Cálculo por periodo: salario base, horas extra (2×), bono OEE (5% si OEE ≥ 85%), deducciones por ausencias e ISR 12%. Exporta recibo PDF |
| **Asistencia** | Registro de asistencia por empleado con estados (presente / tardanza / ausente), minutos trabajados y horas extra. Escaneo de badge |

### Comercial (Godmode)

| Módulo | Descripción |
|---|---|
| **Ventas** | Pipeline comercial y seguimiento de oportunidades |
| **Compras** | Órdenes de compra a proveedor con estado y seguimiento |
| **Agente Cotizaciones IA** | Agente conversacional que genera cotizaciones con análisis de factibilidad, costeo y propuesta automática |
| **Kanban RFQ** | Tablero kanban de solicitudes de cotización (RFQ) por etapa: nuevo → en revisión → cotizado → ganado/perdido |
| **Factibilidad IA** | Análisis de factibilidad asistido por IA con scoring automático |
| **OC Cliente** | Gestión de Órdenes de Compra de cliente con autofill en Viajeros (llena número de parte, cliente, descripción y fecha de entrega al seleccionar OC) |

### Finanzas (Godmode)

| Módulo | Descripción |
|---|---|
| **Finanzas** | Cuentas por cobrar (CxC) y cuentas por pagar (CxP) con estados y montos |
| **Costos** | Análisis de márgenes y costeo por proyecto con mano de obra desde nómina |
| **Costeo Live** | Dashboard de costeo en tiempo real por viajero: materiales, operaciones, overhead |

### Avanzado (Godmode)

| Módulo | Descripción |
|---|---|
| **Ingeniería** | Proyectos de ingeniería con listas de materiales (BOM) y fases |
| **Instrucciones de Trabajo** | Catálogo de instrucciones por operación con revisión controlada |
| **SPC / Alertas** | Control Estadístico de Proceso: gráficas X-R, límites de control y alertas automáticas |
| **Desempeño Operadores** | KPIs individuales: eficiencia, tasa de calidad, asistencia, tendencia y bonos de incentivo |
| **Trazabilidad** | Rastreo completo pieza a pieza desde materia prima hasta entrega |
| **HSE** | Seguridad, Higiene y Medio Ambiente: incidentes, inspecciones y indicadores |
| **Mantenimiento** | Órdenes de mantenimiento correctivo y preventivo con historial de equipo |
| **Reportes** | Generación de reportes PDF (jsPDF + autotable) por módulo |
| **Configuración** | Ajuste de marca, logo, colores, integraciones y parámetros del sistema |

### Inteligencia Artificial

| Feature | Descripción |
|---|---|
| **Chat IA** | Chat inmersivo con contexto del ERP: consulta inventario, órdenes, empleados y KPIs en lenguaje natural |
| **Manual ERP** | Guía interactiva asistida por IA con documentación del sistema |
| **Voice Link** | Interfaz de voz para operar el ERP por comandos |
| **Minutas IA** | Generación automática de minutas de reuniones con puntos de acción |
| **Gemini Vision** | Análisis visual de piezas y dibujos en el módulo Viajeros |

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS v4 — tema Cyber-Dark personalizado |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| IA Texto | Gemini 2.5 Flash Lite / GPT-4 / DeepSeek (configurable por tenant) |
| IA Visión | Gemini Vision API |
| PDF | jsPDF + jspdf-autotable |
| Gráficas | Recharts |
| Despliegue | Vercel (frontend) + Supabase Cloud (backend) |

---

## Seguridad & Multi-Tenant

- **RLS (Row Level Security)** en todas las tablas — cada tenant solo ve sus datos
- Función `auth_user_role()` con `SECURITY DEFINER` para evitar recursión infinita en políticas que consultan `profiles`
- Roles: `ceo`, `gerente`, `sistemas`, `rh`, `finanzas`, `contabilidad`, `supervisor`, `empleado`
- Godmode (CEO / Gerente / Sistemas): acceso completo a todos los módulos
- Sidebar con permisos por rol — ítems ocultos según acceso

---

## Base de Datos — Tablas Principales

```
tenants                    — Configuración por empresa
profiles                   — Perfil de usuario + rol
employees                  — Empleados
attendance_records         — Registros de asistencia
nominas                    — Nóminas calculadas
work_orders                — Órdenes de trabajo
viajeros                   — Tarjetas de proceso
viajero_operaciones        — Operaciones por viajero
viajero_materiales         — Materiales por viajero
materiales                 — Catálogo de materiales/inventario
ordenes_compra_cliente     — OC de cliente (autofill en viajeros)
ordenes_mantenimiento      — OC de mantenimiento
quality_inspections        — Inspecciones de calidad
no_conformidades           — No conformidades (NC)
auditorias_internas        — Auditorías internas
cuentas_cobrar             — CxC (finanzas)
cuentas_pagar              — CxP (finanzas)
financial_transactions     — Movimientos financieros
engineering_projects       — Proyectos de ingeniería
clientes                   — Catálogo de clientes
cotizaciones               — Cotizaciones generadas
```

---

## Instalación y Desarrollo

```bash
# 1. Clonar
git clone https://github.com/ia-mcvill-projects/mcvill-erp.git
cd mcvill-erp

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env
# Editar .env con tus claves de Supabase

# 4. Dev
npm run dev
```

**Variables requeridas:**
```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## Seed de Datos

Para cargar datos de prueba en una instalación nueva:

```bash
# Datos principales (work_orders, asistencia, finanzas)
node seed_erp.js

# Calidad, OC cliente, no-conformidades, auditorías
node seed_quality_oc.js
```

---

## Fixes & Mejoras Recientes (v1.1)

- Corregida recursión infinita de RLS en tabla `profiles` (PostgreSQL 42P17) mediante función `SECURITY DEFINER`
- Nombres de tablas unificados: `empleados` → `employees`, `asistencia` → `attendance_records`
- Sidebar scroll corregido (`min-h-0` en contenedor flex para permitir overflow-y-auto)
- `ViajeroManagerModal` usa `Promise.allSettled` — una tabla faltante no bloquea la carga de catálogos
- `financeService` retorna `[]` con fallback gracioso en lugar de throw si CxC/CxP no existen
- `payrollService` — corrección de claves demo, índice de join Supabase (`[0]`), y propiedad `p.empleados`
- `McVillChat` — columnas corregidas: `order_number`/`status` en `work_orders`, `descripcion_mp` en materiales
- `inventoryService` — eliminado `order('descripcion_mp')` inválido; fallback a tabla `suministros`

---

## Contacto

| Canal | Detalle |
|---|---|
| Web | [ia-agus.com](https://www.ia-agus.com) |
| Soporte | soporte@ia-agus.com |
| Desarrollador | [@agusstinprieto-eng](https://github.com/agusstinprieto-eng) |

---

Desarrollado por **[IA.AGUS](https://www.ia-agus.com)** — *Control Total. Inteligencia Infinita.*
