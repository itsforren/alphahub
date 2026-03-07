import UIKit
import UserNotifications

/// UIApplicationDelegate that handles APNs device token registration
/// and notification display/tap events.
///
/// Wired via `@UIApplicationDelegateAdaptor(AppDelegate.self)` in AlphaHubApp.
class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, @unchecked Sendable {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    // MARK: - Device Token

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let tokenString = deviceToken.map { String(format: "%02x", $0) }.joined()
        print("[Push] Device token: \(tokenString)")
        Task { @MainActor in
            await PushNotificationManager.shared.saveDeviceToken(tokenString)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[Push] Failed to register: \(error.localizedDescription)")
    }

    // MARK: - Foreground Notification Display

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping @Sendable (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        let type = userInfo["type"] as? String

        // Suppress chat notifications when user is already on the chat screen
        if type == "chat" {
            Task { @MainActor in
                if PushNotificationManager.shared.isOnChatScreen {
                    completionHandler([])
                } else {
                    completionHandler([.banner, .sound, .badge])
                }
            }
        } else {
            completionHandler([.banner, .sound, .badge])
        }
    }

    // MARK: - Notification Tap (Deep Link)

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping @Sendable () -> Void
    ) {
        // Extract sendable data on this thread to avoid sending non-Sendable userInfo
        let userInfo = response.notification.request.content.userInfo
        let sendableInfo: [String: String] = userInfo.reduce(into: [:]) { result, pair in
            if let key = pair.key as? String, let value = pair.value as? String {
                result[key] = value
            }
        }
        Task { @MainActor in
            PushNotificationManager.shared.handleNotificationTap(userInfo: sendableInfo)
            completionHandler()
        }
    }
}
