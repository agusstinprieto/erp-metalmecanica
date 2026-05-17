# 📱 MCVILL ERP - GUÍA DE SOPORTE OFFLINE & COMPILACIÓN EAS

Este documento contiene la documentación técnica completa del **Soporte Offline de Grado Industrial** y la **Configuración de Compilación de Producción (EAS Build)** implementados para la aplicación móvil de **McVill ERP** bajo el estándar de excelencia **Agus Pro**.

---

## 🚀 1. Arquitectura del Motor Offline (`lib/offline.ts`)

Para soportar las fluctuaciones y la debilidad de las conexiones de internet dentro de naves industriales metálicas, implementamos un motor resiliente y transparente basado en **AsyncStorage** y la API nativa de red.

### A. Cola de Transacciones Diferidas (Sync Queue)
Cuando la aplicación realiza una escritura (`insert` o `update`) y detecta que la red está caída:
1. Bloquea la llamada directa a Supabase.
2. Genera un registro en la cola local con un `temp_id` generado mediante `generateTempId()`.
3. Almacena la acción (`insert` o `update`), el nombre de la tabla, y el payload exacto en local.
4. **Subida Diferida de Fotografías:** Si la acción incluye un archivo de cámara local (`file://...`), el motor retiene la URI local. Al recuperar la red, sube primero la foto al bucket `mcvill-fotos` de Supabase Storage, obtiene la URL remota de CDN pública y actualiza el campo del payload antes de insertar el registro final en PostgreSQL.

### B. El Compilador de IDs Relacionales (Mapeador Dinámico)
Uno de los retos más complejos del desarrollo offline es registrar transacciones correlacionadas. Por ejemplo, en el control de asistencia, un operario registra su **Entrada** (que genera una inserción de fila) y posteriormente su **Salida** (que actualiza esa misma fila mediante su ID).
* **El Problema:** Si ambas checadas ocurren offline, la Salida no conoce el ID real de Supabase porque la Entrada aún no ha sido subida.
* **Nuestra Solución:** 
  - Al realizar la Entrada offline, se genera un ID local temporal (ej. `temp_18f921bc`).
  - La Salida se encola como un `update` cuyo filtro de fila apunta a `temp_18f921bc`.
  - Durante el proceso de sincronización masiva en red (`syncQueue()`), el compilador lee las inserciones. Al insertar la Entrada en Supabase, captura el UUID real generado por PostgreSQL (ej. `9e701928-89c0-4318-b218-c2b6f128c704`).
  - Guarda la equivalencia en una tabla interna de traducciones (`idTranslationTable`).
  - Al procesar el `update` de la Salida, traduce automáticamente el ID del filtro de `temp_18f921bc` a `9e701928-89c0-4318-b218-c2b6f128c704`, enviando el cambio a Supabase de forma limpia y transparente.

---

## 🖥️ 2. Panel Visual de Sincronización en Tiempo Real

Para dar total control a los supervisores y operarios en planta, diseñamos y construimos un **Dashboard de Sincronización Local** integrado directamente en la pestaña **Perfil** (`app/(tabs)/perfil.tsx`):

1. **Indicador de Conexión Real:**
   - **ONLINE (Verde Neón):** Conexión HTTP estable verificada mediante micro-ping de latencia hacia servidores Supabase.
   - **OFFLINE (Ámbar Advertencia):** Modo resiliente activo. Se muestra cuando el dispositivo pierde acceso a la red de planta.
2. **Contador de Acciones Pendientes:** Muestra de manera prominente el número total de registros (fichadas, auditorías, firmas) retenidos localmente.
3. **Historial de Cola:** Listado en miniatura que desglosa de manera legible las últimas transacciones en espera de subirse (ej. *"Alta en quality_inspections"* o *"Modificación en viajero_operaciones"*).
4. **Botón Manual de Sincronización:** Permite forzar el ciclo de sincronización masiva (`syncQueue()`) al instante al presionar un botón con indicador de carga dinámico.

---

## 🎛️ 3. Kiosco de Asistencia QR 100% Offline (Wall Tablet)

El Kiosco ubicado en los accesos de la planta industrial suele detenerse por completo si el WiFi pierde señal, ya que no puede verificar la existencia de los operarios.
* **Nuestra Solución:** Añadimos soporte completo de **caching de personal activo**. 
* Al iniciarse el Kiosco con señal, el dispositivo descarga todos los empleados de producción en una caché local `@mcvill_employees_cache`.
* Si pierde la conexión:
  1. El escáner QR valida el código de barras del operario localmente contra la caché para recuperar su nombre y evitar denegaciones de acceso.
  2. Consulta la cola de sincronización diferida para saber si es su primer escaneo del día (Entrada offline) o el segundo (Salida offline, autovinculando el ID temporal del registro).
  3. Muestra una pantalla de éxito personalizada ("Entrada registrada" o "Salida registrada") e inicia el reinicio automático del sensor en 3 segundos de manera 100% autónoma.

---

## 📦 4. Guía de Compilación de Producción (EAS Build)

Hemos configurado un archivo `eas.json` en la raíz del proyecto para simplificar el proceso de generación de APKs de prueba y producción nativas:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "simulator": false
      }
    }
  }
}
```

### Pasos exactos para generar tu archivo APK instalable:

#### Paso 1: Instalar la CLI de EAS globalmente
Abre PowerShell o CMD y ejecuta:
```bash
npm install -g eas-cli
```

#### Paso 2: Autenticarte con tu cuenta de Expo
```bash
eas login
```

#### Paso 3: Inicializar y vincular el proyecto a tu nube Expo
Ejecuta el siguiente comando dentro de la carpeta `mobile/`:
```bash
eas project:init
```

#### Paso 4: Generar la APK de distribución para tablets/celulares
Ejecuta el compilador de Expo en la nube:
```bash
eas build --platform android --profile preview
```
* **¿Qué sucede?** Expo procesará la compilación de forma remota y generará un **archivo `.apk` descargable**. Al finalizar la terminal te presentará un **código QR**. Escanéalo con tus tablets de planta para descargar e instalar el app directamente.

#### Paso 5: Generar el archivo final AAB para subir a Google Play Store
Cuando vayas a realizar el lanzamiento oficial a tiendas:
```bash
eas build --platform android --profile production
```

---

## ⚙️ 5. Control de Calidad y Limpieza de Código

El código fuente de la aplicación móvil McVill ha sido auditado y limpiado minuciosamente de acuerdo a las pautas de **Agus Pro**:
1. **Tipado Estricto:** Se corrigieron advertencias de typescript en `expo-image-picker` y `react-native-url-polyfill`.
2. **Cero Errores:** Se verificó la compilación de la app mediante `npx tsc --noEmit` retornando **cero errores (Exit Code 0)**.
3. **Cero Hardcoding:** Toda la lógica de conexión a Supabase y configuración de tokens se resuelve dinámicamente mediante las variables cargadas desde `.env` en el arranque de la app.
