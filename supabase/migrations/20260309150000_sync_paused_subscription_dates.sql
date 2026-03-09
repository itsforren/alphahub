-- Christina Nwaisser — subscription paused until 2026-03-23
-- Update pending billing record due date from 3/12 to 3/23
UPDATE billing_records
SET due_date = '2026-03-23',
    notes = 'Management fee - $748.5/bi-weekly [Subscription paused, resumes 03/23]'
WHERE id = 'a60a9604-1ab9-4b71-943c-ed22d3b01f64'
  AND status = 'pending';

-- Preston Whitlock — subscription paused until 2026-03-17
-- Update pending billing record due date from 3/13 to 3/17
UPDATE billing_records
SET due_date = '2026-03-17',
    notes = 'Management fee - $748.5/bi-weekly [Subscription paused, resumes 03/17]'
WHERE id = 'c00ea01d-6d56-47e7-b490-1013beaca3a7'
  AND status = 'pending';

-- Joseph Gagliardino — subscription paused until 2026-03-17
-- Update pending billing record due date from 3/13 to 3/17
UPDATE billing_records
SET due_date = '2026-03-17',
    notes = 'Management fee - $748.5/bi-weekly [Subscription paused, resumes 03/17]'
WHERE id = 'd6f8d095-93b0-4684-9a97-6f56b9d92382'
  AND status = 'pending';

-- Fix management_fee for Preston Whitlock (currently NULL, should be 1497 for $748.50 bi-weekly)
UPDATE clients
SET management_fee = 1497
WHERE id = '183fcbc9-496b-40e1-9b71-fadb83642ecb'
  AND (management_fee IS NULL OR management_fee = 0);

-- Fix management_fee for Joseph Gagliardino (currently NULL, should be 1497 for $748.50 bi-weekly)
UPDATE clients
SET management_fee = 1497
WHERE id = 'a69850d6-e04d-4838-b3f6-0024e44caa5c'
  AND (management_fee IS NULL OR management_fee = 0);

-- Fix management_fee for Christina Nwaisser (was set by earlier migration but double-check)
UPDATE clients
SET management_fee = 1497
WHERE id = 'd30b7b98-d514-4533-bdbc-467d7c3a7120'
  AND (management_fee IS NULL OR management_fee = 0);
