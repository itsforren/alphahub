import SwiftUI

/// Compact metric display for dashboard.
/// Crimson prefix, white numbers, contained in a subtle card.
struct MetricCard: View {
    let value: String
    let label: String
    var prefix: String = ""

    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                if !prefix.isEmpty {
                    Text(prefix)
                        .font(AppTypography.heading2)
                        .foregroundColor(AppColors.accent)
                }
                Text(value)
                    .font(AppTypography.heading2)
                    .foregroundColor(AppColors.textPrimary)
                    .contentTransition(.numericText())
            }

            Text(label)
                .font(AppTypography.captionSmall)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(AppColors.surfaceElevated)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppColors.border, lineWidth: 0.5)
                )
        )
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        HStack(spacing: AppSpacing.md) {
            MetricCard(value: "12.4K", label: "Cost/Lead", prefix: "$")
            MetricCard(value: "3.2K", label: "Cost/Call", prefix: "$")
            MetricCard(value: "247%", label: "ROI")
        }
        .padding(AppSpacing.screenPadding)
    }
    .preferredColorScheme(.dark)
}
