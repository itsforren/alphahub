# Alpha Hub — Session Memory

## CRITICAL: Repo & Deployment Identity

| Thing | Correct Value |
|-------|--------------|
| Official repo | https://github.com/itsforren/alphahub.git |
| Local path | `/Users/forren/workspace/copy-alphahub/` |
| Live app | https://alphaagent.io |
| Supabase project | `qcunascacayiiuufjtaq` |
| Deploy trigger | Push to `main` on `itsforren/alphahub` → Vercel auto-deploys |

## ❌ NEVER DO THIS

- Push to `itsforren/alpha-agent-flow` — OLD Lovable app, NOT connected to alphaagent.io
- Use Supabase project `qydkrpirrfelgtcqasdx` — OLD project, returns Forbidden
- Work in `/Users/forren/workspace/alpha-agent-flow-review/` for production changes

## Vercel Deploy (GitHub webhook is broken — must trigger manually)

```bash
curl -s -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"alphahub-v2","gitSource":{"type":"github","org":"itsforren","repo":"alphahub","ref":"main"},"target":"production"}'
```

- Vercel project ID: `prj_qjsttH6tKyeHt4uJSflL23CmBNF0`
- Org ID: `JueM8hzm6WQGIjlRnFF9la1R`
- VERCEL_TOKEN is in `~/.zprofile`
- Pushing to GitHub does NOT auto-deploy — must trigger manually via API

## Edge Function Deploy Command

```bash
cd /Users/forren/workspace/copy-alphahub/alphahub-v2
supabase functions deploy <function-name> --project-ref qcunascacayiiuufjtaq
```

## Key Architecture Facts

- `BillingWidget.tsx` (NOT BillingSection.tsx) is the actual billing component used in ClientDetail
- Wallet balance is computed: total wallet_transactions deposits - ad_spend_daily since tracking_start_date
- `tracking_start_date` on client_wallets is critical — without it wallet balance won't compute
- Two Stripe accounts: `management` (STRIPE_MANAGEMENT_SECRET_KEY) and `ad_spend` (STRIPE_AD_SPEND_SECRET_KEY)
- pg_cron jobs created for hourly syncs (jobids 17, 18, 19) — CLI v2.75.0 doesn't support schedule in config.toml
- pg_cron jobid 22: `mark-overdue-billing` runs daily at 6AM UTC

## _backup/ Folder (Project Root)

`/Users/forren/workspace/copy-alphahub/_backup/` — archive folder for removed-but-preserved files.

When removing dead code that might be referenced later, copy it here first before deleting the original.

**Files currently in backup:**
- `BillingSection.tsx` — dead code, never imported anywhere. Smaller subset of BillingWidget.tsx. Backed up 2026-03-05.
