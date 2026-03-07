import SwiftUI

/// Custom floating pill tab bar with crimson selected state.
/// Generic over any `TabItem` conforming type (ClientTab or AdminTab).
struct FloatingTabBar<Tab: TabItem>: View {
    @Binding var selection: Tab
    let tabs: [Tab]
    var badgeCounts: [Tab: Int] = [:]

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
                .fill(AppColors.surfaceElevated.opacity(0.95))
                .overlay(
                    Capsule()
                        .stroke(AppColors.border, lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.4), radius: 20, y: 10)
        .padding(.horizontal, AppSpacing.lg)
        .padding(.bottom, AppSpacing.sm)
        .sensoryFeedback(.selection, trigger: selection)
    }

    @ViewBuilder
    private func tabButton(for tab: Tab) -> some View {
        let isSelected = selection == tab
        let count = badgeCounts[tab] ?? 0

        Button {
            withAnimation(.spring(duration: 0.3, bounce: 0.2)) {
                selection = tab
            }
        } label: {
            VStack(spacing: 4) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: tab.icon)
                        .font(.system(size: 20))
                        .symbolEffect(.bounce, value: isSelected)

                    // Badge overlay
                    if count > 0 {
                        Text(count > 9 ? "9+" : "\(count)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white)
                            .frame(minWidth: 14, minHeight: 14)
                            .background(AppColors.error)
                            .clipShape(Circle())
                            .offset(x: 8, y: -8)
                    }
                }

                Text(tab.title)
                    .font(AppTypography.captionSmall)

                // Crimson indicator dot
                Circle()
                    .fill(isSelected ? AppColors.accent : Color.clear)
                    .frame(width: 4, height: 4)
            }
            .foregroundColor(isSelected ? AppColors.accent : AppColors.textTertiary)
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
