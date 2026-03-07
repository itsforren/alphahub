import SwiftUI

/// Reusable translucent glass card with solid background, border, and shadow.
struct GlassCard<Content: View>: View {
    let cornerRadius: CGFloat
    let tinted: Bool
    @ViewBuilder let content: () -> Content

    init(cornerRadius: CGFloat = 20, tinted: Bool = false, @ViewBuilder content: @escaping () -> Content) {
        self.cornerRadius = cornerRadius
        self.tinted = tinted
        self.content = content
    }

    var body: some View {
        content()
            .padding(AppSpacing.md)
            .glassCard(cornerRadius: cornerRadius, tinted: tinted)
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()

        VStack(spacing: AppSpacing.lg) {
            GlassCard {
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Glass Card")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)
                    Text("Standard surface")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            GlassCard(tinted: true) {
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    Text("Tinted Card")
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)
                    Text("Crimson accent wash")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(AppSpacing.screenPadding)
    }
    .preferredColorScheme(.dark)
}
