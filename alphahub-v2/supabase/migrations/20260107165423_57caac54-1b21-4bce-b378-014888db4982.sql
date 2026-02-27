-- Re-create triggers for linking prospects to referrers

-- Trigger on prospects table
drop trigger if exists trg_link_prospect_referrer_on_prospects on public.prospects;
create trigger trg_link_prospect_referrer_on_prospects
after insert or update of referral_code on public.prospects
for each row
when (new.referral_code is not null and btrim(new.referral_code) <> '')
execute function public.link_prospect_to_referrer();

-- Trigger on prospect_attribution table
drop trigger if exists trg_link_prospect_referrer_on_attribution on public.prospect_attribution;
create trigger trg_link_prospect_referrer_on_attribution
after insert or update of referral_code on public.prospect_attribution
for each row
when (new.referral_code is not null and btrim(new.referral_code) <> '')
execute function public.link_prospect_to_referrer();