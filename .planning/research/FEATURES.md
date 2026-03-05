# Feature Landscape: Alpha Agent iOS App

**Domain:** Premium native iOS client portal (fintech / SaaS / learning platform hybrid)
**Researched:** 2026-03-05
**Mode:** Ecosystem research -- features dimension
**Overall confidence:** MEDIUM-HIGH (verified against existing web app codebase + iOS design pattern research)

---

## Context: What Already Exists on Web

The Alpha Hub web app (`alphaagent.io`) has these client-facing features that the iOS app must port or reinterpret:

| Web Feature | Key Components | Data Source |
|-------------|----------------|-------------|
| Wallet balance / ad spend tracking | `CompactWalletWidget`, `AdSpendWalletWidget` | `client_wallets`, `wallet_transactions`, `ad_spend_daily` |
| Billing records & history | `BillingWidget`, `BillingRecordsTable` | `billing_records` (management + ad_spend types) |
| Payment methods (view-only on client side) | `PaymentMethodCard` | `client_payment_methods` (two Stripe accounts) |
| Upcoming payments | `UpcomingPaymentsWidget` | `billing_records` with future due dates |
| Real-time chat with admin | `ChatPanel`, `ChatBubble`, `ChatMessage` | `chat_conversations`, `chat_messages` (Supabase realtime) |
| Course/video learning | `CourseDetail`, `LessonView` (Bunny CDN embed) | `courses`, `modules`, `lessons`, `lesson_progress` |
| Onboarding checklist | `OnboardingTasksWidget` | `onboarding_tasks` |
| Agreement signing (OTP + signature) | `AgreementSigningWidget`, `EmailOTPVerification` | `agreements`, `agreement_templates` |
| Referral tracking | `useReferralData` hook | `referral_codes`, `referrals`, `referral_rewards` |
| Client profile & metrics | `ClientDetailView`, `HeroStatsCard` | `clients`, various metrics tables |
| Support tickets | `SupportTicketPanel` | tickets system |
| Lead metrics / daily spend chart | `LeadsWidget`, `DailySpendChart` | `lead_metrics`, `ad_spend_daily` |

---

## Table Stakes

Features users expect from a premium iOS client portal. Missing any = app feels incomplete or unprofessional.

### 1. Dashboard / Home Screen

| Feature | Why Expected | Complexity | iOS Pattern | Notes |
|---------|--------------|------------|-------------|-------|
| **Wallet balance hero card** | First thing clients check -- "how much do I have left?" | Low | Large prominent number at top of scroll view, color-coded (green/orange/red based on threshold). Robinhood-style: biggest number dominates the viewport. | Existing: `CompactWalletWidget` shows remaining balance, tracked spend, deposits |
| **Key metrics summary** | Clients need leads/cost-per-lead at a glance | Low | Horizontal scroll of metric cards (2-3 visible). Coinbase-style stat pills. | Existing: `HeroStatsCard`, `MetricCard` |
| **Upcoming payment indicator** | Clients need to know what's due and when | Low | Small card or banner below balance. Red accent if overdue. | Existing: `UpcomingPaymentsWidget` |
| **Quick action buttons** | Mobile users expect 1-tap access to key actions | Low | 2x2 grid or horizontal row of icon buttons (Chat, Courses, Billing, Referrals) | New for mobile -- web uses sidebar nav |
| **Pull-to-refresh** | Universal iOS expectation | Low | Native `UIRefreshControl` / SwiftUI `.refreshable`. Haptic feedback on completion (UIImpactFeedbackGenerator, medium weight). | [Confidence: HIGH -- standard iOS pattern] |
| **Skeleton loading states** | Premium feel during data fetch | Low | Shimmer placeholders matching layout shape. Show on first load only, not pull-to-refresh. | [Confidence: HIGH -- industry standard per research] |

### 2. Billing & Transaction History

| Feature | Why Expected | Complexity | iOS Pattern | Notes |
|---------|--------------|------------|-------------|-------|
| **Transaction list (scrollable)** | Clients need full financial history | Med | Sectioned `List` grouped by month. Each row: icon (type), description, amount (green for deposit, red for spend), date. Apple Wallet receipt style. | Existing: `BillingRecordsTable` shows records with status/type filters |
| **Filter by type** | Two billing types (ad_spend + management) | Low | Segmented control at top (All / Ad Spend / Management). Native `Picker` with `.segmented` style. | Existing: `filterType` state in `BillingWidget` |
| **Status badges** | Show paid/pending/overdue at a glance | Low | Colored capsule badges inline. SF Symbols for status icons (checkmark.circle.fill, clock.fill, exclamationmark.triangle.fill). | Existing: `BillingStatusBadge` |
| **Payment method cards (view-only)** | Clients need to see what card is on file | Low | Card-style display with brand icon (Visa/MC/Amex), last 4, expiry. No edit -- managed via web/admin. | Existing: `PaymentMethodCard` with `card_brand`, `card_last_four` |
| **Transaction detail sheet** | Tap for full details | Low | Bottom sheet (`.sheet` modifier) with invoice/charge details, date, receipt link | New for mobile -- web uses modal |

### 3. Real-Time Chat

| Feature | Why Expected | Complexity | iOS Pattern | Notes |
|---------|--------------|------------|-------------|-------|
| **Message bubbles** | Core chat experience | Med | Right-aligned blue bubbles (client), left-aligned gray bubbles (admin). Rounded corners (18pt radius). Avatar for admin messages. Tail on last message in group. | Existing: `ChatBubble`, `ChatMessage` components |
| **Real-time message delivery** | Messages must appear instantly | High | Supabase Realtime via `supabase-swift` WebSocket subscription on `chat_messages`. Optimistic insert on send. | Existing: web uses Supabase realtime channels |
| **Unread badge on tab** | Users need to know they have messages | Low | Badge count on Chat tab bar item. Red dot / numeric badge. | Existing: `unread_count_client` field on conversations |
| **Business hours indicator** | Set expectations for response time | Low | Banner at top of chat: "We typically respond within 1 hour" or "Outside business hours -- we'll reply tomorrow." | Existing: `BusinessHoursBanner`, `isWithinBusinessHours()` |
| **Image/file attachments** | Send screenshots, documents | Med | Camera + photo library picker. Display inline previews. Use Supabase Storage for upload. | Existing: `attachment_url`, `attachment_type` fields on messages |
| **Typing indicators** | Feel like a live conversation | Low | Animated dots (three bouncing circles) when admin is typing. Supabase Realtime presence or broadcast channel. | Standard chat pattern. Web may not have this yet. |
| **Read receipts** | Know when admin has seen your message | Low | Small "Read" text or double-check icon below message. Based on `read_at` field. | Existing: `read_at` field on `ChatMessage` |
| **Link previews** | URLs should preview nicely | Med | Fetch Open Graph metadata, show card preview. | Existing: `LinkPreview` component on web |

### 4. Biometric Authentication (Face ID / Touch ID)

| Feature | Why Expected | Complexity | iOS Pattern | Notes |
|---------|--------------|------------|-------------|-------|
| **Face ID on app launch** | Premium security expectation. 90%+ iOS users have Face ID. | Med | `LocalAuthentication` framework. `LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)`. Required: `NSFaceIDUsageDescription` in Info.plist. | [Confidence: HIGH -- Apple official docs] |
| **Fallback to passcode** | Not all devices have biometrics; biometrics can fail | Low | `LAContext` fallback to `.deviceOwnerAuthentication` (includes device passcode). Always provide "Use Password" button. | [Confidence: HIGH -- Apple requires fallback] |
| **Remember session (configurable)** | Don't force Face ID every time | Low | User setting: "Require Face ID: Always / After 5 min / After 1 hour / Never". Store preference in Keychain. | Common pattern in banking/fintech apps |
| **Lock screen on background** | Protect financial data when app goes to background | Low | Blur overlay or splash screen when entering background (`scenePhase` in SwiftUI). Re-require Face ID on return. | [Confidence: HIGH -- standard fintech pattern] |

### 5. Push Notifications

| Feature | Why Expected | Complexity | iOS Pattern | Notes |
|---------|--------------|------------|-------------|-------|
| **New chat message** | Primary engagement driver | Med | APNs via Supabase Edge Function or database webhook. Category: `CHAT_MESSAGE` with "Reply" action. Thread ID = conversation ID for grouping. | Requires APNs certificate setup + Supabase push integration |
| **Payment due reminder** | Financial obligation awareness | Med | Scheduled from backend when billing record approaches due date. | Backend logic needed |
| **Low wallet balance alert** | Prevent service interruption | Med | Triggered when balance drops below `low_balance_threshold`. | Existing: threshold logic in `CompactWalletWidget` |
| **Course new content** | Drive course engagement | Low | Sent when new lesson/module published. | Backend trigger |
| **Notification grouping** | Prevent notification spam | Low | Use `threadIdentifier` on `UNNotificationContent` to group by type (chat, billing, courses). | [Confidence: HIGH -- Apple API docs] |
| **Badge management** | Accurate unread count on app icon | Low | Set badge to total unread count (chat messages + pending actions). Clear on relevant screen visit. | [Confidence: HIGH -- standard UNUserNotificationCenter pattern] |

### 6. Dark Mode / Theming

| Feature | Why Expected | Complexity | iOS Pattern | Notes |
|---------|--------------|------------|-------------|-------|
| **Dark-first design** | Project requirement -- Tesla/Coinbase aesthetic. 90%+ iOS users use dark mode. | Med | Design in dark mode first, then adapt for light. Use `Color` assets with dark/light variants. Near-black backgrounds (#0A0A0A to #141414), not pure black. | [Confidence: HIGH -- 90% dark mode usage per 2025-2026 research] |
| **Respect system setting** | iOS users expect app to follow system theme | Low | SwiftUI `@Environment(\.colorScheme)`. Option to override in settings (System / Dark / Light). | [Confidence: HIGH -- Apple HIG] |
| **Accent color system** | Brand consistency | Low | Define 2-3 accent colors (primary blue, success green, warning amber, destructive red). Use `Color.accentColor`. | Existing web: uses blue-500, green-500, red-500 gradients |
| **OLED-optimized blacks** | Battery savings, premium look on OLED iPhones | Low | Use true black (#000000) sparingly for backgrounds on OLED devices. Slightly elevated surfaces at #0D0D0D to #1A1A1A for depth. | [Confidence: MEDIUM -- design best practice per research, not Apple official] |

---

## Differentiators

Features that are not expected but create competitive advantage and premium feel.

### 7. Home Screen Widget (WidgetKit)

| Feature | Value Proposition | Complexity | iOS Pattern | Notes |
|---------|-------------------|------------|-------------|-------|
| **Wallet balance widget** | Glanceable balance without opening app. Capital One does this. | Med | WidgetKit with `TimelineProvider`. Small (2x2) and medium (4x2) sizes. Shows: balance, trend arrow, last update time. | [Confidence: HIGH -- WidgetKit well-documented, Capital One example verified] |
| **Unread messages widget** | See if admin has messaged without opening app | Med | Same WidgetKit timeline. Shows unread count + last message preview. Deep link to chat on tap. | Uses `WidgetURL` for deep linking |
| **Lock screen widget** | iOS 16+ lock screen glanceability | Med | WidgetKit `accessoryRectangular` / `accessoryCircular` families. Balance number or unread count. | [Confidence: HIGH -- Apple API, iOS 16+] |

### 8. Haptic Feedback System

| Feature | Value Proposition | Complexity | iOS Pattern | Notes |
|---------|-------------------|------------|-------------|-------|
| **Contextual haptics** | Premium tactile feel. Studies show 50% more interaction time. | Low | `UIImpactFeedbackGenerator(.medium)` on button taps. `UINotificationFeedbackGenerator` for success/error. `UISelectionFeedbackGenerator` on scroll through filter options. | [Confidence: HIGH -- Apple API, multiple sources confirm engagement boost] |
| **Pull-to-refresh haptic** | Satisfying refresh confirmation | Low | Trigger `.success` notification feedback when refresh completes. | [Confidence: HIGH -- standard iOS practice] |
| **Transaction completion vibration** | Confirm financial actions | Low | `.success` notification feedback when payment confirms, deposit processes. | Common in fintech apps |

### 9. Native Video Player (Course Learning)

| Feature | Value Proposition | Complexity | iOS Pattern | Notes |
|---------|-------------------|------------|-------------|-------|
| **Native AVKit player** | Buttery smooth playback vs web embed. Full iOS integration (AirPlay, PiP, Now Playing). | Med | `AVKit.VideoPlayer` SwiftUI view wrapping `AVPlayer`. Automatic controls, AirPlay, PiP support built-in. | Existing web: Bunny CDN embed (`bunny_embed_url`). iOS should use direct HLS stream URL if available, or embed in WKWebView as fallback. |
| **Picture-in-Picture** | Watch lessons while browsing app | Med | `AVPictureInPictureController`. Requires `Audio, AirPlay, and Picture in Picture` background mode capability. AVKit provides this free with standard player. | [Confidence: HIGH -- Apple official docs] |
| **Background audio** | Listen to lesson audio while phone is locked | Low | AVAudioSession `.playback` category. Already enabled with PiP capability. | [Confidence: HIGH -- standard AVFoundation pattern] |
| **Progress resume** | Pick up exactly where you left off | Med | Save `currentTime` to `lesson_progress` on pause/background. Restore on next view. | Existing: web tracks `timeSpentRef` and saves every 30 seconds |
| **Chapter/module navigation** | Browse course structure while watching | Med | Side sheet or bottom sheet with module/lesson list. Highlight current lesson. Tap to jump. | Existing: `CourseDetail` has accordion module list |
| **Lesson completion marking** | Track learning progress | Low | Button to mark complete. Auto-mark at 90% video progress. Confetti/haptic on completion. | Existing: `isCompleted` state, `saveTimeSpent()` |
| **Downloadable resources** | Access PDFs/attachments per lesson | Low | `UIDocumentInteractionController` or share sheet for PDFs. Save to Files app. | Existing: `LessonResource` with `url` field |

### 10. Referral Share Sheet

| Feature | Value Proposition | Complexity | iOS Pattern | Notes |
|---------|-------------------|------------|-------------|-------|
| **Native share sheet** | iOS share sheet is native, fast, gives all sharing options | Low | `UIActivityViewController` / SwiftUI `ShareLink` with custom referral URL + message. | [Confidence: HIGH -- standard iOS API] |
| **Universal Links** | Referral links work whether or not recipient has app installed | High | Requires AASA file on `alphaagent.io`, Associated Domains entitlement. Falls back to web if app not installed. | [Confidence: HIGH -- Apple official docs, requires server config] |
| **Referral dashboard** | See who you've referred and reward status | Med | List view: referred name, status badge (pending/signed_up/active), reward amount, date. | Existing: `ReferralWithReferrer` interface with full status tracking |
| **Copy link with haptic** | Quick copy-to-clipboard | Low | Tap to copy referral URL. Show toast "Copied!" with success haptic. | Standard iOS pattern |
| **Pre-populated share text** | Make sharing effortless | Low | Template: "I've been using Alpha Agent for my lead gen and it's been great. Use my link to get started: [URL]" | Can customize in backend |

### 11. Onboarding Checklist (Animated)

| Feature | Value Proposition | Complexity | iOS Pattern | Notes |
|---------|-------------------|------------|-------------|-------|
| **Progressive checklist** | Guide new clients through setup. Raises Day 7 retention by 40%. | Med | Card with progress ring/bar at top. Expandable task items below. Each task has icon, title, status (done/in-progress/locked). | Existing: `OnboardingTasksWidget` with `completedCount / totalCount` progress |
| **Deep link per task** | Tap task to go to relevant screen | Low | Each task links to the screen where action is taken (e.g., "Sign Agreement" links to agreement view). | Standard mobile onboarding pattern |
| **Celebration on completion** | Dopamine hit when onboarding is done | Low | Confetti animation + haptic burst when all tasks complete. Full-screen congratulations overlay. | [Confidence: MEDIUM -- common gamification pattern] |
| **Dismiss when complete** | Don't show forever | Low | Auto-hide after all tasks complete + 3 days. Or manual dismiss. | Clean UX |

### 12. Agreement Signing (Native)

| Feature | Value Proposition | Complexity | iOS Pattern | Notes |
|---------|-------------------|------------|-------------|-------|
| **Scrollable agreement text** | Legal document must be readable | Med | Native `ScrollView` with rich text rendering. Track scroll position (existing: `scrolled_to_bottom` field). | Existing: web has full agreement rendering with scroll tracking |
| **Key terms checkboxes** | Explicit consent per term | Low | Native toggles/checkboxes for each key term. Match `key_terms` from `AgreementTemplate`. | Existing: `KeyTermCheckbox` interface |
| **Email OTP verification** | Identity verification before signing | Med | OTP input field (6 digits). Send via existing edge function. Auto-advance on complete entry. iOS `textContentType: .oneTimeCode` for auto-fill from SMS/email. | Existing: `EmailOTPVerification` component with `attemptsRemaining`, expiry countdown |
| **Signature drawing canvas** | Legally binding signature capture | High | `PKCanvasView` (PencilKit) for finger/stylus drawing on `UIView`. Export as PNG to upload to `signature_drawn_url`. | Existing: web has `signature_drawn_url` field. PencilKit is Apple's official drawing framework. |
| **Typed signature alternative** | Not everyone wants to draw | Low | Text field with script font preview. Store in `signature_typed`. | Existing: `signature_typed` field |

---

## Mobile-Specific Enhancements

Features that are better on mobile than web, or only possible on mobile.

| Feature | Why Mobile is Better | Complexity | iOS Pattern | Notes |
|---------|---------------------|------------|-------------|-------|
| **Biometric lock** | Web has no equivalent -- mobile adds real security | Med | Face ID / Touch ID (covered above) | Cannot replicate on web |
| **Push notifications** | Web push unreliable; iOS push is the gold standard | Med | APNs (covered above) | Web notifications often blocked by users |
| **Home screen widget** | Glanceable data without opening app -- no web equivalent | Med | WidgetKit (covered above) | Unique to native mobile |
| **Share sheet for referrals** | Native sharing to any app (iMessage, WhatsApp, etc.) | Low | `UIActivityViewController` | Web can only copy link |
| **Camera for chat** | Take photo and send directly in chat | Low | `UIImagePickerController` or `PHPickerViewController` | Faster than web file upload |
| **Offline awareness** | Show cached data when offline, queue messages | Med | Cache last-known state in CoreData/SwiftData. Show "Offline" banner. Queue chat messages for send when reconnected. | Web has no offline support |
| **Haptic feedback** | Physical confirmation of actions | Low | `UIFeedbackGenerator` variants | Not possible on web |
| **Picture-in-Picture video** | Watch course while browsing rest of app | Med | AVKit PiP (covered above) | Not natively supported in mobile browsers |
| **One-tap OTP auto-fill** | iOS auto-detects OTP from email/SMS and suggests it | Low | Set `textContentType: .oneTimeCode` on OTP field. iOS auto-fills. | Web requires manual copy-paste |
| **Spotlight search** | Find courses, billing records from iOS search | Med | `CoreSpotlight` framework. Index course titles, lesson names. | Not possible on web |

---

## Anti-Features

Features to explicitly NOT build in the iOS app. Common mistakes for mobile client portals.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **In-app payment processing (Stripe checkout)** | Apple requires 30% cut for in-app purchases. Payments for real-world services (ad spend) are exempt from IAP rules, but implementing Stripe payment entry in-app is complex and risky for App Store review. | Show payment methods (view-only). Direct clients to web for payment method management. Display "Manage on alphaagent.io" link. |
| **Full admin panel in client app** | Client app should be client-only. Mixing admin features bloats the app and confuses the user. | Build separate admin companion app later, or use web for admin. |
| **Embedded web views for core features** | WKWebView for primary features feels cheap and defeats the purpose of native. | Use native SwiftUI views for all core screens. Only use WKWebView as fallback for video embed if direct HLS URL is unavailable. |
| **Custom notification sound overload** | Different sounds per notification type is annoying and unprofessional. | Use default iOS notification sound. At most one custom sound for chat messages. |
| **Complex filtering/search on mobile** | Mobile screen too small for multi-faceted filters. | Simple segmented controls (2-3 options max). Save last filter preference. Use search only where list is long (transaction history). |
| **Horizontal charts/complex data viz** | Small mobile screens make charts hard to read and interact with. | Use simple metrics cards with numbers + trend arrows. Spark lines (tiny inline charts) only. Full charts belong on web. |
| **Auto-playing tutorial videos on first launch** | Feels intrusive. 77% of users churn in first 3 days -- don't waste their time. | Use progressive onboarding checklist instead. Short tooltips on first interaction with each feature. |
| **Deep settings/configuration screens** | Insurance agents are not power users who tweak settings. | Minimal settings: Face ID toggle, notification preferences, dark/light mode, sign out. Everything else on web. |
| **PDF generation/export** | Complex on iOS, rarely used on mobile. | Show data natively. For exports, email a web link where they can download. |
| **Real-time WebSocket for everything** | Battery drain. Most data (billing, metrics) doesn't need real-time. | Real-time ONLY for chat messages. Everything else: fetch on screen load + pull-to-refresh. |

---

## Feature Dependencies

```
Authentication (Supabase Auth + Face ID)
  |
  +---> Dashboard / Home Screen
  |       |
  |       +---> Wallet Balance (useClientWallet, useComputedWalletBalance)
  |       +---> Key Metrics (useLeadMetrics, useLeadStats)
  |       +---> Upcoming Payments (useUpcomingPayments)
  |       +---> Quick Actions --> links to all other screens
  |
  +---> Chat (useChat, Supabase Realtime)
  |       |
  |       +---> Push Notifications (APNs integration)
  |       +---> File/Image Attachments (Supabase Storage)
  |
  +---> Billing History (useBillingRecords, usePaymentMethods)
  |
  +---> Courses (course data from Supabase)
  |       |
  |       +---> Video Player (AVKit, needs Bunny CDN stream URLs)
  |       +---> Progress Tracking (lesson_progress table)
  |
  +---> Onboarding Checklist (useOnboardingTasks)
  |       |
  |       +---> Agreement Signing (useAgreement, useAgreementOTP)
  |             |
  |             +---> OTP Verification (edge function: send-agreement-otp)
  |             +---> Signature Canvas (PencilKit)
  |
  +---> Referral Dashboard (useReferralData)
  |       |
  |       +---> Share Sheet (Universal Links, AASA file)
  |
  +---> Settings
          |
          +---> Face ID toggle
          +---> Notification preferences
          +---> Theme selection
```

### Critical Path Dependencies

1. **Authentication MUST come first** -- nothing works without login
2. **Dashboard depends on** wallet, metrics, and payments APIs being accessible
3. **Chat requires** Supabase Realtime Swift client working correctly
4. **Push notifications require** APNs certificate + backend trigger setup (Supabase webhook or edge function)
5. **Agreement signing requires** OTP edge function + Supabase Storage for signature upload
6. **Referral share requires** Universal Links setup on `alphaagent.io` (AASA file)
7. **Course video player** depends on whether Bunny CDN provides direct HLS URLs or only embed codes (if embed-only, need WKWebView fallback)
8. **WidgetKit** depends on shared data layer (App Groups for data sharing between main app and widget extension)

---

## MVP Recommendation

### Phase 1: Foundation + Core Value (must ship)

1. **Authentication** (Supabase Auth + Face ID)
2. **Dashboard** (wallet balance, key metrics, upcoming payments)
3. **Billing history** (transaction list, filters, payment method view)
4. **Dark-first theme system**
5. **Pull-to-refresh + skeleton loading + haptics**

**Rationale:** This gives clients the single most important thing: see their money at a glance. Insurance agents check their ad spend balance multiple times daily. This alone justifies installing the app.

### Phase 2: Communication

6. **Real-time chat** (messages, attachments, read receipts)
7. **Push notifications** (chat messages, payment reminders, low balance)

**Rationale:** Chat is the #2 reason clients open the portal. Push notifications drive re-engagement and make the app sticky.

### Phase 3: Learning + Engagement

8. **Course browser + native video player** (PiP, progress tracking)
9. **Onboarding checklist** (animated, deep-linked)
10. **Agreement signing** (OTP + signature canvas)

**Rationale:** Courses are important but not daily-use. Agreement signing is a one-time action but critical for new client activation.

### Phase 4: Growth + Polish

11. **Referral dashboard + share sheet** (Universal Links)
12. **Home screen widgets** (WidgetKit -- balance + messages)
13. **Spotlight search integration**
14. **Offline mode** (cached dashboard data)

**Rationale:** These features add polish and growth mechanics. Referrals drive business growth. Widgets increase daily engagement without requiring app open.

### Defer to Post-MVP

- **Separate admin app** -- admins use web; no mobile admin needed yet
- **In-app Stripe payment entry** -- too risky with App Store rules; use web
- **Complex data visualization (charts)** -- web is better for this
- **Apple Watch companion** -- very low user demand for this use case
- **iPad-specific layouts** -- focus on iPhone first; iPad can use scaled iPhone layout

---

## Sources

### Verified (HIGH confidence)
- Existing Alpha Hub codebase at `/Users/forren/workspace/copy-alphahub/` -- all data models, hooks, and components inspected directly
- [Apple Developer Docs: LocalAuthentication](https://developer.apple.com/documentation/localauthentication) -- Face ID patterns
- [Apple Developer Docs: AVKit VideoPlayer](https://developer.apple.com/documentation/avkit/videoplayer) -- video playback
- [Apple Developer Docs: Notifications HIG](https://developer.apple.com/design/human-interface-guidelines/notifications) -- notification design (JS-rendered page, verified via WebSearch)
- [Apple Developer Docs: WidgetKit](https://developer.apple.com/documentation/widgetkit) -- home screen widgets
- [Apple Developer Docs: Universal Links](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content/) -- deep linking
- [Supabase Swift SDK](https://github.com/supabase/supabase-swift) -- iOS client with realtime support, iOS 13+
- [Supabase Swift Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/ios-swiftui) -- SwiftUI integration

### Researched (MEDIUM confidence)
- [Fintech UX Design Guide 2026](https://www.eleken.co/blog-posts/modern-fintech-design-guide) -- dashboard hierarchy patterns
- [Dark Mode Design Best Practices 2026](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/) -- dark-first design, OLED considerations
- [Chat UI Design Patterns 2025](https://bricxlabs.com/blogs/message-screen-ui-deisgn) -- message bubble patterns, readability
- [Mobile Onboarding Guide 2026](https://vwo.com/blog/mobile-app-onboarding-guide/) -- checklist patterns, retention impact
- [Push Notification Best Practices 2026](https://appbot.co/blog/app-push-notifications-2026-best-practices/) -- iOS 18 priority notifications
- [iOS Haptics Guide 2025](https://saropa-contacts.medium.com/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback-676dd5937774) -- engagement boost statistics
- [Robinhood UI Design](https://worldbusinessoutlook.com/how-the-robinhood-ui-balances-simplicity-and-strategy-on-mobile/) -- financial dashboard patterns
- [Coinbase Design System](https://cds.coinbase.com/) -- theming, component patterns
- [Capital One iOS Widget](https://www.capitalone.com/digital/tools/ios-widget/) -- balance widget reference
- [WidgetKit in iOS 26 (WWDC 2025)](https://dev.to/arshtechpro/wwdc-2025-widgetkit-in-ios-26-a-complete-guide-to-modern-widget-development-1cjp) -- glass presentation, new features
- [Custom Video Player SwiftUI + AVKit](https://cindori.com/developer/building-video-player-swiftui-avkit) -- PiP, custom controls
- [Branch.io iOS Deep Linking](https://github.com/Lightricks/ios-branch-deep-linking) -- referral link sharing
- [Apple Onboarding HIG](https://developer.apple.com/design/human-interface-guidelines/onboarding) -- progressive disclosure (JS page, verified via search)

### Unverified (LOW confidence -- needs validation)
- 90% of iOS users use dark mode -- widely cited across 2025-2026 sources but original study unclear
- Haptics increase interaction time by 50% -- cited in Medium article, not independently verified
- Onboarding checklists raise Day 7 retention by 40% -- cited by VWO and Appcues, likely self-serving metric
- 72% engagement increase from well-designed message bubbles -- single source (BricxLabs), likely inflated

---

## Open Questions (Need Phase-Specific Research)

1. **Bunny CDN video format:** Does Bunny CDN provide direct HLS streaming URLs for lessons, or only iframe embed codes? If embed-only, the video player falls back to WKWebView which is less premium.
2. **APNs delivery mechanism:** Will we use Supabase Edge Functions to send push notifications, a dedicated push service (OneSignal, Firebase Cloud Messaging), or Supabase's built-in push (if available in Swift)?
3. **App Store review for billing display:** Does showing Stripe-sourced payment data trigger App Store reviewer concerns about circumventing IAP? Research needed on Apple's guidelines for "reader" apps and real-world service billing.
4. **Supabase Swift Realtime stability:** The `supabase-swift` realtime client is community-maintained. Need to validate WebSocket reliability for chat under real-world conditions (background/foreground transitions, poor connectivity).
5. **Agreement signing legal validity:** Is a PencilKit finger-drawn signature on iOS legally equivalent to the web canvas signature? Likely yes, but worth confirming with counsel.
