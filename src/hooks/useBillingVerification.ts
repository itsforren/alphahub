import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──

export interface AuditBooksResult {
  status: 'clean' | 'warning' | 'problem';
  summary: string;
  discrepancies: Array<{
    billing_record_id?: string;
    wallet_transaction_id?: string;
    amount: number;
    issue: string;
  }>;
  quarantined_count: number;
  admin_verified: boolean;
  balance: number;
  checked_at: string;
}

export interface SyncHealthEntry {
  function_name: string;
  consecutive_failures: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
}

export interface ClientVerification {
  id: string;
  client_id: string;
  billing_record_id: string | null;
  wallet_transaction_id: string | null;
  status: string;
  matched_stripe_charge_id: string | null;
  matched_stripe_amount: number | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_method: string | null;
  resolution_notes: string | null;
  ai_analysis: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ClientVerificationSummary {
  clientId: string;
  verifiedAt: string;
}

// ── Hooks ──

/**
 * Calls audit_books() RPC for a single client. Returns typed audit result.
 * Always fresh when checking (staleTime: 0).
 */
export function useAuditBooks(clientId: string | null) {
  return useQuery({
    queryKey: ['audit-books', clientId],
    queryFn: async (): Promise<AuditBooksResult> => {
      if (!clientId) throw new Error('No client ID');

      const { data, error } = await supabase.rpc('audit_books', {
        p_client_id: clientId,
      });

      if (error) throw error;

      // audit_books returns a JSONB result -- parse if string
      const result = typeof data === 'string' ? JSON.parse(data) : data;

      return {
        status: result.status ?? 'problem',
        summary: result.summary ?? '',
        discrepancies: result.discrepancies ?? [],
        quarantined_count: result.quarantined_count ?? 0,
        admin_verified: result.admin_verified ?? false,
        balance: result.balance ?? 0,
        checked_at: new Date().toISOString(),
      };
    },
    enabled: !!clientId,
    staleTime: 0,
  });
}

/**
 * Queries sync_failure_log table for all 4 sync functions.
 * Auto-refreshes every 60s.
 */
export function useSyncHealth() {
  return useQuery({
    queryKey: ['sync-health'],
    queryFn: async (): Promise<SyncHealthEntry[]> => {
      const { data, error } = await supabase
        .from('sync_failure_log')
        .select('*');

      if (error) throw error;
      return (data ?? []) as SyncHealthEntry[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/**
 * Queries billing_verifications for a specific client. READ-ONLY.
 * Write mutation comes in Plan 02.
 */
export function useClientVerifications(clientId: string | null) {
  return useQuery({
    queryKey: ['client-verifications', clientId],
    queryFn: async (): Promise<ClientVerification[]> => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('billing_verifications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as ClientVerification[];
    },
    enabled: !!clientId,
    staleTime: 0,
  });
}

/**
 * Queries ALL verified billing_verifications to show which clients are verified
 * in the overview table. Groups by client_id, returns most recent verified_at per client.
 */
export function useAllClientVerifications() {
  return useQuery({
    queryKey: ['all-client-verifications'],
    queryFn: async (): Promise<Map<string, ClientVerificationSummary>> => {
      const { data, error } = await supabase
        .from('billing_verifications')
        .select('client_id, verified_at')
        .eq('status', 'verified')
        .order('verified_at', { ascending: false });

      if (error) throw error;

      // Group by client_id, keep most recent verified_at
      const map = new Map<string, ClientVerificationSummary>();
      for (const row of data ?? []) {
        if (!map.has(row.client_id)) {
          map.set(row.client_id, {
            clientId: row.client_id,
            verifiedAt: row.verified_at ?? '',
          });
        }
      }
      return map;
    },
    staleTime: 30_000,
  });
}
