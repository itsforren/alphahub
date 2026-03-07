# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-03-05)

**Core value:** Clients can manage their entire Alpha Hub experience from their phone -- wallet, chat, courses, referrals -- with real-time sync to the web app.
**Current focus:** Phase 3: Communication (In Progress)

## Current Position

Phase: 3 of 6 (Communication)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-03-07 -- Completed 03-01-PLAN.md (chat core: models, realtime, UI)

Progress: [########░░░] ~47%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~12min
- Total execution time: ~95 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | ~66min | ~22min |
| 02-core-value | 4/4 | ~20min | ~5min |
| 03-communication | 1/3 | ~9min | ~9min |

**Recent Trend:**
- Last 5 plans: 02-02 (4min), 02-03 (4min), 02-04 (6min), 03-01 (9min)
- Trend: chat plan took longer due to Realtime API research and WebSocket integration

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
- 02-03: PaymentMethodCards stub in Task 1, full implementation in Task 2 (same pattern as 02-02)
- 02-03: Month sorting uses parse-back-to-Date for chronological order (not alphabetical)
- 02-03: UISegmentedControl.appearance() for dark theme segmented control styling
- 02-04: Custom inline search bar instead of .searchable (requires List context; dashboard uses ScrollView)
- 02-04: LeadStatusPill accepts raw String for flexibility with unknown statuses
- 02-04: Chart handles single data point with PointMark (LineMark invisible with 1 point)
- 03-01: AsyncStream-based Realtime API (postgresChange returns AsyncStream, iterated in Tasks)
- 03-01: White accent client bubbles, elevated surface admin bubbles (Tesla dark aesthetic)
- 03-01: Direct await for markMessagesAsRead (PostgrestResponse<Void> not Sendable)
- 03-01: supabase.functions.invoke for chat notifications (fire-and-forget)

### Pending Todos

None.

### Blockers/Concerns

- Phase 3 blocker RESOLVED: Supabase Realtime Swift client WebSocket disconnect issues handled via explicit disconnect on background, reconnect + catch-up on foreground
- Phase 4: Bunny CDN video URL format must be confirmed (HLS stream vs iframe embed) before building course video player
- Phase 5: Universal Links for referral sharing require AASA file deployment on alphaagent.io (server-side coordination)

## Session Continuity

Last session: 2026-03-07
Stopped at: Completed 03-01-PLAN.md (chat core: models, realtime, UI)
Resume file: None
