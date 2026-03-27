import { useEffect } from 'react';
import { PhoneCall } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LeadDiscoveryDashboard } from '@/components/discovery/LeadDiscoveryDashboard';
import { useLeadDiscoveryQueue, useMyClient } from '@/hooks/useLeadDiscoveryQueue';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Feature flag: only these agent_ids can access My Leads (remove to enable for all)
const DISCOVERY_ENABLED_AGENTS = ['EIx4YsVXAfD6hoIX2ixz']; // James Warren (+ Sierra via team members)

export default function Leads() {
  const { isAdmin } = useAuth();
  const { data: myClient, isLoading: clientLoading } = useMyClient();
  const queryClient = useQueryClient();

  const agentId = myClient?.agent_id || null;
  const isEnabled = agentId && (isAdmin || DISCOVERY_ENABLED_AGENTS.includes(agentId));
  const { data: queueData, isLoading: queueLoading } = useLeadDiscoveryQueue(isEnabled ? agentId : null);

  const isLoading = clientLoading || queueLoading;

  // Real-time: listen for new leads arriving for this agent
  useEffect(() => {
    if (!agentId || !isEnabled) return;

    const channel = supabase
      .channel('new-leads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          const lead = payload.new as any;
          const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'New Lead';
          toast(`New lead: ${name}`, {
            description: [lead.state, lead.email].filter(Boolean).join(' · '),
            duration: 8000,
          });
          // Refresh the queue
          queryClient.invalidateQueries({ queryKey: ['discovery-queue'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, isEnabled, queryClient]);

  if (clientLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!myClient || !agentId || !isEnabled) {
    return (
      <div className="p-6 text-center py-20">
        <PhoneCall className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <h2 className="text-lg font-bold text-foreground mb-2">No Leads Available</h2>
        <p className="text-sm text-muted-foreground">
          Your account isn't linked to an agent profile yet. Contact support for help.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-amber-500 bg-clip-text text-transparent">
          My Leads
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discovery calls & lead management
        </p>
      </div>

      {/* Dashboard */}
      {queueData ? (
        <LeadDiscoveryDashboard
          data={queueData}
          agentId={agentId}
          schedulerLink={myClient.scheduler_link}
          subaccountId={myClient.subaccount_id}
          callbackCalendarId={(myClient as any).callback_calendar_id || null}
          isLoading={isLoading}
        />
      ) : (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
