import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  reply_id: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TicketTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  ticket_type: string;
  labels: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketActivityEntry {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

// Fetch attachments for a ticket
export function useTicketAttachments(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-attachments', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TicketAttachment[];
    },
    enabled: !!ticketId,
  });
}

// Upload a file attachment to a ticket
export function useUploadTicketAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      replyId,
      file,
    }: {
      ticketId: string;
      replyId?: string;
      file: File;
    }) => {
      // Generate unique path
      const uuid = crypto.randomUUID();
      const path = `${ticketId}/${uuid}-${file.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(path);

      const fileUrl = urlData.publicUrl;

      // Get current user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      // Insert attachment record
      const { data, error } = await supabase
        .from('ticket_attachments')
        .insert({
          ticket_id: ticketId,
          reply_id: replyId || null,
          file_url: fileUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: authData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TicketAttachment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-attachments', data.ticket_id] });
    },
  });
}

// Fetch activity log for a ticket
export function useTicketActivity(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-activity', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_activity_log')
        .select(`
          id,
          action,
          old_value,
          new_value,
          metadata,
          created_at,
          user:profiles!ticket_activity_log_user_id_fkey(name, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TicketActivityEntry[];
    },
    enabled: !!ticketId,
  });
}

// Fetch active ticket templates
export function useTicketTemplates() {
  return useQuery({
    queryKey: ['ticket-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as TicketTemplate[];
    },
  });
}

// Create a new ticket template
export function useCreateTicketTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<TicketTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('ticket_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data as TicketTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
    },
  });
}

// Update an existing ticket template
export function useUpdateTicketTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<TicketTemplate, 'id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('ticket_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TicketTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
    },
  });
}
