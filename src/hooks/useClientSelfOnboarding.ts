import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientSelfOnboardingTask {
  id: string;
  client_id: string;
  task_key: string;
  task_label: string;
  help_url: string | null;
  display_order: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SELF_ONBOARDING_TASKS = [
  { task_key: 'sign_agreement', task_label: 'Sign Service Agreement', help_url: null, display_order: 1 },
  { task_key: 'login_crm', task_label: 'Login to Alpha Agent CRM', help_url: 'https://app.alphaagentcrm.com', display_order: 2 },
  { task_key: 'activate_subscription', task_label: 'Activate Subscription (Add Card)', help_url: null, display_order: 3 },
  { task_key: 'connect_calendars', task_label: 'Connect Zoom & Google Calendar', help_url: null, display_order: 4 },
  
];

export function useClientSelfOnboarding(clientId?: string) {
  return useQuery({
    queryKey: ['client-self-onboarding', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_self_onboarding')
        .select('*')
        .eq('client_id', clientId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ClientSelfOnboardingTask[];
    },
    enabled: !!clientId,
  });
}

export function useInitializeSelfOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      // Check if tasks already exist
      const { data: existing } = await supabase
        .from('client_self_onboarding')
        .select('id')
        .eq('client_id', clientId)
        .limit(1);

      if (existing && existing.length > 0) {
        return { initialized: false, message: 'Tasks already exist' };
      }

      // Insert default tasks
      const tasksToInsert = DEFAULT_SELF_ONBOARDING_TASKS.map(task => ({
        client_id: clientId,
        ...task,
      }));

      const { error } = await supabase
        .from('client_self_onboarding')
        .insert(tasksToInsert);

      if (error) throw error;

      return { initialized: true, message: 'Tasks initialized' };
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client-self-onboarding', clientId] });
    },
  });
}

// Helper function to send chat message from Alpha AI
async function sendAlphaAIChatMessage(clientId: string, clientName: string, message: string) {
  try {
    // Get or create conversation for this client
    let { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (convError) {
      console.error('Error fetching conversation:', convError);
      return;
    }

    // Create conversation if it doesn't exist
    if (!conversation) {
      const { data: newConvo, error: createError } = await supabase
        .from('chat_conversations')
        .insert({ client_id: clientId })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return;
      }
      conversation = newConvo;
    }

    // Send message from Alpha AI
    const { error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: 'system-alpha-ai',
        sender_name: 'Alpha AI',
        sender_role: 'admin',
        sender_avatar_url: null,
        message,
      });

    if (msgError) {
      console.error('Error sending Alpha AI message:', msgError);
    }
  } catch (error) {
    console.error('Error in sendAlphaAIChatMessage:', error);
  }
}

export function useUpdateSelfOnboardingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      completed, 
      clientId, 
      clientName, 
      taskLabel 
    }: { 
      taskId: string; 
      completed: boolean; 
      clientId?: string; 
      clientName?: string;
      taskLabel?: string;
    }) => {
      const { data, error } = await supabase
        .from('client_self_onboarding')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      
      // Return task data along with metadata for chat message
      return { task: data, clientId, clientName, taskLabel, completed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['client-self-onboarding', result.task.client_id] });
      toast.success(result.completed ? 'Task completed!' : 'Task updated!');
      
      // Send chat message when task is completed
      if (result.completed && result.clientId && result.taskLabel) {
        const displayName = result.clientName || 'Client';
        const message = `✅ ${displayName} completed: ${result.taskLabel}`;
        sendAlphaAIChatMessage(result.clientId, displayName, message);
      }
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });
}

export function useSelfOnboardingProgress(clientId?: string) {
  const { data: tasks = [] } = useClientSelfOnboarding(clientId);
  
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    tasks,
    completedCount,
    totalCount,
    percentage,
  };
}
