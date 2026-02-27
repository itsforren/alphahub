---
phase: 03-backend-infrastructure
plan: 02
subsystem: api
tags: [anthropic, llm, edge-functions, deno, tool-calling, claude-sonnet]

# Dependency graph
requires:
  - phase: 01-preparation-audit
    provides: Identified 5 LLM functions using Lovable AI gateway with LOVABLE_API_KEY
provides:
  - 5 edge functions converted from Lovable AI gateway to Anthropic Messages API
  - LLM_API_KEY env var replaces LOVABLE_API_KEY across all LLM functions
  - Anthropic tool calling pattern established for verify-onboarding-live
affects: [03-backend-infrastructure (Plan 03 secrets, Plan 05 deployment)]

# Tech tracking
tech-stack:
  added: [Anthropic Messages API (2023-06-01)]
  patterns: [Anthropic chat completion with system parameter, Anthropic tool calling with input_schema]

key-files:
  created: []
  modified:
    - alphahub-v2/supabase/functions/analyze-prospect/index.ts
    - alphahub-v2/supabase/functions/generate-agent-bio/index.ts
    - alphahub-v2/supabase/functions/generate-dispute-evidence/index.ts
    - alphahub-v2/supabase/functions/verify-onboarding/index.ts
    - alphahub-v2/supabase/functions/verify-onboarding-live/index.ts

key-decisions:
  - "Removed 402 (AI credits exhausted) error handler -- not applicable to Anthropic direct API"
  - "generate-dispute-evidence upgraded from openai/gpt-5.2 to claude-sonnet-4-6"
  - "verify-onboarding-live: extracted inline system/user prompts to variables for Anthropic format compatibility"

patterns-established:
  - "Pattern: Anthropic Messages API call with x-api-key header, anthropic-version 2023-06-01, system as top-level param, response via content[0].text"
  - "Pattern: Anthropic tool calling with input_schema, tool_choice type:tool, response via content.find(b => b.type === tool_use).input (already parsed, no JSON.parse)"

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 3 Plan 02: LLM Provider Replacement Summary

**5 edge functions converted from Lovable AI gateway (OpenAI format) to Anthropic Messages API with claude-sonnet-4-6**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T16:29:06Z
- **Completed:** 2026-02-27T16:31:43Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- 3 chat completion functions (analyze-prospect, generate-agent-bio, generate-dispute-evidence) converted from OpenAI format via Lovable gateway to Anthropic Messages API
- 1 function (verify-onboarding) had env var renamed from LOVABLE_API_KEY to LLM_API_KEY (no API call in this function)
- 1 tool-calling function (verify-onboarding-live) converted from OpenAI tool format to Anthropic tool calling with input_schema and tool_use response parsing
- All 4 API-calling functions now use claude-sonnet-4-6 model
- Zero references to Lovable AI gateway or LOVABLE_API_KEY remain in any of the 5 functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert 4 simple chat completion functions** - `b3913f3` (feat)
2. **Task 2: Convert verify-onboarding-live to Anthropic tool calling** - `fdc8afd` (feat)

## Files Modified
- `alphahub-v2/supabase/functions/analyze-prospect/index.ts` - Prospect analysis LLM call converted to Anthropic Messages API
- `alphahub-v2/supabase/functions/generate-agent-bio/index.ts` - Bio generation LLM call converted to Anthropic Messages API
- `alphahub-v2/supabase/functions/generate-dispute-evidence/index.ts` - Dispute evidence LLM call converted from OpenAI gpt-5.2 to Anthropic claude-sonnet-4-6
- `alphahub-v2/supabase/functions/verify-onboarding/index.ts` - Env var renamed LOVABLE_API_KEY -> LLM_API_KEY (no API call change)
- `alphahub-v2/supabase/functions/verify-onboarding-live/index.ts` - Full tool calling conversion: OpenAI format -> Anthropic format with input_schema

## Decisions Made
- Removed 402 "AI credits exhausted" error handlers from analyze-prospect and generate-dispute-evidence -- this was specific to the Lovable gateway billing model and does not apply to direct Anthropic API usage
- generate-dispute-evidence was using `openai/gpt-5.2` (a more capable model for legal writing); replaced with `claude-sonnet-4-6` per plan which is equivalent capability
- In verify-onboarding-live, extracted inline system and user prompt strings from the messages array into separate variables to cleanly support Anthropic's top-level `system` parameter format

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

None - no external service configuration required. LLM_API_KEY secret will be set during Plan 03 (secrets configuration).

## Next Phase Readiness
- All 5 LLM functions are code-ready for deployment (Plan 05)
- LLM_API_KEY must be set as a Supabase secret before these functions work (Plan 03)
- No blockers for downstream plans

---
*Phase: 03-backend-infrastructure*
*Completed: 2026-02-27*
