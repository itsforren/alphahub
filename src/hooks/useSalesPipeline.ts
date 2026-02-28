import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PipelineStage {
  id: string;
  stage_name: string;
  stage_key: string;
  color: string;
  order_index: number;
  is_closed: boolean;
}

export interface Partner {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface ProspectWithAttribution {
  id: string;
  visitor_id: string;
  email: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  company?: string | null;
  source_page?: string | null;
  application_submitted_at?: string | null;
  status: string;
  pipeline_stage_id: string | null;
  forecast_probability: number;
  deal_value: number;
  sales_notes: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  lost_reason: string | null;
  ghl_contact_id: string | null;
  ghl_appointment_id: string | null;
  appointment_status: string | null;
  calendar_booked_at: string | null;
  converted_at: string | null;
  partner_id: string | null;
  partner?: Partner | null;
  created_at: string;
  updated_at: string;
  headshot_url?: string | null;
  // Phase 1: Core Fields
  intent: string | null;
  qual_status: string | null;
  disqual_reason: string | null;
  next_action_type: string | null;
  next_action_due_at: string | null;
  next_action_owner_id: string | null;
  appt_start_at: string | null;
  appt_end_at: string | null;
  appt_calendar_id: string | null;
  appt_count_reschedules: number;
  appt_count_no_shows: number;
  call_type: string | null;
  last_contact_method: string | null;
  // Phase 2: Ownership & Disposition
  owner_role: string | null;
  owner_user_id: string | null;
  disposition: string | null;
  // Phase 3: Payment & Client Integration
  offer_selected: string | null;
  payment_status: string | null;
  payment_amount: number;
  payment_method: string | null;
  closed_at: string | null;
  client_id: string | null;
  // Closed Won data
  management_fee?: number | null;
  deposit_type?: string | null;
  deposit_amount?: number | null;
  ad_spend_budget?: number | null;
  billing_frequency?: string | null;
  // Call tracking
  call_count: number;
  lead_source: string | null;
  // Attribution data
  attribution?: {
    first_touch_source: string | null;
    first_touch_medium: string | null;
    first_touch_campaign: string | null;
    first_touch_content: string | null;
    first_touch_term: string | null;
    first_touch_gclid: string | null;
    first_touch_fbclid: string | null;
    first_touch_referrer: string | null;
    first_touch_landing_page: string | null;
    first_touch_at: string | null;
    last_touch_source: string | null;
    last_touch_medium: string | null;
    last_touch_campaign: string | null;
    last_touch_content: string | null;
    last_touch_term: string | null;
    last_touch_gclid: string | null;
    last_touch_fbclid: string | null;
    last_touch_referrer: string | null;
    last_touch_landing_page: string | null;
    last_touch_at: string | null;
    total_sessions: number | null;
    total_page_views: number | null;
    time_to_conversion_hours: number | null;
    referral_code: string | null;
  } | null;
}

export interface CallLog {
  id: string;
  prospect_id: string;
  call_date: string;
  duration_seconds: number | null;
  summary: string | null;
  action_items: string[] | null;
  key_topics: string[] | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  recording_url: string | null;
  fathom_call_id: string | null;
  created_at: string;
}

export interface ProspectActivity {
  id: string;
  prospect_id: string;
  activity_type: string;
  activity_data: Record<string, unknown>;
  created_at: string;
}

// Fetch all pipeline stages
export function usePipelineStages() {
  return useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_pipeline_stages')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as PipelineStage[];
    },
  });
}

// Fetch all prospects grouped by stage
export function useSalesPipeline() {
  return useQuery({
    queryKey: ['sales-pipeline'],
    queryFn: async () => {
      // Fetch stages
      const { data: stages, error: stagesError } = await supabase
        .from('sales_pipeline_stages')
        .select('*')
        .order('order_index', { ascending: true });

      if (stagesError) throw stagesError;

      // Fetch prospects with attribution, partner info, and referrer info
      const { data: prospects, error: prospectsError } = await supabase
        .from('prospects')
        .select(`
          *,
          prospect_attribution (
            first_touch_source,
            first_touch_medium,
            first_touch_campaign,
            first_touch_content,
            first_touch_term,
            first_touch_gclid,
            first_touch_fbclid,
            first_touch_referrer,
            first_touch_landing_page,
            first_touch_at,
            last_touch_source,
            last_touch_medium,
            last_touch_campaign,
            last_touch_content,
            last_touch_term,
            last_touch_gclid,
            last_touch_fbclid,
            last_touch_referrer,
            last_touch_landing_page,
            last_touch_at,
            total_sessions,
            total_page_views,
            time_to_conversion_hours,
            referral_code
          ),
          partners (
            id,
            name,
            slug,
            color
          ),
          referrer:referrer_client_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (prospectsError) throw prospectsError;

      // Fetch all partners for filter options
      const { data: allPartners } = await supabase
        .from('partners')
        .select('id, name, slug, color')
        .eq('is_active', true)
        .order('name');

      // Transform prospects to include attribution, partner, and referrer
      const prospectsWithAttribution: ProspectWithAttribution[] = prospects.map((p) => ({
        ...p,
        forecast_probability: p.forecast_probability ?? 0,
        deal_value: p.deal_value ?? 0,
        appt_count_reschedules: p.appt_count_reschedules ?? 0,
        appt_count_no_shows: p.appt_count_no_shows ?? 0,
        payment_amount: p.payment_amount ?? 0,
        call_count: p.call_count ?? 0,
        lead_source: p.lead_source ?? null,
        attribution: Array.isArray(p.prospect_attribution) ? p.prospect_attribution[0] : null,
        partner: p.partners || null,
        referrer: p.referrer || null,
      }));

      // Group by stage
      const pipeline: Record<string, ProspectWithAttribution[]> = {};
      
      for (const stage of (stages as PipelineStage[])) {
        pipeline[stage.id] = prospectsWithAttribution.filter(
          (p) => p.pipeline_stage_id === stage.id
        );
      }

      // Add prospects with no stage to first stage (new_lead)
      const firstStage = (stages as PipelineStage[]).find(s => s.stage_key === 'new_lead' || s.stage_key === 'applied');
      if (firstStage) {
        const noStageProspects = prospectsWithAttribution.filter(
          (p) => !p.pipeline_stage_id
        );
        pipeline[firstStage.id] = [...pipeline[firstStage.id], ...noStageProspects];
      }

      return {
        stages: stages as PipelineStage[],
        pipeline,
        allProspects: prospectsWithAttribution,
        partners: (allPartners || []) as Partner[],
      };
    },
  });
}

// Stage-to-next-action mapping
const STAGE_NEXT_ACTIONS: Record<string, { action: string; hoursUntilDue: number }> = {
  'new_lead': { action: 'call_to_qualify', hoursUntilDue: 0.083 }, // ~5 minutes
  'contacted': { action: 'follow_up_call', hoursUntilDue: 48 },
  // All leads still require the qualification call even after booking.
  // The due time is still relative-to-now here (UI drag/drop), while webhook-created
  // bookings set the due time to the actual appointment start.
  'call_scheduled': { action: 'call_to_qualify', hoursUntilDue: 24 },
  'call_completed': { action: 'send_proposal', hoursUntilDue: 24 },
  'follow_up': { action: 'follow_up_call', hoursUntilDue: 48 },
  'closed_won': { action: 'schedule_onboarding', hoursUntilDue: 24 },
  'onboarding': { action: 'onboarding_call', hoursUntilDue: 48 },
  'live': { action: 'check_in_call', hoursUntilDue: 168 }, // 1 week
  'closed_lost': { action: 'nurture_sequence', hoursUntilDue: 720 }, // 30 days
};

// Update prospect stage
export function useUpdateProspectStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      prospectId, 
      newStageId, 
      oldStageId 
    }: { 
      prospectId: string; 
      newStageId: string; 
      oldStageId: string | null;
    }) => {
      // Fetch the stage to get the stage_key for next action
      const { data: stageData } = await supabase
        .from('sales_pipeline_stages')
        .select('stage_key')
        .eq('id', newStageId)
        .single();
      
      const stageKey = stageData?.stage_key || '';
      const nextActionConfig = STAGE_NEXT_ACTIONS[stageKey];
      
      const updatePayload: Record<string, unknown> = {
        pipeline_stage_id: newStageId,
        updated_at: new Date().toISOString(),
      };
      
      // Auto-set next action based on new stage
      if (nextActionConfig) {
        updatePayload.next_action_type = nextActionConfig.action;
        updatePayload.next_action_due_at = new Date(
          Date.now() + nextActionConfig.hoursUntilDue * 60 * 60 * 1000
        ).toISOString();
      }
      
      const { error } = await supabase
        .from('prospects')
        .update(updatePayload)
        .eq('id', prospectId);

      if (error) throw error;

      // Trigger GHL sync (fire and forget)
      supabase.functions.invoke('ghl-stage-sync', {
        body: { prospect_id: prospectId, new_stage_id: newStageId, old_stage_id: oldStageId }
      }).catch(console.error);

      return { prospectId, newStageId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
    },
    onError: (error) => {
      toast.error('Failed to update prospect stage');
      console.error(error);
    },
  });
}

// Update prospect details
export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      prospectId, 
      updates 
    }: { 
      prospectId: string; 
      updates: Partial<ProspectWithAttribution>;
    }) => {
      const { error } = await supabase
        .from('prospects')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', prospectId);

      if (error) throw error;
      return { prospectId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-detail'] });
      toast.success('Prospect updated');
    },
    onError: (error) => {
      toast.error('Failed to update prospect');
      console.error(error);
    },
  });
}

// Fetch prospect detail with call logs and activities
export function useProspectDetail(prospectId: string | null) {
  return useQuery({
    queryKey: ['prospect-detail', prospectId],
    enabled: !!prospectId,
    queryFn: async () => {
      if (!prospectId) return null;

      // Fetch prospect
      const { data: prospect, error: prospectError } = await supabase
        .from('prospects')
        .select(`
          *,
          prospect_attribution (*)
        `)
        .eq('id', prospectId)
        .single();

      if (prospectError) throw prospectError;

      // Fetch call logs
      const { data: callLogs, error: callLogsError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('call_date', { ascending: false });

      if (callLogsError) throw callLogsError;

      // Fetch activities
      const { data: activities, error: activitiesError } = await supabase
        .from('prospect_activities')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activitiesError) throw activitiesError;

      const attributionData = Array.isArray(prospect.prospect_attribution) 
        ? prospect.prospect_attribution[0] 
        : null;

      return {
        prospect: {
          ...prospect,
          forecast_probability: prospect.forecast_probability ?? 0,
          deal_value: prospect.deal_value ?? 0,
          call_count: prospect.call_count ?? 0,
          lead_source: prospect.lead_source ?? null,
          attribution: attributionData,
        } as ProspectWithAttribution,
        callLogs: callLogs as CallLog[],
        activities: activities as ProspectActivity[],
      };
    },
  });
}

// Log a manual call
export function useLogCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callData: Omit<CallLog, 'id' | 'created_at' | 'fathom_call_id'>) => {
      const { data, error } = await supabase
        .from('call_logs')
        .insert(callData)
        .select()
        .single();

      if (error) throw error;

      // Update last contacted
      await supabase
        .from('prospects')
        .update({ 
          last_contacted_at: callData.call_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', callData.prospect_id);

      // Log activity
      await supabase.from('prospect_activities').insert({
        prospect_id: callData.prospect_id,
        activity_type: 'call_logged',
        activity_data: {
          call_log_id: data.id,
          manual: true,
          sentiment: callData.sentiment,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-detail'] });
      toast.success('Call logged successfully');
    },
    onError: (error) => {
      toast.error('Failed to log call');
      console.error(error);
    },
  });
}

// Upload prospect headshot
export function useUploadHeadshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, file }: { prospectId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `prospect-headshots/${prospectId}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Update prospect with headshot URL
      const { error: updateError } = await supabase
        .from('prospects')
        .update({ 
          headshot_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', prospectId);

      if (updateError) throw updateError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-detail'] });
      toast.success('Headshot updated');
    },
    onError: (error) => {
      toast.error('Failed to upload headshot');
      console.error(error);
    },
  });
}

// Create a new prospect manually
export function useCreateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospectData: {
      first_name: string;
      last_name?: string | null;
      email: string;
      phone?: string | null;
      company?: string | null;
      source_page?: string;
      partner_id?: string | null;
      sales_notes?: string | null;
    }) => {
      // Get the first pipeline stage (Applied)
      const { data: stages, error: stagesError } = await supabase
        .from('sales_pipeline_stages')
        .select('id')
        .order('order_index', { ascending: true })
        .limit(1);

      if (stagesError) throw stagesError;
      const firstStageId = stages?.[0]?.id || null;

      // Check if prospect already exists
      const { data: existing } = await supabase
        .from('prospects')
        .select('id')
        .eq('email', prospectData.email)
        .maybeSingle();

      if (existing) {
        throw new Error('A prospect with this email already exists');
      }

      // Try to get GHL contact ID
      let ghlContactId: string | null = null;
      try {
        const { data: lookupData } = await supabase.functions.invoke('lookup-ghl-contact', {
          body: { email: prospectData.email }
        });
        ghlContactId = lookupData?.ghl_contact_id || null;
      } catch {
        // GHL lookup failed, continue without it
      }

      // Build full name from first/last
      const fullName = [prospectData.first_name, prospectData.last_name].filter(Boolean).join(' ');

      // Create the prospect - visitor_id is required, use a generated ID for manual entries
      const { data: prospect, error: insertError } = await supabase
        .from('prospects')
        .insert({
          visitor_id: `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          email: prospectData.email,
          name: fullName,
          phone: prospectData.phone,
          status: 'applied',
          pipeline_stage_id: firstStageId,
          source_page: prospectData.source_page || 'manual_entry',
          partner_id: prospectData.partner_id || null,
          sales_notes: prospectData.sales_notes,
          ghl_contact_id: ghlContactId,
          // Default next action for new prospects
          next_action_type: 'call_to_qualify',
          next_action_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Log activity
      await supabase.from('prospect_activities').insert({
        prospect_id: prospect.id,
        activity_type: 'prospect_created',
        activity_data: {
          source: prospectData.source_page || 'manual_entry',
          manual: true,
        },
      });

      return prospect;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      toast.success('Prospect added successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add prospect');
      console.error(error);
    },
  });
}
