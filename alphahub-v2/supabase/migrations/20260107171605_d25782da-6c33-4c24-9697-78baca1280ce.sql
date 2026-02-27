
-- ============================================
-- BULLETPROOF REFERRAL LINKING SYSTEM
-- ============================================
-- Problem: Referral code is in visitor_sessions but NOT in prospects
-- Solution: Enhanced trigger that ALSO checks visitor_sessions as fallback

-- Drop existing function to recreate with enhanced logic
DROP FUNCTION IF EXISTS public.link_prospect_to_referrer() CASCADE;

-- Enhanced function that checks:
-- 1. Direct referral_code on prospect
-- 2. referral_code from prospect_attribution
-- 3. FALLBACK: referral_code from visitor_sessions (bulletproof)
CREATE OR REPLACE FUNCTION public.link_prospect_to_referrer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prospect_id uuid;
  v_code text;
  v_visitor_id text;
  v_referrer_client_id uuid;
  v_referral_code_id uuid;
  v_email text;
  v_name text;
BEGIN
  -- Determine the prospect and initial code based on which table triggered
  IF TG_TABLE_NAME = 'prospects' THEN
    v_prospect_id := NEW.id;
    v_code := NULLIF(BTRIM(NEW.referral_code), '');
    v_visitor_id := NEW.visitor_id;
  ELSIF TG_TABLE_NAME = 'prospect_attribution' THEN
    v_prospect_id := NEW.prospect_id;
    v_code := NULLIF(BTRIM(NEW.referral_code), '');
    -- Get visitor_id from the prospect
    SELECT p.visitor_id INTO v_visitor_id 
    FROM public.prospects p 
    WHERE p.id = v_prospect_id;
  ELSE
    RETURN NEW;
  END IF;

  -- If no prospect_id, exit
  IF v_prospect_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- BULLETPROOF: If no referral code, try to get from visitor_sessions
  IF v_code IS NULL AND v_visitor_id IS NOT NULL THEN
    SELECT NULLIF(BTRIM(vs.referral_code), '')
    INTO v_code
    FROM public.visitor_sessions vs
    WHERE vs.visitor_id = v_visitor_id
      AND vs.referral_code IS NOT NULL
      AND BTRIM(vs.referral_code) != ''
    ORDER BY vs.created_at DESC
    LIMIT 1;
  END IF;

  -- If still no code, nothing to do
  IF v_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the referral code owner (case-insensitive match)
  SELECT rc.client_id, rc.id
  INTO v_referrer_client_id, v_referral_code_id
  FROM public.referral_codes rc
  WHERE LOWER(rc.code) = LOWER(v_code)
    AND rc.is_active = true
  LIMIT 1;

  -- If no matching referral code found, exit
  IF v_referrer_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update prospect with referrer info (only if not already set)
  UPDATE public.prospects p
  SET
    referrer_client_id = COALESCE(p.referrer_client_id, v_referrer_client_id),
    referral_code = COALESCE(NULLIF(BTRIM(p.referral_code), ''), v_code),
    lead_source = COALESCE(p.lead_source, 'referral')
  WHERE p.id = v_prospect_id
    AND (p.referrer_client_id IS NULL OR p.referral_code IS NULL OR p.lead_source IS NULL);

  -- Get prospect email/name for referral record
  SELECT p.email, p.name
  INTO v_email, v_name
  FROM public.prospects p
  WHERE p.id = v_prospect_id;

  -- Create referral record (idempotent - ON CONFLICT handles duplicates)
  INSERT INTO public.referrals (
    referrer_client_id,
    referral_code_id,
    referred_email,
    referred_name,
    status,
    referred_at
  )
  VALUES (
    v_referrer_client_id,
    v_referral_code_id,
    v_email,
    COALESCE(v_name, ''),
    'pending',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on prospects table (fires on INSERT and UPDATE of relevant columns)
CREATE TRIGGER trg_link_prospect_referrer_on_prospects
  AFTER INSERT OR UPDATE OF referral_code, visitor_id
  ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.link_prospect_to_referrer();

-- Create trigger on prospect_attribution table (fires on INSERT and UPDATE of referral_code)
CREATE TRIGGER trg_link_prospect_referrer_on_attribution
  AFTER INSERT OR UPDATE OF referral_code
  ON public.prospect_attribution
  FOR EACH ROW
  EXECUTE FUNCTION public.link_prospect_to_referrer();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_referral_lookup 
  ON public.visitor_sessions (visitor_id, created_at DESC) 
  WHERE referral_code IS NOT NULL AND referral_code != '';

CREATE INDEX IF NOT EXISTS idx_referral_codes_code_lower 
  ON public.referral_codes (LOWER(code)) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_prospects_visitor_id 
  ON public.prospects (visitor_id) 
  WHERE visitor_id IS NOT NULL;

-- ============================================
-- BACKFILL: Fix recent prospects that have visitor_sessions referral but missing referral data
-- ============================================
WITH prospects_to_fix AS (
  SELECT DISTINCT p.id AS prospect_id, vs.referral_code AS code, p.email, p.name
  FROM public.prospects p
  INNER JOIN public.visitor_sessions vs 
    ON vs.visitor_id = p.visitor_id
  WHERE p.referrer_client_id IS NULL
    AND p.referral_code IS NULL
    AND vs.referral_code IS NOT NULL
    AND BTRIM(vs.referral_code) != ''
    AND p.created_at > NOW() - INTERVAL '30 days'
),
matched_codes AS (
  SELECT 
    ptf.prospect_id,
    ptf.code,
    ptf.email,
    ptf.name,
    rc.client_id AS referrer_client_id,
    rc.id AS referral_code_id
  FROM prospects_to_fix ptf
  INNER JOIN public.referral_codes rc 
    ON LOWER(rc.code) = LOWER(ptf.code)
    AND rc.is_active = true
)
-- First update prospects
UPDATE public.prospects p
SET 
  referrer_client_id = mc.referrer_client_id,
  referral_code = mc.code,
  lead_source = COALESCE(p.lead_source, 'referral')
FROM matched_codes mc
WHERE p.id = mc.prospect_id;

-- Now insert referral records for backfilled prospects
INSERT INTO public.referrals (
  referrer_client_id,
  referral_code_id,
  referred_email,
  referred_name,
  status,
  referred_at
)
SELECT 
  mc.referrer_client_id,
  mc.referral_code_id,
  mc.email,
  COALESCE(mc.name, ''),
  'pending',
  NOW()
FROM (
  SELECT DISTINCT 
    ptf.prospect_id,
    ptf.code,
    ptf.email,
    ptf.name,
    rc.client_id AS referrer_client_id,
    rc.id AS referral_code_id
  FROM (
    SELECT DISTINCT p.id AS prospect_id, vs.referral_code AS code, p.email, p.name
    FROM public.prospects p
    INNER JOIN public.visitor_sessions vs 
      ON vs.visitor_id = p.visitor_id
    WHERE vs.referral_code IS NOT NULL
      AND BTRIM(vs.referral_code) != ''
      AND p.created_at > NOW() - INTERVAL '30 days'
  ) ptf
  INNER JOIN public.referral_codes rc 
    ON LOWER(rc.code) = LOWER(ptf.code)
    AND rc.is_active = true
) mc
ON CONFLICT DO NOTHING;
