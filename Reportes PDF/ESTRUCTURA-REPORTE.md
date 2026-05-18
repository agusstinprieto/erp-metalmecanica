# ESTRUCTURA DE REPORTES - McVill Reporting Service

**Servicio:** http://localhost:5005
**Puerto:** 5005
**Base de datos:** Supabase Cloud
**Motor PDF 1:** QuestPDF (C#, libreria .NET, sin Chrome)
**Motor PDF 2:** PuppeteerSharp (Chrome headless, HTML -> PDF)
**Motor de templates:** Scriban (sintaxis {{ }})

---

## TIPOS DE REPORTE IDENTIFICADOS

### 1. VIAJERO INDIVIDUAL (QuestPDF)
**Motor:** QuestPDF .NET nativo
**Endpoint:** GET /api/reports/viajero/{jobID}
**Parametro opcional:** ?preview=true (abre QuestPDF Previewer en escritorio)
**Output:** PDF binario, descarga directa
**Nombre de archivo:** Viajero_{jobID}.pdf
**Tamano tipico:** 100-570 KB por viajero

**Secciones del PDF:**
- Encabezado: Logo McVill, titulo VIAJERO INDUSTRIAL, Job ID, barcode Code128, fecha impresion, numero de pagina
- Caja de datos (4 filas x 4 columnas): Parte, Revision, Cant. Orden, Fecha Orden, Cliente, Dibujo, OC Cliente, Fecha Entrega, Ensamble Padre, Ensamble T/L, Linea, Horas Est., Job ID, Cotizacion, Cant. Fabricada, Estatus
- Notas especiales (fondo amarillo, solo si el campo notas no esta vacio)
- Tabla RUTA DE PROCESO: SEQ / Centro de Trabajo (con barcode Code128) / Instrucciones Detalladas / Configurar / Tasa Proceso / Minutos Est.
- Tabla MATERIALES / RECOGIDAS: Vencimiento+REQ (con barcode) / Material+Descripcion / Ubicacion (con barcode) / Cantidad
- Tabla COMPONENTES BOM: OT/Sub-Orden / Rev / Total Hrs Est / Cant. Fabricar / Ini-Fin Programado (solo si tiene hijos)
- Footer: Padre / MCVILL SA DE CV IA.AGUS / Job ID + Parte + Revision + pagina N de M

---

### 2. VIAJERO HTML (Puppeteer/Chrome headless)
**Motor:** PuppeteerSharp, descarga Chromium ~130 MB la primera vez
**Endpoint:** GET /api/reports/viajero/html/{jobID}
**Output:** PDF generado desde template HTML Scriban
**Nombre de archivo:** Viajero_HTML_{jobID}.pdf
**Ventaja:** Diseno editable en Templates/viajero-full.html sin recompilar el servidor C#

---

### 3. MASIVO SELECCIONADOS (QuestPDF)
**Endpoint:** POST /api/reports/viajero/print-selected
**Body JSON:** { "jobIds": ["ID1", "ID2", "ID3"] }
**Parametro opcional:** ?preview=true
**Output:** PDF con multiples viajeros concatenados (un viajero por pagina/bloque)
**Nombre de archivo:** Reporte_Viajeros_{yyyyMMdd_HHmm}.pdf

---

### 4. MASIVO POR RANGO DE FECHAS (QuestPDF)
**Endpoint:** GET /api/reports/viajero/print-by-date
**Parametros:** ?fechaInicio=2026-05-01&fechaFin=2026-05-31
**Output:** PDF con todos los viajeros del rango de fechas dado
**Nombre de archivo:** Viajeros_{fechaInicio}_{fechaFin}.pdf

---

### 5. MASIVO HTML SELECCIONADOS (Puppeteer)
**Endpoint:** POST /api/reports/viajero/html/print-selected
**Body JSON:** { "jobIds": ["ID1", "ID2"] }
**Output:** PDFs individuales combinados en un solo archivo
**Nombre de archivo:** Viajeros_HTML_{yyyyMMdd_HHmm}.pdf

---

### 6. PREVIEW HTML EN NAVEGADOR
**Endpoint:** GET /api/reports/viajero/html-preview/{jobID}
**Output:** HTML puro (text/html), visualizable directamente en browser
**Uso:** Ver como quedara el PDF antes de generarlo con Puppeteer

---

### 7. DATOS CRUDOS JSON
**Endpoint:** GET /api/reports/viajero/{jobID}/data
**Output:** JSON completo con cabecera + operaciones + materiales + componentes
**Uso:** Diagnostico, debugging, integracion con otros sistemas

---

## CATALOGO Y FILTROS

| Endpoint | Descripcion |
|---|---|
| GET /api/reports/viajero/list | Lista completa de viajeros, ordenado por fecha desc |
| GET /api/reports/viajero/list-by-date?fechaInicio=X&fechaFin=Y | Lista filtrada por rango de fechas |
| GET /api/reports/viajero/latest | Genera el PDF del viajero mas reciente |

---

## GESTION CRUD

| Metodo | Endpoint | Accion |
|---|---|---|
| DELETE | /api/reports/viajero/{id} | Elimina viajero y sus operaciones, materiales y componentes en cascada |
| PATCH | /api/reports/viajero/{id} | Actualiza campos del viajero |

---

## GESTION DE TEMPLATES HTML

| Metodo | Endpoint | Accion |
|---|---|---|
| GET | /api/templates/viajero | Devuelve el contenido actual del template HTML |
| PUT | /api/templates/viajero | Actualiza el template (body JSON: { "content": "...html..." }) |

---

## MODELO DE DATOS

### Tabla principal: viajeros
| Campo DB | Tipo | Descripcion |
|---|---|---|
| id | string | Job ID unico (ej: 40124710.01, JOB-1002) |
| numero_parte | string | Numero de parte (ej: 40124710, BUCKET-001) |
| descripcion | string | Descripcion del producto |
| revision | string | Revision del plano (ej: REV-B) |
| cantidad_orden | double? | Cantidad ordenada en piezas |
| cant_fabricada | double? | Cantidad ya fabricada |
| cliente | string | Nombre del cliente |
| oc_cliente | string | Orden de compra del cliente |
| linea | string | Linea de produccion |
| ensamble_tl | string | ID del Ensamble Top Level |
| fecha_orden | DateTime? | Fecha de la orden de fabricacion |
| fecha_entrega | DateTime? | Fecha compromiso de entrega |
| dibujo | string | Numero de plano o dibujo |
| cotizacion | string | Numero de cotizacion |
| horas_est_totales | double? | Horas totales estimadas (calculado desde operaciones) |
| notas | string | Notas especiales de produccion |

### Tabla: viajero_operaciones
| Campo DB | Tipo | Descripcion |
|---|---|---|
| viajero_id o job_id | string | FK al viajero padre |
| orden | int? | Secuencia de la operacion |
| clave_operacion | string | Codigo de operacion |
| nombre_operacion | string | Nombre de la operacion |
| centro_trabajo | string | Centro de trabajo (genera barcode Code128) |
| descripcion_detallada | string | Instrucciones detalladas paso a paso |
| configuracion | double? | Tiempo de configuracion en horas |
| tasa_proceso | string | Tasa de proceso (ej: 10.5 Min/Part) |
| tiempo_estimado | double? | Tiempo estimado en horas |
| tiempo_min | double? | Tiempo estimado en minutos |

### Tabla: viajero_materiales
| Campo DB | Tipo | Descripcion |
|---|---|---|
| viajero_id o job_id | string | FK al viajero padre |
| clave | string | Codigo del material |
| descripcion | string | Descripcion del material |
| cantidad | double? | Cantidad requerida |
| unidad | string | Unidad de medida (PZ, KG, MT, etc.) |
| ubicacion | string | Ubicacion en inventario (genera barcode) |
| clave_requerimiento | string | Clave de requerimiento (genera barcode) |
| fecha_vencimiento | DateTime? | Vencimiento del material |
| lote | string | Numero de lote |
| partes_barra | double? | Partes por barra de acero |
| piezas_por | double? | Piezas por unidad |
| piezas_reg | double? | Piezas requeridas |

### Tabla: viajero_componentes (BOM)
| Campo DB | Tipo | Descripcion |
|---|---|---|
| viajero_id | string | FK al viajero padre |
| job_id_hijo | string | ID del sub-viajero hijo |
| parte | string | Numero de parte del componente |
| revision | string | Revision del componente |
| descripcion | string | Descripcion del componente |
| horas_est | double? | Horas estimadas del sub-componente |
| cantidad | double? | Cantidad de componentes |
| fecha_inicio_prg | DateTime? | Inicio programado de fabricacion |
| fecha_fin_prg | DateTime? | Fin programado de fabricacion |

---

## BARCODES

El sistema genera barcodes Code128 embebidos como imagenes base64 (no requieren archivos externos):
- Job ID en el encabezado (altura 30px)
- Centro de Trabajo en cada operacion (altura 16px)
- Clave de Requerimiento REQ en cada material (altura 14px)
- Ubicacion de inventario en cada material (altura 14px)

---

## ENRIQUECIMIENTO AUTOMATICO DE DATOS

El ViajeroService enriquece automaticamente los datos antes de generar el PDF:
1. Si la descripcion de un material es un placeholder, busca en viajero_materiales, inventory_items, materials y viajeros
2. Si la descripcion de un componente es un placeholder, busca en viajeros por ID parcial o numero de parte
3. Calcula HorasEstTotales sumando tiempo_min de todas las operaciones y convirtiendo a horas
4. Resuelve la jerarquia: EnsamblePadre (buscando en viajero_componentes donde job_id_hijo = jobID) y EnsambleTL (datos de la tabla viajeros)

---

## VIAJEROS DISPONIBLES (37 registros al 2026-05-17)

Clientes industriales:
- CATERPILLAR: ENS-CAT-001 (oruga), BUCKET-001 x2
- KENWORTH: CHASIS-001 (chasis semirremolque 18 ruedas)
- JOHN DEERE: ENGRANE TRACTOR (acero 4140, temple+revenido)
- US AIR FORCE: ALA AVION F16 (aleacion aluminio+titanio)
- BOEING DE MEXICO: HELICE-001 (paso variable 7075-T6)
- MANITOWOK: KM51712522V002

Internos MCVILL SA DE CV (28 ordenes):
- Tipos: corte laser CNC, ensamble y soldadura, rolado, doblez, remachado, mecanizado
- Productos: bocinas industriales, cerraduras, soportes, tubos, placas, codos, ensambles

El viajero de ejemplo en esta carpeta es 40124710.01 (HORN ASM - BOCINA INDUSTRIAL):
- Parte: 40124710
- Cliente: MCVILL SA DE CV
- Fecha orden: 03-may-2026
- Fecha entrega: 27-may-2026
- Ensamble padre: 40166327.C760

---

## INSTRUCCIONES PARA GENERAR PDFs

Viajero individual:
  curl -s http://localhost:5005/api/reports/viajero/40124710.01 -o viajero.pdf

Masivo seleccionados (POST JSON):
  curl -s -X POST -H "Content-Type: application/json" -d "{\"jobIds\":[\"ID1\",\"ID2\"]}" http://localhost:5005/api/reports/viajero/print-selected -o masivo.pdf

Por rango de fechas:
  curl -s "http://localhost:5005/api/reports/viajero/print-by-date?fechaInicio=2026-05-01&fechaFin=2026-05-31" -o rango.pdf

Iniciar el servicio (.NET):
  cd "c:\Users\aguss\Downloads\IA Inteligencia Artificial\IA.AGUS\Desarrollo de Apps\reporting-service"
  dotnet run
  (Puerto 5005, esperar: Reporting Service is running)

---

## ARCHIVOS EN ESTA CARPETA

| Archivo | Descripcion |
|---|---|
| reporte-viajero-40124710.01.pdf | PDF real QuestPDF 196 KB 2 paginas - Job HORN ASM BOCINA INDUSTRIAL |
| preview-viajero-40124710.01.html | Preview HTML con datos de cabecera del mismo viajero |
| template-viajero.html | Template Scriban original del reporting-service editable sin recompilar |
| ESTRUCTURA-REPORTE.md | Este archivo, documentacion completa del sistema de reportes |

---

Documentacion generada: 2026-05-17 | Reporting Service v1 | McVill ERP Industrial
