---
phase: 05-frontend-deployment
plan: 02
subsystem: infra
tags: [vercel, dns, cname, supabase-auth, custom-domain, deployment, vite]

# Dependency graph
requires:
  - phase: 05-frontend-deployment
    plan: 01
    provides: "GitHub repo itsforren/alphahub with SPA routing, env docs, build verified"
  - phase: 03-backend-infrastructure
    provides: "100 edge functions deployed, secrets configured, storage migrated, cron jobs active"
  - phase: 02-database-auth
    provides: "Database migrated, auth users preserved with MFA, RLS policies active"
provides:
  - "Live frontend at https://hub.alphaagent.io on Vercel (Hobby plan)"
  - "Git-connected CI/CD: push to main triggers automatic rebuild"
  - "4 VITE_* env vars pointing to new Supabase project qcunascacayiiuufjtaq"
  - "DNS CNAME: hub.alphaagent.io -> cname.vercel-dns.com"
  - "Supabase Auth: site_url and redirect_urls configured for hub.alphaagent.io"
  - "Human-verified: all 10 pages load with real data from new backend"
affects: [06-cutover]

# Tech tracking
tech-stack:
  added:
    - "Vercel (Hobby plan) for frontend hosting"
  patterns:
    - "Git-connected deploys: push to itsforren/alphahub main branch triggers Vercel build"
    - "Custom domain via Hostinger CNAME to Vercel DNS"
    - "Supabase Auth redirect allowlist with wildcard pattern (https://hub.alphaagent.io/**)"

key-files:
  created: []
  modified:
    - "alphahub-v2/.gitignore (added .vercel directory exclusion)"

key-decisions:
  - "Vercel Hobby plan selected as hosting platform -- zero-config Vite detection, git-connected deploys"
  - "hub.alphaagent.io configured via Hostinger DNS CNAME to Vercel"
  - "Supabase Pro upgrade completed -- unblocks 6 remaining edge functions and 54.7MB wav file migration"
  - "User confirmed all 10 pages load correctly with real data from new backend"

patterns-established:
  - "Vercel env var pattern: VITE_* prefix for Vite build-time injection"
  - "Supabase Auth redirect URL pattern: site_url + wildcard allowlist"

# Metrics
duration: ~90min (across two sessions with user verification)
completed: 2026-02-28
---

# Phase 5 Plan 2: Vercel Deployment Summary

**Frontend live at hub.alphaagent.io on Vercel with git-connected deploys, 4 Supabase env vars, custom domain via Hostinger CNAME, and all 10 pages human-verified with real data**

## Performance

- **Duration:** ~90 min (across two sessions including user verification)
- **Started:** 2026-02-28T18:00:00Z (approx)
- **Completed:** 2026-02-28T21:30:47Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 1 (local); rest was external configuration (Vercel, DNS, Supabase)

## Accomplishments
- Deployed alphahub-v2 to Vercel (project: alphahub-v2, team: alpha-agent1) with zero-config Vite detection
- Set 4 environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PROJECT_ID) pointing to new Supabase project
- Production URL live: https://alphahub-v2.vercel.app
- Custom domain hub.alphaagent.io configured via Hostinger CNAME -> cname.vercel-dns.com
- HTTPS active with Vercel auto-provisioned SSL certificate
- Supabase Auth redirect URLs updated: site_url = https://hub.alphaagent.io, wildcard redirect allowlist
- User verified all 10 pages load correctly with real data: login, dashboard, client list, client detail, billing, command center, sales, analytics, chat, settings
- Deep links work (SPA routing via vercel.json catch-all rewrite confirmed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Deploy to Vercel and configure environment variables** - `4388ba8` (feat)
2. **Task 2: Configure custom domain and Supabase Auth redirect URLs** - No local commit (DNS CNAME + Supabase API configuration, no local file changes)
3. **Task 3: Verify all pages load correctly** - Checkpoint (human-verified, approved)

## Files Created/Modified
- `alphahub-v2/.gitignore` - Added `.vercel` directory exclusion (Vercel CLI creates local project metadata)

## External Configuration (no local files)
- **Vercel project:** alphahub-v2 on team alpha-agent1, linked to itsforren/alphahub repo
- **Vercel env vars:** 4 VITE_* variables set for production environment
- **Hostinger DNS:** CNAME record `hub` -> `cname.vercel-dns.com` for alphaagent.io domain
- **Supabase Auth:** site_url = https://hub.alphaagent.io, redirect allowlist includes hub.alphaagent.io/** and localhost entries

## Decisions Made
- **Vercel Hobby plan** selected for hosting -- zero-config Vite framework detection, git-connected deploys from GitHub, free tier sufficient for current needs
- **hub.alphaagent.io** as custom domain via Hostinger DNS CNAME to Vercel -- consistent with existing domain structure (conscious.sysconscious.com for dashboard, cortex.sysconscious.com for n8n)
- **Supabase Pro upgrade** completed by user during verification -- unblocks deployment of 6 remaining edge functions (verify-google-ads-campaign, verify-lead-delivery, verify-onboarding-live, verify-onboarding, webflow-cms-create, webflow-cms-update) and 54.7 MB wav file migration
- **Data is migration snapshot** -- user confirmed understanding that data reflects migration point, delta sync planned for Phase 6 cutover

## Deviations from Plan

None -- plan executed exactly as written. All three tasks completed as specified.

## Authentication Gates

During execution, one authentication requirement was handled:

1. **Task 1:** Vercel CLI required authentication
   - User ran `vercel login` and completed browser authentication
   - Resumed and deployed successfully via CLI

## Issues Encountered
None -- deployment, DNS, and auth configuration all completed without errors.

## User Setup Required
None -- all external service configuration (Vercel, DNS, Supabase Auth) was completed during plan execution.

## Next Phase Readiness
- Frontend is live and verified at https://hub.alphaagent.io
- Phase 5 (Frontend Deployment) is COMPLETE -- both plans executed successfully
- **Supabase Pro upgrade done** -- the following deferred items are now unblocked:
  - Deploy 6 remaining edge functions (verify-google-ads-campaign, verify-lead-delivery, verify-onboarding-live, verify-onboarding, webflow-cms-create, webflow-cms-update)
  - Migrate 54.7 MB wav file (media/lesson-files/1767150569935-0hry6b.wav)
- Phase 4 (Stripe Migration) can proceed in parallel
- Phase 6 (Cutover) is the final phase -- requires Stripe migration (Phase 4) completion plus delta sync, webhook URL updates, and DNS/domain cutover

---
*Phase: 05-frontend-deployment*
*Completed: 2026-02-28*
