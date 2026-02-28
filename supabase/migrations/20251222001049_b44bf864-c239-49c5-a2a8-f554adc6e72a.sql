-- Link a logged-in user to their client record based on email
-- Safe relinking is allowed only when the existing linked user has the same email.
create or replace function public.link_client_to_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_client_id uuid;
  v_existing_user uuid;
  v_existing_email text;
begin
  v_email := lower((current_setting('request.jwt.claims', true)::json ->> 'email'));
  if v_email is null or v_email = '' then
    return null;
  end if;

  select c.id, c.user_id
    into v_client_id, v_existing_user
  from public.clients c
  where lower(c.email) = v_email
  limit 1;

  if v_client_id is null then
    return null;
  end if;

  if v_existing_user is not null and v_existing_user <> auth.uid() then
    select lower(p.email)
      into v_existing_email
    from public.profiles p
    where p.id = v_existing_user
    limit 1;

    -- If we can confirm the existing linked account has a different email, block re-linking.
    if v_existing_email is not null and v_existing_email <> v_email then
      raise exception 'Client already linked to another user';
    end if;
  end if;

  update public.clients
  set user_id = auth.uid(),
      updated_at = now()
  where id = v_client_id;

  -- Ensure client role exists (never grants admin)
  insert into public.user_roles (user_id, role)
  select auth.uid(), 'client'::app_role
  where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'client'::app_role
  );

  return v_client_id;
end;
$$;

-- Allow clients to view their own billing records
create policy "Clients can view their own billing records"
on public.billing_records
for select
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id::text = billing_records.client_id
      and c.user_id = auth.uid()
  )
);

-- Allow clients to view their own wallet
create policy "Clients can view their own wallet"
on public.client_wallets
for select
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id::text = client_wallets.client_id
      and c.user_id = auth.uid()
  )
);

-- Allow clients to view their own wallet transactions
create policy "Clients can view their own wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id::text = wallet_transactions.client_id
      and c.user_id = auth.uid()
  )
);

-- Allow clients to view their own credits
create policy "Clients can view their own credits"
on public.client_credits
for select
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id::text = client_credits.client_id
      and c.user_id = auth.uid()
  )
);
