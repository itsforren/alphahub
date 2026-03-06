---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [swiftui, design-system, navigation, inter-font, haptics, glass-effect, tab-bar, ios17]

requires:
  - phase: 01-01
    provides: Xcode project skeleton with supabase-swift SPM dependency and folder hierarchy
  - phase: 01-02
    provides: AuthManager with userRole, BiometricManager, RootView routing, PlaceholderView

provides:
  - Dark OLED design system (AppColors, AppTypography, AppSpacing, HapticManager)
  - Inter font TTFs registered in app bundle (Regular, Medium, SemiBold, Bold)
  - GlassCard and HeroNumber reusable components
  - GlassEffect ViewModifier (.glassCard())
  - ClientTab and AdminTab enums with icon/title metadata
  - AppRouter @Observable for programmatic tab switching
  - Role-based tab navigation: client 5-tab (Home, Wallet, Chat, Courses, More) / admin 4-tab (Dashboard, Clients, Chat, More)
  - FloatingTabBar with ultraThinMaterial capsule, spring animation, and sensoryFeedback haptics
  - PrivacyInfo.xcprivacy privacy manifest
  - MainTabView wired into RootView replacing PlaceholderView

affects: [02-01, 02-02, 02-03, 03-01, all-future-plans]

tech-stack:
  added: [Inter font (Google Fonts static TTF), fonttools (WOFF-to-TTF conversion)]
  patterns:
    - "Design tokens via static enums (AppColors, AppTypography, AppSpacing)"
    - "Glass effect via .ultraThinMaterial — NOT .glassEffect() which requires iOS 26"
    - "Custom FloatingTabBar overlay on hidden native TabView (.toolbar(.hidden, for: .tabBar))"
    - "NavigationStack inside each tab, not wrapping the outer TabView"
    - ".sensoryFeedback(.selection, trigger: selection) for declarative haptics on tab switch"
    - "AppRouter @Observable injected via .environment() for future deep link / push notification routing"
    - ".tag() API on TabView tabs (not iOS 18 Tab(value:content:) type)"

key-files:
  created:
    - AlphaHub/Core/Design/Theme.swift
    - AlphaHub/Core/Design/Fonts.swift
    - AlphaHub/Core/Design/AppSpacing.swift
    - AlphaHub/Core/Design/HapticManager.swift
    - AlphaHub/Core/Navigation/Tab.swift
    - AlphaHub/Core/Navigation/AppRouter.swift
    - AlphaHub/Shared/Components/GlassCard.swift
    - AlphaHub/Shared/Components/HeroNumber.swift
    - AlphaHub/Shared/Modifiers/GlassEffect.swift
    - AlphaHub/Features/Shell/MainTabView.swift
    - AlphaHub/Features/Shell/ClientTabView.swift
    - AlphaHub/Features/Shell/AdminTabView.swift
    - AlphaHub/Features/Shell/FloatingTabBar.swift
    - AlphaHub/Resources/Fonts/Inter-Regular.ttf
    - AlphaHub/Resources/Fonts/Inter-Medium.ttf
    - AlphaHub/Resources/Fonts/Inter-SemiBold.ttf
    - AlphaHub/Resources/Fonts/Inter-Bold.ttf
    - AlphaHub/PrivacyInfo.xcprivacy
  modified:
    - AlphaHub/App/AlphaHubApp.swift
    - AlphaHub/Features/Placeholder/PlaceholderView.swift
    - AlphaHub/Info.plist
    - AlphaHub/AlphaHub.xcodeproj/project.pbxproj

key-decisions:
  - "Used .tag() API instead of Tab(value:content:) — Tab type requires iOS 18+, deployment target is iOS 17.0"
  - "Inter font TTFs converted from WOFF using fonttools (python3 -m fonttools) — Google Fonts no longer serves TTF directly from download ZIP in all cases"
  - "Used .ultraThinMaterial for all glass effects — .glassEffect() is iOS 26+ only, would break iOS 17 target"
  - "FloatingTabBar overlays hidden native TabView rather than a fully custom tab system — preserves native SwiftUI tab state management"
  - "NavigationStack placed inside each tab content view, not wrapping the outer TabView — prevents navigation state collisions between tabs"
  - "AppRouter @Observable injected at app root — enables future programmatic tab switching from push notification deep links (Phase 3)"
  - "admin and member UserRole values route to AdminTabView; client, referrer, and guest route to ClientTabView"

patterns-established:
  - "Design tokens: static enum members (AppColors.pureBlack, AppTypography.heroLarge, AppSpacing.md)"
  - "Glass components: .ultraThinMaterial + white border (opacity 0.1) + black shadow (opacity 0.3)"
  - "Haptics: HapticManager for imperative ViewModel calls; .sensoryFeedback() for declarative SwiftUI view triggers"
  - "Tab navigation: hidden native TabView + FloatingTabBar overlay pattern"
  - "Role routing: MainTabView(role:) switches on UserRole, delegates to ClientTabView or AdminTabView"
  - "Font registration: AppFonts.registerFonts() called from AlphaHubApp.init(), logs warning on missing font"

duration: ~35min
completed: 2026-03-05
---

# Plan 01-03: Design System and Tab Navigation Summary

**Dark OLED design system with Inter typography, glass effects, and role-based floating pill tab bar wired into the authenticated app shell**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-05T23:40:00Z
- **Completed:** 2026-03-05T~~:~~:~~Z (user-approved checkpoint)
- **Tasks:** 2/2 auto + 1 human-verify checkpoint (approved)
- **Files created:** 19
- **Files modified:** 4

## Accomplishments

- OLED-optimized dark design system: AppColors (pure black, elevated surfaces, accent, semantic colors), AppTypography (Inter 9 named styles), AppSpacing (7-step scale), HapticManager (impact/notification/selection)
- Inter font bundle: Regular, Medium, SemiBold, Bold TTFs registered via Info.plist and AppFonts.registerFonts() with graceful fallback logging
- Reusable glass components: GlassCard (ultraThinMaterial + border + shadow), HeroNumber (large financial number display), GlassEffect ViewModifier (.glassCard())
- Role-based tab navigation: ClientTabView (5 tabs) and AdminTabView (4 tabs) with custom FloatingTabBar floating glass capsule
- FloatingTabBar: ultraThinMaterial capsule, spring animation, .sensoryFeedback(.selection) haptics, safe area padding
- AppRouter @Observable injected at app root for future push notification deep linking
- MainTabView wired into RootView — authenticated users land in tabbed shell instead of PlaceholderView
- PrivacyInfo.xcprivacy privacy manifest with NSPrivacyTracking: false

## Task Commits

1. **Task 1: Design system — color tokens, typography, spacing, haptics, glass effects** - `3409f4e` (feat)
2. **Task 2: Tab navigation shell, floating pill tab bar, role-based routing, privacy manifest** - `d8acad4` (feat)

## Files Created/Modified

### Core Design
- `AlphaHub/Core/Design/Theme.swift` - AppColors and AppTypography tokens (Color(hex:) extension included)
- `AlphaHub/Core/Design/Fonts.swift` - AppFonts.registerFonts() with missing-font warnings
- `AlphaHub/Core/Design/AppSpacing.swift` - 7-step spacing scale (xs through xxl, screenPadding)
- `AlphaHub/Core/Design/HapticManager.swift` - Centralized UIImpactFeedbackGenerator wrapper (impact/notification/selection)

### Core Navigation
- `AlphaHub/Core/Navigation/Tab.swift` - ClientTab and AdminTab enums (title, icon, CaseIterable, Hashable)
- `AlphaHub/Core/Navigation/AppRouter.swift` - @Observable router with clientTab and adminTab state

### Shared Components
- `AlphaHub/Shared/Components/GlassCard.swift` - Reusable glass card (ultraThinMaterial, corner radius 20, border, shadow)
- `AlphaHub/Shared/Components/HeroNumber.swift` - Large financial number (value, label, optional prefix, size variants)
- `AlphaHub/Shared/Modifiers/GlassEffect.swift` - GlassEffectModifier + View.glassCard() extension

### Shell Feature
- `AlphaHub/Features/Shell/MainTabView.swift` - Role-based tab container (client vs admin routing)
- `AlphaHub/Features/Shell/ClientTabView.swift` - 5-tab layout with hidden TabView + FloatingTabBar overlay
- `AlphaHub/Features/Shell/AdminTabView.swift` - 4-tab layout with same pattern
- `AlphaHub/Features/Shell/FloatingTabBar.swift` - Custom floating capsule tab bar (generic over TabItem protocol)

### Resources
- `AlphaHub/Resources/Fonts/Inter-Regular.ttf`
- `AlphaHub/Resources/Fonts/Inter-Medium.ttf`
- `AlphaHub/Resources/Fonts/Inter-SemiBold.ttf`
- `AlphaHub/Resources/Fonts/Inter-Bold.ttf`

### Privacy
- `AlphaHub/PrivacyInfo.xcprivacy` - Apple privacy manifest (NSPrivacyTracking: false, UserDefaults reason CA92.1)

### Modified
- `AlphaHub/App/AlphaHubApp.swift` - Added AppRouter @State, .environment(router), AppFonts.registerFonts(), replaced PlaceholderView with MainTabView(role:)
- `AlphaHub/Features/Placeholder/PlaceholderView.swift` - Updated to accept title, icon, showSignOut parameters for reuse as tab placeholders
- `AlphaHub/Info.plist` - Added UIAppFonts array with 4 Inter font filenames
- `AlphaHub/AlphaHub.xcodeproj/project.pbxproj` - Added all new source files, TTF resources, xcprivacy to target

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `.tag()` API instead of `Tab(value:content:)` | `Tab` type is iOS 18+ — deployment target is iOS 17.0, must use legacy `.tag()` pattern |
| `fonttools` for WOFF-to-TTF conversion | Google Fonts download ZIPs no longer reliably include raw TTF; fonttools `python3 -m fonttools ttLib.woff2` converts cleanly |
| `.ultraThinMaterial` throughout | `.glassEffect()` is iOS 26+; `ultraThinMaterial` achieves identical look on iOS 17+ |
| FloatingTabBar overlay on hidden native TabView | Preserves SwiftUI tab state management without reimplementing it; `.toolbar(.hidden, for: .tabBar)` hides stock tab bar |
| NavigationStack inside each tab | Prevents navigation state collisions across tabs (research pitfall #4) |
| AppRouter at app root | Needed for Phase 3 push notification deep links — router can programmatically switch tabs |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used `.tag()` API instead of `Tab(value:content:)` for TabView**
- **Found during:** Task 2 (Tab navigation shell)
- **Issue:** Plan referenced `Tab(value:content:)` initializer pattern which requires iOS 18+. Deployment target is iOS 17.0, causing compile error.
- **Fix:** Used `.tag(ClientTab.home)` / `.tag(AdminTab.dashboard)` pattern with `selection` binding — the pre-iOS 18 TabView API
- **Files modified:** ClientTabView.swift, AdminTabView.swift
- **Committed in:** d8acad4 (Task 2 commit)

**2. [Rule 3 - Blocking] Converted Inter font WOFF to TTF using fonttools**
- **Found during:** Task 1 (Font setup)
- **Issue:** Google Fonts no longer serves TTF directly from the download ZIP in all cases; files were in WOFF2 format which iOS cannot load via UIAppFonts
- **Fix:** Ran `python3 -m fonttools ttLib.woff2 decompress` on each WOFF2 file to produce valid TTF binaries
- **Files modified:** Inter-Regular.ttf, Inter-Medium.ttf, Inter-SemiBold.ttf, Inter-Bold.ttf
- **Committed in:** 3409f4e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for iOS 17 compatibility and font loading. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None - fonts are bundled, no external service configuration required.

## Next Phase Readiness

- Complete auth-to-shell flow works end-to-end: login -> biometric -> tabbed shell -> sign out -> login
- Design tokens (AppColors, AppTypography, AppSpacing) available for all Phase 2+ screens
- GlassCard and HeroNumber components ready to use in Phase 2 dashboard / billing screens
- FloatingTabBar established as the navigation pattern — Phase 2 features plug in as tab content
- AppRouter ready for Phase 3 push notification deep linking
- Phase 1 complete — all 3 plans delivered: project skeleton, auth flow, design system + navigation

---
*Phase: 01-foundation*
*Completed: 2026-03-05*
