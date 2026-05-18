-- Migration to add work shifts and link them to employees
-- Created: 2026-05-16

-- 1. Create work_shifts table
CREATE TABLE IF NOT EXISTS public.work_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- Ej: "Turno Matutino", "T1"
    start_time TIME NOT NULL, -- Ej: "08:30:00"
    end_time TIME NOT NULL, -- Ej: "18:00:00"
    grace_period_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    tenant_id TEXT DEFAULT 'mcvill',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add shift_id to employees/empleados table
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'empleados') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'empleados' AND COLUMN_NAME = 'shift_id') THEN
            ALTER TABLE public.empleados ADD COLUMN shift_id UUID REFERENCES public.work_shifts(id);
        END IF;
    ELSIF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'employees') THEN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'employees' AND COLUMN_NAME = 'shift_id') THEN
            ALTER TABLE public.employees ADD COLUMN shift_id UUID REFERENCES public.work_shifts(id);
        END IF;
    END IF;
END $$;

-- 3. RLS Policies
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shifts viewable by authenticated users" 
ON public.work_shifts FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Shifts manageable by HR/Sistemas" 
ON public.work_shifts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'rh', 'sistemas')
    )
);

-- 4. Seed basic shifts
INSERT INTO public.work_shifts (name, start_time, end_time, grace_period_minutes)
VALUES 
('Turno 1 (Matutino)', '08:30:00', '18:30:00', 15),
('Turno 2 (Vespertino)', '14:00:00', '22:00:00', 15),
('Turno 3 (Nocturno)', '22:00:00', '06:00:00', 15)
ON CONFLICT DO NOTHING;
