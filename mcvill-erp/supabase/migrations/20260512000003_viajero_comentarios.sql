-- Tabla de notas/comentarios de turno por viajero
CREATE TABLE IF NOT EXISTS viajero_comentarios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viajero_id  TEXT        NOT NULL REFERENCES viajeros(id) ON DELETE CASCADE,
  contenido   TEXT        NOT NULL,
  autor       TEXT        NOT NULL DEFAULT 'Usuario',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viajero_comentarios_viajero ON viajero_comentarios(viajero_id);

-- RLS: permitir acceso igual que otras tablas de viajeros
ALTER TABLE viajero_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "viajero_comentarios_all" ON viajero_comentarios
  FOR ALL USING (true) WITH CHECK (true);
