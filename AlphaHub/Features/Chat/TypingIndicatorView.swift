import SwiftUI

/// Animated bouncing dots shown when admin is typing.
/// Appears with leading alignment matching admin message bubbles.
struct TypingIndicatorView: View {
    let senderName: String

    @State private var animating = false

    var body: some View {
        HStack(alignment: .bottom, spacing: AppSpacing.sm) {
            // Avatar placeholder matching admin bubble alignment
            ZStack {
                AppColors.surfaceOverlay
                Text(String(senderName.prefix(1)).uppercased())
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(AppColors.textSecondary)
            }
            .frame(width: 28, height: 28)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                // Dots bubble
                HStack(spacing: 4) {
                    ForEach(0..<3, id: \.self) { index in
                        Circle()
                            .fill(AppColors.textTertiary)
                            .frame(width: 7, height: 7)
                            .offset(y: animating ? -4 : 0)
                            .animation(
                                .easeInOut(duration: 0.5)
                                    .repeatForever(autoreverses: true)
                                    .delay(Double(index) * 0.15),
                                value: animating
                            )
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(AppColors.surfaceElevated)
                .clipShape(BubbleShape(isClient: false))

                // Label
                Text("\(senderName) is typing")
                    .font(AppTypography.captionSmall)
                    .foregroundColor(AppColors.textTertiary)
            }

            Spacer(minLength: 60)
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, 1)
        .transition(.opacity.combined(with: .move(edge: .bottom)))
        .onAppear {
            animating = true
        }
    }
}
