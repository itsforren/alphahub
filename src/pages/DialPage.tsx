import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DiscoveryCallSheet } from '@/components/discovery/DiscoveryCallSheet';
import { useMyClient } from '@/hooks/useLeadDiscoveryQueue';
import type { DiscoveryLead } from '@/hooks/useLeadDiscoveryQueue';

const LEAD_SELECT = `
  id, agent_id, first_name, last_name, email, phone, state, age,
  lead_date, status, discovery_stage, discovery_temperature,
  last_call_attempt_at, call_attempt_count, last_attempted_by,
  last_attempted_by_id, currently_being_worked, work_started_at,
  lost_reason, delivery_status, delivered_at, ghl_contact_id,
  strategy_booked_at, intro_scheduled_at, booked_call_at,
  target_premium, submitted_premium, approved_premium, issued_premium,
  submitted_at, approved_at, issued_at,
  interest, savings, investments, employment
`;

export default function DialPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leadId = searchParams.get('lead_id');

  const { data: myClient, isLoading: clientLoading } = useMyClient();
  const agentId = myClient?.agent_id || null;

  // Fetch the specific lead by ID
  const { data: lead, isLoading: leadLoading, error: leadError } = useQuery({
    queryKey: ['dial-lead', leadId],
    queryFn: async (): Promise<DiscoveryLead | null> => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('leads')
        .select(LEAD_SELECT)
        .eq('id', leadId)
        .single();
      if (error) throw error;
      return data as DiscoveryLead;
    },
    enabled: !!leadId,
  });

  const isLoading = clientLoading || leadLoading;

  // No lead_id in URL
  if (!leadId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <PhoneCall className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <h2 className="text-lg font-bold text-foreground">No Lead Selected</h2>
          <p className="text-sm text-muted-foreground">
            This page requires a <code className="bg-muted px-1 rounded">lead_id</code> parameter.
          </p>
          <button
            onClick={() => navigate('/hub/leads')}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Dial Tracker
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading lead...</span>
        </div>
      </div>
    );
  }

  if (leadError || !lead) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <PhoneCall className="h-12 w-12 mx-auto text-red-400/50" />
          <h2 className="text-lg font-bold text-foreground">Lead Not Found</h2>
          <p className="text-sm text-muted-foreground">
            {leadError ? (leadError as Error).message : 'This lead does not exist or you don\'t have access.'}
          </p>
          <button
            onClick={() => navigate('/hub/leads')}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Dial Tracker
          </button>
        </div>
      </div>
    );
  }

  if (!agentId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <PhoneCall className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            Your account isn't linked to an agent profile.
          </p>
        </div>
      </div>
    );
  }

  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown';

  return (
    <div className="min-h-screen bg-background">
      {/* The call sheet opens immediately as a full-screen overlay */}
      <DiscoveryCallSheet
        open={true}
        onClose={() => navigate('/hub/leads')}
        lead={lead}
        agentId={agentId}
        callbackCalendarId={(myClient as any)?.callback_calendar_id || null}
        subaccountId={myClient?.subaccount_id || null}
      />

      {/* Background content (visible briefly before sheet opens) */}
      <div className="p-6 max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hub/leads')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{name}</h1>
            <p className="text-sm text-muted-foreground">{lead.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
