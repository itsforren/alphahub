-- Enable realtime on billing_records and wallet_transactions
-- so the frontend gets instant updates when Stripe webhooks fire
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
