import SwiftUI

/// Client 5-tab layout with floating pill tab bar.
/// Each tab wraps content in NavigationStack (inside tab, not wrapping TabView).
struct ClientTabView: View {
    @Environment(AppRouter.self) private var router
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        @Bindable var router = router

        ZStack(alignment: .bottom) {
            TabView(selection: $router.clientTab) {
                NavigationStack {
                    DashboardView()
                }
                .tag(ClientTab.home)

                NavigationStack {
                    BillingView()
                }
                .tag(ClientTab.wallet)

                NavigationStack {
                    PlaceholderView(
                        title: "Chat",
                        icon: "bubble.left.and.bubble.right.fill"
                    )
                }
                .tag(ClientTab.chat)

                NavigationStack {
                    PlaceholderView(
                        title: "Courses",
                        icon: "book.fill"
                    )
                }
                .tag(ClientTab.courses)

                NavigationStack {
                    PlaceholderView(
                        title: "More",
                        icon: "ellipsis.circle.fill",
                        showSignOut: true
                    )
                }
                .tag(ClientTab.more)
            }
            .toolbar(.hidden, for: .tabBar)

            FloatingTabBar(
                selection: $router.clientTab,
                tabs: Array(ClientTab.allCases)
            )
        }
    }
}
