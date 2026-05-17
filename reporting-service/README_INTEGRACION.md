# 🚀 McVill Reporting Service - IA.AGUS Integration Guide

Este microservicio es el motor de generación de reportes industriales de McVill, diseñado para ser rápido, escalable y visualmente impactante. Utiliza un enfoque **Code-First** para el diseño de PDFs, eliminando la necesidad de diseñadores visuales lentos y propensos a errores.

## 🧩 El Rompecabezas de Software

El sistema se divide en tres componentes clave que trabajan en armonía:

### A. `ViajeroModel.cs` (El Contrato de Datos)
Es la "guía" del reporte. Define exactamente qué información se necesita (JobID, Parte, Operaciones, Materiales). Si necesitas añadir un nuevo campo al reporte, primero debes declararlo aquí.

### B. `ViajeroDocument.cs` (El Motor de Diseño)
Aquí reside toda la magia visual. Utiliza la librería **QuestPDF** para dibujar tablas, códigos de barras y logotipos. 
- **Optimización Industrial**: El motor agrupa automáticamente componentes y materiales por Job ID.
- **Seguridad de Layout**: Implementa escalado inteligente de códigos de barras (`FitHeight`) para evitar desbordamientos visuales.

### C. `ViajeroService.cs` (El Puente de Datos)
Es el encargado de comunicarse con la base de datos (PostgreSQL/Supabase).
- Transforma las filas de la base de datos en objetos de C# (`ViajeroModel`).
- Gestiona la lógica de búsqueda de los últimos registros generados.

---

## 🛠️ Configuración y Lanzamiento

### 1. Requisitos
- .NET 8 SDK
- Acceso a la base de datos Supabase (ConnectionString configurada en `appsettings.json`)

### 2. Ejecución Local (The Bridge)
Para habilitar la comunicación entre la aplicación web y este servicio, ejecuta:
```bash
dotnet run
```
El servicio escuchará en el puerto **5005**. La UI de "Acelerador de Software" se conectará automáticamente a este puerto.

### 3. Endpoints Principales
- `GET /api/reports/viajero/{jobID}`: Genera y descarga el PDF del viajero.
- `GET /api/reports/viajero/latest`: Genera el reporte del registro más reciente en la DB.
- `POST /api/editor/open-project`: Comando remoto para abrir la solución en Visual Studio.

---

## 🎨 Estándar "IA.AGUS"
- **Aesthetics First**: El diseño del PDF sigue una cuadrícula industrial limpia con tipografía moderna.
- **Zero Hardcoding**: Los datos de inspección y herramental están preparados para ser dinamizados desde la base de datos.
- **Feedback en Tiempo Real**: La interfaz web muestra estados de "GENERANDO REPORTE" mientras el Bridge procesa la información.

---
*Desarrollado con el estándar de excelencia IA.AGUS Ecosystem.*
