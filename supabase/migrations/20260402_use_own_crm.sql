-- Add support for agents who use their own CRM
-- use_own_crm: when true, onboarding skips all GHL/CRM steps
-- external_webhook_url: where to POST leads instead of GHL

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS use_own_crm boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_webhook_url text;
