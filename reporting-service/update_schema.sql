-- Agregar columnas faltantes al modelo industrial McVill
ALTER TABLE public.viajeros 
ADD COLUMN IF NOT EXISTS dibujo TEXT,
ADD COLUMN IF NOT EXISTS cotizacion TEXT,
ADD COLUMN IF NOT EXISTS horas_est_totales NUMERIC DEFAULT 0;

ALTER TABLE public.viajero_operaciones
ADD COLUMN IF NOT EXISTS configuracion NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tasa_proceso TEXT DEFAULT '0.00 Min/Part';

-- Crear tabla de componentes si no existe (para el resumen de la Pag 1)
CREATE TABLE IF NOT EXISTS public.viajero_componentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viajero_id TEXT REFERENCES public.viajeros(id),
    job_id_hijo TEXT,
    parte TEXT,
    revision TEXT,
    descripcion TEXT,
    horas_est NUMERIC,
    cantidad NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
