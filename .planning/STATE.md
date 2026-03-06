# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-03-05)

**Core value:** Clients can manage their entire Alpha Hub experience from their phone -- wallet, chat, courses, referrals -- with real-time sync to the web app.
**Current focus:** Phase 1: Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-03-05 -- Completed 01-03-PLAN.md (design system and tab navigation)

Progress: [###░░░░░░░] ~17%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~22min
- Total execution time: ~66 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | ~66min | ~22min |

**Recent Trend:**
- Last 5 plans: 01-01 (25min), 01-02 (6min), 01-03 (35min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: iOS 17+ minimum target (required for @Observable macro)
- Roadmap: Native Swift + SwiftUI, no cross-platform frameworks
- Roadmap: supabase-swift only SPM dependency (KeychainAccess and Kingfisher skipped)
- Roadmap: Realtime WebSocket only for chat; REST + pull-to-refresh for everything else
- Roadmap: APNs direct (no Firebase/FCM) since iOS-only app
- 01-01: SPM packages must be added via Xcode UI (Xcode 26 compatibility)
- 01-02: Added Supabase SPM product for SupabaseClient access
- 01-02: Used built-in KeychainLocalStorage from supabase-swift Auth module
- 01-02: Programmatic SpriteKit emitter (no .sks files)
- 01-03: Used .tag() API instead of Tab(value:content:) — Tab type requires iOS 18+
- 01-03: Used .ultraThinMaterial for glass effects — .glassEffect() is iOS 26+ only
- 01-03: Inter TTFs converted from WOFF2 via fonttools (Google Fonts no longer serves raw TTF)
- 01-03: FloatingTabBar overlays hidden native TabView; NavigationStack inside each tab

### Pending Todos

None.

### Blockers/Concerns

- Phase 3: Supabase Realtime Swift client has documented WebSocket disconnect issues on iOS background/foreground -- needs proof-of-concept before building chat
- Phase 4: Bunny CDN video URL format must be confirmed (HLS stream vs iframe embed) before building course video player
- Phase 5: Universal Links for referral sharing require AASA file deployment on alphaagent.io (server-side coordination)

## Session Continuity

Last session: 2026-03-05
Stopped at: Completed 01-03-PLAN.md (design system and tab navigation) — Phase 1 complete
Resume file: None
