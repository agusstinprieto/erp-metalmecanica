# 🛠️ Guía de Despliegue - McVill Control System
**Versión:** 1.0.0  
**Dirigido a:** Equipo de TI / Sistemas McVill  
**Tecnologías:** React, Vite, Supabase, Gemini AI.

---

## 1. Requisitos Previos
*   **Node.js:** v18.x o superior.
*   **Git:** Instalado y configurado.
*   **Supabase CLI:** (Opcional, pero recomendado para migraciones).
*   **Cuenta de Vercel:** Para hosting del frontend.

---

## 2. Configuración de la Base de Datos (Supabase)
El sistema depende de una infraestructura en Supabase. Siga estos pasos:

1.  **Crear Proyecto:** Cree un nuevo proyecto en el dashboard de Supabase.
2.  **Ejecutar Scripts SQL:**
    *   Vaya a la carpeta `Archivos SQL/` proporcionada en este paquete.
    *   Ejecute el script de **Tablas y Esquema** primero.
    *   Ejecute el script de **Funciones de IA** (Edge Functions) después.
3.  **Políticas RLS:** Asegúrese de habilitar Row Level Security (RLS) en las tablas de `tenants` y `api_configs` siguiendo las guías incluidas en los scripts.

---

## 3. Configuración del Entorno (Frontend)
Clone el repositorio y configure las variables de entorno:

1.  **Clonación:**
    ```bash
    git clone https://github.com/ia-mcvill-projects/mcvill-erp.git
    cd mcvill-erp
    ```
2.  **Instalación:**
    ```bash
    npm install
    ```
3.  **Variables de Entorno (`.env`):**
    Cree un archivo `.env` en la raíz con el siguiente formato:
    ```env
    # Supabase Connection
    VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
    VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
    
    # AI Standard (Opcional si se usa base de datos dinámica)
    VITE_GEMINI_API_KEY=tu-api-key-de-google-gemini
    ```

---

## 4. Despliegue en Vercel
Para un despliegue optimizado:

1.  Conecte el repositorio de GitHub a un nuevo proyecto en Vercel.
2.  **Configuración de Build:**
    *   **Framework Preset:** Vite
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
3.  **Variables de Entorno:** Copie las variables del archivo `.env` a la configuración de Vercel.

---

## 5. Configuración de Modelos de IA
El sistema **Control** es dinámico. No hardcodear llaves en el código.
*   Las llaves de API (Gemini, DeepSeek, etc.) deben registrarse en la tabla `api_configs` de Supabase.
*   El sistema recuperará automáticamente el modelo activo basado en el `tenant_id` del usuario logueado.

---

## 6. Mantenimiento
*   **Logs:** Utilice `npm run dev` para depuración local.
*   **Build Check:** Antes de cada push a producción, ejecute `npm run build` para verificar integridad de tipos y compilación.

---
**Soporte Técnico:** soporte@ia-agus.com  
*Documento generado por el Acelerador de Software IA.AGUS.*
