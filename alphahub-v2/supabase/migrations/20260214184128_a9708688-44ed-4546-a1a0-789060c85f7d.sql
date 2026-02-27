
-- 1. Audit log table for all mcp-proxy write operations
CREATE TABLE public.mcp_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role (which bypasses RLS) can access

-- 2. Read-only role for ad-hoc queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_agent') THEN
    CREATE ROLE readonly_agent NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO readonly_agent;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_agent;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_agent;

-- 3. Secure query execution function
CREATE OR REPLACE FUNCTION public.run_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  clean_query TEXT;
BEGIN
  clean_query := TRIM(query_text);

  -- Validate SELECT only
  IF NOT (clean_query ~* '^SELECT') THEN
    RAISE EXCEPTION 'Only SELECT queries allowed';
  END IF;

  -- Reject semicolons to prevent statement chaining
  IF clean_query LIKE '%;%' THEN
    RAISE EXCEPTION 'Semicolons not allowed in queries';
  END IF;

  -- Execute with restricted role
  SET LOCAL ROLE readonly_agent;
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || clean_query || ') t'
    INTO result;
  RESET ROLE;

  RETURN result;
END;
$$;

-- 4. Add verification columns to onboarding_checklist
ALTER TABLE public.onboarding_checklist
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;
