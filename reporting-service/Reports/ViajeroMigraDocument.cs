using MigraDoc.DocumentObjectModel;
using MigraDoc.DocumentObjectModel.Tables;
using MigraDoc.Rendering;
using McVill.ReportService.Models;

namespace McVill.ReportService.Reports;

/// <summary>
/// Genera el Viajero McVill usando MigraDoc/PDFsharp (MIT, sin costo de licencia).
/// Alternativa a QuestPDF para entornos sin licencia Community/Professional.
/// </summary>
public static class ViajeroMigraDocument
{
    // ── Punto de entrada ──────────────────────────────────────────────────────
    public static byte[] Generate(ViajeroModel model)
        => Generate(new List<ViajeroModel> { model });

    public static byte[] Generate(List<ViajeroModel> models)
    {
        var document = BuildDocument(models);
        var renderer = new PdfDocumentRenderer { Document = document };
        renderer.RenderDocument();

        using var ms = new MemoryStream();
        renderer.PdfDocument.Save(ms);
        return ms.ToArray();
    }

    // ── Construcción del documento ────────────────────────────────────────────
    private static Document BuildDocument(List<ViajeroModel> models)
    {
        var doc = new Document();
        doc.Info.Title  = "Viajero de Producción — McVill SA de CV";
        doc.Info.Author = "McVill ERP / IA.AGUS";

        DefineStyles(doc);

        foreach (var model in models)
            AddViajeroSection(doc, model);

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
    private static void AddViajeroSection(Document doc, ViajeroModel m)
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
        ftPara.AddText("McVill SA de CV  |  Viajero de Producción  |  Página ");
        ftPara.AddPageField();
        ftPara.AddText(" de ");
        ftPara.AddNumPagesField();
        ftPara.Format.Font.Size  = 7;
        ftPara.Format.Font.Color = Color.FromRgb(100, 116, 139);

        AddHeader(section, m);
        AddInfoCard(section, m);

        if (m.Operaciones.Any())
            AddOperationsTable(section, m.Operaciones);

        if (m.Materiales.Any())
            AddMaterialsTable(section, m.Materiales);

        if (m.Componentes.Any())
            AddComponentsTable(section, m.Componentes);

        AddSignatures(section, m.Aprobaciones);
    }

    // ── Encabezado ────────────────────────────────────────────────────────────
    private static void AddHeader(Section section, ViajeroModel m)
    {
        var table = section.AddTable();
        table.Borders.Width = 0;
        table.LeftPadding   = Unit.FromCentimeter(0.4);
        table.RightPadding  = Unit.FromCentimeter(0.4);

        table.AddColumn("10cm");
        table.AddColumn("8cm");

        var row = table.AddRow();
        row.Shading.Color = Color.FromRgb(26, 74, 138);
        row.Height        = "1.4cm";

        // Izquierda: nombre empresa
        var cellLeft = row.Cells[0];
        cellLeft.VerticalAlignment = VerticalAlignment.Center;
        var p1 = cellLeft.AddParagraph("McVill SA de CV");
        p1.Format.Font.Bold  = true;
        p1.Format.Font.Size  = 13;
        p1.Format.Font.Color = Color.FromRgb(255, 255, 255);

        var p2 = cellLeft.AddParagraph("VIAJERO DE PRODUCCIÓN");
        p2.Format.Font.Size  = 8;
        p2.Format.Font.Color = Color.FromRgb(147, 197, 253);

        // Derecha: job ID + fecha
        var cellRight = row.Cells[1];
        cellRight.VerticalAlignment = VerticalAlignment.Center;

        var p3 = cellRight.AddParagraph($"JOB: {m.JobID ?? "-"}");
        p3.Format.Font.Bold  = true;
        p3.Format.Font.Size  = 11;
        p3.Format.Font.Color = Color.FromRgb(255, 255, 255);
        p3.Format.Alignment  = ParagraphAlignment.Right;

        var fecha = m.FechaOrden?.ToString("dd/MMM/yyyy") ?? DateTime.Today.ToString("dd/MMM/yyyy");
        var p4 = cellRight.AddParagraph($"Fecha: {fecha}");
        p4.Format.Font.Size = 8;
        p4.Format.Font.Color = Color.FromRgb(147, 197, 253);
        p4.Format.Alignment  = ParagraphAlignment.Right;

        section.AddParagraph().Format.SpaceAfter = "0.2cm";
    }

    // ── Ficha informativa ─────────────────────────────────────────────────────
    private static void AddInfoCard(Section section, ViajeroModel m)
    {
        var table = section.AddTable();
        table.Borders.Color  = Color.FromRgb(203, 213, 225);
        table.Borders.Width  = 0.5;
        table.LeftPadding    = Unit.FromCentimeter(0.2);
        table.RightPadding   = Unit.FromCentimeter(0.2);
        table.TopPadding     = Unit.FromPoint(3);
        table.BottomPadding  = Unit.FromPoint(3);

        table.AddColumn("3cm");
        table.AddColumn("6cm");
        table.AddColumn("3cm");
        table.AddColumn("6cm");

        void AddField(Row r, int colLabel, int colVal, string label, string value)
        {
            r.Cells[colLabel].Shading.Color = Color.FromRgb(241, 245, 249);
            var pL = r.Cells[colLabel].AddParagraph(label.ToUpper());
            pL.Format.Font.Bold  = true;
            pL.Format.Font.Size  = 6.5;
            pL.Format.Font.Color = Color.FromRgb(71, 85, 105);

            r.Cells[colVal].AddParagraph(value ?? "").Format.Font.Size = 8;
        }

        var fields = new[]
        {
            ("Parte",      m.NumeroParte,                       "Descripción",  m.Descripcion),
            ("Cliente",    m.Cliente,                            "OC Cliente",   m.OCCliente),
            ("Revisión",   m.Revision,                           "Dibujo",       m.Dibujo),
            ("Cant Orden", m.CantidadOrden?.ToString("0") ?? "-","Cant Fab.",    m.CantFabricada?.ToString("0") ?? "-"),
            ("F. Entrega", m.FechaEntrega?.ToString("dd/MM/yyyy") ?? "-","Línea",m.Linea),
            ("Notas",      m.Notas,                              "Cotización",   m.Cotizacion),
        };

        foreach (var (l1, v1, l2, v2) in fields)
        {
            var row = table.AddRow();
            row.Height = "0.55cm";
            row.VerticalAlignment = VerticalAlignment.Center;
            AddField(row, 0, 1, l1, v1);
            AddField(row, 2, 3, l2, v2);
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ── Tabla de operaciones ──────────────────────────────────────────────────
    private static void AddOperationsTable(Section section, List<OperacionModel> ops)
    {
        AddSectionTitle(section, "OPERACIONES DE FABRICACIÓN");

        var table = CreateDataTable(section);
        table.AddColumn("1cm");
        table.AddColumn("2cm");
        table.AddColumn("4.5cm");
        table.AddColumn("3cm");
        table.AddColumn("2cm");
        table.AddColumn("2cm");
        table.AddColumn("2.5cm");

        AddTableHeader(table, new[] { "#", "Clave", "Operación", "Centro Trabajo", "T. Est (h)", "Inicio Prg", "Fin Prg" });

        bool odd = true;
        foreach (var op in ops)
        {
            var row = table.AddRow();
            row.Height = "0.5cm";
            row.VerticalAlignment = VerticalAlignment.Center;
            if (odd) row.Shading.Color = Color.FromRgb(241, 245, 249);
            odd = !odd;

            SetCell(row, 0, op.Orden?.ToString() ?? "-", ParagraphAlignment.Center);
            SetCell(row, 1, op.ClaveOperacion);
            SetCell(row, 2, op.NombreOperacion);
            SetCell(row, 3, op.CentroTrabajo);
            SetCell(row, 4, op.TiempoEstimado?.ToString("0.00") ?? "-", ParagraphAlignment.Center);
            SetCell(row, 5, op.InicioPrg?.ToString("dd/MM/yy") ?? "-", ParagraphAlignment.Center);
            SetCell(row, 6, op.FinPrg?.ToString("dd/MM/yy") ?? "-", ParagraphAlignment.Center);
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ── Tabla de materiales ───────────────────────────────────────────────────
    private static void AddMaterialsTable(Section section, List<MaterialModel> mats)
    {
        AddSectionTitle(section, "MATERIALES Y CONSUMIBLES");

        var table = CreateDataTable(section);
        table.AddColumn("2cm");
        table.AddColumn("5.5cm");
        table.AddColumn("1.5cm");
        table.AddColumn("1.5cm");
        table.AddColumn("2cm");
        table.AddColumn("2.5cm");
        table.AddColumn("2cm");

        AddTableHeader(table, new[] { "Clave", "Descripción", "Cant.", "U/M", "Ubicación", "Requisición", "Vencimiento" });

        bool odd = true;
        foreach (var mat in mats)
        {
            var row = table.AddRow();
            row.Height = "0.5cm";
            row.VerticalAlignment = VerticalAlignment.Center;
            if (odd) row.Shading.Color = Color.FromRgb(241, 245, 249);
            odd = !odd;

            SetCell(row, 0, mat.ClaveMaterial);
            SetCell(row, 1, mat.Descripcion);
            SetCell(row, 2, mat.Cantidad?.ToString("0.##") ?? "-", ParagraphAlignment.Center);
            SetCell(row, 3, mat.Unidad, ParagraphAlignment.Center);
            SetCell(row, 4, mat.Ubicacion);
            SetCell(row, 5, mat.Requisicion);
            SetCell(row, 6, mat.Vencimiento?.ToString("dd/MM/yy") ?? "-", ParagraphAlignment.Center);
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ── Tabla de componentes ──────────────────────────────────────────────────
    private static void AddComponentsTable(Section section, List<ComponenteModel> comps)
    {
        AddSectionTitle(section, "COMPONENTES / SUB-ENSAMBLES");

        var table = CreateDataTable(section);
        table.AddColumn("3cm");
        table.AddColumn("7cm");
        table.AddColumn("2cm");
        table.AddColumn("3cm");
        table.AddColumn("2.5cm");

        AddTableHeader(table, new[] { "Job ID Hijo", "Descripción", "Cantidad", "Inicio Prg", "Fin Prg" });

        bool odd = true;
        foreach (var c in comps)
        {
            var row = table.AddRow();
            row.Height = "0.5cm";
            row.VerticalAlignment = VerticalAlignment.Center;
            if (odd) row.Shading.Color = Color.FromRgb(241, 245, 249);
            odd = !odd;

            SetCell(row, 0, c.JobID);
            SetCell(row, 1, c.Descripcion);
            SetCell(row, 2, c.Cantidad?.ToString("0.##") ?? "-", ParagraphAlignment.Center);
            SetCell(row, 3, c.InicioPrg?.ToString("dd/MM/yy") ?? "-", ParagraphAlignment.Center);
            SetCell(row, 4, c.FinPrg?.ToString("dd/MM/yy") ?? "-", ParagraphAlignment.Center);
        }

        section.AddParagraph().Format.SpaceAfter = "0.3cm";
    }

    // ── Firmas de aprobación ──────────────────────────────────────────────────
    private static void AddSignatures(Section section, AprobacionModel aprov)
    {
        section.AddParagraph().Format.SpaceAfter = "0.5cm";
        AddSectionTitle(section, "APROBACIONES");

        var table = section.AddTable();
        table.Borders.Width = 0;
        table.AddColumn("6cm");
        table.AddColumn("0.5cm");
        table.AddColumn("6cm");
        table.AddColumn("0.5cm");
        table.AddColumn("6cm");

        var row = table.AddRow();
        row.Height = "1.5cm";
        row.VerticalAlignment = VerticalAlignment.Bottom;

        void AddSig(int col, string? name, string role)
        {
            var cell = row.Cells[col];
            cell.Borders.Bottom.Width = 0.8;
            cell.Borders.Bottom.Color = Color.FromRgb(26, 74, 138);

            var pName = cell.AddParagraph(name ?? "");
            pName.Format.Font.Bold = true;
            pName.Format.Font.Size = 8;
            pName.Format.Alignment = ParagraphAlignment.Center;

            var pRole = cell.AddParagraph(role.ToUpper());
            pRole.Format.Font.Size  = 6.5;
            pRole.Format.Font.Color = Color.FromRgb(100, 116, 139);
            pRole.Format.Alignment  = ParagraphAlignment.Center;
        }

        AddSig(0, aprov.Ingenieria,  "Ingeniería");
        AddSig(2, aprov.Produccion,  "Producción");
        AddSig(4, aprov.Calidad,     "Calidad");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static Table CreateDataTable(Section section)
    {
        var table = section.AddTable();
        table.Borders.Color = Color.FromRgb(203, 213, 225);
        table.Borders.Width = 0.5;
        table.LeftPadding   = Unit.FromPoint(2);
        table.RightPadding  = Unit.FromPoint(2);
        table.TopPadding    = Unit.FromPoint(2);
        table.BottomPadding = Unit.FromPoint(2);
        return table;
    }

    private static void AddSectionTitle(Section section, string title)
    {
        var table = section.AddTable();
        table.Borders.Width = 0;
        table.LeftPadding   = Unit.FromCentimeter(0.3);
        table.AddColumn("18cm");

        var row = table.AddRow();
        row.Shading.Color     = Color.FromRgb(37, 99, 235);
        row.Height            = "0.5cm";
        row.VerticalAlignment = VerticalAlignment.Center;

        var p = row.Cells[0].AddParagraph(title);
        p.Format.Font.Bold  = true;
        p.Format.Font.Size  = 7.5;
        p.Format.Font.Color = Color.FromRgb(255, 255, 255);

        section.AddParagraph().Format.SpaceAfter = "0.1cm";
    }

    private static void AddTableHeader(Table table, string[] headers)
    {
        var row = table.AddRow();
        row.Shading.Color     = Color.FromRgb(37, 99, 235);
        row.Height            = "0.5cm";
        row.VerticalAlignment = VerticalAlignment.Center;
        row.HeadingFormat     = true;

        for (int i = 0; i < headers.Length; i++)
        {
            var p = row.Cells[i].AddParagraph(headers[i]);
            p.Format.Font.Bold  = true;
            p.Format.Font.Size  = 7;
            p.Format.Font.Color = Color.FromRgb(255, 255, 255);
            p.Format.Alignment  = ParagraphAlignment.Center;
        }
    }

    private static void SetCell(Row row, int col, string? text,
        ParagraphAlignment align = ParagraphAlignment.Left)
    {
        var p = row.Cells[col].AddParagraph(text ?? "");
        p.Format.Font.Size = 7;
        p.Format.Alignment = align;
    }
}
