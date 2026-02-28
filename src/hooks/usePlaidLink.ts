import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePlaidLink as usePlaidLinkSDK, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';

interface PlaidLinkResult {
  linkToken: string | null;
  error: string | null;
  isConfigured: boolean;
}

export interface PlaidInitResult {
  success: boolean;
  error?: string;
  linkToken?: string;
  env?: string;
  plaidError?: {
    error_code: string;
    error_message: string;
    error_type: string;
    request_id: string;
  };
  clientIdLength?: number;
  secretLength?: number;
}

export function usePlaidLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  const createLinkToken = useCallback(async (): Promise<PlaidLinkResult> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('plaid-create-link-token');

      if (error) {
        console.error('Plaid link token error:', error);
        return { linkToken: null, error: error.message, isConfigured: false };
      }

      if (data?.error === 'plaid_not_configured') {
        setIsConfigured(false);
        return { linkToken: null, error: null, isConfigured: false };
      }

      if (data?.link_token) {
        setLinkToken(data.link_token);
        setIsConfigured(true);
        return { linkToken: data.link_token, error: null, isConfigured: true };
      }

      return { linkToken: null, error: data?.error || 'Unknown error', isConfigured: true };
    } catch (err) {
      console.error('Error creating link token:', err);
      return { linkToken: null, error: 'Failed to connect to Plaid', isConfigured: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exchangeToken = useCallback(async (publicToken: string, metadata: any) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
        body: { public_token: publicToken, metadata },
      });

      if (error) {
        console.error('Plaid exchange error:', error);
        toast.error('Failed to connect bank account');
        return null;
      }

      if (data?.success) {
        toast.success(data.message || 'Bank account connected successfully');
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
        return data.accounts;
      }

      toast.error(data?.error || 'Failed to connect bank account');
      return null;
    } catch (err) {
      console.error('Error exchanging token:', err);
      toast.error('Failed to connect bank account');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  const syncTransactions = useCallback(async (bankAccountId?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('plaid-sync-transactions', {
        body: bankAccountId ? { bank_account_id: bankAccountId } : {},
      });

      if (error) {
        console.error('Plaid sync error:', error);
        toast.error('Failed to sync transactions');
        return null;
      }

      if (data?.success) {
        toast.success(`Synced ${data.totalSynced} transactions`);
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
        return data;
      }

      if (data?.error === 'plaid_not_configured') {
        toast.error('Plaid is not configured yet');
        return null;
      }

      toast.error(data?.error || 'Failed to sync transactions');
      return null;
    } catch (err) {
      console.error('Error syncing transactions:', err);
      toast.error('Failed to sync transactions');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  const refreshBalances = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('plaid-get-balances');

      if (error) {
        console.error('Plaid balance error:', error);
        toast.error('Failed to refresh balances');
        return null;
      }

      if (data?.accounts) {
        toast.success('Balances refreshed');
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
        return data.accounts;
      }

      if (data?.error === 'plaid_not_configured') {
        toast.error('Plaid is not configured yet');
        return null;
      }

      toast.error(data?.error || 'Failed to refresh balances');
      return null;
    } catch (err) {
      console.error('Error refreshing balances:', err);
      toast.error('Failed to refresh balances');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  return {
    isLoading,
    linkToken,
    isConfigured,
    createLinkToken,
    exchangeToken,
    syncTransactions,
    refreshBalances,
  };
}

// Hook to manage Plaid Link flow
export function usePlaidLinkFlow(onSuccess?: () => void) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [plaidError, setPlaidError] = useState<PlaidInitResult | null>(null);
  const [linkExitError, setLinkExitError] = useState<any>(null);
  const queryClient = useQueryClient();

  const handleSuccess: PlaidLinkOnSuccess = useCallback(async (publicToken, metadata) => {
    try {
      setLinkExitError(null);
      const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
        body: { public_token: publicToken, metadata },
      });

      if (error) {
        console.error('Plaid exchange error:', error);
        toast.error('Failed to connect bank account');
        return;
      }

      if (data?.success) {
        toast.success(data.message || 'Bank account connected successfully!');
        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
        
        // Auto-sync transactions after connecting
        setIsSyncing(true);
        toast.info('Syncing transactions... This may take a moment.');
        
        try {
          const { data: syncData, error: syncError } = await supabase.functions.invoke('plaid-sync-transactions');
          
          if (syncError) {
            console.error('Auto-sync error:', syncError);
            toast.error('Connected successfully, but failed to sync transactions. Try syncing manually.');
          } else if (syncData?.success) {
            toast.success(`Synced ${syncData.totalSynced} transactions from your bank!`);
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
          }
        } catch (syncErr) {
          console.error('Auto-sync error:', syncErr);
        } finally {
          setIsSyncing(false);
        }
        
        onSuccess?.();
      } else {
        toast.error(data?.error || 'Failed to connect bank account');
      }
    } catch (err) {
      console.error('Error exchanging token:', err);
      toast.error('Failed to connect bank account');
    }
  }, [queryClient, onSuccess]);

  const handleExit: PlaidLinkOnExit = useCallback((err, metadata) => {
    if (err) {
      setLinkExitError(err as any);
      console.error('Plaid Link exit with error:', err);
      const msg = (err as any)?.display_message || (err as any)?.error_message || 'Connection was interrupted. Please try again.';
      toast.error(msg, { duration: 10000 });
    }
  }, []);

  const { open, ready } = usePlaidLinkSDK({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  });

  const initiatePlaidLink = useCallback(async (): Promise<PlaidInitResult> => {
    setIsCreatingToken(true);
    setPlaidError(null); // Clear previous errors
    setLinkExitError(null);
    try {
      const { data, error } = await supabase.functions.invoke('plaid-create-link-token');

      if (error) {
        console.error('Plaid link token error:', error);
        toast.error('Failed to initialize bank connection');
        const result: PlaidInitResult = { success: false, error: 'network_error' };
        setPlaidError(result);
        return result;
      }

      // Handle not configured
      if (data?.error === 'plaid_not_configured') {
        setIsConfigured(false);
        toast.info('Plaid is not configured yet. Add your API keys to connect banks.');
        const result: PlaidInitResult = { success: false, error: 'plaid_not_configured' };
        return result;
      }

      // Handle Plaid API errors (credentials, env mismatch, etc.)
      if (data?.success === false && data?.plaid_error) {
        setIsConfigured(true); // Plaid IS configured, just with wrong credentials
        const plaidErrorData = data.plaid_error;
        const env = data.env || 'unknown';
        
        console.error('Plaid API Error:', plaidErrorData, 'env:', env);
        
        // Build a user-friendly message
        let userMessage = `Plaid error: ${plaidErrorData.error_message || 'Unknown error'}`;
        if (plaidErrorData.error_code === 'INVALID_API_KEYS') {
          userMessage = `Invalid Plaid credentials for env="${env}". Please verify your PLAID_CLIENT_ID and PLAID_SECRET match your ${env} environment in the Plaid dashboard.`;
        }
        
        toast.error(userMessage, { duration: 10000 });
        const result: PlaidInitResult = { 
          success: false, 
          error: 'plaid_api_error', 
          plaidError: plaidErrorData, 
          env,
          clientIdLength: data.client_id_length,
          secretLength: data.secret_length,
        };
        setPlaidError(result);
        return result;
      }

      // Success
      if (data?.link_token) {
        setLinkToken(data.link_token);
        setIsConfigured(true);
        setPlaidError(null);
        return { success: true, linkToken: data.link_token, env: data.env };
      }

      // Fallback
      toast.error(data?.message || data?.error || 'Failed to initialize bank connection');
      const result: PlaidInitResult = { success: false, error: data?.error || 'unknown' };
      setPlaidError(result);
      return result;
    } catch (err) {
      console.error('Error creating link token:', err);
      toast.error('Failed to initialize bank connection');
      const result: PlaidInitResult = { success: false, error: 'exception' };
      setPlaidError(result);
      return result;
    } finally {
      setIsCreatingToken(false);
    }
  }, []);

  // Open Plaid Link once ready and token is set
  const openPlaidLink = useCallback(() => {
    if (ready && linkToken) {
      open();
    }
  }, [ready, linkToken, open]);

  return {
    initiatePlaidLink,
    openPlaidLink,
    isCreatingToken,
    isConfigured,
    isSyncing,
    plaidError,
    linkExitError,
    ready: ready && !!linkToken,
  };
}
