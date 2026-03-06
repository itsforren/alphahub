# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-03-05)

**Core value:** Clients can manage their entire Alpha Hub experience from their phone -- wallet, chat, courses, referrals -- with real-time sync to the web app.
**Current focus:** Phase 2: Core Value

## Current Position

Phase: 2 of 6 (Core Value)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-03-06 -- Completed 02-02-PLAN.md (dashboard view with wallet hero, quick links, business results)

Progress: [#####░░░░░] ~29%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~15min
- Total execution time: ~76 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | ~66min | ~22min |
| 02-core-value | 2/4 | ~10min | ~5min |

**Recent Trend:**
- Last 5 plans: 01-02 (6min), 01-03 (35min), 02-01 (6min), 02-02 (4min)
- Trend: accelerating (UI plans very fast with established patterns)

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
- 01-03: Used .tag() API instead of Tab(value:content:) -- Tab type requires iOS 18+
- 01-03: Used .ultraThinMaterial for glass effects -- .glassEffect() is iOS 26+ only
- 01-03: Inter TTFs converted from WOFF2 via fonttools (Google Fonts no longer serves raw TTF)
- 01-03: FloatingTabBar overlays hidden native TabView; NavigationStack inside each tab
- 02-01: nonisolated(unsafe) for non-Sendable Foundation formatters in Swift 6 strict concurrency
- 02-01: LeadStatus rawValues use snake_case matching DB values directly
- 02-01: DataManager.loadAllData() triggered from RootView .onChange(of: auth.isAuthenticated)
- 02-02: WalletHeroCard reads DataManager via @Environment (not params) -- cleaner for central state
- 02-02: QuickLinkPills hides entirely when all links nil -- no empty state for links
- 02-02: ROI color-coded: success for positive, error for negative, textPrimary for zero

### Pending Todos

None.

### Blockers/Concerns

- Phase 3: Supabase Realtime Swift client has documented WebSocket disconnect issues on iOS background/foreground -- needs proof-of-concept before building chat
- Phase 4: Bunny CDN video URL format must be confirmed (HLS stream vs iframe embed) before building course video player
- Phase 5: Universal Links for referral sharing require AASA file deployment on alphaagent.io (server-side coordination)

## Session Continuity

Last session: 2026-03-06
Stopped at: Completed 02-02-PLAN.md (dashboard view with wallet hero, quick links, business results)
Resume file: None
