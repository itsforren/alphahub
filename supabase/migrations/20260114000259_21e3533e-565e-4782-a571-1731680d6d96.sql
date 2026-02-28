-- Add MANUAL_OVERRIDE to decision_events.decision_outcome CHECK constraint
ALTER TABLE decision_events 
DROP CONSTRAINT IF EXISTS decision_events_decision_outcome_check;

ALTER TABLE decision_events 
ADD CONSTRAINT decision_events_decision_outcome_check 
CHECK (decision_outcome = ANY (ARRAY[
  'APPROVE_AS_IS'::text,
  'APPROVE_WITH_EDIT'::text,
  'DENY_NO_CHANGE'::text,
  'DENY_SET_SAFE_MODE'::text,
  'ESCALATE_INVESTIGATION'::text,
  'MANUAL_OVERRIDE'::text
]));