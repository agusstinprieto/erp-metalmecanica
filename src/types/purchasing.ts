export interface Material {
  id: string;
  name: string;
  sku: string;
  category: 'acero' | 'aluminio' | 'consumibles' | 'herramental' | 'quimicos' | 'componentes';
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  avg_daily_consumption: number; // unidades/día
  lead_time_days: number;        // días de entrega del proveedor
  unit_cost: number;             // MXN
  supplier_id: string;
  supplier_name: string;
  last_purchase_date: string;
}

export interface PurchaseOrderItem {
  material_id: string;
  material_name: string;
  sku: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  folio: string;
  supplier_id: string;
  supplier_name: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  total_amount: number;
  currency: string;
  generated_by: 'agent' | 'manual';
  ai_justification?: string;
  requested_delivery_date: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface StockPrediction {
  material_id: string;
  material_name: string;
  current_stock: number;
  min_stock: number;
  avg_daily_consumption: number;
  days_until_stockout: number;       // días hasta llegar a mínimo
  days_until_empty: number;          // días hasta llegar a cero
  recommended_order_qty: number;
  urgency: 'critical' | 'warning' | 'ok';
  unit_cost: number;
  total_order_cost: number;
  supplier_name: string;
  lead_time_days: number;
}

export interface AgentRun {
  id: string;
  ran_at: string;
  items_analyzed: number;
  orders_generated: number;
  total_value: number;
  critical_alerts: number;
}
