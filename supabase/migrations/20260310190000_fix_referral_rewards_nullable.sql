-- Allow referral_id to be NULL in referral_rewards
-- Admin-assigned referrers may not have a formal referral record
ALTER TABLE public.referral_rewards ALTER COLUMN referral_id DROP NOT NULL;
