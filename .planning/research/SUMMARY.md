# Project Research Summary

**Project:** Alpha Agent — Native Swift iOS App
**Domain:** Native iOS client portal (fintech / SaaS / learning platform hybrid)
**Researched:** 2026-03-05
**Confidence:** HIGH

---

## Executive Summary

Alpha Agent is a native Swift iOS client portal for insurance agents using the Alpha Hub platform at alphaagent.io. The core value proposition is giving clients glanceable access to their wallet balance, ad spend, billing history, real-time chat with support, and course learning — features that already exist in the web app but benefit from native mobile treatment. The research consensus is clear: build with Swift 6 + SwiftUI + iOS 17 minimum target, MVVM + Repository architecture, the Supabase Swift SDK as the sole backend client, and only three third-party dependencies (supabase-swift, Kingfisher, KeychainAccess). The existing web app's React hooks map almost directly to Swift ViewModels, making the translation well-defined and low-ambiguity.

The recommended approach is a four-phase delivery: (1) Foundation and core value — auth, dashboard, billing, and dark-first design system; (2) Communication — real-time chat and push notifications; (3) Learning and activation — courses, onboarding checklist, and agreement signing; (4) Growth and polish — referral sharing, WidgetKit home screen widgets, and offline caching. This ordering reflects the actual daily-use frequency of each feature and the technical dependency graph — authentication must come first, real-time infrastructure is needed before chat, and video platform selection must be locked in before building courses.

The dominant risks are App Store compliance and Supabase Realtime reliability on iOS. App Store rejection is highly probable without proactive setup of privacy manifests, demo accounts, and proper framing of billing display as "read-only account information." The Supabase Swift realtime client has documented GitHub issues with WebSocket disconnects during iOS background/foreground transitions — the reconnection and catch-up strategy must be designed before building chat, not after. Both risks are fully mitigatable with the prevention strategies documented in PITFALLS.md.

---

## Key Findings

### Recommended Stack

The stack is minimal by design: Swift 6 on iOS 17+ with SwiftUI as the UI framework and the Supabase Swift SDK covering all backend communication (auth, PostgREST, Realtime, Storage, Edge Functions). No networking layer (Alamofire, Moya) is needed — the Supabase SDK is the networking layer. No state management framework (TCA, Redux) is needed — the native `@Observable` macro with MVVM is the right fit for a data-display portal app.

iOS 17 as the minimum target is non-negotiable from an architecture standpoint: the `@Observable` macro (property-level re-render granularity) is foundational to the ViewModel pattern and only available on iOS 17+. Dropping to iOS 16 would require reverting to the legacy `ObservableObject` + `@Published` + Combine approach, adding ~3% user coverage at significant architectural cost. Xcode 16 is already required for App Store submissions as of April 2025.

**Core technologies:**
- Swift 6 + SwiftUI (iOS 17+): UI and language — best performance, Apple's active investment, `@Observable` macro
- `supabase-swift` 2.41.1: all backend communication — single package for auth, DB, Realtime, Storage, Edge Functions
- `@Observable` + MVVM + async/await: state management — native iOS 17, no third-party framework needed
- `NavigationStack` + Coordinator: routing — programmatic, type-safe, deep link capable
- AVKit + AVFoundation: video playback — native HLS support, PiP, AirPlay, no third-party needed
- APNs (direct, no Firebase): push notifications — iOS-only app, FCM is an unnecessary middleman
- Kingfisher 8.8.0: image loading and caching — SwiftUI-native `KFImage`, disk + memory cache
- KeychainAccess 4.2.2: secure token storage with Face ID integration
- Swift Package Manager: dependency management — CocoaPods goes read-only December 2026

**What to avoid:** TCA (over-engineered for a portal app), UIKit (legacy for new projects), Firebase/FCM (iOS-only, APNs is direct), CocoaPods (sunset Dec 2026), `AsyncImage` alone (no disk cache, no retry).

### Expected Features

The feature set ports the existing web app to native mobile with several mobile-only enhancements. The web app already has all the data models, edge functions, and RLS policies needed — the iOS app is a native client for an existing backend, not a new product.

**Must have (table stakes — Phase 1-2):**
- Authentication with Face ID / Touch ID (biometric with Keychain-secured tokens, not cosmetic LAContext)
- Dashboard with wallet balance hero card (the primary daily-check feature), key metrics, upcoming payments
- Billing history with transaction list, type filters, payment method display (read-only — no in-app payment processing)
- Real-time chat with message bubbles, read receipts, image attachments, business hours indicator
- Push notifications for chat messages, low balance alerts, payment reminders
- Dark-first design system (Coinbase/Tesla aesthetic, near-black backgrounds, semantic color system)
- Pull-to-refresh with haptic feedback and skeleton loading states

**Should have (differentiators — Phase 3-4):**
- Native AVKit video player for courses (PiP, background audio, progress resume, AirPlay)
- Onboarding checklist (animated, deep-linked, completion celebration)
- Agreement signing with PencilKit signature canvas and email OTP verification
- Referral dashboard with native share sheet and pre-populated share text
- WidgetKit home screen widgets (balance widget, unread messages widget, lock screen widget)
- Haptic feedback system throughout the app
- Spotlight search for courses and billing records

**Defer (post-MVP):**
- In-app Stripe payment entry (App Store IAP rules make this risky; direct to web)
- Admin panel features (client app is client-only; admin uses web)
- Apple Watch companion (very low demand for this use case)
- iPad-specific layouts (scale iPhone layout first)
- Complex charts and data visualization (web is better for this)
- Offline mode with SwiftData caching (add in Phase 4 as polish)

**Anti-features (explicitly avoid):**
- WKWebView for core features (defeats the purpose of native)
- Real-time WebSocket for non-chat data (battery drain; REST + pull-to-refresh is correct)
- In-app payment processing (Apple 30% cut risk, App Store review risk)
- Horizontal charts on mobile screens

### Architecture Approach

MVVM with a Repository layer is the correct pattern for this app. The web app's React hooks (`useClientWallet`, `useChat`, `useBillingRecords`) are essentially ViewModels — the iOS translation maps hook -> `@Observable` ViewModel, Supabase JS client query -> Repository method, `useEffect` -> `.task` modifier. The architecture has four layers: View (SwiftUI) -> ViewModel (`@Observable`, `@MainActor`) -> Repository (typed Supabase queries) -> Supabase SDK singleton.

The project structure is feature-based: `Core/` (auth, networking, realtime, push, navigation), `Models/` (Codable structs mirroring Supabase tables), `Repositories/` (one per domain), `Features/` (View + ViewModel pairs per screen), `DesignSystem/` (tokens, components). This mirrors how large-scale SwiftUI projects are organized and scales cleanly across four delivery phases.

The iOS app connects to the same Supabase project (`qcunascacayiiuufjtaq`) with the same anon key and same RLS policies as the web app. No backend changes are needed for read operations. This is a significant advantage — the data layer is fully proven in production.

**Major components:**
1. `AuthManager` — session lifecycle, biometric unlock, Keychain token storage; must be initialized at app launch and injected via environment
2. `RealtimeManager` — Supabase channel lifecycle, subscribe/unsubscribe tied to `scenePhase`, catch-up queries on reconnect; designed before chat is built
3. `AppRouter` — `@Observable` coordinator owning `NavigationStack` paths per tab + `TabView` selection; enables deep linking from push notifications
4. `PushNotificationManager` — APNs registration, device token upsert to `device_tokens` table, notification routing on tap
5. Repository layer (one per domain) — typed PostgREST queries returning `Codable` models; the only layer that touches the Supabase SDK directly
6. `DesignSystem` — color tokens, typography (SF Pro), shared components (card, button, badge, skeleton) — defined in Phase 1 and used by all subsequent phases

### Critical Pitfalls

1. **App Store rejection for privacy compliance** — Missing `PrivacyInfo.xcprivacy`, incomplete App Privacy Labels, or absent privacy policy URL causes guaranteed rejection (12% of submissions in Q1 2025 rejected for this). Create the privacy policy URL (`alphaagent.io/privacy`) before development, build the privacy manifest incrementally as SDKs are added, and declare financial data types in App Privacy Labels. Must start in Phase 1 and validate before submission.

2. **Supabase Realtime WebSocket disconnects on iOS background/foreground** — Documented GitHub issues (#593, #1088) confirm the Swift realtime client loses WebSocket connections on app backgrounding and enters reconnection loops. Build explicit lifecycle management (unsubscribe on background, resubscribe + fetch catch-up on foreground) and visual "disconnected" indicators before building chat UI. Use `NWPathMonitor` for network change detection and exponential backoff for reconnects.

3. **Supabase auth token expiry causing session loss** — The JWT auto-refresh only works while the app process is alive. If the app is force-killed and reopened after token expiry, the user gets 401 errors without graceful handling. Store session in Keychain (not UserDefaults), call `startAutoRefresh()` on launch, and build a graceful "session expired" flow that re-authenticates via biometrics rather than forcing full email/password re-entry.

4. **Biometric auth as security theater** — Using `LAContext.evaluatePolicy()` as a boolean gate without Keychain-backed storage is bypassable on jailbroken devices and creates a false sense of security. The auth token MUST be stored in Keychain with `SecAccessControlCreateFlags.biometryCurrentSet` access control. The biometric check IS the Keychain access mechanism, not a separate gate in front of it. Also requires `NSFaceIDUsageDescription` in Info.plist — its absence crashes the app at runtime.

5. **App Store rejection for missing demo account or billing display framing** — Apple reviewers cannot test billing features without a pre-populated demo account. Additionally, showing Stripe billing data without explicit framing (as "read-only account information, no in-app transactions") risks rejection under Guideline 3.1.1. Create the demo account in Phase 1 with realistic pre-populated data, and prepare App Review notes that explicitly explain the external billing model before submission.

6. **Video streaming from Supabase Storage** — Raw MP4 files in Supabase Storage lack adaptive bitrate, cause seeking failures on slow networks, and generate high egress costs. The existing web app uses Bunny CDN embed URLs — the iOS app must determine whether Bunny CDN provides direct HLS stream URLs (preferred for AVKit native player) or only iframe embeds (requires WKWebView fallback). This architectural decision must be made before building the courses phase.

---

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Foundation — Apple Account, Xcode Project, Auth, Design System

**Rationale:** Nothing builds without this. Auth is the dependency of every feature. Code signing and provisioning profile configuration must happen before any device testing is possible. The design system (color tokens, typography, shared components) must be defined before any screen is built to prevent the "dark mode as afterthought" pitfall. The privacy manifest must be created at project setup, not backfilled at submission time.

**Delivers:** Working Xcode project, Supabase auth (email/password + Face ID), biometric-secured Keychain session, dark-first design system with semantic color tokens, project folder structure, PrivacyInfo.xcprivacy scaffold, `AppRouter` coordinator, demo Apple Review account with pre-populated data.

**Addresses:** Authentication (table stakes), Face ID / Touch ID (table stakes), dark-first theming (table stakes)

**Avoids:** Pitfall 1 (privacy manifest), Pitfall 4 (auth token expiry), Pitfall 6 (code signing chaos), Pitfall 9 (dark mode afterthought), Pitfall 11 (biometric security theater), Pitfall 13 (deep link misconfiguration)

**Research flag:** LOW — well-documented patterns (Apple official docs, Supabase Swift tutorial). Standard approach, no phase-specific research needed.

---

### Phase 2: Core Value — Dashboard and Billing

**Rationale:** The single most important feature for daily engagement is the wallet balance / ad spend dashboard. Insurance agents check this multiple times daily. Shipping this (plus billing history) gives clients a concrete reason to install and keep the app. This phase uses only REST queries — no Realtime complexity — keeping scope contained.

**Delivers:** Dashboard screen (wallet balance hero card, key metrics, upcoming payments, quick actions), Billing screen (transaction list grouped by month, type filters, payment method display), pull-to-refresh, skeleton loading states, haptic feedback system.

**Addresses:** Wallet balance hero card, billing transaction history, key metrics summary, upcoming payment indicator, pull-to-refresh (all table stakes), haptic feedback (differentiator)

**Avoids:** Pitfall 2 (billing display framing — frame as read-only account info, hide any payment CTAs), Pitfall 7 (SwiftUI re-renders — use `LazyVStack` for transaction lists, proper `@Observable` property access patterns)

**Uses:** `BillingRepository`, `ClientRepository`, `DashboardViewModel`, `BillingViewModel`; mirrors existing `useClientWallet`, `useComputedWalletBalance`, `useBillingRecords` hooks

**Research flag:** LOW — existing web app provides the complete data model and query patterns. Direct translation exercise.

---

### Phase 3: Communication — Chat and Push Notifications

**Rationale:** Chat is the second reason clients open the portal. Push notifications are what makes the app sticky — without them, clients have no reason to check. These must be built together because a chat notification that does not deep-link to the conversation is a broken experience. The Realtime infrastructure is the technically riskiest component — it must be built with explicit lifecycle management from day one.

**Delivers:** Chat screen (real-time message bubbles, image attachments, read receipts, typing indicators, business hours banner), push notifications (chat messages, payment reminders, low balance alerts), APNs setup with device token storage, deep link routing from notification tap to conversation.

**Addresses:** Real-time chat (table stakes), push notifications (table stakes), unread badge on tab bar (table stakes), image/file attachments (table stakes), notification grouping (table stakes)

**Avoids:** Pitfall 3 (Realtime WebSocket disconnects — must implement scenePhase-aware subscribe/unsubscribe with catch-up queries), Pitfall 8 (APNs certificate vs key — use .p8 auth key, download immediately from Developer Portal)

**Uses:** `RealtimeManager`, `ChatRepository`, `ChatViewModel`, `PushNotificationManager`, Supabase Realtime channels, APNs HTTP/2 via Edge Function

**Research flag:** MEDIUM — the Supabase Swift Realtime reconnection behavior has known issues and may require workarounds not fully documented. The exact API surface for `decodeRecord` from `InsertAction` needs verification against the live SDK during implementation.

---

### Phase 4: Learning and Activation — Courses, Onboarding, Agreements

**Rationale:** Courses drive long-term client value but are not daily-use features. Agreement signing is a one-time critical flow for new client activation. Onboarding checklist is highest-impact for Day 7 retention. Group these because they share an "activation" theme and are independent of the Realtime infrastructure.

**Delivers:** Course browser and detail screens, native AVKit video player (PiP, background audio, progress tracking, chapter navigation), lesson completion marking, onboarding checklist (animated, deep-linked, celebration on completion), agreement signing with PencilKit signature canvas, email OTP verification with iOS auto-fill support.

**Addresses:** Native video player (differentiator), PiP (differentiator), progress resume (differentiator), onboarding checklist (differentiator), agreement signing (table stakes for new clients)

**Avoids:** Pitfall 10 (video streaming architecture — must use video CDN with HLS, not raw MP4 from Supabase Storage; Bunny CDN URL format must be confirmed before building)

**Uses:** `CourseRepository`, `CoursesViewModel`, AVKit `VideoPlayer`, `AVPlayer`, PencilKit `PKCanvasView`, `AgreementRepository`, edge function `send-agreement-otp`

**Research flag:** HIGH — Bunny CDN integration format (HLS stream URL vs iframe embed only) must be confirmed before this phase. If Bunny provides only iframe embeds, the video player falls back to WKWebView which changes the implementation significantly. Recommend a dedicated research spike at phase planning time.

---

### Phase 5: Growth and Polish — Referrals, Widgets, Offline

**Rationale:** These features add business growth mechanics and polish. Referrals drive client acquisition. WidgetKit home screen widgets increase daily glanceable engagement without requiring app opens. Offline awareness with cached data prevents the "blank screen" experience on poor connectivity. These are all independent from each other and can be sequenced within the phase.

**Delivers:** Referral dashboard (referral code, status tracking, reward amounts), native share sheet with pre-populated referral text, WidgetKit home screen widgets (balance widget, unread count widget, lock screen widget), App Groups for widget data sharing, Spotlight search integration for courses and billing, offline banner with NWPathMonitor, basic dashboard data caching.

**Addresses:** Referral dashboard (should have), home screen widget (differentiator), lock screen widget (differentiator), Spotlight search (differentiator), offline awareness (should have)

**Avoids:** Pitfall 15 (network error states — NWPathMonitor-based offline banner and cached data)

**Uses:** `ReferralRepository`, `ShareLink` / `UIActivityViewController`, WidgetKit `TimelineProvider`, App Groups, `CoreSpotlight`, `NWPathMonitor`

**Research flag:** MEDIUM — Universal Links for referral sharing require an AASA file at `alphaagent.io/.well-known/apple-app-site-association`, which is a server-side change. Must be coordinated with web app deployment. WidgetKit in iOS 26 (expected spring 2026) may have new APIs if the App Store release target is post-WWDC 2025.

---

### Phase 6: App Store Submission

**Rationale:** Submission is its own phase because it requires creating and validating all App Store metadata, final TestFlight QA, and navigating Apple Review. Attempting to submit without dedicated prep is a common source of 3-7 day rejection cycles.

**Delivers:** Published app on App Store. Pre-requisites: privacy policy URL live, App Privacy Labels complete, PrivacyInfo.xcprivacy validated, demo account with pre-populated data for all features, App Review notes explaining external billing model, 6.9-inch screenshots (1320x2868), all Info.plist entries correct.

**Avoids:** Pitfall 1 (privacy compliance), Pitfall 5 (missing demo account), Pitfall 12 (TestFlight surprises — use internal testers first), Pitfall 14 (screenshot dimension errors), Pitfall 16 (missing required reason API declarations)

**Research flag:** LOW — App Store submission requirements are well-documented. The phase is process-heavy, not technically novel.

---

### Phase Ordering Rationale

- **Authentication before everything else:** Auth is the literal dependency of every other feature. No screen works without a valid session.
- **Design system in Phase 1, not later:** Every screen built after Phase 1 uses the design system. Building screens before defining tokens results in the "dark mode as afterthought" pitfall — a guaranteed full-app visual refactor.
- **Dashboard before chat:** Dashboard is higher daily-use frequency and technically simpler (no Realtime). Shipping it first gives clients immediate value and validates the Supabase connection and RLS policies before adding Realtime complexity.
- **Realtime infrastructure designed before chat UI:** The reconnection/catch-up strategy must be the foundation of `RealtimeManager` — it cannot be added to existing code without significant refactor.
- **Video platform decision before courses:** The architectural split between native AVKit (HLS direct URL) and WKWebView (iframe fallback) is a branch point that affects every component in the Courses phase. Lock this decision before writing any courses code.
- **Referrals and widgets last:** They add growth mechanics and polish but do not block core functionality. Universal Links require server-side coordination — doing this last avoids blocking earlier phases on a web deployment dependency.

### Research Flags

Phases needing deeper research before planning:
- **Phase 4 (Courses / Video):** Bunny CDN URL format is critical — direct HLS stream vs iframe embed determines AVKit vs WKWebView. Requires inspection of existing `bunny_embed_url` values in the database and Bunny CDN dashboard. Run a dedicated spike before planning this phase.
- **Phase 3 (Realtime / Chat):** The exact reconnect behavior of `supabase-swift` 2.41.x should be tested against the actual production project (not just read from GitHub issues) before committing to a reconnection architecture. A short proof-of-concept is recommended at phase start.
- **Phase 5 (Referrals / Universal Links):** Coordinate AASA file deployment on `alphaagent.io` with web team before planning this phase.

Phases with standard patterns (no deep research needed):
- **Phase 1 (Foundation):** Apple Developer account setup, code signing with automatic signing, Supabase Swift SDK initialization — all well-documented with official sources.
- **Phase 2 (Dashboard/Billing):** Direct translation of existing web hooks to Swift ViewModels. Data models are proven in production.
- **Phase 6 (Submission):** App Store metadata and screenshot requirements are stable and well-documented.

---

## Conflicts and Tensions Between Research Findings

1. **Native video player vs Bunny CDN embed format:** FEATURES.md recommends native AVKit for a premium course experience (PiP, background audio, AirPlay). ARCHITECTURE.md notes the web app uses `bunny_embed_url` which may be an iframe embed URL, not a direct HLS stream. If Bunny provides only embeds, the "native player" feature becomes a WKWebView — less premium but acceptable. PITFALLS.md warns against WKWebView for core features. Resolution: confirm Bunny CDN URL format as the first task of Phase 4 planning.

2. **Minimal dependencies vs feature richness:** STACK.md advocates for exactly 3 third-party dependencies to minimize build complexity and breaking changes. FEATURES.md lists Spotlight search (CoreSpotlight — native), PencilKit signature (native), WidgetKit (native), and Universal Links (native) — all achievable without additional dependencies. No real conflict here; the native framework depth of iOS 17 covers the feature set without additional libraries.

3. **App Store IAP rules vs billing display:** PITFALLS.md flags potential App Store Guideline 3.1.1 risk for displaying Stripe billing data. FEATURES.md recommends showing billing read-only as a table stakes feature. The resolution from PITFALLS.md is clear: frame as "read-only account information," remove any payment CTAs from the iOS app, and prepare explicit App Review notes. This is a UX design choice (remove "Pay Now" buttons), not an architectural one.

4. **Real-time "everywhere" vs battery drain:** FEATURES.md lists real-time as an expected pattern for chat. FEATURES.md anti-features section explicitly recommends against real-time WebSocket for non-chat data to preserve battery. STACK.md's Supabase Realtime documentation supports both. Resolution is clear: Realtime only for chat messages and typing indicators. Everything else (dashboard, billing, courses) uses REST + pull-to-refresh. Both research files agree on this.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major technology choices verified against official Apple and Supabase documentation. Version numbers confirmed from GitHub releases. iOS adoption rates from community sources but multiple converging sources agree. |
| Features | MEDIUM-HIGH | Core features verified against existing web app codebase (direct inspection). iOS-specific patterns (haptics, WidgetKit, PiP) verified against Apple official docs. Some engagement statistics (haptic interaction time boost, checklist retention lift) from single or self-serving sources — treat as directionally correct but not precise. |
| Architecture | MEDIUM-HIGH | MVVM + Repository is verified as community consensus for production SwiftUI (2025-2026). Folder structure is opinionated convention, not Apple-mandated. Supabase Swift SDK PostgREST query API verified from official docs. Realtime `InsertAction.decodeRecord` exact method signature needs runtime verification. |
| Pitfalls | HIGH | Critical pitfalls (privacy manifest, Realtime reconnect, auth token expiry, biometric security) verified via Apple official documentation and tracked GitHub issues with specific issue numbers. App Store rejection risk around billing display is MEDIUM confidence — US external payments rule verified, but how reviewers interpret read-only billing displays varies case-by-case. |

**Overall confidence: HIGH**

The research is grounded in verified sources (official Apple docs, official Supabase Swift SDK, live codebase inspection). The main areas of genuine uncertainty are the Bunny CDN video URL format, the exact Supabase Realtime reconnect behavior under iOS backgrounding, and App Store reviewer interpretation of billing display. All three are resolvable with short spikes before the relevant phases.

### Gaps to Address

- **Bunny CDN video format:** Inspect actual `bunny_embed_url` values in the production Supabase database before planning Phase 4. Determine whether Bunny CDN provides direct stream URLs (`.m3u8` HLS manifest) or only player embed codes.
- **Supabase Realtime reconnect behavior:** Build a proof-of-concept channel subscription at the start of Phase 3 and test background/foreground transitions on a real device (not simulator). Validate whether the documented GitHub issues (#593, #1088) are resolved in v2.41.x or still present.
- **APNs delivery architecture:** Decide between (a) Supabase Edge Function triggered by database webhook, (b) database trigger calling pg_net to an Edge Function, or (c) a third-party push service (OneSignal). The existing backend already has pg_cron and Edge Functions — option (a) or (b) is the natural fit, but the exact trigger mechanism needs to be defined before Phase 3.
- **App Store review strategy for billing:** Prepare the App Review note text explaining the external billing model before first submission attempt. Draft this during Phase 2 when billing UI is being built.
- **Legal validity of PencilKit signature:** Confirm with counsel whether a finger-drawn PencilKit signature on iOS carries the same legal weight as the web canvas signature. This is a business/legal question, not a technical one, and does not block development.

---

## Sources

### Primary (HIGH confidence)
- Supabase Swift SDK GitHub v2.41.1 — auth, PostgREST, Realtime, Storage, Edge Functions API
- Apple Developer Docs: LocalAuthentication, AVKit VideoPlayer, WidgetKit, Universal Links, APNs Registration
- Apple App Review Guidelines — rejection criteria and privacy requirements
- Apple Screenshot Specifications — device size requirements
- Apple Privacy Manifest Files Documentation — PrivacyInfo.xcprivacy requirements
- Existing Alpha Hub web codebase at `/Users/forren/workspace/copy-alphahub/` — all data models, hooks, edge functions inspected directly
- Apple SDK Requirements Advisory (Feb 2025) — Xcode 16 / iOS 18 SDK requirement

### Secondary (MEDIUM confidence)
- supabase-swift GitHub issues #593, #579 — Realtime reconnect behavior
- supabase/realtime GitHub issue #1088 — TIMED_OUT reconnection loop
- supabase-swift GitHub issue #733 — session loss during infrastructure events
- SwiftLee, Hacking with Swift, Matteomanferdini — MVVM + @Observable architectural patterns
- Coinbase Design System — theming and component patterns reference
- iOS version adoption statistics (early 2026) — deployment target rationale

### Tertiary (LOW confidence, directional only)
- Engagement statistics for haptics, onboarding checklists, dark mode adoption — cited from single or self-serving sources; treat as directional signals, not precise metrics
- WidgetKit in iOS 26 WWDC 2025 session notes — new APIs may affect Phase 5 implementation

---

*Research completed: 2026-03-05*
*Ready for roadmap: yes*
