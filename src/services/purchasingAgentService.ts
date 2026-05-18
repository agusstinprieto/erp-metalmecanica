import type { Material, PurchaseOrder, PurchaseOrderItem, StockPrediction, AgentRun } from '../types/purchasing';

// ==================== MOCK DATA - Materiales Metalmecanica ====================

const mockMaterials: Material[] = [
  {
    id: 'mat-001', name: 'Lámina HR A36 1/8"', sku: 'LAM-HR-125',
    category: 'acero', unit: 'kg', current_stock: 420, min_stock: 800,
    max_stock: 3000, avg_daily_consumption: 95, lead_time_days: 5,
    unit_cost: 28.50, supplier_id: 'sup-001', supplier_name: 'Aceros Monterrey SA',
    last_purchase_date: '2026-04-28'
  },
  {
    id: 'mat-002', name: 'Varilla Corrugada 3/8"', sku: 'VAR-COR-375',
    category: 'acero', unit: 'kg', current_stock: 1250, min_stock: 600,
    max_stock: 4000, avg_daily_consumption: 40, lead_time_days: 3,
    unit_cost: 22.00, supplier_id: 'sup-001', supplier_name: 'Aceros Monterrey SA',
    last_purchase_date: '2026-05-01'
  },
  {
    id: 'mat-003', name: 'Alambre de Soldar ER70S-6 0.9mm', sku: 'SOL-ER70-09',
    category: 'consumibles', unit: 'carrete', current_stock: 8, min_stock: 20,
    max_stock: 80, avg_daily_consumption: 2.5, lead_time_days: 7,
    unit_cost: 890, supplier_id: 'sup-002', supplier_name: 'Praxair México',
    last_purchase_date: '2026-04-15'
  },
  {
    id: 'mat-004', name: 'Disco de Corte 7" Metabo', sku: 'DIS-COR-7M',
    category: 'consumibles', unit: 'pieza', current_stock: 35, min_stock: 50,
    max_stock: 200, avg_daily_consumption: 8, lead_time_days: 2,
    unit_cost: 48, supplier_id: 'sup-003', supplier_name: 'Ferretería Industrial García',
    last_purchase_date: '2026-05-05'
  },
  {
    id: 'mat-005', name: 'Gas Argón 99.9% (cilindro 50L)', sku: 'GAS-ARG-50',
    category: 'quimicos', unit: 'cilindro', current_stock: 3, min_stock: 8,
    max_stock: 25, avg_daily_consumption: 0.8, lead_time_days: 4,
    unit_cost: 1450, supplier_id: 'sup-002', supplier_name: 'Praxair México',
    last_purchase_date: '2026-04-20'
  },
  {
    id: 'mat-006', name: 'Perfil Tubular Cuadrado 2"x2" Cal.14', sku: 'TUB-CUA-2C14',
    category: 'acero', unit: 'barra 6m', current_stock: 180, min_stock: 100,
    max_stock: 500, avg_daily_consumption: 12, lead_time_days: 5,
    unit_cost: 320, supplier_id: 'sup-001', supplier_name: 'Aceros Monterrey SA',
    last_purchase_date: '2026-05-03'
  },
  {
    id: 'mat-007', name: 'Pintura Epóxica Gris Industrial', sku: 'PIN-EPI-GRS',
    category: 'quimicos', unit: 'cubeta 19L', current_stock: 12, min_stock: 10,
    max_stock: 40, avg_daily_consumption: 1.2, lead_time_days: 3,
    unit_cost: 2800, supplier_id: 'sup-004', supplier_name: 'Pinturas Comex Industrial',
    last_purchase_date: '2026-05-08'
  },
  {
    id: 'mat-008', name: 'Tornillo Hex M12x40 Grado 8.8', sku: 'TOR-HEX-M12',
    category: 'componentes', unit: 'caja 100pz', current_stock: 6, min_stock: 15,
    max_stock: 60, avg_daily_consumption: 1.5, lead_time_days: 2,
    unit_cost: 185, supplier_id: 'sup-003', supplier_name: 'Ferretería Industrial García',
    last_purchase_date: '2026-04-25'
  },
];

// ==================== PREDICTION ENGINE ====================

export const analyzeMaterials = (materials: Material[]): StockPrediction[] => {
  return materials.map(mat => {
    const days_until_min = mat.avg_daily_consumption > 0
      ? Math.floor((mat.current_stock - mat.min_stock) / mat.avg_daily_consumption)
      : 999;
    const days_until_empty = mat.avg_daily_consumption > 0
      ? Math.floor(mat.current_stock / mat.avg_daily_consumption)
      : 999;

    // Reorden óptimo: consumo durante lead time + stock de seguridad (30 días)
    const safety_stock = mat.avg_daily_consumption * 30;
    const reorder_qty = Math.ceil(
      (mat.avg_daily_consumption * mat.lead_time_days) + safety_stock - mat.current_stock
    );
    const recommended_order_qty = Math.max(reorder_qty, 0);

    let urgency: StockPrediction['urgency'] = 'ok';
    if (days_until_min <= 0 || days_until_min <= mat.lead_time_days) {
      urgency = 'critical';
    } else if (days_until_min <= mat.lead_time_days * 2) {
      urgency = 'warning';
    }

    return {
      material_id: mat.id,
      material_name: mat.name,
      current_stock: mat.current_stock,
      min_stock: mat.min_stock,
      avg_daily_consumption: mat.avg_daily_consumption,
      days_until_stockout: Math.max(0, days_until_min),
      days_until_empty: Math.max(0, days_until_empty),
      recommended_order_qty,
      urgency,
      unit_cost: mat.unit_cost,
      total_order_cost: recommended_order_qty * mat.unit_cost,
      supplier_name: mat.supplier_name,
      lead_time_days: mat.lead_time_days,
    };
  });
};

// ==================== ORDER GENERATION ====================

const buildFolio = () => {
  const now = new Date();
  const seq = Math.floor(Math.random() * 900) + 100;
  return `OC-${now.getFullYear()}-${seq}`;
};

export const generatePurchaseOrders = (
  predictions: StockPrediction[],
  materials: Material[]
): PurchaseOrder[] => {
  const needsOrder = predictions.filter(p => p.urgency !== 'ok' && p.recommended_order_qty > 0);

  // Agrupar por proveedor
  const bySupplier: Record<string, { items: PurchaseOrderItem[]; supplier_name: string }> = {};

  for (const pred of needsOrder) {
    const mat = materials.find(m => m.id === pred.material_id);
    if (!mat) continue;

    if (!bySupplier[mat.supplier_id]) {
      bySupplier[mat.supplier_id] = { items: [], supplier_name: mat.supplier_name };
    }

    bySupplier[mat.supplier_id].items.push({
      material_id: mat.id,
      material_name: mat.name,
      sku: mat.sku,
      quantity: pred.recommended_order_qty,
      unit: mat.unit,
      unit_cost: mat.unit_cost,
      total_cost: pred.recommended_order_qty * mat.unit_cost,
    });
  }

  const orders: PurchaseOrder[] = [];
  const now = new Date();

  for (const [supplier_id, data] of Object.entries(bySupplier)) {
    const total = data.items.reduce((s, i) => s + i.total_cost, 0);
    const maxLead = Math.max(...data.items.map(i => {
      const mat = materials.find(m => m.id === i.material_id);
      return mat?.lead_time_days ?? 5;
    }));
    const delivery = new Date(now);
    delivery.setDate(delivery.getDate() + maxLead + 1);

    const criticalItems = data.items.filter(i => {
      const pred = predictions.find(p => p.material_id === i.material_id);
      return pred?.urgency === 'critical';
    });

    const justification = criticalItems.length > 0
      ? `Agente detectó ${criticalItems.length} material(es) en nivel crítico: ${criticalItems.map(i => i.material_name).join(', ')}. Stock proyectado insuficiente para cubrir el lead time del proveedor.`
      : `Stock de ${data.items.length} material(es) caerá por debajo del mínimo operativo en los próximos días.`;

    orders.push({
      id: `oc-${Date.now()}-${supplier_id}`,
      tenant_id: 'mcvill',
      folio: buildFolio(),
      supplier_id,
      supplier_name: data.supplier_name,
      status: 'pending_approval',
      items: data.items,
      total_amount: total,
      currency: 'MXN',
      generated_by: 'agent',
      ai_justification: justification,
      requested_delivery_date: delivery.toISOString().split('T')[0],
      created_at: now.toISOString(),
    });
  }

  return orders;
};

// ==================== PUBLIC API ====================

export const getMaterials = async (_tenantId = 'mcvill'): Promise<Material[]> => {
  // En producción: await supabase.from('materials').select('*').eq('tenant_id', _tenantId)
  return mockMaterials;
};

export const runPurchasingAgent = async (tenantId = 'mcvill'): Promise<{
  predictions: StockPrediction[];
  orders: PurchaseOrder[];
  run: AgentRun;
}> => {
  const materials = await getMaterials(tenantId);
  const predictions = analyzeMaterials(materials);
  const orders = generatePurchaseOrders(predictions, materials);

  const criticalCount = predictions.filter(p => p.urgency === 'critical').length;
  const run: AgentRun = {
    id: `run-${Date.now()}`,
    ran_at: new Date().toISOString(),
    items_analyzed: materials.length,
    orders_generated: orders.length,
    total_value: orders.reduce((s, o) => s + o.total_amount, 0),
    critical_alerts: criticalCount,
  };

  return { predictions, orders, run };
};

export const approvePurchaseOrder = async (orderId: string): Promise<void> => {
  // En producción: await supabase.from('purchase_orders').update({ status: 'approved', approved_at: new Date() })
  console.log(`OC ${orderId} aprobada`);
};

export const rejectPurchaseOrder = async (orderId: string): Promise<void> => {
  console.log(`OC ${orderId} rechazada`);
};
