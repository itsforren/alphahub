-- Rename funnel_link to lander_link
ALTER TABLE public.clients RENAME COLUMN funnel_link TO lander_link;

-- Rename calendar_link to scheduler_link
ALTER TABLE public.clients RENAME COLUMN calendar_link TO scheduler_link;

-- Add thankyou_link column
ALTER TABLE public.clients ADD COLUMN thankyou_link text;

-- Add subaccount_id column (used to auto-generate crm_link)
ALTER TABLE public.clients ADD COLUMN subaccount_id text;

-- Remove intercom_link column
ALTER TABLE public.clients DROP COLUMN IF EXISTS intercom_link;