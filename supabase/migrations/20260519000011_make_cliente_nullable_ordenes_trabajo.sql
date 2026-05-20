-- Migration: Make cliente column nullable on ordenes_trabajo
-- Resolves not-null constraint errors when saving work orders from Planning/Production views
ALTER TABLE public.ordenes_trabajo ALTER COLUMN cliente DROP NOT NULL;
