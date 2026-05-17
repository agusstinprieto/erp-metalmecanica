-- ============================================================
-- McVill Viajero — Data Fix v1
-- Parsea y redistribuye los datos que quedaron embebidos en
-- descripcion_detallada durante la inyección inicial.
--
-- El patrón original del campo es:
--   "TUBO 502963 Ensamble y Soldadora 0.00 40.00Min/Part 0.00"
--   └─tipo─┘└─clave─┘└────descripcion────┘└─cfg─┘└─tasa─┘└─hrs─┘
-- ============================================================

-- ── 1. OPERACIONES: redistribuir campos embebidos ────────────
--
--  Qué se corrige:
--    centro_trabajo  : 'CT-GENERIC'     → usa nombre_operacion + tipo del prefijo
--    clave_operacion : 'LASER/CAL-01…'  → extrae el número (502963, 82315…)
--    tasa_proceso    : NULL              → extrae "40.00 Min/Part"
--    configuracion   : NULL / 0          → extrae el número antes de la tasa
--    tiempo_estimado : 0                 → extrae el número final (proceso horas)
--    descripcion_detallada: queda limpia con solo el texto real

UPDATE public.viajero_operaciones
SET
    -- CT real: combina nombre_operacion con el prefijo embebido en descripcion
    -- Ej: nombre='LASER' + prefijo='TUBO' → 'LASER TUBO'
    centro_trabajo = CASE
        WHEN descripcion_detallada ~ '^\S+\s+\d{4,7}\s+'
        THEN nombre_operacion || ' ' || (regexp_match(descripcion_detallada, '^(\S+)\s+\d'))[1]
        ELSE nombre_operacion   -- sin prefijo, usar tal cual
    END,

    -- Clave operación real: el número de 4-7 dígitos al inicio
    clave_operacion = CASE
        WHEN descripcion_detallada ~ '^\S+\s+(\d{4,7})\s+'
        THEN (regexp_match(descripcion_detallada, '^\S+\s+(\d{4,7})\s+'))[1]
        ELSE clave_operacion
    END,

    -- Tasa proceso: extraer "40.00" de "40.00Min/Part"
    tasa_proceso = CASE
        WHEN descripcion_detallada ~ '(\d+\.?\d*)\s*Min/Part'
        THEN (regexp_match(descripcion_detallada, '(\d+\.?\d*)\s*Min/Part'))[1] || ' Min/Part'
        ELSE tasa_proceso
    END,

    -- Configuración: número antes de la tasa
    configuracion = CASE
        WHEN descripcion_detallada ~ '(\d+\.?\d*)\s+\d+\.?\d*\s*Min/Part'
        THEN ((regexp_match(descripcion_detallada, '(\d+\.?\d*)\s+\d+\.?\d*\s*Min/Part'))[1])::NUMERIC
        ELSE configuracion
    END,

    -- Tiempo estimado (proceso horas): número final después de "Min/Part"
    tiempo_estimado = CASE
        WHEN descripcion_detallada ~ 'Min/Part\s+(\d+\.?\d*)$'
        THEN ((regexp_match(descripcion_detallada, 'Min/Part\s+(\d+\.?\d*)$'))[1])::NUMERIC
        ELSE tiempo_estimado
    END,

    -- Descripción limpia: quitar prefijo tipo+clave y sufijo de tiempos
    -- Ej: "TUBO 502963 Ensamble y Soldadora 0.00 40.00Min/Part 0.00"
    --   → "Ensamble y Soldadora"
    descripcion_detallada = CASE
        WHEN descripcion_detallada ~ '^\S+\s+\d{4,7}\s+(.+)\s+\d+\.?\d*\s+\d+\.?\d*\s*Min/Part\s+\d+\.?\d*$'
        THEN trim((regexp_match(
            descripcion_detallada,
            '^\S+\s+\d{4,7}\s+(.+)\s+\d+\.?\d*\s+\d+\.?\d*\s*Min/Part\s+\d+\.?\d*$'
        ))[1])
        ELSE descripcion_detallada
    END

WHERE centro_trabajo = 'CT-GENERIC';


-- ── 2. MATERIALES: poner clave como descripcion si dice 'MATERIAL' ──
--
-- La descripción real no fue extraída en la inyección inicial.
-- Por ahora mapeamos: si descripcion = 'MATERIAL', mostrar la clave del material.
-- Cuando tengas las descripciones reales, haz UPDATE con los valores correctos.

UPDATE public.viajero_materiales
SET descripcion = '(' || clave || ')'
WHERE descripcion = 'MATERIAL' AND clave IS NOT NULL AND clave <> '';


-- ── 3. VIAJEROS: limpiar revision con guión al inicio ────────
-- El script de inyección puso '-A' en lugar de 'A'

UPDATE public.viajeros
SET revision = ltrim(revision, '-')
WHERE revision LIKE '-%';


-- ── Verificación rápida ──────────────────────────────────────
SELECT
    id, centro_trabajo, clave_operacion, tasa_proceso,
    configuracion, tiempo_estimado,
    left(descripcion_detallada, 50) AS descripcion
FROM public.viajero_operaciones
ORDER BY viajero_id, orden
LIMIT 20;
