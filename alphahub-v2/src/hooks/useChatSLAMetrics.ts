import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupportAgents } from './useSupportAgents';

interface ChatSLAMetrics {
  averageResponseMinutes: number;
  totalClientMessages: number;
  respondedMessages: number;
  withinSLACount: number;
  slaCompliancePercent: number;
  agentMetrics: AgentChatMetric[];
}

interface AgentChatMetric {
  agentId: string;
  agentName: string;
  team: string;
  totalResponses: number;
  averageResponseMinutes: number;
  withinSLACount: number;
  slaCompliancePercent: number;
}

// SLA target: 30 minutes response time during business hours
const SLA_TARGET_MINUTES = 30;

// Check if a time is within business hours (9 AM - 5 PM EST, Mon-Fri)
function isBusinessHour(date: Date): boolean {
  // Convert to EST
  const estOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  };
  const dayOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    weekday: 'short',
  };
  
  const hour = parseInt(new Intl.DateTimeFormat('en-US', estOptions).format(date));
  const day = new Intl.DateTimeFormat('en-US', dayOptions).format(date);
  
  const isWeekend = day === 'Sat' || day === 'Sun';
  const isBusinessHour = hour >= 9 && hour < 17;
  
  return !isWeekend && isBusinessHour;
}

// Calculate business hours between two dates
function calculateBusinessMinutes(start: Date, end: Date): number {
  let minutes = 0;
  const current = new Date(start);
  
  // Iterate minute by minute (simplified approach)
  // For performance, we could optimize this for longer durations
  while (current < end && minutes < 60 * 24 * 7) { // Cap at 1 week
    if (isBusinessHour(current)) {
      minutes++;
    }
    current.setMinutes(current.getMinutes() + 1);
  }
  
  return minutes;
}

export function useChatSLAMetrics() {
  const { data: agents } = useSupportAgents();
  
  return useQuery({
    queryKey: ['chat-sla-metrics'],
    queryFn: async () => {
      // Get all chat messages from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, sender_id, sender_role, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Group messages by conversation
      const conversationMessages: Record<string, typeof messages> = {};
      messages?.forEach(msg => {
        if (!conversationMessages[msg.conversation_id]) {
          conversationMessages[msg.conversation_id] = [];
        }
        conversationMessages[msg.conversation_id].push(msg);
      });
      
      // Calculate response times
      const responseTimes: { agentId: string; responseMinutes: number }[] = [];
      
      Object.values(conversationMessages).forEach(convoMessages => {
        for (let i = 0; i < convoMessages.length; i++) {
          const msg = convoMessages[i];
          
          // If this is a client message, find the next admin response
          if (msg.sender_role === 'client') {
            const nextAdminResponse = convoMessages.slice(i + 1).find(m => m.sender_role === 'admin');
            
            if (nextAdminResponse) {
              const clientMsgTime = new Date(msg.created_at);
              const adminResponseTime = new Date(nextAdminResponse.created_at);
              
              // Only count if client message was sent during business hours
              if (isBusinessHour(clientMsgTime)) {
                const businessMinutes = calculateBusinessMinutes(clientMsgTime, adminResponseTime);
                responseTimes.push({
                  agentId: nextAdminResponse.sender_id,
                  responseMinutes: businessMinutes,
                });
              }
            }
          }
        }
      });
      
      // Aggregate metrics
      const totalResponses = responseTimes.length;
      const totalMinutes = responseTimes.reduce((sum, r) => sum + r.responseMinutes, 0);
      const withinSLA = responseTimes.filter(r => r.responseMinutes <= SLA_TARGET_MINUTES).length;
      
      // Calculate per-agent metrics
      const agentResponseTimes: Record<string, number[]> = {};
      responseTimes.forEach(r => {
        if (!agentResponseTimes[r.agentId]) {
          agentResponseTimes[r.agentId] = [];
        }
        agentResponseTimes[r.agentId].push(r.responseMinutes);
      });
      
      // Map agent IDs to names and calculate metrics
      const csAgents = agents?.filter(a => a.team === 'customer_service' || !a.team) || [];
      
      const agentMetrics: AgentChatMetric[] = csAgents.map(agent => {
        const times = agentResponseTimes[agent.user_id || ''] || [];
        const avgMinutes = times.length > 0 
          ? times.reduce((a, b) => a + b, 0) / times.length 
          : 0;
        const withinSLACount = times.filter(t => t <= SLA_TARGET_MINUTES).length;
        
        return {
          agentId: agent.user_id || agent.id,
          agentName: agent.name,
          team: agent.team || 'customer_service',
          totalResponses: times.length,
          averageResponseMinutes: Math.round(avgMinutes),
          withinSLACount,
          slaCompliancePercent: times.length > 0 
            ? Math.round((withinSLACount / times.length) * 100) 
            : 100,
        };
      }).filter(m => m.totalResponses > 0);
      
      // Count client messages during business hours
      const clientMessagesDuringBizHours = messages?.filter(m => 
        m.sender_role === 'client' && isBusinessHour(new Date(m.created_at))
      ).length || 0;
      
      const metrics: ChatSLAMetrics = {
        averageResponseMinutes: totalResponses > 0 ? Math.round(totalMinutes / totalResponses) : 0,
        totalClientMessages: clientMessagesDuringBizHours,
        respondedMessages: totalResponses,
        withinSLACount: withinSLA,
        slaCompliancePercent: totalResponses > 0 ? Math.round((withinSLA / totalResponses) * 100) : 100,
        agentMetrics,
      };
      
      return metrics;
    },
    enabled: !!agents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
