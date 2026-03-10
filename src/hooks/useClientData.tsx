import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Client {
  id: string;
  user_id: string | null;
  agent_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  profile_image_url: string | null;
  headshot_updated_at?: string | null;
  status: string;
  package_type: string | null;
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
}

export interface PerformanceSnapshot {
  id: string;
  client_id: string;
  leads_delivered_this_month: number;
  booked_calls_this_month: number;
  cost_per_lead: number;
  fulfillment_status: 'green' | 'yellow' | 'red';
  last_updated_at: string;
}

export interface SupportTicket {
  id: string;
  client_id: string;
  subject: string;
  message: string;
  category: 'billing' | 'leads' | 'tech' | 'other';
  status: 'open' | 'waiting' | 'resolved';
  created_at: string;
  last_reply_at: string | null;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

export interface ClientWithPerformance extends Client {
  performance: PerformanceSnapshot | null;
}

// Fetch all clients (admin only)
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch performance snapshots for all clients
      const { data: snapshots } = await supabase
        .from('performance_snapshots')
        .select('*');

      const clientsWithPerformance: ClientWithPerformance[] = (clients || []).map((client) => ({
        ...client,
        performance: snapshots?.find((s) => s.client_id === client.id) as PerformanceSnapshot | null || null,
      }));

      return clientsWithPerformance;
    },
  });
}

// Fetch single client by ID (admin) or own client data (client role)
export function useClient(clientId?: string) {
  const { user, isAdmin, role } = useAuth();

  return useQuery({
    queryKey: ['client', clientId || user?.id, role],
    queryFn: async () => {
      let query = supabase.from('clients').select('*');

      if (clientId) {
        // Admin viewing specific client by ID
        query = query.eq('id', clientId);
      } else if (user && !isAdmin) {
        // Non-admin users (clients) fetch their own data by user_id
        query = query.eq('user_id', user.id);
      }

      const { data: client, error } = await query.maybeSingle();
      if (error) throw error;
      if (!client) return null;

      const { data: performance } = await supabase
        .from('performance_snapshots')
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle();

      return {
        ...client,
        performance: performance as PerformanceSnapshot | null,
      } as ClientWithPerformance;
    },
    // Wait for role to load before running query for non-admin users
    enabled: !!clientId || (!!user && role !== null),
  });
}

// Fetch support tickets
export function useSupportTickets(clientId?: string) {
  const { user, isClient } = useAuth();

  return useQuery({
    queryKey: ['support-tickets', clientId || user?.id],
    queryFn: async () => {
      let query = supabase.from('support_tickets').select('*');

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!clientId || !!user,
  });
}

// Fetch ticket replies
export function useTicketReplies(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TicketReply[];
    },
    enabled: !!ticketId,
  });
}

// Create support ticket
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: {
      client_id?: string | null;
      subject: string;
      message: string;
      category: string;
      ticket_type?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      labels?: string[];
      due_date?: string | null;
      assigned_to?: string | null;
    }) => {
      console.log('Creating ticket with payload:', ticket);

      const insert: Record<string, unknown> = {
        client_id: ticket.client_id || null,
        subject: ticket.subject,
        message: ticket.message,
        category: ticket.category,
        ticket_type: ticket.ticket_type || 'client_support',
        priority: ticket.priority || 'normal',
      };
      if (ticket.labels && ticket.labels.length > 0) insert.labels = ticket.labels;
      if (ticket.due_date) insert.due_date = ticket.due_date;
      if (ticket.assigned_to) {
        insert.assigned_to = ticket.assigned_to;
        insert.assigned_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert(insert)
        .select()
        .single();

      if (error) {
        console.error('Ticket creation error:', error);
        throw error;
      }
      
      console.log('Ticket created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['all-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] });
    },
  });
}

// Create ticket reply
export function useCreateReply() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (reply: { ticket_id: string; message: string }) => {
      const { data, error } = await supabase
        .from('ticket_replies')
        .insert({
          ...reply,
          user_id: user?.id,
          is_admin_reply: isAdmin,
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket last_reply_at
      await supabase
        .from('support_tickets')
        .update({ last_reply_at: new Date().toISOString() })
        .eq('id', reply.ticket_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-replies', variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

// Update client (admin only)
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.id] });
    },
  });
}

// Update ticket status (admin only)
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

// Update performance snapshot (admin only)
export function useUpdatePerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ client_id, ...updates }: Partial<PerformanceSnapshot> & { client_id: string }) => {
      const { data, error } = await supabase
        .from('performance_snapshots')
        .update({ ...updates, last_updated_at: new Date().toISOString() })
        .eq('client_id', client_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
    },
  });
}
