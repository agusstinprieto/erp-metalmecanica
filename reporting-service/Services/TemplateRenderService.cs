using Scriban;
using Scriban.Runtime;
using McVill.ReportService.Models;
using Barcoder;
using Barcoder.Renderer.Image;

namespace McVill.ReportService.Services;

/// <summary>
/// Convierte un ViajeroModel en un HTML completo (página entera) listo para PuppeteerSharp.
///
/// FLUJO:
///   ViajeroModel
///     → TemplateRenderService  (inyecta datos + genera barcodes como base64)
///       → Templates/viajero-full.html  (Scriban rellena {{ variables }})
///         → HTML string con datos reales + barcodes embebidos
///           → PuppeteerPdfService  (Chrome genera el PDF)
///             → PDF bytes
///
/// RESULTADO:
///   El HTML devuelto se puede abrir en un navegador para ver una preview
///   exacta de cómo quedará el PDF.
/// </summary>
public class TemplateRenderService
{
    static readonly string TemplatesDir =
        Path.Combine(AppContext.BaseDirectory, "Templates");

    static readonly System.Globalization.CultureInfo MX =
        new("es-MX");

    // ── Punto de entrada principal ──────────────────────────────────
    public string RenderViajeroFull(ViajeroModel m)
    {
        var templatePath = Path.Combine(TemplatesDir, "viajero-full.html");
        var templateText = File.ReadAllText(templatePath);

        var template = Template.Parse(templateText);
        if (template.HasErrors)
        {
            var errors = string.Join("\n", template.Messages.Select(x => x.Message));
            throw new InvalidOperationException($"Error en template HTML:\n{errors}");
        }

        var ctx = new TemplateContext { StrictVariables = false };
        ctx.PushGlobal(BuildGlobals(m));

        return template.Render(ctx);
    }

    // ── Construye todas las variables que ve el template ────────────
    ScriptObject BuildGlobals(ViajeroModel m)
    {
        var globals = new ScriptObject();

        // ── job ─────────────────────────────────────────────────────
        var job = new ScriptObject();
        job["id"]                = m.JobID ?? "";
        job["numero_parte"]      = m.NumeroParte ?? "—";
        job["descripcion"]       = m.Descripcion ?? "—";
        job["revision"]          = m.Revision ?? "—";
        job["cantidad_orden"]    = m.CantidadOrden.HasValue ? $"{m.CantidadOrden:N0} PZ" : "—";
        job["cant_fabricada"]    = m.CantFabricada.HasValue ? $"{m.CantFabricada:N0}" : "0";
        job["cliente"]           = m.Cliente ?? "—";
        job["dibujo"]            = !string.IsNullOrWhiteSpace(m.Dibujo) ? m.Dibujo : (m.NumeroParte ?? "—");
        job["oc_cliente"]        = m.OCCliente ?? "—";
        job["linea"]             = !string.IsNullOrWhiteSpace(m.Linea) ? m.Linea : "ESTÁNDAR";
        job["cotizacion"]        = m.Cotizacion ?? "—";
        job["horas_est"]         = m.HorasEstTotales.HasValue ? $"{m.HorasEstTotales:N2} HRS" : "—";
        job["ensamble_padre"]    = !string.IsNullOrWhiteSpace(m.EnsamblePadre) ? m.EnsamblePadre : "N/A";
        job["ensamble_tl"]       = !string.IsNullOrWhiteSpace(m.EnsambleTL) ? m.EnsambleTL : "TOP LEVEL";
        job["fecha_orden"]       = m.FechaOrden?.ToString("dd-MMM-yyyy", MX) ?? "—";
        job["fecha_entrega"]     = m.FechaEntrega?.ToString("dd-MMM-yyyy", MX) ?? "—";
        job["fecha_impresion"]   = DateTime.Now.ToString("dd-MMM-yy HH:mm", MX);
        job["notas"]             = m.Notas ?? "";
        job["tiene_notas"]       = !string.IsNullOrWhiteSpace(m.Notas);
        job["tiene_componentes"] = m.Componentes.Any();

        // Barcode del Job ID embebido como imagen base64
        job["barcode_img"] = MakeBarcodeImgTag(m.JobID, 30);
        globals["job"] = job;

        // ── operaciones ─────────────────────────────────────────────
        var ops = new ScriptArray();
        foreach (var op in m.Operaciones.OrderBy(o => o.Orden))
        {
            var o = new ScriptObject();
            o["orden"]       = op.Orden?.ToString() ?? "—";
            o["ct"]          = op.CentroTrabajo ?? "—";
            o["clave"]       = op.ClaveOperacion ?? "";
            o["nombre"]      = op.NombreOperacion ?? "";
            o["descripcion"] = op.DescripcionDetallada ?? "";
            o["config"]      = op.Configuracion?.ToString("F2") ?? "0.00";
            o["tasa"]        = !string.IsNullOrWhiteSpace(op.TasaProceso) ? op.TasaProceso : "0.00";
            o["minutos"]     = op.TiempoEstimado?.ToString("N2") ?? "0.00";
            // Barcode del centro de trabajo embebido
            o["barcode_img"] = MakeBarcodeImgTag(op.CentroTrabajo, 16);
            ops.Add(o);
        }
        globals["operaciones"] = ops;

        // ── materiales ──────────────────────────────────────────────
        var mats = new ScriptArray();
        foreach (var mat in m.Materiales.OrderBy(x => x.ClaveMaterial))
        {
            var mt = new ScriptObject();
            mt["req"]              = mat.ClaveRequerimiento ?? "—";
            mt["clave"]            = mat.ClaveMaterial ?? "—";
            mt["descripcion"]      = mat.Descripcion ?? "—";
            mt["ubicacion"]        = mat.Ubicacion ?? "—";
            mt["cantidad"]         = mat.Cantidad?.ToString("N2") ?? "—";
            mt["unidad"]           = !string.IsNullOrWhiteSpace(mat.Unidad) ? mat.Unidad.ToUpper() : "PZ";
            mt["vencimiento"]      = mat.Vencimiento?.ToString("dd-MMM-yy", MX) ?? "—";
            mt["lote"]             = mat.Lote ?? "";
            mt["tiene_lote"]       = !string.IsNullOrWhiteSpace(mat.Lote);
            // Barcodes embebidos
            mt["barcode_req_img"]  = MakeBarcodeImgTag(mat.ClaveRequerimiento, 14);
            mt["barcode_ubi_img"]  = MakeBarcodeImgTag(mat.Ubicacion, 14);
            mats.Add(mt);
        }
        globals["materiales"] = mats;

        // ── componentes ─────────────────────────────────────────────
        var comps = new ScriptArray();
        foreach (var comp in m.Componentes.OrderBy(c => c.JobID))
        {
            var cp = new ScriptObject();
            cp["job_id"]      = comp.JobID ?? "—";
            cp["parte"]       = comp.Parte ?? "—";
            cp["revision"]    = comp.Revision ?? "—";
            cp["descripcion"] = comp.Descripcion ?? "—";
            cp["horas_est"]   = comp.HorasEst?.ToString("N2") ?? "—";
            cp["cantidad"]    = comp.Cantidad.HasValue ? $"{comp.Cantidad:N2} PZ" : "—";
            cp["inicio"]      = comp.InicioPrg?.ToString("dd-MMM-yy", MX) ?? "—";
            cp["fin"]         = comp.FinPrg?.ToString("dd-MMM-yy", MX) ?? "—";
            comps.Add(cp);
        }
        globals["componentes"] = comps;

        return globals;
    }

    // ── Genera un <img> con el barcode como base64 ──────────────────
    // Así el HTML es completamente auto-contenido (no depende de archivos externos).
    static string MakeBarcodeImgTag(string? data, int height)
    {
        if (string.IsNullOrWhiteSpace(data)) return "";
        try
        {
            var barcode  = Barcoder.Code128.Code128Encoder.Encode(data.Length > 40 ? data[..40] : data);
            var renderer = new ImageRenderer();
            using var ms = new MemoryStream();
            renderer.Render(barcode, ms);
            var b64 = Convert.ToBase64String(ms.ToArray());
            return $"<img src=\"data:image/png;base64,{b64}\" style=\"height:{height}px;display:block\" alt=\"{data}\"/>";
        }
        catch
        {
            return $"<span style='font-size:6pt;color:red'>[BC ERR]</span>";
        }
    }
}
