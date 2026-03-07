import SwiftUI

struct GlassEffectModifier: ViewModifier {
    var cornerRadius: CGFloat = 20
    var tinted: Bool = false

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(tinted
                        ? AppColors.surfaceElevated.opacity(0.7).shadow(.inner(color: AppColors.accent.opacity(0.04), radius: 0))
                        : AppColors.surfaceElevated.opacity(0.7).shadow(.inner(color: .clear, radius: 0))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .fill(tinted ? AppColors.accent.opacity(0.04) : Color.clear)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .stroke(tinted ? AppColors.accentBorder : Color.white.opacity(0.08), lineWidth: 1)
                    )
            )
            .shadow(color: .black.opacity(0.5), radius: 24, y: 12)
    }
}

extension View {
    func glassCard(cornerRadius: CGFloat = 20, tinted: Bool = false) -> some View {
        modifier(GlassEffectModifier(cornerRadius: cornerRadius, tinted: tinted))
    }
}
