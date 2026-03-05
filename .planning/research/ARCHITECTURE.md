# Architecture Patterns: Alpha Agent iOS App

**Domain:** Native iOS client portal connecting to existing Supabase backend
**Researched:** 2026-03-05
**Overall Confidence:** MEDIUM-HIGH (SDK docs verified via official sources; architecture patterns based on community consensus + Apple guidance)

---

## Recommended Architecture

### High-Level System Diagram

```
+------------------------------------------------------+
|                    iOS App (SwiftUI)                   |
|                                                        |
|  +-------------+  +-------------+  +--------------+   |
|  |   Features   |  |   Core      |  |  Design      |   |
|  |              |  |             |  |  System      |   |
|  | Dashboard    |  | Auth        |  | Colors       |   |
|  | Billing      |  | Networking  |  | Typography   |   |
|  | Chat         |  | Realtime    |  | Components   |   |
|  | Courses      |  | Storage     |  | Layouts      |   |
|  | Referrals    |  | Push Notifs |  |              |   |
|  | Onboarding   |  | Keychain    |  |              |   |
|  | Agreements   |  | Navigation  |  |              |   |
|  | Profile      |  |             |  |              |   |
|  +------+-------+  +------+------+  +--------------+   |
|         |                 |                             |
|         +--------+--------+                             |
|                  |                                      |
|          +-------v--------+                             |
|          |  Data Layer     |                            |
|          |  Repositories   |                            |
|          |  + Models       |                            |
|          +-------+---------+                            |
+------------------|-------------------------------------|+
                   |
                   v
+------------------------------------------------------+
|              Supabase Backend (Existing)               |
|                                                        |
|  Auth  |  PostgREST  |  Realtime  |  Storage  | Edge  |
|        |             |            |           | Funcs  |
+------------------------------------------------------+
```

### Architecture Pattern: MVVM with Repository Layer

**Recommendation:** Use **MVVM (Model-View-ViewModel)** with a **Repository abstraction** over Supabase. This is the consensus architecture for production SwiftUI apps in 2025-2026.

**Confidence:** HIGH -- verified across Apple's own guidance (WWDC sessions on @Observable), community consensus (SwiftLee, Hacking with Swift, Matteomanferdini), and the modern Swift ecosystem.

**Why MVVM, not TCA or Clean Architecture:**

| Pattern | Verdict | Rationale |
|---------|---------|-----------|
| **MVVM + Repository** | RECOMMENDED | Natural fit for SwiftUI's @Observable. Team of 1-3 developers. Moderate complexity. Well-documented. |
| TCA (The Composable Architecture) | NOT RECOMMENDED | Over-engineered for a client portal app. Steep learning curve. Best for complex state machines (games, financial trading). |
| Clean Architecture | NOT RECOMMENDED | Too many layers for a data-display app. Adds Interactors/UseCases that are pass-through for CRUD. Better for 10+ developer teams. |
| MV (Model-View, no ViewModel) | NOT RECOMMENDED | Apple suggests this for simple apps, but Alpha Agent has enough business logic (wallet computation, chat state, auth flow) to warrant ViewModels. |

**Key insight:** The web app already uses what amounts to MVVM -- React hooks (`useClientWallet`, `useChat`, `useBillingRecords`) are essentially ViewModels. The iOS app should mirror this pattern in Swift.

---

## Project Structure

### Recommended Folder Organization

```
AlphaAgent/
|-- AlphaAgentApp.swift              # App entry point, environment setup
|-- Info.plist                        # Face ID description, URL schemes
|-- Assets.xcassets/                  # App icons, color sets, images
|
|-- Core/                             # Shared infrastructure (non-feature)
|   |-- Supabase/
|   |   |-- SupabaseClient.swift      # Singleton client initialization
|   |   |-- SupabaseConfig.swift      # URL + anon key (from env or plist)
|   |
|   |-- Auth/
|   |   |-- AuthManager.swift         # @Observable — session, user, role
|   |   |-- KeychainService.swift     # Keychain wrapper for tokens/credentials
|   |   |-- BiometricService.swift    # Face ID / Touch ID via LocalAuthentication
|   |
|   |-- Networking/
|   |   |-- EdgeFunctionClient.swift  # Typed wrapper for supabase.functions.invoke()
|   |
|   |-- Realtime/
|   |   |-- RealtimeManager.swift     # Channel lifecycle, subscription management
|   |
|   |-- Push/
|   |   |-- PushNotificationManager.swift  # APNs registration, token storage
|   |   |-- AppDelegate.swift              # UIApplicationDelegate for push token
|   |
|   |-- Navigation/
|   |   |-- AppRouter.swift           # Tab + NavigationStack state
|   |   |-- DeepLinkHandler.swift     # URL scheme + universal link parsing
|   |
|   |-- Extensions/
|       |-- Date+Extensions.swift
|       |-- Decimal+Currency.swift
|       |-- String+Validation.swift
|
|-- Models/                           # Shared Codable data models
|   |-- Client.swift                  # mirrors clients table
|   |-- ChatMessage.swift             # mirrors chat_messages table
|   |-- ChatConversation.swift        # mirrors chat_conversations table
|   |-- BillingRecord.swift           # mirrors billing_records table
|   |-- ClientWallet.swift            # mirrors client_wallets table
|   |-- WalletTransaction.swift       # mirrors wallet_transactions table
|   |-- AdSpendDaily.swift            # mirrors ad_spend_daily table
|   |-- Course.swift                  # mirrors courses table
|   |-- Enrollment.swift              # mirrors enrollments table
|   |-- Lesson.swift                  # mirrors lessons table
|   |-- LessonProgress.swift          # mirrors lesson_progress table
|   |-- Referral.swift                # mirrors referrals table
|   |-- ReferralCode.swift            # mirrors referral_codes table
|   |-- OnboardingTask.swift          # mirrors onboarding_tasks table
|   |-- Agreement.swift               # mirrors agreements table
|   |-- Profile.swift                 # mirrors profiles table
|   |-- PaymentMethod.swift           # mirrors payment methods data
|
|-- Repositories/                     # Data access layer (Supabase queries)
|   |-- AuthRepository.swift          # sign in, sign out, session, user data
|   |-- ClientRepository.swift        # client profile, settings
|   |-- ChatRepository.swift          # conversations, messages, send, read receipts
|   |-- BillingRepository.swift       # billing records, wallet, transactions
|   |-- CourseRepository.swift        # courses, enrollments, progress
|   |-- ReferralRepository.swift      # referral codes, referral list
|   |-- OnboardingRepository.swift    # onboarding tasks
|   |-- AgreementRepository.swift     # agreements, OTP verification
|   |-- StorageRepository.swift       # file uploads (profile photos, chat attachments)
|
|-- Features/                         # Feature modules (View + ViewModel pairs)
|   |-- Auth/
|   |   |-- LoginView.swift
|   |   |-- LoginViewModel.swift
|   |   |-- BiometricPromptView.swift
|   |
|   |-- Dashboard/
|   |   |-- DashboardView.swift
|   |   |-- DashboardViewModel.swift
|   |   |-- WalletSummaryCard.swift
|   |   |-- UpcomingPaymentsCard.swift
|   |   |-- QuickActionsGrid.swift
|   |
|   |-- Billing/
|   |   |-- BillingView.swift
|   |   |-- BillingViewModel.swift
|   |   |-- BillingRecordRow.swift
|   |   |-- WalletDetailView.swift
|   |   |-- PaymentMethodsView.swift
|   |
|   |-- Chat/
|   |   |-- ChatListView.swift        # (for future multi-convo, currently 1:1)
|   |   |-- ChatView.swift
|   |   |-- ChatViewModel.swift
|   |   |-- MessageBubble.swift
|   |   |-- ChatInputBar.swift
|   |   |-- AttachmentPicker.swift
|   |
|   |-- Courses/
|   |   |-- CourseListView.swift
|   |   |-- CourseDetailView.swift
|   |   |-- CoursesViewModel.swift
|   |   |-- LessonView.swift
|   |   |-- VideoPlayerView.swift
|   |
|   |-- Referrals/
|   |   |-- ReferralsView.swift
|   |   |-- ReferralsViewModel.swift
|   |   |-- ShareReferralSheet.swift
|   |
|   |-- Onboarding/
|   |   |-- OnboardingChecklistView.swift
|   |   |-- OnboardingViewModel.swift
|   |   |-- TaskRow.swift
|   |
|   |-- Agreements/
|   |   |-- AgreementView.swift
|   |   |-- AgreementViewModel.swift
|   |   |-- OTPVerificationView.swift
|   |
|   |-- Profile/
|   |   |-- ProfileView.swift
|   |   |-- ProfileViewModel.swift
|   |   |-- SettingsView.swift
|   |   |-- NotificationPreferencesView.swift
|
|-- DesignSystem/                     # Reusable dark-first UI components
|   |-- Theme/
|   |   |-- AppTheme.swift            # Color tokens, spacing, corner radii
|   |   |-- Typography.swift          # Font styles (SF Pro hierarchy)
|   |   |-- ColorTokens.swift         # Semantic color definitions
|   |
|   |-- Components/
|       |-- AACard.swift              # Standard card container (dark surface)
|       |-- AAButton.swift            # Primary/secondary/ghost button styles
|       |-- AABadge.swift             # Status badges (active, paused, etc.)
|       |-- AATextField.swift         # Styled text input
|       |-- AALoadingView.swift       # Skeleton/shimmer loading state
|       |-- AAEmptyState.swift        # Empty state placeholder
|       |-- AAMetricCard.swift        # Numeric stat display
|       |-- AAAvatar.swift            # Profile image with fallback
|       |-- AATabBar.swift            # Custom tab bar (if needed)
```

**Confidence:** MEDIUM -- folder structure is opinionated based on feature-based patterns from SwiftUI community (SwiftLee, Kodeco, DEV Community). Specific file names will evolve during implementation. The key principle -- feature-based organization with shared Core, Models, Repositories -- is HIGH confidence.

---

## Component Boundaries

### Layer Responsibilities

| Layer | Responsibility | Knows About | Does NOT Know About |
|-------|---------------|-------------|---------------------|
| **View** (SwiftUI) | Renders UI, captures user input | ViewModel (via @Observable) | Supabase, repositories, network |
| **ViewModel** (@Observable) | Business logic, state management, data transformation | Repository interfaces | Supabase SDK directly, View implementation |
| **Repository** | Data access, Supabase queries, caching hints | Supabase client, Models | Views, ViewModels, UI state |
| **Model** (Codable structs) | Data shape, serialization | Nothing (pure data) | Everything |
| **Core Services** | Cross-cutting concerns (auth, push, realtime) | Supabase client | Feature-specific logic |

### Component Communication Map

| Component | Communicates With | Method |
|-----------|------------------|--------|
| `AlphaAgentApp` | `AuthManager`, `AppRouter`, `PushNotificationManager` | Environment injection |
| `AuthManager` | `AuthRepository`, `KeychainService`, `BiometricService` | Direct method calls |
| `DashboardViewModel` | `ClientRepository`, `BillingRepository` | async/await |
| `ChatViewModel` | `ChatRepository`, `RealtimeManager`, `StorageRepository` | async/await + AsyncStream |
| `BillingViewModel` | `BillingRepository`, `EdgeFunctionClient` | async/await |
| `CoursesViewModel` | `CourseRepository`, `StorageRepository` | async/await |
| `RealtimeManager` | `SupabaseClient.realtime` | Supabase channels |
| `PushNotificationManager` | APNs, `EdgeFunctionClient` (token storage) | UIApplicationDelegate |
| `AppRouter` | `DeepLinkHandler`, all feature views | NavigationStack + NavigationPath |

---

## Data Flow

### Primary Data Flow: View -> ViewModel -> Repository -> Supabase

```
 User taps "Refresh"
       |
       v
 [DashboardView]  ---- calls ----> [DashboardViewModel.loadData()]
                                            |
                                            v
                                    [BillingRepository.getWallet(clientId)]
                                    [BillingRepository.getAdSpend(clientId, since)]
                                    [ClientRepository.getClient(userId)]
                                            |
                                            v
                                    supabase.from("client_wallets").select(...)
                                    supabase.from("ad_spend_daily").select(...)
                                    supabase.from("clients").select(...)
                                            |
                                            v
                                    Codable structs decoded automatically
                                            |
                                            v
                                    ViewModel computes derived state:
                                    - wallet balance = deposits - spend
                                    - next payment date
                                    - status indicators
                                            |
                                            v
                                    @Observable triggers SwiftUI re-render
                                            |
                                            v
                                    [DashboardView] updates
```

### Real-Time Data Flow: Supabase Realtime -> App State

```
 [Supabase Postgres Change]  (e.g., new chat_messages row inserted)
       |
       v
 [RealtimeManager] receives change via channel subscription
       |
       v
 Posts to relevant ViewModel via callback or AsyncStream
       |
       v
 [ChatViewModel] receives new message
   - Appends to local messages array
   - Triggers haptic feedback
   - Updates unread badge count
       |
       v
 @Observable triggers SwiftUI re-render
       |
       v
 [ChatView] shows new message bubble with animation
```

### Auth Flow: Login -> Session -> Biometric Unlock

```
 FIRST LAUNCH:
   [LoginView] -- email/password --> [AuthManager.signIn()]
                                        |
                                        v
                                  supabase.auth.signIn(email:password:)
                                        |
                                        v
                                  Session returned (access_token + refresh_token)
                                        |
                                        v
                                  [AuthManager] stores session
                                  [KeychainService] stores refresh token
                                        |
                                        v
                                  Prompt: "Enable Face ID for quick login?"
                                        |
                                  YES: [KeychainService] stores credentials
                                       with biometric access control
                                        |
                                        v
                                  [AppRouter] -> Dashboard tab

 SUBSEQUENT LAUNCH:
   [BiometricPromptView] -- Face ID --> [BiometricService.authenticate()]
                                            |
                                            v
                                        LAContext.evaluatePolicy(.deviceOwnerAuthentication)
                                            |
                                            v
                                        SUCCESS: [KeychainService] reads stored credentials
                                                 [AuthManager.signIn()] with stored creds
                                                 OR: [AuthManager] restores session from Keychain
                                            |
                                            v
                                        [AppRouter] -> Dashboard tab

 SESSION REFRESH:
   Supabase Swift SDK handles this automatically via autoRefreshToken.
   The SDK persists sessions and refreshes tokens transparently.
```

### Push Notification Flow: APNs -> Supabase -> Device

```
 APP LAUNCH:
   [AppDelegate] -- didRegisterForRemoteNotificationsWithDeviceToken -->
     |
     v
   [PushNotificationManager] converts token to hex string
     |
     v
   Calls edge function or inserts into device_tokens table:
     supabase.from("device_tokens").upsert({
       user_id: currentUser.id,
       token: hexToken,
       platform: "ios",
       updated_at: Date()
     })

 SENDING (Server-Side -- already exists or needs edge function):
   [Database trigger or edge function] on new chat_messages INSERT
     |
     v
   Query device_tokens for recipient user_id
     |
     v
   Send APNs request via edge function using:
     - APNs key (.p8 from Apple Developer)
     - Device token
     - Notification payload (title, body, badge count, sound)

 RECEIVING:
   [iOS System] displays banner/lock screen notification
     |
     v
   User taps notification
     |
     v
   [AppDelegate] userNotificationCenter(_:didReceive:)
     |
     v
   [DeepLinkHandler] parses notification payload
     |
     v
   [AppRouter] navigates to Chat tab -> specific conversation
```

---

## Key Integration Points with Existing Backend

### Supabase Client Initialization (Swift)

```swift
import Supabase

// Singleton — initialized once at app launch
let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://qcunascacayiiuufjtaq.supabase.co")!,
    supabaseKey: "YOUR_ANON_KEY"  // Same anon key as web app
)
```

**Confidence:** HIGH -- verified from official Supabase Swift SDK docs and GitHub README (v2.41.1).

**Critical:** The iOS app uses the SAME Supabase project, SAME anon key, SAME RLS policies as the web app. No backend changes needed for read operations. The user authenticates with the same email/password, gets the same JWT, and RLS applies identically.

### Database Queries via PostgREST

The Supabase Swift SDK mirrors the JavaScript client API almost exactly. Repository methods translate cleanly:

```swift
// Swift equivalent of the web app's useClientWallet hook
func getWallet(clientId: String) async throws -> ClientWallet? {
    try await supabase
        .from("client_wallets")
        .select()
        .eq("client_id", value: clientId)
        .single()
        .execute()
        .value
}

// Swift equivalent of useComputedWalletBalance deposits query
func getDeposits(clientId: String) async throws -> [WalletTransaction] {
    try await supabase
        .from("wallet_transactions")
        .select()
        .eq("client_id", value: clientId)
        .eq("transaction_type", value: "deposit")
        .execute()
        .value
}

// Swift equivalent of useChat infinite scroll query
func getMessages(conversationId: String, before: Date? = nil, limit: Int = 50) async throws -> [ChatMessage] {
    var query = supabase
        .from("chat_messages")
        .select()
        .eq("conversation_id", value: conversationId)
        .order("created_at", ascending: false)
        .limit(limit)

    if let before = before {
        query = query.lt("created_at", value: before.iso8601String)
    }

    return try await query.execute().value
}
```

**Confidence:** HIGH -- verified from Supabase Swift SDK docs. The PostgREST Swift API uses the same chaining pattern as JavaScript.

### Edge Function Invocation

The iOS app calls the same edge functions the web app uses:

```swift
// Equivalent of web app's supabase.functions.invoke('chat-notification', {...})
struct ChatNotificationRequest: Encodable {
    let message: ChatMessage
    let type: String
}

func sendChatNotification(message: ChatMessage) async throws {
    try await supabase.functions.invoke(
        "chat-notification",
        options: FunctionInvokeOptions(
            body: ChatNotificationRequest(message: message, type: "INSERT")
        )
    )
}

// Equivalent of web app's check-low-balance invocation
func checkLowBalance(clientId: String) async throws {
    try await supabase.functions.invoke(
        "check-low-balance",
        options: FunctionInvokeOptions(
            body: ["clientId": clientId]
        )
    )
}
```

**Confidence:** HIGH -- verified from Supabase Swift `functions-invoke` docs. The SDK automatically includes the Authorization header with the current session's JWT.

### Realtime Subscriptions

Direct translation from the web app's chat realtime pattern:

```swift
// Swift equivalent of web app's useChatRealtime hook
class ChatRealtimeService {
    private var channel: RealtimeChannelV2?

    func subscribeToMessages(conversationId: String) -> AsyncStream<ChatMessage> {
        let channel = supabase.channel("chat-\(conversationId)")

        let insertions = channel.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "chat_messages",
            filter: .eq("conversation_id", value: conversationId)
        )

        Task { await channel.subscribe() }
        self.channel = channel

        return AsyncStream { continuation in
            Task {
                for await action in insertions {
                    if let message: ChatMessage = try? action.decodeRecord(as: ChatMessage.self) {
                        continuation.yield(message)
                    }
                }
            }
        }
    }

    func unsubscribe() async {
        if let channel {
            await supabase.removeChannel(channel)
        }
    }
}
```

**Confidence:** MEDIUM-HIGH -- the channel API is verified from Supabase Swift SDK docs. The exact `decodeRecord` method name needs verification during implementation (the SDK uses Codable, so automatic decoding should work, but the exact API surface for extracting typed records from InsertAction may differ slightly).

### Tables the iOS App Reads (Client Portal Scope)

| Table | Read | Write | Realtime | Notes |
|-------|------|-------|----------|-------|
| `clients` | Yes | Partial (profile updates) | No | Core client data |
| `profiles` | Yes | Yes (name, avatar) | No | User profile |
| `user_roles` | Yes | No | No | Role check (client/admin) |
| `chat_conversations` | Yes | Yes (create if missing) | Yes | 1:1 support chat |
| `chat_messages` | Yes | Yes (send messages) | Yes (INSERT) | Real-time chat |
| `billing_records` | Yes | No | No | Billing history |
| `client_wallets` | Yes | No | No | Wallet config |
| `wallet_transactions` | Yes | No | No | Deposit/spend history |
| `ad_spend_daily` | Yes | No | No | For balance computation |
| `payment_methods` (or Stripe data) | Yes | No | No | Stored cards display |
| `courses` | Yes | No | No | Course catalog |
| `enrollments` | Yes | Yes (enroll) | No | User enrollments |
| `lessons` | Yes | No | No | Lesson content |
| `lesson_progress` | Yes | Yes (mark complete) | No | Progress tracking |
| `referral_codes` | Yes | No | No | User's referral code |
| `referrals` | Yes | No | No | Referral list |
| `onboarding_tasks` | Yes | Yes (mark complete) | No | Onboarding checklist |
| `agreements` | Yes | Yes (sign) | No | Agreement signing |
| `device_tokens` | No | Yes (upsert) | No | Push notification tokens |

---

## Patterns to Follow

### Pattern 1: @Observable ViewModel with async/await

**What:** Each feature screen has a ViewModel marked with @Observable (iOS 17+) that owns all state and business logic. Views observe specific properties, so SwiftUI only re-renders when the property that view reads changes.

**When:** Every feature screen.

**Example:**

```swift
import Observation

@Observable
class DashboardViewModel {
    // Published state
    var walletBalance: Decimal = 0
    var totalDeposits: Decimal = 0
    var trackedSpend: Decimal = 0
    var upcomingPayments: [BillingRecord] = []
    var clientName: String = ""
    var isLoading = true
    var errorMessage: String?

    // Dependencies
    private let billingRepo: BillingRepository
    private let clientRepo: ClientRepository

    init(billingRepo: BillingRepository, clientRepo: ClientRepository) {
        self.billingRepo = billingRepo
        self.clientRepo = clientRepo
    }

    func loadData(clientId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            async let wallet = billingRepo.getWallet(clientId: clientId)
            async let deposits = billingRepo.getDeposits(clientId: clientId)
            async let spend = billingRepo.getAdSpend(clientId: clientId, since: wallet?.tracking_start_date)
            async let client = clientRepo.getClient(clientId: clientId)

            let (w, d, s, c) = try await (wallet, deposits, spend, client)

            totalDeposits = d.reduce(0) { $0 + $1.amount }
            trackedSpend = s.reduce(0) { $0 + ($1.cost ?? 0) }
            walletBalance = totalDeposits - trackedSpend
            clientName = c?.name ?? ""
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
```

**Confidence:** HIGH -- @Observable is Apple's recommended approach for iOS 17+. Verified via Apple Developer Documentation migration guide.

### Pattern 2: Repository Protocol for Testability

**What:** Define repository protocols so ViewModels can be tested with mock implementations.

```swift
protocol BillingRepositoryProtocol {
    func getWallet(clientId: String) async throws -> ClientWallet?
    func getDeposits(clientId: String) async throws -> [WalletTransaction]
    func getAdSpend(clientId: String, since: String?) async throws -> [AdSpendDaily]
    func getBillingRecords(clientId: String) async throws -> [BillingRecord]
}

class SupabaseBillingRepository: BillingRepositoryProtocol {
    func getWallet(clientId: String) async throws -> ClientWallet? {
        try await supabase.from("client_wallets")
            .select()
            .eq("client_id", value: clientId)
            .single()
            .execute()
            .value
    }
    // ... other methods
}
```

### Pattern 3: Environment-Based Dependency Injection

**What:** Use SwiftUI's `.environment()` modifier to inject services app-wide. No third-party DI framework needed.

```swift
@main
struct AlphaAgentApp: App {
    @State private var authManager = AuthManager()
    @State private var router = AppRouter()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authManager)
                .environment(router)
        }
    }
}

// In any view:
struct DashboardView: View {
    @Environment(AuthManager.self) private var auth
    @State private var viewModel: DashboardViewModel

    init() {
        _viewModel = State(initialValue: DashboardViewModel(
            billingRepo: SupabaseBillingRepository(),
            clientRepo: SupabaseClientRepository()
        ))
    }

    var body: some View {
        // ...
    }
}
```

**Confidence:** HIGH -- this is Apple's documented approach with @Observable + .environment() in iOS 17+.

### Pattern 4: Codable Models with CodingKeys for snake_case

**What:** Supabase tables use snake_case. Swift models use camelCase. Bridge with CodingKeys or a custom decoder.

```swift
struct ClientWallet: Codable, Identifiable {
    let id: String
    let clientId: String
    let adSpendBalance: Decimal
    let lowBalanceThreshold: Decimal
    let autoChargeAmount: Decimal?
    let autoBillingEnabled: Bool
    let monthlyAdSpendCap: Decimal?
    let billingMode: String
    let trackingStartDate: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case clientId = "client_id"
        case adSpendBalance = "ad_spend_balance"
        case lowBalanceThreshold = "low_balance_threshold"
        case autoChargeAmount = "auto_charge_amount"
        case autoBillingEnabled = "auto_billing_enabled"
        case monthlyAdSpendCap = "monthly_ad_spend_cap"
        case billingMode = "billing_mode"
        case trackingStartDate = "tracking_start_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
```

**Alternative:** Configure a global `JSONDecoder` with `.convertFromSnakeCase` on the Supabase client. This avoids manual CodingKeys but may break on fields that don't follow strict snake_case conventions. Given the existing database uses consistent snake_case, this approach may work:

```swift
// If the SDK supports custom decoder configuration (needs verification)
// Otherwise, use CodingKeys per model for full control
```

**Confidence:** HIGH for CodingKeys approach (standard Swift). MEDIUM for global decoder approach (needs SDK verification).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Supabase Calls in Views

**What:** Calling `supabase.from(...)` directly inside SwiftUI View bodies or `.task` modifiers.

**Why bad:** Violates separation of concerns. Makes views untestable. Scatters database logic across 40+ view files. When a table column name changes, you must find-and-replace across the entire codebase.

**Instead:** All Supabase calls go through Repository classes. Views call ViewModel methods. ViewModels call Repository methods.

### Anti-Pattern 2: ObservableObject + @Published (Legacy Pattern)

**What:** Using the pre-iOS 17 `ObservableObject` protocol with `@Published` properties and `@StateObject` / `@ObservedObject` in views.

**Why bad:** Every change to any `@Published` property re-renders ALL views observing that object. With @Observable (iOS 17+), SwiftUI tracks which specific properties each view reads and only re-renders when those specific properties change. This is a significant performance improvement.

**Instead:** Use `@Observable` macro on ViewModels. Use `@State` for view-owned observable state. Use `.environment()` for shared services.

### Anti-Pattern 3: Fat ViewModels That Own Realtime

**What:** Putting Realtime channel management directly inside individual ViewModels (subscribing in init, unsubscribing in deinit).

**Why bad:** ViewModel lifecycle doesn't always match channel lifecycle. Multiple views may need the same channel. Channels may leak if ViewModels aren't properly deallocated.

**Instead:** Centralize Realtime in `RealtimeManager`. ViewModels request subscriptions and receive data via callbacks or AsyncStream. RealtimeManager owns channel lifecycle.

### Anti-Pattern 4: Rebuilding the Web App's Layout on Mobile

**What:** Trying to replicate the web app's exact layout (sidebar + detail pane, data tables with many columns) on a phone screen.

**Why bad:** Web layouts don't translate to mobile. Users have different expectations on mobile (quick glance, single task focus). Data tables with 8 columns are unreadable on a 390pt-wide screen.

**Instead:** Redesign for mobile-first interaction patterns. Use cards instead of tables. Show summary on main screen, detail on drill-down. Prioritize the 3 most important data points, not all 12.

### Anti-Pattern 5: Storing Supabase Credentials in UserDefaults

**What:** Saving access tokens, refresh tokens, or user credentials in UserDefaults.

**Why bad:** UserDefaults is not encrypted. Any app with the same app group or a jailbroken device can read it. Apple's App Store review may reject apps storing sensitive data insecurely.

**Instead:** Use Keychain for all sensitive credentials. The Supabase Swift SDK handles its own session persistence (likely using Keychain internally, but verify). For Face ID unlock credentials, use Keychain with `.whenPasscodeSetThisDeviceOnly` access control.

---

## Navigation Architecture

### Tab-Based Navigation with NavigationStack per Tab

```swift
enum AppTab: Hashable {
    case dashboard
    case billing
    case chat
    case courses
    case more  // Profile, Referrals, Agreements, Onboarding, Settings
}

@Observable
class AppRouter {
    var selectedTab: AppTab = .dashboard
    var dashboardPath = NavigationPath()
    var billingPath = NavigationPath()
    var chatPath = NavigationPath()
    var coursesPath = NavigationPath()
    var morePath = NavigationPath()

    func handleDeepLink(_ url: URL) {
        // Parse URL scheme: alphagent://chat/conversation-id
        // Or universal link: alphaagent.io/portal/chat
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return }

        switch components.host {
        case "chat":
            selectedTab = .chat
            // Push conversation if ID provided
        case "billing":
            selectedTab = .billing
        case "courses":
            selectedTab = .courses
            // Push specific course if ID provided
        default:
            selectedTab = .dashboard
        }
    }
}
```

**Tab structure recommendation:**

| Tab | Icon | Primary Content |
|-----|------|----------------|
| Dashboard | `house.fill` | Wallet balance, key stats, quick actions |
| Billing | `dollarsign.circle.fill` | Billing records, wallet detail, payment methods |
| Chat | `message.fill` + badge | Support chat (single conversation) |
| Courses | `play.rectangle.fill` | Course list, video lessons |
| More | `ellipsis.circle.fill` | Profile, Referrals, Onboarding, Agreements, Settings |

**Why 5 tabs, not more:** Apple Human Interface Guidelines recommend max 5 tabs. Putting Profile, Referrals, Onboarding, and Agreements under "More" keeps the tab bar clean. Onboarding and Agreements are one-time/occasional features that don't need top-level tabs.

**Confidence:** HIGH for tab structure (standard iOS pattern). The specific feature grouping is opinionated but reasonable.

---

## State Management Strategy

### Hierarchy

```
App Level (lives for app lifetime):
  - AuthManager (@Observable, in .environment)
  - AppRouter (@Observable, in .environment)
  - PushNotificationManager (singleton)

Feature Level (lives for screen lifetime):
  - DashboardViewModel (@State in DashboardView)
  - ChatViewModel (@State in ChatView)
  - BillingViewModel (@State in BillingView)
  - etc.

View Level (lives for view lifetime):
  - Form input states (@State)
  - Presentation states (sheets, alerts) (@State)
  - Animation states (@State)
```

### How AuthManager Works

```swift
@Observable
class AuthManager {
    var currentUser: User?
    var currentSession: Session?
    var clientId: String?
    var role: String?
    var isAuthenticated: Bool { currentSession != nil }
    var isLoading = true

    private let keychainService = KeychainService()
    private let biometricService = BiometricService()

    func initialize() async {
        // 1. Check for existing session (SDK handles persistence)
        // 2. Listen for auth state changes
        for await (event, session) in await supabase.auth.authStateChanges {
            await MainActor.run {
                self.currentSession = session
                self.currentUser = session?.user
            }

            if let userId = session?.user.id {
                await fetchClientData(userId: userId)
            }
        }
    }

    @MainActor
    func signIn(email: String, password: String) async throws {
        try await supabase.auth.signIn(email: email, password: password)
        // authStateChanges will fire and update state
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
        keychainService.clearStoredCredentials()
        // authStateChanges will fire and clear state
    }

    private func fetchClientData(userId: String) async {
        // Fetch role from user_roles
        // Fetch client record by user_id
        // Set clientId and role
    }
}
```

---

## Design System: Dark-First Theme

### Approach

Define all colors as semantic tokens. The "dark" theme is the primary/default. A light variant can exist but is secondary.

```swift
// ColorTokens.swift
import SwiftUI

enum AAColor {
    // Backgrounds (dark first)
    static let backgroundPrimary = Color("BackgroundPrimary")     // #0A0A0A (near black)
    static let backgroundSecondary = Color("BackgroundSecondary") // #141414 (card surface)
    static let backgroundTertiary = Color("BackgroundTertiary")   // #1E1E1E (elevated surface)

    // Text
    static let textPrimary = Color("TextPrimary")       // #FFFFFF
    static let textSecondary = Color("TextSecondary")    // #A0A0A0
    static let textTertiary = Color("TextTertiary")      // #666666

    // Accent / Brand
    static let accentPrimary = Color("AccentPrimary")    // Brand green or gold
    static let accentSecondary = Color("AccentSecondary")

    // Semantic
    static let success = Color("Success")   // Green
    static let warning = Color("Warning")   // Amber
    static let error = Color("Error")       // Red
    static let info = Color("Info")         // Blue

    // Borders
    static let border = Color("Border")             // #2A2A2A
    static let borderHighlight = Color("BorderHL")  // accent at 30% opacity
}

// Typography.swift
enum AAFont {
    static let largeTitle = Font.system(size: 34, weight: .bold)
    static let title = Font.system(size: 28, weight: .bold)
    static let title2 = Font.system(size: 22, weight: .semibold)
    static let title3 = Font.system(size: 20, weight: .semibold)
    static let headline = Font.system(size: 17, weight: .semibold)
    static let body = Font.system(size: 17, weight: .regular)
    static let callout = Font.system(size: 16, weight: .regular)
    static let subheadline = Font.system(size: 15, weight: .regular)
    static let footnote = Font.system(size: 13, weight: .regular)
    static let caption = Font.system(size: 12, weight: .regular)

    // Monospaced for financial data
    static let currency = Font.system(size: 34, weight: .bold, design: .rounded)
    static let currencySmall = Font.system(size: 20, weight: .semibold, design: .rounded)
    static let metric = Font.system(size: 24, weight: .bold, design: .rounded)
}

// Spacing.swift
enum AASpacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

// Radius.swift
enum AARadius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let full: CGFloat = 999
}
```

**Implementation:** Colors defined in `Assets.xcassets` as Color Sets with Dark/Light/Any variants. The Color("name") initializer loads from asset catalog. This allows the system to resolve the correct color per appearance while keeping the source of truth in one place.

**Confidence:** HIGH -- this is standard SwiftUI design system practice. Exact color values (hex codes) are design decisions, not architecture decisions.

---

## Minimum iOS Version Decision

**Recommendation:** iOS 17.0 minimum

**Rationale:**
- `@Observable` macro requires iOS 17 -- this is the single most important Swift/SwiftUI feature for clean architecture
- SwiftUI has major improvements in iOS 17 (animation, ScrollView, sensory feedback)
- As of March 2026, iOS 17+ covers ~95% of active iPhones (iOS adoption is fast)
- iOS 16 would force using the older `ObservableObject` pattern everywhere

**Confidence:** HIGH -- the @Observable requirement alone makes this a clear decision. Dropping to iOS 16 would fundamentally change the architecture.

---

## Suggested Build Order

Build order is driven by dependencies. Each layer must exist before features that depend on it.

### Phase 1: Foundation (Must Build First)

Everything else depends on these:

1. **Xcode project setup** -- SPM packages, folder structure, Supabase Swift SDK dependency
2. **Supabase client initialization** -- `SupabaseClient.swift` with URL + anon key
3. **Models** -- All Codable structs matching Supabase tables (can be done in bulk)
4. **Design System** -- Color tokens, typography, spacing, base components (AACard, AAButton)
5. **AuthManager** -- Sign in, sign out, session persistence, auth state listener
6. **KeychainService** -- Credential storage for biometric unlock
7. **AppRouter** -- Tab structure, NavigationStack per tab

**Why first:** Every feature screen needs auth, models, design tokens, and navigation. Building these first eliminates blockers.

### Phase 2: Core Features (Depends on Phase 1)

The features clients use daily:

8. **Dashboard** -- Wallet balance (requires BillingRepository), client name, quick stats
9. **Billing** -- Records table, wallet detail, payment methods display
10. **Chat** -- Conversation view, send messages, attachments
11. **RealtimeManager** -- Chat message subscriptions (required for live chat)

**Why second:** Dashboard + Billing + Chat are the three features clients open most. Chat needs Realtime.

### Phase 3: Content & Engagement (Depends on Phase 1)

Features that are important but not daily-use:

12. **Courses** -- Course list, lesson view, video player, progress tracking
13. **Referrals** -- Referral code display, share sheet, referral list
14. **Profile** -- Profile view, settings, notification preferences

**Why third:** These features are self-contained and don't block each other.

### Phase 4: Onboarding & Legal (Depends on Phase 1)

One-time or occasional features:

15. **Onboarding Checklist** -- Task list with completion tracking
16. **Agreements** -- Agreement display, OTP verification, signing

**Why fourth:** Only used during onboarding period. Lower priority for MVP.

### Phase 5: Platform Features (Depends on Phases 1-4)

Features that require the full app to be functional:

17. **Push Notifications** -- APNs setup, device token registration, notification handling
18. **Deep Linking** -- URL scheme handling, push notification navigation
19. **Biometric Auth** -- Face ID prompt, Keychain integration for quick unlock

**Why fifth:** Push needs all features built so notifications can navigate anywhere. Biometric is polish, not core function.

### Phase 6: App Store (Depends on everything)

20. **Apple Developer setup** -- Certificates, provisioning profiles, App Store Connect
21. **App Store assets** -- Screenshots, description, privacy policy
22. **TestFlight** -- Beta testing
23. **App Store submission** -- Review and approval

### Dependency Graph

```
Phase 1: Foundation
  |
  +-- Phase 2: Core Features (Dashboard, Billing, Chat, Realtime)
  |     |
  |     +-- Phase 5: Push Notifications (needs features to navigate to)
  |     +-- Phase 5: Deep Linking (needs features to navigate to)
  |
  +-- Phase 3: Content (Courses, Referrals, Profile)
  |
  +-- Phase 4: Onboarding (Checklist, Agreements)
  |
  +-- Phase 5: Biometric Auth (polish feature)
       |
       +-- Phase 6: App Store Submission
```

---

## Scalability Considerations

| Concern | At Launch (~50 clients) | At Scale (~500 clients) | Notes |
|---------|------------------------|------------------------|-------|
| Realtime connections | Fine -- Supabase handles | Monitor channel count | Each active chat = 1 channel |
| API rate limits | No concern | Check Supabase plan limits | PostgREST is efficient |
| Push notifications | Simple APNs | May need batching | Edge function handles sending |
| Image caching | URLCache sufficient | Add Kingfisher/Nuke library | Profile photos, course thumbnails |
| Offline support | Not needed (online-only) | Consider local cache | Future enhancement |

---

## Sources

### HIGH Confidence (Official Documentation)
- [Supabase Swift SDK GitHub](https://github.com/supabase/supabase-swift) -- v2.41.1, platform requirements, installation
- [Supabase Swift API Reference](https://supabase.com/docs/reference/swift/introduction) -- Auth, PostgREST, Realtime, Functions, Storage APIs
- [Supabase Swift Realtime Subscribe](https://supabase.com/docs/reference/swift/subscribe) -- Channel creation, Postgres changes, AsyncStream patterns
- [Supabase Swift Functions Invoke](https://supabase.com/docs/reference/swift/functions-invoke) -- Edge function invocation with typed responses
- [Supabase Swift Auth State Changes](https://supabase.com/docs/reference/swift/auth-onauthstatechange) -- Session management, event types
- [Supabase User Management Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-swift) -- Client init, Codable models, deep links
- [Apple: Migrating to Observable macro](https://developer.apple.com/documentation/SwiftUI/Migrating-from-the-observable-object-protocol-to-the-observable-macro) -- @Observable migration guide
- [Supabase Push Notifications Guide](https://supabase.com/docs/guides/functions/examples/push-notifications) -- APNs/FCM approach via edge functions

### MEDIUM Confidence (Community Consensus)
- [SwiftLee: MVVM Pattern in SwiftUI](https://www.avanderlee.com/swiftui/mvvm-architectural-coding-pattern-to-structure-views/) -- MVVM architecture guidance
- [Hacking with Swift: Face ID/Touch ID](https://www.hackingwithswift.com/books/ios-swiftui/using-touch-id-and-face-id-with-swiftui) -- Biometric authentication
- [NavigationStack + Deep Linking patterns](https://swiftwithmajid.com/2022/06/21/mastering-navigationstack-in-swiftui-deep-linking/) -- Tab + NavigationPath architecture
- [SwiftUI Design Systems (DEV Community)](https://dev.to/swift_pal/master-swiftui-design-systems-from-scattered-colors-to-unified-ui-components-4i9c) -- Color tokens, semantic theming
- [Feature-Based Project Structure](https://medium.com/@omarbasaleh2/feature-based-project-structure-for-swiftui-218e3583d6f0) -- Folder organization
- [Modern MVVM in SwiftUI 2025](https://medium.com/@minalkewat/modern-mvvm-in-swiftui-2025-the-clean-architecture-youve-been-waiting-for-72a7d576648e) -- @Observable + Repository pattern

### LOW Confidence (Needs Verification During Implementation)
- Exact `InsertAction.decodeRecord(as:)` API for typed Realtime decoding (may need different method name)
- Whether Supabase Swift SDK supports custom JSONDecoder with `.convertFromSnakeCase` globally
- Specific APNs setup requirements for Supabase (may need custom edge function for sending, not just receiving)
- Device token storage table schema (may need to create `device_tokens` table if not existing)
