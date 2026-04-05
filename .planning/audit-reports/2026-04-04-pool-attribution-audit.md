# AlphaHub Pool Ad Spend Attribution Audit — 2026-04-04

Authored by: Codex (gpt-5.4) via `codex exec --sandbox read-only`, invoked by Forren.
Session: 019d5b5d-05b6-70a0-9342-9dd686ffe9f0

## Context

Triggered by a same-day investigation into:

1. Wallet balances diverging between `ClientDetail` (RPC) and `AgentPool` (lead-router manual calc) — off by $600–900 per agent.
2. `ad_spend_daily` rows stale for today's date (Apr 4) — only $280 recorded when live Google Ads spend was ~$1,100.
3. A `lead-router` boot error earlier in the day (commit `faf43fd` duplicate `const today` — fixed before this audit).
4. A manually-created pg_cron job `attribution-midnight-final` (jobid=37) that had not yet run (created same day, first scheduled fire 05:00 UTC tomorrow).

Pool campaigns configured in `onboarding_settings.consolidated_campaign_ids`:

```
23706217116, 23399555696, 23363894096, 23718879086, 23713839732
```

Joshua Harris's `23363894096` was repurposed from a direct per-agent campaign to a distributor/pool campaign on ~2026-04-02; `campaigns.tracking_paused = true` verified.

## Verified Findings

### 1. Cron / Job 37 root cause

Three compounding issues in the committed migration `supabase/migrations/20260401_consolidated_attribution_cron.sql`:

- Calls `/attribute-consolidated-spend/run`, which defaults to **projection mode** — never writes to `ad_spend_daily`. The endpoint `/run-final` is the one that actually persists.
- Schedule is `0 */6 * * *` (every 6 hours on UTC boundaries), not "midnight ET" as the comment claims.
- The function defaults `targetDate` to **today**. A midnight finalizer must write for **yesterday** (the day that just completed).

Latent bug: `getTodayET()` and `getETDayBoundsUTC()` use `America/Bogota` (which has no DST), but the internal DST check is against Bogota, so the "ET" helper silently returns the wrong offset half the year. Naming lies.

Comparison: Job 36 (`process-ec-enhancement-queue`) uses a direct SQL function call (`SELECT process_ec_queue()`), no HTTP round-trip, no endpoint mismatch.

Manually-created Job 37 (`attribution-midnight-final`, schedule `0 5 * * *`, calls `/run-final`) exists in the live DB but not in any migration. Its zero run history is because it was created on 2026-04-04 and has not yet hit its first scheduled window.

### 2. Router wallet miscalculation

`supabase/functions/lead-router/index.ts` manually reconstructs wallet balances instead of calling the canonical `compute_wallet_balance` RPC:

- Manual reconstruction: `routeAgent` around line 580 and `getPoolStatus` around line 770.
- The manual calc adds a "projected today spend" that the RPC does not own, causing divergence from every other consumer of wallet balance (frontend hooks, `check-low-balance`, `dispute-webhook`, `manual-wallet-refill`, `stripe-billing-webhook`, `mcp-proxy`).

Observed divergence on 2026-04-04:

| Agent | RPC (ClientDetail) | Router pool | Gap |
|---|---:|---:|---:|
| Joshua Harris | $325.59 | $992 | +$667 over |
| Mario Cittadino | $172.66 | $1,074 | +$902 over |

Memory rule violated: "NEVER manually calculate wallet balances, always use the RPC."

### 3. Lead denominator too narrow

Attribution counts only `lead_source = 'CONSOLIDATED_ROUTER'` leads (`attribute-consolidated-spend/index.ts` line 122). Router pool logic uses `['CONSOLIDATED_ROUTER', 'DEMAND_GEN']` (lead-router line 633, 779).

Neither matches the user's intent: all leads whose **originating campaign** is in `consolidated_campaign_ids` should count toward the 60% lead-weighted pool, regardless of which endpoint saved them.

Reliable discriminator: campaign identity, not lead_source. Candidate fields:

- `lead_data->>'campaignid'` (CONSOLIDATED_ROUTER survey path)
- `lead_data->>'campaign_id'` (DEMAND_GEN lead form extension path)
- `lead_data #>> '{contact,attributionSource,url}'` and `webhook_payload #>> '{contact,attributionSource,url}'` → regex-extract `campaignid=` or `gad_campaignid=`
- Source tags: `s-consolidated`, `s-nat`, `s-jh`, `s-joshua`, `dg-prospecting`, `dg-remarketing`

### 4. James Warren exempt logic

Code path correct. `consolidated_owner_exempt_agent_id = EIx4YsVXAfD6hoIX2ixz` matches James Warren's agent_id. Verified his `ad_spend_daily` row for 2026-04-04 has `cost = 0.00, conversions = 1`.

## 3-Day Reconciliation

| Date | Live Google Ads | `ad_spend_daily` (23706217116) | Current lead count | Correct pool lead count | Notes |
|---|---:|---:|---:|---:|---|
| 2026-04-02 | $604.56 | $608.67 | 6 | 0* | Reconciled Apr 4 18:35 (manual `/run-final`). *Older CONSOLIDATED_ROUTER leads don't populate `lead_data.campaignid` — need fallback |
| 2026-04-03 | $1,066.96 | $1,066.97 | 8 | 8 | Reconciled Apr 4 18:34 (manual `/run-final`). Match |
| 2026-04-04 | $1,130.30 | $1,090.44 | 10 | 23 | Caught up by audit; **13 DEMAND_GEN leads from pool campaigns missed from 60% denominator** |

### Apr 4 per-agent impact

Under-credited (paid base share only, no lead credit) because their pool-campaign leads arrived via non-CONSOLIDATED_ROUTER path:

- Jonathan Antignani — 1 lead missed (Henry Kershaw, 23363894096)
- Martin Mugratsch — 2 leads missed (1 CR from 23399555696, 1 DEMAND_GEN from 23363894096)
- Shaakira Gold-Ramirez — 1 lead missed (Charlene Harris, 23363894096)
- Joe Longo — 1 lead missed (Dannie Schoffstall, 23363894096)
- Jeff Graggs — 1 lead missed (Kevin Laabs, 23363894096)
- Stephen Montgomery — got credit for 2 of 3 leads; 1 DEMAND_GEN from 23363894096 (Mesfin Mekonen) missed
- Mario Cittadino — got credit for 1 of 2 leads; 1 DEMAND_GEN from 23363894096 (Brenda Cook) missed
- Taylor Johnson — 1 lead missed (Jay Sol, 23399555696)

At $113 CPL with fee, a 1-lead miss costs the agent ~$68 of credit (60% portion distributed across paying leads). Multiply by days × agents to estimate the total billing drift.

### Not broken

- Spend summing across all 5 campaigns (live Google Ads API in `attribute-consolidated-spend`) works.
- 40/60 split math is correct.
- Exempt agent logic is correct.
- Apr 2-3 spend totals are reconciled in `ad_spend_daily`.

## Proposed Diffs (Codex)

### Helper migration — `supabase/migrations/20260404_pool_campaign_helpers.sql` (new)

Three SQL functions:

- `extract_pool_campaign_id(p_lead_data, p_webhook_payload)` — returns the originating pool campaign ID or NULL. Checks `lead_data.campaignid`, `lead_data.campaign_id`, known source tags, then regex-extracts from attribution URLs.
- `get_pool_lead_counts(p_start, p_end, p_campaign_ids[], p_agent_ids[] DEFAULT NULL)` — returns `(agent_id, lead_count)` for leads matching pool campaigns in a time window, excluding test leads.
- `compute_wallet_balances(p_client_ids uuid[])` — batch wrapper around `compute_wallet_balance` returning `(client_id, remaining_balance)`.

### Cron migration rewrite — `supabase/migrations/20260401_consolidated_attribution_cron.sql`

Change to a single daily finalizer:

- Job name: `attribute-consolidated-spend-daily`
- Schedule: `5 5 * * *` (00:05 Bogota, 5 minutes into the new day)
- URL: `/run-final`
- Body: `{"date": yesterday_bogota}`

### Attribution function — `supabase/functions/attribute-consolidated-spend/index.ts`

- Rename `getTodayET` → `getTodayBogota`; same for day-bounds helper.
- `getLeadsPerAgent` switches from `.eq('lead_source', 'CONSOLIDATED_ROUTER')` to `supabase.rpc('get_pool_lead_counts', {...})` passing the 5 campaign IDs.
- Default `targetDate` to yesterday Bogota when called by cron.

### Router refactor — `supabase/functions/lead-router/index.ts`

- Replace manual wallet calc in both `routeAgent` and `getPoolStatus` with a single `compute_wallet_balances` batch RPC call.
- Replace lead-counting query with `get_pool_lead_counts` using the 5 campaign IDs.

### Backfill commands (post-deploy)

```bash
curl -sS -X POST "$SUPABASE_V2_URL/functions/v1/attribute-consolidated-spend/run-final" \
  -H "Authorization: Bearer $SUPABASE_V2_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-02"}'

curl -sS -X POST "$SUPABASE_V2_URL/functions/v1/attribute-consolidated-spend/run-final" \
  -H "Authorization: Bearer $SUPABASE_V2_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-03"}'

curl -sS -X POST "$SUPABASE_V2_URL/functions/v1/attribute-consolidated-spend/run-final" \
  -H "Authorization: Bearer $SUPABASE_V2_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-04"}'
```

## Verification Plan

1. Confirm cron registration:
   ```sql
   select jobid, jobname, schedule, active, command
   from cron.job
   where jobname = 'attribute-consolidated-spend-daily';
   ```
2. Confirm Job 36 and 37 are unscheduled.
3. `select spend_date, round(sum(cost)::numeric, 2) from ad_spend_daily where campaign_id = '23706217116' and spend_date between '2026-04-02' and '2026-04-04' group by 1` should return totals matching live Google Ads within $5/day.
4. James Warren row cost = 0 for all 3 days.
5. Router `/pool` wallet_balance per agent must equal `compute_wallet_balance` RPC result within $0.01.
6. Spot check: Jonathan Antignani's row for 2026-04-04 should show conversions ≥ 1 and cost proportional to lead share after backfill.

## Additional Issues (out of scope, worth fixing later)

- Service-role JWTs are hard-coded inline in `20260401_consolidated_attribution_cron.sql`. Visible in repo history. Should be rotated and moved to `vault.decrypted_secrets` like jobs 14/15/16 do.
- "ET" vs "Bogota" timezone naming inconsistency throughout `attribute-consolidated-spend`. Pick one, name everything accordingly.

---

Claude Code notes: verified Joshua's `campaigns.tracking_paused = true` independently before implementation. Apr 4 attribution caught up to $1,090.44 via manual `/run-final` at audit close. Implementation proceeding in tasks #4–#10.
