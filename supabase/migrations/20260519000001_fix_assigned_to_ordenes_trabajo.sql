-- Fix: add assigned_to TEXT to ordenes_trabajo if missing
-- The original schema defined it as UUID referencing employees, but
-- the app uses it as a plain text name (e.g. "ING. MARTINEZ").
-- This migration adds it as TEXT so the column exists for all deploy paths.

ALTER TABLE ordenes_trabajo
  ADD COLUMN IF NOT EXISTS assigned_to TEXT;
