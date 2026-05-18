-- Migration: Add day-of-week columns to work_shifts table
-- Created: 2026-05-18

ALTER TABLE public.work_shifts ADD COLUMN IF NOT EXISTS monday BOOLEAN DEFAULT true;
ALTER TABLE public.work_shifts ADD COLUMN IF NOT EXISTS tuesday BOOLEAN DEFAULT true;
ALTER TABLE public.work_shifts ADD COLUMN IF NOT EXISTS wednesday BOOLEAN DEFAULT true;
ALTER TABLE public.work_shifts ADD COLUMN IF NOT EXISTS thursday BOOLEAN DEFAULT true;
ALTER TABLE public.work_shifts ADD COLUMN IF NOT EXISTS friday BOOLEAN DEFAULT true;
ALTER TABLE public.work_shifts ADD COLUMN IF NOT EXISTS saturday BOOLEAN DEFAULT true;
ALTER TABLE public.work_shifts ADD COLUMN IF NOT EXISTS sunday BOOLEAN DEFAULT true;
