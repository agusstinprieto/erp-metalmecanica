using QuestPDF.Infrastructure;
using McVill.ReportService.Services;
using McVill.ReportService.Reports;
using McVill.ReportService.Models;
using System.Text.Json;
using QuestPDF.Fluent;
using QuestPDF.Previewer;
using System.Diagnostics;
// AGUS PRO: Trigger Railway Webhook Deploy
var builder = WebApplication.CreateBuilder(args);

// Configurar Licencia QuestPDF (Requerido en v2022.12+)
QuestPDF.Settings.License = LicenseType.Community;

// 🚀 IA.AGUS: Resolver fuentes para Linux/Railway (PDFsharp 6+)
PdfSharp.Fonts.GlobalFontSettings.FontResolver = new McVill.ReportService.Reports.McVillFontResolver();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<ViajeroService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS manual — garantiza headers en TODAS las respuestas, incluyendo 500
app.Use(async (context, next) =>
{
    context.Response.Headers["Access-Control-Allow-Origin"]  = "*";
    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS";
    context.Response.Headers["Access-Control-Allow-Headers"] = "*";
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 204;
        return;
    }
    await next();
});

app.UseCors("AllowAll");

// Middleware de logging global
app.Use(async (context, next) => {
    Console.WriteLine($"🔍 [BRIDGE] Request: {context.Request.Method} {context.Request.Path}");
    await next();
});

app.MapGet("/", () => Results.Ok(new { status = "Reporting Service is running", port = 5005, db = "Supabase Cloud" }));

app.MapGet("/api/reports/viajero/list", async (ViajeroService db) =>
{
    var catalog = await db.GetViajeroCatalogAsync();
    return Results.Ok(catalog);
});



// 🚀 AGUS PRO: Generar reporte masivo (Seleccionados)
// Definir antes de {jobID} para evitar que 'print-selected' se tome como un ID
app.MapPost("/api/reports/viajero/print-selected", async (HttpContext ctx, ViajeroService db) =>
{
    using var reader = new System.IO.StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    List<string> jobIds;
    try
    {
        var payload = System.Text.Json.JsonDocument.Parse(body);
        jobIds = payload.RootElement.GetProperty("jobIds")
                        .EnumerateArray()
                        .Select(j => j.GetString() ?? "")
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .ToList();
    }
    catch
    {
        return Results.BadRequest("Se esperaba JSON: { \"jobIds\": [\"ID1\", \"ID2\"] }");
    }

    if (!jobIds.Any()) return Results.BadRequest("La lista de jobIds está vacía.");

    Console.WriteLine($"📊 [PRINT-SELECTED] {jobIds.Count} job(s): {string.Join(", ", jobIds.Take(5))}...");
    try
    {
        var dataList = await db.GetBatchViajeroDataAsync(jobIds);
        if (!dataList.Any()) return Results.NotFound("No se encontraron datos para los IDs proporcionados.");

        var companyName = ctx.Request.Headers["X-Company-Name"].ToString();
        if (string.IsNullOrEmpty(companyName)) companyName = "ERP Industrial";

        var document = new ViajeroDocument(dataList, companyName);
        var pdf = document.GeneratePdf();
        Console.WriteLine("✅ PDF print-selected generado exitosamente.");
        return Results.File(pdf, "application/pdf", $"Viajero_Seleccionados_{DateTime.Now:yyyyMMdd_HHmm}.pdf");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"💥 [PRINT-SELECTED] Error: {ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}");
        return Results.Problem($"Error al generar PDF: {ex.GetType().Name} — {ex.Message}");
    }
});

// Manejador GET de diagnóstico para print-selected
app.MapGet("/api/reports/viajero/print-selected", () => 
    Results.BadRequest("Este endpoint requiere una petición POST con el body JSON { \"jobIds\": [...] }"));

app.MapGet("/api/reports/viajero/{jobID}", async (string jobID, bool? preview, ViajeroService db, HttpContext ctx) =>
{
    Console.WriteLine($"📢 [REQUEST] Generando reporte para: {jobID}");
    string targetID = jobID;
    
    if (jobID.ToLower() == "latest")
    {
        Console.WriteLine("🔍 Modo 'latest' detectado, buscando el ID más reciente...");
        targetID = await db.GetLatestJobIDAsync() ?? "";
        if (string.IsNullOrEmpty(targetID)) return Results.NotFound("No se encontraron registros en la base de datos.");
    }

    Console.WriteLine($"🔍 Recuperando datos de DB para: {targetID}");
    var data = await db.GetViajeroDataAsync(targetID);
    
    if (data == null) {
        Console.WriteLine($"❌ No se encontraron datos para: {targetID}");
        return Results.NotFound();
    }

    Console.WriteLine("🎨 Generando PDF con QuestPDF...");
    var companyName = ctx.Request.Headers["X-Company-Name"].ToString();
    if (string.IsNullOrEmpty(companyName)) companyName = "ERP Industrial";

    var document = new ViajeroDocument(new List<ViajeroModel> { data }, companyName);
    
    // 🚀 AGUS PRO: Soporte para QuestPDF Previewer
    if (preview == true)
    {
        Console.WriteLine("📺 [PREVIEW] Enviando a QuestPDF Previewer...");
        document.ShowInPreviewer();
        return Results.Ok(new { message = "Reporte enviado al Previewer" });
    }

    var pdf = document.GeneratePdf();
    Console.WriteLine("✅ PDF generado con éxito");
    
    return Results.File(pdf, "application/pdf", $"Viajero_{targetID}.pdf");
});


// 🚀 AGUS PRO: Catálogo filtrado por rango de fechas (acepta 'from'/'to' O 'fechaInicio'/'fechaFin')
app.MapGet("/api/reports/viajero/list-by-date", async (
    string? fechaInicio,
    string? fechaFin,
    string? from,
    string? to,
    ViajeroService db) =>
{
    var startStr = fechaInicio ?? from;
    var endStr   = fechaFin   ?? to;

    if (string.IsNullOrEmpty(startStr) || string.IsNullOrEmpty(endStr))
    {
        var toDate   = DateTime.Today;
        var fromDate = toDate.AddDays(-30);
        var catalogDefault = await db.GetViajeroCatalogByDateRangeAsync(fromDate, toDate);
        return Results.Ok(catalogDefault);
    }

    if (!DateTime.TryParse(startStr, out var inicio) || !DateTime.TryParse(endStr, out var fin))
        return Results.BadRequest("Formato de fechas inválido. Use yyyy-MM-dd.");

    var catalog = await db.GetViajeroCatalogByDateRangeAsync(inicio, fin);
    return Results.Ok(catalog);
});


app.MapGet("/api/reports/viajero/print-by-date", async (
    string? fechaInicio, 
    string? fechaFin, 
    ViajeroService db,
    HttpContext ctx) =>
{
    List<ViajeroCatalogModel> catalog;
    if (!string.IsNullOrEmpty(fechaInicio) && !string.IsNullOrEmpty(fechaFin) 
        && DateTime.TryParse(fechaInicio, out var inicio) 
        && DateTime.TryParse(fechaFin, out var fin))
    {
        catalog = await db.GetViajeroCatalogByDateRangeAsync(inicio, fin);
    }
    else
    {
        catalog = await db.GetViajeroCatalogAsync();
    }

    var jobIds = catalog.Select(c => c.JobID).ToList();
    var dataList = await db.GetSelectedViajeroDataAsync(jobIds);

    var companyName = ctx.Request.Headers["X-Company-Name"].ToString();
    if (string.IsNullOrEmpty(companyName)) companyName = "ERP Industrial";

    var document = new ViajeroDocument(dataList, companyName);
    var pdf = document.GeneratePdf();
    return Results.File(pdf, "application/pdf", $"Viajeros_{fechaInicio}_{fechaFin}.pdf");
});


app.MapPost("/api/editor/open-project", () => 
{
    try 
    {
        var slnPath = Path.Combine(Directory.GetCurrentDirectory(), "reporting-service.sln");
        
        // 🚀 AGUS PRO: Abrir la solución en Visual Studio
        Process.Start(new ProcessStartInfo {
            FileName = "cmd",
            Arguments = $"/c start \"\" \"{slnPath}\"",
            UseShellExecute = true,
            CreateNoWindow = true
        });

        return Results.Ok(new { message = "Abriendo solución en Visual Studio..." });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error al abrir el proyecto: {ex.Message}");
    }
});


// Habilitar depuración de QuestPDF para capturar errores de layout
QuestPDF.Settings.EnableDebugging = false;

// 🚀 AGUS PRO: Eliminar viajero
app.MapDelete("/api/reports/viajero/{id}", async (string id, ViajeroService db) =>
{
    var success = await db.DeleteViajeroAsync(id);
    return success ? Results.Ok() : Results.Problem("No se pudo eliminar el registro");
});

// 🚀 AGUS PRO: Actualizar viajero
app.MapPatch("/api/reports/viajero/{id}", async (string id, JsonElement data, ViajeroService db) =>
{
    var success = await db.UpdateViajeroAsync(id, data);
    return success ? Results.Ok() : Results.Problem("No se pudo actualizar el registro");
});

// ── MigraDoc: Viajero individual (MIT, sin costo de licencia) ────────────────
app.MapGet("/api/reports/viajero/{jobID}/migra", async (string jobID, ViajeroService db, HttpContext ctx) =>
{
    Console.WriteLine($"📄 [MIGRADOC] Generando reporte para: {jobID}");
    string targetID = jobID;
    if (jobID.ToLower() == "latest")
    {
        targetID = await db.GetLatestJobIDAsync() ?? "";
        if (string.IsNullOrEmpty(targetID)) return Results.NotFound("No se encontraron registros en la base de datos.");
    }

    var data = await db.GetViajeroDataAsync(targetID);
    if (data == null) return Results.NotFound($"Viajero '{targetID}' no encontrado.");

    try
    {
        var companyName = ctx.Request.Headers["X-Company-Name"].ToString();
        if (string.IsNullOrEmpty(companyName)) companyName = "ERP Industrial";

        var pdf = ViajeroMigraDocument.Generate(data, companyName);
        Console.WriteLine("✅ [MIGRADOC] PDF generado exitosamente.");
        return Results.File(pdf, "application/pdf", $"Viajero_{jobID}_migra.pdf");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"💥 [MIGRADOC] Error: {ex.GetType().Name}: {ex.Message}");
        return Results.Problem($"Error al generar PDF (MigraDoc): {ex.Message}");
    }
});

// ── MigraDoc: Batch de viajeros seleccionados ────────────────────────────────
app.MapPost("/api/reports/viajero/migra/print-selected", async (HttpContext ctx, ViajeroService db) =>
{
    using var reader = new System.IO.StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    List<string> jobIds;
    try
    {
        var payload = System.Text.Json.JsonDocument.Parse(body);
        jobIds = payload.RootElement.GetProperty("jobIds")
                        .EnumerateArray()
                        .Select(j => j.GetString() ?? "")
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .ToList();
    }
    catch
    {
        return Results.BadRequest("Se esperaba JSON: { \"jobIds\": [\"ID1\", \"ID2\"] }");
    }

    if (!jobIds.Any()) return Results.BadRequest("La lista de jobIds está vacía.");

    Console.WriteLine($"📊 [MIGRADOC] {jobIds.Count} job(s)");
    try
    {
        var dataList = await db.GetBatchViajeroDataAsync(jobIds);
        if (!dataList.Any()) return Results.NotFound("No se encontraron datos para los IDs.");

        var companyName = ctx.Request.Headers["X-Company-Name"].ToString();
        if (string.IsNullOrEmpty(companyName)) companyName = "ERP Industrial";

        var pdf = ViajeroMigraDocument.Generate(dataList, companyName);
        Console.WriteLine("✅ [MIGRADOC] PDF batch generado.");
        return Results.File(pdf, "application/pdf", $"Viajeros_Seleccionados_{DateTime.Now:yyyyMMdd_HHmm}.pdf");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"💥 [MIGRADOC] Error batch: {ex.Message}");
        return Results.Problem($"Error al generar PDF batch (MigraDoc): {ex.Message}");
    }
});

app.Run("http://0.0.0.0:5005");



public record CodeFile(string FileName, string Content);
