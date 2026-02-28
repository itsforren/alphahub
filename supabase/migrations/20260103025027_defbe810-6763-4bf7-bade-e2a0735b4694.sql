-- Add column to track which stage messages have been sent
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS stage_messages_sent jsonb DEFAULT '{}'::jsonb;

-- Add column to track if welcome message was sent
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS welcome_message_sent boolean DEFAULT false;

-- Create function to send welcome chat message
CREATE OR REPLACE FUNCTION public.send_welcome_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client record;
  v_first_name text;
  v_manager_name text;
BEGIN
  -- Get client details
  SELECT * INTO v_client FROM clients WHERE id = NEW.client_id;
  
  -- Skip if welcome message already sent or no client found
  IF v_client IS NULL OR v_client.welcome_message_sent = true THEN
    RETURN NEW;
  END IF;
  
  -- Extract first name
  v_first_name := split_part(COALESCE(v_client.name, 'there'), ' ', 1);
  v_manager_name := COALESCE(v_client.success_manager_name, 'Your Success Manager');
  
  -- Insert welcome message
  INSERT INTO chat_messages (
    conversation_id,
    sender_id,
    sender_name,
    sender_role,
    sender_avatar_url,
    message
  ) VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_manager_name,
    'admin',
    v_client.success_manager_image_url,
    'Hey ' || v_first_name || '! 👋 Looking forward to our call together soon!' || E'\n\n' ||
    'Just want to remind you to do the following things before our call:' || E'\n\n' ||
    '• Purchase your phone number' || E'\n' ||
    '• Connect your Google Calendar' || E'\n' ||
    '• Connect Zoom' || E'\n\n' ||
    'This is all covered in your onboarding video, so make sure to get this done and let me know as soon as it is! Thanks! 🙌'
  );
  
  -- Mark welcome message as sent
  UPDATE clients SET welcome_message_sent = true WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for welcome message on conversation creation
DROP TRIGGER IF EXISTS trigger_send_welcome_chat_message ON chat_conversations;
CREATE TRIGGER trigger_send_welcome_chat_message
  AFTER INSERT ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_chat_message();

-- Create function to check stage completion and send message
CREATE OR REPLACE FUNCTION public.check_stage_completion_and_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client record;
  v_category text;
  v_total_items int;
  v_completed_items int;
  v_conversation_id uuid;
  v_first_name text;
  v_manager_name text;
  v_message text;
  v_stages_sent jsonb;
BEGIN
  -- Only proceed if status changed to 'yes'
  IF NEW.status != 'yes' OR (OLD IS NOT NULL AND OLD.status = 'yes') THEN
    RETURN NEW;
  END IF;
  
  v_category := NEW.category;
  
  -- Count items in this category
  SELECT COUNT(*) INTO v_total_items
  FROM onboarding_checklist
  WHERE client_id = NEW.client_id AND category = v_category;
  
  -- Count completed items
  SELECT COUNT(*) INTO v_completed_items
  FROM onboarding_checklist
  WHERE client_id = NEW.client_id AND category = v_category AND status = 'yes';
  
  -- Only proceed if all items in category are complete
  IF v_completed_items < v_total_items THEN
    RETURN NEW;
  END IF;
  
  -- Get client details
  SELECT * INTO v_client FROM clients WHERE id = NEW.client_id;
  
  IF v_client IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if message already sent for this stage
  v_stages_sent := COALESCE(v_client.stage_messages_sent, '{}'::jsonb);
  IF v_stages_sent ? v_category THEN
    RETURN NEW;
  END IF;
  
  -- Get or create conversation
  SELECT id INTO v_conversation_id
  FROM chat_conversations
  WHERE client_id = NEW.client_id;
  
  IF v_conversation_id IS NULL THEN
    INSERT INTO chat_conversations (client_id)
    VALUES (NEW.client_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  -- Build personalized message
  v_first_name := split_part(COALESCE(v_client.name, 'there'), ' ', 1);
  v_manager_name := COALESCE(v_client.success_manager_name, 'Your Success Manager');
  
  CASE v_category
    WHEN 'hub_setup' THEN
      v_message := 'Hey ' || v_first_name || '! 🎉 Just wanted to let you know we have completed all the steps to have your Hub setup and functioning correctly. We will be moving on to the next step!';
    WHEN 'google_ads' THEN
      v_message := 'Hey ' || v_first_name || '! 📈 Great news! Your Google Ads campaign has been set up and configured. We''re ready to start driving leads your way once everything else is in place!';
    WHEN 'crm_account' THEN
      v_message := 'Hey ' || v_first_name || '! 💼 Your CRM account is now fully set up! You''ll be able to manage all your leads and client communications from here. On to the next step!';
    WHEN 'funnel_testing' THEN
      v_message := 'Hey ' || v_first_name || '! ✅ We''ve finished testing your funnels and everything is working perfectly. Your lead capture system is ready to go!';
    WHEN 'compliance' THEN
      v_message := 'Hey ' || v_first_name || '! 📋 All compliance items have been checked off. You''re all clear on the regulatory side!';
    WHEN 'billing_docs' THEN
      v_message := 'Hey ' || v_first_name || '! 💳 Your billing and documentation is all set up. Almost there!';
    WHEN 'final_onboarding' THEN
      v_message := 'Hey ' || v_first_name || '! 🚀 Congratulations! All onboarding steps are complete. Your ads are about to go live and you''re ready to start receiving leads! Let''s crush it!';
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Insert the message
  INSERT INTO chat_messages (
    conversation_id,
    sender_id,
    sender_name,
    sender_role,
    sender_avatar_url,
    message
  ) VALUES (
    v_conversation_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_manager_name,
    'admin',
    v_client.success_manager_image_url,
    v_message
  );
  
  -- Mark stage message as sent
  UPDATE clients 
  SET stage_messages_sent = COALESCE(stage_messages_sent, '{}'::jsonb) || jsonb_build_object(v_category, now())
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for stage completion
DROP TRIGGER IF EXISTS trigger_check_stage_completion ON onboarding_checklist;
CREATE TRIGGER trigger_check_stage_completion
  AFTER UPDATE ON onboarding_checklist
  FOR EACH ROW
  EXECUTE FUNCTION check_stage_completion_and_notify();