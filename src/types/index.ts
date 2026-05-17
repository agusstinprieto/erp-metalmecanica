export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  config: Record<string, any>;
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'user' | 'super_admin';
  avatar_url?: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  job_title: string;
  department: string;
  daily_salary: number;
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave' | 'vacation' | 'medical_leave';
}

export interface EmployeeFiscalData {
  id: string;
  employee_id: string;
  rfc: string;
  curp: string;
  nss: string;
  bank_name?: string;
  clabe?: string;
  regimen_fiscal: string;
}

export interface Payroll {
  id: string;
  tenant_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  payment_date?: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: 'draft' | 'calculated' | 'approved' | 'paid';
  cfdi_uuid?: string;
}

export interface PayrollConcept {
  id: string;
  payroll_id: string;
  type: 'perception' | 'deduction';
  code: string;
  description: string;
  amount: number;
}

export interface FinancialAccount {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  balance: number;
}

export interface FinancialTransaction {
  id: string;
  tenant_id: string;
  date: string;
  description: string;
  reference?: string;
  entries?: TransactionEntry[];
}

export interface TransactionEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  debit: number;
  credit: number;
}

export interface Vacancy {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  requirements: string[];
  benefits: string[];
  salary_range: string;
  location: string;
  status: 'open' | 'closed' | 'on_hold' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  tenant_id: string;
  vacancy_id: string | null;
  name: string;
  email: string;
  phone: string;
  resume_url: string;
  resume_text: string;
  ai_score: number;
  ai_analysis: any;
  status: 'pending' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  created_at: string;
  updated_at: string;
}
