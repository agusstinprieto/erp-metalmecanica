import psycopg2

def run_fix():
    try:
        conn = psycopg2.connect(
            host='2600:1f18:2e13:9d5a:c773:3b0e:e3c:52f3',
            port=5432,
            database='postgres',
            user='postgres',
            password='Supabase_2026!',
            sslmode='require'
        )
        cur = conn.cursor()
        
        sql = """
        -- 1. LIMPIEZA DE MAESTROS
        DELETE FROM public.viajero_operaciones
        WHERE job_id IN (
            SELECT id FROM public.viajeros WHERE es_maestro = true
        )
        AND orden >= 100;

        -- 2. COMPLETAR TEXTOS TRUNCADOS Y MULTI-LÍNEA
        -- A) Inspeccion Calidad (INSP-CAL)
        UPDATE public.viajero_operaciones
        SET descripcion_detallada = '1.-LIBERACIÓN DE PRIMERA PIEZA POR EL AUDITOR DE CALIDAD.\n2.-LIBERACIÓN DEL PROCESO.'
        WHERE centro_trabajo = 'INSP-CAL' OR nombre_operacion = 'INSP-CAL' OR descripcion_detallada ILIKE '1.-LIBER%N DE PRIMERA PIEZA POR EL AUDITOR DE%';

        -- B) Corte Placa-Lamina / Laser (LSA-01 / CORTE-LAS / LASER)
        UPDATE public.viajero_operaciones
        SET descripcion_detallada = 'AUTOINSPECCIÓN\n1.-VERIFICAR DIMENSIONES CONTRA DIBUJO DE LA 1RA PIEZA.\n2.-SI ALGÚNA MEDICIÓN ESTA FUERA DE TOLERANCIA HAY QUE PARAR EL PROCESO.\n3.-AVISAR INMEDITAMENTE AL DEPTO./AUDITOR DE CALIDAD.'
        WHERE centro_trabajo IN ('LSA-01', 'CORTE-LAS', 'LASER', 'LASER TUBO') OR descripcion_detallada ILIKE '%Corte Placa-Lamina%';

        -- C) Doblez (CIZ-CIN / DOBLEZ)
        UPDATE public.viajero_operaciones
        SET descripcion_detallada = 'AUTOINSPECCIÓN\n1.-VERIFICAR DIMENSIONES CONTRA DIBUJO DE LA 1RA PIEZA.\n2.-SI ALGÚNA MEDICIÓN ESTA FUERA DE TOLERANCIA HAY QUE PARAR EL PROCESO.\n3.-AVISAR INMEDITAMENTE AL DEPTO./AUDITOR DE CALIDAD.'
        WHERE centro_trabajo IN ('CIZ-CIN', 'DOBLEZ') OR descripcion_detallada ILIKE '%Doblez%';

        -- D) Ensamble Genérico
        UPDATE public.viajero_operaciones
        SET descripcion_detallada = '1.-ENSAMBLE DE COMPONENTES SEGÚN DIBUJO.'
        WHERE descripcion_detallada ILIKE '1.-ENSAMBLE DE COMPONENTES SEG%N DIBUJO%';

        -- 3. LIMPIEZA AGRESIVA DE INSTRUCCIONES EMBEBIDAS
        
        -- A) Formato con Prefijo
        UPDATE public.viajero_operaciones
        SET
            centro_trabajo = nombre_operacion || ' ' || (regexp_match(descripcion_detallada, '^(\\S+)\\s+\\d'))[1],
            clave_operacion = (regexp_match(descripcion_detallada, '^\\S+\\s+(\\d{4,7})\\s+'))[1],
            configuracion = ((regexp_match(descripcion_detallada, '(\\d+\\.?\\d*)\\s+\\d+\\.?\\d*\\s*Min/Part'))[1])::NUMERIC,
            tasa_proceso = (regexp_match(descripcion_detallada, '(\\d+\\.?\\d*)\\s*Min/Part'))[1] || ' Min/Part',
            tiempo_estimado = ((regexp_match(descripcion_detallada, 'Min/Part\\s+(\\d+\\.?\\d*)$'))[1])::NUMERIC,
            descripcion_detallada = trim((regexp_match(descripcion_detallada, '^\\S+\\s+\\d{4,7}\\s+(.+)\\s+\\d+\\.?\\d*\\s+\\d+\\.?\\d*\\s*Min/Part\\s+\\d+\\.?\\d*$'))[1])
        WHERE descripcion_detallada ~ '^\\S+\\s+\\d{4,7}\\s+.+\\s+\\d+\\.?\\d*\\s+\\d+\\.?\\d*\\s*Min/Part\\s+\\d+\\.?\\d*$';

        -- B) Formato sin Prefijo
        UPDATE public.viajero_operaciones
        SET
            clave_operacion = (regexp_match(descripcion_detallada, '^(\\d{4,7})\\s+'))[1],
            configuracion = ((regexp_match(descripcion_detallada, '(\\d+\\.?\\d*)\\s+\\d+\\.?\\d*\\s*Min/Part'))[1])::NUMERIC,
            tasa_proceso = (regexp_match(descripcion_detallada, '(\\d+\\.?\\d*)\\s*Min/Part'))[1] || ' Min/Part',
            tiempo_estimado = ((regexp_match(descripcion_detallada, 'Min/Part\\s+(\\d+\\.?\\d*)$'))[1])::NUMERIC,
            descripcion_detallada = trim((regexp_match(descripcion_detallada, '^\\d{4,7}\\s+(.+)\\s+\\d+\\.?\\d*\\s+\\d+\\.?\\d*\\s*Min/Part\\s+\\d+\\.?\\d*$'))[1])
        WHERE descripcion_detallada ~ '^\\d{4,7}\\s+.+\\s+\\d+\\.?\\d*\\s+\\d+\\.?\\d*\\s*Min/Part\\s+\\d+\\.?\\d*$';

        -- 4. DEDUPLICACIÓN GENERAL
        DELETE FROM public.viajero_operaciones v1
        USING public.viajero_operaciones v2
        WHERE v1.job_id = v2.job_id 
          AND v1.orden = v2.orden 
          AND v1.id <> v2.id
          AND v1.descripcion_detallada IS NULL 
          AND v2.descripcion_detallada IS NOT NULL;

        -- 5. LIMPIEZA DE CLIENTE
        UPDATE public.viajeros SET cliente = 'MCVILL SA DE CV' WHERE cliente ILIKE '%%GENERIC%%';
        """
        
        cur.execute(sql)
        conn.commit()
        print("Cleanup and Fix completed successfully.")
        
        # Verify
        cur.execute("SELECT job_id, orden, centro_trabajo, descripcion_detallada FROM public.viajero_operaciones WHERE job_id = '10666443.02' AND orden = 50")
        print("\nFull Details (10666443.02, 50):")
        print(cur.fetchone())
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_fix()
