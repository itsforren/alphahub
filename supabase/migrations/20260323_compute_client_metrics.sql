DROP FUNCTION IF EXISTS public.compute_client_metrics(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.compute_client_metrics(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.compute_client_metrics(
  p_client_id UUID,
  p_period TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agent_id TEXT;
  v_tracking_start DATE;
  v_perf_pct NUMERIC;
  v_date_from TIMESTAMPTZ;
  v_date_to TIMESTAMPTZ;
  v_total_leads BIGINT;
  v_booked_calls BIGINT;
  v_submitted_apps BIGINT;
  v_issued_paid BIGINT;
  v_raw_spend NUMERIC;
  v_displayed_spend NUMERIC;
  v_total_deposits NUMERIC;
  v_submitted_premium NUMERIC;
  v_issued_premium NUMERIC;
  v_cpl NUMERIC;
  v_cpbc NUMERIC;
  v_booking_pct NUMERIC;
  v_ltsa_cost NUMERIC;
  v_ltsa_pct NUMERIC;
  v_alpha_roi NUMERIC;
  v_remaining_balance NUMERIC;
  v_alltime_raw_spend NUMERIC;
BEGIN
  -- Get client's agent_id (clients.id is UUID)
  SELECT agent_id INTO v_agent_id
  FROM clients
  WHERE id = p_client_id;

  IF v_agent_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Client not found');
  END IF;

  -- Get tracking_start_date (client_wallets.client_id is UUID)
  SELECT tracking_start_date INTO v_tracking_start
  FROM client_wallets
  WHERE client_id = p_client_id;

  -- Get performance_percentage from settings
  SELECT COALESCE(setting_value::NUMERIC, 0) INTO v_perf_pct
  FROM onboarding_settings
  WHERE setting_key = 'performance_percentage';

  IF v_perf_pct IS NULL THEN
    v_perf_pct := 0;
  END IF;

  -- Calculate date range
  v_date_to := (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second');

  CASE p_period
    WHEN '7d' THEN
      v_date_from := (CURRENT_DATE - INTERVAL '7 days')::TIMESTAMPTZ;
    WHEN '30d' THEN
      v_date_from := (CURRENT_DATE - INTERVAL '30 days')::TIMESTAMPTZ;
    WHEN '90d' THEN
      v_date_from := (CURRENT_DATE - INTERVAL '90 days')::TIMESTAMPTZ;
    WHEN 'this_month' THEN
      v_date_from := DATE_TRUNC('month', CURRENT_DATE)::TIMESTAMPTZ;
    WHEN 'last_month' THEN
      v_date_from := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::TIMESTAMPTZ;
      v_date_to := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 second');
    ELSE
      v_date_from := COALESCE(v_tracking_start, CURRENT_DATE - INTERVAL '365 days')::TIMESTAMPTZ;
  END CASE;

  -- Count leads (leads.agent_id is TEXT)
  SELECT COUNT(*) INTO v_total_leads
  FROM leads
  WHERE agent_id = v_agent_id
    AND lead_date >= v_date_from
    AND lead_date <= v_date_to;

  -- Count booked calls
  SELECT COUNT(*) INTO v_booked_calls
  FROM leads
  WHERE agent_id = v_agent_id
    AND lead_date >= v_date_from
    AND lead_date <= v_date_to
    AND booked_call_at IS NOT NULL;

  -- Count submitted apps
  SELECT COUNT(*) INTO v_submitted_apps
  FROM leads
  WHERE agent_id = v_agent_id
    AND lead_date >= v_date_from
    AND lead_date <= v_date_to
    AND (
      submitted_at IS NOT NULL
      OR approved_at IS NOT NULL
      OR issued_at IS NOT NULL
      OR LOWER(status) IN ('submitted', 'approved', 'issued paid')
    );

  -- Count issued & paid
  SELECT COUNT(*) INTO v_issued_paid
  FROM leads
  WHERE agent_id = v_agent_id
    AND lead_date >= v_date_from
    AND lead_date <= v_date_to
    AND (
      issued_at IS NOT NULL
      OR LOWER(status) = 'issued paid'
    );

  -- Sum raw ad spend (ad_spend_daily.client_id is UUID)
  SELECT COALESCE(SUM(cost), 0) INTO v_raw_spend
  FROM ad_spend_daily
  WHERE client_id = p_client_id
    AND spend_date >= v_date_from::DATE
    AND spend_date <= v_date_to::DATE;

  -- Apply performance percentage markup
  v_displayed_spend := ROUND(v_raw_spend * (1 + v_perf_pct / 100), 2);

  -- Total deposits (wallet_transactions.client_id is TEXT — cast needed)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
  FROM wallet_transactions
  WHERE client_id = p_client_id::TEXT
    AND transaction_type = 'deposit';

  -- All-time spend for wallet balance (always uses tracking_start_date)
  SELECT COALESCE(SUM(cost), 0) INTO v_alltime_raw_spend
  FROM ad_spend_daily
  WHERE client_id = p_client_id
    AND spend_date >= COALESCE(v_tracking_start, '2020-01-01'::DATE);

  v_remaining_balance := ROUND(v_total_deposits - (v_alltime_raw_spend * (1 + v_perf_pct / 100)), 2);

  -- Sum submitted premium
  SELECT COALESCE(SUM(
    COALESCE(submitted_premium, target_premium, 0)
  ), 0) INTO v_submitted_premium
  FROM leads
  WHERE agent_id = v_agent_id
    AND lead_date >= v_date_from
    AND lead_date <= v_date_to
    AND (
      submitted_at IS NOT NULL
      OR approved_at IS NOT NULL
      OR issued_at IS NOT NULL
      OR LOWER(status) IN ('submitted', 'approved', 'issued paid')
    );

  -- Sum issued premium
  SELECT COALESCE(SUM(
    COALESCE(issued_premium, target_premium, 0)
  ), 0) INTO v_issued_premium
  FROM leads
  WHERE agent_id = v_agent_id
    AND lead_date >= v_date_from
    AND lead_date <= v_date_to
    AND (
      issued_at IS NOT NULL
      OR LOWER(status) = 'issued paid'
    );

  -- Derived metrics
  IF v_total_leads > 0 THEN
    v_cpl := ROUND(v_displayed_spend / v_total_leads, 2);
    v_booking_pct := ROUND((v_booked_calls::NUMERIC / v_total_leads) * 100, 1);
    v_ltsa_pct := ROUND((v_submitted_apps::NUMERIC / v_total_leads) * 100, 1);
  ELSE
    v_cpl := 0; v_booking_pct := 0; v_ltsa_pct := 0;
  END IF;

  v_cpbc := CASE WHEN v_booked_calls > 0 THEN ROUND(v_displayed_spend / v_booked_calls, 2) ELSE 0 END;
  v_ltsa_cost := CASE WHEN v_submitted_apps > 0 THEN ROUND(v_displayed_spend / v_submitted_apps, 2) ELSE 0 END;
  v_alpha_roi := CASE WHEN v_displayed_spend > 0 THEN ROUND(((v_issued_premium - v_displayed_spend) / v_displayed_spend) * 100, 1) ELSE 0 END;

  RETURN jsonb_build_object(
    'client_id', p_client_id,
    'agent_id', v_agent_id,
    'period', p_period,
    'date_from', v_date_from::DATE,
    'date_to', v_date_to::DATE,
    'tracking_start_date', v_tracking_start,
    'performance_percentage', v_perf_pct,
    'total_leads', v_total_leads,
    'booked_calls', v_booked_calls,
    'submitted_apps', v_submitted_apps,
    'issued_paid', v_issued_paid,
    'raw_ad_spend', v_raw_spend,
    'displayed_ad_spend', v_displayed_spend,
    'cpl', v_cpl,
    'cpbc', v_cpbc,
    'booking_pct', v_booking_pct,
    'ltsa_cost', v_ltsa_cost,
    'ltsa_pct', v_ltsa_pct,
    'submitted_premium', v_submitted_premium,
    'issued_premium', v_issued_premium,
    'alpha_roi', v_alpha_roi,
    'total_deposits', v_total_deposits,
    'remaining_balance', v_remaining_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_client_metrics(UUID, TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.compute_client_metrics IS
  'Returns dashboard-matching metrics for a client. Periods: 7d, 30d, 90d, this_month, last_month, all';
