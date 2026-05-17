-- MCVILL ERP: Core & Administrative Modules Migration
-- Includes: Tenants, Profiles, RH, Payroll, and Finance

-- CLEAN UP (Clean slate for new project)
DROP TABLE IF EXISTS audit_logs, quality_checks, production_orders, engineering_projects, costing_analysis, payroll_concepts, payrolls, employee_fiscal_data, employees, profiles, tenants, tax_tables CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS (Organizaciones)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROFILES (Perfiles de Usuario)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'super_admin'
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. EMPLOYEES (RH)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    job_title VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    rfc VARCHAR(13),
    curp VARCHAR(18),
    nss VARCHAR(11),
    daily_salary DECIMAL(12, 2) DEFAULT 0,
    hire_date DATE DEFAULT CURRENT_DATE,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'vacation', 'medical_leave')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. EMPLOYEE FISCAL DATA (Datos SAT)
CREATE TABLE IF NOT EXISTS employee_fiscal_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    rfc VARCHAR(13) UNIQUE,
    curp VARCHAR(18) UNIQUE,
    nss VARCHAR(11) UNIQUE,
    bank_name VARCHAR(100),
    clabe VARCHAR(18),
    regimen_fiscal VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PAYROLLS (Nóminas)
CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE,
    total_gross DECIMAL(15, 2) DEFAULT 0,
    total_deductions DECIMAL(15, 2) DEFAULT 0,
    total_net DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'calculated', 'approved', 'paid'
    cfdi_uuid UUID, -- UUID del SAT si está timbrada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. PAYROLL CONCEPTS (Percepciones/Deducciones)
CREATE TABLE IF NOT EXISTS payroll_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_id UUID REFERENCES payrolls(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'perception', 'deduction'
    code VARCHAR(50), -- Código SAT
    description VARCHAR(255),
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TAX TABLES (ISR 2026 - Simplificado para el ejemplo)
CREATE TABLE IF NOT EXISTS tax_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    limit_inferior DECIMAL(15, 2) NOT NULL,
    limit_superior DECIMAL(15, 2),
    cuota_fija DECIMAL(15, 2) NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL,
    period VARCHAR(50) DEFAULT 'monthly'
);

-- 8. FINANCIAL ACCOUNTS (Cuentas Contables)
CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    parent_id UUID REFERENCES financial_accounts(id),
    balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. FINANCIAL TRANSACTIONS (Libro Diario)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TRANSACTION ENTRIES (Asientos Contables)
CREATE TABLE IF NOT EXISTS transaction_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES financial_accounts(id) ON DELETE CASCADE,
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Configuration
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;

-- Simple Policies (Expand later for Multi-tenant isolation)
CREATE POLICY "Tenants isolation" ON tenants FOR ALL USING (TRUE);
CREATE POLICY "Profiles isolation" ON profiles FOR ALL USING (TRUE);
-- Visibility policies
CREATE POLICY "Employees visibility" ON employees
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role IN ('ceo', 'gerente', 'rh', 'sistemas', 'contabilidad', 'supervisor') OR profiles.tenant_id = employees.tenant_id)
    )
);

CREATE POLICY "RH full access" ON employees
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('ceo', 'gerente', 'rh', 'sistemas')
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE POLICY "Payrolls isolation" ON payrolls FOR ALL USING (TRUE);
CREATE POLICY "Financial isolation" ON financial_accounts FOR ALL USING (TRUE);

-- Default Data for Testing
INSERT INTO tenants (name, slug) VALUES ('McVill Global', 'mcvill-global') ON CONFLICT DO NOTHING;

-- ISR Table Data 2026 (Sample)
INSERT INTO tax_tables (limit_inferior, limit_superior, cuota_fija, percentage) VALUES
(0.01, 746.04, 0.00, 1.92),
(746.05, 6332.05, 14.32, 6.40),
(6332.06, 11128.01, 371.83, 10.88),
(11128.02, 12935.82, 893.63, 16.00),
(12935.83, 15487.71, 1182.88, 17.92),
(15487.72, 31236.49, 1640.18, 21.36),
(31236.50, 49233.00, 5004.12, 23.52)
ON CONFLICT DO NOTHING;
