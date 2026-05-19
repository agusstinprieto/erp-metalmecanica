-- Link viajeros to ordenes_trabajo for full traceability
ALTER TABLE viajeros
  ADD COLUMN IF NOT EXISTS orden_trabajo_id TEXT;

CREATE INDEX IF NOT EXISTS idx_viajeros_orden_trabajo ON viajeros(orden_trabajo_id);
