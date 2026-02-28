

## Root Cause: No Cron Job for `auto-recharge-run`

Joe's wallet settings are correct — `auto_billing_enabled: true`, `auto_charge_amount: 250`, `billing_mode: auto_stripe`, has a default ad_spend card on file. The function code is fine.

**The problem is the `auto-recharge-run` edge function was never registered as a cron job in `pg_cron`.** The `schedule` property in `config.toml` does not automatically create a cron job — it requires a `pg_cron` entry using `net.http_post` to actually invoke the function on schedule. There are 5 existing cron jobs (check-automation-timeout, sync-google-ads-daily, etc.) but none for `auto-recharge-run`.

The function has never executed — zero logs confirm this.

## Fix

**1. Create the `pg_cron` job for `auto-recharge-run`**
- Schedule: every 30 minutes (`*/30 * * * *`) — checking once daily at 6 AM is too infrequent; balances can drop below threshold at any time
- Use `net.http_post` to invoke the edge function with the anon key, matching the pattern of existing cron jobs

**2. Immediately trigger `auto-recharge-run` manually**
- Call the function right now to process Joe Longo's $250 recharge immediately, since his balance ($127) is already below the $150 threshold

**3. Also wire up `check-low-balance` on the same schedule (if not already a cron)**
- The check-low-balance function fires on individual client_id POST calls from other functions, but should also run on a schedule as a sweep to catch any missed clients

## Changes
- Insert `pg_cron` job via SQL for `auto-recharge-run` at `*/30 * * * *`
- Manually invoke `auto-recharge-run` to immediately process Joe

