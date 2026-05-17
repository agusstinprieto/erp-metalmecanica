# Sistema de Reportes — McVill ERP
> Referencia técnica completa · Mayo 2026

---

## Índice

1. [Las tres versiones de reportes](#1-las-tres-versiones)
2. [Cuándo usar cada una](#2-cuándo-usar-cada-una)
3. [Patrón de archivos y estructura](#3-estructura-de-archivos)
4. [Cómo crear un reporte nuevo](#4-cómo-crear-un-reporte-nuevo)
5. [Flujo con IA para diseñar reportes](#5-flujo-con-ia)
6. [Referencia rápida de API](#6-referencia-rápida)

---

## 1. Las tres versiones

### Versión A — Frontend / jsPDF
**Dónde vive:** `mcvill-erp/src/utils/reportUtils.ts`  
**Corre en:** el navegador del usuario (sin servidor)  
**Licencia:** MIT, gratuita  

```
Usuario → hace clic "Exportar PDF"
         → reportUtils.exportToPDF(...)
         → jsPDF genera el PDF en memoria
         → descarga automática al navegador
```

**Lo que puede hacer:**
- Tablas de datos de cualquier array
- Encabezado con logo McVill + barras de color
- Pie de página con numeración
- Descarga directa sin abrir ventana nueva

**Limitaciones:**
- Sin layouts complejos (columnas múltiples, cajas flotantes)
- Sin barcodes / QR
- Tamaño de fuente y estilos básicos

---

### Versión B — Servidor / QuestPDF
**Dónde vive:** `reporting-service/Reports/ViajeroDocument.cs` (y futuros `*Document.cs`)  
**Corre en:** Railway (Node service → .NET 8)  
**Licencia:** Community License (gratis hasta cierto volumen; para empresas grandes requiere pago)

```
Usuario → hace clic "Imprimir"
         → fetch POST /api/reports/viajero/print-selected
         → reporting-service consulta Supabase
         → QuestPDF genera el PDF en el servidor
         → responde application/pdf
         → se abre en pestaña nueva del navegador
```

**Lo que puede hacer:**
- Layouts pixel-perfect con Fluent API
- Barcodes y QR codes (librería Barcoder)
- Multi-página automática
- Logo desde `Assets/mcvill-logo.png` del servidor
- Batch: múltiples registros en un solo PDF
- Progress tracking por token

**Limitaciones:**
- Requiere Railway corriendo
- Cada reporte nuevo = deploy al servidor
- Licencia Community tiene restricciones para empresas grandes

---

### Versión C — Servidor / MigraDoc + PDFsharp
**Dónde vive:** `reporting-service/Reports/ViajeroMigraDocument.cs` (y futuros `*MigraDocument.cs`)  
**Corre en:** Railway (mismo service que QuestPDF)  
**Licencia:** MIT — completamente gratuita, sin restricciones, uso comercial ilimitado

```
Usuario → toggle "Migra" en panel → hace clic "Imprimir"
         → fetch POST /api/reports/viajero/migra/print-selected
         → reporting-service consulta Supabase
         → MigraDoc/PDFsharp genera el PDF
         → responde application/pdf
```

**Lo que puede hacer:**
- Todo lo de QuestPDF en cuanto a estructura
- Tablas con heading format (se repite en cada página)
- Estilos por párrafo (similar a Word/MigraDoc)
- Multi-página automática con pie de página
- Sin costo de licencia — ideal para clientes pequeños

**Diferencia vs QuestPDF:**
MigraDoc usa un modelo de documento tipo "Word" (párrafos, tablas, secciones).
QuestPDF usa un modelo fluent tipo "diseñador" (filas, columnas, contenedores).
Ambos producen PDFs de calidad similar; la diferencia es cómo se programa el layout.

---

## 2. Cuándo usar cada una

| Situación | Versión recomendada |
|-----------|-------------------|
| Reporte simple de tabla (inventario, nómina, asistencia) | **A — jsPDF** |
| Cliente pequeño / sin preocupación de licencia | **C — MigraDoc** |
| Reporte complejo con barcodes, QR, viajero industrial | **B — QuestPDF** |
| La empresa usa el ERP en producción masiva | **B — QuestPDF** con licencia Professional |
| Demo o empresa pequeña que quiere PDF gratis | **C — MigraDoc** |
| Reporte que el usuario descarga sin abrir pestaña | **A — jsPDF** |
| Reporte que el usuario imprime desde ventana de browser | **B o C** |

---

## 3. Estructura de archivos

```
mcvill-erp/
└── src/
    └── utils/
        └── reportUtils.ts          ← Motor A (jsPDF)
            ├── exportToPDF()       ← reporte genérico
            ├── exportToCSV()       ← export CSV
            ├── loadLogo()          ← carga /public/mcvill-logo.png
            ├── drawHeader()        ← encabezado reutilizable
            ├── drawFooters()       ← pies de página
            └── autoTable()         ← wrapper de jspdf-autotable v5

reporting-service/
├── Assets/
│   └── mcvill-logo.png             ← logo para reportes B y C
├── Models/
│   └── ViajeroModel.cs             ← modelos de datos
├── Reports/
│   ├── ViajeroDocument.cs          ← Motor B (QuestPDF)
│   ├── ViajeroMigraDocument.cs     ← Motor C (MigraDoc)
│   ├── CotizacionDocument.cs       ← próximo Motor B
│   └── CotizacionMigraDocument.cs  ← próximo Motor C
├── Services/
│   └── ViajeroService.cs           ← consultas Supabase
└── Program.cs                      ← endpoints REST
```

---

## 4. Cómo crear un reporte nuevo

### Caso A: reporte simple en el frontend (jsPDF)

1. En el componente que necesita el reporte, importar `reportUtils`:

```ts
import { reportUtils } from '../utils/reportUtils';
```

2. Llamar `exportToPDF` con los datos que ya tienes en el componente:

```ts
const handleExport = async () => {
  await reportUtils.exportToPDF(
    'Órdenes de Compra',          // título
    ordenes.map(o => ({           // array de objetos planos
      Folio:     o.folio,
      Proveedor: o.proveedor,
      Monto:     `$${o.monto.toFixed(2)}`,
      Fecha:     o.fecha,
      Estatus:   o.estatus,
    })),
    'Compras',                    // nombre del archivo
    'MÓDULO COMPRAS',             // subtítulo en el encabezado
  );
};
```

3. Listo. El logo se carga automáticamente desde `/mcvill-logo.png`.

---

### Caso B/C: reporte profesional en el servidor (QuestPDF o MigraDoc)

Sigue este checklist de 4 pasos:

#### Paso 1 — Crear el modelo de datos

En `reporting-service/Models/`, crear `CotizacionModel.cs`:

```csharp
namespace McVill.ReportService.Models;

public class CotizacionModel
{
    public string Id           { get; set; } = "";
    public string Cliente      { get; set; } = "";
    public string Folio        { get; set; } = "";
    public DateTime Fecha      { get; set; }
    public List<PartidaModel> Partidas { get; set; } = new();
    public decimal Subtotal    { get; set; }
    public decimal IVA         { get; set; }
    public decimal Total       { get; set; }
}

public class PartidaModel
{
    public string Descripcion  { get; set; } = "";
    public int    Cantidad     { get; set; }
    public decimal PrecioUnit  { get; set; }
    public decimal Importe     { get; set; }
}
```

#### Paso 2 — Crear la consulta Supabase

En `reporting-service/Services/`, agregar en `ViajeroService.cs` (o crear `CotizacionService.cs`):

```csharp
public async Task<CotizacionModel?> GetCotizacionAsync(string id)
{
    var url = $"{_supabaseUrl}/rest/v1/cotizaciones?id=eq.{id}&select=*,partidas:cotizacion_partidas(*)";
    var res = await _http.GetAsync(url);
    // ... deserializar y mapear
}
```

#### Paso 3A — Documento QuestPDF

Crear `Reports/CotizacionDocument.cs`:

```csharp
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using McVill.ReportService.Models;

public class CotizacionDocument : IDocument
{
    public CotizacionModel Model { get; }
    public CotizacionDocument(CotizacionModel model) => Model = model;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.Letter);
            page.Margin(18);
            page.DefaultTextStyle(x => x.FontSize(9).FontFamily(Fonts.Arial));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);
            page.Footer().AlignCenter().Text(x => {
                x.Span("McVill SA de CV  ·  Página ");
                x.CurrentPageNumber();
                x.Span(" de ");
                x.TotalPages();
            });
        });
    }

    private void ComposeHeader(IContainer c) { /* logo + datos */ }
    private void ComposeContent(IContainer c) { /* tabla de partidas + totales */ }
}
```

#### Paso 3B — Documento MigraDoc (MIT, sin costo)

Crear `Reports/CotizacionMigraDocument.cs`:

```csharp
using MigraDoc.DocumentObjectModel;
using MigraDoc.Rendering;
using McVill.ReportService.Models;

public static class CotizacionMigraDocument
{
    public static byte[] Generate(CotizacionModel model)
    {
        var doc      = new Document();
        var section  = doc.AddSection();
        section.PageSetup.PageFormat = PageFormat.Letter;

        // Encabezado
        var header = section.AddParagraph("McVill SA de CV");
        // ... tabla de partidas, totales

        var renderer = new PdfDocumentRenderer { Document = doc };
        renderer.RenderDocument();
        using var ms = new MemoryStream();
        renderer.PdfDocument.Save(ms);
        return ms.ToArray();
    }
}
```

#### Paso 4 — Agregar los endpoints en Program.cs

```csharp
// QuestPDF
app.MapGet("/api/reports/cotizacion/{id}", async (string id, CotizacionService db) =>
{
    var data = await db.GetCotizacionAsync(id);
    if (data == null) return Results.NotFound();
    var pdf = new CotizacionDocument(data).GeneratePdf();
    return Results.File(pdf, "application/pdf", $"Cotizacion_{id}.pdf");
});

// MigraDoc (MIT)
app.MapGet("/api/reports/cotizacion/{id}/migra", async (string id, CotizacionService db) =>
{
    var data = await db.GetCotizacionAsync(id);
    if (data == null) return Results.NotFound();
    var pdf = CotizacionMigraDocument.Generate(data);
    return Results.File(pdf, "application/pdf", $"Cotizacion_{id}_migra.pdf");
});
```

#### Llamar desde el frontend (React)

```ts
// En CostingView.tsx o donde sea
const BRIDGE = import.meta.env.VITE_BRIDGE_URL;

const handlePrintCotizacion = async (id: string, engine: 'questpdf' | 'migradoc' = 'questpdf') => {
  const path = engine === 'migradoc'
    ? `/api/reports/cotizacion/${id}/migra`
    : `/api/reports/cotizacion/${id}`;

  const res  = await fetch(`${BRIDGE}${path}`);
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
};
```

---

## 5. Flujo con IA para diseñar reportes

Hay dos formas de que la IA ayude a crear un reporte nuevo. La segunda es la más poderosa.

---

### Opción 1 — Pedirle a Claude Code directamente

Dentro de la sesión de Claude Code (aquí mismo), describir el reporte:

> "Crea el reporte de **Facturas** usando MigraDoc.  
> La tabla `facturas` en Supabase tiene: `id`, `folio`, `cliente`, `fecha_emision`, `total`, `estatus`.  
> La tabla `factura_conceptos` tiene: `factura_id`, `descripcion`, `cantidad`, `precio`, `importe`.  
> Quiero: encabezado McVill, datos del cliente, tabla de conceptos, y bloque de totales con subtotal/IVA/total."

Claude Code entonces:
1. Lee el patrón de `ViajeroMigraDocument.cs` como referencia
2. Crea `FacturaModel.cs`, `FacturaService.cs`, `FacturaMigraDocument.cs`
3. Agrega los endpoints en `Program.cs`
4. Agrega el botón en el componente React

**Ventaja:** rápido, sin salir del IDE.  
**Desventaja:** solo genera código, no puede ver cómo se ve el PDF hasta que se compila y ejecuta.

---

### Opción 2 — Flujo con el Acelerador (diseño visual → código)

Este es el flujo más poderoso cuando ya tienes un **diseño existente** (PDF actual, mockup en papel, o diseño en Figma):

```
1. Tomar foto / captura del reporte físico o mockup
         ↓
2. Subir al Acelerador o directamente a Claude Code
         ↓
3. Descripción: "Este es el layout que quiero. 
   Genera el código MigraDoc / QuestPDF que reproduzca este diseño."
         ↓
4. Claude analiza el PDF visual:
   - Detecta secciones (encabezado, cuerpo, totales, firmas)
   - Identifica colores, fuentes aproximadas, alineaciones
   - Genera el código C# completo
         ↓
5. Revisión y ajuste fino en Claude Code
         ↓
6. Deploy a Railway
```

**Ejemplo de prompt para Opción 2:**

> "Tengo este formato de cotización [imagen/PDF adjunto].  
> Necesito reproducirlo en MigraDoc para el reporting-service de McVill.  
> El modelo ya existe en `CotizacionModel.cs`.  
> Genera `CotizacionMigraDocument.cs` que se vea lo más parecido posible a este diseño."

**Cuándo usar la Opción 2:**
- El cliente ya tiene un formato oficial en papel y lo quiere idéntico en digital
- Hay un PDF viejo de otro sistema que quieren migrar
- El diseño tiene secciones complejas (logos de cliente, firmas con líneas, cuadros de texto flotantes)

---

### Ciclo de mejora iterativa

Una vez que tienes la primera versión del reporte generada por IA:

```
1. Genera el PDF con el reporte nuevo
2. Toma captura o abre el PDF
3. "Este campo está muy grande", "falta la columna X", "el total debería estar a la derecha"
4. Claude Code ajusta el Document.cs
5. Build + deploy
6. Repetir hasta que esté perfecto (generalmente 2-3 iteraciones)
```

---

## 6. Referencia rápida

### Reportes actuales

| Reporte | Motor | Endpoint | Componente |
|---------|-------|----------|------------|
| Viajero Industrial | QuestPDF | `GET /api/reports/viajero/{id}` | ViajeroAdminPanel |
| Viajero Industrial | MigraDoc | `GET /api/reports/viajero/{id}/migra` | ViajeroAdminPanel (toggle) |
| Viajero Batch | QuestPDF | `POST /api/reports/viajero/print-selected` | ViajeroAdminPanel |
| Viajero Batch | MigraDoc | `POST /api/reports/viajero/migra/print-selected` | ViajeroAdminPanel (toggle) |
| Costos / Cotización | jsPDF | (frontend, descarga directa) | CostingView |
| Inventario | jsPDF | (frontend, descarga directa) | InventoryView |
| Nómina | jsPDF | (frontend, descarga directa) | PayrollView |

### Reportes en roadmap

| Reporte | Datos fuente | Motor sugerido | Prioridad |
|---------|-------------|----------------|-----------|
| Cotización formal | `cotizaciones` + `cotizacion_partidas` | MigraDoc | Alta |
| Orden de Compra | `purchase_orders` | MigraDoc | Alta |
| Factura / CFDI layout | `facturas` | QuestPDF | Media |
| Reporte de Asistencia | `time_attendance` | jsPDF | Baja |
| Estado de Cuenta cliente | `facturas` + pagos | QuestPDF | Media |

### Comandos útiles

```bash
# Correr el reporting-service local (para probar antes de deploy)
cd "Acelerador de Software/reporting-service"
dotnet run

# Acceder al Swagger local
http://localhost:5005/swagger

# Build rápido para verificar que compila
dotnet build --no-restore

# Ver logs de Railway en tiempo real
# (desde el dashboard Railway → Deployments → View Logs)
```

### Colores corporativos McVill (para reportes)

```
Azul oscuro encabezado:  #1a4a8a  /  RGB(26, 74, 138)
Azul medio subencabezado:#2563eb  /  RGB(37, 99, 235)
Azul claro texto header: #93C5FD  /  RGB(147, 197, 253)
Gris fondo fila alterna: #F1F5F9  /  RGB(241, 245, 249)
Gris borde tabla:        #CBD5E1  /  RGB(203, 213, 225)
Gris texto pie:          #94A3B8  /  RGB(148, 163, 184)
```

### Logo

- **Frontend (jsPDF):** `/public/mcvill-logo.png` → se carga con `reportUtils.loadLogo()`
- **Servidor (QuestPDF/MigraDoc):** `Assets/mcvill-logo.png` → se lee con `File.ReadAllBytes()`

---

*Documento generado por IA.AGUS · Claude Code · McVill ERP 2026*
