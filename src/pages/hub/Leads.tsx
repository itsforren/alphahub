import { useEffect, useState, useCallback } from 'react';
import { PhoneCall } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LeadDiscoveryDashboard } from '@/components/discovery/LeadDiscoveryDashboard';
import { NewLeadPopup } from '@/components/discovery/NewLeadPopup';
import { DialerLaunchModal } from '@/components/discovery/DialerLaunchModal';
import { useLeadDiscoveryQueue, useMyClient } from '@/hooks/useLeadDiscoveryQueue';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Leads() {
  const { data: myClient, isLoading: clientLoading } = useMyClient();
  const queryClient = useQueryClient();
  const [newLeadPopup, setNewLeadPopup] = useState<any>(null);

  // Enable for all agents that don't use their own CRM
  const agentId = myClient?.agent_id || null;
  const isEnabled = agentId && !(myClient as any)?.use_own_crm;
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

          // Show the popup
          setNewLeadPopup(lead);

          // Also show a toast as backup
          const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'New Lead';
          toast.success(`NEW LEAD: ${name}`, {
            description: [lead.state, lead.email, lead.phone].filter(Boolean).join(' · '),
            duration: 15000,
            important: true,
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

  const handleViewNewLead = useCallback(() => {
    setNewLeadPopup(null);
    // The queue will have refreshed by now — the lead is in the Dial tab
  }, []);

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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 overflow-x-hidden w-full min-w-0">
      <DialerLaunchModal />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
          Dial Tracker
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

      {/* New Lead Popup */}
      <NewLeadPopup
        lead={newLeadPopup}
        onView={handleViewNewLead}
        onDismiss={() => setNewLeadPopup(null)}
      />
    </div>
  );
}
