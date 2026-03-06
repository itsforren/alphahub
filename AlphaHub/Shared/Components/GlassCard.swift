import SwiftUI

/// Reusable translucent glass card with blur, border, and shadow.
/// Uses `.ultraThinMaterial` for iOS 17+ compatibility (NOT `.glassEffect()` which requires iOS 26).
struct GlassCard<Content: View>: View {
    let cornerRadius: CGFloat
    @ViewBuilder let content: () -> Content

    init(cornerRadius: CGFloat = 20, @ViewBuilder content: @escaping () -> Content) {
        self.cornerRadius = cornerRadius
        self.content = content
    }

    var body: some View {
        content()
            .padding(AppSpacing.md)
            .glassCard(cornerRadius: cornerRadius)
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()

        GlassCard {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Text("Glass Card")
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)
                Text("Translucent surface with blur")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(AppSpacing.screenPadding)
    }
    .preferredColorScheme(.dark)
}
