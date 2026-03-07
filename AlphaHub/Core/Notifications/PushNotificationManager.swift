import Foundation
import UserNotifications
import UIKit
import Supabase

/// Manages push notification lifecycle: permission, device token registration,
/// foreground handling, deep link routing, and badge management.
///
/// Singleton pattern required because `UIApplicationDelegate` callbacks
/// need a stable reference (AppDelegate cannot use @Environment).
@MainActor
@Observable
final class PushNotificationManager {
    static let shared = PushNotificationManager()

    // MARK: - Public State

    /// Set `true` when ChatView is visible to suppress in-app chat banners.
    var isOnChatScreen: Bool = false

    /// Whether notification permission has been granted by the user.
    var notificationPermissionGranted: Bool = false

    // MARK: - Private

    private var router: AppRouter?
    private let supabase: SupabaseClient

    private init(supabase: SupabaseClient = SupabaseConfig.client) {
        self.supabase = supabase
    }

    // MARK: - Configuration

    /// Store router reference for deep link navigation on notification tap.
    /// Call from AlphaHubApp after authentication.
    func configure(router: AppRouter) {
        self.router = router
    }

    // MARK: - Permission

    /// Request notification permission and register for remote notifications if granted.
    func requestPermission() async {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            notificationPermissionGranted = granted
            if granted {
                UIApplication.shared.registerForRemoteNotifications()
            }
        } catch {
            print("[Push] Permission request failed: \(error.localizedDescription)")
            notificationPermissionGranted = false
        }
    }

    // MARK: - Notification Categories

    /// Register notification categories for grouped display and action buttons.
    func registerNotificationCategories() {
        // Chat category with inline reply action
        let replyAction = UNTextInputNotificationAction(
            identifier: "REPLY",
            title: "Reply",
            options: []
        )
        let chatCategory = UNNotificationCategory(
            identifier: "CHAT_MESSAGE",
            actions: [replyAction],
            intentIdentifiers: [],
            options: []
        )

        // Other categories (grouping only, no custom actions)
        let billingCategory = UNNotificationCategory(
            identifier: "BILLING_REMINDER",
            actions: [],
            intentIdentifiers: [],
            options: []
        )
        let courseCategory = UNNotificationCategory(
            identifier: "COURSE_UPDATE",
            actions: [],
            intentIdentifiers: [],
            options: []
        )
        let leadCategory = UNNotificationCategory(
            identifier: "LEAD_NEW",
            actions: [],
            intentIdentifiers: [],
            options: []
        )
        let walletLowCategory = UNNotificationCategory(
            identifier: "WALLET_LOW",
            actions: [],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            chatCategory,
            billingCategory,
            courseCategory,
            leadCategory,
            walletLowCategory,
        ])
    }

    // MARK: - Device Token

    /// Save device token to Supabase `device_tokens` table.
    /// Silently fails if table doesn't exist yet (server-side setup may be pending).
    func saveDeviceToken(_ tokenString: String) async {
        do {
            let session = try await supabase.auth.session
            let userId = session.user.id.uuidString

            let record = DeviceTokenRecord(
                userId: userId,
                deviceToken: tokenString
            )

            // Upsert: insert or update on conflict (user_id, device_token)
            try await supabase
                .from("device_tokens")
                .upsert(record, onConflict: "user_id, device_token")
                .execute()
        } catch {
            // Silently fail -- device_tokens table may not exist yet
            print("[Push] Failed to save device token: \(error.localizedDescription)")
        }
    }

    // MARK: - Deep Link Routing

    /// Route notification tap to the correct tab based on payload "type" field.
    /// Accepts Sendable `[String: String]` for safe cross-isolation calls from AppDelegate.
    func handleNotificationTap(userInfo: [String: String]) {
        guard let typeString = userInfo["type"] else { return }
        handleNotificationTapByType(typeString)
    }

    /// Route to the correct tab for a given notification type string.
    /// Called directly from AppDelegate with extracted Sendable type string.
    func handleNotificationTapByType(_ typeString: String) {
        switch typeString {
        case "chat":
            router?.clientTab = .chat
        case "billing", "wallet_low":
            router?.clientTab = .wallet
        case "course":
            router?.clientTab = .courses
        case "lead":
            router?.clientTab = .home
        default:
            break
        }

        // Clear app badge on any notification tap
        Task {
            await clearBadge()
        }
    }

    // MARK: - Badge Management

    /// Clear the app icon badge count.
    func clearBadge() async {
        do {
            try await UNUserNotificationCenter.current().setBadgeCount(0)
        } catch {
            print("[Push] Failed to clear badge: \(error.localizedDescription)")
        }
    }
}
