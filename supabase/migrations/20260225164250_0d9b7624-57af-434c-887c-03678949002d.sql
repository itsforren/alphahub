
-- Clients can insert their own wallet
CREATE POLICY "Clients can insert own wallet"
  ON public.client_wallets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id::text = client_wallets.client_id
      AND c.user_id = auth.uid()
    )
  );

-- Clients can update their own wallet
CREATE POLICY "Clients can update own wallet"
  ON public.client_wallets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id::text = client_wallets.client_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id::text = client_wallets.client_id
      AND c.user_id = auth.uid()
    )
  );

-- Clients can view own wallet transactions
CREATE POLICY "Clients can view own transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id::text = wallet_transactions.client_id
      AND c.user_id = auth.uid()
    )
  );
