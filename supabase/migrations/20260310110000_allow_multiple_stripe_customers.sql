-- Fix: Allow multiple Stripe customers per client per account
-- Payment links and manual checkouts can create duplicate Stripe customers
-- with the same email. The sync needs to track ALL of them.

-- Drop the restrictive constraint (one customer per account)
ALTER TABLE client_stripe_customers
  DROP CONSTRAINT IF EXISTS client_stripe_customers_client_id_stripe_account_key;

-- Add a proper constraint: one LINK per stripe_customer_id (no duplicate links)
ALTER TABLE client_stripe_customers
  ADD CONSTRAINT client_stripe_customers_unique_customer
  UNIQUE (stripe_customer_id);
