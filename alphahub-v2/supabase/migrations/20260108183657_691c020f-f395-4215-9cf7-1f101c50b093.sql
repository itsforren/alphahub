-- Add billing configuration columns to prospects table
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS ad_spend_budget numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_frequency text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS ad_spend_invoice_pending boolean DEFAULT false;

-- Add index for payment status queries
CREATE INDEX IF NOT EXISTS idx_prospects_payment_status ON prospects(payment_status) WHERE payment_status IS NOT NULL;