import { supabase, getActiveTenantId } from '../lib/supabase';

const getTenantId = async (): Promise<string> => {
  return await getActiveTenantId();
};

export interface Transaction {
  id: string;
  date: string;
  entity: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'completed' | 'cancelled';
  description?: string;
  tenant_id: string;
}

export interface CuentaCobrar {
  id: string;
  tenant_id: string;
  numero_factura: string;
  cliente: string;
  concepto?: string;
  monto: number;
  monto_cobrado: number;
  moneda: string;
  tipo_cambio: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_cobro?: string;
  status: 'pendiente' | 'parcial' | 'cobrada' | 'vencida' | 'cancelada';
  metodo_cobro?: string;
  referencia_viajero?: string;
  notas?: string;
  created_at: string;
}

export interface CuentaPagar {
  id: string;
  tenant_id: string;
  numero_factura: string;
  proveedor: string;
  concepto?: string;
  monto: number;
  monto_pagado: number;
  moneda: string;
  tipo_cambio: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_pago?: string;
  status: 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'cancelada';
  metodo_pago?: string;
  prioridad: 'baja' | 'normal' | 'alta' | 'critica';
  referencia_oc?: string;
  notas?: string;
  created_at: string;
}

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 'tx-001', date: '2026-04-24', entity: 'Suministros Industriales S.A.', category: 'Materia Prima', amount: 12400.50, type: 'expense', status: 'completed', tenant_id: 'demo' },
  { id: 'tx-002', date: '2026-04-24', entity: 'Distribuidora Norte', category: 'Venta Producto Terminado', amount: 45000.00, type: 'income', status: 'completed', tenant_id: 'demo' },
  { id: 'tx-003', date: '2026-04-23', entity: 'CFE Corporativo', category: 'Servicios', amount: 8400.00, type: 'expense', status: 'pending', tenant_id: 'demo' },
  { id: 'tx-004', date: '2026-04-23', entity: 'Nómina Operativa Q2', category: 'RRHH', amount: 185000.00, type: 'expense', status: 'completed', tenant_id: 'demo' },
];

export const financeService = {
  // ─── Transacciones (Libro Mayor) ─────────────────────────────────────────────

  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) return data as Transaction[];
    console.error('[financeService] financial_transactions no disponible:', error?.message);
    return [];
  },

  // alias for backward compat
  async listTransactions(): Promise<Transaction[]> {
    return this.getTransactions();
  },

  async createTransaction(tx: Partial<Transaction>): Promise<Transaction> {
    const tenantId = await getActiveTenantId();
    if (!tenantId) throw new Error('No active tenant found');
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({ ...tx, tenant_id: tenantId })
      .select().single();
    if (error) throw error;
    return data as Transaction;
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('financial_transactions').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Transaction;
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
    if (error) throw error;
  },

  async getStats() {
    const { data, error } = await supabase.from('financial_transactions').select('amount, type');
    if (error || !data) return { total_balance: 280000, monthly_income: 520000, monthly_expense: 240000, net_profit: 238000 };
    const income  = data.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { total_balance: income - expense, monthly_income: income, monthly_expense: expense, net_profit: income - expense };
  },

  // ─── Cuentas por Cobrar ───────────────────────────────────────────────────────

  async getCxC(): Promise<CuentaCobrar[]> {
    const { data, error } = await supabase
      .from('cuentas_cobrar').select('*').order('fecha_vencimiento', { ascending: true });
    if (error) { console.warn('[financeService] cuentas_cobrar no disponible:', error.message); return []; }
    return (data || []) as CuentaCobrar[];
  },

  async createCxC(cxc: Partial<CuentaCobrar>): Promise<CuentaCobrar> {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('cuentas_cobrar').insert({ ...cxc, tenant_id: tenantId }).select().single();
    if (error) throw error;
    return data as CuentaCobrar;
  },

  async updateCxC(id: string, updates: Partial<CuentaCobrar>): Promise<CuentaCobrar> {
    const { data, error } = await supabase
      .from('cuentas_cobrar').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as CuentaCobrar;
  },

  async deleteCxC(id: string): Promise<void> {
    const { error } = await supabase.from('cuentas_cobrar').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Cuentas por Pagar ────────────────────────────────────────────────────────

  async getCxP(): Promise<CuentaPagar[]> {
    const { data, error } = await supabase
      .from('cuentas_pagar').select('*').order('fecha_vencimiento', { ascending: true });
    if (error) { console.warn('[financeService] cuentas_pagar no disponible:', error.message); return []; }
    return (data || []) as CuentaPagar[];
  },

  async createCxP(cxp: Partial<CuentaPagar>): Promise<CuentaPagar> {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
      .from('cuentas_pagar').insert({ ...cxp, tenant_id: tenantId }).select().single();
    if (error) throw error;
    return data as CuentaPagar;
  },

  async updateCxP(id: string, updates: Partial<CuentaPagar>): Promise<CuentaPagar> {
    const { data, error } = await supabase
      .from('cuentas_pagar').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as CuentaPagar;
  },

  async deleteCxP(id: string): Promise<void> {
    const { error } = await supabase.from('cuentas_pagar').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Aging Analysis ──────────────────────────────────────────────────────────
  // Agrupa CxC o CxP en 5 cubetas por días de antigüedad vencida

  getAgingBuckets(
    list: CuentaCobrar[] | CuentaPagar[],
    type: 'cxc' | 'cxp'
  ): { label: string; days: number; total: number; count: number }[] {
    const today = new Date();
    const buckets = [
      { label: 'Al día',   days: 0,  min: -Infinity, max: 0  },
      { label: '1–30 d',  days: 30, min: 1,          max: 30 },
      { label: '31–60 d', days: 60, min: 31,         max: 60 },
      { label: '61–90 d', days: 90, min: 61,         max: 90 },
      { label: '+90 d',   days: 91, min: 91,         max: Infinity },
    ];

    return buckets.map(b => {
      const items = list.filter(item => {
        const due = new Date((item as any).fecha_vencimiento);
        const overdue = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
        return overdue >= b.min && overdue <= b.max;
      });
      const total = items.reduce((sum, item) => {
        if (type === 'cxc') {
          const c = item as CuentaCobrar;
          return sum + (c.monto - c.monto_cobrado);
        }
        const p = item as CuentaPagar;
        return sum + (p.monto - p.monto_pagado);
      }, 0);
      return { label: b.label, days: b.days, total, count: items.length };
    });
  },

  // ─── Flujo de Caja Proyectado ─────────────────────────────────────────────────
  // Calcula ingresos esperados (CxC) vs egresos esperados (CxP) por semana — próximos 90 días

  async getFlujoCaja(cxcList: CuentaCobrar[], cxpList: CuentaPagar[]) {
    const today = new Date();
    const weeks: { label: string; cobros: number; pagos: number; neto: number }[] = [];

    for (let w = 0; w < 12; w++) {
      const start = new Date(today); start.setDate(today.getDate() + w * 7);
      const end   = new Date(today); end.setDate(today.getDate() + (w + 1) * 7);
      const label = `S${w + 1} ${start.getDate()}/${start.getMonth() + 1}`;

      const cobros = cxcList
        .filter(c => {
          const d = new Date(c.fecha_vencimiento);
          return d >= start && d < end && ['pendiente', 'parcial'].includes(c.status);
        })
        .reduce((s, c) => s + (c.monto - c.monto_cobrado), 0);

      const pagos = cxpList
        .filter(p => {
          const d = new Date(p.fecha_vencimiento);
          return d >= start && d < end && ['pendiente', 'parcial'].includes(p.status);
        })
        .reduce((s, p) => s + (p.monto - p.monto_pagado), 0);

      weeks.push({ label, cobros, pagos, neto: cobros - pagos });
    }
    return weeks;
  },
};
