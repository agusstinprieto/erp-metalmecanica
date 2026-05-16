import { supabase } from '../lib/supabase';

export const plaidService = {
  /**
   * Crea un Link Token llamando a la Edge Function
   */
  async createLinkToken(userId?: string) {
    const { data, error } = await supabase.functions.invoke('plaid-manager', {
      body: { action: 'create-link-token', userId }
    });

    if (error) throw error;
    return data.link_token;
  },

  /**
   * Intercambia el public_token por un access_token (vía Edge Function)
   */
  async exchangePublicToken(publicToken: string, metadata: any, userId?: string) {
    const { data, error } = await supabase.functions.invoke('plaid-manager', {
      body: { 
        action: 'exchange-token', 
        publicToken, 
        metadata,
        userId 
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sincroniza transacciones de una cuenta específica
   */
  async syncTransactions(accountId: string) {
    const { data, error } = await supabase.functions.invoke('plaid-manager', {
      body: { action: 'sync-transactions', accountId }
    });

    if (error) throw error;
    return data.transactions;
  },

  /**
   * Lista las cuentas bancarias conectadas
   */
  async listConnectedAccounts() {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
