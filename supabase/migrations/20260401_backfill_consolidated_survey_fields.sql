-- Backfill survey qualification fields for existing CONSOLIDATED_ROUTER leads
-- that were stored only in lead_data.survey instead of top-level columns.
--
-- Field mapping (form → DB column):
--   age          → age
--   employment   → employment
--   interests[]  → interest  (joined to CSV)
--   contribution → savings
--   investments[]→ investments (joined to CSV)

UPDATE leads
SET
  age = CASE
    WHEN age IS NOT NULL THEN age
    ELSE lead_data->'survey'->>'age'
  END,

  employment = CASE
    WHEN employment IS NOT NULL THEN employment
    ELSE lead_data->'survey'->>'employment'
  END,

  -- interests is an array in lead_data — join to CSV
  interest = CASE
    WHEN interest IS NOT NULL THEN interest
    WHEN jsonb_typeof(lead_data->'survey'->'interests') = 'array' THEN (
      SELECT string_agg(elem, ', ')
      FROM jsonb_array_elements_text(lead_data->'survey'->'interests') AS elem
    )
    ELSE lead_data->'survey'->>'interests'
  END,

  -- contribution in form → savings column
  savings = CASE
    WHEN savings IS NOT NULL THEN savings
    ELSE lead_data->'survey'->>'contribution'
  END,

  -- investments is an array in lead_data — join to CSV
  investments = CASE
    WHEN investments IS NOT NULL THEN investments
    WHEN jsonb_typeof(lead_data->'survey'->'investments') = 'array' THEN (
      SELECT string_agg(elem, ', ')
      FROM jsonb_array_elements_text(lead_data->'survey'->'investments') AS elem
    )
    ELSE lead_data->'survey'->>'investments'
  END

WHERE lead_source = 'CONSOLIDATED_ROUTER'
  AND lead_data->'survey' IS NOT NULL
  AND (age IS NULL OR employment IS NULL OR interest IS NULL OR savings IS NULL OR investments IS NULL);
