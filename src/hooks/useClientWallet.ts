import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientWallet {
  id: string;
  client_id: string;
  ad_spend_balance: number;
  low_balance_threshold: number;
  auto_charge_amount: number | null;
  auto_billing_enabled: boolean;
  monthly_ad_spend_cap: number | null;
  billing_mode: 'manual' | 'auto_stripe' | 'admin_exempt';
  last_calculated_at: string;
  last_auto_charge_at: string | null;
  last_charge_failed_at: string | null;
  tracking_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  client_id: string;
  transaction_type: 'deposit' | 'spend' | 'adjustment';
  amount: number;
  balance_after: number;
  description: string | null;
  billing_record_id: string | null;
  created_at: string;
}

export function useClientWallet(clientId?: string) {
  return useQuery({
    queryKey: ['client-wallet', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('client_wallets')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as ClientWallet | null;
    },
    enabled: !!clientId,
  });
}

export function useWalletTransactions(clientId?: string) {
  return useQuery({
    queryKey: ['wallet-transactions', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!clientId,
  });
}

export function useCreateOrUpdateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      ad_spend_balance?: number;
      low_balance_threshold?: number;
      auto_charge_amount?: number | null;
      auto_billing_enabled?: boolean;
      monthly_ad_spend_cap?: number | null;
      billing_mode?: 'manual' | 'auto_stripe' | 'admin_exempt';
    }) => {
      // Check if wallet exists
      const { data: existing } = await supabase
        .from('client_wallets')
        .select('id')
        .eq('client_id', input.client_id)
        .maybeSingle();

      const { client_id, ...fields } = input;

      if (existing) {
        // Update existing — only include defined fields
        const updateData: Record<string, any> = { last_calculated_at: new Date().toISOString() };
        if (fields.ad_spend_balance !== undefined) updateData.ad_spend_balance = fields.ad_spend_balance;
        if (fields.low_balance_threshold !== undefined) updateData.low_balance_threshold = fields.low_balance_threshold;
        if (fields.auto_charge_amount !== undefined) updateData.auto_charge_amount = fields.auto_charge_amount;
        if (fields.auto_billing_enabled !== undefined) updateData.auto_billing_enabled = fields.auto_billing_enabled;
        if (fields.monthly_ad_spend_cap !== undefined) updateData.monthly_ad_spend_cap = fields.monthly_ad_spend_cap;
        if (fields.billing_mode !== undefined) updateData.billing_mode = fields.billing_mode;

        const { data, error } = await supabase
          .from('client_wallets')
          .update(updateData)
          .eq('client_id', client_id)
        .select()
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Wallet update failed — no rows returned');
        return data as ClientWallet;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('client_wallets')
          .insert({
            client_id,
            ad_spend_balance: fields.ad_spend_balance ?? 0,
            low_balance_threshold: fields.low_balance_threshold ?? 150,
            auto_charge_amount: fields.auto_charge_amount,
            auto_billing_enabled: fields.auto_billing_enabled ?? false,
            monthly_ad_spend_cap: fields.monthly_ad_spend_cap,
            billing_mode: fields.billing_mode ?? 'manual',
          })
          .select()
          .single();

        if (error) throw error;
        return data as ClientWallet;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-wallet', data.client_id] });
    },
  });
}

export function useAddWalletDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      amount: number;
      description?: string;
      billing_record_id?: string;
    }) => {
      // Get or create wallet
      let wallet: ClientWallet;
      const { data: existing } = await supabase
        .from('client_wallets')
        .select('*')
        .eq('client_id', input.client_id)
        .maybeSingle();

      if (existing) {
        wallet = existing as ClientWallet;
      } else {
        const { data: newWallet, error: createError } = await supabase
          .from('client_wallets')
          .insert({ client_id: input.client_id, ad_spend_balance: 0 })
          .select()
          .single();
        
        if (createError) throw createError;
        wallet = newWallet as ClientWallet;
      }

      const newBalance = Number(wallet.ad_spend_balance) + input.amount;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('client_wallets')
        .update({ 
          ad_spend_balance: newBalance,
          last_calculated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateError) throw updateError;

      // Record transaction
      const transactionType = input.amount >= 0 ? 'deposit' : 'adjustment';
      const { data: transaction, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          client_id: input.client_id,
          transaction_type: transactionType,
          amount: input.amount,
          balance_after: newBalance,
          description: input.description || (input.amount >= 0 ? 'Ad spend deposit' : 'Manual adjustment'),
          billing_record_id: input.billing_record_id,
        })
        .select()
        .single();

      if (txError) throw txError;
      return transaction as WalletTransaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-wallet', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', variables.client_id] });
    },
  });
}

export function useUpdateWalletSpend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      mtd_spend: number;
    }) => {
      // Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from('client_wallets')
        .select('*')
        .eq('client_id', input.client_id)
        .maybeSingle();

      if (walletError) throw walletError;
      if (!wallet) return null;

      // Calculate remaining balance (deposits - MTD spend)
      // The MTD spend comes from the sheet, we just store it for reference
      const { error: updateError } = await supabase
        .from('client_wallets')
        .update({ 
          last_calculated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateError) throw updateError;
      return wallet as ClientWallet;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-wallet', variables.client_id] });
    },
  });
}
