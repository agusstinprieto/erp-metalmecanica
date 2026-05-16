# Demo McVill ERP — 30 Minutos con el Dueño

> **Escenario narrativo:** "Acaban de recibir una RFQ urgente de KOMATSU para 50 soportes estructurales en acero A572. Vamos a seguir esa orden desde la cotización hasta el piso de planta usando la IA en cada paso."

---

## Estructura General

| Bloque | Módulo | Tiempo |
|---|---|---|
| 1 | Tablero + Chat IA ejecutivo | 0–5 min |
| 2 | Cotización IA + Factibilidad | 5–12 min |
| 3 | Viajeros + Planta en vivo | 12–20 min |
| 4 | Inspección Visual con IA | 20–25 min |
| 5 | Nómina inteligente + Cierre | 25–30 min |

---

## Bloque 1 — Tablero: El Pulso de la Empresa (0–5 min)

**Ruta:** `/dashboard`

**Lo que muestras:**
- KPIs principales en pantalla: órdenes activas, eficiencia de turno, alertas
- El chat IA flotante (AIChatBubble)

**Qué decir:**
> "Esto es lo primero que ve el director cada mañana. En 10 segundos sabe si la planta está en tiempo, si hay cuellos de botella, y cuánto dinero está en juego. Sin reportes, sin llamadas."

### Guión Chat IA — Bloque 1

Escribir en el chat:

```
¿Cómo está la planta hoy? Dame un resumen ejecutivo.
```

Esperar respuesta, luego:

```
¿Hay alguna alerta crítica que deba atender ahora?
```

**Punto clave para el dueño:**
> "No es un dashboard estático. Le pregunto en lenguaje natural y me responde como si fuera mi asistente de operaciones."

---

## Bloque 2 — IA Cotizando en Tiempo Real (5–12 min)

### Parte A — Agente Cotizaciones IA

**Ruta:** `/agente_cot`

**Qué decir:**
> "Llegó una RFQ de KOMATSU. En lugar de que el vendedor pase horas en Excel, le damos el requerimiento a la IA."

### Guión Chat IA — Cotización

Escribir en el agente:

```
Necesito cotizar 50 soportes estructurales en acero A572, 
soldadura MIG certificada, pintura en polvo color negro.
Cliente KOMATSU, entrega en 3 semanas. Dame precio y tiempo estimado.
```

Mostrar cómo la IA desglosa: materiales, procesos, tiempos, margen sugerido.

Luego:

```
¿Qué procesos internos necesita esta pieza y cuántas horas de maquinado estimas?
```

---

### Parte B — Factibilidad IA

**Ruta:** `/factibilidad_ia`

**Qué decir:**
> "Antes de comprometer la entrega, la IA analiza si realmente tenemos capacidad: materiales en inventario, máquinas disponibles, operadores. Evita el error más caro en manufactura: prometer lo que no puedes entregar."

**Mostrar:** matriz de riesgo generada (materiales, proceso, calidad, tiempo, costo, cliente)

**Punto clave:**
> "Si la factibilidad da naranja o rojo en algún factor, el sistema lo marca antes de firmar el contrato."

---

## Bloque 3 — Viajero Digital + Planta en Vivo (12–20 min)

**Ruta:** `/viajeros`

**Qué decir:**
> "Se ganó la orden. Ahora generamos el viajero — la tarjeta digital que acompaña la pieza por toda la planta."

**Mostrar el semáforo de colores y explicar:**

| Color | Significado |
|---|---|
| Verde | En tiempo |
| Azul | En proceso |
| Naranja | En riesgo (menos de 2 días de margen) |
| Rojo | Retrasado |
| Rojo oscuro | Rechazado por calidad |

> "De un vistazo, sin abrir nada, sé el estado de toda la producción."

**Abrir un viajero activo y mostrar:**
- Ruta de operaciones con tiempos estimados vs. reales
- Porcentaje de avance calculado automáticamente
- Lista de materiales con parámetros de corte (calibre, largo, ancho)
- Prioridad: NORMAL / ALTA / URGENTE

### Guión Chat IA — Planta

Escribir en el chat:

```
¿Cuáles son los cuellos de botella de hoy en planta?
```

Luego:

```
¿Qué órdenes tienen riesgo de retrasarse esta semana?
```

Luego:

```
Genera un viajero urgente para 50 soportes KOMATSU, 
acero A572, procesos: corte láser, soldadura MIG, pintura en polvo.
Entrega en 15 días laborables.
```

**Si hay Modo TV disponible — mostrarlo brevemente:**
> "Esto se proyecta en pantalla grande en el taller. Los operadores ven sus órdenes en tiempo real sin tocar ningún sistema. Se actualiza solo cada 30 segundos."

---

## Bloque 4 — Inspección Visual con IA (20–25 min)

**Ruta:** `/visual_ia`

**Qué decir:**
> "La pieza sale de soldadura. En lugar de esperar al inspector, el operador toma una foto con su celular."

**Hacer o simular una inspección de soldadura:**
1. Seleccionar tipo: **Soldadura**
2. Subir foto (Usar archivo: `mcvill_welded_support_40124710.png` preparado para Viajero 40124710)
3. Mostrar el análisis: defectos detectados, norma AWS D1.1 / ISO 5817, resultado: APROBADO / RECHAZADO

**Punto clave:**
> "La IA detecta porosidad, socavación, falta de fusión — contra norma internacional — en segundos. Antes esto requería un inspector calificado revisando cada cordón."

**Mostrar flujo completo:**
- Pieza rechazada → se genera No Conformidad automáticamente en `/quality`
- El registro queda trazable: quién, cuándo, qué defecto, qué orden

### Guión Chat IA — Calidad

```
¿Cuántas no conformidades abiertas tenemos esta semana?
```

```
Crea una no conformidad: soldadura con porosidad en viajero KOMATSU-50-SOPORTES, 
detectado en inspección visual, operador responsable: turno matutino.
```

---

## Bloque 5 — Nómina Inteligente + Cierre (25–30 min)

**Ruta:** `/desempeno`

**Qué decir:**
> "Al final del turno, el sistema ya sabe cuánto produjo cada operador, con qué eficiencia, y si ganó su bono."

**Mostrar:**
- OEE por operador (gráfica individual)
- Cálculo automático de bono: si OEE ≥ 85% → +5% sobre salario

**Ir a:** `/payroll`

**Mostrar:**
- Nómina calculada automáticamente con bonos y descuentos
- ISR retenido (12%) calculado sin intervención manual

> "Sin papeleo, sin discusiones. El sistema calcula lo que corresponde a cada quien según su desempeño real medido en planta."

### Guión Chat IA — Cierre

```
¿Cuál es el estado financiero general de la empresa este mes?
```

Esperar respuesta, luego el cierre verbal:

---

## Frase de Cierre

> "Todo lo que vimos hoy — cotización, factibilidad, producción, calidad, nómina — lo maneja un solo sistema, conectado, en tiempo real, con IA en cada paso.
>
> No reemplaza a tu equipo. Les da superpoderes."

---

## Preguntas Frecuentes del Dueño

| Pregunta | Respuesta |
|---|---|
| ¿Cuánto cuesta? | (precio de licencia mensual/anual) |
| ¿Cuánto tarda la implementación? | ~2 semanas con datos reales de la empresa |
| ¿Y si no tenemos internet? | El sistema funciona en la nube; WiFi industrial es suficiente |
| ¿Mis operadores van a usarlo? | Usan QR en su celular, no necesitan computadora ni capacitación técnica |
| ¿Puedo ver esto desde mi celular? | Sí, es responsive — funciona desde cualquier dispositivo |
| ¿Los datos son seguros? | Supabase con RLS: cada empresa ve solo sus datos |
| ¿Puedo conectarlo a mi sistema actual? | Tiene API abierta para integraciones |
| ¿La IA comete errores? | Siempre queda registro y un humano aprueba decisiones críticas |

---

## Checklist Pre-Demo

- [ ] App corriendo en Vercel con datos reales o demo cargados
- [ ] Al menos 3–5 viajeros activos con distintos colores (verde, naranja, rojo)
- [ ] Foto de soldadura de prueba lista para la inspección visual
- [ ] Chat IA probado con los guiones de este documento
- [ ] Pantalla en modo fullscreen, notificaciones silenciadas
- [ ] Backup: 2–3 screenshots por si falla internet
- [ ] No mostrar: `/settings`, `/configuracion` — distrae con detalles técnicos

---

## Lo que NO Mostrar

- Módulo de Configuración del sistema
- Logs técnicos o errores de consola
- Pantallas de login / gestión de usuarios
- Cualquier dato financiero real si son sensibles

---

*Documento preparado para demo con dueño de McVill — semana del 2026-05-16*
