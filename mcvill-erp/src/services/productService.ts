import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  unit?: string;
  created_at: string;
}

export const productService = {
  async listProducts() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('sku', { ascending: true });

    if (error) throw error;
    return data as Product[];
  }
};
