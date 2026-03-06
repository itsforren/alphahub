import SwiftUI

struct PlaceholderView: View {
    var title: String = "Alpha Hub"
    var icon: String = "bolt.fill"
    var showSignOut: Bool = false

    @Environment(AuthManager.self) private var authManager

    var body: some View {
        ZStack {
            AppColors.pureBlack.ignoresSafeArea()

            VStack(spacing: AppSpacing.md) {
                Spacer()

                Image(systemName: icon)
                    .font(.system(size: 48))
                    .foregroundColor(AppColors.textTertiary)

                Text(title)
                    .font(AppTypography.heading2)
                    .foregroundColor(AppColors.textPrimary)

                Text("Coming soon")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)

                Spacer()

                if showSignOut {
                    Button {
                        Task {
                            try? await authManager.signOut()
                        }
                    } label: {
                        Text("Sign Out")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.error.opacity(0.8))
                    }
                    .padding(.bottom, 100) // Clear the floating tab bar
                }
            }
        }
    }
}
