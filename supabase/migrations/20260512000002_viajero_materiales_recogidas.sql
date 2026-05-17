-- Agrega campos de recogidas y almacén a viajero_materiales
ALTER TABLE public.viajero_materiales
  ADD COLUMN IF NOT EXISTS es_recogida        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS clave_requerimiento TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS ubicacion          TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS lote               TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_vencimiento  TIMESTAMPTZ;
