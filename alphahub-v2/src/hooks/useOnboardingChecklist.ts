import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OnboardingCheckStatus = 'pending' | 'yes' | 'no';

export interface OnboardingChecklistItem {
  id: string;
  client_id: string;
  category: string;
  item_key: string;
  item_label: string;
  status: OnboardingCheckStatus;
  notes: string | null;
  checked_by: string | null;
  checked_at: string | null;
  ticket_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryProgress {
  category: string;
  label: string;
  total: number;
  completed: number;
  issues: number;
  pending: number;
  status: 'pending' | 'in_progress' | 'complete' | 'issue';
}

const CATEGORY_LABELS: Record<string, string> = {
  hub_setup: 'Hub Account Setup',
  google_ads: 'Google Ads Campaign',
  crm_account: 'CRM Account Setup',
  funnel_testing: 'Funnel Testing',
  compliance: 'Compliance',
  billing_docs: 'Billing & Documents',
  final_onboarding: 'Final Onboarding',
};

const CATEGORY_ORDER = [
  'hub_setup',
  'google_ads', 
  'crm_account',
  'funnel_testing',
  'compliance',
  'billing_docs',
  'final_onboarding',
];

export function useOnboardingChecklist(clientId?: string) {
  return useQuery({
    queryKey: ['onboarding-checklist', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('onboarding_checklist')
        .select('*')
        .eq('client_id', clientId)
        .order('category')
        .order('display_order');
      
      if (error) throw error;
      return data as OnboardingChecklistItem[];
    },
    enabled: !!clientId,
  });
}

export function useInitializeChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.rpc('initialize_onboarding_checklist', {
        p_client_id: clientId
      });
      if (error) throw error;
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist', clientId] });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      itemId, 
      status, 
      notes,
      checkedBy 
    }: { 
      itemId: string; 
      status: OnboardingCheckStatus;
      notes?: string;
      checkedBy?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status,
        checked_at: status !== 'pending' ? new Date().toISOString() : null,
        checked_by: status !== 'pending' ? checkedBy : null,
      };
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      const { data, error } = await supabase
        .from('onboarding_checklist')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist', data.client_id] });
    },
  });
}

export function useLinkTicketToChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      itemId, 
      ticketId,
      clientId 
    }: { 
      itemId: string; 
      ticketId: string;
      clientId: string;
    }) => {
      const { error } = await supabase
        .from('onboarding_checklist')
        .update({ ticket_id: ticketId })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Also update the ticket to link back
      await supabase
        .from('support_tickets')
        .update({ onboarding_checklist_id: itemId })
        .eq('id', ticketId);
      
      return { itemId, ticketId, clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

export function useChecklistProgress(clientId?: string) {
  const { data: items = [] } = useOnboardingChecklist(clientId);
  
  const categoryProgress: CategoryProgress[] = CATEGORY_ORDER.map(category => {
    const categoryItems = items.filter(item => item.category === category);
    const completed = categoryItems.filter(item => item.status === 'yes').length;
    const issues = categoryItems.filter(item => item.status === 'no').length;
    const pending = categoryItems.filter(item => item.status === 'pending').length;
    const total = categoryItems.length;
    
    let status: CategoryProgress['status'] = 'pending';
    if (issues > 0) {
      status = 'issue';
    } else if (completed === total && total > 0) {
      status = 'complete';
    } else if (completed > 0) {
      status = 'in_progress';
    }
    
    return {
      category,
      label: CATEGORY_LABELS[category] || category,
      total,
      completed,
      issues,
      pending,
      status,
    };
  });
  
  const overallProgress = {
    total: items.length,
    completed: items.filter(item => item.status === 'yes').length,
    issues: items.filter(item => item.status === 'no').length,
    pending: items.filter(item => item.status === 'pending').length,
  };
  
  return {
    categoryProgress,
    overallProgress,
    isComplete: overallProgress.completed === overallProgress.total && overallProgress.total > 0,
    hasIssues: overallProgress.issues > 0,
  };
}
