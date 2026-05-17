using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using McVill.ReportService.Models;
using Barcoder;
using Barcoder.Renderer.Image;
using System.IO;
using System;
using System.Collections.Generic;
using System.Linq;

namespace McVill.ReportService.Reports;

public class ViajeroDocument : IDocument
{
    public List<ViajeroModel> Models { get; }
    public string CompanyName { get; }

    public ViajeroDocument(List<ViajeroModel> models, string companyName = "ERP Industrial")
    {
        Models = models;
        CompanyName = companyName;
    }

    public ViajeroDocument(ViajeroModel model, string companyName = "ERP Industrial")
    {
        Models = new List<ViajeroModel> { model };
        CompanyName = companyName;
    }

    public DocumentMetadata GetMetadata() => new DocumentMetadata
    {
        Title    = $"Viajero {CompanyName}",
        Author   = $"{CompanyName} — Sistema ERP",
        Creator  = "QuestPDF / IA.AGUS",
    };

    // ── Logo cacheado (se carga una sola vez) ────────────────────
    static byte[]? _logoBytes;
    static byte[]? LoadLogo()
    {
        if (_logoBytes != null) return _logoBytes;
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, "Assets", "mcvill-logo.png");
            if (File.Exists(path))
                _logoBytes = File.ReadAllBytes(path);
        }
        catch { /* fallback a texto si falla */ }
        return _logoBytes;
    }

    // ── Color de fila según tipo de operación (para laser B&W) ──
    // Escala de grises con diferencia suficiente para distinguirse al imprimir.
    static string OperationRowColor(OperacionModel op)
    {
        return "#ffffff";
    }

    // ══════════════════════════════════════════════════════════════
    public void Compose(IDocumentContainer container)
    {
        foreach (var model in Models)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(18);
                page.DefaultTextStyle(x => x.FontSize(8).FontFamily(Fonts.Arial));

                // Marca de agua removida por solicitud del usuario


                page.Header().Element(c => ComposeHeader(c, model));
                page.Content().Element(c => ComposeContent(c, model));
                page.Footer().Element(c => ComposeFooter(c, model));
            });
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  CABECERA  (se repite en cada página)
    // ═══════════════════════════════════════════════════════════
    void ComposeHeader(IContainer container, ViajeroModel m)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                // ── Logo McVill ──
                var logo = LoadLogo();
                if (logo != null)
                {
                    row.ConstantItem(150)
                        .TranslateY(-15)
                        .Column(c =>
                        {
                            c.Item().Height(80).Image(logo).FitArea();
                        });
                }
                else
                {
                    row.ConstantItem(150).Column(c =>
                    {
                        c.Item().PaddingTop(2)
                            .Text(CompanyName.ToUpper())
                            .FontSize(9).Bold().FontColor("#000000");
                    });
                }

                // Centro: título + job + barcode
                row.RelativeItem().AlignCenter().Column(c =>
                {
                    c.Item().AlignCenter()
                        .Text("VIAJERO INDUSTRIAL")
                        .FontSize(16).Bold().FontColor("#000000");
                    c.Item().AlignCenter()
                        .Text($"JOB: {(m.JobID ?? "N/A").ToUpper()}")
                        .FontSize(10).Bold().FontColor("#000000");
                    c.Item().PaddingTop(3).AlignCenter()
                        .Element(e => RenderBarcode(e, m.JobID ?? "", 30));
                    c.Item().AlignCenter()
                        .Text(m.JobID ?? "—").FontSize(6.5f).FontColor("#333333").SemiBold();
                });

                // Derecha: fecha impresión + página
                row.ConstantItem(150).AlignRight().Column(c =>
                {
                    c.Item().AlignRight().Text(t =>
                    {
                        t.Span("FECHA DE IMPRESIÓN: ").FontSize(7).Bold().FontColor("#000000");
                        t.Span(DateTime.Now.ToString("dd-MMM-yy HH:mm", new System.Globalization.CultureInfo("es-MX")))
                            .FontSize(7).FontColor("#333333");
                    });
                    c.Item().PaddingTop(1).AlignRight().Text(t =>
                    {
                        t.Span("Página ").FontSize(7).FontColor("#333333");
                        t.CurrentPageNumber().FontSize(7).Bold().FontColor("#000000");
                        t.Span(" de ").FontSize(7).FontColor("#333333");
                        t.TotalPages().FontSize(7).Bold().FontColor("#000000");
                    });

                    if (m.FechaOrden.HasValue)
                        c.Item().PaddingTop(1).AlignRight()
                            .Text(m.FechaOrden.Value.ToString("dd-MMM-yyyy"))
                            .FontSize(7).FontColor("#333333");
                    if (!string.IsNullOrWhiteSpace(m.NumeroParte))
                        c.Item().PaddingTop(2).AlignRight()
                            .Text(m.NumeroParte ?? "—").FontSize(7).Bold().FontColor("#000000");
                });
            });

            col.Item().PaddingTop(6).LineHorizontal(1.5f).LineColor("#1e40af"); // Blue-700
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  CAJA DE DATOS DEL JOB (4 Columnas x 4 Filas)
    // ═══════════════════════════════════════════════════════════
    void ComposeJobDetails(IContainer container, ViajeroModel m)
    {
        var culture = new System.Globalization.CultureInfo("es-MX");

        container.Column(col =>
        {
            col.Item().PaddingTop(6)
                .Background("#eff6ff") // Blue-50
                .Border(0.75f).BorderColor("#bfdbfe") // Blue-200
                .PaddingHorizontal(10).PaddingVertical(8)
                .Table(tbl =>
                {
                    tbl.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(); 
                        c.RelativeColumn(); 
                        c.RelativeColumn(); 
                        c.RelativeColumn(); 
                    });

                    // Helper para celdas de datos compactas
                    void Cell(string lbl, string? val, bool bold = false, string? subVal = null)
                    {
                        tbl.Cell().PaddingBottom(4).Text(t =>
                        {
                            t.Span(lbl + " ").FontSize(7).Bold().FontColor("#1e40af");
                            var s = t.Span(string.IsNullOrWhiteSpace(val) ? "—" : val).FontSize(7.5f).FontColor("#0f172a");
                            if (bold) s.Bold();
                            
                            if (!string.IsNullOrWhiteSpace(subVal))
                            {
                                t.Span("\n" + subVal).FontSize(6.5f).FontColor("#64748b").Italic();
                            }
                        });
                    }

                    // FILA 1: Identificación Crítica
                    Cell("PARTE:",       m.NumeroParte, bold: true);
                    Cell("REVISIÓN:",    m.Revision, bold: true);
                    Cell("CANT. ORDEN:", m.CantidadOrden.HasValue ? $"{m.CantidadOrden:N0} / PZ" : "—", bold: true);
                    Cell("FECHA ORDEN:", m.FechaOrden?.ToString("dd-MMM-yyyy", culture) ?? "—", bold: true);

                    // FILA 2: Referencias y Compromiso
                    Cell("CLIENTE:",     m.Cliente, bold: true);
                    Cell("DIBUJO:",      string.IsNullOrWhiteSpace(m.Dibujo) ? m.NumeroParte : m.Dibujo, bold: true);
                    Cell("OC CLIENTE:",  m.OCCliente, bold: true);
                    Cell("ENTREGA:",     m.FechaEntrega?.ToString("dd-MMM-yyyy", culture) ?? "—", bold: true);

                    // FILA 3: Jerarquía Industrial
                    var padre = string.IsNullOrEmpty(m.EnsamblePadre) ? "N/A" : m.EnsamblePadre;
                    Cell("E. PADRE:", padre, bold: true, subVal: m.EnsamblePadreDesc ?? "");
                    
                    var tl = string.IsNullOrEmpty(m.EnsambleTL) || m.EnsambleTL == "N/A" ? "TOP LEVEL" : m.EnsambleTL;
                    Cell("E. T/L:", tl, bold: true, subVal: m.EnsambleTLDesc ?? "");
                    
                    Cell("LÍNEA:", m.Linea ?? "ESTÁNDAR", bold: true);
                    Cell("HORAS EST.:",  m.HorasEstTotales.HasValue ? $"{m.HorasEstTotales:N2} HRS" : "—", bold: true);

                    // FILA 4: Control Interno
                    Cell("JOB ID:",      m.JobID, bold: true);
                    Cell("COTIZACIÓN:",  m.Cotizacion, bold: true);
                    Cell("CANT. FAB.:",  m.CantFabricada.HasValue ? $"{m.CantFabricada:N0}" : "0", bold: true);
                    Cell("ESTATUS:",     "PENDIENTE", bold: true);

                    // FILA 5 (Descripción larga)
                    tbl.Cell().ColumnSpan(4).PaddingTop(2).Text(t =>
                    {
                        t.Span("DESCRIPCIÓN: ").FontSize(7).Bold().FontColor("#1e40af");
                        t.Span(m.Descripcion ?? "").FontSize(7.5f).Bold().FontColor("#0f172a");
                    });
                });

            if (!string.IsNullOrWhiteSpace(m.Notas))
            {
                col.Item().PaddingTop(4)
                    .Background("#fffbeb")
                    .Border(0.75f).BorderColor("#fde68a")
                    .Padding(6)
                    .Text(t =>
                    {
                        t.Span("NOTAS: ").FontSize(7.5f).Bold().FontColor("#d97706");
                        t.Span(m.Notas).FontSize(7.5f).Bold().FontColor("#92400e");
                    });
            }

            col.Item().PaddingTop(5).LineHorizontal(0.5f).LineColor("#bfdbfe"); // Blue-200
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  CONTENIDO
    // ═══════════════════════════════════════════════════════════
    void ComposeContent(IContainer container, ViajeroModel m)
    {
        container.Column(col =>
        {
            col.Item().Element(c => ComposeJobDetails(c, m));

            col.Item().PaddingTop(8).Element(e => SectionHeader(e, "RUTA DE PROCESO"));
            if (m.Operaciones.Any())
                col.Item().Element(c => ComposeRuta(c, m.Operaciones));
            else
                col.Item().Padding(8).AlignCenter()
                    .Text("Sin operaciones registradas").FontSize(7).FontColor("#333333").Italic();

            col.Item().PaddingTop(12).Element(e => SectionHeader(e, "MATERIALES / RECOGIDAS"));
            col.Item().PaddingLeft(10).Text("Vencimiento Material Primario").FontSize(7).Italic().FontColor("#64748b");
            
            if (m.Materiales.Any())
                col.Item().Element(c => ComposeMateriales(c, m.Materiales));
            else
                col.Item().Padding(8).AlignCenter()
                    .Text("Sin materiales registrados").FontSize(7).FontColor("#333333").Italic();

            if (m.Componentes.Any())
            {
                col.Item().PaddingTop(12).Element(e => SectionHeader(e, "Componentes (BOM)"));
                col.Item().Element(c => ComposeComponentes(c, m.Componentes));
            }

            // Sección de Firmas al final de la última página (o en cada una si se prefiere)
            col.Item().PaddingTop(20).Element(e => ComposeApprovals(e, m));
        });
    }

    void ComposeApprovals(IContainer container, ViajeroModel m)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                /* 
                void Signature(string role, string name)
                {
                    row.RelativeItem().PaddingHorizontal(10).Column(c =>
                    {
                        c.Item().BorderTop(0.5f).PaddingTop(2).AlignCenter().Text(role).FontSize(7).Bold().FontColor("#1e40af");
                        c.Item().AlignCenter().Text(name).FontSize(6).FontColor("#475569");
                    });
                }

                Signature("INGENIERÍA / DISEÑO", m.Aprobaciones.Ingenieria);
                Signature("PRODUCCIÓN / OPERACIONES", m.Aprobaciones.Produccion);
                Signature("CALIDAD / INSPECCIÓN", m.Aprobaciones.Calidad);
                */
            });
        });
    }


    // ═══════════════════════════════════════════════════════════
    //  RUTA DE TRABAJO
    // ═══════════════════════════════════════════════════════════
    void ComposeRuta(IContainer container, List<OperacionModel> operaciones)
    {
        container.PaddingTop(3).Table(table =>
        {
            table.ColumnsDefinition(cols =>
            {
                cols.ConstantColumn(35);  // SEQ
                cols.ConstantColumn(80);  // CENTRO TRAB
                cols.RelativeColumn();    // DESCRIPCIÓN
                cols.ConstantColumn(50);  // Configurar
                cols.ConstantColumn(65);  // Tasa Proceso
                cols.ConstantColumn(55);  // Minutos Est.
            });

            table.Header(h =>
            {
                void HCell(string txt, bool center = false, bool right = false)
                {
                    IContainer cell = h.Cell()
                        .Background("#1e40af") // Blue-700
                        .BorderBottom(1f).BorderColor("#1e3a8a")
                        .PaddingVertical(4).PaddingHorizontal(4);

                    if (center) cell = cell.AlignCenter();
                    else if (right) cell = cell.AlignRight();

                    cell.Text(txt).FontSize(6.5f).Bold().FontColor("#ffffff");
                }

                HCell("SEQ", center: true);
                HCell("CENTRO TRAB", center: true);
                HCell("INSTRUCCIONES DETALLADAS DE OPERACIÓN"); 
                HCell("Configurar", center: true);
                HCell("Tasa Proceso", center: true);
                HCell("Minutos Est.", center: true);
            });

            foreach (var op in operaciones)
            {
                var rowBg = OperationRowColor(op);

                IContainer C() => table.Cell()
                    .Background(rowBg)
                    .BorderBottom(0.5f).BorderColor("#bfdbfe") // Blue-200
                    .PaddingVertical(6).PaddingHorizontal(4);

                C().AlignCenter().Text(op.Orden?.ToString() ?? "").FontSize(7.5f).FontColor("#000000");

                C().AlignCenter().Column(c =>
                {
                    c.Item().AlignCenter().Text(op.CentroTrabajo).FontSize(7.5f).Bold().FontColor("#000000");
                    if (!string.IsNullOrWhiteSpace(op.CentroTrabajo))
                    {
                        c.Item().PaddingTop(3).AlignCenter().Element(e => RenderBarcode(e, op.CentroTrabajo, 16));
                        c.Item().AlignCenter().Text(op.CentroTrabajo).FontSize(5).FontColor("#666666");
                    }
                });

                C().Column(c =>
                {
                    c.Item().Text(t =>
                    {
                        if (!string.IsNullOrWhiteSpace(op.ClaveOperacion))
                            t.Span($"[{op.ClaveOperacion}] ").Bold().FontSize(7.5f).FontColor("#000000");
                        if (!string.IsNullOrWhiteSpace(op.NombreOperacion))
                            t.Span(op.NombreOperacion).Bold().FontSize(7.5f).FontColor("#000000");
                    });
                    if (!string.IsNullOrWhiteSpace(op.DescripcionDetallada))
                    {
                        c.Item().PaddingTop(2).Text(t =>
                        {
                            string[] lines = (op.DescripcionDetallada ?? "").Split(new[] { "\\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                            foreach (var lineText in lines)
                            {
                                t.Span(lineText.Trim()).FontSize(7).LineHeight(1.1f).FontColor("#1e293b"); // Slate-800
                                t.EmptyLine();
                            }
                        });
                    }
                });

                C().AlignCenter().Text(op.Configuracion?.ToString("F2") ?? "0.00").FontSize(7.5f).FontColor("#000000");
                C().AlignCenter().Text(string.IsNullOrWhiteSpace(op.TasaProceso) ? "0.00 Min/Part" : op.TasaProceso).FontSize(7.5f).FontColor("#000000");
                C().AlignCenter().Text(op.TiempoEstimado?.ToString("N2") ?? "0.00").FontSize(7.5f).Bold().FontColor("#000000");
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  MATERIALES / RECOGIDAS
    // ═══════════════════════════════════════════════════════════
    void ComposeMateriales(IContainer container, List<MaterialModel> materiales)
    {
        if (!materiales.Any()) return;

        container.PaddingTop(10).Column(c =>
        {
            c.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(20);
                    columns.RelativeColumn(45);
                    columns.RelativeColumn(20);
                    columns.RelativeColumn(15);
                });

                table.Header(header =>
                {
                    void HCell(string txt, bool alignRight = false)
                    {
                        var cell = header.Cell()
                            .Background("#ffffff").BorderBottom(1.5f).BorderColor("#000000")
                            .PaddingHorizontal(2).PaddingVertical(4);
                        if (alignRight)
                            cell.AlignRight().Text(txt).FontSize(6.5f).Bold().FontColor("#000000");
                        else
                            cell.Text(txt).FontSize(6.5f).Bold().FontColor("#000000");
                    }

                    HCell("Vencimiento\nRequerimiento (REQ)");
                    HCell("Material\nDescripción");
                    HCell("Ubicación\nInventario");
                    HCell("\nCantidad", alignRight: true);
                });

                foreach (var mat in materiales.OrderBy(m => m.ClaveMaterial))
                {
                    table.Cell().ColumnSpan(4).BorderBottom(0.5f).BorderColor("#cccccc")
                        .PaddingVertical(4).Column(col =>
                    {
                        col.Item().Row(r =>
                        {
                            // COL 1: Vencimiento + REQ
                            r.RelativeItem(20).PaddingHorizontal(2).Column(c =>
                            {
                                if (mat.Vencimiento.HasValue)
                                    c.Item().Text(mat.Vencimiento.Value.ToString("dd-MMM-yy"))
                                        .FontSize(7f).FontColor("#000000");
                                
                                if (!string.IsNullOrWhiteSpace(mat.ClaveRequerimiento))
                                {
                                    c.Item().PaddingTop(2).Row(sr => 
                                    {
                                        sr.ConstantItem(45).Element(e => RenderBarcode(e, mat.ClaveRequerimiento, 14));
                                        sr.RelativeItem().PaddingLeft(2).AlignMiddle().Text(mat.ClaveRequerimiento).FontSize(7).Bold();
                                    });
                                }
                            });

                            // COL 2: Material Descripción + Lote
                            r.RelativeItem(45).PaddingHorizontal(2).Column(c =>
                            {
                                if (!string.IsNullOrWhiteSpace(mat.ClaveMaterial))
                                    c.Item().Text(mat.ClaveMaterial).FontSize(7.5f).FontColor("#000000");
                                
                                if (!string.IsNullOrWhiteSpace(mat.Descripcion))
                                {
                                    c.Item().Text(t =>
                                    {
                                        string[] lines = (mat.Descripcion ?? "").Split(new[] { "\\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                                        foreach (var lineText in lines)
                                        {
                                            t.Span(lineText).FontSize(7.5f).LineHeight(1.2f).FontColor("#000000").Bold();
                                            t.EmptyLine();
                                        }
                                    });
                                }

                                if (!string.IsNullOrWhiteSpace(mat.Lote))
                                    c.Item().PaddingTop(2).Text($"Lote: {mat.Lote}").FontSize(6.5f).Italic().FontColor("#64748b");
                            });

                            // COL 3: Ubicación
                            r.RelativeItem(20).PaddingHorizontal(2).Column(c =>
                            {
                                if (!string.IsNullOrWhiteSpace(mat.Ubicacion))
                                {
                                    c.Item().Row(sr => 
                                    {
                                        sr.ConstantItem(45).Element(e => RenderBarcode(e, mat.Ubicacion, 14));
                                        sr.RelativeItem().PaddingLeft(2).AlignMiddle().Text(mat.Ubicacion).FontSize(7).Bold();
                                    });
                                }
                            });

                            // COL 4: Cantidad
                            r.RelativeItem(15).PaddingHorizontal(2).Column(c =>
                            {
                                c.Item().AlignRight().Text(mat.Cantidad?.ToString("N2") ?? "—")
                                    .FontSize(8).Bold().FontColor("#000000");
                                c.Item().AlignRight()
                                    .Text(string.IsNullOrWhiteSpace(mat.Unidad) ? "pz" : mat.Unidad.ToUpper())
                                    .FontSize(7.5f).FontColor("#000000");
                            });
                        });

                        if (mat.PartesBarra.HasValue || mat.PiezasPor.HasValue || mat.PiezasReg.HasValue)
                        {
                            col.Item().PaddingTop(4).Row(r =>
                            {
                                r.RelativeItem(20).PaddingHorizontal(2)
                                    .Text("Parámetros Calculados").FontSize(6.5f).FontColor("#64748b").Italic();
                                
                                r.RelativeItem(45).PaddingHorizontal(2).Column(c =>
                                {
                                    c.Item().AlignRight().PaddingRight(10).Text(t => {
                                        t.Span("Items/Parte: ").FontSize(6.5f).FontColor("#64748b");
                                        t.Span(mat.PartesBarra?.ToString("N2") ?? "—").FontSize(6.5f).FontColor("#000000").Bold();
                                    });
                                });

                                r.RelativeItem(20).PaddingHorizontal(2).Column(c =>
                                {
                                    c.Item().AlignRight().PaddingRight(5).Text(t => {
                                        t.Span("Piezas Por: ").FontSize(6.5f).FontColor("#64748b");
                                        t.Span(mat.PiezasPor?.ToString("N2") ?? "—").FontSize(6.5f).FontColor("#000000").Bold();
                                    });
                                });

                                r.RelativeItem(15).PaddingHorizontal(2).Column(c =>
                                {
                                    c.Item().AlignRight().Text(t => {
                                        t.Span("Piezas Req: ").FontSize(6.5f).FontColor("#64748b");
                                        t.Span(mat.PiezasReg?.ToString("N2") ?? "—").FontSize(6.5f).FontColor("#000000").Bold();
                                    });
                                });
                            });
                        }
                    });
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  COMPONENTES (BOM)
    // ═══════════════════════════════════════════════════════════
    void ComposeComponentes(IContainer container, List<ComponenteModel> componentes)
    {
        container.PaddingTop(3).Table(table =>
        {
            table.ColumnsDefinition(cols =>
            {
                cols.ConstantColumn(140);
                cols.ConstantColumn(35);
                cols.ConstantColumn(80);
                cols.ConstantColumn(90);
                cols.RelativeColumn();
            });

            table.Header(h =>
            {
                void HCell(string txt, bool center = false, bool right = false)
                {
                    IContainer cell = h.Cell()
                        .Background("#ffffff").BorderBottom(1.5f).BorderColor("#000000")
                        .PaddingHorizontal(4).PaddingVertical(4);

                    if (center) cell = cell.AlignCenter();
                    else if (right) cell = cell.AlignRight();

                    cell.Text(txt).FontSize(6.5f).Bold().FontColor("#000000");
                }

                HCell("OT / Sub-Orden\nParte — Descripción");
                HCell("Rev", center: true);
                HCell("Total Hrs Est", right: true);
                HCell("Cant. Fabricar", center: true);
                HCell("Ini / Fin Prg");
            });

            foreach (var comp in componentes.OrderBy(c => c.JobID))
            {
                IContainer C() => table.Cell().Background("#ffffff")
                    .BorderBottom(0.5f).BorderColor("#cccccc")
                    .PaddingVertical(6).PaddingHorizontal(4);

                C().Column(c =>
                {
                    c.Item().Text(comp.JobID).FontSize(8).Bold().FontColor("#000000");
                    if (!string.IsNullOrWhiteSpace(comp.Parte))
                        c.Item().PaddingLeft(6)
                            .Text($"Parte: {comp.Parte}").FontSize(7.5f).Bold().FontColor("#000000");
                    if (!string.IsNullOrWhiteSpace(comp.Descripcion))
                    {
                        c.Item().PaddingLeft(6).Text(t =>
                        {
                            string[] lines = (comp.Descripcion ?? "").Split(new[] { "\\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                            foreach (var lineText in lines)
                            {
                                t.Span(lineText).FontSize(7).LineHeight(1.2f).FontColor("#000000");
                                t.EmptyLine();
                            }
                        });
                    }
                });

                C().AlignCenter().Text(string.IsNullOrWhiteSpace(comp.Revision) ? "—" : comp.Revision).FontSize(7).FontColor("#000000");
                C().AlignRight().Text(comp.HorasEst?.ToString("N2") ?? "—").FontSize(7).Bold().FontColor("#000000");
                C().AlignCenter().Text(comp.Cantidad.HasValue ? $"{comp.Cantidad:N2} / PZ" : "—").FontSize(7).FontColor("#000000");
                C().Column(c =>
                {
                    if (comp.InicioPrg.HasValue)
                        c.Item().Text($"Ini: {comp.InicioPrg:dd-MMM-yy}").FontSize(6).FontColor("#333333");
                    if (comp.FinPrg.HasValue)
                        c.Item().Text($"Fin: {comp.FinPrg:dd-MMM-yy}").FontSize(6).FontColor("#333333");
                });
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  SECTION HEADERS / FOOTER / BARCODE
    // ═══════════════════════════════════════════════════════════
    static void SectionHeader(IContainer container, string title)
    {
        container.PaddingTop(12).PaddingBottom(4).Column(col =>
        {
            col.Item().LineHorizontal(1.5f).LineColor("#1e40af");
            col.Item().PaddingVertical(2).AlignCenter().Text(title).FontSize(10).Bold().FontColor("#1e40af").LetterSpacing(0.02f);
            col.Item().LineHorizontal(1f).LineColor("#dbeafe");
        });
    }

    void ComposeFooter(IContainer container, ViajeroModel m)
    {
        var hasPadre = !string.IsNullOrWhiteSpace(m.EnsamblePadre);
        var secciones = new List<string> { "RUTA" };
        if (m.Materiales.Any())    secciones.Add("MAT");
        if (m.Componentes.Any())   secciones.Add("BOM");
        var seccionLabel = string.Join(" | ", secciones);

        container.Column(col =>
        {
            col.Item().LineHorizontal(1f).LineColor("#000000");
            col.Item().PaddingTop(3).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(t =>
                    {
                        t.Span("Padre: ").Bold().FontSize(6);
                        t.Span(hasPadre ? m.EnsamblePadre : "—").FontSize(6);
                    });
                });

                row.ConstantItem(220).AlignCenter().Column(c =>
                {
                    c.Item().AlignCenter().Text($"{CompanyName.ToUpper()} — IA.AGUS").FontSize(6);
                    c.Item().AlignCenter().Text(t =>
                    {
                        t.Span("Pág. ").FontSize(6);
                        t.CurrentPageNumber().FontSize(6).Bold();
                        t.Span(" de ").FontSize(6);
                        t.TotalPages().FontSize(6).Bold();
                        t.Span($"  |  {seccionLabel}").FontSize(5.5f);
                    });
                });

                row.RelativeItem().AlignRight().Column(c =>
                {
                    c.Item().AlignRight().Text($"Job: {m.JobID}").FontSize(6).Bold();
                    c.Item().AlignRight().Text($"Parte: {m.NumeroParte} Rev: {m.Revision}").FontSize(6);
                });
            });
        });
    }

    void RenderBarcode(IContainer container, string? data, int height)
    {
        if (string.IsNullOrWhiteSpace(data)) return;
        try
        {
            var barcode = Barcoder.Code128.Code128Encoder.Encode(data.Length > 40 ? data[..40] : data);
            var renderer = new ImageRenderer();
            using var ms = new MemoryStream();
            renderer.Render(barcode, ms);
            container.Height(height).Image(ms.ToArray()).FitArea();
        }
        catch { container.Text("[ERR]").FontSize(5); }
    }
}
