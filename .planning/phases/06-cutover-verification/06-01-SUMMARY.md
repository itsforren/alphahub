---
phase: 06-cutover-verification
plan: 01
subsystem: infra
tags: [edge-functions, url-migration, supabase, deno, deployment]

# Dependency graph
requires:
  - phase: 03-backend-infrastructure
    provides: All 106 edge functions deployed to new Supabase project
  - phase: 05-frontend-deployment
    provides: hub.alphaagent.io frontend live on Vercel
provides:
  - All user-facing URLs in edge functions point to hub.alphaagent.io
  - PUBLIC_APP_URL secret configured for runtime URL resolution
  - 6 edge functions redeployed with corrected URLs
affects: [06-02-PLAN, 06-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PUBLIC_APP_URL env var with hub.alphaagent.io fallback for runtime URL resolution"

key-files:
  created: []
  modified:
    - alphahub-v2/supabase/functions/send-password-reset/index.ts
    - alphahub-v2/supabase/functions/crm-oauth-callback/index.ts
    - alphahub-v2/supabase/functions/chat-notification/index.ts
    - alphahub-v2/supabase/functions/create-user-account/index.ts
    - alphahub-v2/supabase/functions/morning-review-job/index.ts
    - alphahub-v2/supabase/functions/ads-manager-slack-test/index.ts

key-decisions:
  - "Email address sierra@alphaagent.io left unchanged -- it is a mailbox, not a URL"
  - "create-user-account: replaced dynamic .lovable.app URL construction with hardcoded hub.alphaagent.io"

patterns-established:
  - "All user-facing URLs in edge functions use hub.alphaagent.io domain"
  - "morning-review-job uses PUBLIC_APP_URL env var with hub.alphaagent.io as fallback"

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 6 Plan 1: Edge Function URL Fix Summary

**Replaced 8 hardcoded old-domain URLs across 6 edge functions with hub.alphaagent.io and deployed all functions with PUBLIC_APP_URL secret**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T15:04:19Z
- **Completed:** 2026-03-02T15:06:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced all 8 hardcoded URLs (2x alphaagent.io, 5x alpha-agent-flow.lovable.app, 1x .lovable.app dynamic construction) with hub.alphaagent.io
- Set PUBLIC_APP_URL secret on new Supabase project (qcunascacayiiuufjtaq)
- Deployed all 6 updated edge functions; spot-checked send-password-reset (HTTP 400) and chat-notification (HTTP 500) confirming both are reachable
- Zero old-domain URLs remain in the 6 modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix hardcoded URLs in 6 edge functions** - `96a771a` (fix)
2. **Task 2: Set PUBLIC_APP_URL secret and redeploy** - No local code changes; remote-only operations (secret set + 6 function deploys)

## Files Created/Modified

- `alphahub-v2/supabase/functions/send-password-reset/index.ts` - Password reset redirectTo and fallback URL updated (2 occurrences)
- `alphahub-v2/supabase/functions/crm-oauth-callback/index.ts` - GHL OAuth success redirect URL updated (1 occurrence)
- `alphahub-v2/supabase/functions/chat-notification/index.ts` - Portal URL for chat notification links updated (1 occurrence)
- `alphahub-v2/supabase/functions/create-user-account/index.ts` - Replaced .lovable.app dynamic URL construction with hardcoded hub.alphaagent.io (1 occurrence)
- `alphahub-v2/supabase/functions/morning-review-job/index.ts` - PUBLIC_APP_URL fallback strings updated (2 occurrences)
- `alphahub-v2/supabase/functions/ads-manager-slack-test/index.ts` - Slack test message app URL updated (1 occurrence)

## Decisions Made

- **sierra@alphaagent.io left unchanged:** This is an email address (notification recipient), not a user-facing URL. Changing it would break email delivery.
- **create-user-account hardcoded URL:** The original code dynamically constructed a .lovable.app URL from SUPABASE_URL. Replaced with a simple hardcoded `https://hub.alphaagent.io/auth/reset-password` since the URL is now stable and the dynamic approach was Lovable-specific.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. PUBLIC_APP_URL secret was set as part of Task 2.

## Next Phase Readiness

- All edge function URLs now point to hub.alphaagent.io
- Functions are deployed and reachable on the new project
- Ready for 06-02 (external webhook URL updates) and 06-03 (final cutover verification)
- No blockers identified

---
*Phase: 06-cutover-verification*
*Completed: 2026-03-02*
