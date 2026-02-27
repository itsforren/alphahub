-- Phase 2: Add indexes for frequently queried columns
-- These improve filter/sort performance without affecting existing functionality

-- Leads table indexes (most queried table)
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_date ON leads(lead_date);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Ad spend daily (for wallet/metrics calculations)
CREATE INDEX IF NOT EXISTS idx_ad_spend_daily_client_spend ON ad_spend_daily(client_id, spend_date);

-- Support tickets (for ticket dashboard)
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client_id ON support_tickets(client_id);

-- Visitor sessions (for attribution)
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created_at ON visitor_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor_id ON visitor_sessions(visitor_id);

-- Visitor events (for attribution)
CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON visitor_events(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_events_visitor_id ON visitor_events(visitor_id);

-- Prospects (for attribution)
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);

-- Prospect attribution
CREATE INDEX IF NOT EXISTS idx_prospect_attribution_created_at ON prospect_attribution(created_at);
CREATE INDEX IF NOT EXISTS idx_prospect_attribution_prospect_id ON prospect_attribution(prospect_id);