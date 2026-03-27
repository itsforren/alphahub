import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const DEFAULT_ONBOARDING_TASKS = [
  { task_name: 'crm_subaccount_created', task_label: 'Alpha CRM Subaccount Created', display_order: 1 },
  { task_name: 'crm_user_created', task_label: 'Alpha CRM User Created and Added to Subaccount', display_order: 2 },
  { task_name: 'nfia_membership_activated', task_label: 'NFIA Membership Activated', display_order: 3 },
  { task_name: 'nfia_page_active', task_label: 'NFIA Membership Page Active', display_order: 4 },
  { task_name: 'tfwp_profile_created', task_label: 'TFWP Profile Created', display_order: 5 },
  { task_name: 'tfwp_scheduler_created', task_label: 'TFWP Scheduler Created', display_order: 6 },
  { task_name: 'tfwp_thankyou_created', task_label: 'TFWP Thank You Page Created', display_order: 7 },
  { task_name: 'ads_funnel_created', task_label: 'Agents Ads Funnel Created', display_order: 8 },
  { task_name: 'google_ads_campaign_created', task_label: 'Google Ads Campaign Created', display_order: 9 },
  { task_name: 'crm_fully_built', task_label: 'Alpha CRM Fully Custom Built', display_order: 10 },
  { task_name: 'hub_user_created', task_label: 'Alpha Hub User Created', display_order: 11 },
  { task_name: 'hub_profile_created', task_label: 'AlphaHub Profile Created', display_order: 12 },
  { task_name: 'crm_connected_to_hub', task_label: 'Alpha CRM Connected to Alpha Hub Account', display_order: 13 },
  { task_name: 'course_access_granted', task_label: 'Access Granted to Alpha Agent Course', display_order: 14 },
  { task_name: 'calendars_synced', task_label: 'Calendars Created and Synced to Funnel', display_order: 15 },
  { task_name: 'google_ads_updated', task_label: 'Google Ads Campaign Updated with Agent Details', display_order: 16 },
];

// The 18-step automation sequence for external AI agent
const AUTOMATION_STEPS = [
  { step: 1, name: 'lowercase_name', label: 'Lowercase Agent Name' },
  { step: 2, name: 'generate_slug', label: 'Generate URL Slug' },
  { step: 3, name: 'generate_bio', label: 'Generate AI Bio' },
  { step: 4, name: 'create_nfia', label: 'Create NFIA Page' },
  { step: 5, name: 'create_scheduler', label: 'Create Scheduler Page' },
  { step: 6, name: 'create_lander', label: 'Create Lander Page' },
  { step: 7, name: 'create_profile', label: 'Create Profile Page' },
  { step: 8, name: 'create_thankyou', label: 'Create Thank You Page' },
  { step: 9, name: 'create_subaccount', label: 'Create GHL Subaccount' },
  { step: 10, name: 'create_ghl_user', label: 'Activate SaaS' },
  { step: 11, name: 'install_snapshot', label: 'Verify Snapshot & Calendar ID' },
  { step: 12, name: 'provision_phone', label: 'Twilio Overrule & Buy Phone' },
  { step: 13, name: 'pull_calendar_id', label: 'Assign User to Calendars' },
  { step: 14, name: 'assign_calendars', label: 'Update Scheduler Embed' },
  { step: 15, name: 'update_scheduler_embed', label: 'Sync CRM Custom Fields' },
  { step: 16, name: 'sync_crm_custom_fields', label: 'Create Google Ads Campaign' },
  { step: 17, name: 'create_google_ads', label: 'Verify & Test Onboarding' },
  { step: 18, name: 'verify_onboarding', label: 'Mark Complete' },
];

// Available edge functions for the AI agent to call via bridge
const AVAILABLE_FUNCTIONS = [
  'generate-agent-bio',
  'nfia-create-agent',
  'webflow-cms-create',
  'webflow-cms-update',
  'ghl-create-subaccount',
  'ghl-create-user',
  'crm-snapshot-status',
  'crm-discovery-calendar',
  'crm-location-token',
  'ghl-inject-twilio',
  'ghl-provision-phone',
  'ghl-assign-user-to-all-calendars',
  'ghl-sync-custom-fields',
  'create-google-ads-campaign',
  'verify-onboarding-live',
  'refresh-stable-headshot',
  'verify-onboarding',
  'send-test-lead',
];

function buildFullName(payload: Record<string, unknown>): string {
  const firstName = payload.first_name || payload.firstName || payload.First_Name || payload['First Name'] || '';
  const lastName = payload.last_name || payload.lastName || payload.Last_Name || payload['Last Name'] || '';
  if (firstName || lastName) return `${firstName} ${lastName}`.trim();
  return (payload.name || payload.Name || payload.full_name || payload.fullName || '') as string;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value);
  return isNaN(num) ? null : num;
}

function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  try {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  } catch {
    return null;
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  return password;
}

// Generate a unique agent ID (20 character lowercase alphanumeric)
function generateAgentId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const VALID_US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

function normalizeStatesToArray(value: unknown): string[] {
  if (value === null || value === undefined) return [];

  // If a JSON string was stored in a text field, try to parse it.
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return normalizeStatesToArray(JSON.parse(trimmed));
      } catch {
        // fall through
      }
    }

    // Handles:
    // - "TX,FL,CA"
    // - "TX\nFL\nCA"
    // - Zapier formatted text like "1\nTX\n2\nFL..."
    const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
    return tokens
      .map((t) => t.toUpperCase())
      .filter((t) => t.length === 2 && VALID_US_STATE_CODES.has(t));
  }

  if (Array.isArray(value)) {
    return value.flatMap((v) => normalizeStatesToArray(v));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort((a, b) => {
      const an = Number(a[0]);
      const bn = Number(b[0]);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return String(a[0]).localeCompare(String(b[0]));
    });

    return entries.flatMap(([, v]) => normalizeStatesToArray(v));
  }

  return [];
}

function normalizeStatesToCsv(value: unknown): string | null {
  const arr = normalizeStatesToArray(value);
  if (!arr.length) return null;

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const code of arr) {
    if (!seen.has(code)) {
      seen.add(code);
      deduped.push(code);
    }
  }

  return deduped.join(',');
}

// Send Slack error notification when guidance handoff fails
async function sendSlackErrorNotification(
  agentName: string,
  clientId: string,
  agentId: string,
  error: string
): Promise<void> {
  const slackWebhookUrl = Deno.env.get('SLACK_CHAT_WEBHOOK_URL');
  if (!slackWebhookUrl) {
    console.log('SLACK_CHAT_WEBHOOK_URL not configured, skipping error notification');
    return;
  }

  try {
    const payload = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Onboarding Handoff Failed",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Agent:*\n${agentName}` },
            { type: "mrkdwn", text: `*Agent ID:*\n${agentId}` }
          ]
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Client ID:*\n${clientId}` },
            { type: "mrkdwn", text: `*Time:*\n${new Date().toISOString()}` }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Error:*\n\`\`\`${error.substring(0, 500)}\`\`\``
          }
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: "Webhook target: conscious.sysconscious.com/guidance/onboard" }
          ]
        }
      ]
    };

    await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('Slack error notification sent successfully');
  } catch (err) {
    console.error('Failed to send Slack error notification:', err);
  }
}

// Trigger run-full-onboarding edge function directly
async function triggerOnboardingAutomation(
  supabaseUrl: string,
  supabaseServiceKey: string,
  clientId: string,
  startFromStep: number = 1
): Promise<{ success: boolean; error?: string; response?: unknown }> {
  try {
    console.log('=== TRIGGERING ONBOARDING AUTOMATION ===');
    console.log('Client ID:', clientId);
    console.log('Starting from step:', startFromStep);

    const response = await fetch(`${supabaseUrl}/functions/v1/run-full-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ clientId, startFromStep }),
    });

    const responseText = await response.text();
    console.log('Automation response status:', response.status);
    console.log('Automation response:', responseText.substring(0, 500));

    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return {
      success: response.ok,
      response: responseData,
      error: response.ok ? undefined : `Status ${response.status}: ${responseText.substring(0, 200)}`,
    };
  } catch (err) {
    console.error('Failed to trigger onboarding automation:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key', code: 'AUTH_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: keyData, error: keyError } = await supabase
      .from('webhook_api_keys').select('id, name, is_active, request_count').eq('api_key', apiKey).single();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key', code: 'AUTH_INVALID' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!keyData.is_active) {
      return new Response(JSON.stringify({ error: 'API key is inactive', code: 'AUTH_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('webhook_api_keys').update({
      last_used_at: new Date().toISOString(), request_count: (keyData.request_count || 0) + 1
    }).eq('id', keyData.id);

    const payload = await req.json();
    console.log('=== AGENT ONBOARDING WEBHOOK STARTED ===');
    console.log('Received payload:', JSON.stringify(payload, null, 2));
    console.log('Payload keys:', Object.keys(payload));

    // Extract and log all expected fields
    // Note: agent_id from GHL is now stored as ghl_contact_id, we generate our own agent_id
    const ghlContactId = payload.agent_id || payload.AgentId || payload.agentId;

    // Extract contact_id - this is the sales CRM contact ID needed for SaaS activation
    // GHL sends this at root level as contact_id (NOT inside contact object)
    // Priority: root-level contact_id > contactId > Contact Id > contact.id (fallback)
    const contactId = payload.contact_id || payload.contactId || payload['Contact Id'] ||
      (payload.contact && typeof payload.contact === 'object'
        ? (payload.contact as Record<string, unknown>).id
        : null);

    const visitorId = payload.visitor_id || payload.visitorId || payload.VisitorId;
    const prospectId = payload.prospect_id || payload.prospectId || payload.ProspectId || payload.Prospect_id || payload['Prospect_id'];
    const rawReferralCode = payload.referral_code || payload.ref || payload.referralCode;
    const referralCode = (rawReferralCode && rawReferralCode !== 'null' && rawReferralCode !== 'undefined') ? rawReferralCode : null;
    const rawNpn = payload.npn || payload.NPN || payload.npn_number || payload.Npn_Number || payload['NPN Number'] || payload['npn number'] || payload.Npn || payload.NPNNumber;
    const npn = (rawNpn && rawNpn !== 'null' && rawNpn !== 'undefined') ? rawNpn : null;

    console.log('=== CONTACT ID DEBUG ===');
    console.log('payload.contact_id (root):', payload.contact_id);
    console.log('payload.contact?.id:', payload.contact?.id);
    console.log('Final contactId for SaaS billing:', contactId);
    console.log('Final ghlContactId for agent ref:', ghlContactId);

    // Validation warning if contactId is missing but agent ref exists
    if (!contactId && ghlContactId) {
      console.warn('⚠️ WARNING: No billing contactId found, but ghlContactId exists. SaaS activation may fail.');
      console.warn('Available contact fields:', JSON.stringify({
        contact_id: payload.contact_id,
        contactId: payload.contactId,
        'Contact Id': payload['Contact Id'],
        'contact.id': payload.contact?.id
      }));
    }

    console.log('=== EXTRACTED IDENTIFIERS ===');
    console.log('visitor_id:', visitorId);
    console.log('prospect_id:', prospectId);
    console.log('referral_code:', referralCode);
    console.log('npn:', npn);
    console.log('onboarding_call_time:', payload.onboarding_call_time);

    // Extract email first - it's our primary identifier
    const email = (payload.email || payload.Email || payload.contact_email || '').toString().toLowerCase().trim();
    const name = buildFullName(payload);
    const phone = payload.phone || payload.Phone || payload.contact_phone;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing required field: email', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!name) {
      return new Response(JSON.stringify({ error: 'Missing required field: name', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch template campaign ID from onboarding_settings
    const { data: templateCampaignSetting } = await supabase
      .from('onboarding_settings')
      .select('setting_value')
      .eq('setting_key', 'google_ads_template_campaign_id')
      .single();

    const templateCampaignId = templateCampaignSetting?.setting_value || '22764486140';
    console.log('Template Google Campaign ID:', templateCampaignId);

    // Check if auto-create campaigns is enabled
    const { data: autoCreateSetting } = await supabase
      .from('onboarding_settings')
      .select('setting_value')
      .eq('setting_key', 'auto_create_campaigns')
      .single();

    const autoCreateEnabled = autoCreateSetting?.setting_value === 'true';

    // Check if client already exists by email (primary identifier)
    const { data: existingClient } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // If client exists, update their record and trigger rebooking flow
    if (existingClient) {
      console.log('=== EXISTING CLIENT FOUND (REBOOKING) ===');
      console.log('client_id:', existingClient.id);
      console.log('agent_id:', existingClient.agent_id);
      console.log('Previous onboarding_call_scheduled_at:', existingClient.onboarding_call_scheduled_at);

      const newOnboardingCallTime = parseDate(payload.onboarding_call_time || payload.scheduled_time || payload.appointment_time);

      // Update the existing client with new booking info
      const updateData: Record<string, unknown> = {
        onboarding_call_scheduled_at: newOnboardingCallTime,
        updated_at: new Date().toISOString(),
      };

      // Update billing contact ID if provided and different (for SaaS activation)
      if (contactId && contactId !== existingClient.ghl_contact_id) {
        updateData.ghl_contact_id = contactId;
      }
      // Preserve agent reference separately
      if (ghlContactId && ghlContactId !== existingClient.ghl_agent_ref) {
        updateData.ghl_agent_ref = ghlContactId;
      }

      // Update other fields if provided
      if (phone) updateData.phone = phone;

      const statesRaw =
        payload.states ||
        payload.States ||
        payload.licensed_states ||
        payload.stateslicensed ||
        payload.statesLicensed ||
        payload.license_states;

      const statesCsv = normalizeStatesToCsv(statesRaw);

      // CRITICAL: Only update states from CRM if client does NOT have an active Google Ads campaign
      if (statesCsv && !existingClient.google_campaign_id) {
        updateData.states = statesCsv;
        console.log('states (csv) - updating from CRM:', statesCsv);
      } else if (existingClient.google_campaign_id) {
        console.log('Skipping states update - client has active Google Ads campaign:', existingClient.google_campaign_id);
      }

      if (payload.headshot_url || payload.profile_image_url || payload.avatar_url || payload.headshot) {
        updateData.profile_image_url = payload.headshot_url || payload.profile_image_url || payload.avatar_url || payload.headshot;
      }
      if (npn) updateData.npn = npn;

      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', existingClient.id);

      if (updateError) {
        console.error('Failed to update existing client:', updateError);
        return new Response(JSON.stringify({
          error: 'Failed to update existing client',
          code: 'UPDATE_ERROR',
          details: updateError.message
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('=== EXISTING CLIENT UPDATED ===');
      console.log('New onboarding_call_scheduled_at:', newOnboardingCallTime);

      // === DEDUPLICATION: Check if a run was created in the last 60 seconds ===
      const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
      const { data: recentRun } = await supabase
        .from('onboarding_automation_runs')
        .select('id')
        .eq('client_id', existingClient.id)
        .gte('created_at', sixtySecondsAgo)
        .limit(1)
        .maybeSingle();

      if (recentRun) {
        console.log(`DEDUP: Skipping rebooking automation for client ${existingClient.id} — recent run ${recentRun.id} exists (created <60s ago)`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Webhook deduplicated — recent automation run exists',
          client_id: existingClient.id,
          deduplicated: true,
          existing_run_id: recentRun.id,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create a pending automation run for the rebooking
      const { data: automationRun } = await supabase
        .from('onboarding_automation_runs')
        .insert({
          client_id: existingClient.id,
          status: 'pending',
          current_step: 1,
          total_steps: AUTOMATION_STEPS.length,
          steps_completed: [],
          steps_failed: [],
          step_data: {},
        })
        .select('id')
        .single();

      // Build handoff payload for rebooking
      const rebookingHandoff = {
        event: 'agent_onboarding_triggered',
        timestamp: new Date().toISOString(),
        source: 'lovable_webhook',
        is_rebooking: true,

        bridge: {
          endpoint: `${supabaseUrl}/functions/v1/onboarding-bridge`,
          auth_header: 'x-bridge-key',
        },

        client_id: existingClient.id,
        automation_run_id: automationRun?.id || null,
        agent_id: existingClient.agent_id,
        contact_id: contactId || null,

        agent: {
          name: existingClient.name,
          first_name: existingClient.name?.split(' ')[0] || '',
          last_name: existingClient.name?.split(' ').slice(1).join(' ') || '',
          email: existingClient.email,
          phone: phone || existingClient.phone,
          states: statesCsv?.split(',') || existingClient.states?.split(',') || [],
          states_csv: statesCsv || existingClient.states,
          npn: npn || existingClient.npn,
          profile_image_url: updateData.profile_image_url || existingClient.profile_image_url,
          agent_bio_input: existingClient.agent_bio_input,
        },

        onboarding: {
          call_scheduled_at: newOnboardingCallTime,
          started_at: existingClient.automation_started_at,
        },

        google_ads: {
          template_campaign_id: templateCampaignId,
          auto_create_enabled: autoCreateEnabled,
          existing_campaign_id: existingClient.google_campaign_id,
        },

        existing_artifacts: {
          url_slug: existingClient.url_slug,
          ai_bio: existingClient.ai_bio,
          nfia_link: existingClient.nfia_link,
          scheduler_link: existingClient.scheduler_link,
          webflow_scheduler_id: existingClient.webflow_scheduler_id,
          lander_link: existingClient.lander_link,
          webflow_lander_id: existingClient.webflow_lander_id,
          tfwp_profile_link: existingClient.tfwp_profile_link,
          webflow_profile_id: existingClient.webflow_profile_id,
          thankyou_link: existingClient.thankyou_link,
          webflow_thankyou_id: existingClient.webflow_thankyou_id,
          subaccount_id: existingClient.subaccount_id,
          ghl_user_id: existingClient.ghl_user_id,
          discovery_calendar_id: existingClient.discovery_calendar_id,
          ghl_phone_number: existingClient.ghl_phone_number,
          google_campaign_id: existingClient.google_campaign_id,
          ads_link: existingClient.ads_link,
          crm_link: existingClient.crm_link,
        },

        steps: AUTOMATION_STEPS,
        available_functions: AVAILABLE_FUNCTIONS,
      };

      // Trigger onboarding automation directly (skip completed steps via idempotency)
      const automationResult = await triggerOnboardingAutomation(
        supabaseUrl,
        supabaseServiceKey,
        existingClient.id,
        1 // Start from step 1, idempotent checks will skip completed artifacts
      );
      console.log('Automation result:', automationResult.success ? 'SUCCESS' : 'FAILED');

      // Send Slack notification if automation failed
      if (!automationResult.success) {
        await sendSlackErrorNotification(
          existingClient.name,
          existingClient.id,
          existingClient.agent_id || 'unknown',
          automationResult.error || 'Unknown error'
        );
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Existing client updated - automation triggered',
        client_id: existingClient.id,
        agent_id: existingClient.agent_id,
        ghl_contact_id: ghlContactId || existingClient.ghl_contact_id,
        is_rebooking: true,
        automation_run_id: automationRun?.id,
        new_onboarding_call_time: newOnboardingCallTime,
        automation_triggered: automationResult.success,
        automation_error: automationResult.error || null,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============ NEW CLIENT FLOW ============

    // Generate new agent_id internally (Alpha Hub is the source of truth)
    const generatedAgentId = generateAgentId();
    console.log('=== GENERATING NEW AGENT ID ===');
    console.log('Generated agent_id:', generatedAgentId);
    console.log('GHL contact_id (stored for reference):', ghlContactId);

    const rawStates =
      payload.states ||
      payload.States ||
      payload.licensed_states ||
      payload.stateslicensed ||
      payload.statesLicensed ||
      payload.license_states;

    const normalizedStatesCsv = normalizeStatesToCsv(rawStates);

    const clientData = {
      email: email,
      name: name,
      phone: phone,
      states: normalizedStatesCsv,
      profile_image_url: payload.headshot_url || payload.profile_image_url || payload.avatar_url || payload.headshot,
      management_fee: (() => {
        const raw = parseNumber(payload.management_fee || payload.ManagementFee || payload['Management Fee']);
        // GHL sometimes sends cents (149700) instead of dollars (1497). Auto-fix.
        if (raw && raw > 10000) return Math.round(raw / 100);
        return raw;
      })(),
      ad_spend_budget: parseNumber(payload.ad_spend_budget || payload.AdSpendBudget || payload['Ad Spend Budget']),
      npn: npn || null,
      team: payload.team || payload.Team,
      agent_id: generatedAgentId,
      ghl_contact_id: contactId || null,  // Sales CRM contact for SaaS billing
      ghl_agent_ref: ghlContactId || null,  // Agent reference (preserved for debugging)
      status: 'onboarding',
      onboarding_status: 'in_progress' as const,
      automation_started_at: new Date().toISOString(),
      onboarding_call_scheduled_at: parseDate(payload.onboarding_call_time || payload.scheduled_time || payload.appointment_time),
      scheduler_link: payload.scheduler_link || payload.calendar_link,
      address_street: payload.address_street || payload.address || payload.street || payload.Address,
      address_city: payload.address_city || payload.city || payload.City,
      address_state: payload.address_state || payload.state_address || payload.StateAddress,
      address_zip: payload.address_zip || payload.zip || payload.zipcode || payload.Zip || payload.postal_code,
      referral_code: referralCode,
      agent_bio_input: payload.agent_bio || payload.bio || payload.agent_bio_input || null,
    };

    console.log('=== PARSED CLIENT DATA ===');
    console.log('email:', clientData.email);
    console.log('name:', clientData.name);
    console.log('agent_id (generated):', clientData.agent_id);

    const tempPassword = generateTempPassword();
    let authUser: { id: string } | null = null;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: clientData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: clientData.name }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        const { data: existingAuth } = await supabase.auth.admin.listUsers();
        const existingUser = existingAuth?.users?.find(u => u.email === clientData.email);
        if (existingUser) authUser = existingUser;
      } else {
        return new Response(JSON.stringify({ error: 'Failed to create user account', code: 'AUTH_CREATE_ERROR', details: authError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else {
      authUser = authData.user;
    }

    const { data: newClient, error: insertError } = await supabase.from('clients').insert({
      ...clientData, user_id: authUser?.id || null,
    }).select().single();

    if (insertError) {
      if (authUser && authData) await supabase.auth.admin.deleteUser(authUser.id);
      return new Response(JSON.stringify({ error: 'Failed to create client', code: 'INSERT_ERROR', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const client = newClient;

    if (authUser) {
      await supabase.from('profiles').upsert({ id: authUser.id, email: clientData.email, name: clientData.name }, { onConflict: 'id' });
      const { data: existingRole } = await supabase.from('user_roles').select('id').eq('user_id', authUser.id).eq('role', 'client').maybeSingle();
      if (!existingRole) await supabase.from('user_roles').insert({ user_id: authUser.id, role: 'client' });
    }

    await supabase.from('onboarding_tasks').insert(DEFAULT_ONBOARDING_TASKS.map(task => ({
      client_id: client.id, task_name: task.task_name, task_label: task.task_label, display_order: task.display_order, completed: false,
    })));

    if (authUser) {
      const { data: courses } = await supabase.from('courses').select('id').eq('status', 'published');
      if (courses?.length) {
        await supabase.from('enrollments').upsert(courses.map(c => ({ user_id: authUser!.id, course_id: c.id })), { onConflict: 'user_id,course_id' });
      }
    }

    console.log('=== CLIENT CREATED SUCCESSFULLY ===');
    console.log('client_id:', client.id);
    console.log('agent_id:', generatedAgentId);
    console.log('user_id:', authUser?.id || 'NULL');

    // ============ STABILIZE HEADSHOT ============
    // Download external headshot and re-host on our storage for reliable third-party access
    let stableHeadshotUrl = clientData.profile_image_url;

    if (clientData.profile_image_url) {
      console.log('=== STABILIZING HEADSHOT ===');
      console.log('Source URL:', clientData.profile_image_url);

      try {
        // Call refresh-stable-headshot using service role key
        const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/refresh-stable-headshot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            clientId: client.id,
            sourceUrl: clientData.profile_image_url,
          }),
        });

        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success && refreshResult.stableUrl) {
            stableHeadshotUrl = refreshResult.stableUrl;
            console.log('Headshot stabilized successfully:', stableHeadshotUrl);
          } else {
            console.warn('Headshot stabilization returned but no stableUrl:', refreshResult);
          }
        } else {
          const errorText = await refreshResponse.text();
          console.warn('Headshot stabilization failed (non-blocking):', refreshResponse.status, errorText);
          // Continue with original URL - GUIDANCE can retry later
        }
      } catch (err) {
        console.warn('Headshot stabilization error (non-blocking):', err);
        // Continue with original URL - GUIDANCE can retry later
      }
    }

    // Link existing prospect (bidirectional linking)
    let prospectLinked = false, linkedProspectId: string | null = null;

    if (prospectId) {
      const { data: prospect } = await supabase.from('prospects').update({ client_id: client.id, converted_at: new Date().toISOString() })
        .eq('id', prospectId).is('client_id', null).select('id').maybeSingle();
      if (prospect) {
        prospectLinked = true;
        linkedProspectId = prospect.id;
      }
    }
    if (!prospectLinked) {
      const { data: prospect } = await supabase.from('prospects').update({ client_id: client.id, converted_at: new Date().toISOString() })
        .eq('email', clientData.email).is('client_id', null).order('created_at', { ascending: false }).limit(1).select('id').maybeSingle();
      if (prospect) {
        prospectLinked = true;
        linkedProspectId = prospect.id;
      }
    }

    // Process referral tracking
    let referralLinked = false;

    if (linkedProspectId) {
      await supabase.from('clients').update({ prospect_id: linkedProspectId }).eq('id', client.id);

      const { data: prospectData } = await supabase
        .from('prospects')
        .select('payment_amount, payment_status, ad_spend_budget, billing_frequency, referral_code, referrer_client_id')
        .eq('id', linkedProspectId)
        .single();

      if (prospectData) {
        if (!clientData.ad_spend_budget && prospectData.ad_spend_budget) {
          clientData.ad_spend_budget = prospectData.ad_spend_budget;
          await supabase.from('clients').update({ ad_spend_budget: prospectData.ad_spend_budget }).eq('id', client.id);
        }
        if (!referralCode && prospectData.referral_code) {
          Object.assign(clientData, { referral_code: prospectData.referral_code });
        }
        if (prospectData.referrer_client_id) {
          await supabase.from('clients').update({ referred_by_client_id: prospectData.referrer_client_id }).eq('id', client.id);
          referralLinked = true;
        }
      }
    }

    const finalReferralCode = referralCode || (clientData as Record<string, unknown>).referral_code;

    if (finalReferralCode && !referralLinked) {
      const { data: refCodeData } = await supabase.from('referral_codes').select('id, client_id').eq('code', finalReferralCode as string).eq('is_active', true).maybeSingle();
      if (refCodeData && refCodeData.client_id !== client.id) {
        await supabase.from('clients').update({ referred_by_client_id: refCodeData.client_id }).eq('id', client.id);
        referralLinked = true;

        const { data: existingReferral } = await supabase.from('referrals').select('id').eq('referrer_client_id', refCodeData.client_id)
          .eq('referred_email', clientData.email).maybeSingle();
        if (existingReferral) {
          await supabase.from('referrals').update({ referred_client_id: client.id, status: 'active', activated_at: new Date().toISOString() }).eq('id', existingReferral.id);
        } else {
          await supabase.from('referrals').insert({
            referrer_client_id: refCodeData.client_id, referred_client_id: client.id, referral_code_id: refCodeData.id,
            referred_email: clientData.email, referred_name: clientData.name, status: 'active', activated_at: new Date().toISOString(),
          });
        }
      }
    }

    // Create billing records and wallet
    const billingCreated = { management_invoice_id: null as string | null, ad_spend_invoice_id: null as string | null, wallet_id: null as string | null };
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (clientData.management_fee && clientData.management_fee > 0) {
      const nextMonth = new Date(today); nextMonth.setMonth(nextMonth.getMonth() + 1);
      const { data: mgmtInvoice } = await supabase.from('billing_records').insert({
        client_id: client.id, billing_type: 'management', amount: clientData.management_fee, due_date: todayStr,
        billing_period_start: todayStr, billing_period_end: nextMonth.toISOString().split('T')[0], status: 'pending',
        recurrence_type: 'monthly', is_recurring_parent: true, next_due_date: nextMonth.toISOString().split('T')[0],
      }).select('id').single();
      if (mgmtInvoice) billingCreated.management_invoice_id = mgmtInvoice.id;
    }

    if (clientData.ad_spend_budget && clientData.ad_spend_budget > 0) {
      const billingFrequency = (clientData as Record<string, unknown>).billing_frequency || 'bi_weekly';
      const nextDue = new Date(today);
      if (billingFrequency === 'monthly') {
        nextDue.setMonth(nextDue.getMonth() + 1);
      } else {
        nextDue.setDate(nextDue.getDate() + 14);
      }

      const { data: adSpendInvoice } = await supabase.from('billing_records').insert({
        client_id: client.id, billing_type: 'ad_spend', amount: clientData.ad_spend_budget, due_date: todayStr,
        billing_period_start: todayStr, billing_period_end: nextDue.toISOString().split('T')[0], status: 'pending',
        recurrence_type: billingFrequency as string, is_recurring_parent: true, next_due_date: nextDue.toISOString().split('T')[0],
      }).select('id').single();
      if (adSpendInvoice) billingCreated.ad_spend_invoice_id = adSpendInvoice.id;
    }

    const { data: wallet } = await supabase.from('client_wallets').insert({ client_id: client.id, ad_spend_balance: 0, low_balance_threshold: 150, tracking_start_date: new Date().toISOString().split('T')[0] }).select('id').single();
    if (wallet) billingCreated.wallet_id = wallet.id;

    // === DEDUPLICATION: Check if a run was created in the last 60 seconds ===
    const newClientSixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const { data: newClientRecentRun } = await supabase
      .from('onboarding_automation_runs')
      .select('id')
      .eq('client_id', client.id)
      .gte('created_at', newClientSixtySecondsAgo)
      .limit(1)
      .maybeSingle();

    if (newClientRecentRun) {
      console.log(`DEDUP: Skipping new client automation for ${client.id} — recent run ${newClientRecentRun.id} exists`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook deduplicated — recent automation run exists',
        client_id: client.id,
        deduplicated: true,
        existing_run_id: newClientRecentRun.id,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create a PENDING automation run (AI agent will manage execution)
    const { data: automationRun, error: automationRunError } = await supabase
      .from('onboarding_automation_runs')
      .insert({
        client_id: client.id,
        status: 'pending',
        current_step: 1,
        total_steps: AUTOMATION_STEPS.length,
        steps_completed: [],
        steps_failed: [],
        step_data: {},
      })
      .select('id')
      .single();

    if (automationRunError) {
      console.error('=== AUTOMATION RUN INSERT FAILED ===');
      console.error('Error:', automationRunError.message);
    } else {
      console.log('=== AUTOMATION RUN CREATED (PENDING) ===');
      console.log('automation_run_id:', automationRun?.id);
    }

    // Build comprehensive handoff payload for external AI agent
    const handoffPayload = {
      event: 'agent_onboarding_triggered',
      timestamp: new Date().toISOString(),
      source: 'lovable_webhook',
      is_rebooking: false,

      bridge: {
        endpoint: `${supabaseUrl}/functions/v1/onboarding-bridge`,
        auth_header: 'x-bridge-key',
      },

      client_id: client.id,
      automation_run_id: automationRun?.id || null,
      agent_id: generatedAgentId,
      contact_id: contactId || null,

      agent: {
        name: clientData.name,
        first_name: clientData.name.split(' ')[0] || '',
        last_name: clientData.name.split(' ').slice(1).join(' ') || '',
        email: clientData.email,
        phone: clientData.phone,
        states: normalizedStatesCsv?.split(',') || [],
        states_csv: normalizedStatesCsv,
        npn: clientData.npn,
        profile_image_url: stableHeadshotUrl,
        agent_bio_input: clientData.agent_bio_input,
        address: {
          street: clientData.address_street,
          city: clientData.address_city,
          state: clientData.address_state,
          zip: clientData.address_zip,
        },
      },

      onboarding: {
        call_scheduled_at: clientData.onboarding_call_scheduled_at,
        started_at: clientData.automation_started_at,
      },

      billing: {
        management_fee: clientData.management_fee,
        ad_spend_budget: clientData.ad_spend_budget,
        billing_frequency: (clientData as Record<string, unknown>).billing_frequency || 'bi_weekly',
        management_invoice_id: billingCreated.management_invoice_id,
        ad_spend_invoice_id: billingCreated.ad_spend_invoice_id,
        wallet_id: billingCreated.wallet_id,
      },

      referral: {
        code: finalReferralCode || null,
        linked: referralLinked,
      },

      ...(linkedProspectId ? {
        prospect: {
          id: linkedProspectId,
          linked: true,
        },
      } : {}),

      auth: {
        user_id: authUser?.id || null,
        has_portal_access: !!authUser,
      },

      google_ads: {
        template_campaign_id: templateCampaignId,
        auto_create_enabled: autoCreateEnabled,
      },

      existing_artifacts: {
        url_slug: null,
        ai_bio: null,
        nfia_link: null,
        scheduler_link: clientData.scheduler_link || null,
        webflow_scheduler_id: null,
        lander_link: null,
        webflow_lander_id: null,
        tfwp_profile_link: null,
        webflow_profile_id: null,
        thankyou_link: null,
        webflow_thankyou_id: null,
        subaccount_id: null,
        ghl_user_id: null,
        discovery_calendar_id: null,
        ghl_phone_number: null,
        google_campaign_id: null,
        ads_link: null,
        crm_link: null,
      },

      steps: AUTOMATION_STEPS,
      available_functions: AVAILABLE_FUNCTIONS,
    };

    // Trigger onboarding automation directly (with delay to ensure client record is committed)
    console.log('=== TRIGGERING ONBOARDING AUTOMATION (with 3s delay) ===');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const automationResult = await triggerOnboardingAutomation(
      supabaseUrl,
      supabaseServiceKey,
      client.id,
      1 // Start from step 1
    );
    console.log('Automation result:', automationResult.success ? 'SUCCESS' : 'FAILED');
    if (automationResult.error) {
      console.error('Automation error:', automationResult.error);
    }

    // Send Slack notification if automation failed to start
    if (!automationResult.success) {
      await sendSlackErrorNotification(
        clientData.name,
        client.id,
        generatedAgentId,
        automationResult.error || 'Unknown error'
      );
    }

    // ── Fire Agent_Sale_API conversion ($1,497) ──
    try {
      const conversionApiKey = Deno.env.get('CONVERSION_API_KEY');
      if (conversionApiKey) {
        const firstName = clientData.name?.split(' ')[0] || '';
        const lastName = clientData.name?.split(' ').slice(1).join(' ') || '';
        // Look up any stored GCLID from the linked prospect
        let gclid = '';
        if (linkedProspectId) {
          const { data: prospectAttr } = await supabase
            .from('prospect_attribution')
            .select('first_touch_gclid')
            .eq('prospect_id', linkedProspectId)
            .maybeSingle();
          gclid = prospectAttr?.first_touch_gclid || '';
        }

        console.log(`[Sale Conversion] Firing Agent_Sale_API for ${client.id}`);
        const conversionResp = await fetch(
          `${supabaseUrl}/functions/v1/google-ads-enhanced-conversion`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': conversionApiKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              conversionType: 'Agent_Sale_API',
              email: clientData.email,
              phone: clientData.phone,
              firstName,
              lastName,
              gclid,
            }),
          }
        );
        const conversionResult = await conversionResp.json();
        console.log(`[Sale Conversion] Result:`, JSON.stringify(conversionResult));
      }
    } catch (convErr) {
      console.error('[Sale Conversion] Failed (non-blocking):', convErr);
    }

    const responsePayload = {
      success: true,
      message: 'Client created - automation triggered',
      client_id: client.id,
      agent_id: client.agent_id,
      ghl_contact_id: ghlContactId || null,
      automation_run_id: automationRun?.id,
      has_portal_access: !!client.user_id,
      billing_created: billingCreated,
      referral_linked: referralLinked,
      referral_code_used: finalReferralCode || null,
      prospect_linked: prospectLinked,
      linked_prospect_id: linkedProspectId,
      automation_triggered: automationResult.success,
      automation_error: automationResult.error || null,
      visitor_id_received: visitorId || null,
    };

    console.log('=== WEBHOOK COMPLETE ===');
    console.log('Response:', JSON.stringify(responsePayload, null, 2));

    return new Response(JSON.stringify(responsePayload), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
