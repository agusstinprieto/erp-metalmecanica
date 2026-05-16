-- Columnas IA para viajeros inteligentes
ALTER TABLE viajeros
  ADD COLUMN IF NOT EXISTS image_prompt TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url    TEXT DEFAULT '';

-- Costos por hora en operaciones
ALTER TABLE viajero_operaciones
  ADD COLUMN IF NOT EXISTS costo_hora_mxn NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_hora_usd NUMERIC DEFAULT 0;

-- Costos unitarios en materiales
ALTER TABLE viajero_materiales
  ADD COLUMN IF NOT EXISTS costo_unitario_mxn NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_unitario_usd NUMERIC DEFAULT 0;
