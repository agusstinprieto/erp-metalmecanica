# 🚀 McVill Industrial Reporting Service
### Arquitectura de Microservicios para Generación de Expedientes de Manufactura

Este microservicio ha sido diseñado para transformar datos crudos de producción (Supabase) en documentos PDF de alta fidelidad, listos para el piso de planta (Shop Floor).

---

## 🛠️ Los 3 Pilares del Reporte:

1. **🎨 El Diseño (El "Arquitecto"): [ViajeroDocument.cs](file:///C:/Users/aguss/Downloads/IA%20Inteligencia%20Artificial/IA.AGUS/McVill/Apps%20para%20McVill/Acelerador%20de%20Software/reporting-service/Reports/ViajeroDocument.cs)**
   * Aquí es donde definimos el **layout**.
   * Controla los encabezados, los pies de página y el salto de página (`PageBreak()`) para crear la segunda hoja.
   * Usa **QuestPDF** para dibujar las tablas de Calidad y Herramental con precisión milimétrica.

2. **🧠 Los Datos (El "Cerebro"): [DatabaseService.cs](file:///C:/Users/aguss/Downloads/IA%20Inteligencia%20Artificial/IA.AGUS/McVill/Apps%20para%20McVill/Acelerador%20de%20Software/reporting-service/Services/DatabaseService.cs)**
   * Aquí es donde ocurre la conexión a **Supabase**.
   * Incluye la lógica **"anti-errores"** que convierte los textos en números de forma segura, evitando fallos de casting.
   * Es donde inyectamos la información técnica dinámica como las Inspecciones de Calidad y los Herramentales.

3. **🗺️ La Estructura (El "Mapa"): [ViajeroModel.cs](file:///C:/Users/aguss/Downloads/IA%20Inteligencia%20Artificial/IA.AGUS/McVill/Apps%20para%20McVill/Acelerador%20de%20Software/reporting-service/Models/ViajeroModel.cs)**
   * Define qué campos tiene un "Viajero" (JobID, Cliente, Operaciones, etc.).
   * Es el contrato que asegura que el diseño y la base de datos hablen el mismo idioma.

---

## 🏗️ Arquitectura Técnica
El sistema utiliza el paradigma de **Microservicios** desarrollado sobre **.NET 8 (C#)**.

### Componentes Clave:
*   **API Engine**: ASP.NET Core Minimal APIs (Ultra ligero).
*   **PDF Engine**: QuestPDF (Motor basado en layouts por código).
*   **Data Provider**: Npgsql (Driver de alto rendimiento para PostgreSQL/Supabase).
*   **Barcode Generator**: Barcoder (Generación nativa de códigos Code39 para escaneo industrial).

---

## 📡 Conexión con Supabase
El sistema se conecta directamente a la instancia de PostgreSQL de Supabase utilizando una **conexión IPv6 persistente**.

### Flujo de Datos:
1.  **Request**: El frontend solicita un reporte vía `GET /generate-pdf/{jobID}`.
2.  **Auth/Connect**: `DatabaseService` abre un túnel seguro hacia Supabase.
3.  **Data Extraction**: Se ejecutan consultas relacionales en las tablas `viajeros`, `viajero_operaciones` y `viajero_materiales`.
4.  **Robust Casting**: Conversión segura de tipos de datos para garantizar la estabilidad del servicio.

---

## 💡 Tip de "Godmode":
Si quieres cambiar el nombre de quien autoriza el reporte (por ejemplo, en el bloque de firmas de la página 2), solo tienes que editar la clase `AprobacionModel` al final del archivo **[ViajeroModel.cs](file:///C:/Users/aguss/Downloads/IA%20Inteligencia%20Artificial/IA.AGUS/McVill/Apps%20para%20McVill/Acelerador%20de%20Software/reporting-service/Models/ViajeroModel.cs)**. ¡Es instantáneo!

---

## 🔄 Guía de Migración: SQL Server (Local/ERP)
Si el equipo de sistemas de McVill decide migrar de Supabase a un **SQL Server** local (o Azure SQL), deben seguir estos 3 pasos:

### 1. Cambio de Dependencias (NuGet)
Sustituir el driver de PostgreSQL por el de SQL Server:
```bash
dotnet remove package Npgsql
dotnet add package Microsoft.Data.SqlClient
```

### 2. Actualización del DatabaseService.cs
El ingeniero debe cambiar las clases `NpgsqlConnection` y `NpgsqlCommand` por sus equivalentes de Microsoft:
```csharp
using Microsoft.Data.SqlClient; // Cambiar el namespace

// En lugar de NpgsqlConnection:
using var connection = new SqlConnection(_connectionString);
```

### 3. Configuración de Conexión
Actualizar el archivo `appsettings.json` con el formato de SQL Server:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=TU_SERVIDOR;Database=McVill_ERP;User Id=sa;Password=tu_password;TrustServerCertificate=True;"
}
```

> [!NOTE]
> Las consultas SQL (`SELECT * FROM...`) son compatibles en un 99%, por lo que no será necesario reescribir la lógica de negocio, solo el conector.

---
**Desarrollado con Estándares IA.AGUS** 🦾🔥
