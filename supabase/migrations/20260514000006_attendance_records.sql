-- MCVILL ERP: Attendance Records — Fichaje de entrada/salida por empleado

CREATE TABLE IF NOT EXISTS attendance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id     UUID NOT NULL,          -- references profiles(id)
    employee_name   TEXT NOT NULL,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in        TIMESTAMPTZ,
    check_out       TIMESTAMPTZ,
    minutes_worked  INT,
    overtime_minutes INT DEFAULT 0,
    is_late         BOOLEAN DEFAULT FALSE,
    missing_checkout BOOLEAN DEFAULT FALSE,
    status          TEXT NOT NULL DEFAULT 'present'
                    CHECK (status IN ('present','late','absent','incomplete','holiday','vacation')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_att_date     ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_att_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_status   ON attendance_records(status);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_authenticated" ON attendance_records FOR ALL USING (auth.role() = 'authenticated');
