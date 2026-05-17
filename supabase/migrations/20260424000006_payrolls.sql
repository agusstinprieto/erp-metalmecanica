-- MCVILL ERP: Payroll (Nóminas) Migration
-- Automated calculation system based on RH data

CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    days_worked INTEGER DEFAULT 15,
    gross_salary DECIMAL(12, 2) NOT NULL,
    deductions DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, calculated, approved, paid
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

-- Visibility policies
CREATE POLICY "Payrolls visibility" ON payrolls
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role IN ('ceo', 'gerente', 'rh', 'finanzas', 'contabilidad') OR profiles.tenant_id = payrolls.tenant_id)
    )
);

CREATE POLICY "Financial full access" ON payrolls
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'gerente', 'rh', 'finanzas', 'contabilidad')
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls(status);
CREATE INDEX IF NOT EXISTS idx_payrolls_period ON payrolls(period_start, period_end);
