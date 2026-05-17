# MANUAL DE FÓRMULAS Y MÉTODOS DE CÁLCULO — McVill ERP
**Versión de Algoritmos:** 2.6 (Actualizado a métricas 2026)
**Objetivo:** Validación departamental de las fórmulas matemáticas y reglas de negocio automatizadas en el ERP.

Por favor, revisar por área y confirmar si los criterios y porcentajes son correctos.

---

## 1. RECURSOS HUMANOS Y NÓMINA (Aprobar con RRHH / Contabilidad)

### 1.1 Cálculo de Salario Base y Horas Extras
* **Salario Base:** `Salario Diario × Días Trabajados en el periodo (generalmente 15 o 7)`.
* **Tarifa por Hora:** `Salario Diario / 8 horas`.
* **Horas Extras (Doble):** Se pagan al **200%** (Doble). 
  * *Fórmula:* `Horas Extras × (Tarifa por Hora × 2)`.

### 1.2 Sistema de Bonos de Producción (OEE)
Para incentivar el rendimiento de la planta, el ERP evalúa automáticamente el OEE (Eficiencia General de los Equipos).
* **Umbral de Bono:** El operador o línea debe superar el **85% de OEE**.
* **Monto del Bono:** **5.0%** sobre el (Salario Base + Horas Extras).
  * *Fórmula:* `Si OEE ≥ 85% → Bono = (Base + Extras) × 0.05`.

### 1.3 Deducciones por Faltas y Retardos
* **Faltas Injustificadas:** Descuento exacto de **1 día de salario** por cada falta.
  * *Fórmula:* `Deducción por Faltas = Faltas Acumuladas × Salario Diario`.
* **Retardos:** Actualmente el sistema cuenta el retardo en el resumen de asistencia pero no hace una deducción automática de fracción de día, requiere revisión manual de RRHH.

### 1.4 Impuestos y Retenciones de Ley (2026)
* **ISR (SAT):** Utiliza las tablas mensuales vigentes para 2026 (Art. 96 LISR) y la tabla de Subsidio al Empleo (Art. octavo transitorio).
* **IMSS Obrero:** 
  * Invalidez y Vida (IV) = **0.625%** del salario.
  * Cesantía y Vejez (CV) = **1.125%** del salario.
  * Enfermedad y Maternidad (EM) = **0.40%** sobre el excedente de 3 UMAs. *(UMA 2026 fijada en $108.57 MXN).*

---

## 2. VENTAS Y COTIZACIONES (Aprobar con Gerencia Comercial / PM)

### 2.1 Matriz de Riesgo y Asignación de SLA (Formato PM_F001)
Cuando entra un nuevo RFQ (Request for Quote), la IA o el PM ingresan la complejidad de la pieza. El ERP calcula un "Risk Score" que determina cuántos días tiene Ingeniería para entregar la cotización (SLA).

**Puntaje por Variables:**
* **Tipos de Aceros / Materiales:** 1 a 2 tipos = `1 punto`. 3 o más tipos = `3 puntos`.
* **Procesos (Corte, doblez, soldadura, etc):** 1-2 procesos = `1 punto`. 3-5 procesos = `2 puntos`. 6+ procesos = `3 puntos`.
* **Subensambles:** 0-2 sub = `1 punto`. 3 sub = `2 puntos`. 4+ sub = `3 puntos`.
* **Hardware (Tornillería, insertos):** 0-2 hdw = `1 punto`. 3 hdw = `2 puntos`. 4+ hdw = `3 puntos`.

**Resultado del Nivel de Riesgo:**
* **LOW (Score < 6):** Pieza sencilla. SLA = **5 días**.
* **MEDIUM (Score 6 a 8):** Complejidad media. SLA = **10 días**.
* **HIGH (Score ≥ 9):** Proyecto complejo/ensamble mayor. SLA = **20 días**.

### 2.2 Márgenes Financieros
* **Overhead Operativo (Fijo):** **15.0%** añadido al costo operativo bruto de la planta para cubrir indirectos.
* **Margen de Utilidad Objetivo:** **35.0%** aplicado sobre el Costo Total (Material + Procesos + Overhead).

---

## 3. INGENIERÍA Y PLANEACIÓN (Aprobar con Gerencia de Planta / Ingeniería)

### 3.1 Tasas Horarias Estándar (Costo Máquina/Hora)
Estas tarifas se utilizan para costear la producción en las cotizaciones y medir rentabilidad. *Incluyen energéticos, depreciación y consumibles básicos (gases, soldadura).*
* **Cortadora Láser de Fibra:** $1,200 MXN / hora
* **Centro de Maquinado CNC:** $950 MXN / hora
* **Dobladora Hidráulica CNC:** $850 MXN / hora
* **Cabina de Pintura Electrostática:** $600 MXN / hora
* **Soldadura TIG/MIG (Estructural):** $450 MXN / hora
* **Área de Ensamble y Ajuste:** $300 MXN / hora

### 3.2 Desperdicio de Materiales
* **Factor de Scrap en Placa:** Por defecto se calcula un **12.0%** de merma o esqueleto tras el corte láser/plasma, a menos que el software de Nesting reporte una eficiencia distinta.

---

## 4. CALIDAD (Aprobar con Gerencia de Calidad / ISO 9001)

### 4.1 Inspecciones y Aceptación de Lotes
* **Defectos:** Se requiere documentar los tipos de defecto encontrados (Rebabas, fuera de tolerancia dimensional, porosidad en soldadura).
* **Trazabilidad:** Toda inspección rechazada (`status: failed`) genera una marca en la Orden de Trabajo / Viajero de Producción. Si la inspección es crítica, se detona una alerta al Webhook de Teams.
* **Manejo de No Conformidades:** Clasificadas en Severidad (`Menor`, `Mayor`, `Crítica`) y Origen (`Inspección`, `Auditoría`, `Cliente`). Todas requieren captura obligatoria de *Causa Raíz* y *Acción Correctiva*.

---

**Nota Técnica para IA.AGUS:** Si alguna de estas reglas cambia tras la revisión de los gerentes, solicitar la actualización inmediata de la "Lógica de Negocios" en el código fuente de los Servicios del ERP.
