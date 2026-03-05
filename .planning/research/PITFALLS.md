# Domain Pitfalls: Alpha Agent iOS App

**Domain:** Native Swift/SwiftUI iOS app with Supabase backend, first-time App Store submission
**Researched:** 2026-03-05
**Overall confidence:** MEDIUM-HIGH (multiple sources cross-referenced; some areas rely on community reports)

---

## Critical Pitfalls

Mistakes that cause App Store rejection, rewrites, or major delays.

---

### Pitfall 1: App Store Rejection for Incomplete Privacy Compliance

**What goes wrong:** First-time submissions are rejected because the app lacks a privacy policy, has incomplete App Privacy Labels (nutrition labels), or is missing the required Privacy Manifest file (`PrivacyInfo.xcprivacy`). Apple rejected 12% of submissions in Q1 2025 specifically for Privacy Manifest violations.

**Why it happens:** Developers focus on code and defer privacy compliance to the end. The privacy requirements have multiple layers that are easy to miss: (1) a publicly accessible privacy policy URL, (2) App Privacy Labels in App Store Connect matching actual data collection, (3) a `PrivacyInfo.xcprivacy` file declaring all "required reason APIs" used, and (4) App Tracking Transparency (ATT) prompt if any tracking occurs.

**Consequences:** Immediate rejection. The rejection-fix-resubmit cycle adds 3-7 days per attempt. If the privacy policy is missing from both the app AND the metadata, it is a guaranteed rejection.

**Prevention:**
- Create a privacy policy page at a stable URL (e.g., `alphaagent.io/privacy`) BEFORE development starts
- Add the privacy policy link to both App Store Connect metadata AND an in-app settings screen
- Build the `PrivacyInfo.xcprivacy` file incrementally as you add SDKs and API usage -- do not backfill at the end
- The privacy manifest must declare every "required reason API" you use (UserDefaults, file timestamps, disk space, etc.) with specific reason codes
- List ALL data types collected in App Privacy Labels: email, name, billing history, usage data, device identifiers
- For Alpha Agent specifically: you MUST disclose that you display financial/billing data from Stripe and how that data flows

**Detection:** Run `xcrun altool --validate-app` before submission. Review Apple's required reason APIs list and audit every SDK dependency.

**Phase relevance:** Must be addressed in Phase 1 (project setup) and validated before Phase N (submission). Start the privacy policy early.

**Confidence:** HIGH -- verified via Apple's official App Review Guidelines and multiple developer reports.

---

### Pitfall 2: Displaying External Billing/Payment Data Without Proper Disclosure

**What goes wrong:** The app shows Stripe billing data (invoices, wallet balances, payment history) and Apple reviewers flag it as either (a) an undisclosed external payment mechanism, (b) a violation of in-app purchase requirements, or (c) insufficient privacy disclosure for financial data.

**Why it happens:** Apple's guidelines around external payments have changed significantly. As of May 2025, US App Store allows external payment links without entitlement. BUT: the rules differ by region, and displaying financial data still requires explicit privacy disclosures. Alpha Agent shows billing READ-ONLY (no payment processing in-app), which is a safer position but still needs careful framing.

**Consequences:** Rejection under Guideline 3.1.1 (payments) or 5.1.1 (privacy). Could require architectural changes if Apple demands IAP for any "digital content" the billing relates to.

**Prevention:**
- Frame billing display as "account information" not "payment processing" -- the app displays billing HISTORY, it does not facilitate transactions
- In the App Review notes, explicitly explain: "This app displays read-only billing information from the user's existing account. All payments are processed externally via the web portal. No transactions occur in-app."
- Courses with video content are the biggest risk -- if Apple considers them "digital content," they may require IAP. However, since these courses appear to be included with the service (not sold individually in-app), this should be safe. Document this clearly in review notes.
- Include the billing data types in your App Privacy Labels (financial info, purchase history)
- Consider hiding any "pay now" or "add funds" CTAs in the iOS app and directing users to the web portal instead

**Detection:** Have someone unfamiliar with the app review the billing screens -- if it LOOKS like you can make payments, reviewers will think so too.

**Phase relevance:** Must be addressed during billing UI design phase AND validated before submission.

**Confidence:** MEDIUM -- the US external payments ruling is verified (9to5Mac, TechCrunch, Apple's own updated guidelines), but how reviewers interpret "displaying billing data" for a specific app varies case-by-case.

---

### Pitfall 3: Supabase Realtime WebSocket Disconnects on iOS Background/Foreground

**What goes wrong:** The Supabase realtime connection drops when the app goes to background, and reconnecting when returning to foreground enters a loop of CHANNEL_ERROR / CLOSED / TIMED_OUT statuses. During disconnection, all realtime updates are lost with no catch-up mechanism.

**Why it happens:** iOS aggressively suspends background network connections. The Supabase Swift SDK's realtime client (as of the current version) has documented issues with reconnection after timeout (GitHub issue #593 in supabase-swift, #1088 in supabase/realtime). The `disconnectOnNoSubscriptions` setting can cause premature disconnections.

**Consequences:** Chat messages missed, dashboard data stale, user sees outdated information without knowing it. The reconnection loop can also drain battery as the SDK repeatedly attempts to connect.

**Prevention:**
- Implement explicit lifecycle management: call `channel.unsubscribe()` in `sceneDidEnterBackground` and `channel.subscribe()` in `sceneWillEnterForeground`
- After reconnecting, fetch a "catch-up" of missed data via a regular REST query (e.g., "get messages since last_seen_timestamp")
- Set `disconnectOnNoSubscriptions: false` in the Supabase client configuration
- Use `NWPathMonitor` to detect network changes (Wi-Fi to cellular) and trigger reconnection
- Implement exponential backoff for reconnection attempts (start at 1s, cap at 30s)
- Show a visual indicator when realtime is disconnected so users know data may be stale

**Detection:** Test by backgrounding the app for 30+ seconds, then foregrounding. Check if realtime data updates resume without manual refresh. Test on cellular, not just Wi-Fi.

**Phase relevance:** Must be addressed in the phase that implements chat/realtime features. Design the reconnection strategy BEFORE building real-time UI.

**Confidence:** HIGH -- verified via multiple GitHub issues (#593, #1088, #579) and Supabase community discussions.

---

### Pitfall 4: Supabase Auth Token Expiry and Session Loss on iOS

**What goes wrong:** The access token (JWT) expires while the app is backgrounded or terminated. When the user reopens the app, API calls fail with 401 errors. In some cases, the refresh token is also expired or the session is lost entirely after a Supabase infrastructure event (documented in supabase-swift issue #733 -- sessions lost during Cloudflare outage).

**Why it happens:** The Swift SDK auto-refreshes tokens in the background, but this only works while the app process is alive. iOS terminates apps after extended background time. If the JWT expiry is short (default 1 hour) and the user hasn't opened the app in a while, both access and refresh tokens may be expired.

**Consequences:** User is logged out unexpectedly. If not handled gracefully, the app shows error screens or crashes instead of redirecting to login.

**Prevention:**
- Call `supabase.auth.startAutoRefresh()` on app launch and `stopAutoRefresh()` when entering background
- Store the session in Keychain (not UserDefaults) for persistence across app terminations
- On app launch, attempt `supabase.auth.session` -- if it fails, check for a stored refresh token and attempt manual refresh before forcing re-login
- Set a reasonable JWT expiry in Supabase Dashboard (3600s default is fine; do not set shorter)
- Build a graceful "session expired" flow that explains what happened and provides easy re-authentication (ideally biometric re-auth, not full email/password)
- Avoid calling `supabase.auth.session` frequently -- cache the access token in memory and use it directly

**Detection:** Test by force-killing the app, waiting 2+ hours, then reopening. Verify the user is either still logged in (token refreshed) or gets a clear re-auth prompt (not a crash or error screen).

**Phase relevance:** Must be addressed in the auth/login phase. The session recovery flow is critical infrastructure.

**Confidence:** HIGH -- verified via Supabase official docs on session management and GitHub discussions (#35158, #733).

---

### Pitfall 5: App Store Rejection for Missing Demo Account or Incomplete Review Notes

**What goes wrong:** Apple reviewers cannot test the app because it requires login credentials they do not have, the demo account does not work, or gated features (billing, courses, chat) are inaccessible during review.

**Why it happens:** Developers forget that Apple reviewers are strangers who know nothing about the product. They need a working demo account with pre-populated data, and they need explicit instructions on how to navigate every feature.

**Consequences:** Immediate rejection under Guideline 2.1 (App Completeness). Adds 3-7 days to timeline. Repeat offenses slow down future reviews.

**Prevention:**
- Create a dedicated Apple Review demo account with pre-populated billing data, course access, chat history, and completed onboarding
- In App Store Connect review notes, provide: (1) demo credentials, (2) step-by-step instructions to access EVERY feature, (3) explanation of features that require specific conditions (e.g., "wallet balance shows after billing sync"), (4) explanation that payments are processed externally
- Test the demo account yourself on a clean device before submission
- If any feature requires push notifications, explain how to trigger them or note they cannot be tested in review
- If OTP signing requires a phone number, either provide a test phone number or explain the flow with screenshots

**Detection:** Hand the demo credentials to someone who has never seen the app. Can they access every feature within 5 minutes?

**Phase relevance:** Must be set up before submission phase. Create the demo account early and keep it updated.

**Confidence:** HIGH -- this is among the top 3 rejection reasons cited across every source reviewed.

---

### Pitfall 6: Code Signing and Provisioning Profile Chaos

**What goes wrong:** First-time developers get trapped in certificate/provisioning profile hell: distribution certificates generated on the wrong machine, private keys not exported, provisioning profiles that do not include required capabilities (push notifications, associated domains), or certificates expiring mid-submission.

**Why it happens:** Apple's code signing system is notoriously complex. Statistics from developer surveys indicate 89% of developers encounter certificate problems, and 60% struggle with provisioning profiles. The private key generated during certificate creation is stored ONLY on the machine that created it -- if you lose it or switch machines, you must revoke and regenerate.

**Consequences:** Cannot build for distribution. Cannot submit to App Store. If certificates expire or are revoked, existing TestFlight builds stop working.

**Prevention:**
- Use Xcode's "Automatically manage signing" for development and initial setup -- it handles 90% of the complexity
- Export your signing certificate as a .p12 file (includes private key) and store it securely IMMEDIATELY after creation
- For push notifications: generate an APNs Authentication Key (.p8 file), NOT a certificate. The .p8 key never expires and works across all your apps. You can only download it ONCE -- save it immediately.
- Register your Bundle ID early and add ALL required capabilities (push notifications, associated domains for deep links) BEFORE creating provisioning profiles
- If using CI/CD later, consider Fastlane's `match` for certificate management
- Never let more than one person manage certificates without coordination -- revoking one person's certificate can break another's

**Detection:** Try an Archive + Upload to App Store Connect. If it fails with signing errors, you have a problem.

**Phase relevance:** Must be resolved in Phase 1 (Apple Developer Account + project setup). Do NOT defer this.

**Confidence:** HIGH -- verified via Apple's official documentation, multiple developer forum posts, and Bugfender's code signing error guide.

---

## Moderate Pitfalls

Mistakes that cause delays, performance issues, or technical debt.

---

### Pitfall 7: SwiftUI Performance Death by Re-renders

**What goes wrong:** The app becomes sluggish because SwiftUI views re-render excessively. Common triggers: using `@ObservedObject` when `@StateObject` is needed, putting expensive computations in view bodies, using `VStack` instead of `LazyVStack` for long lists, and overusing `GeometryReader`.

**Why it happens:** SwiftUI's declarative model hides the render cycle. Developers do not realize that every state change triggers a view body re-evaluation. With billing data, course lists, and chat messages, this can cascade into hundreds of unnecessary re-renders.

**Prevention:**
- Use `@StateObject` for objects you CREATE, `@ObservedObject` for objects PASSED IN, `@State` only for simple value types
- Never use `@State` with reference types (classes) -- it causes re-creation on every update
- Move expensive computations out of view bodies into computed properties or pre-calculated values
- Use `LazyVStack` / `LazyHStack` inside `ScrollView` for any list with more than ~20 items
- Avoid `GeometryReader` unless absolutely necessary -- it forces recalculation of the entire view hierarchy
- Break large views into smaller subviews -- SwiftUI can skip re-rendering unchanged subviews
- Use `.task` modifier for async data loading, not `onAppear` with manual Task creation
- Profile with Instruments SwiftUI template (new in Xcode/Instruments 26 from WWDC 2025)

**Detection:** Use Instruments' SwiftUI profiler to visualize re-render frequency. If a view body executes more than once per user interaction, investigate.

**Phase relevance:** Must be considered during ALL UI development phases. Harder to fix retroactively.

**Confidence:** HIGH -- verified via Apple's official documentation ("Understanding and improving SwiftUI performance") and Airbnb's engineering blog.

---

### Pitfall 8: Push Notification Certificate vs Key Confusion

**What goes wrong:** Developers create APNs certificates instead of APNs authentication keys. Certificates expire after 1 year, are per-app, and require renewal. The .p8 authentication key never expires and works for all apps. Many tutorials still show the certificate approach.

**Why it happens:** Apple supports both methods, and older documentation/tutorials default to certificates. Additionally, Apple updated its APNs server certificate to use USERTrust RSA Certification Authority (SHA-2 Root) in 2025 -- apps using the old certificate authority chain broke.

**Consequences:** Push notifications silently stop working when certificates expire. If using the certificate approach, you must also ensure your server's Trust Store includes the new certificate authority.

**Prevention:**
- Use APNs Authentication Key (.p8), NOT APNs certificate
- Generate the .p8 key once from Apple Developer portal (Keys section) -- download and save it IMMEDIATELY, it can only be downloaded once
- Store the Key ID and Team ID alongside the .p8 file -- you need all three for authentication
- For Supabase: you will need a server/edge function that sends push notifications using the .p8 key (Supabase does not have built-in APNs support)
- The bundle ID in your provisioning profile MUST match the topic used when sending push notifications
- Test in sandbox mode first (development), then switch to production for App Store builds

**Detection:** Send a test notification to a real device (not simulator -- push does not work in simulator). If it does not arrive, check certificate/key configuration.

**Phase relevance:** Must be addressed in the push notification implementation phase. Get the .p8 key during initial Apple Developer setup.

**Confidence:** HIGH -- verified via Apple's official APNs documentation and the 2025 certificate update advisory.

---

### Pitfall 9: Dark Mode as an Afterthought

**What goes wrong:** The app is built entirely in light mode. When dark mode support is added later, hardcoded colors break, text becomes invisible on dark backgrounds, shadows disappear, images with white backgrounds look jarring, and the overall visual hierarchy collapses.

**Why it happens:** Developers use explicit colors (e.g., `Color.black`, `Color.white`, hex values) instead of SwiftUI's semantic/adaptive colors. Dark mode is not tested until late in development.

**Consequences:** Visual bugs across the entire app. Rework of every screen. Some users (who default to dark mode) see a broken app from day one.

**Prevention:**
- Use SwiftUI's semantic colors from the start: `.primary`, `.secondary`, `Color(.systemBackground)`, `Color(.secondarySystemBackground)`, `Color(.label)`, `Color(.secondaryLabel)`
- Define a custom color palette in the asset catalog with Light/Dark/Any appearances for ALL custom brand colors
- NEVER hardcode colors like `Color.white` or `Color.black` for backgrounds or text -- use `.background` and `.primary` instead
- Test EVERY screen in dark mode during development, not at the end
- Use Xcode's Environment Overrides (Debug bar) to toggle dark mode while running in simulator
- For images: use template rendering mode for icons, and provide dark mode variants for any image with a visible background

**Detection:** Enable dark mode on simulator, walk through every screen. Any text that disappears or background that looks wrong = hardcoded color.

**Phase relevance:** Must be addressed from Phase 1 (design system setup). Define the color palette BEFORE building screens.

**Confidence:** HIGH -- well-documented across Apple HIG, SwiftLee, and multiple design resources.

---

### Pitfall 10: Video Streaming Architecture Mistakes for Course Content

**What goes wrong:** Videos are stored as raw MP4 files in Supabase Storage and loaded directly via URL. This causes: (1) no adaptive bitrate streaming (buffers on slow connections), (2) entire video must download before seeking works, (3) no DRM or content protection, (4) Supabase storage egress costs explode with video content, (5) signed URLs expire mid-playback for long videos.

**Why it happens:** Supabase Storage does not natively support video transcoding or HLS packaging. Developers take the simplest path of uploading MP4 files and generating signed URLs.

**Consequences:** Poor playback experience, especially on cellular. High bandwidth costs. Course content can be easily ripped/downloaded. Long videos fail when the signed URL expires before playback completes.

**Prevention:**
- Use a dedicated video platform (Mux, Cloudflare Stream, or AWS MediaConvert + CloudFront) for course videos -- NOT Supabase Storage
- These platforms provide automatic HLS transcoding, adaptive bitrate streaming, signed playback URLs with configurable expiry, and CDN delivery
- If budget is tight, pre-transcode videos to HLS format (multiple bitrates) and host on a CDN -- AVPlayer natively supports HLS
- Set signed URL expiry to be longer than the video duration + buffer (e.g., 4 hours for a 1-hour video)
- Use AVPlayer (via SwiftUI's `VideoPlayer` or custom `AVPlayerViewController` wrapper) for playback -- it handles HLS natively
- Implement AV Audio Session configuration for background audio (important for users who lock screen during video)
- Consider supporting Picture-in-Picture (PiP) -- it is a differentiator and relatively easy with `AVPlayerViewController`

**Detection:** Test video playback on cellular with throttled network (Xcode Network Link Conditioner). If it buffers constantly, you need HLS.

**Phase relevance:** Must be decided during architecture phase, BEFORE building the courses feature. Migrating from MP4-in-Supabase to a video platform later is a significant rework.

**Confidence:** MEDIUM-HIGH -- Supabase's lack of video transcoding verified via GitHub discussion #5566. Video platform recommendations based on community consensus.

---

### Pitfall 11: Face ID / Biometric Auth Implementation Errors

**What goes wrong:** Developers use `LAContext.evaluatePolicy()` for biometric check but only use the boolean result for gate-keeping, without actually securing anything in the Keychain. This means biometric auth is cosmetic -- a jailbroken device or debugger can bypass it entirely. Additionally, the biometric callback may not be on the main thread, causing UI freezes or crashes.

**Why it happens:** The `LocalAuthentication` framework makes it easy to check "is the user present?" but does not itself secure any data. Tutorials often show the simple boolean approach without explaining that real security requires storing sensitive data (auth tokens, session keys) in the Keychain with `.userPresence` access control.

**Consequences:** False sense of security. App Store reviewers may not catch this, but it is a real vulnerability. Additionally, missing the `NSFaceIDUsageDescription` key in Info.plist will crash the app or prevent Face ID from working at all.

**Prevention:**
- Store the Supabase auth token in Keychain with `SecAccessControlCreateFlags.biometryCurrentSet` (invalidates if biometrics change) or `.userPresence` (allows passcode fallback)
- Use Keychain access control instead of `LAContext` boolean for actual security
- MUST add `NSFaceIDUsageDescription` to Info.plist with a user-facing explanation (e.g., "Alpha Agent uses Face ID to securely access your account")
- Always dispatch UI updates from the biometric callback to the main thread using `DispatchQueue.main.async`
- Build a fallback flow: if biometrics fail 3 times, offer passcode/password authentication
- Handle the case where biometrics are not enrolled -- direct user to device Settings
- Test on devices without biometrics (older iPads, etc.) to ensure the fallback works

**Detection:** Try to access the app after changing Face ID (removing and re-adding face). If the app still works without re-authentication, the Keychain access control is not set correctly.

**Phase relevance:** Must be addressed in the auth/login phase. Design the Keychain storage strategy before implementing biometric UI.

**Confidence:** HIGH -- verified via Apple's official documentation ("Accessing Keychain Items with Face ID or Touch ID") and multiple developer guides (Kodeco, Hacking with Swift).

---

### Pitfall 12: TestFlight Beta Review Surprises

**What goes wrong:** Developers assume TestFlight is just "upload and test." In reality: (1) external tester builds require Beta App Review (separate from App Store review), (2) builds expire after 90 days, (3) invite emails land in spam, (4) missing beta description or test instructions causes rejection.

**Why it happens:** First-time developers do not know that TestFlight has TWO modes -- internal testers (up to 100 team members, no review required) and external testers (up to 10,000 users, requires Beta App Review with description and test notes). Beta App Review has been getting slower (reported delays in 2025).

**Consequences:** Delays in getting beta builds to stakeholders. If using only external testers without knowing about internal testers, unnecessary review wait times. Expired builds stop working with no warning to the developer.

**Prevention:**
- Start with INTERNAL testers first (instant access, no review) for initial testing and bug catching
- When ready for external testers, fill in ALL required metadata: beta app description, contact info, what to test
- Use TestFlight groups to organize testers (e.g., "Alpha Team," "Beta Clients," "Stakeholders")
- Monitor build expiration dates -- upload new builds before the 90-day expiry
- Warn testers to check spam folders for TestFlight invites (especially corporate email)
- Include clear testing instructions for each build: what is new, what to test, known issues

**Detection:** If external TestFlight review takes more than 48 hours, something may be wrong with your submission metadata.

**Phase relevance:** Must be understood before the testing/QA phase. Set up TestFlight groups during initial Apple Developer account setup.

**Confidence:** HIGH -- verified via Apple's official TestFlight documentation and developer reports.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without major rework.

---

### Pitfall 13: Deep Link Configuration for Supabase Auth

**What goes wrong:** Magic link or OAuth authentication fails because deep links are not configured correctly. The user clicks the auth link in email/browser but the app does not open, or opens to the wrong screen.

**Why it happens:** Deep linking on iOS requires BOTH a custom URL scheme registered in Info.plist AND associated domains configured in the entitlements file (for universal links). Supabase auth redirect URLs must match exactly. A single character mismatch causes silent failure.

**Prevention:**
- Register a custom URL scheme in Xcode (e.g., `io.alphaagent://`) in Info.plist
- Add the redirect URL to Supabase Dashboard under Authentication > URL Configuration > Redirect URLs
- For universal links (recommended): configure Associated Domains capability and host an `apple-app-site-association` file at `alphaagent.io/.well-known/apple-app-site-association`
- Test deep links on a REAL device -- simulator handling differs from production
- Handle the incoming URL in your SwiftUI app's `.onOpenURL` modifier

**Detection:** Send a magic link email to yourself and tap it on a real device. Does the app open and complete authentication?

**Phase relevance:** Must be addressed during auth implementation phase.

**Confidence:** HIGH -- verified via Supabase's official Swift tutorial.

---

### Pitfall 14: App Store Screenshot and Metadata Mistakes

**What goes wrong:** Screenshots are wrong dimensions, show placeholder data, include non-Apple device frames, or do not match app functionality. Description promises features that are not yet built. Missing age rating or incorrect content rating.

**Why it happens:** Screenshot requirements change with new device sizes. The current mandatory base size is 6.9-inch iPhone (1320x2868 pixels). Older sizes like 5.5-inch are no longer required. Developers use outdated templates.

**Consequences:** Rejection under Guideline 2.3 (Metadata). Must recreate screenshots and resubmit.

**Prevention:**
- Use the 6.9-inch iPhone screenshot size (1320x2868 px) as your base -- Apple auto-scales for smaller devices
- Show REAL app content in screenshots, not mockups or designs that differ from the actual app
- Do not include Android devices, competitor names, or pricing claims in screenshots
- First 3 screenshots appear in search results -- make them count
- Upload up to 10 screenshots per device type
- Prepare app preview videos (15-25 seconds, max 500MB) for higher conversion
- Fill in ALL metadata fields: keywords, description, support URL, marketing URL, age rating

**Detection:** Compare screenshots side-by-side with the actual app running on device. Any discrepancy = potential rejection.

**Phase relevance:** Must be completed during the submission preparation phase.

**Confidence:** HIGH -- verified via Apple's official screenshot specifications page.

---

### Pitfall 15: Ignoring Network Error States

**What goes wrong:** The app shows blank screens, cryptic error messages, or crashes when network requests fail. Users on airplane mode, in elevators, or with spotty cellular see a broken experience.

**Why it happens:** Developers test on fast Wi-Fi. Edge cases like timeouts, partial responses, and connection drops are not handled.

**Prevention:**
- Add `NWPathMonitor` to detect connectivity changes and show a "no connection" banner
- Every API call should have: loading state, success state, error state, and empty state
- Cache previously loaded data so the app remains useful offline (at minimum: dashboard data, course list)
- Use SwiftUI's `.redacted(reason: .placeholder)` for loading states
- Test with Xcode's Network Link Conditioner at "Very Bad Network" and "100% Loss" settings

**Detection:** Enable airplane mode after loading the app. Does it show useful cached data or a blank screen?

**Phase relevance:** Should be addressed during each feature phase, not as a separate phase.

**Confidence:** HIGH -- standard iOS development best practice.

---

### Pitfall 16: Missing Required Reason API Declarations

**What goes wrong:** The app uses APIs that Apple considers privacy-sensitive (UserDefaults, file timestamp APIs, disk space APIs, system boot time) without declaring them in the Privacy Manifest. Third-party SDKs that also use these APIs must have their own privacy manifests.

**Why it happens:** Developers do not realize that common APIs like `UserDefaults` and `NSFileManager` file attributes are on Apple's "required reason APIs" list. Every SDK dependency must also be audited.

**Prevention:**
- Review Apple's list of required reason APIs and cross-reference with your code
- Add appropriate reason codes to `PrivacyInfo.xcprivacy` for each API used
- Audit ALL third-party SDKs (Supabase Swift SDK, any analytics, crash reporting) for their own privacy manifests
- The Supabase Swift SDK should include its own privacy manifest -- verify this is present in the package

**Detection:** Xcode 15+ shows warnings about missing privacy manifest entries during build. Do not ignore these warnings.

**Phase relevance:** Must be maintained throughout development. Add entries as you add SDK dependencies.

**Confidence:** HIGH -- Apple's enforcement began May 2024 and rejection rates for violations remain significant.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Apple Developer Account Setup | Certificate/provisioning chaos (Pitfall 6) | Critical | Use automatic signing, export .p12 immediately, generate .p8 for APNs |
| Project Scaffolding | Missing privacy manifest, dark mode ignored (Pitfalls 1, 9, 16) | Critical | Set up PrivacyInfo.xcprivacy, define color palette with Light/Dark variants from day 1 |
| Auth / Login | Token expiry, biometric security theater, deep link misconfiguration (Pitfalls 4, 11, 13) | Critical | Store tokens in Keychain with biometric access control, test deep links on real device |
| Dashboard / Billing UI | External billing data disclosure, SwiftUI re-renders (Pitfalls 2, 7) | Moderate | Use LazyVStack, frame billing as read-only account info, prepare review notes |
| Chat / Realtime | WebSocket disconnect loop, missed messages (Pitfall 3) | Critical | Implement lifecycle-aware subscribe/unsubscribe, add catch-up queries |
| Courses / Video | MP4 storage mistake, no HLS streaming (Pitfall 10) | Moderate | Choose video platform (Mux/Cloudflare Stream) before building, NOT Supabase Storage |
| Push Notifications | Certificate vs key confusion, bundle ID mismatch (Pitfall 8) | Moderate | Use .p8 auth key (not certificate), verify bundle ID matches |
| TestFlight / QA | Beta review delays, missing test info (Pitfall 12) | Minor | Use internal testers first, fill all metadata, monitor 90-day expiry |
| App Store Submission | Missing demo account, wrong screenshots, privacy gaps (Pitfalls 5, 14, 1) | Critical | Create demo account with pre-populated data, test on clean device, validate all metadata |
| Agreements / OTP Signing | Legal compliance for e-signatures | Minor | OTP signing via SMS is standard and accepted on App Store (DocuSign, Signeasy precedent) |

---

## App Store Rejection Prevention Checklist

A condensed checklist to run before every submission attempt:

- [ ] Privacy policy URL accessible and linked in both App Store Connect AND in-app settings
- [ ] App Privacy Labels match actual data collection (email, name, financial data, usage data)
- [ ] `PrivacyInfo.xcprivacy` includes all required reason API declarations
- [ ] Demo account works with pre-populated data across all features
- [ ] Review notes explain external billing, payment processing, and any gated features
- [ ] All screenshots use correct dimensions (1320x2868 for 6.9-inch iPhone base)
- [ ] Screenshots match actual app UI (no mockups, no placeholder data)
- [ ] App does not crash on launch, during login, or on any primary flow
- [ ] Deep links work on real device (magic link auth, universal links)
- [ ] Push notification entitlement is added to provisioning profile
- [ ] Age rating is set correctly
- [ ] Support URL is valid and accessible
- [ ] No references to "beta," "test," or "coming soon" in visible UI
- [ ] No hardcoded test data or developer tools visible in the build

---

## Sources

### Official / HIGH Confidence
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) -- Primary source for rejection criteria
- [Apple Screenshot Specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)
- [Apple Privacy Manifest Files Documentation](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Apple Accessing Keychain Items with Face ID or Touch ID](https://developer.apple.com/documentation/LocalAuthentication/accessing-keychain-items-with-face-id-or-touch-id)
- [Apple APNs Registration Documentation](https://developer.apple.com/documentation/usernotifications/registering-your-app-with-apns)
- [Apple Understanding and Improving SwiftUI Performance](https://developer.apple.com/documentation/Xcode/understanding-and-improving-swiftui-performance)
- [Supabase Swift Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-swift)
- [Supabase Swift Auth Reference](https://supabase.com/docs/reference/swift/auth-startautorefresh)
- [Supabase User Sessions](https://supabase.com/docs/guides/auth/sessions)

### GitHub Issues / MEDIUM Confidence
- [supabase-swift #593 -- Slow realtime reconnection](https://github.com/supabase/supabase-swift/issues/593)
- [supabase-swift #579 -- Socket auto-reconnection on internet drop](https://github.com/supabase/supabase-swift/issues/579)
- [supabase/realtime #1088 -- Unable to reconnect after TIMED_OUT](https://github.com/supabase/realtime/issues/1088)
- [supabase-swift #733 -- Sessions lost during Cloudflare outage](https://github.com/supabase/supabase-swift)
- [Supabase Discussion #5566 -- Video streaming with Supabase](https://github.com/orgs/supabase/discussions/5566)
- [Supabase Discussion #35158 -- Auth session persistence after app kill](https://github.com/orgs/supabase/discussions/35158)

### Community / MEDIUM Confidence
- [App Store Rejection Reasons 2025 -- twinr.dev](https://twinr.dev/blogs/apple-app-store-rejection-reasons-2025/)
- [App Store Review Guidelines Checklist -- nextnative.dev](https://nextnative.dev/blog/app-store-review-guidelines)
- [APNs 2025 Certificate Update -- Courier](https://www.courier.com/blog/get-your-ios-app-ready-for-the-2025-apple-push-notification-service-server)
- [SwiftUI Performance Tips 2025 -- Medium](https://medium.com/@ravisolankice12/24-swiftui-performance-tips-every-ios-developer-should-know-2025-edition-723340d9bd79)
- [Airbnb SwiftUI Performance -- Medium](https://medium.com/airbnb-engineering/understanding-and-improving-swiftui-performance-37b77ac61896)
- [iOS Code Signing Errors -- Bugfender](https://bugfender.com/blog/ios-signing-errors/)
- [Apple External Payments Update -- 9to5Mac](https://9to5mac.com/2025/05/01/apple-app-store-guidelines-external-links/)
- [Apple External Payments Update -- TechCrunch](https://techcrunch.com/2025/05/02/apple-changes-us-app-store-rules-to-let-apps-redirect-users-to-their-own-websites-for-payments/)
- [Dark Mode Best Practices -- SwiftLee](https://www.avanderlee.com/swift/dark-mode-support-ios/)
- [WWDC 2025 -- Optimize SwiftUI with Instruments](https://developer.apple.com/videos/play/wwdc2025/306/)
