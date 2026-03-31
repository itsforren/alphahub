CREATE TABLE IF NOT EXISTS team_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notify_sms BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_notif_agent_id ON team_notification_preferences(agent_id);
