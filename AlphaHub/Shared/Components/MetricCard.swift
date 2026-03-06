import SwiftUI

/// Compact metric display for dashboard.
/// Numbers are the star -- bold and bright. Labels subdued.
/// No card background; the parent section handles grouping.
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
                        .foregroundColor(AppColors.textPrimary)
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
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        HStack(spacing: AppSpacing.xl) {
            MetricCard(value: "12.4K", label: "Cost/Lead", prefix: "$")
            MetricCard(value: "3.2K", label: "Cost/Call", prefix: "$")
            MetricCard(value: "247%", label: "ROI")
        }
    }
    .preferredColorScheme(.dark)
}
