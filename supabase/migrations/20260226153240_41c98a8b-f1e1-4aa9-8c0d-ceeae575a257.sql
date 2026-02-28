-- Fix Terry McDonald's agent_id to lowercase and update all related URLs
UPDATE clients 
SET 
  agent_id = LOWER(agent_id),
  url_slug = LOWER(url_slug),
  lander_link = REPLACE(lander_link, agent_id, LOWER(agent_id)),
  scheduler_link = REPLACE(scheduler_link, agent_id, LOWER(agent_id)),
  tfwp_profile_link = REPLACE(tfwp_profile_link, agent_id, LOWER(agent_id)),
  thankyou_link = REPLACE(thankyou_link, agent_id, LOWER(agent_id)),
  updated_at = now()
WHERE id = '2db8ab98-4cfc-43a9-842e-1bc83f4dfbea';

-- Also fix any leads that reference the old mixed-case agent_id
UPDATE leads 
SET agent_id = LOWER(agent_id)
WHERE agent_id = 'aTtbrFAp6nc2RFZoXgkz';
