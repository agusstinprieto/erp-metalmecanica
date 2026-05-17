using System.Text.Json.Serialization;

namespace McVill.ReportService.Models;

public class ViajeroModel
{
    [JsonPropertyName("id")]
    public string JobID { get; set; } = string.Empty;
    [JsonPropertyName("cliente")]
    public string Cliente { get; set; } = string.Empty;
    [JsonPropertyName("numero_parte")]
    public string NumeroParte { get; set; } = string.Empty;
    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;
    [JsonPropertyName("revision")]
    public string Revision { get; set; } = string.Empty;
    [JsonPropertyName("cantidad_orden")]
    public double? CantidadOrden { get; set; }
    [JsonPropertyName("cant_fabricada")]
    public double? CantFabricada { get; set; }
    [JsonPropertyName("oc_cliente")]
    public string OCCliente { get; set; } = string.Empty;
    [JsonPropertyName("linea")]
    public string Linea { get; set; } = string.Empty;
    [JsonPropertyName("ensamble_tl")]
    public string EnsambleTL { get; set; } = string.Empty;
    [JsonPropertyName("fecha_orden")]
    public DateTime? FechaOrden { get; set; }
    [JsonPropertyName("fecha_entrega")]
    public DateTime? FechaEntrega { get; set; }
    [JsonPropertyName("dibujo")]
    public string Dibujo { get; set; } = string.Empty;
    [JsonPropertyName("cotizacion")]
    public string Cotizacion { get; set; } = string.Empty;
    [JsonPropertyName("horas_est_totales")]
    public double? HorasEstTotales { get; set; }
    [JsonPropertyName("notas")]
    public string Notas { get; set; } = string.Empty;

    public string DrawingPath { get; set; } = string.Empty;
    
    // Detalle del Ensamble T/L (Top Level)
    public string EnsambleTLParte { get; set; } = string.Empty;
    public string EnsambleTLDesc { get; set; } = string.Empty;
    public string EnsambleTLRev { get; set; } = string.Empty;
    
    // Jerarquía de Ensambles — calculado en servicio, NO viene de la tabla viajeros
    public string EnsamblePadre { get; set; } = string.Empty;
    public string EnsamblePadreDesc { get; set; } = string.Empty;
    public string EnsamblePadreRev { get; set; } = string.Empty;

    public List<OperacionModel> Operaciones { get; set; } = new();
    public List<MaterialModel> Materiales { get; set; } = new();
    public List<InspeccionModel> Inspecciones { get; set; } = new();
    public List<HerramentalModel> Herramentales { get; set; } = new();
    public List<ComponenteModel> Componentes { get; set; } = new();
    public AprobacionModel Aprobaciones { get; set; } = new();
}

public class OperacionModel
{
    [JsonPropertyName("job_id")]
    public string JobID { get; set; } = string.Empty;
    [JsonPropertyName("orden")]
    public int? Orden { get; set; }
    [JsonPropertyName("clave_operacion")]
    public string ClaveOperacion { get; set; } = string.Empty;
    [JsonPropertyName("nombre_operacion")]
    public string NombreOperacion { get; set; } = string.Empty;
    [JsonPropertyName("centro_trabajo")]
    public string CentroTrabajo { get; set; } = string.Empty;
    [JsonPropertyName("descripcion_detallada")]
    public string DescripcionDetallada { get; set; } = string.Empty;
    [JsonPropertyName("configuracion")]
    public double? Configuracion { get; set; }
    [JsonPropertyName("tasa_proceso")]
    public string TasaProceso { get; set; } = string.Empty;
    [JsonPropertyName("tiempo_estimado")]
    public double? TiempoEstimado { get; set; } // Horas Proceso
    [JsonPropertyName("fecha_inicio_prg")]
    public DateTime? InicioPrg { get; set; }
    [JsonPropertyName("fecha_fin_prg")]
    public DateTime? FinPrg { get; set; }
}

public class ComponenteModel
{
    [JsonPropertyName("viajero_id")]
    public string ViajeroId { get; set; } = string.Empty;
    [JsonPropertyName("job_id_hijo")]
    public string JobID { get; set; } = string.Empty;
    [JsonPropertyName("parte")]
    public string Parte { get; set; } = string.Empty;
    [JsonPropertyName("revision")]
    public string Revision { get; set; } = string.Empty;
    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;
    [JsonPropertyName("horas_est")]
    public double? HorasEst { get; set; }
    [JsonPropertyName("cantidad")]
    public double? Cantidad { get; set; }
    [JsonPropertyName("fecha_inicio_prg")]
    public DateTime? InicioPrg { get; set; }
    [JsonPropertyName("fecha_fin_prg")]
    public DateTime? FinPrg { get; set; }
}

public class MaterialModel
{
    [JsonPropertyName("job_id")]
    public string JobID { get; set; } = string.Empty;
    [JsonPropertyName("clave")]
    public string ClaveMaterial { get; set; } = string.Empty;
    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;
    [JsonPropertyName("descripcion_detallada")]
    public string DescripcionDetallada { get; set; } = string.Empty;
    [JsonPropertyName("cantidad")]
    public double? Cantidad { get; set; }
    [JsonPropertyName("unidad")]
    public string Unidad { get; set; } = string.Empty;
    [JsonPropertyName("ubicacion")]
    public string Ubicacion { get; set; } = string.Empty;
    [JsonPropertyName("requisicion")]
    public string Requisicion { get; set; } = string.Empty;
    [JsonPropertyName("clave_requerimiento")]
    public string ClaveRequerimiento { get; set; } = string.Empty;
    [JsonPropertyName("fecha_vencimiento")]
    public DateTime? Vencimiento { get; set; }
    [JsonPropertyName("lote")]
    public string Lote { get; set; } = string.Empty;
    
    // Parámetros de Corte / Industriales
    [JsonPropertyName("partes_barra")]
    public double? PartesBarra { get; set; }
    [JsonPropertyName("longitud_parte")]
    public double? LongitudParte { get; set; }
    [JsonPropertyName("corte")]
    public double? Corte { get; set; }
    [JsonPropertyName("fin_barra")]
    public double? FinBarra { get; set; }
    [JsonPropertyName("piezas_por")]
    public double? PiezasPor { get; set; }
    [JsonPropertyName("piezas_reg")]
    public double? PiezasReg { get; set; }
}

public class InspeccionModel
{
    public string Caracteristica { get; set; } = string.Empty;
    public string Especificacion { get; set; } = string.Empty;
    public string Metodo { get; set; } = string.Empty;
    public string Frecuencia { get; set; } = string.Empty;
}

public class HerramentalModel
{
    public string Codigo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string Ubicacion { get; set; } = string.Empty;
}

public class AprobacionModel
{
    public string Ingenieria { get; set; } = "ING. AGUSTIN PRIETO";
    public string Produccion { get; set; } = "OPERACIONES PLANTA";
    public string Calidad { get; set; } = "ASEGURAMIENTO CALIDAD";
}

public class ViajeroCatalogModel
{
    [JsonPropertyName("id")]
    public string JobID { get; set; } = string.Empty;
    [JsonPropertyName("numero_parte")]
    public string NumeroParte { get; set; } = string.Empty;
    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;
    [JsonPropertyName("cantidad_orden")]
    public double? CantidadOrden { get; set; }
    [JsonPropertyName("fecha_orden")]
    public DateTime? FechaOrden { get; set; }
    [JsonPropertyName("fecha_entrega")]
    public DateTime? FechaEntrega { get; set; }
    [JsonPropertyName("revision")]
    public string Revision { get; set; } = string.Empty;
    [JsonPropertyName("cliente")]
    public string Cliente { get; set; } = string.Empty;
    [JsonPropertyName("ensamble_padre")]
    public string EnsamblePadre { get; set; } = string.Empty;
    [JsonPropertyName("ensamble_tl")]
    public string EnsambleTL { get; set; } = string.Empty;

}

/// <summary>Modelo RAW para deserializar desde Supabase — usa nombres reales de columnas</summary>
public class ViajeroCatalogRaw
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    [JsonPropertyName("numero_parte")]
    public string NumeroParte { get; set; } = string.Empty;
    [JsonPropertyName("descripcion")]
    public string Descripcion { get; set; } = string.Empty;
    [JsonPropertyName("cantidad_orden")]
    public double? CantidadOrden { get; set; }
    [JsonPropertyName("fecha_orden")]
    public DateTime? FechaOrden { get; set; }
    [JsonPropertyName("fecha_entrega")]
    public DateTime? FechaEntrega { get; set; }
    [JsonPropertyName("cliente")]
    public string Cliente { get; set; } = string.Empty;
    [JsonPropertyName("ensamble_tl")]   // columna real en la tabla viajeros
    public string EnsambleTl { get; set; } = string.Empty;

}

/// <summary>Referencia al viajero padre desde viajero_componentes</summary>
public class ParentCompRef
{
    [JsonPropertyName("viajero_id")]
    public string ViajeroId { get; set; } = string.Empty;
    [JsonPropertyName("parte")]
    public string Parte { get; set; } = string.Empty;
    [JsonPropertyName("revision")]
    public string? Revision { get; set; }
}

/// <summary>Datos mínimos de un viajero para lookups</summary>
public class ViajeroMini
{
    [JsonPropertyName("numero_parte")]
    public string NumeroParte { get; set; } = string.Empty;
    [JsonPropertyName("descripcion")]
    public string? Descripcion { get; set; }
}
