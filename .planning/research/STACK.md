# Technology Stack

**Project:** Alpha Agent -- Native Swift iOS App
**Researched:** 2026-03-05
**Overall Confidence:** HIGH

---

## Recommended Stack Overview

SwiftUI + MVVM + Supabase Swift SDK + native Apple frameworks. No cross-platform, no UIKit, no third-party networking layer. The Supabase Swift SDK covers auth, database, realtime, storage, and edge functions -- meaning we do NOT need separate REST/networking libraries for backend communication.

---

## Core Platform

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| Swift | 6.x (Xcode 16+) | Language | HIGH | Current standard. Swift 6 strict concurrency is the future; start with it rather than retrofitting later. Xcode 16 is required for App Store submission as of April 2025. |
| SwiftUI | iOS 17+ APIs | UI Framework | HIGH | SwiftUI is the standard for new iOS apps. iOS 17 introduced `@Observable` macro and `NavigationStack` matured. No reason to use UIKit for a greenfield app. |
| Xcode | 16.x+ | IDE & Build | HIGH | Required by Apple for App Store submissions since April 2025. Future requirement: Xcode with iOS 26 SDK by April 2026. |
| Minimum iOS Target | **iOS 17.0** | Deployment Target | HIGH | iOS 17 gives us `@Observable`, mature `NavigationStack`, improved `ScrollView`, and `SwiftData`. As of early 2026, iOS 17+ covers ~95% of active iPhones (iOS 17: ~12%, iOS 18: ~68%, iOS 26: ~15%). iOS 16 would gain ~3% more users but lose `@Observable` which is foundational to our architecture. |

### Why NOT iOS 16 as minimum

iOS 16 would require using the legacy `ObservableObject` + `@Published` + Combine pattern instead of the new `@Observable` macro. The `@Observable` macro provides property-level observation granularity (views only re-render when properties they actually read change, vs. ObservableObject which re-renders on ANY published property change). For an app with complex state like billing, chat, and courses, this performance difference matters significantly. The ~3% of users on iOS 16 does not justify the architectural cost.

### Why NOT UIKit

UIKit is legacy for new projects. SwiftUI provides declarative UI, built-in state management, native animations, and is Apple's active investment target. The only scenario where UIKit makes sense is for complex custom UI interactions (e.g., advanced gesture-driven interfaces) -- none of which are in scope for Alpha Agent's client portal. SwiftUI handles lists, forms, navigation, tabs, modals, and media playback natively.

---

## Supabase Swift SDK

| Component | Version | Purpose | Confidence | Why |
|-----------|---------|---------|------------|-----|
| `supabase-swift` (full package) | 2.41.1 | All Supabase services | HIGH | Single package provides Auth, Database (PostgREST), Realtime, Storage, and Edge Functions. Actively maintained (116 releases, last release Feb 6, 2026). Install the full `Supabase` product, not individual sub-packages, since we need all of them. |

### Supabase Swift SDK Capabilities (Verified)

**Authentication (HIGH confidence -- official docs verified)**
- Email/password sign-in via `supabase.auth.signIn(email:password:)`
- Email/password sign-up via `supabase.auth.signUp(email:password:)`
- Session management with automatic token refresh (PKCE flow by default)
- Auth state listener via `supabase.auth.onAuthStateChange`
- Sign in with Apple via `signInWithIdToken` (native Apple ID integration)
- MFA support (enroll, verify, unenroll)
- OAuth providers (Google, X/Twitter, etc.)
- Session persistence across app launches (stored in UserDefaults by default)

**Known auth issue:** Sign in with Apple does not return Apple's `accessToken`/`refreshToken` in `providerAccessToken`/`providerRefreshToken` fields (GitHub issue #2155). Not a blocker for our use case since we use email/password as primary auth.

**Database / PostgREST (HIGH confidence -- official docs verified)**
- Full CRUD: `select`, `insert`, `update`, `delete`, `upsert`
- Filtering: `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `like`, `ilike`, `in`, `is`, `match`, `imatch`, `isDistinct`
- Ordering, pagination, range queries
- RPC calls to Postgres functions via `supabase.rpc("function_name", params:)`
- Type-safe Codable integration for request/response mapping

**Realtime (HIGH confidence -- official docs verified)**
- Postgres Changes: subscribe to INSERT/UPDATE/DELETE on tables
- Broadcast: low-latency pub/sub messaging between clients (ideal for chat)
- Presence: track online users, typing indicators
- Both AsyncStream and callback-based APIs available
- Channel-based architecture with `supabase.channel("name")`

```swift
// Postgres changes
let channel = supabase.channel("chat")
let changes = channel.postgresChange(AnyAction.self, schema: "public", table: "messages")
await channel.subscribe()
for await change in changes {
    // handle insert/update/delete
}
```

**Note:** Realtime database changes are disabled by default on new projects for performance/security. Must be enabled in Supabase dashboard under Realtime settings. Our existing project likely already has this configured.

**Storage (HIGH confidence -- official docs verified)**
- Upload files (images, documents) via `supabase.storage.from("bucket").upload(path:file:)`
- Download files
- Create signed URLs for secure access
- List files in buckets
- Supports FileOptions for cache control, content type

**Edge Functions (HIGH confidence -- official docs verified)**
- Invoke via `supabase.functions.invoke("function-name", options:)`
- Supports Decodable response types for type-safe responses
- Supports streamed responses
- Custom headers, query parameters, HTTP methods (GET, POST, PUT, DELETE)
- Region selection for latency optimization
- Automatic Authorization header attachment (uses current session token)

```swift
// Invoking an edge function
struct BillingResponse: Decodable { /* ... */ }
let response: BillingResponse = try await supabase.functions
    .invoke("get-billing-summary", options: FunctionInvokeOptions(
        body: ["client_id": clientId]
    ))
```

### Supabase Swift SDK Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No built-in push notification support | Must implement APNs separately | Use native APNs + Edge Function trigger (see Push Notifications section) |
| Session persistence uses UserDefaults by default | Not as secure as Keychain | Override with custom storage adapter that writes to Keychain |
| Minimum iOS 13 in SDK, but we target iOS 17 | None | No conflict -- our higher target is fine |
| No offline mode / local caching built-in | App requires network connectivity | Acceptable for "online only" requirement; add local caching layer for UX polish later |

---

## State Management & Architecture

| Technology | Purpose | Confidence | Why |
|------------|---------|------------|-----|
| `@Observable` macro (Observation framework) | ViewModel state | HIGH | Native Apple framework, iOS 17+. Property-level observation granularity means views only re-render when properties they read change. Replaces `ObservableObject` + `@Published` entirely. |
| MVVM Pattern | Architecture | HIGH | Industry standard for SwiftUI. Clean separation: View (SwiftUI) -> ViewModel (@Observable) -> Service/Repository -> Supabase SDK. TCA is overkill for a client portal app. |
| Swift Concurrency (async/await) | Asynchronous operations | HIGH | Native to Swift 6. All Supabase SDK methods are async. No need for Combine or RxSwift. |
| `@MainActor` | UI thread safety | HIGH | Annotate ViewModels with `@MainActor` to ensure UI state mutations happen on main thread. Swift 6 strict concurrency enforces this. |

### Architecture Pattern: MVVM + Service Layer

```
View (SwiftUI)
  |
  v
ViewModel (@Observable, @MainActor)
  |
  v
Service Layer (SupabaseService, AuthService, ChatService, etc.)
  |
  v
Supabase Swift SDK (SupabaseClient singleton)
```

### Why NOT The Composable Architecture (TCA)

TCA (from Point-Free) is powerful but introduces significant complexity: reducers, effects, stores, dependency injection containers. For a client portal app with straightforward CRUD, real-time chat, and media playback, TCA is over-engineered. MVVM with `@Observable` provides the same testability benefits with less boilerplate. TCA makes sense for apps with complex, interleaved state (e.g., a video editor), not for a portal/dashboard app.

### Why NOT Combine

Combine is effectively deprecated for new SwiftUI code. `@Observable` + async/await replaces all Combine use cases. Combine was the bridge between UIKit's imperative world and SwiftUI's declarative world -- with `@Observable`, that bridge is no longer needed.

---

## Navigation

| Technology | Purpose | Confidence | Why |
|------------|---------|------------|-----|
| `NavigationStack` + `NavigationPath` | App navigation | HIGH | Native SwiftUI navigation (iOS 16+). Programmatic, type-safe, supports deep linking. `NavigationView` is deprecated. |
| Coordinator Pattern | Navigation logic separation | MEDIUM | Centralize routing in an `@Observable` Router/Coordinator class that owns a `NavigationPath`. Views push/pop via the coordinator, not directly. Enables deep linking from push notifications. |
| `TabView` | Main tab bar | HIGH | Native SwiftUI tab bar. Five tabs: Dashboard, Billing, Chat, Courses, More/Settings. |

### Navigation Architecture

```swift
@Observable
final class AppRouter {
    var selectedTab: Tab = .dashboard
    var dashboardPath = NavigationPath()
    var billingPath = NavigationPath()
    var chatPath = NavigationPath()
    var coursesPath = NavigationPath()
    var settingsPath = NavigationPath()

    // Deep link handling
    func handle(deepLink: DeepLink) {
        switch deepLink {
        case .chat(let conversationId):
            selectedTab = .chat
            chatPath.append(ChatDestination.conversation(conversationId))
        // ...
        }
    }
}
```

---

## Push Notifications

| Technology | Purpose | Confidence | Why |
|------------|---------|------------|-----|
| APNs (Apple Push Notification service) | Push delivery | HIGH | Native Apple service. Required for iOS push notifications. No Firebase dependency needed. |
| `UserNotifications` framework | Permission & handling | HIGH | Native Apple framework for requesting permission, handling foreground/background notifications. |
| Supabase Edge Function | Server-side send | MEDIUM | Trigger push sends from Edge Functions using APNs HTTP/2 API. Store device tokens in Supabase `device_tokens` table. Database webhook triggers Edge Function on notification insert. |

### Push Notification Architecture

Supabase does NOT have built-in push notification support. The recommended pattern:

1. **Client side (iOS):** Register for push notifications, get APNs device token, store in Supabase `device_tokens` table linked to user
2. **Server side (Edge Function):** When notification-worthy event occurs (new chat message, billing update, etc.), Edge Function sends push via APNs HTTP/2 API using stored device token
3. **Trigger:** Database webhook on `notifications` table INSERT triggers the Edge Function

```
Event occurs -> INSERT into notifications table -> Database webhook -> Edge Function -> APNs HTTP/2 -> iOS device
```

### Why NOT Firebase Cloud Messaging (FCM)

FCM adds an unnecessary dependency layer. For a native iOS app, APNs is the direct, lower-latency path. FCM is useful when you need cross-platform (Android + iOS) from a single API, but we are iOS-only. APNs HTTP/2 API is straightforward to call from an Edge Function.

### APNs Requirements

- Apple Developer Program membership (paid, $99/year)
- APNs key (.p8 file) or certificate from Apple Developer portal
- `NSFaceIDUsageDescription` in Info.plist (for biometric auth, not push -- but mentioning since both need Info.plist entries)
- Push Notifications capability enabled in Xcode
- Store APNs key securely as Supabase Edge Function secret

---

## Image Loading & Caching

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| **Kingfisher** | 8.8.0 | Remote image loading & caching | HIGH | Most feature-rich image loading library for Swift. Native SwiftUI support via `KFImage`. Async loading, placeholder images, transition effects, disk/memory caching, retry strategies. Swift 6 ready. |

### Why Kingfisher over alternatives

| Library | Recommendation | Reason |
|---------|---------------|--------|
| **Kingfisher 8.8.0** | USE THIS | Most features, best SwiftUI integration, actively maintained (March 2025 release), Swift 6 ready. `KFImage` drop-in for SwiftUI. |
| Nuke 12.9 | Good alternative | Better memory efficiency (~40MB less), leaner codebase. But fewer convenience features for SwiftUI. Choose Nuke if memory is critical. |
| AsyncImage (native) | Do NOT use alone | No disk caching, no retry, no placeholder customization, no prefetching. Fine for trivial use cases but inadequate for a production app with profile photos, course thumbnails, etc. |
| SDWebImage | Avoid | Primarily Objective-C heritage. Kingfisher and Nuke are the modern Swift choices. |

---

## Video Playback (Courses)

| Technology | Purpose | Confidence | Why |
|------------|---------|------------|-----|
| AVKit + AVPlayer | Video playback | HIGH | Native Apple frameworks. `VideoPlayer` SwiftUI view wraps AVPlayer with standard controls (play, pause, scrub, fullscreen, PiP). HLS streaming supported natively via `.m3u8` URLs. |
| AVFoundation | Advanced video control | HIGH | Underlying framework for progress tracking, playback rate, buffering state. Used for course progress tracking (remember where user left off). |

### Video Architecture for Courses

```swift
import AVKit

struct CourseVideoPlayer: View {
    let videoURL: URL  // .m3u8 or .mp4 URL from Supabase Storage signed URL
    @State private var player: AVPlayer?

    var body: some View {
        VideoPlayer(player: player)
            .onAppear {
                player = AVPlayer(url: videoURL)
            }
            .onDisappear {
                // Save progress to Supabase
            }
    }
}
```

### Why NO third-party video libraries

AVKit/AVPlayer handles everything we need: standard playback controls, HLS streaming, Picture-in-Picture, AirPlay, background audio. Third-party video players (like VLCKit, MobileVLCKit) are for exotic format support or custom DRM -- neither applies here. HaishinKit is for camera streaming, not playback.

---

## Keychain & Biometric Authentication

| Technology | Purpose | Confidence | Why |
|------------|---------|------------|-----|
| `LocalAuthentication` framework | Face ID / Touch ID | HIGH | Native Apple framework. `LAContext` for biometric authentication. Required for our Face ID unlock feature. |
| **KeychainAccess** | Keychain wrapper | MEDIUM | Clean Swift API for Keychain operations. Handles biometric-protected items via `accessibility` flags. Alternative: Apple's raw Security framework (more verbose but no dependency). |

### Biometric Auth Flow

1. User signs in with email/password via Supabase Auth
2. On successful sign-in, prompt: "Enable Face ID for faster login?"
3. If yes: store Supabase refresh token in Keychain with `.biometryCurrentSet` access control
4. On next app launch: authenticate with Face ID -> retrieve refresh token from Keychain -> use `supabase.auth.setSession()` to restore session
5. Fallback: if biometric fails, show email/password sign-in

### Keychain Library Decision

| Library | Recommendation | Reason |
|---------|---------------|--------|
| **KeychainAccess** | Recommended | Clean API, biometric integration, actively maintained. Simple: `keychain[string: "token"] = value` |
| SwiftKeychainWrapper | Alternative | Similar feature set, slightly different API style |
| Valet (by Square) | Alternative | Higher-level abstraction, good for teams unfamiliar with Keychain concepts |
| Raw Security framework | Viable but verbose | No dependency, but requires ~50+ lines of boilerplate for what KeychainAccess does in 3 lines |

### Info.plist Requirements

```xml
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to quickly and securely sign in to Alpha Agent</string>
```

---

## Dependency Management

| Technology | Purpose | Confidence | Why |
|------------|---------|------------|-----|
| **Swift Package Manager (SPM)** | Dependency management | HIGH | Apple's official, built into Xcode. CocoaPods is going read-only December 2026. Carthage is effectively dead. All libraries we need support SPM. No Podfile, no workspace complexity. |

### Why NOT CocoaPods

CocoaPods Trunk goes read-only December 2, 2026. For a new project starting in 2026, investing in CocoaPods is investing in dead technology. SPM is built into Xcode with zero additional tooling.

---

## App Store Tooling & Distribution

| Tool | Purpose | Confidence | Why |
|------|---------|------------|-----|
| Xcode 16+ | Build, sign, archive, upload | HIGH | Required for App Store submission. Includes Instruments for profiling, Simulator for testing. |
| TestFlight | Beta testing | HIGH | Apple's official beta distribution. Internal testers (up to 100) and external testers (up to 10,000). Install via TestFlight app on device. |
| App Store Connect | App management | HIGH | Manage app metadata, screenshots, pricing, analytics, crash reports, and App Review submissions. |
| Xcode Cloud (optional) | CI/CD | MEDIUM | Apple's cloud CI. Builds, tests, and distributes automatically on push. $14.99/month for 25 compute hours. Alternative: GitHub Actions with self-hosted Mac runner, or skip CI for initial development and archive manually from Xcode. |

### App Store Submission Requirements

- Apple Developer Program membership ($99/year)
- App Store Connect account with app record created
- Provisioning profiles and signing certificates (managed automatically by Xcode)
- App icons (1024x1024 for App Store, plus all device sizes)
- Screenshots for required device sizes (6.7" iPhone, 6.5" iPhone, etc.)
- Privacy policy URL
- App Review information (demo account credentials, contact info)

---

## Complete Dependency List

### Production Dependencies (via SPM)

```
Package                  Version    Purpose
-----------------------  ---------  -----------------------------------
supabase-swift           ~> 2.41    Auth, DB, Realtime, Storage, Functions
Kingfisher               ~> 8.8     Image loading & caching
KeychainAccess           ~> 4.2     Secure token storage + biometric
```

### Apple Frameworks (no install needed)

```
Framework                Purpose
-----------------------  -----------------------------------
SwiftUI                  UI
AVKit / AVFoundation     Video playback
LocalAuthentication      Face ID / Touch ID
UserNotifications        Push notifications
Security                 Keychain (used by KeychainAccess)
```

### That's it.

Three SPM dependencies. Everything else is native Apple frameworks. This is intentional -- fewer dependencies means fewer breaking changes, fewer version conflicts, and faster builds.

---

## Alternatives Considered & Rejected

| Category | Recommended | Rejected | Why Rejected |
|----------|-------------|----------|--------------|
| UI Framework | SwiftUI | UIKit | UIKit is legacy; no benefit for new declarative UI project |
| UI Framework | SwiftUI | React Native | Requirement is native Swift; RN adds complexity, worse performance |
| Architecture | MVVM + @Observable | TCA (Composable Architecture) | Over-engineered for portal/dashboard app; adds significant learning curve and boilerplate |
| Architecture | MVVM + @Observable | VIPER | Outdated pattern, excessive ceremony for SwiftUI |
| State | @Observable | Combine + ObservableObject | Legacy approach; @Observable is the replacement with better performance |
| State | @Observable | RxSwift | Third-party reactive framework; unnecessary with native async/await + @Observable |
| Navigation | NavigationStack | NavigationView | Deprecated in iOS 16 |
| Networking | Supabase Swift SDK | Alamofire | Supabase SDK handles all networking to backend; no raw REST calls needed |
| Networking | Supabase Swift SDK | Moya | Same reason as Alamofire -- Supabase SDK is the networking layer |
| Images | Kingfisher | SDWebImage | Objective-C heritage, Kingfisher is the modern Swift standard |
| Images | Kingfisher | AsyncImage (native) | No caching, no retry, no prefetch -- inadequate for production |
| Video | AVKit (native) | VLCKit | Overkill; AVKit handles HLS/MP4 natively |
| Push | APNs direct | Firebase Cloud Messaging | Unnecessary middleman for iOS-only app |
| Dependencies | SPM | CocoaPods | CocoaPods going read-only Dec 2026; SPM is Apple's standard |
| Dependencies | SPM | Carthage | Effectively dead; poor Xcode integration |
| Keychain | KeychainAccess | Raw Security framework | 50+ lines of boilerplate vs. 3 lines; same result |

---

## Version Pinning Strategy

Use **minor version ranges** in Package.swift to get patch updates automatically while avoiding breaking changes:

```swift
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.41.0"),
    .package(url: "https://github.com/onevcat/Kingfisher.git", from: "8.8.0"),
    .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.2"),
]
```

---

## Xcode Project Configuration

| Setting | Value | Why |
|---------|-------|-----|
| Deployment Target | iOS 17.0 | Access to @Observable, mature NavigationStack |
| Swift Language Version | Swift 6 | Strict concurrency safety from day one |
| Build with SDK | iOS 18 SDK (Xcode 16) | Required for App Store submission |
| Bundle Identifier | `com.alphaagent.ios` (or similar) | Must match App Store Connect app record |
| Signing | Automatic (Xcode Managed) | Simplest setup; Xcode manages provisioning profiles |

---

## Sources

### Official / HIGH Confidence
- [Supabase Swift SDK GitHub](https://github.com/supabase/supabase-swift) -- v2.41.1, features, requirements
- [Supabase Swift SDK Releases](https://github.com/supabase/supabase-swift/releases) -- version history verified
- [Supabase Swift Auth Reference](https://supabase.com/docs/reference/swift/auth-signinwithpassword) -- sign-in API
- [Supabase Swift Realtime Reference](https://supabase.com/docs/reference/swift/subscribe) -- channel subscription API
- [Supabase Swift Functions Reference](https://supabase.com/docs/reference/swift/functions-invoke) -- edge function invocation
- [Supabase iOS Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/ios-swiftui) -- setup guide
- [Supabase Push Notifications Guide](https://supabase.com/docs/guides/functions/examples/push-notifications) -- APNs architecture
- [Apple SDK Requirements](https://developer.apple.com/news/upcoming-requirements/?id=02212025a) -- Xcode 16/iOS 18 SDK
- [Apple Keychain + Biometrics](https://developer.apple.com/documentation/LocalAuthentication/accessing-keychain-items-with-face-id-or-touch-id) -- Face ID integration
- [Kingfisher GitHub Releases](https://github.com/onevcat/Kingfisher/releases) -- v8.8.0 verified
- [Nuke GitHub Releases](https://github.com/kean/Nuke/releases) -- v12.9 verified

### Community / MEDIUM Confidence
- [iOS Version Adoption 2026](https://blog.ecoatm.com/what-minimum-ios-version-do-most-apps-need-in-2026/) -- deployment target rationale
- [iOS 18 Adoption Rates](https://www.macrumors.com/2025/01/24/ios-18-adoption-rate/) -- 76% of recent iPhones on iOS 18
- [CocoaPods Sunset](https://capgo.app/blog/ios-spm-vs-cocoapods-capacitor-migration-guide/) -- CocoaPods going read-only Dec 2026
- [SwiftUI Architecture 2025](https://medium.com/@csmax/the-ultimate-guide-to-modern-ios-architecture-in-2025-9f0d5fdc892f) -- MVVM patterns
- [@Observable vs ObservableObject](https://www.donnywals.com/comparing-observable-to-observableobjects/) -- migration guide
- [SwiftUI Navigation Patterns 2025](https://medium.com/@chandra.welim/advanced-swiftui-navigation-patterns-production-ready-code-7886e7ae1937) -- coordinator pattern
- [Swift 6 Concurrency Guide](https://medium.com/@gauravios/swift-6-concurrency-a-practical-guide-for-ios-developers-27dee88b1adc) -- async/await patterns
