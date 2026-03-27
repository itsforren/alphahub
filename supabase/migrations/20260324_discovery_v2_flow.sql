-- =============================================================================
-- Discovery Calls v2: Revised flow with intro scheduling + strategy booking
-- =============================================================================

-- 1. Drop old check constraint and add expanded one
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_discovery_stage_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_discovery_stage_check
  CHECK (discovery_stage IN (
    'new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4',
    'intro_scheduled',    -- answered but bad timing, discovery call scheduled for later
    'discovery_complete', -- discovery done, qualified, needs strategy booking
    'strategy_booked',    -- strategy/zoom call confirmed
    'booked',             -- legacy compat
    'completed',
    'long_term_nurture',
    'lost'
  ));

-- 2. Add strategy booking fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS strategy_booked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS strategy_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS intro_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intro_calendar_event_id TEXT;

-- 3. Update discovery_calls outcome constraint for new outcomes
ALTER TABLE public.discovery_calls DROP CONSTRAINT IF EXISTS discovery_calls_outcome_check;
ALTER TABLE public.discovery_calls
  ADD CONSTRAINT discovery_calls_outcome_check
  CHECK (outcome IN (
    'scheduled',           -- legacy
    'strategy_booked',     -- zoom/strategy call confirmed with a time
    'cant_book_now',       -- qualified but couldn't book strategy call
    'not_a_fit',
    'voicemail',
    'no_answer',
    'call_back',
    'long_term_nurture',
    'bad_number',
    'intro_scheduled',     -- couldn't talk now, scheduled discovery for later
    'bad_timing'           -- answered but bad timing (no scheduling done)
  ));

-- 4. Add calendar type field to discovery_calls for tracking which calendar was booked
ALTER TABLE public.discovery_calls
  ADD COLUMN IF NOT EXISTS booked_calendar_type TEXT,  -- 'discovery' or 'strategy'
  ADD COLUMN IF NOT EXISTS booked_calendar_id TEXT;
