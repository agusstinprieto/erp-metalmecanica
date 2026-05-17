# MANUAL DE CONFIGURACIÓN TÉCNICA — McVill ERP con IA
### Guía Maestra de Configuración y Parametrización del Sistema
**Versión 2.6 — Mayo 2026**  
**Estándar de Calidad: AGUS PRO — ia-agus.com**

---

## 📌 CONTENIDO
1. [Introducción y Filosofía de Diseño (Zero Hardcoding)](#1-introducción-y-filosofía-de-diseño-zero-hardcoding)
2. [Gestión de Identidad de Marca y Multi-Tenancy](#2-gestión-de-identidad-de-marca-y-multi-tenancy)
3. [Administración de Usuarios, Roles y Seguridad RLS](#3-administración-de-usuarios-roles-y-seguridad-rls)
4. [Configuración de Cuentas de Banco y Reglas Financieras](#4-configuración-de-cuentas-de-banco-y-reglas-financieras)
5. [Canales de Comunicación y Alertas Omnicanal](#5-canales-de-comunicación-y-alertas-omnicanal)
   * [5.1 API de WhatsApp (Meta Cloud / Twilio)](#51-api-de-whatsapp-meta-cloud--twilio)
   * [5.2 Webhooks de Microsoft Teams y Discord](#52-webhooks-de-microsoft-teams-y-discord)
   * [5.3 Servicios de Correo SMTP](#53-servicios-de-correo-smtp)
6. [Selector de Motores de IA y Gestión Segura de Keys](#6-selector-de-motores-de-ia-y-gestión-segura-de-keys)
   * [6.1 Modelos Autorizados y Endpoints](#61-modelos-autorizados-y-endpoints)
   * [6.2 Almacenamiento Seguro de Credenciales en Supabase](#62-almacenamiento-seguro-de-credenciales-en-supabase)
7. [Parámetros Físicos de Planta y Tarifas Horarias](#7-parámetros-físicos-de-planta-y-tarifas-horarias)
8. [Procedimientos de Respaldo y Migración de Base de Datos](#8-procedimientos-de-respaldo-y-migración-de-base-de-datos)

---

## 1. Introducción y Filosofía de Diseño (Zero Hardcoding)

De acuerdo con el estándar de desarrollo **AGUS PRO**, queda estrictamente prohibido hardcodear datos de marca (nombres, logos, webs), credenciales de servicios externos o parámetros de negocio en el código fuente. 

Toda la configuración debe ser **100% dinámica** y recuperarse en tiempo de ejecución desde la base de datos de **Supabase**. Esto asegura tres pilares fundamentales:
1. **Multi-Tenancy Escalable:** El sistema puede atender a múltiples plantas (tenants) aislando completamente sus bases de datos y marcas.
2. **Seguridad Absoluta:** Las API Keys jamás se exponen en el cliente ni se suben a repositorios de GitHub. Se almacenan cifradas en Supabase y se acceden con políticas RLS de lectura estrictas.
3. **Autonomía Operativa:** El administrador o CEO puede cambiar nombres, logos, cuentas bancarias, credenciales de WhatsApp, y tarifas de producción directamente desde el módulo de Configuración sin necesidad de recompilar o redesplegar el código.

---

## 2. Gestión de Identidad de Marca y Multi-Tenancy

La personalización de la interfaz se realiza dinámicamente. Al cargar la aplicación, se consulta la tabla `tenant_config` filtrada por el ID de la organización.

### Estructura de la Tabla `public.tenant_config` en Supabase:
```sql
CREATE TABLE public.tenant_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_name VARCHAR(100) NOT NULL,
    brand_name VARCHAR(50) NOT NULL DEFAULT 'McVill',
    system_name VARCHAR(50) NOT NULL DEFAULT 'ERP-METALMECANICA',
    logo_url TEXT,
    logo_dark_url TEXT,
    logo_cyber_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(10) DEFAULT '#4FA5FF', -- HSL/Hex color principal
    theme_name VARCHAR(20) DEFAULT 'blue',       -- 'blue', 'slate', 'emerald', 'carbon'
    developer_name VARCHAR(50) DEFAULT 'IA.AGUS',
    developer_url VARCHAR(100) DEFAULT 'https://ia-agus.com',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### Configuración Visual Premium (Cyber-Industrial):
El sistema de diseño interpreta dinámicamente el valor de `theme_name` para inyectar las clases de estilo globales:
* **Blue (Azul Industrial):** `#4FA5FF` - Aspecto corporativo de alta ingeniería (ideal para John Deere/PEMEX).
* **Slate (Metal Pulido):** `#94A3B8` - Estilo sobrio y limpio.
* **Emerald (Seguridad/HSE):** `#34D399` - Vibe de alta visibilidad ecológica.
* **Carbon (Glow Fuego TIG):** `#FF6B00` - Cyberpunk puro. Modos oscuros profundos combinados con destellos naranja de fundición.

---

## 3. Administración de Usuarios, Roles y Seguridad RLS

El control de acceso se rige por **Row Level Security (RLS)** de PostgreSQL. Ningún usuario puede ver, modificar o insertar información de otro tenant.

### Asignación de Roles y Permisos (`public.profiles`):
Cada cuenta de correo registrada en Supabase Auth cuenta con un perfil asociado en la tabla de base de datos donde se asigna su rol operativo:

| Rol de Usuario (`UserRole`) | Permisos de Sistema |
| :--- | :--- |
| **`ceo`** | Acceso absoluto a reportes, finanzas, costos, planificación, auditoría total, bypass de límites y configuración de tenant. |
| **`sistemas`** | Administrador técnico total. Gestión de API keys, bases de datos, integraciones externas (WhatsApp, Teams) y administración de usuarios. |
| **`admin`** | Operación y lectura en todos los módulos operativos y comerciales sin acceso a la configuración del core de base de datos. |
| **`gerente`** | Control de producción, calidad, Gantt interactivo, aprobación de compras e incidencias de nómina. Sin visualización de secrets de IT. |
| **`supervisor`** | Registro de etapas de viajeros, inspecciones visuales en piso, solicitudes de mantenimiento y control de incidentes HSE. |
| **`rh`** | Gestión total de empleados, recibos de nómina, control de asistencia por QR, KPIs de operadores y módulo de reclutamiento IA. |
| **`finanzas`** | Control de cajas chicas, cuentas bancarias, pasarelas de pago, análisis de costos reales vs presupuestados y cotizaciones. |
| **`contabilidad`** | Acceso a transacciones financieras, conciliación de facturas, auditorías e históricos de nómina en modo de solo lectura. |
| **`empleado`** | Modos simplificados: Escaneo QR de viajeros, Check-in/Check-out de asistencia, levantamiento de tickets de HSE/Mantenimiento. |

### Habilitación de RLS para Aislamiento Total:
```sql
-- Habilitar RLS en tablas críticas
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiales ENABLE ROW LEVEL SECURITY;

-- Crear política de aislamiento de Tenant
CREATE POLICY tenant_isolation_policy ON public.work_orders
    USING (tenant_id = auth.jwt() ->> 'tenant_id')
    WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');
```

---

## 4. Configuración de Cuentas de Banco y Reglas Financieras

La tesorería y el cálculo en vivo de costos e impuestos se definen en la tabla `financial_settings` y `cuentas_bancarias`.

### 1. Gestión de Cuentas Bancarias (`public.cuentas_bancarias`):
Para configurar las cuentas en las que se registran depósitos, cobros de clientes y pagos a proveedores:
* **Banco:** Nombre de la entidad (ej. *Banorte*, *BBVA*, *Santander*).
* **CLABE:** Código estándar de 18 dígitos para transferencias interbancarias automáticas.
* **Número de Cuenta:** Número de cuenta de cheques de planta.
* **Divisa:** `MXN` o `USD`.
* **Saldo Inicial:** Monto de apertura conciliado para cálculo de flujo de efectivo en vivo.

### 2. Parámetros de Impuestos y Reglas de Negocio:
Se parametrizan globalmente para evitar discrepancias en cotizaciones generadas por IA:
* **IVA General:** 16.0% (por defecto en territorio mexicano).
* **Retención de IVA:** Configuraciones específicas para servicios de fletes o outsourcing (ej. 4.0%).
* **Margen de Utilidad Objetivo (Overhead):** Porcentaje de seguridad añadido al costo bruto de material y procesos de maquinado (estándar McVill: 35.0%).

---

## 5. Canales de Comunicación y Alertas Omnicanal

La omnicanalidad mantiene conectada a la planta física con la gerencia en tiempo real. Se configuran tres canales clave:

### 5.1 API de WhatsApp (Meta Cloud / Twilio)
Utilizado para notificar automáticamente al cliente cuando su viajero inicia, y a los supervisores cuando existe un retraso crítico o defecto en piso.

#### Parametrización en `public.integrations_config`:
```json
{
  "whatsapp_provider": "meta",
  "phone_number_id": "10928374829102",
  "auth_token": "EAAGx...", 
  "templates": {
    "traveler_started": "mcvill_viajero_iniciado",
    "quality_alert": "mcvill_alerta_calidad_fail",
    "delivery_reminder": "mcvill_recordatorio_entrega"
  }
}
```

*Para desarrollos locales y pruebas rápidas, se puede alternar a **Twilio API** configurando `twilio_account_sid`, `twilio_auth_token` y `twilio_sender_number` en el mismo panel.*

---

### 5.2 Webhooks de Microsoft Teams y Discord
Esencial para paros de máquina urgentes, alertas de incidentes de seguridad (HSE) y aprobaciones inmediatas de cotizaciones de alto valor por parte del CEO.

#### Configuración de Canales Dedicados:
1. **#alertas-produccion:** Webhook URL para registrar paros de estaciones (Cortadora Láser, CNC, TIG).
2. **#calidad-incidencias:** Webhook URL para notificar fallas de Neural Inspection Engine en QA.
3. **#hse-incidentes:** Webhook URL de máxima prioridad para reportes de seguridad y salud en el taller.

```typescript
// Ejemplo de payload enviado por el ERP al Webhook de Teams
const sendTeamsNotification = async (webhookUrl: string, message: string) => {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": "FF0000",
      "summary": "ALERTA CRÍTICA McVill ERP",
      "sections": [{
        "activityTitle": "🚨 Paro en Estación Maquinado CNC",
        "activitySubtitle": "McVill Planta Torreón",
        "text": message
      }]
    })
  });
};
```

---

### 5.3 Servicios de Correo SMTP
Para el envío formal de recibos de nómina, órdenes de compra automatizadas del MRP a proveedores, y cotizaciones en PDF validadas por el Agente IA.

#### Parámetros Requeridos:
* **Host SMTP:** (ej. `smtp.gmail.com` o `mail.mcvill.com`).
* **Puerto:** `465` (SSL) o `587` (TLS).
* **Usuario SMTP:** Cuenta emisora (ej. `no-reply@mcvill.com`).
* **Contraseña SMTP:** Password de aplicación segura.
* **Remitente Formal:** `McVill Operaciones <operaciones@mcvill.com>`.

---

## 6. Selector de Motores de IA y Gestión Segura de Keys

McVill ERP cuenta con un cerebro neural multi-modelo. Según el requerimiento (visión, procesamiento veloz, voz interactiva), el sistema conmuta automáticamente.

### 6.1 Modelos Autorizados y Endpoints

De acuerdo a la regla maestra número 12, **está estrictamente prohibido usar modelos Gemini 2.0 o inferiores**. El sistema opera bajo la siguiente arquitectura de inferencia:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 API SELECTOR PORTAL                    │
                  └──────────────────────────┬─────────────────────────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       │                     │                     │
                       ▼                     ▼                     ▼
              [ Google Gemini ]         [ DeepSeek ]        [ Together AI ]
             Visión, Audio y RAG     Programación y RAG   Cotizador Alterno
```

* **Voz (Live Bidi):** `models/gemini-2.5-flash-native-audio-preview-12-2025` (SDK 1.41.0+ / Endpoint `v1beta` obligatorio para evitar errores 1008 de registro).
* **Texto y Análisis Multimodal:** `gemini-2.5-flash-lite` (Análisis de planos, RAG, Factibilidad IA, Reclutamiento).
* **Text-to-Sound:** `gemini-2.5-flash-lite-preview-tts` (Respuestas habladas en piso ruidoso).
* **DeepSeek V3 / R1 (vía API):** Procesamiento de lógica de programación avanzada, scripts de automatización e indexación compleja.
* **Together AI:** Inferencia de alta velocidad para conmutación en cotizaciones complejas del sector metalmecánico.

---

### 6.2 Almacenamiento Seguro de Credenciales en Supabase

Las API Keys **NUNCA** deben guardarse en archivos `.env` del frontend para producción. Deben residir en la base de datos de Supabase en una tabla con encriptación a nivel de base de datos (`pgcrypto`) y accesibles solo mediante llamadas RPC autenticadas por el rol `sistemas` o `ceo`.

#### Tabla `public.api_credentials`:
```sql
CREATE TABLE public.api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    provider_name VARCHAR(50) NOT NULL, -- 'gemini', 'deepseek', 'together_ai'
    api_key_encrypted BYTEA NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

#### Procedimiento de Recuperación Segura:
El frontend invoca una función RPC segura en Supabase que ejecuta la llamada a la IA de manera server-side (Edge Functions), evitando exponer las API Keys en las herramientas de desarrollador del navegador (F12) del usuario final:

```typescript
// Llamada segura desde el frontend
const generateExecutiveAnalysis = async (prompt: string) => {
  const { data, error } = await supabase.functions.invoke('neural-ai-orchestrator', {
    body: { prompt, provider: 'gemini' }
  });
  if (error) throw new Error("Acceso a IA denegado. Verifique su API Key.");
  return data.response;
};
```

---

## 7. Parámetros Físicos de Planta y Tarifas Horarias

Para que el **Metal Quoter** y el **Control de Costos en Vivo** operen con precisión milimétrica, el administrador debe parametrizar las tasas de costo de la planta.

### 1. Tarifas Horarias por Estación (Costos Estándar):
Configurado en **Configuración → Tasas de Planta**:
* **Cortadora Láser de Fibra:** $1,200 MXN / hora (incluye gas de asistencia y energía).
* **Dobladora Hidráulica CNC:** $850 MXN / hora.
* **Soldadura TIG/MIG (Grado Estructural):** $450 MXN / hora (incluye insumo de argón y soldador certificado).
* **Centro de Maquinado CNC (Fresadora 3 ejes):** $950 MXN / hora.
* **Cabina de Pintura Electrostática:** $600 MXN / hora (incluye horneado).
* **Área de Ensamble y Ajuste Mecánico:** $300 MXN / hora (mano de obra directa).

### 2. Rendimientos y Factores de Scrap:
* **Factor de Merma en Placa:** 12.0% estándar (se optimiza con Nesting IA).
* **Eficiencia de Taller (OEE Target):** 85.0%.
* **Costo indirecto de manufactura (Overhead Fijo):** 15.0% aplicado a costos operativos totales.

---

## 8. Procedimientos de Respaldo y Migración de Base de Datos

Para salvaguardar la operación crítica de la planta contra fallos de internet o caídas de infraestructura global:

### 1. Respaldo Diario Automático (Supabase Backups):
* Habilitado en la consola de administración en la nube.
* Frecuencia: Cada 24 horas (02:00 AM CST).
* Tipo de Respaldo: Snapshot físico completo de PostgreSQL.
* Geo-replicación activa en la región de AWS `us-east-1`.

### 2. Respaldo Lógico Manual (Exportación de Tablas Críticas):
En caso de auditoría ISO 9001 o migración de servidor, el administrador del sistema puede ejecutar una exportación lógica usando `pg_dump` desde una terminal segura:

```powershell
# Comando para exportar la base de datos de producción a archivo sql local
pg_dump -h db.supabase.co -U postgres -d postgres -F c -b -v -f "C:\McVill_Backups\backup_mcvill_$(Get-Date -Format 'yyyyMMdd').dump"
```

### 3. Plan de Recuperación ante Desastres (RTO: 1 hora / RPO: 24 horas):
1. **Fallo de Enlace Internet Planta:** El ERP mantiene habilitado el modo de "Viajeros Offline" en las tablets de taller. Al restablecer la conexión mediante el enlace celular 4G de respaldo, el sistema sincroniza automáticamente los lotes registrados en caché local (`IndexedDB`).
2. **Pérdida de Datos por Error Humano:** Restaurar la base de datos a un punto en el tiempo específico (PITR) usando el dashboard de Supabase, reduciendo al mínimo la pérdida de registros del turno actual.

---
### 🛠️ SOPORTE TÉCNICO Y AUDITORÍA
Cualquier modificación a las políticas RLS, esquemas de tablas o configuración de Webhooks de Teams debe ser aprobada previamente por el departamento de Ingeniería de Sistemas de **IA.AGUS** para evitar interrupciones en la línea de producción de McVill.

*Desarrollado con pasión industrial por **IA.AGUS — Soluciones de Inteligencia Artificial para la Industria Metalmecánica.***
