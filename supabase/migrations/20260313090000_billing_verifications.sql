-- Billing verifications: human sign-off + AI analysis results
CREATE TABLE IF NOT EXISTS billing_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('human', 'ai')),
  -- Human verification
  verified_by UUID REFERENCES auth.users(id),
  verified_by_name TEXT,
  -- AI analysis
  ai_summary TEXT,
  ai_issues JSONB DEFAULT '[]',
  ai_status TEXT CHECK (ai_status IN ('clean', 'warning', 'problem')),
  -- Shared
  notes TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_verif_client ON billing_verifications (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_verif_type ON billing_verifications (verification_type, created_at DESC);

ALTER TABLE billing_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'billing_verifications' AND policyname = 'Admin access'
  ) THEN
    CREATE POLICY "Admin access" ON billing_verifications FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;
