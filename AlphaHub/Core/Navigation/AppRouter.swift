import SwiftUI

/// Simple routing state for programmatic tab switching.
/// Inject via `.environment()` in AlphaHubApp.
/// Future use: deep linking from push notifications (Phase 3).
@MainActor
@Observable
final class AppRouter: Sendable {
    var clientTab: ClientTab = .home
    var adminTab: AdminTab = .dashboard
}
