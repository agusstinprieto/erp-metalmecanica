-- ============================================================
-- MIGRACIÓN: Campos de categoría y datos de piso en tabla employees
-- Ejecutar en Supabase SQL Editor
-- Afecta: tabla pública "employees"
-- Propósito: vincular RH con módulo de Desempeño
-- ============================================================

-- Agregar columnas solo si no existen (idempotente)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS tipo_empleado   TEXT,           -- operador | supervisor | almacenista | administrativo | ingeniero | mantenimiento | vigilancia
  ADD COLUMN IF NOT EXISTS celula_operador TEXT,           -- CORTE | SOLDADURA | MAQUINADO | ENSAMBLE | PINTURA
  ADD COLUMN IF NOT EXISTS turno_operador  TEXT,           -- matutino | vespertino | nocturno
  ADD COLUMN IF NOT EXISTS puesto_operador TEXT;           -- Soldador Senior, Operador CNC, etc.

-- Comentarios descriptivos
COMMENT ON COLUMN employees.tipo_empleado   IS 'Categoría del colaborador. Cuando es "operador" se vincula automáticamente con la tabla operadores del módulo de Desempeño.';
COMMENT ON COLUMN employees.celula_operador IS 'Célula de producción asignada (solo aplica a tipo_empleado = ''operador'').';
COMMENT ON COLUMN employees.turno_operador  IS 'Turno de piso: matutino, vespertino o nocturno.';
COMMENT ON COLUMN employees.puesto_operador IS 'Puesto específico dentro de la célula (ej. Soldador Senior, Operador Torno CNC).';

-- Índice para filtrar rápido por tipo en listados de RH
CREATE INDEX IF NOT EXISTS idx_employees_tipo ON employees(tipo_empleado) WHERE tipo_empleado IS NOT NULL;

-- Verificar columnas creadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'employees'
  AND column_name  IN ('tipo_empleado','celula_operador','turno_operador','puesto_operador')
ORDER BY column_name;
