using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Net.Http.Headers;
using McVill.ReportService.Models;

namespace McVill.ReportService.Services;

public class ViajeroService
{
    private readonly string _supabaseUrl;
    private readonly string _supabaseKey;
    private readonly ILogger<ViajeroService> _logger;
    private readonly HttpClient _client;
    // Limita a 8 viajeros procesándose en paralelo para no saturar Supabase
    private static readonly SemaphoreSlim _fetchSemaphore = new(8, 8);

    public ViajeroService(IConfiguration config, ILogger<ViajeroService> logger)
    {
        _supabaseUrl = config["Supabase:Url"]?.TrimEnd('/') ?? "";
        _supabaseKey = config["Supabase:AnonKey"] ?? config["Supabase:Key"] ?? "";
        _logger = logger;

        _client = new HttpClient();
        _client.DefaultRequestHeaders.Add("apikey", _supabaseKey);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _supabaseKey);
        _client.Timeout = TimeSpan.FromSeconds(60);

        _logger.LogInformation("🚀 [SERVICE] Inicializado. URL: {Url}, Key present: {KeyPresent}",
            _supabaseUrl, !string.IsNullOrEmpty(_supabaseKey));
    }

    public async Task<List<ViajeroCatalogModel>> GetViajeroCatalogAsync()
    {
        // Campos confirmados en la tabla viajeros
        var url = $"{_supabaseUrl}/rest/v1/viajeros?select=id,numero_parte,descripcion,cantidad_orden,fecha_orden,fecha_entrega,cliente,ensamble_tl&order=fecha_orden.desc,id.desc";
        _logger.LogInformation("🔍 [REST] Obteniendo catálogo: {Url}", url);

        try
        {
            var response = await _client.GetAsync(url);
            
            _logger.LogInformation("📡 [REST] Status: {Status}", response.StatusCode);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("❌ [REST] Error: {Error}", error);
                return new List<ViajeroCatalogModel>();
            }

            var json = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("📄 [REST] JSON recibido ({Bytes} bytes)", json.Length);
            
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var raw = JsonSerializer.Deserialize<List<ViajeroCatalogRaw>>(json, options) ?? new();
            
            var result = raw.Select(r => new ViajeroCatalogModel
            {
                JobID         = r.Id,
                NumeroParte   = r.NumeroParte,
                Descripcion   = r.Descripcion,
                CantidadOrden = r.CantidadOrden,
                FechaOrden    = r.FechaOrden,
                FechaEntrega  = r.FechaEntrega,
                Cliente       = r.Cliente,
                EnsamblePadre = r.EnsambleTl, // Para retrocompatibilidad
                EnsambleTL    = r.EnsambleTl  // Campo específico industrial
            }).ToList();
            
            _logger.LogInformation("✅ [REST] Catálogo: {Count} viajeros", result.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 [REST] Excepción en GetViajeroCatalogAsync");
            return new List<ViajeroCatalogModel>();
        }
    }



    public async Task<string?> GetLatestJobIDAsync()
    {
        var catalog = await GetViajeroCatalogAsync();
        return catalog.FirstOrDefault()?.JobID;
    }

    public async Task<List<ViajeroCatalogModel>> GetViajeroCatalogByDateRangeAsync(DateTime fechaInicio, DateTime fechaFin)
    {
        var inicio = fechaInicio.ToString("yyyy-MM-dd");
        var fin    = fechaFin.ToString("yyyy-MM-dd");
        var url = $"{_supabaseUrl}/rest/v1/viajeros?select=id,numero_parte,descripcion,cantidad_orden,fecha_orden,fecha_entrega,cliente,ensamble_tl&fecha_orden=gte.{inicio}&fecha_orden=lte.{fin}&order=fecha_orden.asc,id.asc";
        _logger.LogInformation("🗓️ [REST] Catálogo por rango: {Url}", url);

        try
        {
            var response = await _client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("❌ [REST] Error por rango: {Error}", error);
                return new List<ViajeroCatalogModel>();
            }
            var json = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var raw = JsonSerializer.Deserialize<List<ViajeroCatalogRaw>>(json, options) ?? new();
            return raw.Select(r => new ViajeroCatalogModel
            {
                JobID         = r.Id,
                NumeroParte   = r.NumeroParte,
                Descripcion   = r.Descripcion,
                CantidadOrden = r.CantidadOrden,
                FechaOrden    = r.FechaOrden,
                FechaEntrega  = r.FechaEntrega,
                Cliente       = r.Cliente,
                EnsamblePadre = r.EnsambleTl,
                EnsambleTL    = r.EnsambleTl
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 [REST] Excepción en GetViajeroCatalogByDateRangeAsync");
            return new List<ViajeroCatalogModel>();
        }
    }

    public async Task<ViajeroModel?> GetViajeroDataAsync(string jobID)
    {
        _logger.LogInformation("🔍 [REST] Obteniendo datos completos para Job: {JobID}", jobID);

        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                NumberHandling = JsonNumberHandling.AllowReadingFromString
            };
            var opOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            // ── 1. Fetch cabecera, ops, materiales y componentes EN PARALELO ──────────
            var vUrl    = $"{_supabaseUrl}/rest/v1/viajeros?id=eq.{Uri.EscapeDataString(jobID)}&select=*";
            var opUrl   = $"{_supabaseUrl}/rest/v1/viajero_operaciones?or=(viajero_id.eq.{Uri.EscapeDataString(jobID)},job_id.eq.{Uri.EscapeDataString(jobID)})&select=*&order=orden.asc";
            var matUrl  = $"{_supabaseUrl}/rest/v1/viajero_materiales?or=(viajero_id.eq.{Uri.EscapeDataString(jobID)},job_id.eq.{Uri.EscapeDataString(jobID)})&select=*";
            var compUrl = $"{_supabaseUrl}/rest/v1/viajero_componentes?viajero_id=eq.{Uri.EscapeDataString(jobID)}&select=*";
            var parentUrl = $"{_supabaseUrl}/rest/v1/viajero_componentes?job_id_hijo=eq.{Uri.EscapeDataString(jobID)}&select=viajero_id,parte,revision&limit=1";

            var (vJson, opJson, matJson, compJson, parentJson) = await FetchAllAsync(vUrl, opUrl, matUrl, compUrl, parentUrl);

            var vList = JsonSerializer.Deserialize<List<ViajeroModel>>(vJson, options);
            var model = vList?.FirstOrDefault();
            if (model == null) return null;

            model.Operaciones = JsonSerializer.Deserialize<List<OperacionModel>>(opJson, options) ?? new();
            model.Materiales  = JsonSerializer.Deserialize<List<MaterialModel>>(matJson, options) ?? new();
            model.Componentes = JsonSerializer.Deserialize<List<ComponenteModel>>(compJson, options) ?? new();

            // ── 2. Ensamble Padre ─────────────────────────────────────────────────────
            try
            {
                var parentComps = JsonSerializer.Deserialize<List<ParentCompRef>>(parentJson, opOptions);
                var parentRef = parentComps?.FirstOrDefault();
                if (parentRef != null && !string.IsNullOrEmpty(parentRef.ViajeroId))
                {
                    model.EnsamblePadre    = parentRef.ViajeroId;
                    model.EnsamblePadreRev = parentRef.Revision ?? "--";
                    var padreUrl  = $"{_supabaseUrl}/rest/v1/viajeros?id=eq.{Uri.EscapeDataString(parentRef.ViajeroId)}&select=numero_parte,descripcion&limit=1";
                    var padreJson = await _client.GetStringAsync(padreUrl);
                    var padre = JsonSerializer.Deserialize<List<ViajeroMini>>(padreJson, opOptions)?.FirstOrDefault();
                    if (padre != null)
                        model.EnsamblePadreDesc = padre.Descripcion ?? padre.NumeroParte ?? "";
                }
            }
            catch { /* no bloquear */ }

            // ── 3. Ensamble T/L ───────────────────────────────────────────────────────
            if (!string.IsNullOrEmpty(model.EnsambleTL) && model.EnsambleTL != "N/A" && model.EnsambleTL != model.JobID)
            {
                try
                {
                    var tlUrl  = $"{_supabaseUrl}/rest/v1/viajeros?id=eq.{Uri.EscapeDataString(model.EnsambleTL)}&select=numero_parte,descripcion,revision&limit=1";
                    var tlJson = await _client.GetStringAsync(tlUrl);
                    var tl = JsonSerializer.Deserialize<List<ViajeroCatalogModel>>(tlJson, opOptions)?.FirstOrDefault();
                    if (tl != null)
                    {
                        model.EnsambleTLParte = tl.NumeroParte;
                        model.EnsambleTLDesc  = tl.Descripcion;
                        model.EnsambleTLRev   = tl.Revision;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("No se pudieron obtener detalles del Ensamble T/L {TL}: {Msg}", model.EnsambleTL, ex.Message);
                }
            }

            // ── 4. Enriquecer materiales y componentes EN PARALELO ───────────────────
            await Task.WhenAll(
                EnrichMaterialsAsync(model.Materiales),
                EnrichComponentsAsync(model.Componentes)
            );

            _logger.LogInformation("✅ [REST] Datos cargados para {JobID}: {Ops} ops, {Mats} mats, {Comps} comps, Padre: {Padre}",
                jobID, model.Operaciones.Count, model.Materiales.Count, model.Componentes.Count, model.EnsamblePadre);

            return model;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 [REST] Excepción obteniendo datos de {JobID}", jobID);
            return null;
        }
    }

    private async Task<(string v, string op, string mat, string comp, string parent)> FetchAllAsync(
        string vUrl, string opUrl, string matUrl, string compUrl, string parentUrl)
    {
        var t1 = _client.GetStringAsync(vUrl);
        var t2 = _client.GetStringAsync(opUrl);
        var t3 = _client.GetStringAsync(matUrl);
        var t4 = _client.GetStringAsync(compUrl);
        var t5 = _client.GetStringAsync(parentUrl);
        await Task.WhenAll(t1, t2, t3, t4, t5);
        return (t1.Result, t2.Result, t3.Result, t4.Result, t5.Result);
    }

    private async Task EnrichMaterialsAsync(List<MaterialModel> materiales)
    {
        if (materiales == null || materiales.Count == 0) return;

        var tasks = materiales.Select(async mat =>
        {
            // Solo enriquecemos si es un placeholder como "(40124710.01)" o "MATERIAL"
            bool isPlaceholder = string.IsNullOrWhiteSpace(mat.Descripcion) || 
                               mat.Descripcion == "MATERIAL" || 
                               (mat.Descripcion.StartsWith("(") && mat.Descripcion.EndsWith(")")) ||
                               mat.Descripcion.Length < 10;

            if (!isPlaceholder) return;

            try
            {
                string? realDesc = null;

                // 1. Intentar en viajero_materiales (Búsqueda global por clave)
                // Buscamos una entrada que tenga descripción real (no placeholder)
                var globalUrl = $"{_supabaseUrl}/rest/v1/viajero_materiales?clave=eq.{Uri.EscapeDataString(mat.ClaveMaterial)}&descripcion=not.like.(%&select=descripcion&limit=1";
                var gJson = await _client.GetStringAsync(globalUrl);
                var gList = JsonSerializer.Deserialize<List<JsonElement>>(gJson);
                if (gList != null && gList.Count > 0 && gList[0].TryGetProperty("descripcion", out var gDescProp))
                {
                    var foundDesc = gDescProp.GetString();
                    if (!string.IsNullOrWhiteSpace(foundDesc) && foundDesc.Length > 5)
                    {
                        realDesc = foundDesc;
                        _logger.LogInformation("✅ [ENRICH] Encontrado en global viajero_materiales: {Desc}", realDesc);
                    }
                }

                if (string.IsNullOrEmpty(realDesc))
                {
                    // 2. Intentar buscar en 'inventory_items'
                    var iUrl = $"{_supabaseUrl}/rest/v1/inventory_items?item_code=eq.{Uri.EscapeDataString(mat.ClaveMaterial)}&select=item_name&limit=1";
                    var iJson = await _client.GetStringAsync(iUrl);
                    var iList = JsonSerializer.Deserialize<List<JsonElement>>(iJson);
                    if (iList != null && iList.Count > 0 && iList[0].TryGetProperty("item_name", out var iDesc) && !string.IsNullOrWhiteSpace(iDesc.GetString()))
                    {
                        realDesc = iDesc.GetString();
                    }
                }

                if (string.IsNullOrEmpty(realDesc))
                {
                    // 3. Intentar buscar en 'materials'
                    var mUrl = $"{_supabaseUrl}/rest/v1/materials?sku=eq.{Uri.EscapeDataString(mat.ClaveMaterial)}&select=name&limit=1";
                    var mJson = await _client.GetStringAsync(mUrl);
                    var mList = JsonSerializer.Deserialize<List<JsonElement>>(mJson);
                    if (mList != null && mList.Count > 0 && mList[0].TryGetProperty("name", out var mDesc) && !string.IsNullOrWhiteSpace(mDesc.GetString()))
                    {
                        realDesc = mDesc.GetString();
                    }
                }

                if (string.IsNullOrEmpty(realDesc))
                {
                    // 4. Intentar buscar en 'viajeros' (si es un sub-ensamble)
                    var vUrl = $"{_supabaseUrl}/rest/v1/viajeros?id=eq.{Uri.EscapeDataString(mat.ClaveMaterial)}&select=descripcion&limit=1";
                    var vJson = await _client.GetStringAsync(vUrl);
                    var vList = JsonSerializer.Deserialize<List<JsonElement>>(vJson);
                    if (vList != null && vList.Count > 0 && vList[0].TryGetProperty("descripcion", out var vDesc) && !string.IsNullOrWhiteSpace(vDesc.GetString()))
                    {
                        realDesc = vDesc.GetString();
                    }
                }

                if (!string.IsNullOrEmpty(realDesc))
                {
                    // Limpieza de metadatos basura
                    if (realDesc.Contains("Parámetros Calculado") || realDesc.Contains("Parmetros"))
                    {
                        var parts = realDesc.Split(new[] { "pz", "Parámetros", "Parmetros" }, StringSplitOptions.RemoveEmptyEntries);
                        mat.Descripcion = parts[0].Trim();
                    }
                    else
                    {
                        mat.Descripcion = realDesc;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"No se pudo enriquecer material {mat.ClaveMaterial}: {ex.Message}");
            }
        });

        await Task.WhenAll(tasks);
    }

    private async Task EnrichComponentsAsync(List<ComponenteModel> componentes)
    {
        if (componentes == null || componentes.Count == 0) return;
        _logger.LogInformation("🔍 [ENRICH-COMP] Iniciando enriquecimiento para {Count} componentes", componentes.Count);

        var tasks = componentes.Select(async comp =>
        {
            // Solo enriquecemos si es un placeholder como "COMPONENT" o tiene el código
            bool isPlaceholder = string.IsNullOrWhiteSpace(comp.Descripcion) || 
                               comp.Descripcion == "COMPONENT" || 
                               (comp.Descripcion.StartsWith("(") && comp.Descripcion.EndsWith(")")) ||
                               comp.Descripcion.Length < 10;

            if (!isPlaceholder) return;

            try
            {
                // 1. Intentar buscar en 'viajeros' por ID parcial (JobID%)
                var vUrl = $"{_supabaseUrl}/rest/v1/viajeros?id=ilike.{Uri.EscapeDataString(comp.JobID)}%&select=descripcion&limit=1";
                var vJson = await _client.GetStringAsync(vUrl);
                var vList = JsonSerializer.Deserialize<List<JsonElement>>(vJson);
                if (vList != null && vList.Count > 0 && vList[0].TryGetProperty("descripcion", out var vDesc) && !string.IsNullOrWhiteSpace(vDesc.GetString()))
                {
                    comp.Descripcion = vDesc.GetString();
                    _logger.LogInformation("✅ [ENRICH-COMP] Encontrado por ID Parcial: {Desc}", comp.Descripcion);
                    return;
                }

                // 2. Intentar buscar en 'viajeros' por Numero de Parte
                if (!string.IsNullOrEmpty(comp.Parte))
                {
                    var pUrl = $"{_supabaseUrl}/rest/v1/viajeros?numero_parte=eq.{Uri.EscapeDataString(comp.Parte)}&select=descripcion&limit=1";
                    var pJson = await _client.GetStringAsync(pUrl);
                    var pList = JsonSerializer.Deserialize<List<JsonElement>>(pJson);
                    if (pList != null && pList.Count > 0 && pList[0].TryGetProperty("descripcion", out var pDesc) && !string.IsNullOrWhiteSpace(pDesc.GetString()))
                    {
                        comp.Descripcion = pDesc.GetString();
                        _logger.LogInformation("✅ [ENRICH-COMP] Encontrado por Parte: {Desc}", comp.Descripcion);
                        return;
                    }
                }

                // 3. FALLBACK AGRESIVO: Buscar en 'viajero_materiales' por si el JobID aparece en alguna descripción (BOM embebida)
                var mUrl = $"{_supabaseUrl}/rest/v1/viajero_materiales?descripcion=ilike.*{Uri.EscapeDataString(comp.JobID)}*&select=descripcion&limit=1";
                var mJson = await _client.GetStringAsync(mUrl);
                var mList = JsonSerializer.Deserialize<List<JsonElement>>(mJson);
                if (mList != null && mList.Count > 0 && mList[0].TryGetProperty("descripcion", out var mDesc) && !string.IsNullOrWhiteSpace(mDesc.GetString()))
                {
                    string fullDesc = mDesc.GetString()!;
                    // Intentar extraer el nombre que sigue al JobID
                    // Ejemplo: "... 10666443.02 10666443 -- 0.50 1.00/PZ PIPE ASM ..."
                    int index = fullDesc.IndexOf(comp.JobID);
                    if (index >= 0)
                    {
                        string sub = fullDesc.Substring(index);
                        var parts = sub.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                        
                        // Buscamos la primera palabra que NO sea número, guión o código de unidad (como PZ)
                        // Generalmente después de JobID(0), Parte(1), Rev(2), Horas(3), Cantidad(4)
                        var descriptionParts = new List<string>();
                        bool foundDataStart = false;
                        int count = 0;

                        foreach (var p in parts)
                        {
                            count++;
                            if (count <= 5) continue; // Saltar metadatos iniciales
                            
                            // Si parece un nuevo JobID (contiene puntos o es numérico largo), paramos
                            if (descriptionParts.Count > 0 && (p.Contains(".") || (p.Length >= 8 && long.TryParse(p, out _))))
                                break;
                            
                            descriptionParts.Add(p);
                            if (descriptionParts.Count >= 4) break; // Máximo 4 palabras
                        }

                        if (descriptionParts.Count > 0)
                        {
                            comp.Descripcion = string.Join(" ", descriptionParts).Trim();
                            _logger.LogInformation("✅ [ENRICH-COMP] Extraído de BOM embebida: {Desc}", comp.Descripcion);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"No se pudo enriquecer componente {comp.JobID}: {ex.Message}");
            }
        });

        await Task.WhenAll(tasks);
    }

    public async Task<List<ViajeroModel>> GetAllViajeroDataAsync()
    {
        var catalog = await GetViajeroCatalogAsync();
        var results = new List<ViajeroModel>();
        foreach (var item in catalog.Take(10)) // Limitamos a 10 para no saturar
        {
            var data = await GetViajeroDataAsync(item.JobID);
            if (data != null) results.Add(data);
        }
        return results;
    }

    public async Task<List<ViajeroModel>> GetSelectedViajeroDataAsync(List<string> jobIDs)
    {
        var tasks = jobIDs.Select(async id =>
        {
            await _fetchSemaphore.WaitAsync();
            try { return await GetViajeroDataAsync(id); }
            finally { _fetchSemaphore.Release(); }
        });
        var results = await Task.WhenAll(tasks);
        return results.Where(d => d != null).Select(d => d!).ToList();
    }
    public async Task<bool> UpdateViajeroAsync(string id, object data)
    {
        var url = $"{_supabaseUrl}/rest/v1/viajeros?id=eq.{Uri.EscapeDataString(id)}";
        _logger.LogInformation("📝 [REST] Actualizando viajero {Id}: {Url}", id, url);

        try
        {
            var response = await _client.PatchAsJsonAsync(url, data);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("❌ [REST] Error al actualizar: {Error}", error);
                return false;
            }

            _logger.LogInformation("✅ [REST] Viajero {Id} actualizado con éxito", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 [REST] Excepción al actualizar viajero {Id}", id);
            return false;
        }
    }

    public async Task<bool> DeleteViajeroAsync(string id)
    {
        var url = $"{_supabaseUrl}/rest/v1/viajeros?id=eq.{Uri.EscapeDataString(id)}";
        _logger.LogInformation("🗑️ [REST] Eliminando viajero {Id}: {Url}", id, url);

        try
        {
            var response = await _client.DeleteAsync(url);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("❌ [REST] Error al eliminar: {Error}", error);
                return false;
            }

            _logger.LogInformation("✅ [REST] Viajero {Id} eliminado con éxito", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 [REST] Excepción al eliminar viajero {Id}", id);
            return false;
        }
    }

    private static bool IsPlaceholder(string? desc) =>
        string.IsNullOrWhiteSpace(desc) ||
        desc == "MATERIAL" ||
        desc == "COMPONENT" ||
        (desc.StartsWith("(") && desc.EndsWith(")")) ||
        desc.Length < 10;

    // Enriquece todos los viajeros en batch: ≤6 requests totales para N viajeros
    private async Task BatchEnrichAsync(List<ViajeroModel> viajeros)
    {
        // ── Materiales ────────────────────────────────────────────────────────
        var placeholderMats = viajeros
            .SelectMany(v => v.Materiales ?? new())
            .Where(m => IsPlaceholder(m.Descripcion) && !string.IsNullOrWhiteSpace(m.ClaveMaterial))
            .ToList();

        if (placeholderMats.Any())
        {
            var uniqueKeys = placeholderMats.Select(m => m.ClaveMaterial!).Distinct().ToList();
            var descMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var (tableUrl, keyCol, valCol) in new[]
            {
                ($"{_supabaseUrl}/rest/v1/viajero_materiales", "clave", "descripcion"),
                ($"{_supabaseUrl}/rest/v1/inventory_items",    "item_code", "item_name"),
                ($"{_supabaseUrl}/rest/v1/materials",           "sku", "name"),
                ($"{_supabaseUrl}/rest/v1/viajeros",            "id", "descripcion"),
            })
            {
                var missing = uniqueKeys.Except(descMap.Keys, StringComparer.OrdinalIgnoreCase).ToList();
                if (!missing.Any()) break;
                await TryBatchLookup(descMap, missing, tableUrl, keyCol, valCol);
            }

            foreach (var mat in placeholderMats)
                if (!string.IsNullOrEmpty(mat.ClaveMaterial) &&
                    descMap.TryGetValue(mat.ClaveMaterial!, out var desc))
                    mat.Descripcion = desc;
        }

        // ── Componentes ───────────────────────────────────────────────────────
        var placeholderComps = viajeros
            .SelectMany(v => v.Componentes ?? new())
            .Where(c => IsPlaceholder(c.Descripcion) && !string.IsNullOrWhiteSpace(c.JobID))
            .ToList();

        if (placeholderComps.Any())
        {
            var uniqueIds = placeholderComps.Select(c => c.JobID!).Distinct().ToList();
            var descMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            await TryBatchLookup(descMap, uniqueIds, $"{_supabaseUrl}/rest/v1/viajeros", "id", "descripcion");

            // Fallback: por numero_parte
            var stillMissing = placeholderComps
                .Where(c => !descMap.ContainsKey(c.JobID ?? "") && !string.IsNullOrEmpty(c.Parte))
                .Select(c => c.Parte!).Distinct().ToList();
            if (stillMissing.Any())
            {
                var partMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                await TryBatchLookup(partMap, stillMissing, $"{_supabaseUrl}/rest/v1/viajeros", "numero_parte", "descripcion");
                foreach (var comp in placeholderComps.Where(c => !string.IsNullOrEmpty(c.Parte) && partMap.ContainsKey(c.Parte!)))
                    if (!descMap.ContainsKey(comp.JobID ?? ""))
                        descMap[comp.JobID!] = partMap[comp.Parte!];
            }

            foreach (var comp in placeholderComps)
                if (!string.IsNullOrEmpty(comp.JobID) && descMap.TryGetValue(comp.JobID!, out var desc))
                    comp.Descripcion = desc;
        }

        _logger.LogInformation("✅ [BATCH-ENRICH] Materiales: {Mats} placeholders | Componentes: {Comps} placeholders",
            placeholderMats.Count, placeholderComps.Count);
    }

    private async Task TryBatchLookup(
        Dictionary<string, string> map, List<string> keys,
        string tableUrl, string keyField, string valueField)
    {
        const int chunkSize = 100;
        for (int i = 0; i < keys.Count; i += chunkSize)
        {
            var chunk = keys.Skip(i).Take(chunkSize).ToList();
            try
            {
                var keyList = string.Join(",", chunk.Select(Uri.EscapeDataString));
                var url = $"{tableUrl}?{keyField}=in.({keyList})&select={keyField},{valueField}";
                var json = await _client.GetStringAsync(url);
                var items = JsonSerializer.Deserialize<List<JsonElement>>(json);
                if (items == null) continue;

                foreach (var item in items)
                {
                    if (item.TryGetProperty(keyField, out var kProp) &&
                        item.TryGetProperty(valueField, out var vProp))
                    {
                        var k = kProp.GetString();
                        var v = vProp.GetString();
                        if (!string.IsNullOrEmpty(k) && !string.IsNullOrEmpty(v) &&
                            !IsPlaceholder(v) && !map.ContainsKey(k))
                            map[k] = v;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Batch lookup {Table}.{Field} failed: {Msg}", tableUrl, keyField, ex.Message);
            }
        }
    }

    // ── BATCH: 4 requests totales sin importar cuántos viajeros ─────────────────
    public async Task<List<ViajeroModel>> GetBatchViajeroDataAsync(List<string> jobIDs)
    {
        if (jobIDs.Count == 0) return new();

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        // Supabase in() filter: id=in.(id1,id2,id3)
        var idList = string.Join(",", jobIDs.Select(id => Uri.EscapeDataString(id)));

        var vUrl    = $"{_supabaseUrl}/rest/v1/viajeros?id=in.({idList})&select=*";
        var opUrl   = $"{_supabaseUrl}/rest/v1/viajero_operaciones?job_id=in.({idList})&select=*&order=orden.asc";
        var matUrl  = $"{_supabaseUrl}/rest/v1/viajero_materiales?job_id=in.({idList})&select=*";
        var compUrl = $"{_supabaseUrl}/rest/v1/viajero_componentes?viajero_id=in.({idList})&select=*";

        _logger.LogInformation("🚀 [BATCH] Fetching {Count} viajeros con 4 requests en paralelo", jobIDs.Count);

        var t1 = _client.GetStringAsync(vUrl);
        var t2 = _client.GetStringAsync(opUrl);
        var t3 = _client.GetStringAsync(matUrl);
        var t4 = _client.GetStringAsync(compUrl);
        await Task.WhenAll(t1, t2, t3, t4);

        var viajeros   = JsonSerializer.Deserialize<List<ViajeroModel>>(t1.Result, options) ?? new();
        var allOps     = JsonSerializer.Deserialize<List<OperacionModel>>(t2.Result, options) ?? new();
        var allMats    = JsonSerializer.Deserialize<List<MaterialModel>>(t3.Result, options) ?? new();
        var allComps   = JsonSerializer.Deserialize<List<ComponenteModel>>(t4.Result, options) ?? new();

        // Agrupar: ops y materiales por job_id, componentes por viajero_id
        var opsByViajero   = allOps.GroupBy(o => o.JobID ?? "").ToDictionary(g => g.Key, g => g.ToList());
        var matsByViajero  = allMats.GroupBy(m => m.JobID ?? "").ToDictionary(g => g.Key, g => g.ToList());
        var compsByViajero = allComps.GroupBy(c => c.ViajeroId ?? "").ToDictionary(g => g.Key, g => g.ToList());

        foreach (var v in viajeros)
        {
            var vid = v.JobID ?? "";
            v.Operaciones = opsByViajero.GetValueOrDefault(vid) ?? new();
            v.Materiales  = matsByViajero.GetValueOrDefault(vid) ?? new();
            v.Componentes = compsByViajero.GetValueOrDefault(vid) ?? new();
        }

        // Enriquecer todos los placeholders con batch de 6 requests totales
        await BatchEnrichAsync(viajeros);

        // Preservar el orden original pedido
        var map = viajeros.ToDictionary(v => v.JobID ?? "");
        return jobIDs.Select(id => map.GetValueOrDefault(id)).Where(v => v != null).Select(v => v!).ToList();
    }
}
