import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function generateAgentId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await req.json();
    console.log('=== SELF-ONBOARD-AGENT START ===');

    // ── Validate required fields ──
    const {
      first_name, last_name, email, phone, password,
      states_licensed, npn,
      address_street, address_city, address_state, address_zip,
      address_country = 'US',
      bio, headshot_url, referral_code,
    } = payload;

    const requiredFields = { first_name, last_name, email, phone, password, npn, address_street, address_city, address_state, address_zip };
    const missing = Object.entries(requiredFields).filter(([, v]) => !v || (typeof v === 'string' && !v.trim())).map(([k]) => k);
    if (missing.length > 0) {
      return new Response(JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}`, code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!states_licensed || !Array.isArray(states_licensed) || states_licensed.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one licensed state is required', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const fullName = `${first_name.trim()} ${last_name.trim()}`;
    const statesCsv = states_licensed.join(', ');

    // ── Check for existing client (handle retries gracefully) ──
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, user_id, agent_id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingClient) {
      // Client already exists — return success so retries don't fail
      console.log('Client already exists for', normalizedEmail, '— returning existing data');

      // Find existing agreement
      const { data: existingAgreement } = await supabase
        .from('agreements')
        .select('id')
        .eq('client_id', existingClient.id)
        .maybeSingle();

      // Find existing automation run
      const { data: existingRun } = await supabase
        .from('onboarding_automation_runs')
        .select('id')
        .eq('client_id', existingClient.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Update password if auth user exists
      if (existingClient.user_id) {
        await supabase.auth.admin.updateUserById(existingClient.user_id, { password });
      }

      return new Response(JSON.stringify({
        success: true,
        client_id: existingClient.id,
        agent_id: existingClient.agent_id,
        user_id: existingClient.user_id,
        agreement_id: existingAgreement?.id || null,
        automation_run_id: existingRun?.id || null,
        billing_created: {},
        referral_linked: false,
        _retry: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Generate agent ID ──
    const agentId = generateAgentId();
    console.log('Generated agent_id:', agentId);

    // ── Create Supabase auth user with CHOSEN password ──
    let authUser: { id: string } | null = null;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: { name: fullName },
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        // User exists in auth but not in clients — find them
        const { data: existingAuth } = await supabase.auth.admin.listUsers();
        const existing = existingAuth?.users?.find(u => u.email === normalizedEmail);
        if (existing) {
          authUser = existing;
          // Update their password to the chosen one
          await supabase.auth.admin.updateUserById(existing.id, { password });
        }
      } else {
        return new Response(JSON.stringify({ error: 'Failed to create user account', code: 'AUTH_ERROR', details: authError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else {
      authUser = authData.user;
    }

    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Failed to resolve auth user', code: 'AUTH_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Auth user created/found:', authUser.id);

    // ── Fetch default billing settings ──
    const { data: onboardingSettings } = await supabase
      .from('onboarding_settings')
      .select('default_management_fee, default_ad_spend_budget')
      .limit(1)
      .maybeSingle();

    const managementFee = onboardingSettings?.default_management_fee || 1497; // $1,497
    const adSpendBudget = onboardingSettings?.default_ad_spend_budget || 0;

    // ── Create client record ──
    const { data: client, error: insertError } = await supabase.from('clients').insert({
      user_id: authUser.id,
      email: normalizedEmail,
      name: fullName,
      phone: phone.trim(),
      states: statesCsv,
      agent_id: agentId,
      status: 'onboarding',
      onboarding_status: 'in_progress',
      automation_started_at: new Date().toISOString(),
      management_fee: managementFee,
      ad_spend_budget: adSpendBudget,
      npn: npn.trim(),
      agent_bio_input: bio?.trim() || null,
      profile_image_url: headshot_url || null,
      address_street: address_street.trim(),
      address_city: address_city.trim(),
      address_state: address_state.trim(),
      address_zip: address_zip.trim(),
      address_country: address_country,
      referral_code: referral_code || null,
      package_type: 'full_management',
      password_set_at: new Date().toISOString(),
    }).select().single();

    if (insertError) {
      // Cleanup auth user if client insert fails
      if (authData) await supabase.auth.admin.deleteUser(authUser.id);
      return new Response(JSON.stringify({ error: 'Failed to create client', code: 'INSERT_ERROR', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Client created:', client.id);

    // ── Profile + Role ──
    await supabase.from('profiles').upsert(
      { id: authUser.id, email: normalizedEmail, name: fullName },
      { onConflict: 'id' }
    );

    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('role', 'client')
      .maybeSingle();
    if (!existingRole) {
      await supabase.from('user_roles').insert({ user_id: authUser.id, role: 'client' });
    }

    // ── Onboarding tasks ──
    await supabase.from('onboarding_tasks').insert(
      DEFAULT_ONBOARDING_TASKS.map(task => ({
        client_id: client.id,
        task_name: task.task_name,
        task_label: task.task_label,
        display_order: task.display_order,
        completed: false,
      }))
    );

    // ── Self-onboarding checklist ──
    await supabase.from('client_self_onboarding').insert([
      { client_id: client.id, task_key: 'sign_agreement', task_label: 'Sign Service Agreement', display_order: 1 },
      { client_id: client.id, task_key: 'login_crm', task_label: 'Login to Alpha Agent CRM', display_order: 2 },
      { client_id: client.id, task_key: 'activate_subscription', task_label: 'Activate Subscription (Add Card)', display_order: 3 },
      { client_id: client.id, task_key: 'connect_calendars', task_label: 'Connect Zoom & Google Calendar', display_order: 4 },
    ]);

    // ── Auto-enroll in courses ──
    const { data: courses } = await supabase.from('courses').select('id').eq('status', 'published');
    if (courses?.length) {
      await supabase.from('enrollments').upsert(
        courses.map(c => ({ user_id: authUser!.id, course_id: c.id })),
        { onConflict: 'user_id,course_id' }
      );
    }

    // ── Stabilize headshot (non-blocking) ──
    if (headshot_url) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/refresh-stable-headshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ clientId: client.id, sourceUrl: headshot_url }),
        });
      } catch (err) {
        console.warn('Headshot stabilization failed (non-blocking):', err);
      }
    }

    // ── Billing records ──
    const billingCreated = { management_invoice_id: null as string | null, ad_spend_invoice_id: null as string | null, wallet_id: null as string | null };
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (managementFee > 0) {
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const { data: mgmtInvoice } = await supabase.from('billing_records').insert({
        client_id: client.id, billing_type: 'management', amount: managementFee, due_date: todayStr,
        billing_period_start: todayStr, billing_period_end: nextMonth.toISOString().split('T')[0], status: 'pending',
        recurrence_type: 'monthly', is_recurring_parent: true, next_due_date: nextMonth.toISOString().split('T')[0],
      }).select('id').single();
      if (mgmtInvoice) billingCreated.management_invoice_id = mgmtInvoice.id;
    }

    if (adSpendBudget > 0) {
      const nextDue = new Date(today);
      nextDue.setDate(nextDue.getDate() + 14);
      const { data: adInvoice } = await supabase.from('billing_records').insert({
        client_id: client.id, billing_type: 'ad_spend', amount: adSpendBudget, due_date: todayStr,
        billing_period_start: todayStr, billing_period_end: nextDue.toISOString().split('T')[0], status: 'pending',
        recurrence_type: 'bi_weekly', is_recurring_parent: true, next_due_date: nextDue.toISOString().split('T')[0],
      }).select('id').single();
      if (adInvoice) billingCreated.ad_spend_invoice_id = adInvoice.id;
    }

    // ── Wallet ──
    const { data: wallet } = await supabase.from('client_wallets').insert({
      client_id: client.id, ad_spend_balance: 0, low_balance_threshold: 150,
    }).select('id').single();
    if (wallet) billingCreated.wallet_id = wallet.id;

    // ── Create agreement (pre-filled) ──
    const businessAddress = `${address_street.trim()}, ${address_city.trim()}, ${address_state.trim()} ${address_zip.trim()}`;
    const { data: agreement } = await supabase.from('agreements').insert({
      client_id: client.id,
      status: 'pending',
      template_id: 'alpha-agent-v4',
      signer_full_name: fullName,
      signer_email: normalizedEmail,
      signer_phone: phone.trim(),
      signer_state: address_state.trim(),
      signer_business_address: businessAddress,
      signer_license_states: states_licensed,
      signer_license_number: npn.trim(),
    }).select('id').single();

    if (agreement) {
      await supabase.from('clients').update({ agreement_id: agreement.id }).eq('id', client.id);
    }

    // ── Referral tracking ──
    let referralLinked = false;
    if (referral_code) {
      const { data: refCodeData } = await supabase
        .from('referral_codes')
        .select('id, client_id')
        .eq('code', referral_code)
        .eq('is_active', true)
        .maybeSingle();

      if (refCodeData && refCodeData.client_id !== client.id) {
        await supabase.from('clients').update({ referred_by_client_id: refCodeData.client_id }).eq('id', client.id);
        referralLinked = true;

        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('id')
          .eq('referrer_client_id', refCodeData.client_id)
          .eq('referred_email', normalizedEmail)
          .maybeSingle();

        if (existingReferral) {
          await supabase.from('referrals').update({
            referred_client_id: client.id, status: 'active', activated_at: new Date().toISOString(),
          }).eq('id', existingReferral.id);
        } else {
          await supabase.from('referrals').insert({
            referrer_client_id: refCodeData.client_id, referred_client_id: client.id,
            referral_code_id: refCodeData.id, referred_email: normalizedEmail,
            referred_name: fullName, status: 'active', activated_at: new Date().toISOString(),
          });
        }
      }
    }

    // ── Create automation run ──
    const { data: automationRun } = await supabase.from('onboarding_automation_runs').insert({
      client_id: client.id,
      status: 'pending',
      current_step: 1,
      total_steps: AUTOMATION_STEPS.length,
      steps_completed: [],
      steps_failed: [],
      step_data: {},
    }).select('id').single();

    console.log('Automation run created:', automationRun?.id);

    // ── Trigger run-full-onboarding (with 3s delay for DB commit) ──
    console.log('Triggering run-full-onboarding...');
    setTimeout(async () => {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/run-full-onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ clientId: client.id, startFromStep: 1, ghlPassword: password }),
        });
        const result = await resp.json();
        console.log('run-full-onboarding result:', result.success ? 'OK' : result.error);
      } catch (err) {
        console.error('run-full-onboarding trigger failed:', err);
      }
    }, 3000);

    // ── Return success ──
    const response = {
      success: true,
      client_id: client.id,
      agent_id: agentId,
      user_id: authUser.id,
      agreement_id: agreement?.id || null,
      automation_run_id: automationRun?.id || null,
      billing_created: billingCreated,
      referral_linked: referralLinked,
    };

    console.log('=== SELF-ONBOARD-AGENT COMPLETE ===');
    return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
