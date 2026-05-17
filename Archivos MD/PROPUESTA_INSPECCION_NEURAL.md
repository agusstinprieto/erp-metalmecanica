# 👁️ Propuesta de Inspección Neural: QA Visual Automatizado con Inteligencia Artificial
## SGC (Sistema de Gestión de Calidad) y Monitoreo IoT en Piso de Planta para McVill

---

> [!NOTE]
> Este documento técnico detalla el plan estratégico para implementar la arquitectura de **Inspección Visual por IA (Neural Inspection Engine)** directamente en las líneas de ensamble y estaciones de soldadura de McVill. El objetivo es automatizar la detección de defectos, garantizar la conformidad según normas internacionales (AWS D1.1 / ISO 5817) y alimentar el SGC en tiempo real sin fricción operativa.

---

## 1. 🏗️ Arquitectura de Conectividad en Piso de Planta

La implementación se basa en hardware **Plug-and-Play** de nivel industrial, lo que minimiza el costo inicial y aprovecha la infraestructura de red existente de McVill.

```mermaid
graph TD
    subgraph Piso de Planta (Estaciones de Trabajo)
        C1[Cámara IP / NVR - Estación Soldadura 4] -->|Stream MJPEG/RTSP| HUB[Switch de Red Local / NVR]
        C2[Cámara IP / NVR - Línea Ensamble 1] -->|Stream MJPEG/RTSP| HUB
    end
    subgraph Servidor Local / Gateway
        HUB -->|Protocolo Seguro HTTP| ERP[McVill ERP Gateway]
    end
    subgraph Motores de Inteligencia Artificial (Nube)
        ERP -->|Análisis de Visión Computacional| GEMINI[Gemini 2.5 / 3 Flash-Lite]
    end
    subgraph Sistema de Calidad (SGC)
        GEMINI -->|Veredicto PASS/FAIL + Defectos| ERP
        ERP -->|Alerta de Calidad + Creación de NC| SGC[Bitácora de Calidad / CAPA]
        ERP -->|Notificación Push| WA[WhatsApp del Supervisor]
    end
```

### 📸 Componentes de Hardware Sugeridos:
1. **Cámaras IP Industriales (PoE):** Cámaras fijas con lente varifocal (ej. Hikvision, Dahua o Axis Communications) montadas a 1.5 metros por encima de la mesa de soldadura o estación de ensamble.
2. **Iluminación Controlada (Domos de Difusión o Barras LED):** Crucial para evitar reflejos metálicos excesivos durante la toma de fotos de cordones de soldadura brillantes.
3. **Pulsador Físico (Botón Industrial IoT) o Disparador Automático:** Un pedal o botón industrial que el operario presiona al terminar su trabajo para indicarle al ERP que capture el frame y realice la auditoría visual de forma instantánea.

---

## 2. ⚡ Flujo del Proceso: De la Captura al Veredicto IA

El sistema opera en 4 pasos ultra-rápidos (menos de 2 segundos en total):

| Paso | Acto | Descripción Técnica |
| :--- | :--- | :--- |
| **1. Disparo** | Cierre de Ciclo | El operador de soldadura termina el cordón y activa el disparador (manual, por pedal o automático al terminar la orden de trabajo en el ERP). |
| **2. Captura** | Extracción de Frame | El **McVill ERP** toma un snapshot en alta resolución (JPEG) directamente del stream de video en vivo (MJPEG/RTSP) de la cámara asignada a la estación. |
| **3. Procesamiento** | Análisis Neural | La imagen se envía cifrada a nuestro **Neural Inspection Engine** de Gemini, el cual corre plantillas de prompt avanzadas basadas en normas de calidad específicas. |
| **4. Acción** | Veredicto & SGC | Se procesa el JSON de respuesta. Si es **APROBADO (PASS)**, se genera el certificado de conformidad. Si es **RECHAZADO (FAIL)**, el ERP bloquea la pieza y levanta una **No Conformidad**. |

---

## 3. 🔍 ¿Qué Defectos Detecta la IA en Tiempo Real?

### 🔥 Estación de Soldadura (Norma AWS D1.1 / ISO 5817)
*   **Porosidades:** Detección de microporos superficiales o acumulación de gases.
*   **Socavación (Undercut):** Detección de desgaste no deseado en los bordes del cordón.
*   **Falta de Fusión / Penetración Incompleta:** Inspección de los límites de fusión del metal base.
*   **Fisuras / Grietas:** Identificación de microfisuras de cráter o longitudinales de alto riesgo estructural.
*   **Salpicaduras Excesivas (Spatter):** Alerta sobre exceso de spatter que requiera retrabajo de limpieza manual.

### ⚙️ Línea de Ensamble y Dimensional
*   **Componentes Faltantes:** Detección de tornillos, tuercas, arandelas o soportes omitidos.
*   **Desalineaciones:** Verificación de tolerancias geométricas y posición espacial de piezas respecto al plano.
*   **Daños Mecánicos:** Rayaduras severas, abolladuras o golpes sufridos durante el manejo físico del metal.

---

## 4. 📈 ROI & Valor de Negocio para el Dueño de McVill

Implementar este módulo no es solo tecnología moderna, es una decisión financiera con alto **Retorno de Inversión (ROI)**:

> [!IMPORTANT]
> 1. **Cero Retrasos por Garantías:** Al capturar y auditar al 100% las soldaduras antes de que la pieza salga de planta, se eliminan las reclamaciones de clientes finales por fallas estructurales.
> 2. **Trazabilidad Total (Digital Twin):** Cada orden de trabajo (OT) tendrá guardada la fotografía exacta del trabajo realizado con el dictamen de la IA. Si el cliente final hace una reclamación en 6 meses, McVill tiene la prueba digital histórica del control de calidad.
> 3. **Reducción de OpEx en Retrabajos:** Detectar un defecto en la estación 4 cuesta **$10 USD** de corregir. Detectar el mismo defecto después de pintar y ensamblar la estructura terminada cuesta **$500 USD** en retrabajo y logística.

---

## 5. 🚀 Cómo Funciona el Demo Actual en el ERP

Para demostrar la potencia del sistema al dueño de McVill hoy mismo, hemos integrado **2 feeds en vivo de cámaras reales** bajo el estándar industrial:
*   **Línea Ensamble 1:** Stream de cámara IP con tasa de refresco fluida.
*   **Estación Soldadura 4:** Stream de cámara IP con visualización continua.

### 💡 Script para la Demostración:
1. Abra la pestaña **Calidad (SGC)**.
2. Vaya al tab **Video Hub**. Verá las dos pantallas de visualización en vivo reproduciéndose en tiempo real con latencia controlada.
3. Presione el botón **ANALIZAR IA** en cualquiera de las pantallas.
4. El sistema capturará el frame actual de la cámara, simulará el escaneo en el panel lateral y emitirá el dictamen técnico en tiempo real, detallando la confianza del análisis, defectos y la norma de referencia.
