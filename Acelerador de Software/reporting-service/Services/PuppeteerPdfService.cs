using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace McVill.ReportService.Services;

/// <summary>
/// Genera PDFs a partir de HTML usando un navegador Chrome headless (PuppeteerSharp).
///
/// PRIMERA VEZ:
///   La primera llamada descarga automáticamente Chromium (~130 MB) y lo guarda
///   en la carpeta .local-chromium de este proyecto. Sólo ocurre una vez.
///
/// CÓMO FUNCIONA:
///   1. Recibe un string HTML (ya renderizado por Scriban con los datos reales)
///   2. Abre una página de Chrome en modo "headless" (sin ventana visible)
///   3. Carga el HTML
///   4. Ejecuta "Imprimir a PDF" con configuración Letter
///   5. Devuelve los bytes del PDF
/// </summary>
public class PuppeteerPdfService : IAsyncDisposable
{
    IBrowser? _browser;
    readonly SemaphoreSlim _semaphore = new(1, 1);
    bool _downloaded = false;

    // ── Inicialización (llama esto al arrancar el servidor) ─────────
    public async Task InitializeAsync()
    {
        if (_downloaded) return;

        var systemChrome = Environment.GetEnvironmentVariable("PUPPETEER_EXECUTABLE_PATH");
        if (!string.IsNullOrEmpty(systemChrome))
        {
            Console.WriteLine($"✅ [Puppeteer] Usando Chrome del sistema: {systemChrome}");
            _downloaded = true;
            return;
        }

        Console.WriteLine("🌐 [Puppeteer] Verificando Chromium...");
        var fetcher = new BrowserFetcher();
        await fetcher.DownloadAsync();
        _downloaded = true;
        Console.WriteLine("✅ [Puppeteer] Chromium listo.");
    }

    // ── Genera el PDF desde un string HTML ─────────────────────────
    public async Task<byte[]> GeneratePdfAsync(string htmlContent)
    {
        await _semaphore.WaitAsync();
        try
        {
            if (_browser == null)
            {
                var opts = new LaunchOptions
                {
                    Headless = true,
                    Args = new[] { "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage" }
                };
                var systemChrome = Environment.GetEnvironmentVariable("PUPPETEER_EXECUTABLE_PATH");
                if (!string.IsNullOrEmpty(systemChrome))
                    opts.ExecutablePath = systemChrome;
                _browser = await Puppeteer.LaunchAsync(opts);
            }

            using var page = await _browser.NewPageAsync();

            // Cargamos el HTML directamente (no necesitamos un servidor)
            // Networkidle0 = esperar a que no haya peticiones de red por 500ms
            await page.SetContentAsync(htmlContent, new NavigationOptions
            {
                WaitUntil = new[] { WaitUntilNavigation.Networkidle0 }
            });

            // PdfDataAsync devuelve byte[] directamente (API de PuppeteerSharp 20.x)
            var pdfBytes = await page.PdfDataAsync(new PdfOptions
            {
                Format          = PaperFormat.Letter,
                PrintBackground = true,   // imprime colores de fondo (tablas azules)
                MarginOptions   = new MarginOptions
                {
                    Top    = "0",
                    Bottom = "0",
                    Left   = "0",
                    Right  = "0",
                }
            });

            return pdfBytes;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_browser != null)
            await _browser.DisposeAsync();
        _semaphore.Dispose();
    }
}
