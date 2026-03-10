import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';

type TicketPriority = Database['public']['Enums']['ticket_priority'];

export interface TicketWithDetails {
  id: string;
  client_id: string;
  ticket_number: number | null;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  ticket_type: string;
  labels: string[];
  assigned_to: string | null;
  assigned_at: string | null;
  sla_deadline: string | null;
  due_date: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  created_at: string;
  last_reply_at: string | null;
  onboarding_checklist_id: string | null;
  // Joined data
  client?: {
    id: string;
    name: string;
    email: string;
    profile_image_url: string | null;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface TicketMetrics {
  total: number;
  open: number;
  in_progress: number;
  waiting: number;
  resolved: number;
  overdue: number;
  approaching_sla: number;
}

export interface TicketFilters {
  status?: string;
  category?: string;
  assigned_to?: string;
  sla_status?: 'all' | 'approaching' | 'overdue';
  priority?: string;
  ticket_type?: string;
}

export function useAllTickets(filters?: TicketFilters) {
  return useQuery({
    queryKey: ['all-tickets', filters],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          client:clients!support_tickets_client_id_fkey(id, name, email, profile_image_url),
          assignee:profiles!support_tickets_assigned_to_fkey(id, name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Handle 'active' filter (exclude resolved)
      if (filters?.status === 'active') {
        query = query.neq('status', 'resolved');
      } else if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.assigned_to && filters.assigned_to !== 'all') {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority as TicketPriority);
      }
      if (filters?.ticket_type && filters.ticket_type !== 'all') {
        query = query.eq('ticket_type', filters.ticket_type);
      }

      const { data, error } = await query;
      if (error) throw error;

      let tickets = (data || []) as TicketWithDetails[];

      // Filter by SLA status client-side
      if (filters?.sla_status === 'overdue') {
        tickets = tickets.filter(t => t.sla_deadline && new Date(t.sla_deadline) < new Date() && t.status !== 'resolved');
      } else if (filters?.sla_status === 'approaching') {
        const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000);
        tickets = tickets.filter(t => 
          t.sla_deadline && 
          new Date(t.sla_deadline) <= fourHoursFromNow && 
          new Date(t.sla_deadline) > new Date() &&
          t.status !== 'resolved'
        );
      }

      return tickets;
    },
  });
}

export function useTicketMetrics() {
  return useQuery({
    queryKey: ['ticket-metrics'],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('status, sla_deadline');

      if (error) throw error;

      const now = new Date();
      const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000);

      const metrics: TicketMetrics = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        waiting: tickets.filter(t => t.status === 'waiting').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        overdue: tickets.filter(t => 
          t.sla_deadline && 
          new Date(t.sla_deadline) < now && 
          t.status !== 'resolved'
        ).length,
        approaching_sla: tickets.filter(t => 
          t.sla_deadline && 
          new Date(t.sla_deadline) <= fourHoursFromNow && 
          new Date(t.sla_deadline) > now &&
          t.status !== 'resolved'
        ).length,
      };

      return metrics;
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, assigneeId }: { ticketId: string; assigneeId: string | null }) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: assigneeId,
          assigned_at: assigneeId ? new Date().toISOString() : null,
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, priority, resolved_at, due_date, labels, ticket_type, assigned_to }: {
      id: string;
      status?: string;
      priority?: TicketPriority;
      resolved_at?: string | null;
      due_date?: string | null;
      labels?: string[];
      ticket_type?: string;
      assigned_to?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (priority) updates.priority = priority;
      if (due_date !== undefined) updates.due_date = due_date;
      if (labels !== undefined) updates.labels = labels;
      if (ticket_type) updates.ticket_type = ticket_type;
      if (assigned_to !== undefined) {
        updates.assigned_to = assigned_to;
        updates.assigned_at = assigned_to ? new Date().toISOString() : null;
      }

      // If resolving, set resolved_at
      if (status === 'resolved') {
        updates.resolved_at = resolved_at || new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] });
    },
  });
}

export function useTicketRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('ticket-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function getSLAStatus(slaDeadline: string | null, status: string): 'ok' | 'approaching' | 'overdue' | null {
  if (!slaDeadline || status === 'resolved') return null;

  const deadline = new Date(slaDeadline);
  const now = new Date();
  const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000);

  if (deadline < now) return 'overdue';
  if (deadline <= fourHoursFromNow) return 'approaching';
  return 'ok';
}

export function formatSLACountdown(slaDeadline: string | null): string {
  if (!slaDeadline) return '--';

  const deadline = new Date(slaDeadline);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    const overdueDiff = Math.abs(diff);
    const hours = Math.floor(overdueDiff / (1000 * 60 * 60));
    const minutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
    return `-${hours}h ${minutes}m`;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  return `${hours}h ${minutes}m`;
}
