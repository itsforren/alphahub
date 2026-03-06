import SwiftUI

/// Shimmer loading animation modifier.
/// Applies `.redacted(reason: .placeholder)` and overlays an animating gradient
/// to create a skeleton loading effect. No external dependencies.
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .redacted(reason: .placeholder)
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [.clear, Color.white.opacity(0.15), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 0.5)
                    .offset(x: -geo.size.width * 0.25 + geo.size.width * 1.5 * phase)
                    .blendMode(.screen)
                }
                .mask(content.redacted(reason: .placeholder))
            )
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    /// Applies a shimmer loading animation over the view's redacted placeholder.
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}
