import SwiftUI

/// Custom floating pill tab bar with glass/blur effect.
/// Generic over any `TabItem` conforming type (ClientTab or AdminTab).
struct FloatingTabBar<Tab: TabItem>: View {
    @Binding var selection: Tab
    let tabs: [Tab]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(tabs, id: \.self) { tab in
                tabButton(for: tab)
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, 12)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .overlay(
                    Capsule()
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.4), radius: 20, y: 10)
        .padding(.horizontal, AppSpacing.lg)
        .padding(.bottom, AppSpacing.sm)
        .sensoryFeedback(.selection, trigger: selection)
    }

    @ViewBuilder
    private func tabButton(for tab: Tab) -> some View {
        Button {
            withAnimation(.spring(duration: 0.3, bounce: 0.2)) {
                selection = tab
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: tab.icon)
                    .font(.system(size: 20))
                    .symbolEffect(.bounce, value: selection == tab)

                Text(tab.title)
                    .font(AppTypography.captionSmall)
            }
            .foregroundColor(selection == tab ? AppColors.textPrimary : AppColors.textTertiary)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ZStack(alignment: .bottom) {
        AppColors.pureBlack.ignoresSafeArea()

        FloatingTabBar(
            selection: .constant(ClientTab.home),
            tabs: ClientTab.allCases
        )
    }
    .preferredColorScheme(.dark)
}
