-- Estándar Industrial McVill - Fase 2: Instrucciones y Materiales
ALTER TABLE public.viajero_operaciones 
ADD COLUMN IF NOT EXISTS instrucciones TEXT,
ADD COLUMN IF NOT EXISTS job_id TEXT;

CREATE TABLE IF NOT EXISTS public.viajero_materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viajero_id TEXT REFERENCES public.viajeros(id),
    job_id TEXT, -- Para vincular con el sub-trabajo específico
    clave TEXT,
    descripcion TEXT,
    ubicacion TEXT,
    cantidad NUMERIC,
    unidad TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar que job_id existe si la tabla ya existía
ALTER TABLE public.viajero_materiales ADD COLUMN IF NOT EXISTS job_id TEXT;

