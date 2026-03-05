# Phase 1: Foundation - Research

**Researched:** 2026-03-05
**Domain:** iOS native app — Xcode project, Supabase auth, biometric security, dark design system, tab navigation
**Confidence:** HIGH (core stack verified via official docs and GitHub releases)

## Summary

Phase 1 builds the authenticated skeleton of the Alpha Hub iOS app: Xcode project setup, Supabase email/password auth with Keychain-persisted sessions, Face ID biometric gating, a dark-first design system with glass effects and haptics, and role-based tab navigation (client 5-tab vs admin 4-tab).

The standard stack is three SPM dependencies (supabase-swift, KeychainAccess, Kingfisher) plus Apple's LocalAuthentication and SpriteKit frameworks. All three libraries are actively maintained and have current releases. The key architectural pattern is `@Observable`-based state management (iOS 17+), with an `AuthManager` that owns session state and a `BiometricManager` that gates app access via LAContext.

A critical finding: Apple now requires Xcode 26 and iOS 26 SDK for App Store submissions starting April 2026. While the minimum deployment target can remain iOS 17+, the project must be built with Xcode 26. Apps built with the iOS 26 SDK automatically get Liquid Glass styling on native components — which aligns perfectly with the design direction. SceneKit is deprecated at WWDC25; SpriteKit remains the recommended approach for 2D particle effects in SwiftUI.

**Primary recommendation:** Use supabase-swift v2.41+ with `KeychainLocalStorage` for session persistence, LAContext with `.deviceOwnerAuthentication` policy for biometric + passcode fallback, SpriteKit `SKEmitterNode` for login particle animation, and iOS 17+ `@Observable` macro for all state management. Target iOS 17+ deployment with Xcode 26.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supabase-swift | 2.41.1 | Auth, database, realtime, storage | Official Supabase SDK for Swift; supports iOS 13+, includes `KeychainLocalStorage` for session persistence |
| KeychainAccess | 4.2.2 | Secure credential storage with biometric protection | De facto standard Keychain wrapper; 10 years mature, 40 releases, biometric `.accessibility` support |
| Kingfisher | 8.8.0 | Async image downloading and caching | Industry standard for iOS image loading; Swift 6 ready, SwiftUI `KFImage` component |

### Apple Frameworks (no SPM needed)

| Framework | Purpose | When to Use |
|-----------|---------|-------------|
| LocalAuthentication | Face ID, Touch ID, device passcode | Biometric gating on every app open |
| SpriteKit | 2D particle effects | Login screen animated background |
| SwiftUI (Observation) | `@Observable` macro, state management | All view models and managers |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none beyond the 3 SPM deps) | — | — | The prior decision locks to 3 dependencies only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SpriteKit particles | SceneKit SCNParticleSystem | SceneKit deprecated at WWDC25 — do NOT use for new projects |
| SpriteKit particles | RealityKit ParticleEmitterComponent | Overkill for 2D background effect; heavier framework |
| SpriteKit particles | Metal custom shader | Maximum control but massive complexity; unnecessary |
| SpriteKit particles | CAEmitterLayer (Core Animation) | Simpler but less control; harder to integrate with SwiftUI |
| KeychainAccess | keychain-swift (evgenyneu) | Less mature, fewer features, smaller community |
| @Observable | ObservableObject + @Published | Legacy pattern; more boilerplate, worse performance |

**Installation (Package.swift / Xcode SPM):**
```
https://github.com/supabase/supabase-swift.git — from: "2.0.0"
https://github.com/kishikawakatsumi/KeychainAccess.git — from: "4.2.2"
https://github.com/onevcat/Kingfisher.git — from: "8.0.0"
```

## Architecture Patterns

### Recommended Project Structure

```
AlphaHub/
├── App/
│   ├── AlphaHubApp.swift              # @main entry, environment setup
│   └── AppState.swift                 # Root app state (@Observable)
├── Core/
│   ├── Auth/
│   │   ├── AuthManager.swift          # @Observable — session, sign-in/out, password reset
│   │   ├── BiometricManager.swift     # @Observable — Face ID / passcode gating
│   │   └── KeychainHelper.swift       # KeychainAccess wrapper
│   ├── Design/
│   │   ├── Theme.swift                # Color tokens, spacing, typography
│   │   ├── Fonts.swift                # Custom font registration (Inter/Outfit/Satoshi)
│   │   └── HapticManager.swift        # Centralized haptic feedback
│   └── Navigation/
│       ├── AppRouter.swift            # Role-based tab selection
│       └── Tab.swift                  # Tab enum definitions (client vs admin)
├── Features/
│   ├── Login/
│   │   ├── LoginView.swift            # Login screen UI
│   │   ├── LoginViewModel.swift       # Login form state
│   │   ├── PasswordResetView.swift    # In-app password reset flow
│   │   └── ParticleBackground.swift   # SpriteKit particle scene
│   ├── Shell/
│   │   ├── MainTabView.swift          # Tab bar container
│   │   ├── ClientTabView.swift        # 5-tab client layout
│   │   ├── AdminTabView.swift         # 4-tab admin layout
│   │   └── TabBarView.swift           # Custom floating pill tab bar
│   └── Placeholder/
│       └── PlaceholderView.swift      # Stub for future feature screens
├── Shared/
│   ├── Components/                    # Reusable UI components
│   ├── Extensions/                    # Swift/SwiftUI extensions
│   └── Modifiers/                     # Custom view modifiers (blur, glass, haptic)
└── Resources/
    ├── Assets.xcassets                # Colors, images, app icon
    ├── Fonts/                         # .ttf/.otf custom font files
    └── Particles/
        └── DataFlow.sks              # SpriteKit particle emitter file
```

### Pattern 1: @Observable Auth State Management

**What:** Single `AuthManager` class using `@Observable` macro owns all auth state. Injected via `.environment()` at app root.
**When to use:** All auth-related state (session, user, isAuthenticated, loading states).

```swift
// Source: Apple Observation framework + supabase-swift docs
import Observation
import Supabase

@Observable
final class AuthManager {
    var session: Session?
    var isAuthenticated = false
    var isLoading = true

    private let supabase: SupabaseClient

    init(supabase: SupabaseClient) {
        self.supabase = supabase
    }

    func startListening() async {
        for await state in supabase.auth.authStateChanges {
            if [.initialSession, .signedIn, .signedOut].contains(state.event) {
                self.session = state.session
                self.isAuthenticated = state.session != nil
                self.isLoading = false
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        try await supabase.auth.signIn(email: email, password: password)
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
    }

    func resetPassword(email: String) async throws {
        try await supabase.auth.resetPasswordForEmail(email)
    }
}
```

### Pattern 2: Biometric Gating with Grace Period

**What:** BiometricManager controls Face ID/passcode challenge. Tracks last-authenticated timestamp for 30-second grace period.
**When to use:** Every app foreground transition.

```swift
// Source: Apple LocalAuthentication docs + verified patterns
import LocalAuthentication
import Observation

@Observable
final class BiometricManager {
    var isUnlocked = false
    private var lastAuthTime: Date?
    private let gracePeriod: TimeInterval = 30

    func authenticate() async -> Bool {
        // Check grace period
        if let lastAuth = lastAuthTime,
           Date().timeIntervalSince(lastAuth) < gracePeriod {
            isUnlocked = true
            return true
        }

        let context = LAContext()
        var error: NSError?

        // .deviceOwnerAuthentication = biometric + passcode fallback
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            return false
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "Unlock Alpha Hub"
            )
            if success {
                await MainActor.run {
                    isUnlocked = true
                    lastAuthTime = Date()
                }
            }
            return success
        } catch {
            return false
        }
    }

    func lock() {
        isUnlocked = false
    }
}
```

### Pattern 3: Supabase Client Initialization with Keychain Storage

**What:** Configure SupabaseClient to persist sessions to Keychain automatically.
**When to use:** App startup, once.

```swift
// Source: supabase-swift GitHub README + KeychainLocalStorage docs
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://qcunascacayiiuufjtaq.supabase.co")!,
    supabaseKey: "your-anon-key",
    options: SupabaseClientOptions(
        auth: .init(
            storage: KeychainLocalStorage(
                service: "com.alphaagent.ios",
                accessGroup: nil
            ),
            flowType: .pkce
        )
    )
)
```

### Pattern 4: Background Privacy Blur

**What:** Full gaussian blur overlay when app enters background/inactive state.
**When to use:** Root app view, wraps entire content.

```swift
// Source: createwithswift.com verified pattern
struct PrivacyBlurModifier: ViewModifier {
    @Environment(\.scenePhase) private var scenePhase
    @State private var blurRadius: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .blur(radius: blurRadius)
            .onChange(of: scenePhase) { oldPhase, newPhase in
                withAnimation(.easeInOut(duration: 0.2)) {
                    blurRadius = (newPhase == .active) ? 0 : 30
                }
            }
    }
}

extension View {
    func privacyBlur() -> some View {
        modifier(PrivacyBlurModifier())
    }
}
```

### Pattern 5: Role-Based Tab Navigation

**What:** Different tab sets for client vs admin users based on role detected from Supabase user metadata or a profiles table.
**When to use:** After authentication, determines which shell to show.

```swift
// Source: Apple TabView docs + SwiftUI navigation patterns
enum UserRole: String {
    case client, admin
}

enum ClientTab: String, CaseIterable {
    case home, wallet, chat, courses, more

    var title: String { rawValue.capitalized }
    var icon: String {
        switch self {
        case .home: return "chart.bar.fill"
        case .wallet: return "wallet.pass.fill"
        case .chat: return "bubble.left.and.bubble.right.fill"
        case .courses: return "book.fill"
        case .more: return "ellipsis.circle.fill"
        }
    }
}

enum AdminTab: String, CaseIterable {
    case dashboard, clients, chat, more

    var title: String { rawValue.capitalized }
    var icon: String {
        switch self {
        case .dashboard: return "square.grid.2x2.fill"
        case .clients: return "person.2.fill"
        case .chat: return "bubble.left.and.bubble.right.fill"
        case .more: return "ellipsis.circle.fill"
        }
    }
}

struct MainTabView: View {
    let role: UserRole

    var body: some View {
        switch role {
        case .client:
            ClientTabView()
        case .admin:
            AdminTabView()
        }
    }
}
```

### Pattern 6: Custom Floating Pill Tab Bar

**What:** Custom tab bar with glass/blur effect, floating above bottom edge in pill shape.
**When to use:** Replace default TabView chrome with custom implementation.

```swift
// Source: SwiftUI material + custom tab bar patterns
struct FloatingTabBar<Tab: Hashable>: View {
    @Binding var selection: Tab
    let tabs: [(tab: Tab, title: String, icon: String)]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs, id: \.tab) { item in
                Button {
                    withAnimation(.spring(duration: 0.3, bounce: 0.2)) {
                        selection = item.tab
                    }
                    // Haptic on tab switch
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: item.icon)
                            .font(.system(size: 20, weight: .semibold))
                        Text(item.title)
                            .font(.caption2)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(selection == item.tab ? .white : .gray)
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.3), radius: 20, y: 10)
        )
        .padding(.horizontal, 24)
    }
}
```

### Anti-Patterns to Avoid

- **NavigationStack wrapping TabView:** Place `NavigationStack` INSIDE each tab, not outside `TabView`. Otherwise tab switches break navigation state.
- **Shared NavigationPath across tabs:** Each tab must own its own `NavigationPath` for independent navigation stacks.
- **ObservableObject + @Published for new code:** Use `@Observable` macro exclusively (iOS 17+ target). Mixing old and new patterns causes confusion and subtle bugs.
- **Storing tokens in UserDefaults:** Never store auth tokens in UserDefaults. Always use Keychain.
- **Manual session refresh on launch:** supabase-swift with `KeychainLocalStorage` handles session restoration automatically. Don't call `refreshSession()` manually.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keychain CRUD | Raw `SecItemAdd`/`SecItemCopyMatching` calls | KeychainAccess library | Keychain API is C-based, error-prone, verbose; library handles all edge cases |
| Session persistence | Custom token storage/refresh logic | supabase-swift `KeychainLocalStorage` | SDK handles token refresh, expiry, keychain storage automatically |
| Biometric prompt UI | Custom Face ID UI | `LAContext.evaluatePolicy()` | System handles the biometric prompt UI; custom UI is not allowed by Apple |
| Haptic feedback engine | Custom AudioServices/CoreHaptics wrapper | SwiftUI `.sensoryFeedback()` modifier (iOS 17+) | Declarative, handles device capabilities automatically |
| Image caching | URLSession + FileManager cache | Kingfisher `KFImage` | Disk/memory cache, progressive loading, placeholder support built in |
| Particle emitter from scratch | Metal shaders or custom Canvas drawing | SpriteKit `SKEmitterNode` + `.sks` file | Visual editor in Xcode, proven performance, easy SwiftUI integration via `SpriteView` |
| Spring animation math | Custom timing curves | `.spring(duration:bounce:)` (iOS 17+) | Apple's simplified spring API handles all the physics; just set duration and bounce |

**Key insight:** The 3-dependency constraint is achievable because Apple's first-party frameworks (LocalAuthentication, SpriteKit, Observation) cover biometrics, particles, and state management without additional packages.

## Common Pitfalls

### Pitfall 1: Face ID Permission Rejected Silently

**What goes wrong:** App crashes or biometric silently fails because Info.plist is missing `NSFaceIDUsageDescription`.
**Why it happens:** This key is required for Face ID but not for Touch ID. Developers test on Touch ID device and miss it.
**How to avoid:** Add `NSFaceIDUsageDescription` to Info.plist as first step. Use `.deviceOwnerAuthentication` policy (not `.deviceOwnerAuthenticationWithBiometrics`) to get automatic passcode fallback.
**Warning signs:** Biometric works in simulator but fails on real device.

### Pitfall 2: Supabase Session Lost After App Kill

**What goes wrong:** User must re-login every time app is force-quit.
**Why it happens:** Default storage may not persist correctly, or developer manually calls `refreshSession()` instead of listening to `authStateChanges`.
**How to avoid:** Configure `KeychainLocalStorage` explicitly in SupabaseClient init. Listen to `authStateChanges` for `.initialSession` event on launch — the SDK restores from Keychain automatically.
**Warning signs:** `Auth.KeychainError(code=itemNotFound)` in logs.

### Pitfall 3: Auth State Changes Not on Main Thread

**What goes wrong:** UI doesn't update after sign-in, or crashes with "Publishing changes from background threads is not allowed."
**Why it happens:** `authStateChanges` async stream may deliver events on background thread.
**How to avoid:** Mark `AuthManager` properties with `@MainActor` or dispatch UI state updates to main actor explicitly.
**Warning signs:** Intermittent UI freezes or SwiftUI state inconsistencies after auth events.

### Pitfall 4: NavigationStack Outside TabView

**What goes wrong:** Navigating within a tab hides the tab bar, or switching tabs resets navigation state.
**Why it happens:** Single `NavigationStack` wrapping `TabView` instead of one per tab.
**How to avoid:** Each tab gets its own `NavigationStack` with its own `NavigationPath`. Tab bar remains visible during push navigation.
**Warning signs:** Tab bar disappears on push, or back button returns to wrong tab.

### Pitfall 5: ScenePhase Blur Doesn't Cover App Switcher Thumbnail

**What goes wrong:** Financial data visible in iOS app switcher even though blur is applied.
**Why it happens:** `.inactive` may not trigger fast enough before iOS captures the snapshot for the app switcher.
**How to avoid:** Use `UIApplication.willResignActiveNotification` via `NotificationCenter` as backup. Consider using both `scenePhase` and UIKit notification for defense-in-depth. Some apps overlay a branded splash screen instead of blur.
**Warning signs:** Sensitive data visible when swiping up to app switcher.

### Pitfall 6: Custom Font Not Loading (Silent Fallback to System)

**What goes wrong:** App renders with San Francisco system font instead of custom Inter/Outfit/Satoshi.
**Why it happens:** Font files not in target bundle, wrong PostScript name in `.font(.custom(...))`, or fonts not registered in `Info.plist`.
**How to avoid:** (1) Add .ttf/.otf files to Xcode target, (2) list exact filenames in Info.plist under `Fonts provided by application`, (3) use correct PostScript name (verify in Font Book app), (4) call registration in `App.init()` if using SPM.
**Warning signs:** No error, just wrong font rendering.

### Pitfall 7: SpriteKit Particle Performance on Older Devices

**What goes wrong:** Login screen particle animation causes frame drops or excessive battery drain.
**Why it happens:** Too many particles, high birth rate, or complex particle rendering on A11/A12 chips.
**How to avoid:** Keep particle birth rate under 50/sec, limit particle lifetime, use simple circle/dot textures. Test on oldest supported device (iPhone 11 for A13). Consider reducing particles programmatically on lower-end devices.
**Warning signs:** Xcode GPU profiler shows high fill rate, thermal throttling on login screen.

### Pitfall 8: Deep Link Handling for Password Reset

**What goes wrong:** Password reset email opens in Safari instead of the app, or OTP token is lost.
**Why it happens:** URL scheme not properly configured, or deep link handler not calling `supabase.auth.handle(_:)`.
**How to avoid:** (1) Register URL scheme in Info.plist (e.g., `com.alphaagent.ios`), (2) Add the scheme to Supabase dashboard redirect URLs, (3) Handle incoming URLs in `.onOpenURL` modifier, (4) Call `supabase.auth.handle(url)` to exchange token.
**Warning signs:** Password reset works in web but does nothing when email link tapped on device.

## Code Examples

### Supabase Client Setup with Keychain

```swift
// Source: supabase-swift GitHub + official docs
import Supabase

struct SupabaseConfig {
    static let client = SupabaseClient(
        supabaseURL: URL(string: ProcessInfo.processInfo.environment["SUPABASE_URL"]
            ?? "https://qcunascacayiiuufjtaq.supabase.co")!,
        supabaseKey: ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"]
            ?? "your-anon-key",
        options: SupabaseClientOptions(
            auth: .init(
                storage: KeychainLocalStorage(
                    service: "com.alphaagent.ios",
                    accessGroup: nil
                ),
                flowType: .pkce
            )
        )
    )
}
```

### Email/Password Sign In

```swift
// Source: supabase.com/docs/reference/swift/auth-signinwithpassword
func signIn(email: String, password: String) async throws {
    try await supabase.auth.signIn(
        email: email,
        password: password
    )
    // authStateChanges stream will emit .signedIn event
}
```

### Auth State Listener at App Root

```swift
// Source: supabase.com/docs/guides/getting-started/tutorials/with-swift
@main
struct AlphaHubApp: App {
    @State private var authManager = AuthManager(supabase: SupabaseConfig.client)
    @State private var biometricManager = BiometricManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authManager)
                .environment(biometricManager)
                .task {
                    await authManager.startListening()
                }
        }
    }
}

struct RootView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(BiometricManager.self) private var biometric

    var body: some View {
        Group {
            if auth.isLoading {
                LaunchScreenView()
            } else if !auth.isAuthenticated {
                LoginView()
            } else if !biometric.isUnlocked {
                BiometricLockView()
            } else {
                MainTabView(role: auth.userRole)
            }
        }
        .privacyBlur()
    }
}
```

### Face ID with Passcode Fallback

```swift
// Source: Apple LocalAuthentication + hackingwithswift.com
import LocalAuthentication

func authenticate() async -> Bool {
    let context = LAContext()
    var error: NSError?

    // .deviceOwnerAuthentication includes passcode fallback
    // .deviceOwnerAuthenticationWithBiometrics is biometric-only (NO fallback)
    guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
        // Device has no passcode set — extremely rare
        return false
    }

    do {
        return try await context.evaluatePolicy(
            .deviceOwnerAuthentication,
            localizedReason: "Authenticate to access Alpha Hub"
        )
    } catch {
        // LAError.userCancel, .userFallback, .biometryLockout, etc.
        return false
    }
}
```

### SpriteKit Particle Background in SwiftUI

```swift
// Source: tanaschita.com + Apple SpriteKit docs
import SpriteKit
import SwiftUI

class DataFlowScene: SKScene {
    override func didMove(to view: SKView) {
        backgroundColor = .clear
        guard let emitter = SKEmitterNode(fileNamed: "DataFlow") else { return }
        emitter.particlePosition = CGPoint(x: size.width / 2, y: size.height / 2)
        emitter.particlePositionRange = CGVector(dx: size.width, dy: size.height)
        addChild(emitter)
    }

    override func didChangeSize(_ oldSize: CGSize) {
        children.compactMap { $0 as? SKEmitterNode }.forEach { emitter in
            emitter.particlePosition = CGPoint(x: size.width / 2, y: size.height / 2)
            emitter.particlePositionRange = CGVector(dx: size.width, dy: size.height)
        }
    }
}

struct ParticleBackground: View {
    var scene: SKScene {
        let scene = DataFlowScene()
        scene.scaleMode = .resizeFill
        scene.backgroundColor = .clear
        return scene
    }

    var body: some View {
        SpriteView(scene: scene, options: [.allowsTransparency])
            .ignoresSafeArea()
            .allowsHitTesting(false) // Pass touches through to login form
    }
}
```

### Haptic Feedback (iOS 17+ Declarative)

```swift
// Source: Apple SwiftUI sensoryFeedback docs
// On buttons / taps:
Button("Sign In") { /* action */ }
    .sensoryFeedback(.impact(weight: .medium), trigger: tapCount)

// On success/error:
.sensoryFeedback(.success, trigger: loginSuccess)
.sensoryFeedback(.error, trigger: loginError)

// On selection change (tab switch):
.sensoryFeedback(.selection, trigger: selectedTab)

// On pull-to-refresh:
.sensoryFeedback(.impact(weight: .light), trigger: isRefreshing)
```

### Dark Theme Color Tokens

```swift
// Source: SwiftUI Color patterns + OLED optimization
import SwiftUI

enum AppColors {
    // OLED-optimized base colors
    static let pureBlack = Color.black              // #000000 — true OLED black
    static let surface = Color(hex: "0A0A0A")       // Barely off-black for elevated surfaces
    static let surfaceElevated = Color(hex: "141414") // Cards, sheets
    static let surfaceOverlay = Color(hex: "1E1E1E")  // Modals, popovers

    // Text hierarchy
    static let textPrimary = Color.white
    static let textSecondary = Color(hex: "A0A0A0")
    static let textTertiary = Color(hex: "666666")

    // Accent (white-dominant for MVP, neon pops later)
    static let accent = Color.white
    static let accentNeon = Color(hex: "00FF88")    // Reserve for future neon highlights

    // Semantic
    static let success = Color(hex: "00C853")
    static let error = Color(hex: "FF3B30")
    static let warning = Color(hex: "FF9500")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .init(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        self.init(
            red: Double((rgbValue >> 16) & 0xFF) / 255.0,
            green: Double((rgbValue >> 8) & 0xFF) / 255.0,
            blue: Double(rgbValue & 0xFF) / 255.0
        )
    }
}
```

### Spring Animation Pattern

```swift
// Source: Apple SwiftUI Animation docs (iOS 17+)
// Standard UI transitions — smooth, no bounce
withAnimation(.spring(duration: 0.35, bounce: 0)) {
    // State change
}

// Interactive elements — slight bounce for delight
withAnimation(.spring(duration: 0.4, bounce: 0.2)) {
    selectedTab = .home
}

// Success/celebration — more pronounced
withAnimation(.spring(duration: 0.5, bounce: 0.3)) {
    showSuccess = true
}
```

### Password Reset Flow (In-App)

```swift
// Source: supabase.com/docs/reference/swift + native-mobile-deep-linking
// Step 1: Request password reset
try await supabase.auth.resetPasswordForEmail(email)
// → User receives email with OTP or magic link

// Step 2: Handle deep link (in .onOpenURL)
.onOpenURL { url in
    Task {
        try await supabase.auth.handle(url)
        // → Triggers authStateChange event, user is now signed in
        // → Show password reset form
    }
}

// Step 3: Update password
try await supabase.auth.update(user: UserAttributes(password: newPassword))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ObservableObject` + `@Published` | `@Observable` macro | iOS 17 (2023) | Less boilerplate, better performance, simpler injection |
| `@StateObject` / `@ObservedObject` | `@State` for @Observable classes | iOS 17 (2023) | Single property wrapper for class state |
| `.environmentObject()` | `.environment()` for @Observable | iOS 17 (2023) | No explicit protocol conformance needed |
| SceneKit for 3D | RealityKit | WWDC25 (2025) | SceneKit deprecated, no new features |
| `.spring(response:dampingFraction:)` | `.spring(duration:bounce:)` | iOS 17 (2023) | Simpler mental model for spring animations |
| UIKit haptic generators | `.sensoryFeedback()` modifier | iOS 17 (2023) | Declarative, SwiftUI-native |
| iOS 18 SDK requirement | iOS 26 SDK required April 2026 | WWDC25 (2025) | Must build with Xcode 26; Liquid Glass auto-applied |
| Custom glass effects with `.ultraThinMaterial` | Native `.glassEffect()` modifier | iOS 26 (2025) | First-class Liquid Glass API, but requires iOS 26 deployment target |

**Deprecated/outdated:**
- **SceneKit:** Deprecated at WWDC25 — do not use for new projects. SpriteKit remains supported and recommended for 2D.
- **ObservableObject pattern:** Still works but `@Observable` is strictly better for iOS 17+.
- **`NavigationView`:** Fully deprecated. Use `NavigationStack` exclusively.

**Important iOS 26 / Liquid Glass decision:**
The native `.glassEffect()` modifier requires iOS 26 as deployment target. Since our minimum target is iOS 17+, we cannot use the native Liquid Glass API directly. Instead, use `.ultraThinMaterial` + `Capsule()` + custom blur for glass effects that work on iOS 17+. This provides a similar visual result. When the minimum target is eventually raised to iOS 26, the custom glass can be swapped for native `.glassEffect()`.

## Open Questions

1. **Exact custom font choice (Inter vs Outfit vs Satoshi)**
   - What we know: All three are geometric sans-serifs available as free Google Fonts or open source. Inter is the most widely used in tech. Outfit is rounder and friendlier. Satoshi is more distinctive/premium.
   - What's unclear: Which best matches the "Tesla-inspired" premium feel described in CONTEXT.md.
   - Recommendation: Use **Inter** for v1 (most proven, excellent readability at all sizes, variable weight support). Easy to swap later. Include Regular, Medium, SemiBold, Bold weights.

2. **Role detection mechanism**
   - What we know: Supabase user has metadata (`app_metadata`, `user_metadata`) and we have a `profiles` or `clients` table in the existing web app.
   - What's unclear: Exactly which field determines admin vs client role. Existing web app likely uses an `is_admin` field or `role` column.
   - Recommendation: Check user's `app_metadata.role` first (set by Supabase admin), fall back to a `role` column on the `profiles` table. Research existing Supabase schema during implementation.

3. **Password reset: Deep link vs OTP-only**
   - What we know: CONTEXT.md specifies "email input -> magic link or OTP -> reset password, all native." Both approaches work but have different UX.
   - What's unclear: Whether to implement both or pick one.
   - Recommendation: Implement **OTP code approach** (6-digit code sent to email, entered in-app). This is simpler, fully native (no URL scheme handling needed for this flow), and better UX for mobile. Save deep link handling for magic link login if added later.

4. **Apple Developer account status (STOR-01)**
   - What we know: An Apple Developer Program account ($99/year) is required to deploy to TestFlight and App Store.
   - What's unclear: Whether the account is already enrolled.
   - Recommendation: Verify enrollment status before starting. If not enrolled, this blocks TestFlight testing. Can still develop and run on personal device with free account.

5. **Tab bar: Fully custom vs TabView with appearance customization**
   - What we know: The floating pill tab bar with glass effect requires a custom implementation — default `TabView` appearance cannot achieve this.
   - What's unclear: Whether to use `TabView` with hidden default bar + custom overlay, or build entirely custom with state management.
   - Recommendation: Use `TabView` internally for tab switching logic but hide the default tab bar (`.toolbar(.hidden, for: .tabBar)`), then overlay a custom `FloatingTabBar` view. This preserves `TabView` state management while achieving the desired visual.

## Sources

### Primary (HIGH confidence)
- [supabase-swift GitHub](https://github.com/supabase/supabase-swift) — v2.41.1, platform requirements, KeychainLocalStorage, auth API
- [Supabase Swift Auth API Reference](https://supabase.com/docs/reference/swift/auth-api) — signIn, signOut, resetPasswordForEmail, authStateChanges
- [Supabase Swift Getting Started Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-swift) — session management pattern, auth state listener
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) — URL scheme setup, password reset deep link handling
- [KeychainAccess GitHub](https://github.com/kishikawakatsumi/KeychainAccess) — v4.2.2, biometric accessibility, API
- [Kingfisher GitHub](https://github.com/onevcat/Kingfisher) — v8.8.0, KFImage SwiftUI component
- [Apple LAContext documentation](https://developer.apple.com/documentation/localauthentication/lacontext) — deviceOwnerAuthentication vs deviceOwnerAuthenticationWithBiometrics policies
- [Apple SpriteKit Creating Particle Effects](https://developer.apple.com/documentation/spritekit/skemitternode/creating_particle_effects) — SKEmitterNode, .sks file
- [Apple Observation framework](https://developer.apple.com/documentation/SwiftUI/Migrating-from-the-observable-object-protocol-to-the-observable-macro) — @Observable migration guide
- [Apple Liquid Glass documentation](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views) — glassEffect modifier (iOS 26+)

### Secondary (MEDIUM confidence)
- [Hacking with Swift — Face ID/Touch ID tutorial](https://www.hackingwithswift.com/books/ios-swiftui/using-touch-id-and-face-id-with-swiftui) — verified LAContext implementation pattern
- [createwithswift.com — Background blur](https://www.createwithswift.com/implement-blurring-when-multitasking-in-swiftui/) — scenePhase blur pattern verified against Apple docs
- [tanaschita.com — SpriteKit particles in SwiftUI](https://tanaschita.com/spritekit-particles-snow-effect-swiftui/) — SpriteView + SKEmitterNode integration verified
- [Xcode 26 mandatory April 2026](https://medium.com/@saianbusekar/xcode-26-becomes-mandatory-in-april-2026-requirements-submission-checklist-43a9a853105e) — confirmed by developer.apple.com/news
- [SceneKit deprecation at WWDC25](https://dev.to/arshtechpro/wwdc-2025-scenekit-deprecation-and-realitykit-migration-a-comprehensive-guide-for-ios-developers-o26) — confirmed by Apple developer docs
- [Supabase session persistence discussion](https://github.com/orgs/supabase/discussions/35158) — community-verified KeychainLocalStorage behavior

### Tertiary (LOW confidence)
- [SwiftUI sensory feedback](https://useyourloaf.com/blog/swiftui-sensory-feedback/) — iOS 17+ `.sensoryFeedback()` modifier (single source, but aligns with Apple docs)
- [Custom font PostScript name gotcha](https://sarunw.com/posts/how-to-add-custom-fonts-to-ios-app/) — silent fallback behavior (community knowledge)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three libraries verified via GitHub releases with exact versions
- Architecture: HIGH — patterns verified against official Apple docs and supabase-swift official tutorials
- Auth flow: HIGH — signInWithPassword, authStateChanges, KeychainLocalStorage all confirmed in official docs
- Biometrics: HIGH — LAContext API stable since iOS 8, `.deviceOwnerAuthentication` policy well-documented
- Design system: MEDIUM — glass effects for iOS 17 use `.ultraThinMaterial` (proven); native Liquid Glass requires iOS 26
- Particle animation: MEDIUM — SpriteKit + SwiftUI integration verified, but specific "flowing data points" effect needs creative implementation in .sks editor
- Tab navigation: MEDIUM — custom floating pill tab bar is a custom build; pattern derived from community examples
- Pitfalls: HIGH — sourced from GitHub issues, community discussions, and official gotchas documentation

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (30 days — stable domain, no fast-moving breaking changes expected)
