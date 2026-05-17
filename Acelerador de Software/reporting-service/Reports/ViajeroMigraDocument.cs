using MigraDoc.DocumentObjectModel;
using MigraDoc.DocumentObjectModel.Tables;
using MigraDoc.Rendering;
using McVill.ReportService.Models;
using Barcoder;
using Barcoder.Renderer.Image;

namespace McVill.ReportService.Reports;

/// <summary>
/// Genera el Viajero McVill con MigraDoc/PDFsharp.
/// Feature parity con ViajeroDocument (QuestPDF):
///   • Logo McVill  • Barcode Code128 (JobID, centros, ubicaciones, requisiciones)
///   • Header 3 cols  • Ficha 4×5  • Instrucciones multilínea  • Notas amarillas
///   • Parámetros de material (partes/barra, piezas/por)
/// </summary>
public static class ViajeroMigraDocument
{
    // ── Colores base (espejo del QuestPDF) ──────────────────────────────
    static readonly Color Blue700  = Color.FromRgb(30,  64,  175);
    static readonly Color Blue200  = Color.FromRgb(191, 219, 254);
    static readonly Color Blue50   = Color.FromRgb(239, 246, 255);
    static readonly Color Slate800 = Color.FromRgb(15,  23,  42);
    static readonly Color Slate500 = Color.FromRgb(100, 116, 139);
    static readonly Color Amber300 = Color.FromRgb(252, 211, 77);
    static readonly Color Amber50  = Color.FromRgb(255, 251, 235);
    static readonly Color White    = Color.FromRgb(255, 255, 255);
    static readonly Color LightGray= Color.FromRgb(203, 213, 225);

    // ── Logo (cacheado) ─────────────────────────────────────────────────
    static byte[]? _logoBytes;
    static string?  _logoTmpPath;

    static string? GetLogoPath()
    {
        if (_logoTmpPath != null && File.Exists(_logoTmpPath)) return _logoTmpPath;
        try
        {
            var src = Path.Combine(AppContext.BaseDirectory, "Assets", "mcvill-logo.png");
            if (!File.Exists(src)) return null;
            _logoBytes   = File.ReadAllBytes(src);
            _logoTmpPath = Path.GetTempFileName() + ".png";
            File.WriteAllBytes(_logoTmpPath, _logoBytes);
            return _logoTmpPath;
        }
        catch { return null; }
    }

    // ── Barcode → temp PNG path ─────────────────────────────────────────
    static string? BarcodeToTempPng(string? data, int heightPx = 28)
    {
        if (string.IsNullOrWhiteSpace(data)) return null;
        try
        {
            var encoded = Barcoder.Code128.Code128Encoder.Encode(
                data.Length > 40 ? data[..40] : data);
            var renderer = new ImageRenderer(new ImageRendererOptions { BarHeightFor1DBarcode = heightPx });
            using var ms = new MemoryStream();
            renderer.Render(encoded, ms);
            var tmp = Path.GetTempFileName() + ".png";
            File.WriteAllBytes(tmp, ms.ToArray());
            return tmp;
        }
        catch { return null; }
    }

    // ── Punto de entrada ────────────────────────────────────────────────
    public static byte[] Generate(ViajeroModel model)   => Generate([model]);
    public static byte[] Generate(List<ViajeroModel> models)
    {
        var document = BuildDocument(models);
        var renderer = new PdfDocumentRenderer { Document = document };
        renderer.RenderDocument();
        using var ms = new MemoryStream();
        renderer.PdfDocument.Save(ms);
        return ms.ToArray();
    }

    // ── Estilos globales ────────────────────────────────────────────────
    static Document BuildDocument(List<ViajeroModel> models)
    {
        var doc = new Document();
        doc.Info.Title  = "Viajero de Producción — McVill SA de CV";
        doc.Info.Author = "McVill ERP / IA.AGUS";

        var normal = doc.Styles["Normal"]!;
        normal.Font.Name = "Arial";
        normal.Font.Size = 8;

        foreach (var m in models)
            AddViajeroSection(doc, m);

        return doc;
    }

    // ── Una sección por viajero ─────────────────────────────────────────
    static void AddViajeroSection(Document doc, ViajeroModel m)
    {
        var section = doc.AddSection();
        section.PageSetup.PageFormat   = PageFormat.Letter;
        section.PageSetup.Orientation  = Orientation.Portrait;
        section.PageSetup.TopMargin    = "1.8cm";
        section.PageSetup.BottomMargin = "1.5cm";
        section.PageSetup.LeftMargin   = "1.2cm";
        section.PageSetup.RightMargin  = "1.2cm";

        AddFooter(section, m);
        AddHeader(section, m);
        AddJobDetails(section, m);

        // RUTA
        AddSectionTitle(section, "RUTA DE PROCESO");
        if (m.Operaciones.Any())
            AddOperationsTable(section, m.Operaciones);
        else
            AddEmptyNote(section, "Sin operaciones registradas");

        // MATERIALES
        AddSectionTitle(section, "MATERIALES / RECOGIDAS");
        if (m.Materiales.Any())
            AddMaterialsTable(section, m.Materiales);
        else
            AddEmptyNote(section, "Sin materiales registrados");

        // COMPONENTES BOM
        if (m.Componentes.Any())
        {
            AddSectionTitle(section, "COMPONENTES (BOM)");
            AddComponentsTable(section, m.Componentes);
        }

        AddSignatures(section, m.Aprobaciones);
    }

    // ═══════════════════════════════════════════════════════════
    //  HEADER (3 columnas: Logo | Título+Barcode | Fecha+Info)
    // ═══════════════════════════════════════════════════════════
    static void AddHeader(Section section, ViajeroModel m)
    {
        var tbl = section.AddTable();
        tbl.Borders.Width = 0;
        tbl.AddColumn("4.5cm");   // Logo
        tbl.AddColumn("9.5cm");   // Centro
        tbl.AddColumn("4.5cm");   // Derecha

        var row = tbl.AddRow();
        row.VerticalAlignment = VerticalAlignment.Center;
        row.Height = "2.2cm";

        // ── Izquierda: logo ──
        var logoPath = GetLogoPath();
        if (logoPath != null)
        {
            var img = row.Cells[0].AddImage(logoPath);
            img.Width  = "3.5cm";
        }
        else
        {
            var p = row.Cells[0].AddParagraph("MCVILL SA DE CV");
            p.Format.Font.Bold = true;
            p.Format.Font.Size = 10;
        }

        // ── Centro: título + job + barcode ──
        row.Cells[1].Format.Alignment = ParagraphAlignment.Center;
        var title = row.Cells[1].AddParagraph("VIAJERO INDUSTRIAL");
        title.Format.Font.Bold = true;
        title.Format.Font.Size = 15;

        var jobPara = row.Cells[1].AddParagraph($"JOB: {(m.JobID ?? "N/A").ToUpper()}");
        jobPara.Format.Font.Bold = true;
        jobPara.Format.Font.Size = 10;
        jobPara.Format.Alignment = ParagraphAlignment.Center;

        var barPath = BarcodeToTempPng(m.JobID, 24);
        if (barPath != null)
        {
            var bImg = row.Cells[1].AddImage(barPath);
            bImg.Width = "4cm";
        }

        var jobIdSub = row.Cells[1].AddParagraph(m.JobID ?? "—");
        jobIdSub.Format.Font.Size  = 6;
        jobIdSub.Format.Font.Color = Slate500;
        jobIdSub.Format.Alignment  = ParagraphAlignment.Center;

        // ── Derecha: fechas + parte ──
        row.Cells[2].Format.Alignment = ParagraphAlignment.Right;
        var culture = new System.Globalization.CultureInfo("es-MX");

        var pFecha = row.Cells[2].AddParagraph(
            $"FECHA IMPRESIÓN: {DateTime.Now.ToString("dd-MMM-yy HH:mm", culture)}");
        pFecha.Format.Font.Size  = 7;
        pFecha.Format.Alignment  = ParagraphAlignment.Right;

        if (m.FechaOrden.HasValue)
        {
            var pOrd = row.Cells[2].AddParagraph(m.FechaOrden.Value.ToString("dd-MMM-yyyy", culture));
            pOrd.Format.Font.Size = 7;
            pOrd.Format.Alignment = ParagraphAlignment.Right;
        }

        if (!string.IsNullOrWhiteSpace(m.NumeroParte))
        {
            var pParte = row.Cells[2].AddParagraph(m.NumeroParte);
            pParte.Format.Font.Bold = true;
            pParte.Format.Font.Size = 7;
            pParte.Format.Alignment = ParagraphAlignment.Right;
        }

        // Línea azul separadora
        var sep = section.AddTable();
        sep.Borders.Width = 0;
        sep.AddColumn("18.5cm");
        var sepRow = sep.AddRow();
        sepRow.Height = "0.1cm";
        sepRow.Borders.Bottom.Width = 1.5;
        sepRow.Borders.Bottom.Color = Blue700;

        section.AddParagraph().Format.SpaceAfter = "0.15cm";
    }

    // ═══════════════════════════════════════════════════════════
    //  FICHA DEL JOB (4 columnas × 5 filas + descripción)
    // ═══════════════════════════════════════════════════════════
    static void AddJobDetails(Section section, ViajeroModel m)
    {
        var culture = new System.Globalization.CultureInfo("es-MX");

        var tbl = section.AddTable();
        tbl.Borders.Color  = Blue200;
        tbl.Borders.Width  = 0.5;
        tbl.LeftPadding    = Unit.FromPoint(4);
        tbl.RightPadding   = Unit.FromPoint(4);
        tbl.TopPadding     = Unit.FromPoint(3);
        tbl.BottomPadding  = Unit.FromPoint(3);

        // 4 columnas: label | value | label | value
        tbl.AddColumn("2.5cm");
        tbl.AddColumn("6.5cm");
        tbl.AddColumn("2.5cm");
        tbl.AddColumn("6.5cm");

        void DataRow(string l1, string? v1, string l2, string? v2, bool bold = true)
        {
            var row = tbl.AddRow();
            row.Height = "0.55cm";
            row.VerticalAlignment = VerticalAlignment.Center;
            row.Shading.Color = Blue50;

            LabelCell(row.Cells[0], l1);
            ValueCell(row.Cells[1], v1, bold);
            LabelCell(row.Cells[2], l2);
            ValueCell(row.Cells[3], v2, bold);
        }

        // FILA 1
        DataRow("PARTE:",      m.NumeroParte,
                "REVISIÓN:",   m.Revision);
        // FILA 2
        DataRow("CANT. ORDEN:", m.CantidadOrden.HasValue ? $"{m.CantidadOrden:N0} pz" : "—",
                "FECHA ORDEN:", m.FechaOrden?.ToString("dd-MMM-yyyy", culture) ?? "—");
        // FILA 3
        DataRow("CLIENTE:",    m.Cliente,
                "OC CLIENTE:", m.OCCliente);
        // FILA 4
        var padre = string.IsNullOrEmpty(m.EnsamblePadre) ? "N/A" : m.EnsamblePadre;
        var tl    = string.IsNullOrEmpty(m.EnsambleTL) || m.EnsambleTL == "N/A" ? "TOP LEVEL" : m.EnsambleTL;
        DataRow("E. PADRE:",   padre,
                "E. T/L:",     tl);
        // FILA 5
        DataRow("HORAS EST.:", m.HorasEstTotales.HasValue ? $"{m.HorasEstTotales:N2} hrs" : "—",
                "ENTREGA:",    m.FechaEntrega?.ToString("dd-MMM-yyyy", culture) ?? "—");
        // FILA 6 — descripción completa
        var descRow = tbl.AddRow();
        descRow.Height = "0.55cm";
        descRow.VerticalAlignment = VerticalAlignment.Center;
        descRow.Shading.Color = Blue50;
        descRow.Cells[0].MergeRight = 3;
        LabelCell(descRow.Cells[0], $"DESCRIPCIÓN:  {m.Descripcion ?? "—"}");

        // Notas (fondo amarillo)
        if (!string.IsNullOrWhiteSpace(m.Notas))
        {
            var notaTbl = section.AddTable();
            notaTbl.Borders.Color = Color.FromRgb(253, 230, 138); // Amber-200
            notaTbl.Borders.Width = 0.5;
            notaTbl.AddColumn("18.5cm");
            var notaRow = notaTbl.AddRow();
            notaRow.Shading.Color = Amber50;
            notaRow.Height = "0.6cm";
            notaRow.VerticalAlignment = VerticalAlignment.Center;
            var pN = notaRow.Cells[0].AddParagraph();
            pN.AddFormattedText("NOTAS: ", TextFormat.Bold);
            pN.AddText(m.Notas);
            pN.Format.Font.Size = 7.5;
            pN.Format.LeftIndent = "0.2cm";
        }

        section.AddParagraph().Format.SpaceAfter = "0.2cm";
    }

    // ═══════════════════════════════════════════════════════════
    //  RUTA DE PROCESO
    // ═══════════════════════════════════════════════════════════
    static void AddOperationsTable(Section section, List<OperacionModel> ops)
    {
        var tbl = CreateDataTable(section);
        tbl.AddColumn("1cm");    // SEQ
        tbl.AddColumn("2.5cm");  // Centro (+ barcode)
        tbl.AddColumn("7.5cm");  // Instrucciones
        tbl.AddColumn("1.5cm");  // Configurar
        tbl.AddColumn("2cm");    // Tasa Proceso
        tbl.AddColumn("1.8cm");  // Min Est.

        AddTableHeader(tbl, new[] { "SEQ", "CENTRO\nTRABAJO", "INSTRUCCIONES DETALLADAS DE OPERACIÓN",
                                     "Config.", "Tasa Proceso", "Min. Est." });

        foreach (var op in ops)
        {
            var row = tbl.AddRow();
            row.VerticalAlignment = VerticalAlignment.Center;
            row.TopPadding    = Unit.FromPoint(5);
            row.BottomPadding = Unit.FromPoint(5);

            // SEQ
            var pSeq = row.Cells[0].AddParagraph(op.Orden?.ToString() ?? "");
            pSeq.Format.Alignment = ParagraphAlignment.Center;
            pSeq.Format.Font.Size = 7.5;

            // Centro + barcode
            row.Cells[1].Format.Alignment = ParagraphAlignment.Center;
            var pCt = row.Cells[1].AddParagraph(op.CentroTrabajo ?? "");
            pCt.Format.Font.Bold = true;
            pCt.Format.Font.Size = 7.5;
            pCt.Format.Alignment = ParagraphAlignment.Center;
            var ctBar = BarcodeToTempPng(op.CentroTrabajo, 16);
            if (ctBar != null)
            {
                var bImg = row.Cells[1].AddImage(ctBar);
                bImg.Width = "1.8cm";
            }

            // Instrucciones
            var pOp = row.Cells[2].AddParagraph();
            if (!string.IsNullOrWhiteSpace(op.ClaveOperacion))
                pOp.AddFormattedText($"[{op.ClaveOperacion}] ", TextFormat.Bold);
            if (!string.IsNullOrWhiteSpace(op.NombreOperacion))
                pOp.AddFormattedText(op.NombreOperacion, TextFormat.Bold);
            pOp.Format.Font.Size = 7.5;

            if (!string.IsNullOrWhiteSpace(op.DescripcionDetallada))
            {
                var lines = op.DescripcionDetallada.Split(new[] { "\\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in lines)
                {
                    var pLine = row.Cells[2].AddParagraph(line.Trim());
                    pLine.Format.Font.Size  = 7;
                    pLine.Format.Font.Color = Slate800;
                }
            }

            // Config / Tasa / Minutos
            var pCfg = row.Cells[3].AddParagraph(op.Configuracion?.ToString("F2") ?? "0.00");
            pCfg.Format.Alignment = ParagraphAlignment.Center;
            pCfg.Format.Font.Size = 7.5;

            var pTasa = row.Cells[4].AddParagraph(
                string.IsNullOrWhiteSpace(op.TasaProceso) ? "0.00 Min/Part" : op.TasaProceso);
            pTasa.Format.Alignment = ParagraphAlignment.Center;
            pTasa.Format.Font.Size = 7.5;

            var pMin = row.Cells[5].AddParagraph(op.TiempoMin?.ToString("N2") ?? "0.00");
            pMin.Format.Font.Bold = true;
            pMin.Format.Font.Size = 7.5;
            pMin.Format.Alignment = ParagraphAlignment.Center;
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ═══════════════════════════════════════════════════════════
    //  MATERIALES / RECOGIDAS
    // ═══════════════════════════════════════════════════════════
    static void AddMaterialsTable(Section section, List<MaterialModel> mats)
    {
        var culture = new System.Globalization.CultureInfo("es-MX");

        var tbl = CreateDataTable(section);
        tbl.AddColumn("3cm");    // Vencimiento + REQ barcode
        tbl.AddColumn("7cm");    // Material + descripción + lote
        tbl.AddColumn("3.5cm");  // Ubicación + barcode
        tbl.AddColumn("2.5cm");  // Cantidad

        AddTableHeader(tbl, new[]
        {
            "Vencimiento\nRequerimiento",
            "Material / Descripción",
            "Ubicación\nInventario",
            "Cantidad"
        });

        foreach (var mat in mats.OrderBy(x => x.ClaveMaterial))
        {
            var row = tbl.AddRow();
            row.VerticalAlignment = VerticalAlignment.Top;
            row.TopPadding    = Unit.FromPoint(4);
            row.BottomPadding = Unit.FromPoint(4);

            // COL 1: Vencimiento + barcode REQ
            if (mat.Vencimiento.HasValue)
            {
                var pV = row.Cells[0].AddParagraph(mat.Vencimiento.Value.ToString("dd-MMM-yy", culture));
                pV.Format.Font.Size = 7;
            }
            var reqBar = BarcodeToTempPng(mat.ClaveRequerimiento, 14);
            if (reqBar != null)
            {
                var img = row.Cells[0].AddImage(reqBar);
                img.Width = "2.2cm";
            }
            if (!string.IsNullOrWhiteSpace(mat.ClaveRequerimiento))
            {
                var pReq = row.Cells[0].AddParagraph(mat.ClaveRequerimiento);
                pReq.Format.Font.Size = 6.5;
                pReq.Format.Font.Bold = true;
            }

            // COL 2: Material + descripción + lote + parámetros calculados
            if (!string.IsNullOrWhiteSpace(mat.ClaveMaterial))
            {
                var pClave = row.Cells[1].AddParagraph(mat.ClaveMaterial);
                pClave.Format.Font.Size = 7.5;
            }
            if (!string.IsNullOrWhiteSpace(mat.Descripcion))
            {
                var lines = mat.Descripcion.Split(new[] { "\\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in lines)
                {
                    var pD = row.Cells[1].AddParagraph(line.Trim());
                    pD.Format.Font.Bold = true;
                    pD.Format.Font.Size = 7.5;
                }
            }
            if (!string.IsNullOrWhiteSpace(mat.Lote))
            {
                var pLote = row.Cells[1].AddParagraph($"Lote: {mat.Lote}");
                pLote.Format.Font.Size  = 6.5;
                pLote.Format.Font.Color = Slate500;
                pLote.Format.Font.Italic = true;
            }
            // Parámetros calculados
            if (mat.PartesBarra.HasValue || mat.PiezasPor.HasValue || mat.PiezasReg.HasValue)
            {
                var pParams = row.Cells[1].AddParagraph();
                pParams.Format.Font.Size  = 6.5;
                pParams.Format.Font.Color = Slate500;
                if (mat.PartesBarra.HasValue) pParams.AddText($"Items/Parte: {mat.PartesBarra:N2}   ");
                if (mat.PiezasPor.HasValue)   pParams.AddText($"Piezas Por: {mat.PiezasPor:N2}   ");
                if (mat.PiezasReg.HasValue)   pParams.AddText($"Piezas Req: {mat.PiezasReg:N2}");
            }

            // COL 3: Ubicación + barcode
            var ubBar = BarcodeToTempPng(mat.Ubicacion, 14);
            if (ubBar != null)
            {
                var img = row.Cells[2].AddImage(ubBar);
                img.Width = "2.2cm";
            }
            if (!string.IsNullOrWhiteSpace(mat.Ubicacion))
            {
                var pUb = row.Cells[2].AddParagraph(mat.Ubicacion);
                pUb.Format.Font.Bold = true;
                pUb.Format.Font.Size = 7;
            }

            // COL 4: Cantidad + unidad
            var pCant = row.Cells[3].AddParagraph(mat.Cantidad?.ToString("N2") ?? "—");
            pCant.Format.Font.Bold = true;
            pCant.Format.Font.Size = 8;
            pCant.Format.Alignment = ParagraphAlignment.Right;

            var pUnit = row.Cells[3].AddParagraph(
                string.IsNullOrWhiteSpace(mat.Unidad) ? "pz" : mat.Unidad.ToUpper());
            pUnit.Format.Font.Size = 7.5;
            pUnit.Format.Alignment = ParagraphAlignment.Right;
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ═══════════════════════════════════════════════════════════
    //  COMPONENTES (BOM)
    // ═══════════════════════════════════════════════════════════
    static void AddComponentsTable(Section section, List<ComponenteModel> comps)
    {
        var tbl = CreateDataTable(section);
        tbl.AddColumn("3.5cm");   // OT/Job ID hijo
        tbl.AddColumn("1cm");     // Rev
        tbl.AddColumn("4.5cm");   // Descripción
        tbl.AddColumn("2cm");     // Total hrs
        tbl.AddColumn("2.5cm");   // Cant. fabricar
        tbl.AddColumn("4.5cm");   // Ini/Fin Prg

        AddTableHeader(tbl, new[]
        {
            "OT / Sub-Orden\nParte — Descripción",
            "Rev",
            "Descripción",
            "Total Hrs\nEst.",
            "Cant.\nFabricar",
            "Ini / Fin Prg"
        });

        foreach (var comp in comps.OrderBy(c => c.JobID))
        {
            var row = tbl.AddRow();
            row.VerticalAlignment = VerticalAlignment.Center;
            row.TopPadding    = Unit.FromPoint(5);
            row.BottomPadding = Unit.FromPoint(5);

            // Job + parte
            var pJob = row.Cells[0].AddParagraph(comp.JobID ?? "");
            pJob.Format.Font.Bold = true;
            pJob.Format.Font.Size = 8;
            if (!string.IsNullOrWhiteSpace(comp.Parte))
            {
                var pParte = row.Cells[0].AddParagraph($"  Parte: {comp.Parte}");
                pParte.Format.Font.Size = 7.5;
                pParte.Format.Font.Bold = true;
            }

            SetCell(row, 1, string.IsNullOrWhiteSpace(comp.Revision) ? "—" : comp.Revision, ParagraphAlignment.Center);

            // Descripción multilínea
            if (!string.IsNullOrWhiteSpace(comp.Descripcion))
            {
                var lines = comp.Descripcion.Split(new[] { "\\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in lines)
                {
                    var pD = row.Cells[2].AddParagraph(line.Trim());
                    pD.Format.Font.Size = 7;
                }
            }

            var pHrs = row.Cells[3].AddParagraph(comp.HorasEst?.ToString("N2") ?? "—");
            pHrs.Format.Font.Bold = true;
            pHrs.Format.Font.Size = 7;
            pHrs.Format.Alignment = ParagraphAlignment.Right;

            SetCell(row, 4, comp.Cantidad.HasValue ? $"{comp.Cantidad:N2} / pz" : "—", ParagraphAlignment.Center);

            var pFechas = row.Cells[5].AddParagraph();
            if (comp.InicioPrg.HasValue) pFechas.AddText($"Ini: {comp.InicioPrg:dd-MMM-yy}  ");
            if (comp.FinPrg.HasValue)    pFechas.AddText($"Fin: {comp.FinPrg:dd-MMM-yy}");
            pFechas.Format.Font.Size = 6.5;
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ═══════════════════════════════════════════════════════════
    //  FIRMAS
    // ═══════════════════════════════════════════════════════════
    static void AddSignatures(Section section, AprobacionModel aprov)
    {
        section.AddParagraph().Format.SpaceAfter = "0.5cm";
        AddSectionTitle(section, "APROBACIONES");

        var tbl = section.AddTable();
        tbl.Borders.Width = 0;
        tbl.AddColumn("6cm");
        tbl.AddColumn("0.5cm");
        tbl.AddColumn("6cm");
        tbl.AddColumn("0.5cm");
        tbl.AddColumn("6cm");

        var row = tbl.AddRow();
        row.Height = "1.5cm";
        row.VerticalAlignment = VerticalAlignment.Bottom;

        void AddSig(int col, string? name, string role)
        {
            var cell = row.Cells[col];
            cell.Borders.Bottom.Width = 0.8;
            cell.Borders.Bottom.Color = Blue700;

            var pName = cell.AddParagraph(name ?? "");
            pName.Format.Font.Bold = true;
            pName.Format.Font.Size = 8;
            pName.Format.Alignment = ParagraphAlignment.Center;

            var pRole = cell.AddParagraph(role.ToUpper());
            pRole.Format.Font.Size  = 6.5;
            pRole.Format.Font.Color = Slate500;
            pRole.Format.Alignment  = ParagraphAlignment.Center;
        }

        AddSig(0, aprov.Ingenieria,  "Ingeniería / Diseño");
        AddSig(2, aprov.Produccion,  "Producción / Operaciones");
        AddSig(4, aprov.Calidad,     "Calidad / Inspección");
    }

    // ═══════════════════════════════════════════════════════════
    //  FOOTER
    // ═══════════════════════════════════════════════════════════
    static void AddFooter(Section section, ViajeroModel m)
    {
        var hasPadre = !string.IsNullOrWhiteSpace(m.EnsamblePadre);
        var secciones = new List<string> { "RUTA" };
        if (m.Materiales.Any())  secciones.Add("MAT");
        if (m.Componentes.Any()) secciones.Add("BOM");
        var secLabel = string.Join(" | ", secciones);

        var ft = section.Footers.Primary;

        var tbl = ft.AddTable();
        tbl.Borders.Width = 0;
        tbl.Borders.Top.Width = 0.75;
        tbl.Borders.Top.Color = Color.FromRgb(0, 0, 0);
        tbl.AddColumn("6cm");
        tbl.AddColumn("6.5cm");
        tbl.AddColumn("6cm");

        var row = tbl.AddRow();

        // Izquierda: padre
        var pPadre = row.Cells[0].AddParagraph();
        pPadre.AddFormattedText("Padre: ", TextFormat.Bold);
        pPadre.AddText(hasPadre ? m.EnsamblePadre! : "—");
        pPadre.Format.Font.Size = 6;

        // Centro: empresa + paginación + secciones
        var pCenter = row.Cells[1].AddParagraph("MCVILL SA DE CV — IA.AGUS");
        pCenter.Format.Font.Size  = 6;
        pCenter.Format.Alignment  = ParagraphAlignment.Center;

        var pPage = row.Cells[1].AddParagraph();
        pPage.AddText("Pág. ");
        pPage.AddPageField();
        pPage.AddText(" de ");
        pPage.AddNumPagesField();
        pPage.AddText($"  |  {secLabel}");
        pPage.Format.Font.Size = 5.5;
        pPage.Format.Alignment = ParagraphAlignment.Center;

        // Derecha: Job + Parte
        var pJob = row.Cells[2].AddParagraph($"Job: {m.JobID}");
        pJob.Format.Font.Bold = true;
        pJob.Format.Font.Size = 6;
        pJob.Format.Alignment = ParagraphAlignment.Right;

        var pParte = row.Cells[2].AddParagraph($"Parte: {m.NumeroParte}  Rev: {m.Revision}");
        pParte.Format.Font.Size = 6;
        pParte.Format.Alignment = ParagraphAlignment.Right;
    }

    // ═══════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════
    static Table CreateDataTable(Section section)
    {
        var tbl = section.AddTable();
        tbl.Borders.Color  = LightGray;
        tbl.Borders.Width  = 0.5;
        tbl.LeftPadding    = Unit.FromPoint(3);
        tbl.RightPadding   = Unit.FromPoint(3);
        tbl.TopPadding     = Unit.FromPoint(2);
        tbl.BottomPadding  = Unit.FromPoint(2);
        return tbl;
    }

    static void AddSectionTitle(Section section, string title)
    {
        // Línea superior
        var lineTbl = section.AddTable();
        lineTbl.Borders.Width = 0;
        lineTbl.AddColumn("18.5cm");
        var lineRow = lineTbl.AddRow();
        lineRow.Height = "0.08cm";
        lineRow.Borders.Top.Width = 1.5;
        lineRow.Borders.Top.Color = Blue700;

        // Barra azul con título
        var tbl = section.AddTable();
        tbl.Borders.Width = 0;
        tbl.AddColumn("18.5cm");
        var row = tbl.AddRow();
        row.Shading.Color     = Blue700;
        row.Height            = "0.5cm";
        row.VerticalAlignment = VerticalAlignment.Center;
        var p = row.Cells[0].AddParagraph(title);
        p.Format.Font.Bold  = true;
        p.Format.Font.Size  = 9;
        p.Format.Font.Color = White;
        p.Format.Alignment  = ParagraphAlignment.Center;
        p.Format.LeftIndent = "0.2cm";

        // Línea inferior suave
        var line2Tbl = section.AddTable();
        line2Tbl.Borders.Width = 0;
        line2Tbl.AddColumn("18.5cm");
        var line2Row = line2Tbl.AddRow();
        line2Row.Height = "0.08cm";
        line2Row.Borders.Top.Width = 0.75;
        line2Row.Borders.Top.Color = Blue200;

        section.AddParagraph().Format.SpaceAfter = "0.1cm";
    }

    static void AddTableHeader(Table tbl, string[] headers)
    {
        var row = tbl.AddRow();
        row.Shading.Color     = Blue700;
        row.Height            = "0.5cm";
        row.VerticalAlignment = VerticalAlignment.Center;
        row.HeadingFormat     = true;

        for (int i = 0; i < headers.Length; i++)
        {
            var p = row.Cells[i].AddParagraph(headers[i]);
            p.Format.Font.Bold  = true;
            p.Format.Font.Size  = 6.5;
            p.Format.Font.Color = White;
            p.Format.Alignment  = ParagraphAlignment.Center;
        }
    }

    static void LabelCell(Cell cell, string label)
    {
        var p = cell.AddParagraph(label.ToUpper());
        p.Format.Font.Bold  = true;
        p.Format.Font.Size  = 6.5;
        p.Format.Font.Color = Blue700;
    }

    static void ValueCell(Cell cell, string? val, bool bold = true)
    {
        var p = cell.AddParagraph(string.IsNullOrWhiteSpace(val) ? "—" : val);
        p.Format.Font.Size = 7.5;
        p.Format.Font.Bold = bold;
        p.Format.Font.Color = Slate800;
    }

    static void SetCell(Row row, int col, string? text,
        ParagraphAlignment align = ParagraphAlignment.Left)
    {
        var p = row.Cells[col].AddParagraph(text ?? "");
        p.Format.Font.Size = 7;
        p.Format.Alignment = align;
    }

    static void AddEmptyNote(Section section, string msg)
    {
        var p = section.AddParagraph(msg);
        p.Format.Font.Size   = 7;
        p.Format.Font.Color  = Slate500;
        p.Format.Font.Italic = true;
        p.Format.Alignment   = ParagraphAlignment.Center;
        p.Format.SpaceAfter  = "0.2cm";
    }
}
