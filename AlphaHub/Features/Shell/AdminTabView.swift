import SwiftUI

/// Admin 4-tab layout with floating pill tab bar.
/// Each tab wraps content in NavigationStack (inside tab, not wrapping TabView).
struct AdminTabView: View {
    @Environment(AppRouter.self) private var router
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        @Bindable var router = router

        ZStack(alignment: .bottom) {
            TabView(selection: $router.adminTab) {
                NavigationStack {
                    PlaceholderView(
                        title: "Dashboard",
                        icon: "square.grid.2x2.fill"
                    )
                }
                .tag(AdminTab.dashboard)

                NavigationStack {
                    PlaceholderView(
                        title: "Clients",
                        icon: "person.2.fill"
                    )
                }
                .tag(AdminTab.clients)

                NavigationStack {
                    PlaceholderView(
                        title: "Chat",
                        icon: "bubble.left.and.bubble.right.fill"
                    )
                }
                .tag(AdminTab.chat)

                NavigationStack {
                    PlaceholderView(
                        title: "More",
                        icon: "ellipsis.circle.fill",
                        showSignOut: true
                    )
                }
                .tag(AdminTab.more)
            }
            .toolbar(.hidden, for: .tabBar)

            FloatingTabBar(
                selection: $router.adminTab,
                tabs: Array(AdminTab.allCases)
            )
        }
    }
}
