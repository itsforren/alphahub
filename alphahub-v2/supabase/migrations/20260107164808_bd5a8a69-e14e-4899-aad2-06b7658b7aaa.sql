-- 1) Referral linking function + triggers (bulletproof)

create or replace function public.link_prospect_to_referrer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prospect_id uuid;
  v_code text;
  v_referrer_client_id uuid;
  v_referral_code_id uuid;
  v_email text;
  v_name text;
begin
  -- Determine the prospect we should update
  if tg_table_name = 'prospects' then
    v_prospect_id := new.id;
    v_code := nullif(btrim(new.referral_code), '');
  elsif tg_table_name = 'prospect_attribution' then
    v_prospect_id := new.prospect_id;
    v_code := nullif(btrim(new.referral_code), '');
  else
    return new;
  end if;

  if v_prospect_id is null or v_code is null then
    return new;
  end if;

  -- Find the referral code owner
  select rc.client_id, rc.id
    into v_referrer_client_id, v_referral_code_id
  from public.referral_codes rc
  where lower(rc.code) = lower(v_code)
    and rc.is_active = true
  limit 1;

  if v_referrer_client_id is null then
    return new;
  end if;

  -- Update prospect with referrer + normalize referral_code + mark lead_source=referral
  update public.prospects p
  set
    referrer_client_id = coalesce(p.referrer_client_id, v_referrer_client_id),
    referral_code = coalesce(nullif(btrim(p.referral_code), ''), v_code),
    lead_source = coalesce(p.lead_source, 'referral')
  where p.id = v_prospect_id;

  -- Load name/email for referral row
  select p.email, p.name
    into v_email, v_name
  from public.prospects p
  where p.id = v_prospect_id;

  -- Create a referral record (idempotent by email+code owner+code id)
  insert into public.referrals (
    referrer_client_id,
    referral_code_id,
    referred_email,
    referred_name,
    status,
    referred_at
  )
  values (
    v_referrer_client_id,
    v_referral_code_id,
    v_email,
    coalesce(v_name, ''),
    'pending',
    now()
  )
  on conflict do nothing;

  return new;
end;
$$;

-- Ensure triggers exist on both tables

drop trigger if exists trg_link_prospect_referrer_on_prospects on public.prospects;
create trigger trg_link_prospect_referrer_on_prospects
after insert or update of referral_code on public.prospects
for each row
when (new.referral_code is not null and btrim(new.referral_code) <> '')
execute function public.link_prospect_to_referrer();

-- If attribution arrives later, link as well

drop trigger if exists trg_link_prospect_referrer_on_attribution on public.prospect_attribution;
create trigger trg_link_prospect_referrer_on_attribution
after insert or update of referral_code on public.prospect_attribution
for each row
when (new.referral_code is not null and btrim(new.referral_code) <> '')
execute function public.link_prospect_to_referrer();

-- Helpful index for prospect referral lookups
create index if not exists idx_prospects_referral_code on public.prospects (referral_code);
create index if not exists idx_referral_codes_code_lower on public.referral_codes (lower(code));
