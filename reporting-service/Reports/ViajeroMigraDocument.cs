using MigraDoc.DocumentObjectModel;
using MigraDoc.DocumentObjectModel.Tables;
using MigraDoc.Rendering;
using McVill.ReportService.Models;
using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using Barcoder;
using Barcoder.Renderer.Image;

namespace McVill.ReportService.Reports;

/// <summary>
/// Genera el Viajero McVill/Industrial usando MigraDoc/PDFsharp (MIT, sin costo de licencia).
/// Rediseñado para emular el estilo premium de QuestPDF: colores, logo, código de barras y estructura de rejilla.
/// </summary>
public static class ViajeroMigraDocument
{
    // ── Punto de entrada ──────────────────────────────────────────────────────
    public static byte[] Generate(ViajeroModel model, string companyName = "ERP Industrial")
        => Generate(new List<ViajeroModel> { model }, companyName);

    public static byte[] Generate(List<ViajeroModel> models, string companyName = "ERP Industrial")
    {
        var tempFiles = new List<string>();
        try
        {
            var document = BuildDocument(models, companyName, tempFiles);
            var renderer = new PdfDocumentRenderer { Document = document };
            renderer.RenderDocument();

            using var ms = new MemoryStream();
            renderer.PdfDocument.Save(ms);
            return ms.ToArray();
        }
        finally
        {
            // Limpieza inmediata de archivos de código de barras temporales
            foreach (var file in tempFiles)
            {
                try
                {
                    if (File.Exists(file)) File.Delete(file);
                }
                catch { /* Evitar caídas en limpieza */ }
            }
        }
    }

    // ── Construcción del documento ────────────────────────────────────────────
    private static Document BuildDocument(List<ViajeroModel> models, string companyName, List<string> tempFiles)
    {
        var doc = new Document();
        doc.Info.Title  = $"Viajero de Producción — {companyName}";
        doc.Info.Author = $"{companyName} ERP / IA.AGUS";

        DefineStyles(doc);

        foreach (var model in models)
            AddViajeroSection(doc, model, companyName, tempFiles);

        return doc;
    }

    // ── Estilos ───────────────────────────────────────────────────────────────
    private static void DefineStyles(Document doc)
    {
        var normal = doc.Styles["Normal"]!;
        normal.Font.Name = "Arial";
        normal.Font.Size = 8;
    }

    // ── Una sección por viajero ───────────────────────────────────────────────
    private static void AddViajeroSection(Document doc, ViajeroModel m, string companyName, List<string> tempFiles)
    {
        var section = doc.AddSection();
        section.PageSetup.PageFormat   = PageFormat.Letter;
        section.PageSetup.Orientation  = Orientation.Portrait;
        section.PageSetup.TopMargin    = "1.2cm";
        section.PageSetup.BottomMargin = "1.5cm";
        section.PageSetup.LeftMargin   = "1.2cm";
        section.PageSetup.RightMargin  = "1.2cm";

        // Pie de página
        var ftPara = section.Footers.Primary.AddParagraph();
        ftPara.Format.Alignment = ParagraphAlignment.Center;
        ftPara.AddText($"{companyName.ToUpper()}  |  VIAJERO INDUSTRIAL  |  Página ");
        ftPara.AddPageField();
        ftPara.AddText(" de ");
        ftPara.AddNumPagesField();
        ftPara.Format.Font.Size  = 7;
        ftPara.Format.Font.Color = Color.FromRgb(100, 116, 139);

        AddHeader(section, m, companyName, tempFiles);
        AddInfoCard(section, m);

        if (m.Operaciones.Any())
            AddOperationsTable(section, m.Operaciones);

        if (m.Materiales.Any())
            AddMaterialsTable(section, m.Materiales);

        if (m.Componentes.Any())
            AddComponentsTable(section, m.Componentes);

        AddSignatures(section, m.Aprobaciones);
    }

    // ── Logo Path resolver ───────────────────────────────────────────────────
    private static string? GetLogoPath()
    {
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, "Assets", "mcvill-logo.png");
            if (File.Exists(path)) return path;

            path = Path.Combine(AppContext.BaseDirectory, "Assets", "logo.png");
            if (File.Exists(path)) return path;
        }
        catch { }
        return null;
    }

    // ── Generador de Código de Barras en archivo temporal ──────────────────
    private static string? GenerateBarcodeImage(string? data, List<string> tempFiles)
    {
        if (string.IsNullOrWhiteSpace(data)) return null;
        try
        {
            var barcode = Barcoder.Code128.Code128Encoder.Encode(data.Length > 40 ? data[..40] : data);
            var renderer = new Barcoder.Renderer.Image.ImageRenderer();
            using var ms = new MemoryStream();
            renderer.Render(barcode, ms);

            var tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + "_barcode.png");
            File.WriteAllBytes(tempFile, ms.ToArray());
            tempFiles.Add(tempFile);
            return tempFile;
        }
        catch
        {
            return null;
        }
    }

    // ── Encabezado Estilo Premium (QuestPDF clone) ──────────────────────────
    private static void AddHeader(Section section, ViajeroModel m, string companyName, List<string> tempFiles)
    {
        var table = section.AddTable();
        table.Borders.Width = 0;
        table.Borders.Bottom.Width = 1.5;
        table.Borders.Bottom.Color = Color.FromRgb(30, 64, 175); // Blue-700 (#1e40af)
        table.LeftPadding   = Unit.FromCentimeter(0);
        table.RightPadding  = Unit.FromCentimeter(0);
        table.BottomPadding = Unit.FromCentimeter(0.15);

        // 3 Columnas: Izquierda (Logo/Empresa), Centro (Título y Barcode), Derecha (Info de Impresión)
        table.AddColumn("5.0cm");
        table.AddColumn("8.6cm");
        table.AddColumn("5.0cm");

        var row = table.AddRow();
        row.VerticalAlignment = VerticalAlignment.Center;

        // 1. CELDA IZQUIERDA: Logo o Nombre Empresa
        var cellLeft = row.Cells[0];
        var logoPath = GetLogoPath();
        if (logoPath != null)
        {
            try
            {
                var img = cellLeft.AddImage(logoPath);
                img.Height = "1.0cm";
                img.LockAspectRatio = true;
            }
            catch
            {
                var pFallback = cellLeft.AddParagraph(companyName.ToUpper());
                pFallback.Format.Font.Bold = true;
                pFallback.Format.Font.Size = 10;
                pFallback.Format.Font.Color = Color.FromRgb(30, 64, 175);
            }
        }
        else
        {
            var pFallback = cellLeft.AddParagraph(companyName.ToUpper());
            pFallback.Format.Font.Bold = true;
            pFallback.Format.Font.Size = 10;
            pFallback.Format.Font.Color = Color.FromRgb(30, 64, 175);
        }

        // 2. CELDA CENTRAL: Título + Job ID + Código de Barras
        var cellCenter = row.Cells[1];
        var pTitle = cellCenter.AddParagraph("VIAJERO INDUSTRIAL");
        pTitle.Format.Font.Bold  = true;
        pTitle.Format.Font.Size  = 13;
        pTitle.Format.Font.Color = Color.FromRgb(0, 0, 0);
        pTitle.Format.Alignment  = ParagraphAlignment.Center;

        var pJob = cellCenter.AddParagraph($"JOB: {(m.JobID ?? "N/A").ToUpper()}");
        pJob.Format.Font.Bold  = true;
        pJob.Format.Font.Size  = 8.5;
        pJob.Format.Font.Color = Color.FromRgb(0, 0, 0);
        pJob.Format.Alignment  = ParagraphAlignment.Center;

        // Render e insertar barcode
        var barcodePath = GenerateBarcodeImage(m.JobID, tempFiles);
        if (barcodePath != null)
        {
            var pBar = cellCenter.AddParagraph();
            pBar.Format.Alignment = ParagraphAlignment.Center;
            pBar.Format.SpaceBefore = "1pt";
            
            var imgBar = pBar.AddImage(barcodePath);
            imgBar.Height = "0.7cm";
            imgBar.Width = "3.2cm";

            var pBarText = cellCenter.AddParagraph(m.JobID ?? "—");
            pBarText.Format.Font.Size = 6.5;
            pBarText.Format.Font.Color = Color.FromRgb(51, 51, 51);
            pBarText.Format.Alignment = ParagraphAlignment.Center;
        }

        // 3. CELDA DERECHA: Metadatos e Impresión
        var cellRight = row.Cells[2];
        
        var pPrint = cellRight.AddParagraph();
        pPrint.Format.Alignment = ParagraphAlignment.Right;
        pPrint.Format.Font.Size = 7;
        var sLabel = pPrint.AddFormattedText("FECHA DE IMPRESIÓN: ");
        sLabel.Bold = true;
        sLabel.Font.Color = Color.FromRgb(0, 0, 0);
        var sDate = pPrint.AddFormattedText(DateTime.Now.ToString("dd-MMM-yy HH:mm", new System.Globalization.CultureInfo("es-MX")));
        sDate.Font.Color = Color.FromRgb(51, 51, 51);

        var pPage = cellRight.AddParagraph();
        pPage.Format.Alignment = ParagraphAlignment.Right;
        pPage.Format.Font.Size = 7;
        pPage.AddText("Página ");
        pPage.AddPageField();
        pPage.AddText(" de ");
        pPage.AddNumPagesField();
        pPage.Format.Font.Color = Color.FromRgb(51, 51, 51);

        if (m.FechaOrden.HasValue)
        {
            var pOrdDate = cellRight.AddParagraph(m.FechaOrden.Value.ToString("dd-MMM-yyyy"));
            pOrdDate.Format.Alignment = ParagraphAlignment.Right;
            pOrdDate.Format.Font.Size = 7;
            pOrdDate.Format.Font.Color = Color.FromRgb(51, 51, 51);
        }

        if (!string.IsNullOrWhiteSpace(m.NumeroParte))
        {
            var pPartNum = cellRight.AddParagraph(m.NumeroParte);
            pPartNum.Format.Alignment = ParagraphAlignment.Right;
            pPartNum.Format.Font.Size = 7;
            pPartNum.Format.Font.Bold = true;
            pPartNum.Format.Font.Color = Color.FromRgb(0, 0, 0);
        }

        section.AddParagraph().Format.SpaceAfter = "0.2cm";
    }

    // ── Ficha Informativa Compacta (Rejilla QuestPDF Clone con color #eff6ff) ─
    private static void AddInfoCard(Section section, ViajeroModel m)
    {
        var table = section.AddTable();
        table.Borders.Color  = Color.FromRgb(191, 219, 254); // Blue-200 (#bfdbfe)
        table.Borders.Width  = 0.75;
        table.LeftPadding    = Unit.FromCentimeter(0.25);
        table.RightPadding   = Unit.FromCentimeter(0.25);
        table.TopPadding     = Unit.FromPoint(3);
        table.BottomPadding  = Unit.FromPoint(3);

        // 4 Columnas perfectas
        table.AddColumn("2.8cm");
        table.AddColumn("6.5cm");
        table.AddColumn("2.8cm");
        table.AddColumn("6.5cm");

        void Cell(Row r, int colLabel, int colVal, string label, string? value, bool bold = false, string? subVal = null)
        {
            // Fondo de la celda de etiqueta y valor a azul claro
            r.Cells[colLabel].Shading.Color = Color.FromRgb(239, 246, 255); // Blue-50 (#eff6ff)
            r.Cells[colVal].Shading.Color   = Color.FromRgb(239, 246, 255);

            var pL = r.Cells[colLabel].AddParagraph(label.ToUpper());
            pL.Format.Font.Bold  = true;
            pL.Format.Font.Size  = 7;
            pL.Format.Font.Color = Color.FromRgb(30, 64, 175); // Blue-700 (#1e40af)

            var pV = r.Cells[colVal].AddParagraph();
            var valSpan = pV.AddFormattedText(string.IsNullOrWhiteSpace(value) ? "—" : value);
            valSpan.Font.Size = 7.5;
            valSpan.Font.Color = Color.FromRgb(15, 23, 42); // #0f172a
            if (bold) valSpan.Bold = true;

            if (!string.IsNullOrWhiteSpace(subVal))
            {
                pV.AddLineBreak();
                var sSpan = pV.AddFormattedText(subVal);
                sSpan.Font.Size = 6.5;
                sSpan.Font.Color = Color.FromRgb(100, 116, 139); // Slate-500
                sSpan.Italic = true;
            }
        }

        // Fila 1: Identificación Crítica
        var r1 = table.AddRow(); r1.Height = "0.55cm"; r1.VerticalAlignment = VerticalAlignment.Center;
        Cell(r1, 0, 1, "PARTE:", m.NumeroParte, bold: true);
        Cell(r1, 2, 3, "REVISIÓN:", m.Revision, bold: true);

        // Fila 2: Cantidad y Fechas
        var r2 = table.AddRow(); r2.Height = "0.55cm"; r2.VerticalAlignment = VerticalAlignment.Center;
        Cell(r2, 0, 1, "CANT. ORDEN:", m.CantidadOrden.HasValue ? $"{m.CantidadOrden:N0} / PZ" : "—", bold: true);
        Cell(r2, 2, 3, "FECHA ORDEN:", m.FechaOrden?.ToString("dd-MMM-yyyy") ?? "—", bold: true);

        // Fila 3: Cliente
        var r3 = table.AddRow(); r3.Height = "0.55cm"; r3.VerticalAlignment = VerticalAlignment.Center;
        Cell(r3, 0, 1, "CLIENTE:", m.Cliente, bold: true);
        Cell(r3, 2, 3, "DIBUJO:", string.IsNullOrWhiteSpace(m.Dibujo) ? m.NumeroParte : m.Dibujo, bold: true);

        // Fila 4: OC
        var r4 = table.AddRow(); r4.Height = "0.55cm"; r4.VerticalAlignment = VerticalAlignment.Center;
        Cell(r4, 0, 1, "OC CLIENTE:", m.OCCliente, bold: true);
        Cell(r4, 2, 3, "ENTREGA:", m.FechaEntrega?.ToString("dd-MMM-yyyy") ?? "—", bold: true);

        // Fila 5: Ensamble Padre / TL
        var r5 = table.AddRow(); r5.Height = "0.75cm"; r5.VerticalAlignment = VerticalAlignment.Center;
        var padre = string.IsNullOrEmpty(m.EnsamblePadre) ? "N/A" : m.EnsamblePadre;
        Cell(r5, 0, 1, "E. PADRE:", padre, bold: true, subVal: m.EnsamblePadreDesc);
        var tl = string.IsNullOrEmpty(m.EnsambleTL) || m.EnsambleTL == "N/A" ? "TOP LEVEL" : m.EnsambleTL;
        Cell(r5, 2, 3, "E. T/L:", tl, bold: true, subVal: m.EnsambleTLDesc);

        // Fila 6: Línea y Horas
        var r6 = table.AddRow(); r6.Height = "0.55cm"; r6.VerticalAlignment = VerticalAlignment.Center;
        Cell(r6, 0, 1, "LÍNEA:", m.Linea ?? "ESTÁNDAR", bold: true);
        Cell(r6, 2, 3, "HORAS EST.:", m.HorasEstTotales.HasValue ? $"{m.HorasEstTotales:N2} HRS" : "—", bold: true);

        // Fila 7: Control
        var r7 = table.AddRow(); r7.Height = "0.55cm"; r7.VerticalAlignment = VerticalAlignment.Center;
        Cell(r7, 0, 1, "JOB ID:", m.JobID, bold: true);
        Cell(r7, 2, 3, "COTIZACIÓN:", m.Cotizacion, bold: true);

        // Fila 8: Estatus
        var r8 = table.AddRow(); r8.Height = "0.55cm"; r8.VerticalAlignment = VerticalAlignment.Center;
        Cell(r8, 0, 1, "CANT. FAB.:", m.CantFabricada.HasValue ? $"{m.CantFabricada:N0}" : "0", bold: true);
        Cell(r8, 2, 3, "ESTATUS:", "PENDIENTE", bold: true);

        // Fila 9: Descripción Larga (Merged)
        var rDesc = table.AddRow();
        rDesc.Height = "0.65cm";
        rDesc.VerticalAlignment = VerticalAlignment.Center;
        rDesc.Cells[0].MergeRight = 3;
        rDesc.Cells[0].Shading.Color = Color.FromRgb(239, 246, 255);

        var pDesc = rDesc.Cells[0].AddParagraph();
        var lblSpan = pDesc.AddFormattedText("DESCRIPCIÓN: ");
        lblSpan.Bold = true;
        lblSpan.Font.Size = 7;
        lblSpan.Font.Color = Color.FromRgb(30, 64, 175);
        
        var valSpan = pDesc.AddFormattedText(m.Descripcion ?? "");
        valSpan.Bold = true;
        valSpan.Font.Size = 7.5;
        valSpan.Font.Color = Color.FromRgb(15, 23, 42);

        section.AddParagraph().Format.SpaceAfter = "0.2cm";

        // Notas en Caja Amber (si existen)
        if (!string.IsNullOrWhiteSpace(m.Notas))
        {
            var tblNotes = section.AddTable();
            tblNotes.Borders.Color = Color.FromRgb(253, 230, 138); // Amber-200 (#fde68a)
            tblNotes.Borders.Width = 0.75;
            tblNotes.LeftPadding = Unit.FromCentimeter(0.2);
            tblNotes.RightPadding = Unit.FromCentimeter(0.2);
            tblNotes.TopPadding = Unit.FromPoint(4);
            tblNotes.BottomPadding = Unit.FromPoint(4);
            tblNotes.AddColumn("18.6cm");

            var rNotes = tblNotes.AddRow();
            rNotes.Shading.Color = Color.FromRgb(255, 251, 235); // Amber-50 (#fffbeb)
            
            var pNotes = rNotes.Cells[0].AddParagraph();
            var lblN = pNotes.AddFormattedText("NOTAS: ");
            lblN.Bold = true;
            lblN.Font.Size = 7.5;
            lblN.Font.Color = Color.FromRgb(217, 119, 6); // Amber-600

            var valN = pNotes.AddFormattedText(m.Notas);
            valN.Bold = true;
            valN.Font.Size = 7.5;
            valN.Font.Color = Color.FromRgb(146, 64, 14); // Amber-800

            section.AddParagraph().Format.SpaceAfter = "0.2cm";
        }
    }

    // ── Tabla de operaciones ──────────────────────────────────────────────────
    private static void AddOperationsTable(Section section, List<OperacionModel> ops)
    {
        AddSectionTitle(section, "RUTA DE PROCESO");

        var table = CreateDataTable(section);
        table.AddColumn("1.2cm"); // SEQ
        table.AddColumn("3.3cm"); // CENTRO TRAB
        table.AddColumn("8.1cm"); // INSTRUCCIONES DETALLADAS DE OPERACIÓN
        table.AddColumn("2.0cm"); // Configurar
        table.AddColumn("2.0cm"); // Tasa Proceso
        table.AddColumn("2.0cm"); // Minutos Est.

        AddTableHeader(table, new[] { "SEQ", "CENTRO TRAB", "INSTRUCCIONES DETALLADAS DE OPERACIÓN", "CONFIGURAR", "TASA PROCESO", "MINUTOS EST." });

        foreach (var op in ops)
        {
            var row = table.AddRow();
            row.Height = "0.55cm";
            row.VerticalAlignment = VerticalAlignment.Center;
            row.Borders.Bottom.Width = 0.5;
            row.Borders.Bottom.Color = Color.FromRgb(191, 219, 254); // Blue-200

            SetCell(row, 0, op.Orden?.ToString() ?? "", ParagraphAlignment.Center);
            SetCell(row, 1, op.CentroTrabajo, ParagraphAlignment.Center);
            
            // Descripción en negrita oscura
            var pDetail = row.Cells[2].AddParagraph(op.NombreOperacion ?? "");
            pDetail.Format.Font.Size = 7.5;
            pDetail.Format.Font.Color = Color.FromRgb(15, 23, 42);

            SetCell(row, 3, "—", ParagraphAlignment.Center);
            SetCell(row, 4, "—", ParagraphAlignment.Center);
            SetCell(row, 5, op.TiempoEstimado.HasValue ? $"{op.TiempoEstimado * 60:N0} MIN" : "—", ParagraphAlignment.Center);
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ── Tabla de materiales ───────────────────────────────────────────────────
    private static void AddMaterialsTable(Section section, List<MaterialModel> mats)
    {
        AddSectionTitle(section, "MATERIALES / RECOGIDAS");

        var table = CreateDataTable(section);
        table.AddColumn("2.5cm"); // Clave
        table.AddColumn("6.6cm"); // Descripción
        table.AddColumn("1.5cm"); // Cant.
        table.AddColumn("1.5cm"); // U/M
        table.AddColumn("2.0cm"); // Ubicación
        table.AddColumn("2.5cm"); // Requisición
        table.AddColumn("2.0cm"); // Vencimiento

        AddTableHeader(table, new[] { "CLAVE", "DESCRIPCIÓN", "CANT.", "U/M", "UBICACIÓN", "REQUISICIÓN", "VENCIMIENTO" });

        foreach (var mat in mats)
        {
            var row = table.AddRow();
            row.Height = "0.55cm";
            row.VerticalAlignment = VerticalAlignment.Center;
            row.Borders.Bottom.Width = 0.5;
            row.Borders.Bottom.Color = Color.FromRgb(191, 219, 254);

            SetCell(row, 0, mat.ClaveMaterial);
            SetCell(row, 1, mat.Descripcion);
            SetCell(row, 2, mat.Cantidad?.ToString("0.##") ?? "—", ParagraphAlignment.Center);
            SetCell(row, 3, mat.Unidad, ParagraphAlignment.Center);
            SetCell(row, 4, mat.Ubicacion ?? "—", ParagraphAlignment.Center);
            SetCell(row, 5, mat.Requisicion ?? "—", ParagraphAlignment.Center);
            SetCell(row, 6, mat.Vencimiento?.ToString("dd-MMM-yyyy") ?? "—", ParagraphAlignment.Center);
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ── Tabla de componentes ──────────────────────────────────────────────────
    private static void AddComponentsTable(Section section, List<ComponenteModel> comps)
    {
        AddSectionTitle(section, "COMPONENTES (BOM)");

        var table = CreateDataTable(section);
        table.AddColumn("3.5cm"); // Job ID
        table.AddColumn("7.1cm"); // Descripción
        table.AddColumn("2.0cm"); // Cantidad
        table.AddColumn("3.0cm"); // Ini Prg
        table.AddColumn("3.0cm"); // Fin Prg

        AddTableHeader(table, new[] { "OT / SUB-ORDEN\nPARTE — DESCRIPCIÓN", "DESCRIPCIÓN DE COMPONENTE", "CANT. FABRICAR", "INICIO PRG", "FIN PRG" });

        foreach (var c in comps)
        {
            var row = table.AddRow();
            row.Height = "0.55cm";
            row.VerticalAlignment = VerticalAlignment.Center;
            row.Borders.Bottom.Width = 0.5;
            row.Borders.Bottom.Color = Color.FromRgb(191, 219, 254);

            SetCell(row, 0, c.JobID, ParagraphAlignment.Center);
            SetCell(row, 1, c.Descripcion);
            SetCell(row, 2, c.Cantidad.HasValue ? $"{c.Cantidad:N2} / PZ" : "—", ParagraphAlignment.Center);
            SetCell(row, 3, c.InicioPrg?.ToString("dd-MMM-yyyy") ?? "—", ParagraphAlignment.Center);
            SetCell(row, 4, c.FinPrg?.ToString("dd-MMM-yyyy") ?? "—", ParagraphAlignment.Center);
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ── Firmas de aprobación Estilo Premium ──────────────────────────────────
    private static void AddSignatures(Section section, AprobacionModel aprov)
    {
        section.AddParagraph().Format.SpaceAfter = "0.5cm";
        
        var table = section.AddTable();
        table.Borders.Width = 0;
        table.AddColumn("5.8cm");
        table.AddColumn("0.6cm");
        table.AddColumn("5.8cm");
        table.AddColumn("0.6cm");
        table.AddColumn("5.8cm");

        var row = table.AddRow();
        row.Height = "1.6cm";
        row.VerticalAlignment = VerticalAlignment.Bottom;

        void AddSig(int col, string? name, string role)
        {
            var cell = row.Cells[col];
            cell.Borders.Top.Width = 0.75;
            cell.Borders.Top.Color = Color.FromRgb(30, 64, 175); // Blue-700 (#1e40af)

            var pRole = cell.AddParagraph(role.ToUpper());
            pRole.Format.Font.Bold = true;
            pRole.Format.Font.Size  = 7.5;
            pRole.Format.Font.Color = Color.FromRgb(30, 64, 175);
            pRole.Format.Alignment  = ParagraphAlignment.Center;
            pRole.Format.SpaceBefore = Unit.FromPoint(4);

            var pName = cell.AddParagraph(string.IsNullOrWhiteSpace(name) ? "—" : name);
            pName.Format.Font.Size = 6.5;
            pName.Format.Font.Color = Color.FromRgb(100, 116, 139);
            pName.Format.Alignment = ParagraphAlignment.Center;
        }

        AddSig(0, aprov.Ingenieria,  "INGENIERÍA / DISEÑO");
        AddSig(2, aprov.Produccion,  "PRODUCCIÓN / OPERACIONES");
        AddSig(4, aprov.Calidad,     "CALIDAD / INSPECCIÓN");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static Table CreateDataTable(Section section)
    {
        var table = section.AddTable();
        table.Borders.Color = Color.FromRgb(191, 219, 254); // Blue-200 (#bfdbfe)
        table.Borders.Width = 0.5;
        table.LeftPadding   = Unit.FromPoint(4);
        table.RightPadding  = Unit.FromPoint(4);
        table.TopPadding    = Unit.FromPoint(4);
        table.BottomPadding = Unit.FromPoint(4);
        return table;
    }

    private static void AddSectionTitle(Section section, string title)
    {
        var table = section.AddTable();
        table.Borders.Width = 0;
        table.AddColumn("18.6cm"); // Ancho completo imprimible

        var row = table.AddRow();
        row.Height = "0.6cm";
        row.VerticalAlignment = VerticalAlignment.Center;

        var cell = row.Cells[0];
        cell.Borders.Top.Width = 1.5;
        cell.Borders.Top.Color = Color.FromRgb(30, 64, 175); // Blue-700
        cell.Borders.Bottom.Width = 1.0;
        cell.Borders.Bottom.Color = Color.FromRgb(219, 234, 254); // Blue-50

        var p = cell.AddParagraph(title.ToUpper());
        p.Format.Font.Bold  = true;
        p.Format.Font.Size  = 9.5;
        p.Format.Font.Color = Color.FromRgb(30, 64, 175); // Blue-700
        p.Format.Alignment  = ParagraphAlignment.Center;
        p.Format.SpaceBefore = Unit.FromPoint(3);
        p.Format.SpaceAfter = Unit.FromPoint(3);

        section.AddParagraph().Format.SpaceAfter = "0.2cm";
    }

    private static void AddTableHeader(Table table, string[] headers)
    {
        var row = table.AddRow();
        row.Shading.Color     = Color.FromRgb(30, 64, 175); // Blue-700 (#1e40af)
        row.Height            = "0.55cm";
        row.VerticalAlignment = VerticalAlignment.Center;
        row.HeadingFormat     = true;

        for (int i = 0; i < headers.Length; i++)
        {
            var p = row.Cells[i].AddParagraph(headers[i]);
            p.Format.Font.Bold  = true;
            p.Format.Font.Size  = 6.5;
            p.Format.Font.Color = Color.FromRgb(255, 255, 255);
            p.Format.Alignment  = ParagraphAlignment.Center;
        }
    }

    private static void SetCell(Row row, int col, string? text,
        ParagraphAlignment align = ParagraphAlignment.Left)
    {
        var p = row.Cells[col].AddParagraph(text ?? "");
        p.Format.Font.Size = 7.5;
        p.Format.Font.Color = Color.FromRgb(15, 23, 42); // #0f172a
        p.Format.Alignment = align;
    }
}
