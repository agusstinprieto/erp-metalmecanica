namespace McVill.ReportService.Services;

/// <summary>
/// Cache de PDFs en disco.
/// Cada viajero se guarda como {jobId}.pdf en la carpeta pdf-cache/.
/// Se invalida automáticamente cuando el viajero se actualiza o elimina.
/// </summary>
public class PdfCacheService
{
    static readonly string CacheDir = Path.Combine(AppContext.BaseDirectory, "pdf-cache");

    public PdfCacheService() => Directory.CreateDirectory(CacheDir);

    string CachePath(string jobId) =>
        Path.Combine(CacheDir, $"{SanitizeId(jobId)}.pdf");

    public bool IsCached(string jobId) => File.Exists(CachePath(jobId));

    public byte[]? Get(string jobId)
    {
        var path = CachePath(jobId);
        return File.Exists(path) ? File.ReadAllBytes(path) : null;
    }

    public void Save(string jobId, byte[] pdf)
    {
        Directory.CreateDirectory(CacheDir);
        File.WriteAllBytes(CachePath(jobId), pdf);
    }

    public void Invalidate(string jobId)
    {
        var path = CachePath(jobId);
        if (File.Exists(path)) File.Delete(path);
    }

    public (int total, int cached, long sizeKb) Stats()
    {
        var files = Directory.GetFiles(CacheDir, "*.pdf");
        return (files.Length, files.Length, files.Sum(f => new FileInfo(f).Length) / 1024);
    }

    static string SanitizeId(string id) =>
        string.Concat(id.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
}
