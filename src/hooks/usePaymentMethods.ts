import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';

export interface PaymentMethod {
  id: string;
  client_id: string;
  stripe_account: 'ad_spend' | 'management';
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  card_brand: string | null;
  card_last_four: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  is_default: boolean;
  created_at: string;
}

export function usePaymentMethods(clientId?: string) {
  return useQuery({
    queryKey: ['payment-methods', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payment_methods')
        .select('*')
        .eq('client_id', clientId!)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!clientId,
  });
}

export function useDefaultPaymentMethod(clientId?: string, stripeAccount?: 'ad_spend' | 'management') {
  return useQuery({
    queryKey: ['default-payment-method', clientId, stripeAccount],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payment_methods')
        .select('*')
        .eq('client_id', clientId!)
        .eq('stripe_account', stripeAccount!)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      return data as PaymentMethod | null;
    },
    enabled: !!clientId && !!stripeAccount,
  });
}

export function useSyncStripeCards(clientId?: string) {
  const queryClient = useQueryClient();
  const hasSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!clientId || hasSyncedRef.current === clientId) return;
    hasSyncedRef.current = clientId;

    supabase.functions.invoke('sync-stripe-cards', {
      body: { client_id: clientId },
    }).then(({ data, error }) => {
      if (error) {
        console.error('sync-stripe-cards error:', error);
        return;
      }
      const synced = data?.synced;
      if (synced && (synced.management > 0 || synced.ad_spend > 0)) {
        queryClient.invalidateQueries({ queryKey: ['payment-methods', clientId] });
        queryClient.invalidateQueries({ queryKey: ['default-payment-method', clientId] });
      }
    });
  }, [clientId, queryClient]);
}

export function useCreateSetupIntent() {
  return useMutation({
    mutationFn: async ({ clientId, stripeAccount }: { clientId: string; stripeAccount: 'ad_spend' | 'management' }) => {
      const { data, error } = await supabase.functions.invoke('create-setup-intent', {
        body: { client_id: clientId, stripe_account: stripeAccount },
      });

      if (error) throw error;
      return data as { client_secret: string; stripe_customer_id: string };
    },
  });
}

export function useSavePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      stripeAccount,
      setupIntentId,
    }: {
      clientId: string;
      stripeAccount: 'ad_spend' | 'management';
      setupIntentId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('save-payment-method', {
        body: {
          client_id: clientId,
          stripe_account: stripeAccount,
          setup_intent_id: setupIntentId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['default-payment-method', variables.clientId] });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentMethodId, clientId }: { paymentMethodId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_payment_methods')
        .delete()
        .eq('id', paymentMethodId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['default-payment-method', variables.clientId] });
    },
  });
}
