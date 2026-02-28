-- Create client record for Lou Joseph (referral partner)
INSERT INTO public.clients (name, email, status, onboarding_status)
VALUES ('Lou Joseph', 'lou@fflnortheast.com', 'onboarding', 'pending')
ON CONFLICT (email) DO NOTHING;

-- Generate referral code for Lou Joseph
SELECT public.get_or_create_referral_code(
  (SELECT id FROM public.clients WHERE email = 'lou@fflnortheast.com')
);