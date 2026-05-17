# Viajeros Inteligentes — McVill ERP

## ¿Qué es un Viajero?

Un **Viajero Industrial** es el documento digital que acompaña a una orden de fabricación desde que nace hasta que se entrega. Registra todo lo que le pasa a una pieza: qué operaciones recorre, en qué centro de trabajo está, cuánto tiempo tomó cada etapa, qué materiales consume y cuál es su estado de calidad.

El nombre viene de la manufactura tradicional: el papel que "viaja" con la pieza por la planta. En McVill ese papel es inteligente, vive en la nube y se actualiza en tiempo real.

---

## Lo que hace hoy

### Vista de Producción en Vivo (`/viajeros`)
Panel orientado a operadores, supervisores y calidad. Tabla ordenable con toda la información clave de cada viajero.

- **Código de color automático** según el estado real de cada viajero:
  - Rojo / Atrasado — la fecha de entrega se va a pasar con el tiempo restante estimado
  - Rojo oscuro / Rechazado — la pieza fue rechazada en QC, con motivo visible
  - Naranja / Detenido — la orden fue pausada
  - Ámbar / En riesgo — llegará en menos de 2 días hábiles al límite
  - Azul / En proceso — avanzando sin problemas
  - Verde / Completado — terminado a tiempo
- **Ordenamiento inteligente**: los atrasados y rechazados siempre aparecen primero.
- **Filtros rápidos**: Todos / En Proceso / Atrasados / Rechazados / Detenidos.
- **Barra de estadísticas** en tiempo real: cuántos están en cada estado.
- **Auto-refresh cada 30 segundos** sin intervención del usuario.

### Widget de Carga por Centro de Trabajo
Visible en la vista de producción. Muestra por cada CT (LASER, DOBLEZ, CNC, SOLDADURA, PINTURA, ENSAMBLE):
- Cuántos viajeros activos tiene en cola.
- Cuántas horas de trabajo representan.
- Cuántos de esos están atrasados.

### Panel TV para piso de producción
Vista de pantalla completa activada con un botón en la barra superior. Pensada para un televisor montado en la planta. Muestra los viajeros activos con letra grande y colores fuertes. Se actualiza sola. Sin login requerido.

### Panel de Administración (`ViajeroAdminPanel`)
Interfaz completa para el equipo de ingeniería y planeación.

- Alta, edición y baja de viajeros con tabs: General / Operaciones / BOM.
- Búsqueda y filtros por cliente, centro de trabajo, rango de fechas.
- Selección múltiple e impresión por lote de documentos PDF.
- Catálogo de operaciones y catálogo de materiales (BOM).

### Comparativa Estimado vs. Real por operación
Visible en el tab Operaciones del modal de edición. Para cada operación del viajero muestra:
- Tiempo estimado vs. tiempo real acumulado.
- Desviación total con indicador de tendencia.
- Código de color por operación: verde = completada, azul = en proceso.

### Modelo de datos
Cada viajero tiene:
- Datos de la orden: cliente, número de parte, revisión, OC, cantidad, fechas.
- Ruta de operaciones (`viajero_operaciones`): cada etapa con centro de trabajo, tiempo estimado y tiempo real acumulado.
- Lista de materiales (`viajero_materiales`): placas o tubos con parámetros de corte calculados automáticamente.
- Estado: `PENDIENTE` / `EN PROCESO` / `DETENIDO` / `COMPLETADO` / `RECHAZADO`.
- Prioridad: `NORMAL` / `ALTA` / `URGENTE`.
- Avance calculado automáticamente (% de operaciones completadas).
- Campos de rechazo: motivo, rechazado por, fecha de rechazo.

### Lógica de detección de retraso
```
horas_restantes = horas_estimadas × (1 - avance / 100)
días_para_terminar = horas_restantes / 8
fecha_estimada_fin = hoy + días_para_terminar

si fecha_estimada_fin > fecha_entrega  →  ATRASADO  (rojo)
si diferencia < 2 días                 →  EN RIESGO (ámbar)
si va bien                             →  OK        (azul)
```

---

## Próximas funcionalidades (Roadmap)

### 1. Notificaciones push al supervisor
Cuando un viajero pasa a estado ATRASADO o RECHAZADO, enviar una alerta push o un mensaje a Slack / WhatsApp al supervisor responsable. No hace falta que nadie esté mirando la pantalla.

### 2. Escáner de QR en piso
Cada viajero tiene un ID único. Un operador escanea el QR con el celular y actualiza la operación al estado `in_progress` o `completed`. La vista de producción refleja el cambio en máximo 30 segundos. Ya existe la base en `ShopFloorTracking`.

### 3. Historial de rechazos con motivo
Al rechazar un viajero, pedir motivo (dimensión fuera de tolerancia, soldadura defectuosa, acabado, etc.) y guardar la fecha, el operador que rechazó y el número de intento. Esto alimenta reportes de calidad y permite detectar cuáles partes se rechazan más.

### 4. Registro de no-conformidades ligado al viajero
Conectar el módulo de Calidad con Viajeros: cuando se abre un reporte de no conformidad (NCR), que quede vinculado al viajero afectado. Se puede ver directamente en la tarjeta de producción.

### 5. Predicción de retraso con IA
Con el historial de tiempos reales vs. estimados por centro de trabajo, entrenar un modelo simple que prediga si un viajero va a llegar a tiempo. No basado en la fórmula lineal actual, sino en el comportamiento histórico real de cada CT (LASER tarda 20% más los viernes, SOLDADURA tiene picos los martes, etc.).

### 6. Integración con inventario (BOM Check)
Antes de lanzar un viajero a producción, verificar automáticamente si los materiales del BOM están disponibles en inventario. Si hay faltante, marcar el viajero como `BLOQUEADO` y notificar a compras.

### 7. Firma digital del operador
Al completar una operación crítica (soldadura, inspección final), que el operador firme digitalmente desde el celular. El registro queda trazable con timestamp, nombre y usuario. Útil para auditorías ISO.

### 8. Fotos de evidencia por operación
Permitir adjuntar fotos desde el celular a cada operación del viajero. Útil para documentar acabados, soldaduras, mediciones. Se almacenan en Supabase Storage y quedan ligadas al viajero.

### 9. Vista de cliente (portal externo)
Un link único y seguro que el cliente puede abrir en su navegador para ver el avance de su orden: en qué etapa está, % completado, fecha estimada de entrega actualizada. Sin acceso al ERP, solo su viajero.

### 10. Bitácora de cambios (Audit Log)
Registrar automáticamente quién cambió qué y cuándo en cada viajero: cambios de estado, fechas, prioridad, responsable. Crítico para auditorías ISO 9001 y trazabilidad de calidad. Se puede implementar con triggers en Supabase.

### 11. Clonar viajero
Para órdenes repetidas del mismo cliente y pieza, permitir duplicar un viajero existente con un clic. Copia la ruta de operaciones y el BOM completo, solo se ajustan fechas y cantidad. Elimina la re-captura manual en producción en serie.

### 12. Dashboard de KPIs gerencial
Pantalla ejecutiva con métricas consolidadas:
- OTD (On-Time Delivery %) por mes y por cliente.
- Tasa de rechazo por CT y por número de parte.
- Tiempo de ciclo promedio por operación.
- Comparativa de capacidad instalada vs. carga actual.

### 13. Comentarios por viajero
Hilo de notas donde cualquier usuario con permiso puede dejar un comentario en un viajero (observaciones de turno, advertencias de material, instrucciones especiales). Mejora la comunicación entre turnos sin depender de papel o WhatsApp.

### 14. Historial de reprogramaciones
Cuando cambia la `fecha_entrega`, guardar la fecha original y el motivo del cambio. Permite auditar cuántas veces fue reprogramado un pedido y por qué. Hoy ese dato se pierde con cada edición.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Autenticación | Supabase Auth (multi-tenant) |
| PDF | Bridge local Node.js (puerto 5005) |
| IA / Procesamiento | Claude API (Anthropic) vía Edge Functions |
| Deploy | Vercel / Supabase Edge |

---

## Acceso por rol

| Rol | Vista Producción | Panel Admin | Rechazar Viajero | Actualizar Operación |
|---|---|---|---|---|
| CEO / Sistemas / Gerente | ✅ | ✅ | ✅ | ✅ |
| Supervisor | ✅ | ✅ | ✅ | ✅ |
| Calidad | ✅ | — | ✅ | — |
| Operador de Piso | ✅ (su CT) | — | — | ✅ (su CT) |
| Empleado | — | — | — | — |

---

*Documento generado por IA.AGUS — McVill ERP 2026*
