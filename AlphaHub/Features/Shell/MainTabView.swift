import SwiftUI

/// Role-based shell switch. Routes to client or admin tab view.
/// Admin and member roles see admin tabs. Client, referrer, and guest roles see client tabs.
struct MainTabView: View {
    let role: UserRole

    var body: some View {
        switch role {
        case .admin, .member:
            AdminTabView()
        case .client, .referrer, .guest:
            ClientTabView()
        }
    }
}
