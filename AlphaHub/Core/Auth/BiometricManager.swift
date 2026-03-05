import LocalAuthentication
import Foundation

@MainActor
@Observable
final class BiometricManager {
    private(set) var isUnlocked = false
    private var lastAuthTime: Date?

    /// Grace period in seconds — skip biometric if user returns within this window
    private let gracePeriod: TimeInterval = 30

    func authenticate() async {
        // Check grace period
        if let lastAuth = lastAuthTime,
           Date().timeIntervalSince(lastAuth) < gracePeriod {
            isUnlocked = true
            return
        }

        let context = LAContext()
        var error: NSError?

        // Use deviceOwnerAuthentication — includes biometric + passcode fallback
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            // Device doesn't support authentication — unlock anyway (simulator, etc.)
            isUnlocked = true
            return
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "Unlock Alpha Hub to access your account"
            )
            if success {
                isUnlocked = true
                lastAuthTime = Date()
            }
        } catch {
            // User cancelled or failed — stay locked
            isUnlocked = false
        }
    }

    func lock() {
        isUnlocked = false
    }
}
