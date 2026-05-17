# MANUAL DE MÉTODOS Y FÓRMULAS DE CÁLCULO — McVill ERP
**Versión:** 3.0 — Mayo 2026  
**Sistema:** McVill ERP Metalmecánica  
**Propósito:** Validación departamental. Cada área debe confirmar o correg ir los métodos, umbrales y fórmulas que el sistema utiliza para calcular sus indicadores.

> **Instrucciones para cada área:** Leer su sección, anotar correcciones o aprobaciones, y devolver firmado al responsable de Sistemas antes del **[FECHA LÍMITE]**. Si una fórmula o parámetro requiere cambio, indicar el valor correcto en el espacio de comentarios al final de cada sección.

---

## ÍNDICE POR DEPARTAMENTO

| # | Departamento | Sección |
|---|---|---|
| 1 | Recursos Humanos (RH) | Asistencia, Nómina, Desempeño e Incentivos |
| 2 | Calidad | SPC, No Conformidades, Aceptación de Lote |
| 3 | Ingeniería | Tasas Máquina/Hora, Materiales, Factor Scrap |
| 4 | Cotizaciones / Ventas | Risk Score, SLA, Precio de Venta |
| 5 | Producción / Planeación | OEE, Células de Producción, Viajero |
| 6 | Costeo / Finanzas / Gerencia | Varianzas, Márgenes, Semáforo de Alertas |
| 7 | Sistemas / Administración | Roles, Turnos, Configuración |

---

---

# 1. RECURSOS HUMANOS (RH)

> **Área responsable de confirmar:** Gerencia de RH y Contabilidad

---

## 1.A ASISTENCIA

### Método de Registro
El sistema registra entrada y salida mediante código de gafete (QR o número de empleado). Cada empleado tiene un **turno asignado** con hora de inicio y fin.

### Tardanza
```
¿Llegó tarde? = Hora real de entrada > (Hora inicio turno + Minutos de gracia)
```
- El campo `grace_period_minutes` se configura por turno en Sistemas.
- Valor actual por defecto si no hay turno asignado: **8:30 am** como límite.
- Registro resultante: `status = 'late'` (aparece en reportes de RH).

> **Pregunta RH:** ¿El minuto de gracia actual es correcto? ¿Cuántos minutos de gracia se deben permitir por turno?

### Horas Extras (al checkout)
```
Minutos trabajados = (Hora salida − Hora entrada) en minutos
Minutos extras     = MAX(0, Minutos trabajados − Minutos del turno)
```
- Comparación: se toma la hora programada de fin de turno, no la hora de entrada.
- Si el empleado no tiene turno configurado, el sistema usa **9 horas** como jornada estándar.

### Jornada Incompleta
```
Incompleta = Minutos trabajados < Duración del turno × 90%
```
- El umbral es **90%** de la jornada teórica (equivale a salir ~54 minutos antes en un turno de 9 h).
- Resultado: `status = 'incomplete'` — no se deduce automáticamente, queda para revisión de RH.

> **Pregunta RH:** ¿El 90% es el umbral correcto para marcar jornada incompleta? ¿O debe ser diferente (ej. 80%, o un número fijo de minutos)?

---

## 1.B NÓMINA

### Salario Base del Periodo
```
Salario Base = Salario Diario × Días Trabajados en el periodo
```
- Periodos disponibles: **semanal** (7 días) o **quincenal** (15 días).
- El `Salario Diario` se captura en el expediente del empleado.
- Valor de referencia en sistema demo: **$450 MXN/día**.

### Tarifa por Hora
```
Tarifa Hora = Salario Diario / 8
```

### Horas Extras — Artículo 67 LFT
```
Monto Horas Extras = Horas Extras × Tarifa Hora × 2
```
- Factor: **2x** (doble). Base legal: Art. 67 de la Ley Federal del Trabajo.
- Las horas extras se toman del registro de asistencia del periodo.

> **Pregunta RH/Contabilidad:** ¿La planta paga horas extras estrictamente al 200% o hay algún acuerdo colectivo diferente? ¿Hay un límite de horas extras semanales autorizadas?

### Bono OEE de Producción
```
Si OEE del operador ≥ 85%:
  Bono OEE = (Salario Base + Horas Extras) × 5%
Si OEE < 85%:
  Bono OEE = $0
```
- Umbral: **85% de OEE**.
- Porcentaje de bono: **5%** sobre el ingreso bruto del periodo (base + extras).
- Este bono se calcula por operador y es adicional al salario.

> **Pregunta RH/Gerencia:** ¿Es correcto el umbral de 85%? ¿El porcentaje de 5% es el acordado? ¿Se aplica a todos los puestos o solo operadores de producción?

### Deducciones por Faltas
```
Deducción por Faltas = Número de Faltas × Salario Diario
```
- Se descuenta 1 día de salario completo por cada falta injustificada.
- Los retardos **no** generan deducción automática; quedan en el reporte para revisión manual de RH.

> **Pregunta RH:** ¿Se deben descontar los retardos? Si sí, ¿cuál es la regla (ej. 3 retardos = 1 falta)?

### ISR — Tablas SAT 2026 (Art. 96 LISR)
El sistema aplica las tarifas mensuales oficiales del SAT vigentes en 2026:

| Límite Inferior | Límite Superior | Cuota Fija | % sobre Excedente |
|---|---|---|---|
| $0.00 | $7,735.00 | $0.00 | 1.92% |
| $7,735.01 | $65,651.07 | $148.51 | 6.40% |
| $65,651.08 | $115,375.90 | $3,844.66 | 10.88% |
| $115,375.91 | $134,119.41 | $9,264.97 | 16.00% |
| $134,119.42 | $160,577.65 | $12,254.93 | 17.92% |
| $160,577.66 | $323,862.00 | $18,994.18 | 21.36% |
| $323,862.01 | $510,451.00 | $53,854.20 | 23.52% |
| $510,451.01 | $974,535.03 | $97,754.25 | 30.00% |
| $974,535.04 | $1,299,380.04 | $236,986.41 | 32.00% |
| $1,299,380.05 | Sin límite | $340,946.91 | 34.00% |

```
ISR = Cuota Fija + (Salario Mensual − Límite Inferior) × % sobre Excedente
ISR Neto = MAX(0, ISR − Subsidio al Empleo)
```

**Subsidio al Empleo 2026** (Art. Octavo Transitorio LISR) — se resta del ISR calculado:

| Ingreso mensual | Subsidio |
|---|---|
| $0.01 – $1,768.96 | $407.02 |
| $1,768.97 – $2,653.38 | $406.83 |
| $2,653.39 – $3,472.84 | $406.62 |
| $3,472.85 – $3,537.87 | $392.77 |
| $3,537.88 – $4,446.15 | $382.46 |
| $4,446.16 – $4,717.18 | $354.23 |
| $4,717.19 – $5,335.42 | $324.87 |
| $5,335.43 – $6,224.67 | $294.63 |
| $6,224.68 – $7,113.90 | $253.54 |
| $7,113.91 – $7,382.33 | $217.61 |
| $7,382.34 en adelante | $0.00 |

> **Pregunta Contabilidad:** ¿Las tablas ISR 2026 del SAT están actualizadas conforme a su contabilidad? ¿El sistema debe calcular ISR mensual aunque se pague quincenalmente?

### IMSS Cuotas Obrero 2026
```
UMA Diaria 2026 = $108.57 MXN
3 UMAs Mensual  = $108.57 × 30.4 × 3 ≈ $9,900 MXN

Invalidez y Vida (IV)      = Salario Mensual × 0.625%
Cesantía y Vejez (CV)      = Salario Mensual × 1.125%
Enfermedad y Maternidad:
  Excedente                = MAX(0, Salario Mensual − 3 UMAs Mensual)
  Cuota EM                 = Excedente × 0.40%

IMSS Obrero Total = IV + CV + Cuota EM
```

> **Pregunta Contabilidad:** ¿El UMA 2026 de $108.57 es correcto? ¿Se deben incluir otras cuotas (INFONAVIT, etc.) en el cálculo del neto?

### Salario Neto Final
```
Salario Bruto = Salario Base + Horas Extras + Bono OEE
Deducciones   = ISR + IMSS Obrero + Deducción por Faltas
Salario Neto  = Salario Bruto − Deducciones
```

**Confirmación RH / Contabilidad:**
- [ ] Aprobado sin cambios
- [ ] Aprobado con las siguientes correcciones: ________________________________
- Firma: _______________ Fecha: _______________

---

## 1.C DESEMPEÑO E INCENTIVOS POR CÉLULA

### KPIs Individuales del Operador

```
Eficiencia       = (Piezas Reales / Piezas Meta) × 100
Tasa de Calidad  = (Piezas OK / Piezas Reales) × 100
Disponibilidad   = (Horas Trabajadas − Horas Paro) / Horas Trabajadas
OEE              = (Eficiencia/100) × (Tasa Calidad/100) × Disponibilidad × 100
```
- Norma de referencia: **ISO 22400** (KPIs de Manufactura).
- Estos valores se capturan diaria o semanalmente por célula.

### Incentivos Automáticos por Desempeño

El sistema calcula incentivos adicionales si se cumplen los siguientes umbrales:

| Incentivo | Condición | % del Salario Base | Monto (ref. $4,500/sem) |
|---|---|---|---|
| Productividad Alta | Eficiencia ≥ 110% | **10%** | ~$450 |
| Productividad Media | Eficiencia 100–109% | **5%** | ~$225 |
| Calidad | Tasa Calidad ≥ 98% | **3%** | ~$135 |
| Seguridad | Cero incidentes en el periodo | **2%** | ~$90 |
| 5S | Score 5S ≥ 90% | **1%** | ~$45 |

- Los incentivos son **acumulables** (un operador puede recibir todos a la vez).
- Todos quedan en estado `pendiente` hasta que RH o Gerencia los **aprueba** manualmente.

> **Pregunta RH/Gerencia:** ¿Los umbrales y porcentajes de incentivos son los vigentes? ¿Se aplican por operador individual, por célula, o ambos?

**Confirmación RH — Desempeño e Incentivos:**
- [ ] Aprobado sin cambios
- [ ] Aprobado con las siguientes correcciones: ________________________________
- Firma: _______________ Fecha: _______________

---

---

# 2. CALIDAD

> **Área responsable de confirmar:** Gerencia de Calidad / Responsable ISO 9001

---

## 2.A CONTROL ESTADÍSTICO DE PROCESO (SPC)

El módulo SPC implementa las **Cartas de Control de Shewhart** (X̄-R) según metodología Nelson/ISO 7870.

### Constantes de Control por Tamaño de Subgrupo (n)

| n | A2 | D3 | D4 | d2 |
|---|---|---|---|---|
| 2 | 1.880 | 0 | 3.267 | 1.128 |
| 3 | 1.023 | 0 | 2.574 | 1.693 |
| 4 | 0.729 | 0 | 2.282 | 2.059 |
| 5 | 0.577 | 0 | 2.114 | 2.326 |
| 6 | 0.483 | 0 | 2.004 | 2.534 |
| 7 | 0.419 | 0.076 | 1.924 | 2.704 |
| 8 | 0.373 | 0.136 | 1.864 | 2.847 |
| 9 | 0.337 | 0.184 | 1.816 | 2.970 |
| 10 | 0.308 | 0.223 | 1.777 | 3.078 |

### Cálculo de Límites de Control (Carta X̄)
```
X̄̄ (Grand Mean) = Promedio de todos los X̄ de subgrupos
R̄  (Rango Medio) = Promedio de todos los Rangos

UCL_X = X̄̄ + A2 × R̄
LCL_X = X̄̄ − A2 × R̄
```

### Cálculo de Límites de Control (Carta R)
```
UCL_R = D4 × R̄
LCL_R = D3 × R̄  (= 0 para n < 7)
```

### Estimación de Sigma del Proceso
```
σ̂ (Sigma estimada) = R̄ / d2
```

### Índices de Capacidad del Proceso
```
Cp  = (USL − LSL) / (6 × σ̂)
Cpk = MIN( (USL − X̄̄) / (3 × σ̂) ,  (X̄̄ − LSL) / (3 × σ̂) )
```
- `USL` = Límite Superior de Especificación (ingeniería/cliente)
- `LSL` = Límite Inferior de Especificación
- Cp mide la **capacidad potencial** (¿cabe el proceso en la tolerancia?).
- Cpk mide la **capacidad real centrada** (¿está centrado además de que cabe?).
- Meta mínima aceptable: **Cp ≥ 1.33 y Cpk ≥ 1.33** (equivalente a proceso Sigma 4).

### Reglas de Detección de Alertas (Nelson)

El sistema detecta automáticamente:

| Regla | Condición | Alerta |
|---|---|---|
| Punto fuera de control | X̄ > UCL o X̄ < LCL | `fuera_limite` |
| Cambio de nivel | 9 puntos consecutivos del mismo lado de X̄̄ | `cambio_nivel` |
| Tendencia | 6 puntos consecutivos subiendo o bajando | `tendencia` |

> **Pregunta Calidad:** ¿El tamaño de subgrupo (n) actual para cada característica es correcto? ¿Se deben agregar más reglas de Nelson (ej. Regla 4: 14 puntos alternando)? ¿La meta de Cp/Cpk ≥ 1.33 es la exigida por sus clientes?

---

## 2.B NO CONFORMIDADES

### Clasificación de Severidad

| Severidad | Descripción | Acción requerida |
|---|---|---|
| **Menor** | No afecta función ni seguridad, corrección en siguiente ciclo | Captura de causa raíz |
| **Mayor** | Afecta función o podría afectar al cliente | Causa raíz + Acción correctiva |
| **Crítica** | Riesgo de seguridad o rechazo de cliente | Alerta inmediata + contención |

### Clasificación por Origen

| Origen | Descripción |
|---|---|
| **Inspección** | Detectada en línea o final de proceso |
| **Auditoría** | Detectada en auditoría interna/externa |
| **Cliente** | Reclamación o devolución de cliente |

### Trazabilidad
- Toda inspección con resultado `failed` queda registrada en el **Viajero de Producción** de la pieza.
- Las NCs con severidad `Crítica` disparan una notificación automática al área responsable.
- Campo obligatorio antes de cerrar una NC: **Causa Raíz** y **Acción Correctiva**.

> **Pregunta Calidad:** ¿Las tres categorías de severidad son suficientes? ¿Hay algún criterio diferente para determinar cuándo una NC es Mayor vs. Menor?

**Confirmación Calidad:**
- [ ] Aprobado sin cambios
- [ ] Aprobado con las siguientes correcciones: ________________________________
- Firma: _______________ Fecha: _______________

---

---

# 3. INGENIERÍA

> **Área responsable de confirmar:** Gerencia de Ingeniería / Jefe de Planta

---

## 3.A TASAS HORARIAS ESTÁNDAR (Costo Máquina/Hora)

Estas tarifas se usan en cotizaciones y en el costeo real de órdenes de trabajo. **Incluyen:** energéticos, depreciación del equipo y consumibles básicos (gases, electrodos, puntas de corte).

| Proceso / Máquina | Tarifa Actual (MXN/hora) |
|---|---|
| Cortadora Láser de Fibra | **$1,200** |
| Centro de Maquinado CNC | **$950** |
| Dobladora Hidráulica CNC | **$850** |
| Cabina de Pintura Electrostática | **$600** |
| Soldadura TIG/MIG Estructural | **$450** |
| Área de Ensamble y Ajuste | **$300** |

> **Pregunta Ingeniería:** ¿Estas tarifas reflejan el costo real 2026 de cada proceso? ¿Hay máquinas nuevas que agregar? ¿Hay procesos subcontratados con una tarifa diferente?

---

## 3.B CÁLCULO DE PESO DE MATERIALES (Metal Quoter)

```
Peso (kg) = Volumen (mm³) × Densidad del material (g/cm³) / 1,000,000
```

O equivalente para lámina/placa:
```
Peso (kg) = Largo (mm) × Ancho (mm) × Espesor (mm) × Densidad / 1,000,000
```

**Densidades estándar utilizadas:**

| Material | Densidad (g/cm³) |
|---|---|
| Acero A36 / ASTM | 7.85 |
| Acero Inoxidable 304 | 7.93 |
| Acero Inoxidable 316 | 7.99 |
| Aluminio 6061 | 2.70 |
| Cobre | 8.96 |
| Latón | 8.50 |

> **Pregunta Ingeniería:** ¿Las densidades son correctas para los materiales que manejan? ¿Hay materiales adicionales frecuentes que agregar?

---

## 3.C FACTOR DE SCRAP / MERMA EN CORTE

```
Peso con merma = Peso neto × (1 + Factor Scrap)
```

- Factor de scrap por defecto: **12%** (0.12) sobre el peso neto de la pieza.
- Se aplica cuando no hay un reporte de Nesting disponible.
- Si el software de Nesting reporta un porcentaje diferente de aprovechamiento, ese valor tiene prioridad.

> **Pregunta Ingeniería/Planeación:** ¿El 12% de merma es representativo del proceso actual? ¿Varía por material o proceso (láser vs. plasma vs. sierra)?

---

## 3.D COTIZACIÓN TÉCNICA — COSTO POR PIEZA

La fórmula de costeo por pieza en el cotizador:
```
Costo Material   = Peso con merma × Precio por kg del material
Costo Maquinado  = Suma(Tiempo proceso × Tarifa máquina/hora) por cada operación
Costo MO         = Suma(Tiempo MO × Tarifa MO/hora) por cada operación
Subtotal         = Costo Material + Costo Maquinado + Costo MO
Overhead         = Subtotal × 15%
Costo Total      = Subtotal + Overhead
Precio de Venta  = Costo Total / (1 − Margen%)
```

**Confirmación Ingeniería:**
- [ ] Aprobado sin cambios
- [ ] Aprobado con las siguientes correcciones: ________________________________
- Firma: _______________ Fecha: _______________

---

---

# 4. COTIZACIONES / VENTAS

> **Área responsable de confirmar:** Gerencia Comercial / Responsable de Cotizaciones

---

## 4.A MATRIZ DE RIESGO Y SLA DE RESPUESTA (PM_F001)

Cuando entra un RFQ (Request for Quote), el sistema calcula un **Risk Score** que determina el tiempo de respuesta (SLA) comprometido con el cliente.

### Puntaje por Variable

| Variable | Condición | Puntos |
|---|---|---|
| **Tipos de material** | 1–2 tipos | 1 |
| | 3 o más tipos | 3 |
| **Procesos requeridos** | 1–2 procesos | 1 |
| | 3–5 procesos | 2 |
| | 6+ procesos | 3 |
| **Sub-ensambles** | 0–2 sub-ensambles | 1 |
| | 3 sub-ensambles | 2 |
| | 4+ sub-ensambles | 3 |
| **Hardware** (tornillería, insertos) | 0–2 piezas | 1 |
| | 3 piezas | 2 |
| | 4+ piezas | 3 |

### Resultado del Nivel de Riesgo

| Risk Score | Nivel | SLA de Respuesta |
|---|---|---|
| < 6 | **LOW** — Pieza sencilla | **5 días hábiles** |
| 6 – 8 | **MEDIUM** — Complejidad media | **10 días hábiles** |
| ≥ 9 | **HIGH** — Proyecto complejo | **20 días hábiles** |

> **Pregunta Ventas/Ingeniería:** ¿Los SLAs de 5, 10 y 20 días son los comprometidos con los clientes? ¿Los puntos por variable reflejan la complejidad real de sus productos?

---

## 4.B MÁRGENES FINANCIEROS DE COTIZACIÓN

```
Subtotal Directo = Material + Mano de Obra + Maquinado
Overhead         = Subtotal Directo × 15%
Costo Total      = Subtotal Directo + Overhead
Precio de Venta  = Costo Total / (1 − Margen de Utilidad%)
```

**Parámetros actuales:**
- Overhead operativo fijo: **15%**
- Margen de utilidad objetivo: **35%**

**Ejemplo:**
```
Si Costo Total = $10,000 y Margen = 35%:
Precio de Venta = $10,000 / (1 − 0.35) = $10,000 / 0.65 = $15,385
```

> **Pregunta Gerencia Comercial:** ¿El overhead del 15% es correcto? ¿El margen del 35% aplica a todos los clientes o hay excepciones (volumen, cliente estratégico)? ¿Hay un margen mínimo aceptable?

---

## 4.C TIPOS DE COTIZACIÓN DISPONIBLES EN EL SISTEMA

| Módulo | Descripción |
|---|---|
| **Cotizador Express** | Cotización rápida con parámetros básicos, sin ingeniería |
| **Metal Quoter** | Cotización por peso y proceso, con cálculo automático de material |
| **Agente IA de Cotizaciones** | Asistente inteligente que analiza RFQs y propone precios |
| **Kanban de Cotizaciones** | Tablero de seguimiento de estado de cada cotización |

**Confirmación Ventas / Cotizaciones:**
- [ ] Aprobado sin cambios
- [ ] Aprobado con las siguientes correcciones: ________________________________
- Firma: _______________ Fecha: _______________

---

---

# 5. PRODUCCIÓN / PLANEACIÓN

> **Área responsable de confirmar:** Jefe de Producción / Gerente de Planta

---

## 5.A OEE — EFICIENCIA GLOBAL DE EQUIPOS (ISO 22400)

```
Disponibilidad   = (Tiempo Disponible − Tiempo de Paro) / Tiempo Disponible
Rendimiento      = Piezas Reales / Piezas Meta  (= Eficiencia)
Calidad          = Piezas OK / Piezas Reales    (= Tasa de Calidad)

OEE = Disponibilidad × Rendimiento × Calidad × 100
```

**Referencia de benchmarks OEE:**

| OEE | Interpretación |
|---|---|
| < 65% | Proceso con problemas graves — requiere intervención |
| 65–75% | Aceptable para industria en mejora |
| 75–85% | Bueno — objetivo de mejora continua |
| ≥ 85% | Clase mundial (activa bono de producción) |

> **Pregunta Producción:** ¿El indicador de piezas meta se captura por turno, por día o por semana? ¿El tiempo de paro incluye solo paros no planeados o también mantenimiento preventivo?

---

## 5.B VIAJERO DE PRODUCCIÓN

El **Viajero** es el documento digital que acompaña a cada orden de producción. Registra:

- Número de parte y descripción
- Operaciones secuenciales (Corte → Doblez → Soldadura → Pintura → Ensamble → Inspección)
- Tiempo estimado vs. tiempo real por operación
- Inspector y resultado de cada punto de control de calidad
- Historial de no conformidades ligadas a la orden

**Estados del Viajero:**
```
Pendiente → En Proceso → En Inspección → Liberado → Entregado
```

> **Pregunta Producción/Planeación:** ¿Las operaciones estándar del Viajero corresponden al flujo real de la planta? ¿Hay operaciones que falten o sobren? ¿Se necesita incluir tiempos de setup?

---

## 5.C CÉLULAS DE PRODUCCIÓN

Células configuradas en el sistema:

| Célula | Descripción |
|---|---|
| CORTE | Láser de fibra, plasma, sierra |
| SOLDADURA | TIG, MIG, punto |
| MAQUINADO | CNC, torno, fresadora |
| ENSAMBLE | Ensamble manual y ajuste |
| PINTURA | Electrostática, líquida |

> **Pregunta Planeación:** ¿Estas 5 células son las correctas? ¿Hay células adicionales (tratamiento térmico, granallado, etc.)? ¿Las células tienen capacidad máxima definida (piezas/turno)?

**Confirmación Producción / Planeación:**
- [ ] Aprobado sin cambios
- [ ] Aprobado con las siguientes correcciones: ________________________________
- Firma: _______________ Fecha: _______________

---

---

# 6. COSTEO / FINANZAS / GERENCIA

> **Área responsable de confirmar:** Gerencia General / Finanzas / Contabilidad de Costos

---

## 6.A ESTRUCTURA DE COSTO POR ORDEN

Cada orden de trabajo tiene un **costo estimado** (al abrir la orden) y un **costo real** (al cerrarla):

| Componente | Estimado | Real |
|---|---|---|
| Material | `mat_est` | `mat_real` |
| Mano de Obra | `mo_est` | `mo_real` |
| Maquinado | `maq_est` | `maq_real` |
| Overhead | `overhead_est` | `overhead_real` |
| **Total** | **`total_est`** | **`total_real`** |

---

## 6.B INDICADORES DE RENTABILIDAD POR ORDEN

```
Varianza %       = ((Total Real − Total Estimado) / Total Estimado) × 100
                   Positivo = sobrecosto / Negativo = ahorro vs. presupuesto

Margen Real %    = (Precio de Venta − Total Real) / Precio de Venta × 100

Utilidad Bruta   = Precio de Venta − Total Real
```

---

## 6.C SEMÁFORO DE ALERTAS DE VARIANZA

El dashboard de costeo muestra un semáforo automático por orden:

| Color | Condición | Significado |
|---|---|---|
| 🟢 **OK** | Varianza dentro de parámetros normales | La orden está dentro del presupuesto |
| 🟡 **Atención** | Varianza supera el umbral de advertencia | Revisar — posible desviación |
| 🔴 **Crítico** | Varianza supera el umbral crítico | Requiere aprobación gerencial |
| ⚪ **Sin datos** | No hay costo real registrado aún | Orden en proceso sin datos |

> **Pregunta Gerencia/Finanzas:** ¿Cuál es el porcentaje de varianza que debe activar "Atención" y cuál "Crítico"? (Ejemplo: Atención ≥ 10%, Crítico ≥ 20%). Esta configuración actual necesita ser definida por Gerencia.

---

## 6.D TARIFA DE MANO DE OBRA POR PUESTO

El sistema usa una tabla de tarifas de MO que incluye un **factor de carga** social (IMSS patronal, vacaciones, aguinaldo, etc.):

```
Costo Real MO = Tarifa Hora × Factor de Carga × Horas trabajadas
```

- La tabla `tarifas_mano_obra` es configurable por Sistemas a petición de Gerencia.
- El factor de carga típico en industria metalmecánica mexicana es **1.30–1.45** (30–45% adicional al salario bruto).

> **Pregunta Finanzas:** ¿Cuál es el factor de carga social que se debe aplicar para cada categoría de puesto? ¿Se usa el mismo factor para todos los puestos?

---

## 6.E FLUJO DE APROBACIONES

Ciertas acciones en el ERP requieren aprobación formal antes de ejecutarse:

| Acción | Requiere aprobación de |
|---|---|
| Cierre de orden con varianza alta | Gerencia de Costos |
| Aprobación de incentivos | RH / Gerencia |
| Cambio de precio en cotización aprobada | Gerencia Comercial |
| Baja o ajuste de activo | Gerencia General |

**Confirmación Finanzas / Gerencia:**
- [ ] Aprobado sin cambios
- [ ] Aprobado con las siguientes correcciones: ________________________________
- Firma: _______________ Fecha: _______________

---

---

# 7. SISTEMAS / ADMINISTRACIÓN

> **Área responsable de confirmar:** Jefe de Sistemas / Administrador del ERP

---

## 7.A ROLES Y PERMISOS DE USUARIO

| Rol | Acceso |
|---|---|
| **Super Admin** | Acceso total, configuración del sistema, usuarios |
| **Gerencia** | Dashboard ejecutivo, reportes, aprobaciones |
| **RH** | Empleados, asistencia, nómina, desempeño |
| **Calidad** | Inspecciones, SPC, no conformidades |
| **Ingeniería** | Planos, cotizaciones técnicas, ingeniería de producto |
| **Producción** | Viajeros, órdenes de trabajo, OEE |
| **Ventas** | Cotizaciones, clientes, CRM |
| **Almacén** | Inventario, entradas y salidas de material |
| **Mantenimiento** | Planes preventivos, órdenes de mantenimiento |
| **Operador** | Check-in/out, captura de KPIs propios |

> **Pregunta Sistemas:** ¿Los roles están correctamente definidos para la estructura organizacional de McVill? ¿Hay puestos que necesiten un rol diferente o acceso a módulos adicionales?

---

## 7.B CONFIGURACIÓN DE TURNOS

Cada turno tiene los siguientes parámetros configurables:

| Parámetro | Descripción | Ejemplo |
|---|---|---|
| `start_time` | Hora de inicio del turno | 06:00 |
| `end_time` | Hora de fin del turno | 15:00 |
| `grace_period_minutes` | Minutos de gracia para entrada | 10 |

- El sistema detecta tardanza si el empleado entra después de `start_time + grace_period_minutes`.
- Las horas extras se calculan respecto a `end_time`.

**Turnos actuales recomendados para configurar:**

| Turno | Inicio | Fin | Gracia |
|---|---|---|---|
| Matutino | 06:00 | 14:00 | ? min |
| Vespertino | 14:00 | 22:00 | ? min |
| Nocturno | 22:00 | 06:00 | ? min |
| Administrativo | 08:00 | 17:00 | ? min |

> **Pregunta Sistemas/RH:** ¿Cuáles son los horarios exactos de cada turno y cuántos minutos de gracia se permiten?

---

## 7.C CONFIGURACIONES GLOBALES CONFIGURABLES

Parámetros que Sistemas puede ajustar sin programación (vía tabla de configuración):

| Parámetro | Valor Actual | ¿Correcto? |
|---|---|---|
| Salario diario por defecto (demo) | $450 MXN | |
| Factor horas extras | 2x (doble) | |
| Umbral OEE para bono | 85% | |
| Porcentaje bono OEE | 5% | |
| Overhead en cotización | 15% | |
| Margen de utilidad objetivo | 35% | |
| Factor scrap por defecto | 12% | |
| UMA Diaria 2026 | $108.57 MXN | |
| Umbral eficiencia incentivo alto | ≥ 110% | |
| Umbral eficiencia incentivo bajo | 100–109% | |
| Umbral calidad incentivo | ≥ 98% | |
| Umbral 5S incentivo | ≥ 90% | |

**Confirmación Sistemas / Administración:**
- [ ] Aprobado sin cambios
- [ ] Aprobado con las siguientes correcciones: ________________________________
- Firma: _______________ Fecha: _______________

---

---

# RESUMEN DE FIRMAS — VALIDACIÓN DEPARTAMENTAL

| Departamento | Responsable | Firma | Fecha | Estado |
|---|---|---|---|---|
| Recursos Humanos | | | | ☐ Aprobado ☐ Con cambios |
| Contabilidad / Nómina | | | | ☐ Aprobado ☐ Con cambios |
| Calidad | | | | ☐ Aprobado ☐ Con cambios |
| Ingeniería | | | | ☐ Aprobado ☐ Con cambios |
| Cotizaciones / Ventas | | | | ☐ Aprobado ☐ Con cambios |
| Producción / Planeación | | | | ☐ Aprobado ☐ Con cambios |
| Finanzas / Gerencia | | | | ☐ Aprobado ☐ Con cambios |
| Sistemas | | | | ☐ Aprobado ☐ Con cambios |

---

**Una vez recibidas todas las confirmaciones, el área de Sistemas actualizará el código fuente del ERP con los parámetros validados.**  
**Contacto Sistemas:** _________________________ | **Fecha límite de respuesta:** _________________________

---
*McVill ERP v3.0 — Documento de Validación Departamental — Generado: Mayo 2026*
