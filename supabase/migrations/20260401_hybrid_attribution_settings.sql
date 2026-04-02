-- Hybrid 40/60 attribution model settings
-- Base portion (40%) split by budget to ALL pool agents
-- Lead portion (60%) split by lead count to lead recipients only

INSERT INTO onboarding_settings (setting_key, setting_value, description)
VALUES (
  'consolidated_base_pct',
  '40',
  'Percentage of daily consolidated spend distributed by budget to ALL pool agents (base contribution). Remainder goes to lead recipients by lead count.'
)
ON CONFLICT (setting_key) DO NOTHING;
