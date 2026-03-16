import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Client {
  id: string;
  agent_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  package_type: string | null;
  profile_image_url: string | null;
  headshot_updated_at: string | null;
  user_id: string | null;
  // Financial
  management_fee: number | null;
  monthly_ad_spend: number | null;
  renewal_date: string | null;
  // Extended fields
  team: string | null;
  states: string | null;
  ad_spend_budget: number | null;
  mtd_ad_spend: number | null;
  target_daily_spend: number | null;
  mtd_leads: number | null;
  booked_calls: number | null;
  applications: number | null;
  cpl: number | null;
  cpa: number | null;
  cpba: number | null;
  cpc: number | null;
  ctr: number | null;
  conversion_rate: number | null;
  nps_score: number | null;
  made_review: boolean | null;
  management_fee_renewal: string | null;
  ad_spend_renewal: string | null;
  // Links
  nfia_link: string | null;
  scheduler_link: string | null;
  crm_link: string | null;
  ads_link: string | null;
  lander_link: string | null;
  thankyou_link: string | null;
  subaccount_id: string | null;
  google_campaign_id: string | null;
  tfwp_profile_link: string | null;
  agreement_link: string | null;
  // Notes
  filters_notes: string | null;
  // Onboarding
  onboarding_status: 'pending' | 'in_progress' | 'automation_complete' | 'completed' | 'error' | null;
  onboarding_call_scheduled_at: string | null;
  contract_signed_at: string | null;
  // Quota
  current_quota: number | null;
  total_delivered: number | null;
  behind_target: number | null;
  ads_live: boolean | null;
  // Success Manager
  success_manager_name: string | null;
  success_manager_email: string | null;
  success_manager_phone: string | null;
  success_manager_image_url: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // A2P Status
  a2p_brand_status: string | null;
  a2p_campaign_status: string | null;
  a2p_last_synced_at: string | null;
  a2p_brand_id: string | null;
  a2p_campaign_id: string | null;
  // Commission Contract
  commission_contract_percent: number | null;
  // Referral
  referral_code: string | null;
  referred_by_client_id: string | null;
  referred_by_client_id_secondary: string | null;
  // GHL Reference
  ghl_contact_id: string | null;
  // Lifespan tracking
  start_date: string | null;
  churn_reason: string | null;
  deleted_at: string | null;
  // LTV & Historical data
  historical_total_paid: number | null;
  end_date: string | null;
  profit_margin: number | null;
}

export interface OnboardingTask {
  id: string;
  client_id: string;
  task_name: string;
  task_label: string;
  display_order: number;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all clients (admin only) - excludes soft-deleted clients
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data as Client[];
    },
  });
}

// Fetch archived/deleted clients (admin only)
export function useArchivedClients() {
  return useQuery({
    queryKey: ['clients', 'archived'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return data as (Client & { deleted_at: string; deleted_by: string | null })[];
    },
  });
}

// Fetch single client by ID
export function useClient(clientId?: string) {
  return useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
  });
}

// Fetch client by user_id (for client self-view)
export function useClientByUserId(userId?: string) {
  return useQuery({
    queryKey: ['clients', 'user', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as Client;
    },
    enabled: !!userId,
  });
}

// Fetch client by agent_id
export function useClientByAgentId(agentId?: string) {
  return useQuery({
    queryKey: ['clients', 'agent', agentId],
    queryFn: async () => {
      if (!agentId) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (error) throw error;
      return data as Client;
    },
    enabled: !!agentId,
  });
}

// Fetch onboarding tasks for a client
export function useOnboardingTasks(clientId?: string) {
  return useQuery({
    queryKey: ['onboarding-tasks', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('display_order');

      if (error) throw error;
      return data as OnboardingTask[];
    },
    enabled: !!clientId,
  });
}

// Update client
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, updates }: { clientId: string; updates: Partial<Client> }) => {
      // CAMP-09: Get old status if we're changing status (for auto-pause logic)
      let oldStatus: string | undefined;
      if (updates.status) {
        const { data: oldClient } = await supabase
          .from('clients')
          .select('status')
          .eq('id', clientId)
          .single();
        oldStatus = oldClient?.status;
      }

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;

      // CAMP-09: Auto-pause campaigns on status change to paused/cancelled/inactive/archived
      if (updates.status && oldStatus && updates.status !== oldStatus) {
        const pauseStatuses = ['paused', 'cancelled', 'inactive', 'archived'];
        if (pauseStatuses.includes(updates.status.toLowerCase())) {
          // Fire and forget -- don't block the mutation on Google Ads API latency
          supabase.functions.invoke('handle-client-status-change', {
            body: { clientId, oldStatus, newStatus: updates.status },
          }).catch((err) => {
            console.error('Auto-pause trigger failed:', err);
          });
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] });
      toast.success('Client updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update client');
    },
  });
}

// Update onboarding task
export function useUpdateOnboardingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      completed, 
      completedBy 
    }: { 
      taskId: string; 
      completed: boolean; 
      completedBy?: string;
    }) => {
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? completedBy : null,
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', data.client_id] });
      toast.success(data.completed ? 'Task completed' : 'Task unchecked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
}

// Create client (for manual creation or import)
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientData: Partial<Client> & { name: string; email: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(clientData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create client');
    },
  });
}

// Bulk import clients
export function useBulkImportClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clients: (Partial<Client> & { name: string; email: string })[]) => {
      // Process clients one by one to handle both email and agent_id conflicts
      const results: any[] = [];
      const errors: string[] = [];

      for (const client of clients) {
        // Check if client with this agent_id already exists
        if (client.agent_id) {
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('agent_id', client.agent_id)
            .maybeSingle();

          if (existing) {
            // Update existing client by agent_id
            const { data, error } = await supabase
              .from('clients')
              .update(client as any)
              .eq('id', existing.id)
              .select()
              .single();

            if (error) {
              errors.push(`${client.name}: ${error.message}`);
            } else if (data) {
              results.push(data);
            }
            continue;
          }
        }

        // Check if client with this email already exists
        const { data: existingByEmail } = await supabase
          .from('clients')
          .select('id')
          .eq('email', client.email)
          .maybeSingle();

        if (existingByEmail) {
          // Update existing client by email
          const { data, error } = await supabase
            .from('clients')
            .update(client as any)
            .eq('id', existingByEmail.id)
            .select()
            .single();

          if (error) {
            errors.push(`${client.name}: ${error.message}`);
          } else if (data) {
            results.push(data);
          }
        } else {
          // Insert new client
          const { data, error } = await supabase
            .from('clients')
            .insert(client as any)
            .select()
            .single();

          if (error) {
            errors.push(`${client.name}: ${error.message}`);
          } else if (data) {
            results.push(data);
          }
        }
      }

      if (errors.length > 0 && results.length === 0) {
        throw new Error(errors.join(', '));
      }

      return { results, errors };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      const message = data.errors.length > 0 
        ? `Imported ${data.results.length} clients (${data.errors.length} failed)`
        : `Successfully imported ${data.results.length} clients`;
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import clients');
    },
  });
}

// Soft delete client (moves to archive for 5 days)
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, deletedBy }: { clientId: string; deletedBy?: string }) => {
      const { error } = await supabase
        .from('clients')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy || null
        })
        .eq('id', clientId);

      if (error) throw error;

      // CAMP-09: Auto-pause campaigns on archive (soft delete)
      supabase.functions.invoke('handle-client-status-change', {
        body: { clientId, oldStatus: 'active', newStatus: 'archived' },
      }).catch((err) => {
        console.error('Auto-pause on archive failed:', err);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client archived - will be permanently deleted in 5 days');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive client');
    },
  });
}

// Restore a soft-deleted client
export function useRestoreClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ 
          deleted_at: null,
          deleted_by: null
        })
        .eq('id', clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore client');
    },
  });
}

// Permanently delete client (for use after 5-day archive period)
export function usePermanentlyDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client permanently deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to permanently delete client');
    },
  });
}

// Check if onboarding is complete for a client
export async function checkOnboardingComplete(clientId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('onboarding_tasks')
    .select('completed')
    .eq('client_id', clientId);

  if (error || !data) return false;
  return data.every(task => task.completed);
}

// Mark onboarding as complete
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase
        .from('clients')
        .update({ 
          onboarding_status: 'completed',
          status: 'active'
        })
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] });
      toast.success('Onboarding completed - client is now active');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete onboarding');
    },
  });
}

// Hard delete client with full data cleanup (for test accounts)
export function useHardDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      deleteAuthUser,
      deletedBy 
    }: { 
      clientId: string; 
      deleteAuthUser: boolean;
      deletedBy?: string;
    }) => {
      // 0. Get client user_id first (needed for auth deletion)
      const { data: clientData } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', clientId)
        .single();
      
      const authUserId = clientData?.user_id;

      // 1. Get conversation IDs first (for cascading delete)
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('client_id', clientId);
      
      const conversationIds = conversations?.map(c => c.id) || [];

      // 2. Delete chat messages (requires conversation_id)
      if (conversationIds.length > 0) {
        await supabase
          .from('chat_messages')
          .delete()
          .in('conversation_id', conversationIds);
      }

      // 3. Delete all related records in parallel batches
      const batch1 = await Promise.allSettled([
        supabase.from('chat_conversations').delete().eq('client_id', clientId),
        supabase.from('wallet_transactions').delete().eq('client_id', clientId),
        supabase.from('ad_spend_daily').delete().eq('client_id', clientId),
        supabase.from('agreements').delete().eq('client_id', clientId),
        supabase.from('billing_records').delete().eq('client_id', clientId),
      ]);

      const batch2 = await Promise.allSettled([
        supabase.from('campaigns').delete().eq('client_id', clientId),
        supabase.from('campaign_audit_log').delete().eq('client_id', clientId),
        supabase.from('client_credits').delete().eq('client_id', clientId),
        supabase.from('client_kpi_daily').delete().eq('client_id', clientId),
        supabase.from('client_kpi_rolling').delete().eq('client_id', clientId),
      ]);

      const batch3 = await Promise.allSettled([
        supabase.from('client_payment_methods').delete().eq('client_id', clientId),
        supabase.from('client_self_onboarding').delete().eq('client_id', clientId),
        supabase.from('client_stripe_customers').delete().eq('client_id', clientId),
        supabase.from('client_wallets').delete().eq('client_id', clientId),
        supabase.from('decision_events').delete().eq('client_id', clientId),
      ]);

      const batch4 = await Promise.allSettled([
        supabase.from('disputes').delete().eq('client_id', clientId),
        supabase.from('email_tracking_links').delete().eq('client_id', clientId),
        supabase.from('ghl_custom_field_mappings').delete().eq('client_id', clientId),
        supabase.from('nps_responses').delete().eq('client_id', clientId),
        supabase.from('onboarding_automation_runs').delete().eq('client_id', clientId),
      ]);

      const batch5 = await Promise.allSettled([
        supabase.from('onboarding_checklist').delete().eq('client_id', clientId),
        supabase.from('onboarding_tasks').delete().eq('client_id', clientId),
        supabase.from('performance_snapshots').delete().eq('client_id', clientId),
        supabase.from('proposals').delete().eq('client_id', clientId),
        supabase.from('referral_codes').delete().eq('client_id', clientId),
      ]);

      const batch6 = await Promise.allSettled([
        supabase.from('support_tickets').delete().eq('client_id', clientId),
        // Nullify foreign key references (keep historical data)
        supabase.from('prospects').update({ client_id: null }).eq('client_id', clientId),
        supabase.from('referrals').update({ referred_client_id: null }).eq('referred_client_id', clientId),
      ]);

      // Log any errors but don't fail the whole operation
      const allBatches = [...batch1, ...batch2, ...batch3, ...batch4, ...batch5, ...batch6];
      const errors = allBatches.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        console.warn('Some cleanup operations failed:', errors);
      }

      // 4. Finally, hard delete the client record
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (deleteError) throw deleteError;

      // 5. Optionally delete auth user
      if (deleteAuthUser && authUserId) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ userId: authUserId }),
            }
          );
          
          if (!response.ok) {
            const result = await response.json();
            console.warn('Failed to delete auth user:', result.error);
          }
        } catch (e) {
          console.warn('Auth user deletion failed:', e);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client and all associated data permanently deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete client');
    },
  });
}
