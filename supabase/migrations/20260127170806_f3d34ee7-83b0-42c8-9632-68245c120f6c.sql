-- Re-add the foreign key that was accidentally dropped
ALTER TABLE public.referral_codes 
  ADD CONSTRAINT referral_codes_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;