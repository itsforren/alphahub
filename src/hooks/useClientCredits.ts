import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CreditType = 'referral' | 'general';

export interface ClientCredit {
  id: string;
  client_id: string;
  amount: number;
  original_amount: number;
  remaining_balance: number;
  credit_type: CreditType;
  reason: string;
  applied_to_billing_id: string | null;
  applied_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCreditInput {
  client_id: string;
  amount: number;
  reason: string;
  credit_type: CreditType;
  expires_at?: string;
}

// Fetch all credits for a client
export function useClientCredits(clientId?: string) {
  return useQuery({
    queryKey: ['client-credits', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_credits')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientCredit[];
    },
    enabled: !!clientId,
  });
}

// Fetch only available (unused or partially used) credits for dropdown
export function useAvailableCredits(clientId?: string) {
  return useQuery({
    queryKey: ['available-credits', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_credits')
        .select('*')
        .eq('client_id', clientId!)
        .gt('remaining_balance', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out expired credits
      const now = new Date();
      return (data as ClientCredit[]).filter(credit => {
        if (!credit.expires_at) return true;
        return new Date(credit.expires_at) > now;
      });
    },
    enabled: !!clientId,
  });
}

// Create a new credit
export function useCreateCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCreditInput) => {
      const { data, error } = await supabase
        .from('client_credits')
        .insert({
          client_id: input.client_id,
          amount: input.amount,
          original_amount: input.amount,
          remaining_balance: input.amount,
          credit_type: input.credit_type,
          reason: input.reason,
          expires_at: input.expires_at,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClientCredit;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-credits', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['available-credits', data.client_id] });
    },
  });
}

// Apply credit (or partial credit) to a billing record
export function useApplyCreditToBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      creditId, 
      billingId, 
      clientId, 
      amountUsed 
    }: { 
      creditId: string; 
      billingId: string; 
      clientId: string; 
      amountUsed: number;
    }) => {
      // First get the current credit to calculate new remaining balance
      const { data: currentCredit, error: fetchError } = await supabase
        .from('client_credits')
        .select('*')
        .eq('id', creditId)
        .single();

      if (fetchError) throw fetchError;

      const newRemainingBalance = Math.max(0, (currentCredit.remaining_balance || currentCredit.amount) - amountUsed);

      const { data, error } = await supabase
        .from('client_credits')
        .update({
          applied_to_billing_id: billingId,
          applied_at: new Date().toISOString(),
          remaining_balance: newRemainingBalance,
        })
        .eq('id', creditId)
        .select()
        .single();

      if (error) throw error;
      return { credit: data as ClientCredit, clientId };
    },
    onSuccess: ({ clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-credits', clientId] });
      queryClient.invalidateQueries({ queryKey: ['available-credits', clientId] });
      queryClient.invalidateQueries({ queryKey: ['billing-records', clientId] });
    },
  });
}

// Delete any credit (admin only - no restrictions)
export function useDeleteCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_credits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, clientId };
    },
    onSuccess: ({ clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-credits', clientId] });
      queryClient.invalidateQueries({ queryKey: ['available-credits', clientId] });
    },
  });
}
