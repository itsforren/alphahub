import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  scope: 'all_records' | 'new_only' | 'records_through_date' | null;
}

export interface AIFinding {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  description: string;
  affected_records: string[];
  amount?: number;
  suggested_action: string;
  action_description: string;
}

export interface AIAnalysisResult {
  status: 'clean' | 'issues_found' | 'critical_issues' | 'error';
  summary: string;
  findings: AIFinding[];
  v1_manual_summary?: string;
  recommendations?: string[];
}

export interface AIAnalysisCached {
  result: AIAnalysisResult;
  analyzedAt: string;
}

export interface VerifyClientParams {
  clientId: string;
  notes?: string;
  scope: 'all_records' | 'new_only' | 'records_through_date';
  scopeDate?: string | null;
  legacyVerifiedCount?: number;
}

export interface VerifyRecordParams {
  clientId: string;
  billingRecordId: string;
  notes?: string;
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
 * Queries billing_verifications for a specific client.
 * Used by VerificationPanel for per-record and client-level verification display.
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
 * in the overview table. Groups by client_id, returns most recent CLIENT-LEVEL
 * verified_at per client (billing_record_id IS NULL = client-level stamp).
 */
export function useAllClientVerifications() {
  return useQuery({
    queryKey: ['all-client-verifications'],
    queryFn: async (): Promise<Map<string, ClientVerificationSummary>> => {
      const { data, error } = await supabase
        .from('billing_verifications')
        .select('client_id, verified_at, ai_analysis, billing_record_id')
        .eq('status', 'verified')
        .order('verified_at', { ascending: false });

      if (error) throw error;

      // Group by client_id, keep most recent CLIENT-LEVEL verification (billing_record_id IS NULL)
      const map = new Map<string, ClientVerificationSummary>();
      for (const row of data ?? []) {
        // Only client-level verifications count for overview stamp
        if (row.billing_record_id != null) continue;
        if (!map.has(row.client_id)) {
          const analysis = row.ai_analysis as Record<string, unknown> | null;
          const scope = (analysis?.scope as string) ?? null;
          map.set(row.client_id, {
            clientId: row.client_id,
            verifiedAt: row.verified_at ?? '',
            scope: scope as ClientVerificationSummary['scope'],
          });
        }
      }
      return map;
    },
    staleTime: 30_000,
  });
}

// ── Mutations ──

/**
 * Inserts a CLIENT-LEVEL verification stamp into billing_verifications.
 * billing_record_id = NULL means this is a client-level sign-off, not per-record.
 */
export function useVerifyClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: VerifyClientParams) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('billing_verifications')
        .insert({
          client_id: params.clientId,
          billing_record_id: null,
          wallet_transaction_id: null,
          status: 'verified',
          verified_by: userData.user.id,
          verified_at: new Date().toISOString(),
          verification_method: 'human',
          resolution_notes: params.notes || null,
          ai_analysis: {
            scope: params.scope,
            scope_date: params.scopeDate || null,
            legacy_verified_count: params.legacyVerifiedCount || 0,
          },
        });
      if (error) throw error;
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['audit-books'] });
      queryClient.invalidateQueries({ queryKey: ['billing-integrity'] });
      queryClient.invalidateQueries({ queryKey: ['client-verifications', params.clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-client-verifications'] });
    },
  });
}

/**
 * Inserts a PER-RECORD verification into billing_verifications.
 * Used for v1_manual record sign-off: billing_record_id is set, method is 'human'.
 */
export function useVerifyRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: VerifyRecordParams) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('billing_verifications')
        .insert({
          client_id: params.clientId,
          billing_record_id: params.billingRecordId,
          wallet_transaction_id: null,
          status: 'verified',
          verified_by: userData.user.id,
          verified_at: new Date().toISOString(),
          verification_method: 'human',
          resolution_notes: params.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['client-verifications', params.clientId] });
      queryClient.invalidateQueries({ queryKey: ['all-client-verifications'] });
    },
  });
}

// ── Stale Charging Records ──

export interface StaleChargingRecord {
  id: string;
  client_id: string;
  amount: number;
  status: string;
  updated_at: string;
  stripe_payment_intent_id: string | null;
  clients: { company_name: string } | null;
}

/**
 * Queries billing_records where status='charging' and updated_at > 4 hours ago.
 * Auto-refreshes every 60s for near-real-time monitoring.
 */
export function useStaleChargingRecords() {
  return useQuery({
    queryKey: ['stale-charging-records'],
    queryFn: async (): Promise<StaleChargingRecord[]> => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('billing_records')
        .select('id, client_id, amount, status, updated_at, stripe_payment_intent_id, clients!inner(company_name)')
        .eq('status', 'charging')
        .lt('updated_at', fourHoursAgo)
        .order('updated_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as StaleChargingRecord[];
    },
    refetchInterval: 60_000, // Check every minute
  });
}

// ── AI Analysis Hooks ──

/**
 * Mutation: calls analyze-billing edge function for a single client.
 * Returns structured AI analysis result. Invalidates verification queries on success.
 */
export function useAnalyzeBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string): Promise<AIAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke('analyze-billing', {
        body: { clientId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as AIAnalysisResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['all-client-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['all-ai-analyses'] });
    },
  });
}

/**
 * Read query: fetches the latest cached AI analysis for a client from billing_verifications.
 * Looks for verification_method = 'ai' and billing_record_id IS NULL (client-level).
 */
export function useClientAIAnalysis(clientId: string | null) {
  return useQuery({
    queryKey: ['client-ai-analysis', clientId],
    queryFn: async (): Promise<AIAnalysisCached | null> => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('billing_verifications')
        .select('ai_analysis, verified_at')
        .eq('client_id', clientId)
        .eq('verification_method', 'ai')
        .is('billing_record_id', null)
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data?.ai_analysis) return null;

      return {
        result: data.ai_analysis as unknown as AIAnalysisResult,
        analyzedAt: data.verified_at ?? '',
      };
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });
}

/**
 * Read query: fetches ALL client-level AI analyses for the overview table icons.
 * Returns a Map of clientId -> AIAnalysisResult.status.
 */
export function useAllAIAnalyses() {
  return useQuery({
    queryKey: ['all-ai-analyses'],
    queryFn: async (): Promise<Map<string, AIAnalysisResult['status']>> => {
      const { data, error } = await supabase
        .from('billing_verifications')
        .select('client_id, ai_analysis')
        .eq('verification_method', 'ai')
        .is('billing_record_id', null);

      if (error) throw error;

      const map = new Map<string, AIAnalysisResult['status']>();
      for (const row of data ?? []) {
        const analysis = row.ai_analysis as Record<string, unknown> | null;
        if (analysis?.status) {
          map.set(row.client_id, analysis.status as AIAnalysisResult['status']);
        }
      }
      return map;
    },
    staleTime: 30_000,
  });
}
