# Guía de Entrega de Módulos del McVill ERP

**Propósito:** Referencia para saber qué archivos entregar cuando se vende un módulo del McVill ERP a un programador externo que trabaja con SQL Server u otro stack diferente.

**ERP base:** McVill Control — React 19 + Vite + TypeScript + Supabase (PostgreSQL)
**Programador receptor:** Stack SQL Server (C#, .NET, WinForms, Crystal Reports, u otro)

---

## El Paquete Estándar de Entrega

```
modulo-mcvill-v1.0/
├── database/
│   ├── 01_create_tables.sql        ← DDL adaptado a SQL Server (CREATE TABLE, PK, FK, índices)
│   ├── 02_seed_data.sql            ← Catálogos y datos iniciales de ejemplo
│   └── 03_stored_procedures.sql    ← SPs opcionales si el módulo los requiere
├── src/
│   └── (carpeta del módulo: componentes React + servicios TypeScript)
├── docs/
│   ├── API_endpoints.md            ← Endpoints disponibles con ejemplos JSON
│   └── INTEGRACION.md              ← Cómo conectar con el ERP del cliente
└── README.md                       ← Instrucciones de arranque y conexión
```

---

## Conversión de Nuestro Stack a SQL Server

Nuestras migraciones usan PostgreSQL/Supabase. Para SQL Server hay que cambiar:

| PostgreSQL (nuestro)                        | SQL Server (cliente)                         |
|---------------------------------------------|----------------------------------------------|
| `UUID PRIMARY KEY DEFAULT gen_random_uuid()`| `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()`|
| `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`    | `DATETIME DEFAULT GETDATE()`                 |
| `BOOLEAN`                                   | `BIT`                                        |
| `TEXT` / `VARCHAR(n)`                       | `NVARCHAR(MAX)` / `NVARCHAR(n)`              |
| `JSONB`                                     | `NVARCHAR(MAX)` (JSON como string)           |
| `DECIMAL(12,2)`                             | `DECIMAL(12,2)` ← igual                      |
| `SERIAL` / `gen_random_uuid()`              | `INT IDENTITY(1,1)` o `NEWID()`              |
| `CHECK (status IN (...))`                   | `CHECK (status IN (...))` ← igual            |
| `RLS Policies`                              | Manejo de permisos en la capa de aplicación  |

**Nota:** Los índices y FKs funcionan igual. Solo cambian los tipos y la sintaxis de defaults.

---

## Tabla de Módulos Disponibles

| Módulo                   | Tablas principales | Estado     | Listo para entregar |
|--------------------------|--------------------|------------|---------------------|
| Viajeros Inteligentes    | 5 tablas           | Completo   | Sí (ya entregado)   |
| Producción / Shop Floor  | 2 tablas           | Completo   | Sí                  |
| Inventario               | 2 tablas           | Completo   | Sí                  |
| Nómina (Quantum Payroll) | 4 tablas           | Completo   | Sí                  |
| Recursos Humanos         | 6 tablas           | Completo   | Sí                  |
| Ingeniería / BOM         | 2 tablas           | Completo   | Sí                  |
| Calidad (QMS)            | 2 tablas           | Completo   | Sí                  |
| Mantenimiento            | 3 tablas           | Completo   | Sí                  |
| Costeo / Cotización      | 2 tablas           | Avanzado   | Sí                  |

---

## Ejemplos por Módulo

---

### Módulo: Viajeros Inteligentes
*(Referencia perfecta — ya entregado a McVill con SQL Server)*

**Qué hace:** El Viajero es el "ADN" de una orden de trabajo. Acompaña la pieza a través de toda la planta registrando operaciones, materiales, tiempos y costos. Tiene QR para escaneo en piso, modo TV para pantalla de producción y generación de PDF industrial.

**Stack entregado:**
- Backend: .NET 8 + Dapper + QuestPDF
- Base de datos: SQL Server
- API REST con Swagger en `http://localhost:5005`

**Tablas (ya en SQL Server):**

```sql
CREATE TABLE viajeros (
    id                  NVARCHAR(100)   NOT NULL PRIMARY KEY,
    numero_parte        NVARCHAR(200),
    descripcion         NVARCHAR(500),
    revision            NVARCHAR(50),
    cliente             NVARCHAR(200),
    cantidad_orden      FLOAT,
    cant_fabricada      FLOAT,
    oc_cliente          NVARCHAR(200),
    linea               NVARCHAR(100),
    fecha_orden         DATETIME,
    fecha_entrega       DATETIME,
    cotizacion          NVARCHAR(200),
    horas_est_totales   FLOAT,
    notas               NVARCHAR(MAX),
    es_maestro          BIT DEFAULT 0
);

CREATE TABLE viajero_operaciones (
    id                      INT IDENTITY(1,1) PRIMARY KEY,
    viajero_id              NVARCHAR(100) NOT NULL REFERENCES viajeros(id),
    orden                   INT,
    clave_operacion         NVARCHAR(50),
    nombre_operacion        NVARCHAR(200),
    centro_trabajo          NVARCHAR(100),
    descripcion_detallada   NVARCHAR(MAX),
    tiempo_estimado         FLOAT,
    tiempo_real             FLOAT,
    costo_hora_mxn          DECIMAL(12,2),
    status                  NVARCHAR(50) DEFAULT 'pendiente'
    -- pendiente | en_proceso | completada | bloqueada
);

CREATE TABLE viajero_materiales (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    viajero_id          NVARCHAR(100) NOT NULL REFERENCES viajeros(id),
    descripcion         NVARCHAR(500),
    cantidad            FLOAT,
    unidad              NVARCHAR(50),
    costo_unitario_mxn  DECIMAL(12,2),
    ubicacion_almacen   NVARCHAR(100)
);
```

**Endpoints:**
- `GET /api/reports/viajero/{jobID}` — Descarga PDF del viajero
- `POST /api/reports/viajero/print-selected` — PDF combinado de varios trabajos `{"jobIds":["J1","J2"]}`
- `GET /api/reports/viajero/list` — JSON con todos los trabajos activos

**Archivos que se entregan:**
```
ENVIO_PROGRAMADOR_MCVILL/
├── INSTRUCCIONES_INSTALACION.md
├── DESPLIEGUE_AZURE_Y_SQL.md
├── START_SERVICE.ps1
└── reporting-service-sqlserver/    ← Proyecto .NET completo
```

---

### Módulo: Producción / Shop Floor

**Qué hace:** Control de Órdenes de Trabajo (OT). Seguimiento del estado de fabricación desde que se crea la orden hasta que sale a calidad. Historial completo de cambios de estado con quién y cuándo.

**Stack del módulo:**
- Frontend: `ProductionView.tsx`, `ShopFloorTracking.tsx`
- Servicio: `productionService.ts`

**Tablas adaptadas a SQL Server:**

```sql
CREATE TABLE work_orders (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER,
    order_number    NVARCHAR(50) UNIQUE NOT NULL,  -- Formato: OT-2026-001
    product_id      UNIQUEIDENTIFIER,
    quantity        INT NOT NULL DEFAULT 1,
    status          NVARCHAR(30) DEFAULT 'pending',
    -- pending | in_progress | quality_check | completed | cancelled
    priority        NVARCHAR(20) DEFAULT 'medium',
    -- low | medium | high | urgent
    assigned_to     UNIQUEIDENTIFIER,              -- FK a employees
    start_date      DATETIME,
    due_date        DATETIME,
    completed_at    DATETIME,
    notes           NVARCHAR(MAX),
    created_at      DATETIME DEFAULT GETDATE(),
    updated_at      DATETIME DEFAULT GETDATE()
);

CREATE TABLE production_logs (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    work_order_id   UNIQUEIDENTIFIER NOT NULL REFERENCES work_orders(id),
    previous_status NVARCHAR(30),
    new_status      NVARCHAR(30),
    changed_by      UNIQUEIDENTIFIER,              -- FK a profiles/usuarios
    notes           NVARCHAR(MAX),
    created_at      DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_wo_status   ON work_orders(status);
CREATE INDEX idx_wo_priority ON work_orders(priority);
CREATE INDEX idx_log_order   ON production_logs(work_order_id);
```

**Qué incluye el módulo:**
- Vista de órdenes con filtros por estado y prioridad
- Timeline de cambios de estado por orden
- Asignación de operadores
- KPIs de cumplimiento (OT's a tiempo vs retrasadas)

---

### Módulo: Inventario

**Qué hace:** Control de materias primas y consumibles. Entradas y salidas de almacén con trazabilidad completa. Alertas de stock mínimo y análisis predictivo de demanda con IA.

**Stack del módulo:**
- Frontend: `InventoryView.tsx`, `InventoryAIModal.tsx`
- Servicio: `inventoryService.ts`

**Tablas adaptadas a SQL Server:**

```sql
CREATE TABLE materials (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER,
    name            NVARCHAR(255) NOT NULL,
    sku             NVARCHAR(50) UNIQUE,
    unit            NVARCHAR(50),                  -- kg, m, pza, lt, etc.
    unit_cost       DECIMAL(12,2) DEFAULT 0,
    category        NVARCHAR(100),                 -- acero, consumible, herramienta, etc.
    stock_quantity  DECIMAL(12,4) DEFAULT 0,
    min_stock       DECIMAL(12,4) DEFAULT 0,       -- umbral de alerta
    created_at      DATETIME DEFAULT GETDATE(),
    updated_at      DATETIME DEFAULT GETDATE()
);

CREATE TABLE inventory_movements (
    id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER,
    material_id UNIQUEIDENTIFIER NOT NULL REFERENCES materials(id),
    type        NVARCHAR(10) NOT NULL,             -- 'IN' (entrada) | 'OUT' (salida)
    quantity    DECIMAL(12,4) NOT NULL,
    reason      NVARCHAR(255),
    -- Ejemplos: "Compra proveedor", "Consumo en OT-2026-045", "Ajuste de inventario"
    created_by  UNIQUEIDENTIFIER,                  -- FK a usuarios
    created_at  DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_mat_sku      ON materials(sku);
CREATE INDEX idx_mov_material ON inventory_movements(material_id);
CREATE INDEX idx_mov_tipo     ON inventory_movements(type);
```

**Qué incluye el módulo:**
- Dashboard de stock con alertas visuales (rojo = bajo mínimo)
- Registro de entradas y salidas
- Historial de movimientos por material
- Análisis de demanda con Gemini IA

---

### Módulo: Nómina (Quantum Payroll)

**Qué hace:** Cálculo de nómina quincenal bajo la ley fiscal mexicana. Incluye ISR 2026, tablas del SAT, IMSS, INFONAVIT y soporte para timbrado CFDI.

**Stack del módulo:**
- Frontend: `PayrollView.tsx`, `PayrollCalculatorModal.tsx`
- Servicio: `payrollService.ts`

**Tablas adaptadas a SQL Server:**

```sql
CREATE TABLE payrolls (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER,
    employee_id     UNIQUEIDENTIFIER NOT NULL REFERENCES employees(id),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    days_worked     INT DEFAULT 15,
    gross_salary    DECIMAL(12,2) NOT NULL,
    deductions      DECIMAL(12,2) DEFAULT 0,
    net_salary      DECIMAL(12,2) NOT NULL,
    status          NVARCHAR(20) DEFAULT 'draft',
    -- draft | calculated | approved | paid
    payment_date    DATE,
    cfdi_uuid       UNIQUEIDENTIFIER,              -- UUID del timbrado SAT
    created_at      DATETIME DEFAULT GETDATE(),
    updated_at      DATETIME DEFAULT GETDATE()
);

CREATE TABLE payroll_concepts (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    payroll_id      UNIQUEIDENTIFIER NOT NULL REFERENCES payrolls(id),
    type            NVARCHAR(20) NOT NULL,         -- 'perception' | 'deduction'
    code            NVARCHAR(10),                  -- Clave SAT (001, 002, 002, etc.)
    description     NVARCHAR(255) NOT NULL,
    amount          DECIMAL(12,2) NOT NULL
);

CREATE TABLE employee_fiscal_data (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_id     UNIQUEIDENTIFIER UNIQUE REFERENCES employees(id),
    rfc             NVARCHAR(13) UNIQUE,
    curp            NVARCHAR(18) UNIQUE,
    nss             NVARCHAR(11) UNIQUE,
    bank_name       NVARCHAR(100),
    clabe           NVARCHAR(18),
    regimen_fiscal  NVARCHAR(100),
    created_at      DATETIME DEFAULT GETDATE()
);

CREATE TABLE tax_tables (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    year            INT NOT NULL,
    lower_limit     DECIMAL(15,2),
    upper_limit     DECIMAL(15,2),
    fixed_fee       DECIMAL(15,2),
    rate_pct        DECIMAL(5,2),
    -- Tablas ISR 2026 del SAT
    UNIQUE (year, lower_limit)
);

CREATE INDEX idx_payroll_emp    ON payrolls(employee_id);
CREATE INDEX idx_payroll_status ON payrolls(status);
CREATE INDEX idx_payroll_period ON payrolls(period_start, period_end);
```

**Qué incluye el módulo:**
- Calculadora de nómina con ISR automático
- Desglose por percepciones y deducciones (IMSS, INFONAVIT, ISR)
- Exportación a PDF por empleado y nómina completa
- Tablas ISR 2026 precargadas
- Soporte CFDI (timbrado SAT)

---

### Módulo: Recursos Humanos

**Qué hace:** Expediente digital completo de cada empleado. Incluye datos fiscales (RFC, CURP, NSS), matriz de habilidades por operador, certificaciones de seguridad (OSHA, ISO, NOM) y registro de entrega de EPP.

**Stack del módulo:**
- Frontend: `RHView.tsx`, `EmployeeFormModal.tsx`
- Servicio: `rhService.ts`

**Tablas adaptadas a SQL Server:**

```sql
CREATE TABLE employees (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER,
    employee_number NVARCHAR(50) UNIQUE NOT NULL,
    first_name      NVARCHAR(100) NOT NULL,
    last_name       NVARCHAR(100) NOT NULL,
    job_title       NVARCHAR(100),
    department      NVARCHAR(100),
    email           NVARCHAR(255),
    phone           NVARCHAR(50),
    rfc             NVARCHAR(13),
    curp            NVARCHAR(18),
    nss             NVARCHAR(11),
    daily_salary    DECIMAL(12,2) DEFAULT 0,
    hire_date       DATE DEFAULT GETDATE(),
    photo_url       NVARCHAR(MAX),
    status          NVARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active','inactive','on_leave','vacation','medical_leave')),
    created_at      DATETIME DEFAULT GETDATE(),
    updated_at      DATETIME DEFAULT GETDATE()
);

CREATE TABLE employee_skills (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_id         UNIQUEIDENTIFIER NOT NULL REFERENCES employees(id),
    skill_name          NVARCHAR(100) NOT NULL,  -- Soldadura, CNC, Pailería, etc.
    skill_level         NVARCHAR(20) DEFAULT 'basic',
    -- basic | intermediate | advanced | expert
    certified           BIT DEFAULT 0,
    certification_date  DATE,
    expiration_date     DATE,
    notes               NVARCHAR(MAX),
    UNIQUE (employee_id, skill_name)
);

CREATE TABLE certifications (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_id         UNIQUEIDENTIFIER NOT NULL REFERENCES employees(id),
    certification_type  NVARCHAR(100) NOT NULL,  -- OSHA, ISO, NFPA, FIRST_AID
    provider            NVARCHAR(255),
    issue_date          DATE NOT NULL,
    expiration_date     DATE NOT NULL,
    status              NVARCHAR(20) DEFAULT 'active',
    -- active | expired | pending_renewal
    document_url        NVARCHAR(MAX)
);

CREATE TABLE epp_deliveries (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    employee_id     UNIQUEIDENTIFIER NOT NULL REFERENCES employees(id),
    epp_item        NVARCHAR(100) NOT NULL,   -- Casco, Guantes, Lentes, Zapato, Respirador
    quantity        INT DEFAULT 1,
    delivery_date   DATE NOT NULL DEFAULT GETDATE(),
    condition_at_delivery NVARCHAR(50) DEFAULT 'new',  -- new | good | fair
    return_date     DATE,
    return_condition NVARCHAR(50),            -- good | fair | damaged | lost
    notes           NVARCHAR(MAX)
);
```

**Qué incluye el módulo:**
- Expediente digital por empleado con foto
- Importación masiva desde Excel
- Matriz de habilidades con niveles y vencimientos
- Alertas de certificaciones próximas a vencer
- Control de entrega y devolución de EPP

---

### Módulo: Ingeniería / BOM

**Qué hace:** Catálogo de productos con control de revisiones y lista de materiales (BOM). Vinculado al módulo de producción para crear órdenes de trabajo y al de inventario para validar disponibilidad.

**Stack del módulo:**
- Frontend: `EngineeringView.tsx`, `BlueprintAnalyzerModal.tsx`
- Servicio: `engineeringService.ts`

**Tablas adaptadas a SQL Server:**

```sql
CREATE TABLE products (
    id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id   UNIQUEIDENTIFIER,
    sku         NVARCHAR(50) UNIQUE NOT NULL,
    name        NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    revision    NVARCHAR(10) DEFAULT 'A',
    status      NVARCHAR(20) DEFAULT 'active',
    -- active | obsolete | in_development
    drawing_url NVARCHAR(MAX),          -- Link al plano (PDF o imagen)
    created_at  DATETIME DEFAULT GETDATE(),
    updated_at  DATETIME DEFAULT GETDATE()
);

CREATE TABLE bom_items (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    product_id      UNIQUEIDENTIFIER NOT NULL REFERENCES products(id),
    component_name  NVARCHAR(255) NOT NULL,
    material_id     UNIQUEIDENTIFIER REFERENCES materials(id),
    quantity        DECIMAL(12,4) NOT NULL,
    unit            NVARCHAR(20) DEFAULT 'pc',   -- pc, kg, m, lt, etc.
    notes           NVARCHAR(MAX),
    created_at      DATETIME DEFAULT GETDATE()
);
```

**Qué incluye el módulo:**
- Catálogo de productos con revisiones
- Editor de BOM (lista de materiales)
- Analizador de planos con IA (BlueprintAnalyzer — sube el PDF del plano, Gemini extrae la BOM automáticamente)
- Exportación de BOM a Excel

---

### Módulo: Calidad (QMS)

**Qué hace:** Sistema de Gestión de Calidad. Inspecciones por orden de trabajo con checkpoints parametrizados (dimensiones, acabado, torque, etc.). Registro de rechazos con causa raíz y trazabilidad completa.

**Stack del módulo:**
- Frontend: `QualityView.tsx`
- Servicio: `qualityService.ts`

**Tablas adaptadas a SQL Server:**

```sql
CREATE TABLE quality_inspections (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER,
    work_order_id   UNIQUEIDENTIFIER NOT NULL REFERENCES work_orders(id),
    inspector_id    UNIQUEIDENTIFIER REFERENCES employees(id),
    status          NVARCHAR(20) DEFAULT 'pending',
    -- pending | passed | failed
    rejection_reason NVARCHAR(MAX),
    notes           NVARCHAR(MAX),
    created_at      DATETIME DEFAULT GETDATE(),
    updated_at      DATETIME DEFAULT GETDATE()
);

CREATE TABLE inspection_checkpoints (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    inspection_id   UNIQUEIDENTIFIER NOT NULL REFERENCES quality_inspections(id),
    parameter_name  NVARCHAR(255) NOT NULL,  -- "Dimensiones externas", "Acabado superficial"
    requirement     NVARCHAR(255),           -- "± 0.5mm", "Sin rebabas", "Ra 1.6"
    result          NVARCHAR(10) DEFAULT 'ok',  -- ok | ng
    comment         NVARCHAR(MAX),
    created_at      DATETIME DEFAULT GETDATE()
);
```

**Qué incluye el módulo:**
- Inspecciones vinculadas a OTs de producción
- Plantillas de checkpoints por tipo de pieza
- Dashboard de tasa de rechazo por producto, operador y período
- Fotografías de no conformidades

---

### Módulo: Mantenimiento

**Qué hace:** Control de activos industriales (máquinas y edificio) con gestión de órdenes de mantenimiento preventivo, correctivo y predictivo. Alertas de próximo mantenimiento y costo de intervenciones.

**Stack del módulo:**
- Frontend: `MaintenanceView.tsx`, `MantenimientoPanel.tsx`, `MachineFormModal.tsx`
- Servicio: `maintenanceService.ts`

**Tablas adaptadas a SQL Server:**

```sql
CREATE TABLE activos_maquinas (
    id                      UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id               NVARCHAR(50) NOT NULL DEFAULT 'mcvill',
    codigo                  NVARCHAR(50) NOT NULL,   -- MQ-001, MQ-002...
    nombre                  NVARCHAR(200) NOT NULL,
    modelo                  NVARCHAR(100),
    fabricante              NVARCHAR(100),
    numero_serie            NVARCHAR(100),
    ubicacion               NVARCHAR(200),
    area                    NVARCHAR(100),
    fecha_adquisicion       DATE,
    horas_uso               DECIMAL(10,2) DEFAULT 0,
    ultimo_mantenimiento    DATE,
    proximo_mantenimiento   DATE,
    frecuencia_mant_dias    INT DEFAULT 90,
    estado                  NVARCHAR(50) NOT NULL DEFAULT 'operativa'
    CHECK (estado IN ('operativa','en_mantenimiento','fuera_servicio')),
    notas                   NVARCHAR(MAX),
    activo                  BIT DEFAULT 1,
    created_at              DATETIME DEFAULT GETDATE(),
    UNIQUE (tenant_id, codigo)
);

CREATE TABLE activos_edificio (
    id                      UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id               NVARCHAR(50) NOT NULL DEFAULT 'mcvill',
    nombre                  NVARCHAR(200) NOT NULL,
    tipo                    NVARCHAR(50) DEFAULT 'civil'
    CHECK (tipo IN ('civil','electrico','hvac','plomeria','contra_incendio','otro')),
    ubicacion               NVARCHAR(200),
    area_m2                 DECIMAL(10,2),
    responsable             NVARCHAR(200),
    ultimo_mantenimiento    DATE,
    proximo_mantenimiento   DATE,
    frecuencia_mant_dias    INT DEFAULT 180,
    estado                  NVARCHAR(50) NOT NULL DEFAULT 'bueno'
    CHECK (estado IN ('bueno','regular','requiere_atencion','critico')),
    activo                  BIT DEFAULT 1,
    created_at              DATETIME DEFAULT GETDATE()
);

CREATE TABLE ordenes_mantenimiento (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id           NVARCHAR(50) NOT NULL DEFAULT 'mcvill',
    numero_orden        NVARCHAR(50),            -- MTO-2026-001
    tipo_activo         NVARCHAR(20) NOT NULL
    CHECK (tipo_activo IN ('maquina','edificio')),
    activo_id           UNIQUEIDENTIFIER,
    activo_nombre       NVARCHAR(200),
    tipo_mantenimiento  NVARCHAR(20) DEFAULT 'preventivo'
    CHECK (tipo_mantenimiento IN ('preventivo','correctivo','predictivo')),
    prioridad           NVARCHAR(20) DEFAULT 'media'
    CHECK (prioridad IN ('baja','media','alta','critica')),
    descripcion         NVARCHAR(MAX) NOT NULL,
    tecnico_asignado    NVARCHAR(200),
    fecha_programada    DATE,
    fecha_realizada     DATE,
    duracion_horas      DECIMAL(6,2),
    estado              NVARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_proceso','completada','cancelada')),
    costo_estimado      DECIMAL(12,2) DEFAULT 0,
    costo_real          DECIMAL(12,2),
    observaciones       NVARCHAR(MAX),
    created_at          DATETIME DEFAULT GETDATE()
);

-- Datos iniciales de máquinas McVill
INSERT INTO activos_maquinas (codigo, nombre, modelo, fabricante, area, horas_uso, proximo_mantenimiento, estado)
VALUES
  ('MQ-001','TORNO CNC',       'ST-30',       'Mazak',  'CNC',      4820, '2026-06-01', 'operativa'),
  ('MQ-002','FRESADORA CNC',   'VF-3',        'Haas',   'CNC',      6210, '2026-05-20', 'operativa'),
  ('MQ-003','CORTADORA LÁSER', 'FL-3015M',    'Amada',  'Corte',    2100, '2026-07-15', 'operativa'),
  ('MQ-004','SOLDADORA TIG',   'Dynasty 280', 'Miller', 'Soldadura',8940, '2026-05-30', 'en_mantenimiento');
```

**Qué incluye el módulo:**
- Catálogo de máquinas e instalaciones con ficha técnica
- Calendario de mantenimientos preventivos
- Órdenes de trabajo de mantenimiento con costo real vs estimado
- Historial de intervenciones por activo
- Análisis predictivo con IA (MaintenanceAIModal)

---

### Módulo: Costeo / Cotización Express

**Qué hace:** Motor de costeo en tiempo real. El vendedor/ingeniero carga materiales, operaciones y overhead, y el sistema calcula automáticamente el margen y el precio de venta sugerido. Ideal para generar cotizaciones rápidas basadas en datos reales de producción.

**Stack del módulo:**
- Frontend: `CostingView.tsx`, `CosteoDashboard.tsx`
- Servicio: `costeoService.ts`, `costingService.ts`

**Tablas adaptadas a SQL Server:**

```sql
CREATE TABLE costing_simulations (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id           UNIQUEIDENTIFIER,
    project_name        NVARCHAR(255) NOT NULL,
    material_cost       DECIMAL(15,2) DEFAULT 0,
    labor_cost          DECIMAL(15,2) DEFAULT 0,
    overhead_pct        DECIMAL(5,2) DEFAULT 20,   -- % de overhead sobre costo directo
    profit_margin_pct   DECIMAL(5,2) DEFAULT 30,   -- % de margen deseado
    suggested_price     DECIMAL(15,2),             -- calculado automáticamente
    currency            NVARCHAR(5) DEFAULT 'MXN',
    exchange_rate       DECIMAL(10,4) DEFAULT 1,
    status              NVARCHAR(50) DEFAULT 'draft',
    -- draft | approved | sent | won | lost
    notes               NVARCHAR(MAX),
    created_by          UNIQUEIDENTIFIER,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_at          DATETIME DEFAULT GETDATE()
);

CREATE TABLE costeo_dinamico_trazabilidad (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id       UNIQUEIDENTIFIER,
    simulation_id   UNIQUEIDENTIFIER REFERENCES costing_simulations(id),
    viajero_id      NVARCHAR(100),
    operacion       NVARCHAR(200),
    empleado        NVARCHAR(200),
    tiempo_real_hrs DECIMAL(8,4),
    costo_real_mxn  DECIMAL(12,2),
    costo_est_mxn   DECIMAL(12,2),
    variacion_pct   DECIMAL(6,2),         -- (real - est) / est * 100
    created_at      DATETIME DEFAULT GETDATE()
);
```

**Qué incluye el módulo:**
- Simulador de costos con desglose por material, mano de obra y overhead
- Cálculo automático de precio con margen deseado
- Trazabilidad costo estimado vs real por operación
- Dashboard de rentabilidad por proyecto/cliente
- Conversión MXN/USD con tipo de cambio configurable

---

## Lista de Verificación Pre-Entrega

Antes de mandar el ZIP al programador externo:

- [ ] Scripts SQL probados en una base limpia (no en producción)
- [ ] UUID → UNIQUEIDENTIFIER, BOOLEAN → BIT, TEXT → NVARCHAR ya aplicados
- [ ] Variables de entorno documentadas (`DB_CONNECTION_STRING`, `API_KEYS`, etc.)
- [ ] README con pasos numerados, sin asumir conocimientos de nuestro stack
- [ ] Datos de prueba incluidos (los seed data de las migraciones)
- [ ] Versión en el nombre del ZIP: `modulo-produccion-mcvill-v1.0.zip`
- [ ] Contacto de soporte técnico (WhatsApp / email de Agustín)

---

## Dependencias Entre Módulos

Algunos módulos dependen de tablas de otros. Si se entrega uno solo, hay que incluir las tablas base:

```
employees           ← requerida por: Nómina, RH, Calidad, Producción
products            ← requerida por: Ingeniería, Producción
materials           ← requerida por: Inventario, Ingeniería, Viajeros
work_orders         ← requerida por: Producción, Calidad, Viajeros
```

Si se entrega solo un módulo, incluir en el SQL las tablas dependientes aunque sea en versión simplificada.

---

*Última actualización: Mayo 2026 — Agustín Prieto / IA.AGUS*
