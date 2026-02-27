import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BillingTrackerRecord {
  id: string;
  client_id: string;
  billing_type: 'ad_spend' | 'management';
  amount: number;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  notes: string | null;
  payment_link: string | null;
  credit_amount_used: number | null;
  client?: {
    id: string;
    name: string;
    email: string;
    agent_id?: string;
  };
  collection?: {
    id: string;
    status: string;
    email_stage: string;
    last_email_sent_at: string | null;
  };
}

export interface CollectionRecord {
  id: string;
  billing_record_id: string;
  client_id: string;
  status: string;
  email_stage: string;
  next_action_at: string | null;
  last_email_sent_at: string | null;
  escalated_at: string | null;
  notes: string | null;
  created_at: string;
  billing_record?: BillingTrackerRecord;
  client?: {
    id: string;
    name: string;
    email: string;
    agent_id?: string;
  };
}

// Helper to match client by id or agent_id
function matchClient(clientId: string, clients: any[]): any | null {
  return clients.find(c => c.id === clientId || c.agent_id === clientId) || null;
}

export function useAllBillingRecords(filter?: 'upcoming' | 'overdue' | 'paid' | 'all') {
  return useQuery({
    queryKey: ['billing-tracker', filter],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // First get billing records without join
      let query = supabase
        .from('billing_records')
        .select('*')
        .order('due_date', { ascending: true });

      if (filter === 'upcoming') {
        query = query
          .eq('status', 'pending')
          .gte('due_date', today);
      } else if (filter === 'overdue') {
        query = query
          .eq('status', 'pending')
          .lt('due_date', today);
      } else if (filter === 'paid') {
        query = query.eq('status', 'paid');
      }

      const { data: billingRecords, error: billingError } = await query;
      if (billingError) throw billingError;

      if (!billingRecords || billingRecords.length === 0) {
        return [] as BillingTrackerRecord[];
      }

      // Get unique client IDs
      const clientIds = [...new Set(billingRecords.map(r => r.client_id))];
      
      // Fetch all clients that might match (by id or agent_id)
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, agent_id');
      
      if (clientsError) throw clientsError;

      // Map billing records with matched clients
      return billingRecords.map((record: any) => ({
        ...record,
        client: matchClient(record.client_id, clients || []),
      })) as BillingTrackerRecord[];
    },
  });
}

export function useCollectionsRecords() {
  return useQuery({
    queryKey: ['collections-records'],
    queryFn: async () => {
      // Fetch collections with billing records only (no client join)
      const { data: collections, error: collectionsError } = await supabase
        .from('billing_collections')
        .select(`
          *,
          billing_records:billing_record_id (
            id,
            billing_type,
            amount,
            due_date,
            status
          )
        `)
        .neq('status', 'resolved')
        .order('created_at', { ascending: false });

      if (collectionsError) throw collectionsError;

      if (!collections || collections.length === 0) {
        return [] as CollectionRecord[];
      }

      // Fetch all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, agent_id');
      
      if (clientsError) throw clientsError;

      return collections.map((record: any) => ({
        ...record,
        billing_record: record.billing_records,
        client: matchClient(record.client_id, clients || []),
      })) as CollectionRecord[];
    },
  });
}

export function useCreateCollectionRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      billing_record_id, 
      client_id 
    }: { 
      billing_record_id: string; 
      client_id: string;
    }) => {
      const { data, error } = await supabase
        .from('billing_collections')
        .insert({
          billing_record_id,
          client_id,
          status: 'none',
          email_stage: 'none',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections-records'] });
      queryClient.invalidateQueries({ queryKey: ['billing-tracker'] });
    },
  });
}

export function useUpdateCollectionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      notes 
    }: { 
      id: string; 
      status: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('billing_collections')
        .update({ status, notes })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections-records'] });
    },
  });
}

export function useBillingStats() {
  return useQuery({
    queryKey: ['billing-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all pending records
      const { data: pending } = await supabase
        .from('billing_records')
        .select('amount, due_date, billing_type')
        .eq('status', 'pending');

      const records = pending || [];
      
      const upcomingAdSpend = records
        .filter(r => r.billing_type === 'ad_spend' && r.due_date && r.due_date >= today)
        .reduce((sum, r) => sum + (r.amount || 0), 0);
        
      const upcomingManagement = records
        .filter(r => r.billing_type === 'management' && r.due_date && r.due_date >= today)
        .reduce((sum, r) => sum + (r.amount || 0), 0);
        
      const overdueTotal = records
        .filter(r => r.due_date && r.due_date < today)
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      const overdueCount = records.filter(r => r.due_date && r.due_date < today).length;

      // Get collections in progress
      const { count: collectionsCount } = await supabase
        .from('billing_collections')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'resolved');

      return {
        upcomingAdSpend,
        upcomingManagement,
        overdueTotal,
        overdueCount,
        collectionsInProgress: collectionsCount || 0,
      };
    },
  });
}
