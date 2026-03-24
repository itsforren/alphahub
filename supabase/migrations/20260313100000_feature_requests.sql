-- Create feature_requests table
create table if not exists feature_requests (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references clients(id),
  title       text        not null,
  description text,
  category    text        check (category in ('campaigns', 'billing', 'crm', 'hub', 'other')),
  status      text        not null default 'new' check (status in ('new', 'reviewed', 'planned', 'shipped')),
  admin_notes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable RLS
alter table feature_requests enable row level security;

-- Clients can insert their own requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_requests' AND policyname = 'clients_insert_own'
  ) THEN
    create policy "clients_insert_own"
      on feature_requests
      for insert
      to authenticated
      with check (
        client_id = (
          select id from clients where user_id = auth.uid() limit 1
        )
      );
  END IF;
END $$;

-- Clients can read their own requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_requests' AND policyname = 'clients_read_own'
  ) THEN
    create policy "clients_read_own"
      on feature_requests
      for select
      to authenticated
      using (
        client_id = (
          select id from clients where user_id = auth.uid() limit 1
        )
      );
  END IF;
END $$;

-- Service role bypass (admin can do anything — service role skips RLS by default,
-- but an explicit policy is added for clarity / anon-key admin usage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_requests' AND policyname = 'service_role_all'
  ) THEN
    create policy "service_role_all"
      on feature_requests
      for all
      to service_role
      using (true)
      with check (true);
  END IF;
END $$;

-- Auto-update updated_at on row changes
create or replace function set_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS feature_requests_set_updated_at ON feature_requests;
create trigger feature_requests_set_updated_at
  before update on feature_requests
  for each row
  execute function set_updated_at();
