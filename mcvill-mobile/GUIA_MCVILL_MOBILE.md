# McVill Mobile — Guía Completa

> App móvil para supervisores, operadores y calidad en piso de producción.  
> Conectada en tiempo real al mismo Supabase del ERP McVill.

---

## ¿Para qué sirve?

El ERP McVill corre en una computadora de escritorio. Pero en una planta industrial, los supervisores están en piso, los operadores están en sus centros de trabajo y el inspector de calidad está moviéndose todo el tiempo. Esta app resuelve eso:

- **El operario** escanea el código QR de su viajero de papel, ve las operaciones que le corresponden y las firma desde su celular cuando las termina.
- **El supervisor** ve todas las operaciones completadas que necesitan su visto bueno, las aprueba o rechaza con un comentario, sin tener que ir a la PC.
- **El inspector de calidad** registra una inspección directamente desde piso — cuántas piezas pasaron, cuántas fallaron, tipo de defecto, y toma una foto del problema.
- **Todo queda en Supabase** en tiempo real, visible también desde el ERP web.

---

## Estructura del proyecto

```
mcvill-mobile/
├── app/
│   ├── _layout.tsx          ← Raíz: maneja autenticación
│   ├── login.tsx            ← Pantalla de login
│   ├── scan.tsx             ← Scanner QR/barcode (pantalla completa)
│   ├── viajero/
│   │   └── [id].tsx         ← Detalle de viajero + firma de operaciones
│   └── (tabs)/
│       ├── _layout.tsx      ← Barra de navegación inferior
│       ├── index.tsx        ← Tab: Viajeros
│       ├── calidad.tsx      ← Tab: Calidad
│       ├── aprobaciones.tsx ← Tab: Aprobaciones
│       └── perfil.tsx       ← Tab: Perfil
├── components/
│   └── Badge.tsx            ← Componente de estatus reutilizable
├── lib/
│   ├── supabase.ts          ← Cliente Supabase (AsyncStorage)
│   └── theme.ts             ← Colores y constantes de diseño
├── .env                     ← Credenciales Supabase
├── app.json                 ← Config de Expo
├── package.json
├── instalar.bat             ← Script de instalación (solo primera vez)
└── iniciar.bat              ← Script para arrancar el servidor Expo
```

---

## Pantallas

### Login

Pantalla de inicio de sesión con email y contraseña. Usa los mismos usuarios del ERP — cualquier usuario registrado en Supabase Auth puede entrar. La sesión se guarda en el celular (AsyncStorage) y no pide login de nuevo al reabrir la app.

**Campo email:** correo registrado en el ERP  
**Campo contraseña:** la misma contraseña del ERP  

> Si el usuario no tiene cuenta, el administrador la crea desde el ERP en Ajustes → Usuarios.

---

### Tab: Viajeros

Lista todas las órdenes de trabajo activas ordenadas por fecha más reciente. Muestra:

- Número de parte y cliente
- Descripción del ensamble
- Cantidad fabricada vs. cantidad de orden
- Barra de progreso
- Estatus (Pendiente / En proceso / Completado)

**Buscar:** escribe número de parte, cliente o número de viajero para filtrar la lista.

**Botón ESCANEAR:** abre la cámara para leer el código QR o de barras del viajero físico de papel. Ver sección "Cómo imprimir códigos QR en viajeros" más abajo.

**Jalar para actualizar:** desliza la lista hacia abajo para recargar desde Supabase.

---

### Pantalla: Detalle de Viajero

Se abre al tocar un viajero de la lista o al escanear su código. Muestra:

- Número de parte, cliente, descripción, revisión
- Cantidad fabricada vs. orden
- Horas estimadas y fecha de orden
- Barra de progreso de operaciones (ej. 3/7 completadas — 43%)
- Lista completa de operaciones de ruta en orden

**Por cada operación:**
- Número de orden, nombre, centro de trabajo, tiempo estimado
- Estatus visual (gris = pendiente, azul = en proceso, verde = completado)
- Si está completada: quién la firmó y cuándo, notas, foto

**Para firmar una operación:**
1. Toca el botón de checkmark a la derecha de la operación
2. Escribe notas opcionales (anomalías, observaciones)
3. Toca "Agregar foto" para capturar con la cámara si hay algo que documentar
4. Toca **COMPLETAR** y confirma

El sistema registra: quién la completó (email del usuario), cuándo, notas y foto. Si es la última operación del viajero, el viajero pasa automáticamente a estatus "completado".

---

### Scanner QR / Barcode

Pantalla de cámara de pantalla completa con mira de escaneo. Acepta:

- **QR con UUID del viajero** (generado desde el ERP — ver sección abajo)
- **Código de barras / QR con número de parte** (ej. `MCV-001-A`)
- **QR con número de viajero** (ej. `VJ-2026-001`)

Si el código no se reconoce, muestra un error en rojo y permite intentar de nuevo. Vibra el celular al escanear.

---

### Tab: Calidad

**Vista lista:** inspecciones recientes con pass rate, cantidad aprobada/rechazada y tipos de defecto.

**Botón NUEVA → Formulario de inspección:**

| Campo | Descripción |
|---|---|
| Código de parte | Obligatorio. Se guarda en mayúsculas |
| Descripción | Nombre del producto (opcional si el código ya lo identifica) |
| Lote / Orden | Número de lote o de orden de producción |
| Inspeccionadas | Total de piezas revisadas |
| Aprobadas | Piezas que pasaron |
| Rechazadas | Piezas que fallaron (si se deja vacío se calcula automáticamente) |
| Tipos de defecto | Dimensional / Soldadura / Acabado / Material / Mecanizado / Pintura / Otro |
| Notas | Descripción libre del problema |
| Foto | Captura con cámara del defecto encontrado |

La inspección se clasifica automáticamente:
- **Aprobado** — 0 rechazadas
- **Parcial** — algunas rechazadas pero no todas
- **Rechazado** — todas rechazadas

La foto se guarda en el bucket `mcvill-fotos` de Supabase Storage, accesible desde el ERP.

---

### Tab: Aprobaciones

Muestra todas las operaciones que un operario marcó como completadas pero que aún **no tienen la firma del supervisor**. Es la lista de pendientes del supervisor.

Por cada operación pendiente se muestra:
- Número de parte y cliente
- Nombre de la operación y centro de trabajo
- Quién la completó y cuándo
- Notas que dejó el operario

**Para aprobar o rechazar:**
1. Escribe un comentario (opcional pero recomendado si rechazas)
2. Toca **APROBAR** o **RECHAZAR**
3. Confirma en el diálogo
4. La operación desaparece de la lista

La app también tiene un enlace "Ver viajero completo" para ver el contexto de toda la orden antes de decidir.

El número rojo/amarillo sobre el ícono del tab indica cuántas aprobaciones están pendientes.

---

### Tab: Perfil

Muestra información del usuario conectado y estadísticas del sistema en tiempo real:

- Viajeros activos (sin contar completados/cancelados)
- Total de operaciones completadas (historial)
- Inspecciones de calidad registradas hoy
- Operaciones pendientes de aprobación del supervisor

Botón **CERRAR SESIÓN** — pide confirmación antes de salir.

---

## Instalación

### Requisitos

- Node.js 18 o superior → [nodejs.org](https://nodejs.org)
- Un celular con iOS 13+ o Android 8+ con la app **Expo Go** instalada
  - iOS: App Store → "Expo Go"
  - Android: Play Store → "Expo Go"

### Paso a paso

**1. Instalar dependencias (solo la primera vez)**

```bat
cd mcvill-mobile
instalar.bat
```

O manualmente:
```bash
npm install
```

**2. Arrancar el servidor de desarrollo**

```bat
iniciar.bat
```

O manualmente:
```bash
npx expo start
```

Aparece un código QR en la terminal.

**3. Conectar el celular**

- El celular y la computadora deben estar en **la misma red WiFi**
- Abre **Expo Go** en el celular
- Toca "Scan QR Code" y escanea el QR de la terminal
- El app carga en 10-20 segundos

**4. Login**

Usa el email y contraseña de cualquier usuario registrado en el ERP McVill.

---

## Configuración

### Credenciales Supabase

El archivo `.env` en la raíz del proyecto ya tiene las credenciales correctas de McVill:

```env
EXPO_PUBLIC_SUPABASE_URL=https://kfdbgvyeomoewzmhkbsn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

No es necesario cambiar nada. Si en el futuro se migra a otro proyecto de Supabase, actualizar estos dos valores.

### Bucket de fotos

El bucket `mcvill-fotos` ya fue creado en Supabase Storage por la migración `20260513_mobile_app_columns.sql`. Las fotos son públicas (se puede ver la URL directamente) y tienen un límite de 5 MB por imagen. Formatos permitidos: JPEG, PNG, WebP, HEIC.

### Permisos del celular

La primera vez que se usa la cámara o el scanner, el sistema operativo pide permiso. Tocar **Permitir** en ambos casos. Sin cámara, el scanner y la captura de fotos no funcionan.

---

## Cómo imprimir códigos QR en los viajeros desde el ERP

Para que los operadores puedan escanear el viajero físico, el ERP debe imprimir un código QR en cada viajero. El contenido del QR debe ser el `id` del viajero (UUID) o su `numero_parte`.

**Opción recomendada — QR con UUID:**  
El scanner reconoce automáticamente un UUID válido (formato `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) y abre el viajero correcto sin importar si el número de parte cambia o se duplica.

**Cómo generarlo desde el ERP:**  
En la pantalla de detalle de cotización/viajero, se puede agregar un botón "Imprimir QR" que genere un PDF con el QR. Para esto, en el ERP web se puede usar la librería `qrcode` junto a `jspdf`:

```bash
npm install qrcode @types/qrcode
```

```typescript
import QRCode from 'qrcode';

const generarQR = async (viajeroId: string) => {
  const dataUrl = await QRCode.toDataURL(viajeroId, { width: 200, margin: 1 });
  // Insertar en el PDF del viajero con jsPDF
  doc.addImage(dataUrl, 'PNG', x, y, 40, 40);
};
```

---

## Relación con el ERP web

La app móvil y el ERP web comparten exactamente la misma base de datos Supabase. Los cambios hechos desde el celular se ven inmediatamente en el ERP y viceversa.

| Acción en la app móvil | Efecto en el ERP web |
|---|---|
| Operario firma una operación | La columna `estatus` de `viajero_operaciones` cambia a `completado` |
| Supervisor aprueba una operación | Se guardan `aprobado_por` y `aprobado_en` en la operación |
| Inspector registra inspección | Aparece en la tabla `quality_inspections`, visible en el módulo de Calidad del ERP |
| Se sube una foto | La URL queda en `foto_url` de la operación, mostrable en el ERP |
| Todas las ops de un viajero se completan | El viajero pasa automáticamente a `estatus = completado` en el ERP |

**Columnas que añadió la migración `20260513_mobile_app_columns.sql`** a la tabla `viajero_operaciones`:

| Columna | Tipo | Descripción |
|---|---|---|
| `estatus` | TEXT | `pendiente` / `en_proceso` / `completado` / `aprobado` / `rechazado` |
| `notas_campo` | TEXT | Notas que dejó el operario al firmar |
| `foto_url` | TEXT | URL pública de la foto en Supabase Storage |
| `completado_por` | TEXT | Email del operario que firmó |
| `completado_en` | TIMESTAMPTZ | Fecha y hora de la firma |
| `aprobado_por` | TEXT | Email del supervisor que aprobó |
| `aprobado_en` | TIMESTAMPTZ | Fecha y hora de aprobación |
| `notas_supervisor` | TEXT | Comentario del supervisor al aprobar/rechazar |

---

## Despliegue a producción (opcional — para distribución real)

Para distribuir la app sin necesitar Expo Go, se puede hacer un build nativo con EAS (Expo Application Services):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # genera .apk o .aab
eas build --platform ios       # genera .ipa (requiere cuenta Apple Developer)
```

El `.apk` de Android se puede instalar directamente en los celulares de planta sin pasar por la Play Store. Para iOS se requiere la cuenta de Apple Developer ($99/año) o usar TestFlight.

Para actualizaciones sin rebuild completo, usar **EAS Update**:
```bash
eas update --branch production --message "Actualización de pantalla de calidad"
```

---

## Troubleshooting

**"Network request failed" al iniciar**  
→ Verificar que el celular y la PC están en la misma red WiFi. Si hay un router con aislamiento de clientes, conectar ambos al mismo punto de acceso.

**El QR no escanea**  
→ Asegurar buena iluminación. El scanner funciona con QR, Code128, Code39, EAN-13, EAN-8 y DataMatrix.

**"Viajero no encontrado" al escanear**  
→ El código escaneado no coincide con ningún `id`, `numero_parte` ni `numero_viajero` en la base de datos. Verificar que el viajero existe en el ERP.

**La foto no se sube**  
→ Verificar que el bucket `mcvill-fotos` existe en Supabase Storage (Dashboard → Storage). Si no existe, correr manualmente la migración `20260513_mobile_app_columns.sql`.

**Las aprobaciones no aparecen**  
→ La columna `aprobado_por` debe existir en `viajero_operaciones`. Si no existe, correr la migración mencionada arriba.

**Login falla con "Invalid login credentials"**  
→ El usuario debe tener una cuenta activa en Supabase Auth. Crearla desde el ERP en Ajustes → Gestión de Usuarios.

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Expo SDK | 52 | Framework React Native |
| Expo Router | 4 | Navegación basada en archivos |
| expo-camera | 15 | Scanner QR/barcode y captura de fotos |
| expo-image-picker | 15 | Selector de fotos de galería |
| @supabase/supabase-js | 2.45 | Cliente de base de datos y auth |
| AsyncStorage | 1.23 | Persistencia de sesión en el dispositivo |
| React Native | 0.76 | Framework base |
| TypeScript | 5.3 | Tipado estático |

---

*Última actualización: mayo 2026*
