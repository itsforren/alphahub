-- Pool campaign helpers
-- Supports the consolidated-spend attribution pipeline and the router's
-- lead-counting + wallet-balance reads. Adds:
--
--   is_pool_lead(lead_source, lead_data, campaign_ids)
--     — treats every CONSOLIDATED_ROUTER lead as a pool lead (the survey funnel
--       only serves pool-campaign traffic, and older rows don't populate
--       lead_data.campaignid so we can't rely on that field alone). Treats
--       DEMAND_GEN leads as pool only when their lead_data.campaign_id
--       matches one of the configured pool campaign IDs.
--
--   get_pool_lead_counts(p_start, p_end, p_campaign_ids, p_agent_ids)
--     — returns (agent_id, lead_count) for pool leads in a time window,
--       excluding test leads, so attribution and router both count the
--       same way.
--
--   compute_wallet_balances(p_client_ids)
--     — batch wrapper around compute_wallet_balance() so the router can
--       resolve ~20 agent wallets in a single DB round-trip instead of
--       reimplementing the math inline.
--
-- All three are read-only SQL functions. Safe to ship independently of the
-- edge-function refactor; nothing calls them yet until lead-router and
-- attribute-consolidated-spend are updated.

CREATE OR REPLACE FUNCTION public.is_pool_lead(
  p_lead_source     text,
  p_lead_data       jsonb,
  p_campaign_ids    text[]
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    -- Survey funnel leads always belong to the pool. The survey only serves
    -- pool campaigns and older rows don't populate lead_data.campaignid.
    (p_lead_source = 'CONSOLIDATED_ROUTER')
    OR
    -- Google Ads Lead Form Extension leads are pool when their saved
    -- campaign_id matches one of the configured pool campaigns.
    (
      p_lead_source = 'DEMAND_GEN'
      AND p_lead_data IS NOT NULL
      AND (
        p_lead_data->>'campaign_id' = ANY(p_campaign_ids)
        OR p_lead_data->>'campaignid' = ANY(p_campaign_ids)
      )
    );
$$;

COMMENT ON FUNCTION public.is_pool_lead(text, jsonb, text[]) IS
  'Returns true if a lead belongs to the consolidated pool. CONSOLIDATED_ROUTER → always pool. DEMAND_GEN → pool only when lead_data.campaign_id is in p_campaign_ids. All other sources → not pool.';


CREATE OR REPLACE FUNCTION public.get_pool_lead_counts(
  p_start         timestamptz,
  p_end           timestamptz,
  p_campaign_ids  text[],
  p_agent_ids     text[] DEFAULT NULL
)
RETURNS TABLE(agent_id text, lead_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.agent_id,
    COUNT(*)::bigint AS lead_count
  FROM public.leads l
  WHERE l.created_at >= p_start
    AND l.created_at <  p_end
    AND l.agent_id IS NOT NULL
    AND (p_agent_ids IS NULL OR l.agent_id = ANY(p_agent_ids))
    -- Exclude test leads (same convention as attribute-consolidated-spend)
    AND lower(coalesce(l.first_name, '') || ' ' || coalesce(l.last_name, ''))
        NOT LIKE '%test%'
    AND public.is_pool_lead(l.lead_source, l.lead_data, p_campaign_ids)
  GROUP BY l.agent_id;
$$;

COMMENT ON FUNCTION public.get_pool_lead_counts(timestamptz, timestamptz, text[], text[]) IS
  'Returns (agent_id, lead_count) for pool leads within a time window. Pool membership is determined by is_pool_lead(). Excludes test leads and rows with null agent_id. Use this as the single source of truth for lead-weighted attribution and router pacing.';


CREATE OR REPLACE FUNCTION public.compute_wallet_balances(
  p_client_ids uuid[]
)
RETURNS TABLE(client_id uuid, remaining_balance numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    x.cid AS client_id,
    ( (public.compute_wallet_balance(x.cid::text))->>'remaining_balance' )::numeric
      AS remaining_balance
  FROM unnest(p_client_ids) AS x(cid);
$$;

COMMENT ON FUNCTION public.compute_wallet_balances(uuid[]) IS
  'Batch wrapper around compute_wallet_balance(). Returns (client_id, remaining_balance) for each input id in a single round-trip. The router calls this instead of reimplementing wallet math inline.';


-- Grant execute to the service role (edge functions call with the service key).
-- authenticated is also granted for parity with other public RPCs.
GRANT EXECUTE ON FUNCTION public.is_pool_lead(text, jsonb, text[])                                TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pool_lead_counts(timestamptz, timestamptz, text[], text[])   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_wallet_balances(uuid[])                                  TO authenticated, service_role;
