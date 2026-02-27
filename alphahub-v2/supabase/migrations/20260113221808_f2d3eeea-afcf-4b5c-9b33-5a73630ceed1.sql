-- Mark duplicate pending proposals as denied (keeping only the most recent per campaign)
-- These were duplicates created before throttling was implemented
WITH ranked_proposals AS (
  SELECT 
    id,
    campaign_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY created_at DESC) as rn
  FROM proposals
  WHERE status = 'pending'
)
UPDATE proposals
SET 
  status = 'denied', 
  approved_at = NOW(),
  decision_outcome = 'DENY_NO_CHANGE',
  user_decline_reason = 'Duplicate proposal - superseded by newer proposal',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM ranked_proposals WHERE rn > 1
);