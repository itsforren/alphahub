-- Add address columns to clients table for A2P verification
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS address_street text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_state text,
ADD COLUMN IF NOT EXISTS address_zip text;

-- Update the initialize_onboarding_checklist function to add new items
CREATE OR REPLACE FUNCTION public.initialize_onboarding_checklist(p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only insert if no items exist for this client
  IF NOT EXISTS (SELECT 1 FROM onboarding_checklist WHERE client_id = p_client_id) THEN
    INSERT INTO onboarding_checklist (client_id, category, item_key, item_label, display_order) VALUES
    -- Hub Setup (category: hub_setup)
    (p_client_id, 'hub_setup', 'due_date_set', 'Is there a due date set on the profile?', 1),
    (p_client_id, 'hub_setup', 'onboarding_call_scheduled', 'Is the onboarding call scheduled?', 2),
    (p_client_id, 'hub_setup', 'welcome_email_sent', 'Was the Welcome Email sent to the user automatically?', 3),
    (p_client_id, 'hub_setup', 'hub_profile_created', 'Is the users Alpha Hub profile created?', 4),
    (p_client_id, 'hub_setup', 'user_access_confirmed', 'Is it confirmed that agent has user access to the Alpha Hub?', 5),
    (p_client_id, 'hub_setup', 'course_access', 'Does the user have Course Access?', 6),
    
    -- Google Ads Campaign (category: google_ads)
    (p_client_id, 'google_ads', 'campaign_created', 'Is the Google Ad campaign created?', 1),
    (p_client_id, 'google_ads', 'campaign_has_agent_name', 'Does the Google Ad campaign have the agents name?', 2),
    (p_client_id, 'google_ads', 'campaign_paused', 'Is the campaign paused?', 3),
    (p_client_id, 'google_ads', 'budget_correct', 'Is the budget correct? (monthly budget divided by 30)', 4),
    (p_client_id, 'google_ads', 'states_match', 'Is the states set correctly on the campaign and match inside the Alpha Hub?', 5),
    (p_client_id, 'google_ads', 'url_prefix_correct', 'Is the URL prefix on the campaign set to the correct agent ID?', 6),
    (p_client_id, 'google_ads', 'landing_page_live', 'Is the agents TFWP Agent Landing Page live?', 7),
    (p_client_id, 'google_ads', 'landing_page_url_correct', 'Is the landing page URL correct in the Google Ads campaign ad?', 8),
    
    -- CRM Account (category: crm_account)
    (p_client_id, 'crm_account', 'subaccount_created', 'Does the agent have an Alpha Agent CRM subaccount?', 1),
    (p_client_id, 'crm_account', 'staff_page_listed', 'Is the agents profile listed on the staff page?', 2),
    (p_client_id, 'crm_account', 'ghl_user_id_matches', 'Does the GHL User ID in the Alpha Hub match the one on the agents user profile on Alpha Agent CRM?', 3),
    (p_client_id, 'crm_account', 'calendars_active', 'Are all the calendars active and have the agents name?', 4),
    (p_client_id, 'crm_account', 'agent_assigned_calendars', 'Is the agent assigned to all the calendars?', 5),
    (p_client_id, 'crm_account', 'subaccount_id_matches', 'Does the subaccount ID in the Alpha Hub match the subaccount ID of the agents subaccount?', 6),
    (p_client_id, 'crm_account', 'campaign_id_matches', 'Does the campaign ID in the Alpha Hub match the Google Ads campaign ID?', 7),
    (p_client_id, 'crm_account', 'field_mapping_complete', 'On the info tab of the Alpha Hub profile, does the CRM custom field mapping show fully mapped?', 8),
    
    -- Funnel Testing (category: funnel_testing)
    (p_client_id, 'funnel_testing', 'test_url_correct', 'Click the test URL on the campaign settings - does it show the correct agents landing page?', 1),
    (p_client_id, 'funnel_testing', 'calendar_page_redirect', 'After submitting a test lead, are you taken to the agents calendar page?', 2),
    (p_client_id, 'funnel_testing', 'calendar_headshot', 'Does the agents calendar page have the headshot image?', 3),
    (p_client_id, 'funnel_testing', 'calendar_has_agent_name', 'Does the calendar show the agents calendar that has their name on it?', 4),
    (p_client_id, 'funnel_testing', 'fields_autopopulated', 'Is the calendar fields autopopulated with the lead info you put in on the survey?', 5),
    (p_client_id, 'funnel_testing', 'lead_shows_hub', 'Does the lead show correctly in the Alpha Hub?', 6),
    (p_client_id, 'funnel_testing', 'lead_shows_crm', 'Did the lead show in the agents CRM subaccount?', 7),
    (p_client_id, 'funnel_testing', 'iul_followup_entered', 'Did the lead get entered into the IUL follow up?', 8),
    (p_client_id, 'funnel_testing', 'followup_email_text', 'Did the lead get the follow up email and text correctly?', 9),
    (p_client_id, 'funnel_testing', 'thank_you_page_redirect', 'When you schedule a call do you get taken to the agents live thank you page?', 10),
    (p_client_id, 'funnel_testing', 'thank_you_headshot', 'Does the headshot show on the thank you page?', 11),
    (p_client_id, 'funnel_testing', 'nfia_button_works', 'Does the NFIA button link work on the thank you page?', 12),
    (p_client_id, 'funnel_testing', 'nfia_page_live', 'Is the users NFIA page live?', 13),
    (p_client_id, 'funnel_testing', 'nfia_button_scheduler', 'Does the button on the NFIA page go to the live agent scheduler?', 14),
    (p_client_id, 'funnel_testing', 'text_me_button_works', 'Does the text me now button work on the thank you page?', 15),
    (p_client_id, 'funnel_testing', 'booked_call_shows', 'Does it show as booked call on the Alpha Hub?', 16),
    (p_client_id, 'funnel_testing', 'appointment_reminders', 'Did the lead get entered into the appointment reminders?', 17),
    (p_client_id, 'funnel_testing', 'tfwp_profile_active', 'Is the agents TFWP profile page active?', 18),
    (p_client_id, 'funnel_testing', 'book_call_link_works', 'Does the book a call with me take you to the agents calendar page?', 19),
    
    -- Compliance (category: compliance)
    (p_client_id, 'compliance', 'a2p_submitted', 'Is the A2P verification submitted?', 1),
    (p_client_id, 'compliance', 'a2p_verified', 'Is the subaccount A2P verified?', 2),
    (p_client_id, 'compliance', 'crm_access_confirmed', 'Is it confirmed the agent has access to the CRM?', 3),
    (p_client_id, 'compliance', 'zoom_google_connected', 'Did the agent add their Zoom and Google calendar?', 4),
    (p_client_id, 'compliance', 'payment_method_on_file', 'Does the agent have an active payment method on file for the CRM?', 5),
    (p_client_id, 'compliance', 'rebilling_enabled', 'Is the agents rebilling turned on for the CRM?', 6),
    (p_client_id, 'compliance', 'zoom_select_meeting_location', 'Does the agent have Zoom Select as meeting location on the illustration call?', 7),
    (p_client_id, 'compliance', 'phone_number_purchased', 'Did the agent purchase their phone number?', 8),
    
    -- Billing & Docs (category: billing_docs)
    (p_client_id, 'billing_docs', 'management_fee_paid', 'Did the agent pay the management fee?', 1),
    (p_client_id, 'billing_docs', 'management_fee_marked', 'Is it marked as paid in the billing tab on Alpha Hub?', 2),
    (p_client_id, 'billing_docs', 'ad_spend_paid', 'Did the agent pay the first ad spend payment?', 3),
    (p_client_id, 'billing_docs', 'ad_spend_marked', 'Is it marked in the billing tab?', 4),
    (p_client_id, 'billing_docs', 'agreement_signed', 'Did the agent sign the agreement?', 5),
    (p_client_id, 'billing_docs', 'agreement_stored', 'Is the agreement stored in the Alpha Hub?', 6),
    
    -- Final Onboarding (category: final_onboarding)
    (p_client_id, 'final_onboarding', 'understands_chat_support', 'Does the agent understand to get support they use the chat inside of the Alpha Hub?', 1),
    (p_client_id, 'final_onboarding', 'test_message_sent', 'Did they send a message to test it works?', 2),
    (p_client_id, 'final_onboarding', 'checkin_scheduled', 'Did you schedule their first check-in call 14 days out and set it for bi-weekly recurring check-in?', 3),
    (p_client_id, 'final_onboarding', 'onboarding_call_completed', 'Was the onboarding call completed?', 4);
  END IF;
END;
$function$;