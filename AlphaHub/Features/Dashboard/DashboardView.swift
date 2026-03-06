import SwiftUI

/// Main dashboard screen showing wallet hero, quick links, and business results.
/// Replaces the Home tab placeholder in ClientTabView.
/// Uses @Environment(DataManager.self) for reactive data observation.
struct DashboardView: View {
    @Environment(DataManager.self) private var dataManager

    var body: some View {
        ScrollView {
            if dataManager.isInitialLoad {
                shimmerContent
            } else {
                liveContent
            }
        }
        .refreshable {
            await dataManager.refreshAll()
            HapticManager.notification(.success)
        }
        .background(AppColors.pureBlack)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Live Content

    private var liveContent: some View {
        LazyVStack(alignment: .leading, spacing: AppSpacing.lg) {
            // Welcome greeting
            Text("Welcome, \(dataManager.firstName)")
                .font(AppTypography.heading2)
                .foregroundColor(AppColors.textPrimary)

            // Quick link pills
            QuickLinkPills(profile: dataManager.clientProfile)

            // Wallet hero card (dominant element)
            WalletHeroCard()

            // Business results section
            BusinessResultsSection()

            // Bottom padding to clear floating tab bar
            Spacer()
                .frame(height: 100)
        }
        .padding(.horizontal, AppSpacing.screenPadding)
        .padding(.top, AppSpacing.md)
    }

    // MARK: - Shimmer Loading State

    private var shimmerContent: some View {
        VStack(alignment: .leading, spacing: AppSpacing.lg) {
            // Welcome greeting placeholder
            RoundedRectangle(cornerRadius: 6)
                .fill(AppColors.surfaceElevated)
                .frame(width: 180, height: 26)
                .shimmer()

            // Quick links placeholder
            HStack(spacing: AppSpacing.sm) {
                ForEach(0..<3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 12)
                        .fill(AppColors.surfaceElevated)
                        .frame(width: 80, height: 28)
                }
            }
            .shimmer()

            // Wallet hero placeholder
            RoundedRectangle(cornerRadius: 20)
                .fill(AppColors.surfaceElevated)
                .frame(height: 240)
                .shimmer()

            // Business results placeholder
            RoundedRectangle(cornerRadius: 6)
                .fill(AppColors.surfaceElevated)
                .frame(width: 160, height: 20)
                .shimmer()

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.md) {
                ForEach(0..<4, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 12)
                        .fill(AppColors.surfaceElevated)
                        .frame(height: 72)
                }
            }
            .shimmer()

            Spacer()
                .frame(height: 100)
        }
        .padding(.horizontal, AppSpacing.screenPadding)
        .padding(.top, AppSpacing.md)
    }
}

#Preview {
    NavigationStack {
        DashboardView()
    }
    .environment(DataManager())
    .preferredColorScheme(.dark)
}
