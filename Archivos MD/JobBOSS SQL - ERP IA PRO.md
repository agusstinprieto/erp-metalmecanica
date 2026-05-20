# JobBOSS SQL — ERP IA PRO

> Estrategia técnica de integración entre JobBoss y el nuevo ERP IA Pro para McVill.
> Basado en sesión estratégica con Agustín, Manuel, Víctor y Ernesto — Mayo 2026.

---

## ¿Qué es JobBoss a nivel técnico?

JobBoss (de ECi Software Solutions) es un ERP/MRP para talleres de manufactura personalizada.

| Característica | Detalle |
|---|---|
| Base de datos | **SQL Server** (acceso directo posible) |
| API moderna | No tiene REST API — integración a nivel BD |
| Versión legacy | Desktop + SQL Server local |
| Versión nueva | JobBoss2 (cloud) |

**Lo más importante:** al correr sobre SQL Server, no se necesita ninguna API oficial para leer datos en tiempo real. Esto simplifica enormemente la integración.

---

## Arquitectura de Integración Propuesta

```
JobBoss SQL Server (local)
         │
         │  READ-ONLY queries (NUNCA escribir directo)
         ▼
    Sync Service (Node/Python)
         │
         │  transformación + normalización
         ▼
    Supabase (cloud)  ◄──►  ERP IA Pro
         │
         │  fallback offline
         ▼
    SQLite / PostgreSQL local
```

**Regla de oro:** Solo leer desde JobBoss. Nunca escribir de vuelta. Los datos nuevos del ERP IA Pro viven en Supabase únicamente.

---

## Las 3 Tablas Clave de JobBoss

| Módulo JobBoss | Tabla SQL | Módulo ERP IA Pro equivalente |
|---|---|---|
| Cotizaciones | `QUOTE`, `QUOTE_LINE` | Cotizaciones inteligentes (Sandra) |
| Órdenes de trabajo | `JOB`, `JOB_OPERATION` | Control de planta |
| Inventario | `INVENTORY`, `STOCK_ITEM` | Control de materiales |

---

## Código de Integración

### Conexión read-only a SQL Server de JobBoss

```typescript
// npm install mssql
import sql from 'mssql';

const config = {
  user: 'readonly_user',
  password: process.env.JOBBOSS_DB_PASS,
  server: '192.168.x.x', // servidor local planta
  database: 'JobBOSS',
  options: {
    trustServerCertificate: true,
    encrypt: false // red local
  }
};

async function syncQuotes() {
  const pool = await sql.connect(config);
  const result = await pool.request()
    .query(`SELECT TOP 100 Quote_No, Customer, Status, 
            Quote_Date, Est_Revenue 
            FROM QUOTE 
            WHERE Status = 'Open'
            ORDER BY Quote_Date DESC`);

  // Mapear al schema de Supabase
  const quotes = result.recordset.map(q => ({
    external_id: q.Quote_No,
    customer_name: q.Customer,
    status: q.Status,
    created_at: q.Quote_Date,
    amount: q.Est_Revenue,
    source: 'jobboss'
  }));

  // Upsert a Supabase (no duplica, no destruye)
  await supabase
    .from('quotes')
    .upsert(quotes, { onConflict: 'external_id' });
}
```

### Sync incremental (no bulk dump)

```typescript
// Solo traer cambios desde la última sincronización
WHERE Last_Updated > @lastSyncTimestamp
```

Esto evita sobrecargar el servidor local y mantiene la sincronización ligera.

---

## Riesgo Crítico: El Histórico de Datos de JobBoss

> El mayor riesgo **no es técnico — es de datos.**

JobBoss acumula años de historial de órdenes, clientes, costos reales vs. estimados y tiempos de máquina. Este histórico es el "cerebro" para entrenar los módulos de IA:

- Cotizaciones inteligentes
- Predicción de tiempos de máquina
- Predicción de demanda de materiales
- Análisis de rentabilidad por cliente/pieza

**Acción prioritaria antes de cualquier migración:** hacer un dump completo del histórico de JobBoss a un data warehouse propio.

### Cómo extraer el histórico completo

```python
# pip install pyodbc pandas sqlalchemy
import pyodbc
import pandas as pd
from datetime import datetime

conn_str = (
    "DRIVER={SQL Server};"
    "SERVER=192.168.x.x;"
    "DATABASE=JobBOSS;"
    "UID=readonly_user;"
    "PWD=tu_password;"
)

tablas_historicas = [
    "QUOTE",
    "QUOTE_LINE",
    "JOB",
    "JOB_OPERATION",
    "INVENTORY",
    "STOCK_ITEM",
    "CUSTOMER",
    "VENDOR",
    "EMPLOYEE",
]

conn = pyodbc.connect(conn_str)
timestamp = datetime.now().strftime("%Y%m%d_%H%M")

for tabla in tablas_historicas:
    df = pd.read_sql(f"SELECT * FROM {tabla}", conn)
    df.to_parquet(f"historico_jobboss/{tabla}_{timestamp}.parquet", index=False)
    print(f"{tabla}: {len(df)} registros exportados")

conn.close()
```

> Guardar en formato `.parquet` (columnar, comprimido) en lugar de CSV. Ocupa 5–10x menos espacio y es directamente consumible por herramientas de IA y análisis.

### Por qué este histórico vale más que el software

Si se pierde acceso a JobBoss durante la migración o vence la licencia, sin el dump histórico se pierden:
- Años de costos reales por pieza y cliente
- Tiempos reales de máquina (base para estimar con IA)
- Historial de proveedores y precios
- Patrones de demanda estacionales

**Hacer el dump es una tarea de 1 día que protege años de datos.**

---

## Base de Datos Híbrida: Arquitectura Detallada

La planta no puede depender 100% de la nube. La arquitectura híbrida resuelve los cortes de luz e internet sin detener la operación.

### Cómo funciona el híbrido

```
┌─────────────────────────────────────────────────────────┐
│                    PLANTA (LOCAL)                        │
│                                                          │
│  JobBoss SQL Server  ──read──►  PostgreSQL Local         │
│                                      │                   │
│                                 ERP IA Pro               │
│                                 (modo offline)           │
└──────────────────────────┬──────────────────────────────┘
                           │
                   internet disponible
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     NUBE                                 │
│                                                          │
│                    Supabase                              │
│              (fuente de verdad global)                   │
│                                                          │
│         Acceso remoto: directivos, oficinas              │
└─────────────────────────────────────────────────────────┘
```

### Reglas del híbrido

| Situación | Comportamiento |
|---|---|
| Internet OK | Escribe en local + sincroniza a Supabase en tiempo real |
| Internet caído | Escribe solo en local, cola de cambios pendientes |
| Internet restaurado | Sincronización automática de cola pendiente |
| Conflicto de datos | Local tiene prioridad (es la fuente de operación) |

### Código: Sync con detección de conectividad

```typescript
async function writeWithFallback(table: string, data: object) {
  // Siempre escribe en local primero
  await localDb.insert(table, data);

  if (await isOnline()) {
    await supabase.from(table).upsert(data);
  } else {
    // Encola para sincronizar cuando vuelva internet
    await syncQueue.push({ table, data, timestamp: Date.now() });
  }
}

async function flushSyncQueue() {
  const pending = await syncQueue.getAll();
  for (const item of pending) {
    await supabase.from(item.table).upsert(item.data);
    await syncQueue.remove(item.id);
  }
}

// Escuchar cuando se restaura la conexión
window.addEventListener('online', flushSyncQueue);
```

### Stack recomendado para el servidor local

| Componente | Tecnología | Por qué |
|---|---|---|
| Base de datos local | PostgreSQL | Compatible 100% con Supabase (mismo motor) |
| Sincronización | pg_logical / custom sync | Replicación incremental |
| Cola offline | Redis o SQLite queue | Ligero, no requiere internet |
| Servidor planta | Mini PC o NUC industrial | Bajo consumo, sin partes móviles |

> **Nota:** Usar PostgreSQL local (no SQLite) porque Supabase también es PostgreSQL. El schema es idéntico en ambos lados — no hay transformación al sincronizar.

---

## Plan de Acción por Fases

### Fase 1 — Validación de Módulos (Corto Plazo)
- Recorridos con responsables de cada área para probar módulos específicos
- Validar cotizaciones con Sandra, RRHH con Noel
- Prueba UX con operadores de piso (los menos tecnológicos primero)
- Filtrar de los 61 módulos cuáles se quedan, descartan o ajustan

### Fase 2 — Redundancia e Infraestructura (Corto-Mediano Plazo)
- Configurar BD híbrida: servidor local + Supabase cloud
- Si cae internet → planta sigue operando en local
- Contratar internet de respaldo (Starlink evaluado como opción viable)

### Fase 3 — Shadow Mode / Implementación en Paralelo (Mediano Plazo)
- **No apagar JobBoss de golpe**
- ERP IA Pro corre en paralelo leyendo los mismos datos
- Desplegar primero módulos no críticos: cámaras, RRHH, cotizaciones
- Evaluar integración técnica entre código de Agustín y trabajo de César

### Fase 4 — Transición y Estandarización (Largo Plazo)
- Evaluar desempeño tras ~1 mes en paralelo
- Si métricas son positivas → dar de baja suscripciones de sistemas equivalentes
- Consolidar todo en un portal único (directivos + operadores)

---

## Tabla de Prioridades Técnicas

| Acción | Prioridad | Esfuerzo estimado |
|---|---|---|
| Conexión read-only a SQL Server | Alta | 1 día |
| Dump histórico completo de JobBoss | **Crítica** | 1 día |
| Sync incremental a Supabase | Alta | 2–3 días |
| Módulos en shadow mode | Media | 2 semanas |
| Cutover y baja de JobBoss | Baja | Largo plazo |

---

## Notas de Infraestructura

- **Problema actual:** cortes de energía e internet detienen la operación completa
- **Solución:** arquitectura híbrida — si cae la nube, el local sigue funcionando
- **Starlink** evaluado como proveedor de respaldo de conectividad
- **Sincronización bidireccional** entre local y Supabase cuando se restaura conexión

---

*Documento generado: Mayo 2026 — Sesión estratégica McVill ERP IA Pro*
