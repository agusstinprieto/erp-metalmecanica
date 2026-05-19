import { supabase } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  location: string;
  created_at?: string;
  descripcion_mp?: string; // Support for the industrial table
}

export interface Material extends InventoryItem {
  unit_cost?: number;
}

export interface InventoryMovement {
  id: string;
  material_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  created_at: string;
}

export const inventoryService = {
  /**
   * Lista todos los materiales y su stock actual.
   */
  /** Alias de getItems() — compatibilidad con ReportsView */
  async listMaterials() {
    return this.getItems();
  },

  async getItems() {
    // Intentar primero con la tabla industrial 'materiales'
    const { data, error } = await supabase
      .from('materiales')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) return this.mapItems(data);

    // Fallback a 'suministros' (nombre anterior de la tabla)
    const { data: altData, error: altError } = await supabase
      .from('suministros')
      .select('*')
      .order('created_at', { ascending: false });

    if (!altError && altData) return this.mapItems(altData);

    console.error('Error cargando materiales:', error || altError);
    return [];
  },

  /** Helper para mapear campos de BD a UI */
  mapItems(data: any[]): InventoryItem[] {
    return (data || []).map(item => ({
      ...item,
      name: item.name || item.descripcion_mp || 'Sin nombre',
      sku: item.sku || item.grado || 'S/SKU',
      quantity: item.stock_quantity || item.quantity || item.peso_mp || 0,
      unit: item.unit || item.unidad_medida || 'kg',
      location: item.location || 'ALMACÉN'
    })) as InventoryItem[];
  },

  /**
   * Registra un nuevo material.
   */
  async createItem(item: Partial<InventoryItem>) {
    const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();

    const dbItem = {
      ...item,
      stock_quantity: item.quantity,
      tenant_id: tenantData?.id
    };
    delete (dbItem as any).quantity;

    // Intentamos insertar en 'materiales' (la nueva)
    const { data, error } = await supabase
      .from('materiales')
      .insert({
        name: item.name,
        descripcion_mp: item.name,
        sku: item.sku,
        category: item.category,
        categoria: item.category,
        unit: item.unit,
        unidad: item.unit,
        min_stock: item.min_stock,
        stock_minimo: item.min_stock,
        location: item.location,
        ubicacion: item.location,
        description: item.description,
        cantidad: item.quantity,
        peso_mp: item.quantity,
        tenant_id: tenantData?.id
      })
      .select()
      .single();

    if (error) {
      // Fallback a 'suministros'
      const { data: altData, error: altError } = await supabase
        .from('suministros')
        .insert(dbItem)
        .select()
        .single();
      if (altError) throw altError;
      return altData as InventoryItem;
    }
    return data as InventoryItem;
  },

  /**
   * Actualiza un material.
   */
  async updateItem(id: string, updates: Partial<InventoryItem>) {
    const dbUpdates = { ...updates };
    if (updates.quantity !== undefined) {
      (dbUpdates as any).stock_quantity = updates.quantity;
      delete (dbUpdates as any).quantity;
    }

    // Intentar en 'materiales'
    const { data, error } = await supabase
      .from('materiales')
      .update({
        descripcion_mp: updates.name,
        peso_mp: updates.quantity,
        ...(updates.sku       !== undefined && { sku: updates.sku }),
        ...(updates.category  !== undefined && { category: updates.category }),
        ...(updates.unit      !== undefined && { unit: updates.unit }),
        ...(updates.min_stock !== undefined && { min_stock: updates.min_stock }),
        ...(updates.location  !== undefined && { location: updates.location }),
        ...(updates.description !== undefined && { description: updates.description }),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!data || error) {
      // Intentar en 'suministros'
      const { data: altData, error: altError } = await supabase
        .from('suministros')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (altError) throw altError;
      return altData as InventoryItem;
    }
    return data as InventoryItem;
  },

  /**
   * Elimina un material.
   */
  async deleteItem(id: string) {
    // Intentar en ambas
    await supabase.from('materiales').delete().eq('id', id);
    await supabase.from('suministros').delete().eq('id', id);
  },

  /**
   * Registra un movimiento de inventario (Entrada o Salida).
   * Actualiza el stock en la tabla suministros.
   */
  async registerMovement(movement: Partial<InventoryMovement>) {
    const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();

    // 1. Insertar el movimiento
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert({ ...movement, tenant_id: tenantData?.id })
      .select()
      .single();

    if (error) throw error;

    // 2. Actualizar el stock actual del material
    const materialId = movement.material_id!;
    const adjustment = movement.type === 'IN' ? Number(movement.quantity) : -Number(movement.quantity);

    // Intentar actualizar en suministros
    const { data: matData } = await supabase
      .from('suministros')
      .select('stock_quantity')
      .eq('id', materialId)
      .single();
    
    if (matData) {
      const newStock = (matData.stock_quantity || 0) + adjustment;
      await supabase.from('suministros').update({ stock_quantity: newStock }).eq('id', materialId);
    }

    // También intentar en materiales (industrial)
    const { data: mpData } = await supabase
      .from('materiales')
      .select('peso_mp')
      .eq('id', materialId)
      .single();

    if (mpData) {
      const newWeight = (mpData.peso_mp || 0) + adjustment;
      await supabase.from('materiales').update({ peso_mp: newWeight }).eq('id', materialId);
    }

    return data;
  },

  /**
   * Obtiene el historial de movimientos para un material.
   */
  async getMovements(materialId: string) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('material_id', materialId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as InventoryMovement[];
  },

  /**
   * Genera órdenes de compra automáticas en Supabase para materiales bajo mínimo.
   * Inserta en `ordenes_compra` una OC por material sugerido.
   */
  async createAutoPurchaseOrders(suggestions: (InventoryItem & { suggested_qty: number; urgency: string })[]) {
    const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
    const today = new Date().toISOString().split('T')[0];

    const rows = suggestions.map(s => ({
      tenant_id:         tenantData?.id ?? null,
      numero_oc:         `OC-AUTO-${Date.now().toString(36).toUpperCase()}-${s.sku}`.slice(0, 40),
      material_id:       s.id,
      descripcion:       s.name,
      cantidad_pedida:   s.suggested_qty,
      unidad:            s.unit,
      urgencia:          s.urgency,
      status:            'pendiente',
      fecha_emision:     today,
      fecha_requerida:   new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      generado_por:      'SISTEMA_AUTO',
    }));

    const { error } = await supabase.from('ordenes_compra').insert(rows);
    if (error) throw error;
    return rows.length;
  },

  /**
   * Retorna materiales por debajo del stock mínimo con cantidad sugerida de pedido.
   */
  getPurchaseSuggestions(items: InventoryItem[]) {
    return items
      .filter(item => (item.min_stock || 5) > 0 && item.quantity <= (item.min_stock || 5))
      .map(item => ({
        ...item,
        suggested_qty: Math.max((item.min_stock || 5) * 3 - item.quantity, (item.min_stock || 5)),
        urgency: item.quantity === 0 ? 'critico' : 'bajo',
      }))
      .sort((a, b) => a.quantity - b.quantity);
  },
};

