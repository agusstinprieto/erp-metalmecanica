-- ============================================================
-- McVill Viajero — Data Fix v2
-- Completa los 20 viajeros maestros con datos reales:
--   1. Columna es_maestro en viajeros (la usa el modelo C#)
--   2. Descripciones reales + cliente correcto para 20 maestros
--   3. Inserta los 6 maestros faltantes (40165388-40165394)
--   4. Actualiza descripciones de componentes desde viajeros reales
--   5. Limpia el cliente genérico en todos los registros maestros
-- Seguro para re-ejecutar.
-- ============================================================

BEGIN;

-- ── 1. SCHEMA: columna es_maestro ────────────────────────────
-- El modelo C# mapea [JsonPropertyName("es_maestro")].
-- load_masters.sql usó "is_master" por error — agregamos la
-- columna correcta si no existe y copiamos el valor si "is_master"
-- ya existiera.

ALTER TABLE public.viajeros
    ADD COLUMN IF NOT EXISTS es_maestro BOOLEAN DEFAULT false;

-- Si existe la columna is_master, migrar su valor
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'viajeros'
          AND column_name  = 'is_master'
    ) THEN
        UPDATE public.viajeros SET es_maestro = true WHERE is_master = true;
    END IF;
END $$;


-- ── 2. UPDATE: descripciones reales de los 20 maestros ───────

UPDATE public.viajeros SET
    descripcion = 'CODO 1" SOLDABLE WELDING EMS 69',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '10666443.02';

UPDATE public.viajeros SET
    descripcion = 'CORTE ACERO ESTRUCTURAL TUBO',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '10666444.02';

UPDATE public.viajeros SET
    descripcion = 'PLACA 3/16" CORTE Y DOBLEZ',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '10666633.01';

UPDATE public.viajeros SET
    descripcion = 'PLACA LAMINA CORTE CNC',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40124708.01';

UPDATE public.viajeros SET
    descripcion = 'ENSAMBLE Y SOLDADURA TUBO',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40124709.01';

UPDATE public.viajeros SET
    descripcion = 'HORN ASM (BOCINA INDUSTRIAL)',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40124710.01';

UPDATE public.viajeros SET
    descripcion = 'CORTE ACERO ESTRUCTURAL',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40124711.01';

UPDATE public.viajeros SET
    descripcion = 'TUBO ENSAMBLE Y SOLDADURA',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40133044.01';

UPDATE public.viajeros SET
    descripcion = 'ROLADO PAN-01',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40133045.01';

UPDATE public.viajeros SET
    descripcion = 'ENSAMBLE COMPONENTES 10666633',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40133047.01';

UPDATE public.viajeros SET
    descripcion = 'CORTE PLACA-LAMINA',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40164025';

UPDATE public.viajeros SET
    descripcion = 'DOBLEZ CIZ-CIN',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40164026';

UPDATE public.viajeros SET
    descripcion = 'ENSAMBLE Y SOLDADURA SOPORTES',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40164027';

UPDATE public.viajeros SET
    descripcion = 'ENSAMBLE COMPONENTES Y SOLDADURA',
    cliente     = 'MCVILL SA DE CV',
    es_maestro  = true
WHERE id = '40164031';


-- ── 3. INSERT: 6 maestros faltantes ──────────────────────────
-- No están en injected_viajero_data.sql ni load_masters.sql.
-- Los insertamos con datos mínimos correctos + operaciones básicas.

INSERT INTO public.viajeros (id, cliente, numero_parte, descripcion, revision, cantidad_orden, dibujo, fecha_orden, es_maestro)
VALUES ('40165388.01', 'MCVILL SA DE CV', '40165388', 'REMACHE E. HOOD RIVET 1/4', 'A', 1, '40165388', '2024-01-01', true)
ON CONFLICT (id) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    cliente     = EXCLUDED.cliente,
    es_maestro  = EXCLUDED.es_maestro;

INSERT INTO public.viajeros (id, cliente, numero_parte, descripcion, revision, cantidad_orden, dibujo, fecha_orden, es_maestro)
VALUES ('40165389.01', 'MCVILL SA DE CV', '40165389', 'LOCK ASM (CERRADURA INDUSTRIAL)', 'A', 1, '40165389', '2024-01-01', true)
ON CONFLICT (id) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    cliente     = EXCLUDED.cliente,
    es_maestro  = EXCLUDED.es_maestro;

INSERT INTO public.viajeros (id, cliente, numero_parte, descripcion, revision, cantidad_orden, dibujo, fecha_orden, es_maestro)
VALUES ('40165390.01', 'MCVILL SA DE CV', '40165390', 'ENSAMBLE Y SOLDADURA', 'A', 1, '40165390', '2024-01-01', true)
ON CONFLICT (id) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    cliente     = EXCLUDED.cliente,
    es_maestro  = EXCLUDED.es_maestro;

INSERT INTO public.viajeros (id, cliente, numero_parte, descripcion, revision, cantidad_orden, dibujo, fecha_orden, es_maestro)
VALUES ('40165391.01', 'MCVILL SA DE CV', '40165391', 'CORTE PLACA-LAMINA', 'A', 1, '40165391', '2024-01-01', true)
ON CONFLICT (id) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    cliente     = EXCLUDED.cliente,
    es_maestro  = EXCLUDED.es_maestro;

INSERT INTO public.viajeros (id, cliente, numero_parte, descripcion, revision, cantidad_orden, dibujo, fecha_orden, es_maestro)
VALUES ('40165392.01', 'MCVILL SA DE CV', '40165392', 'DOBLEZ CIZ-CIN', 'A', 1, '40165392', '2024-01-01', true)
ON CONFLICT (id) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    cliente     = EXCLUDED.cliente,
    es_maestro  = EXCLUDED.es_maestro;

INSERT INTO public.viajeros (id, cliente, numero_parte, descripcion, revision, cantidad_orden, dibujo, fecha_orden, es_maestro)
VALUES ('40165394.01', 'MCVILL SA DE CV', '40165394', 'CORTE PLACA-LAMINA', 'A', 1, '40165394', '2024-01-01', true)
ON CONFLICT (id) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    cliente     = EXCLUDED.cliente,
    es_maestro  = EXCLUDED.es_maestro;

-- Operaciones básicas para los 6 maestros nuevos
DELETE FROM public.viajero_operaciones WHERE viajero_id IN (
    '40165388.01','40165389.01','40165390.01',
    '40165391.01','40165392.01','40165394.01'
);

INSERT INTO public.viajero_operaciones (viajero_id, job_id, orden, clave_operacion, nombre_operacion, centro_trabajo, descripcion_detallada)
VALUES
    ('40165388.01','40165388.01',10,'ENS-REM','ENS-REM','CT-GENERIC','322450 Remachado E. Hood 0.00 15.00Min/Part 0.25'),
    ('40165388.01','40165388.01',20,'CAL-01', 'CAL-01', 'CT-GENERIC','322451 Inspeccion Calidad 0.00 5.00Min/Part 0.08'),
    ('40165388.01','40165388.01',30,'INSP-CAL','INSP-CAL','CT-GENERIC','1.-LIBERACIÓN DE PRIMERA PIEZA POR EL AUDITOR DE'),
    ('40165388.01','40165388.01',40,'CAL-01', 'CAL-01', 'CT-GENERIC',''),
    ('40165389.01','40165389.01',10,'ENS-SOLD','ENS-SOLD','CT-GENERIC','322460 Ensamble Lock Asm 0.00 30.00Min/Part 0.50'),
    ('40165389.01','40165389.01',20,'CAL-01', 'CAL-01', 'CT-GENERIC','322461 Inspeccion Calidad 0.00 5.00Min/Part 0.08'),
    ('40165389.01','40165389.01',30,'INSP-CAL','INSP-CAL','CT-GENERIC','1.-LIBERACIÓN DE PRIMERA PIEZA POR EL AUDITOR DE'),
    ('40165389.01','40165389.01',40,'CAL-01', 'CAL-01', 'CT-GENERIC',''),
    ('40165390.01','40165390.01',10,'LASER',   'LASER',   'CT-GENERIC','TUBO 322470 Ensamble y Soldadura 0.00 45.00Min/Part 0.75'),
    ('40165390.01','40165390.01',20,'ENS-SOLD','ENS-SOLD','CT-GENERIC','ENSAMBLE Y SOLDADURA DE COMPONENTES SEGÚN DIBUJO.'),
    ('40165390.01','40165390.01',30,'LASER',   'LASER',   'CT-GENERIC','TUBO'),
    ('40165390.01','40165390.01',40,'CAL-01', 'CAL-01', 'CT-GENERIC','322471 Inspeccion Calidad 0.00 10.00Min/Part 0.17'),
    ('40165390.01','40165390.01',50,'INSP-CAL','INSP-CAL','CT-GENERIC','1.-LIBERACIÓN DE PRIMERA PIEZA POR EL AUDITOR DE'),
    ('40165390.01','40165390.01',60,'CAL-01', 'CAL-01', 'CT-GENERIC',''),
    ('40165391.01','40165391.01',10,'CAL-01', 'CAL-01', 'CT-GENERIC','322480 Inspeccion Calidad 0.00 5.00Min/Part 0.08'),
    ('40165391.01','40165391.01',20,'INSP-CAL','INSP-CAL','CT-GENERIC','1.-LIBERACIÓN DE PRIMERA PIEZA POR EL AUDITOR DE'),
    ('40165391.01','40165391.01',30,'CAL-01', 'CAL-01', 'CT-GENERIC',''),
    ('40165392.01','40165392.01',10,'CAL-01', 'CAL-01', 'CT-GENERIC','322490 Inspeccion Calidad 0.00 5.00Min/Part 0.08'),
    ('40165392.01','40165392.01',20,'INSP-CAL','INSP-CAL','CT-GENERIC','1.-LIBERACIÓN DE PRIMERA PIEZA POR EL AUDITOR DE'),
    ('40165392.01','40165392.01',30,'CAL-01', 'CAL-01', 'CT-GENERIC',''),
    ('40165394.01','40165394.01',10,'CAL-01', 'CAL-01', 'CT-GENERIC','322500 Inspeccion Calidad 0.00 5.00Min/Part 0.08'),
    ('40165394.01','40165394.01',20,'INSP-CAL','INSP-CAL','CT-GENERIC','1.-LIBERACIÓN DE PRIMERA PIEZA POR EL AUDITOR DE'),
    ('40165394.01','40165394.01',30,'CAL-01', 'CAL-01', 'CT-GENERIC','');


-- ── 4. COMPONENTES: reemplazar 'COMPONENT' con descripcion real ──
-- Usa JOIN con la tabla viajeros para obtener la descripcion real
-- de cada job_id_hijo.

UPDATE public.viajero_componentes vc
SET descripcion = v.descripcion
FROM public.viajeros v
WHERE vc.job_id_hijo = v.numero_parte
  AND (vc.descripcion = 'COMPONENT' OR vc.descripcion IS NULL OR vc.descripcion = '')
  AND v.descripcion IS NOT NULL
  AND v.descripcion <> ''
  AND v.descripcion NOT IN ('COMPONENT', 'GENERIC');

-- Segunda pasada: buscar por job_id_hijo exacto (cuando incluye sufijo)
UPDATE public.viajero_componentes vc
SET descripcion = v.descripcion
FROM public.viajeros v
WHERE vc.job_id_hijo = v.id
  AND (vc.descripcion = 'COMPONENT' OR vc.descripcion IS NULL OR vc.descripcion = '')
  AND v.descripcion IS NOT NULL
  AND v.descripcion <> ''
  AND v.descripcion NOT IN ('COMPONENT', 'GENERIC');


-- ── 5. CLIENTE: limpiar GENERIC_CLIENT en todos los registros ──
UPDATE public.viajeros
SET cliente = 'MCVILL SA DE CV'
WHERE cliente IN ('GENERIC_CLIENT', 'GENERIC', '');


-- ── 6. REVISION: limpiar guiones al inicio (ya cubierto en fix_data_v1) ──
UPDATE public.viajeros
SET revision = ltrim(revision, '-')
WHERE revision LIKE '-%';

-- Normalizar '--' a en blanco o dejar como está según preferencia
-- (se deja comentado para revisión manual)
-- UPDATE public.viajeros SET revision = '' WHERE revision = '--';


-- ── 7. RLS: asegurar que viajeros tenga política de lectura ──
ALTER TABLE public.viajeros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "viajeros_select_all" ON public.viajeros;
CREATE POLICY "viajeros_select_all"
    ON public.viajeros FOR SELECT USING (true);


-- ── Verificación final ───────────────────────────────────────
SELECT
    id,
    numero_parte,
    left(descripcion, 40)  AS descripcion,
    cliente,
    revision,
    es_maestro
FROM public.viajeros
WHERE es_maestro = true
ORDER BY numero_parte;

COMMIT;
