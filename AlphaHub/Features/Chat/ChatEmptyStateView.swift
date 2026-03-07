import SwiftUI

/// Welcome screen shown when no messages exist in the conversation.
/// Displays support hours and encourages the client to start a conversation.
struct ChatEmptyStateView: View {
    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            Spacer()

            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 56))
                .foregroundColor(AppColors.textTertiary)

            VStack(spacing: AppSpacing.sm) {
                Text("Welcome to Alpha Hub Support")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)
                    .multilineTextAlignment(.center)

                Text("Send us a message anytime.\nWe're available Monday \u{2014} Friday, 9 AM \u{2014} 5 PM EST.")
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)

                Text("We'll get back to you within 24 hours outside business hours.")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
            Spacer()
        }
        .padding(.horizontal, AppSpacing.xl)
    }
}
