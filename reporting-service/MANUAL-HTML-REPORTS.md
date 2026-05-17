# Manual: Sistema de Reportes HTML → PDF (PuppeteerSharp)

> **TL;DR:** Para cambiar el diseño del Viajero, edita [`Templates/viajero-full.html`](Templates/viajero-full.html) y abre ese archivo en Chrome para ver el resultado en tiempo real. Sin recompilar nada.

---

## Tabla de contenidos

1. [¿Cómo funciona?](#1-cómo-funciona)
2. [Arquitectura — dos motores de PDF](#2-arquitectura--dos-motores-de-pdf)
3. [Endpoints disponibles](#3-endpoints-disponibles)
4. [Flujo de trabajo para diseñar](#4-flujo-de-trabajo-para-diseñar)
5. [Variables disponibles en el template](#5-variables-disponibles-en-el-template)
6. [Sintaxis Scriban ({{ }})](#6-sintaxis-scriban--)
7. [Recetas de cambios comunes](#7-recetas-de-cambios-comunes)
8. [Dónde vive cada pieza del código](#8-dónde-vive-cada-pieza-del-código)
9. [Primera vez — descarga de Chromium](#9-primera-vez--descarga-de-chromium)

---

## 1. ¿Cómo funciona?

```
Base de datos (Supabase)
        ↓
  ViajeroService.cs          ← busca los datos del job
        ↓
  TemplateRenderService.cs   ← inyecta datos en el HTML con Scriban
        ↓
  Templates/viajero-full.html ← aquí editas el diseño
        ↓
  PuppeteerPdfService.cs     ← Chrome headless convierte el HTML a PDF
        ↓
  PDF descargado al cliente
```

El archivo HTML que editas es **exactamente** lo que Chrome imprime. Lo que ves en el navegador = lo que sale en el PDF.

---

## 2. Arquitectura — dos motores de PDF

El servicio tiene **dos motores en paralelo**. Son independientes, ninguno reemplaza al otro.

| Motor | Prefix de URL | Tecnología | Cuándo usarlo |
|---|---|---|---|
| **QuestPDF** (original) | `/api/reports/viajero/` | C# puro | Producción actual, reportes estables |
| **HTML/Chrome** (nuevo) | `/api/reports/viajero/html/` | HTML + Chromium | Diseño fácil, iteración rápida |

> Si algo falla en el nuevo motor, los endpoints originales siguen funcionando sin cambios.

---

## 3. Endpoints disponibles

### Motor HTML (nuevo)

#### `GET /api/reports/viajero/html-preview/{jobID}`

Devuelve el HTML crudo. Ábrelo en el navegador para ver exactamente cómo quedará el PDF.

```bash
# En el navegador, escribe directamente:
http://localhost:5005/api/reports/viajero/html-preview/JOB-1002

# O con curl:
curl http://localhost:5005/api/reports/viajero/html-preview/JOB-1002 > preview.html
```

---

#### `GET /api/reports/viajero/html/{jobID}`

Genera y descarga el PDF de un job específico.

```bash
curl -o Viajero_JOB-1002.pdf \
  http://localhost:5005/api/reports/viajero/html/JOB-1002
```

También funciona directamente desde el navegador: navega a la URL y el PDF se descarga.

---

#### `POST /api/reports/viajero/html/print-selected`

Genera un PDF con múltiples jobs concatenados.

```bash
curl -X POST http://localhost:5005/api/reports/viajero/html/print-selected \
  -H "Content-Type: application/json" \
  -d '{ "jobIds": ["JOB-1002", "JOB-1003", "JOB-1005"] }' \
  -o Viajeros_lote.pdf
```

Desde JavaScript/frontend:

```js
const response = await fetch('http://localhost:5005/api/reports/viajero/html/print-selected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jobIds: selectedIds }),
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
window.open(url); // abre el PDF en nueva pestaña
```

---

### Motor QuestPDF (original — sin cambios)

| Endpoint | Descripción |
|---|---|
| `GET /api/reports/viajero/{jobID}` | PDF individual (QuestPDF) |
| `POST /api/reports/viajero/print-selected` | PDF masivo (QuestPDF) |
| `GET /api/reports/viajero/list` | Catálogo de jobs |
| `GET /api/reports/viajero/list-by-date` | Catálogo filtrado por fecha |

---

## 4. Flujo de trabajo para diseñar

### Paso 1 — Abrir el preview en vivo

Navega a esta URL en tu navegador mientras el servicio está corriendo:

```
http://localhost:5005/api/reports/viajero/html-preview/JOB-1002
```

Verás el HTML renderizado con datos reales de la base de datos. Puedes usar **Ctrl+P** en Chrome para ver cómo se vería impreso.

---

### Paso 2 — Editar el template

Abre [`Templates/viajero-full.html`](Templates/viajero-full.html) en tu editor.

Cada sección tiene un comentario que explica qué controla:

```html
/* ═══════════════════════════════════════════════════
   TÍTULOS DE SECCIÓN
   Cambia el color #1e40af para cambiar el azul de todos los títulos.
   ═══════════════════════════════════════════════════ */
.section-title strong {
  color: #1e40af;  /* ← CAMBIA ESTE COLOR */
}
```

---

### Paso 3 — Ver los cambios

Recarga la URL del preview en el navegador:

```
http://localhost:5005/api/reports/viajero/html-preview/JOB-1002
```

> **No necesitas recompilar** el servidor C#. El HTML se lee del disco en cada request.

---

### Paso 4 — Generar el PDF final

Cuando el diseño te convenza:

```
http://localhost:5005/api/reports/viajero/html/JOB-1002
```

---

## 5. Variables disponibles en el template

Todas se usan con la sintaxis `{{ nombre_variable }}`.

### Datos del job (`job.*`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `{{ job.id }}` | `JOB-1002` | ID del job |
| `{{ job.numero_parte }}` | `CHASIS-001` | Número de parte |
| `{{ job.revision }}` | `REV-B` | Revisión |
| `{{ job.descripcion }}` | `Chasis estructural...` | Descripción larga |
| `{{ job.cliente }}` | `TRANSPORTES SA` | Nombre del cliente |
| `{{ job.cantidad_orden }}` | `250 PZ` | Cantidad ordenada (ya formateada) |
| `{{ job.cant_fabricada }}` | `180` | Cantidad fabricada hasta ahora |
| `{{ job.fecha_orden }}` | `12-May-2026` | Fecha de orden (dd-MMM-yyyy) |
| `{{ job.fecha_entrega }}` | `30-May-2026` | Fecha de entrega |
| `{{ job.fecha_impresion }}` | `12-May-26 14:30` | Timestamp de impresión |
| `{{ job.oc_cliente }}` | `OC-9834` | Orden de compra del cliente |
| `{{ job.linea }}` | `ESTÁNDAR` | Línea de producción |
| `{{ job.cotizacion }}` | `COT-2026-014` | Número de cotización |
| `{{ job.horas_est }}` | `48.00 HRS` | Horas estimadas totales |
| `{{ job.ensamble_padre }}` | `JOB-1001` | Job padre en la jerarquía |
| `{{ job.ensamble_tl }}` | `TOP LEVEL` | Top Level assembly |
| `{{ job.notas }}` | `Pieza crítica` | Notas especiales |
| `{{ job.tiene_notas }}` | `true/false` | Usa en `{{ if }}` para mostrar notas |
| `{{ job.tiene_componentes }}` | `true/false` | Usa en `{{ if }}` para mostrar BOM |
| `{{ job.barcode_img }}` | `<img src="data:...">` | Barcode del Job ID (ya es HTML) |

---

### Operaciones / Ruta (`operaciones`)

Se itera con `{{ for op in operaciones }}`.

| Variable | Ejemplo | Descripción |
|---|---|---|
| `{{ op.orden }}` | `10` | Secuencia |
| `{{ op.ct }}` | `SOLD-001` | Centro de trabajo |
| `{{ op.clave }}` | `OP-SLD` | Clave de operación |
| `{{ op.nombre }}` | `Soldadura MIG` | Nombre corto |
| `{{ op.descripcion }}` | `Soldar largueros...` | Instrucciones detalladas |
| `{{ op.config }}` | `2.50` | Tiempo de configuración |
| `{{ op.tasa }}` | `15.00` | Tasa de proceso |
| `{{ op.minutos }}` | `30.00` | Minutos estimados |
| `{{ op.barcode_img }}` | `<img src="data:...">` | Barcode del centro de trabajo |

---

### Materiales (`materiales`)

Se itera con `{{ for mat in materiales }}`.

| Variable | Ejemplo | Descripción |
|---|---|---|
| `{{ mat.req }}` | `REQ-0042` | Clave del requerimiento |
| `{{ mat.clave }}` | `ACE-HR-001` | Clave del material |
| `{{ mat.descripcion }}` | `Acero HR calibre 14` | Descripción |
| `{{ mat.ubicacion }}` | `A-12-3` | Ubicación en almacén |
| `{{ mat.cantidad }}` | `12.50` | Cantidad requerida |
| `{{ mat.unidad }}` | `KG` | Unidad de medida |
| `{{ mat.vencimiento }}` | `30-Jun-26` | Fecha de vencimiento |
| `{{ mat.lote }}` | `L-2026-05` | Número de lote |
| `{{ mat.tiene_lote }}` | `true/false` | Usa en `{{ if }}` |
| `{{ mat.barcode_req_img }}` | `<img src="data:...">` | Barcode del REQ |
| `{{ mat.barcode_ubi_img }}` | `<img src="data:...">` | Barcode de la ubicación |

---

### Componentes / BOM (`componentes`)

Solo aparecen si `job.tiene_componentes` es `true`. Se itera con `{{ for comp in componentes }}`.

| Variable | Ejemplo | Descripción |
|---|---|---|
| `{{ comp.job_id }}` | `JOB-1003` | ID del sub-job |
| `{{ comp.parte }}` | `LARGUERO-001` | Número de parte del componente |
| `{{ comp.revision }}` | `REV-A` | Revisión |
| `{{ comp.descripcion }}` | `Larguero principal` | Descripción |
| `{{ comp.horas_est }}` | `12.00` | Horas estimadas |
| `{{ comp.cantidad }}` | `2.00 PZ` | Cantidad requerida |
| `{{ comp.inicio }}` | `15-May-26` | Inicio programado |
| `{{ comp.fin }}` | `28-May-26` | Fin programado |

---

## 6. Sintaxis Scriban (`{{ }}`)

El motor de templates es [Scriban](https://github.com/scriban/scriban). Es muy similar a Jinja2 o Liquid.

### Mostrar una variable

```html
<td>{{ job.numero_parte }}</td>
```

### Condicional

```html
{{ if job.tiene_notas }}
  <div class="notas-box">{{ job.notas }}</div>
{{ end }}
```

Con `else`:

```html
{{ if job.tiene_componentes }}
  <p>Tiene BOM</p>
{{ else }}
  <p>Sin componentes</p>
{{ end }}
```

### Iterar una lista

```html
{{ for op in operaciones }}
  <tr>
    <td>{{ op.orden }}</td>
    <td>{{ op.nombre }}</td>
  </tr>
{{ else }}
  <!-- Se ejecuta sólo si la lista está vacía -->
  <tr><td>Sin operaciones</td></tr>
{{ end }}
```

### Texto literal con llaves

Si necesitas escribir `{` o `}` en CSS dentro del template, usa `{{` para escapar:

```html
/* En Scriban, {{ y }} son el inicio/fin de expresión.
   CSS ya usa { y } que son literales — no necesitan escape. */
.clase { color: red; }   /* esto funciona directo */
```

---

## 7. Recetas de cambios comunes

### Cambiar el color azul principal

Busca `#1e40af` en el template y cámbialo por el color que quieras. Ese valor aparece en:
- Header (`border-bottom`)
- Títulos de sección
- Header de la tabla de Ruta
- Labels de la tabla de datos del job

```css
/* Ejemplo: cambiar a verde corporativo */
.section-title strong { color: #166534; }
.ruta-th              { background: #166534; }
.job-info .lbl        { color: #166534; }
```

---

### Agregar una columna a la tabla de Ruta

En el `<thead>` agrega el `<th>` y en el `{{ for op in operaciones }}` agrega el `<td>`:

```html
<!-- En el thead: -->
<th class="ruta-th" style="width:10%">NUEVA COL</th>

<!-- En el tbody (dentro del for): -->
<td class="ruta-td">{{ op.nueva_variable }}</td>
```

> Si la variable no existe en el modelo, Scriban la muestra vacía sin romper (modo `StrictVariables = false`).

---

### Poner el logo de la empresa

En la sección del header, reemplaza el texto por una imagen:

```html
<!-- Antes: -->
MCVILL SA DE CV<br/>

<!-- Después: -->
<img src="data:image/png;base64,AQUI_VA_EL_BASE64" style="height:50px" alt="Logo"/>
```

Para convertir un PNG a base64 en PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\logo.png"))
```

---

### Ocultar una sección completa

Envuelve la sección en un `{{ if false }}...{{ end }}` temporalmente, o borra el bloque HTML.

```html
<!-- Para ocultar la sección BOM: -->
{{# Comentado: if job.tiene_componentes #}}
{{# ... contenido ... #}}
{{# end #}}
```

---

### Cambiar márgenes del PDF

Los márgenes los controla [`Services/PuppeteerPdfService.cs`](Services/PuppeteerPdfService.cs), en la sección `MarginOptions`:

```csharp
MarginOptions = new MarginOptions
{
    Top    = "18mm",   // ← cambia aquí
    Bottom = "18mm",
    Left   = "18mm",
    Right  = "18mm",
}
```

> Este cambio sí requiere recompilar y reiniciar el servicio.

---

## 8. Dónde vive cada pieza del código

```
reporting-service/
├── Templates/
│   └── viajero-full.html          ← EDITA AQUÍ el diseño (sin recompilar)
│
├── Services/
│   ├── TemplateRenderService.cs   ← convierte ViajeroModel → variables del template
│   ├── PuppeteerPdfService.cs     ← Chrome headless: HTML → PDF bytes
│   └── ViajeroService.cs          ← consultas a Supabase
│
├── Reports/
│   └── ViajeroDocument.cs         ← motor QuestPDF original (no tocar)
│
└── Program.cs                     ← endpoints registrados aquí
```

### Para agregar un campo nuevo al template

1. Agrega el campo en [`Services/TemplateRenderService.cs`](Services/TemplateRenderService.cs) dentro del método `BuildGlobals()`:
   ```csharp
   job["mi_campo_nuevo"] = m.MiCampoNuevo ?? "—";
   ```
2. Úsalo en el template:
   ```html
   <td>{{ job.mi_campo_nuevo }}</td>
   ```
3. Recompila una vez el servidor.

---

## 9. Primera vez — descarga de Chromium

La primera vez que el servicio arranca, descarga automáticamente Chromium (~130 MB) en segundo plano. Verás en la consola:

```
🌐 [Puppeteer] Verificando Chromium...
✅ [Puppeteer] Chromium listo.
```

Mientras descarga, los endpoints de QuestPDF siguen funcionando. Los endpoints `/html/` funcionan tan pronto como termina la descarga (normalmente antes del primer request).

La descarga ocurre **solo una vez**. Se guarda en `.local-chromium/` dentro del directorio del proyecto y se reutiliza en todos los arranques futuros.

---

## Resumen rápido

| Quiero... | Hago... |
|---|---|
| Ver cómo quedará el PDF | Navegar a `http://localhost:5005/api/reports/viajero/html-preview/JOB-XXXX` |
| Cambiar colores/fuentes/layout | Editar [`Templates/viajero-full.html`](Templates/viajero-full.html) y recargar el preview |
| Generar un PDF individual | `GET /api/reports/viajero/html/{jobID}` |
| Generar un PDF de varios jobs | `POST /api/reports/viajero/html/print-selected` con `{ "jobIds": [...] }` |
| Agregar un campo de datos | Editar `BuildGlobals()` en [`Services/TemplateRenderService.cs`](Services/TemplateRenderService.cs) + recompilar |
| Cambiar márgenes del PDF | Editar `MarginOptions` en [`Services/PuppeteerPdfService.cs`](Services/PuppeteerPdfService.cs) + recompilar |
| Usar el motor original (QuestPDF) | Usar `/api/reports/viajero/{jobID}` (sin `/html/`) |
