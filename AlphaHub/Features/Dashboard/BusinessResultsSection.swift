import SwiftUI

/// Business results section showing key business outcomes.
/// Displays submitted business, issued/paid, ROI, and contract percentage
/// in a clean 2x2 grid using MetricCard components.
struct BusinessResultsSection: View {
    @Environment(DataManager.self) private var dataManager

    private var metrics: DashboardMetrics {
        dataManager.dashboardMetrics
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            SectionHeader(title: "Business Results")

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: AppSpacing.md),
                    GridItem(.flexible(), spacing: AppSpacing.md)
                ],
                spacing: AppSpacing.lg
            ) {
                MetricCard(
                    value: metrics.totalSubmittedBusiness.abbreviatedCurrency.replacingOccurrences(of: "$", with: ""),
                    label: "Submitted Business",
                    prefix: "$"
                )

                MetricCard(
                    value: metrics.totalIssuedBusiness.abbreviatedCurrency.replacingOccurrences(of: "$", with: ""),
                    label: "Issued / Paid",
                    prefix: "$"
                )

                roiMetric

                MetricCard(
                    value: formatPercentage(metrics.contractPercentage),
                    label: "Contract %"
                )
            }
        }
    }

    // MARK: - ROI Metric with Color

    private var roiMetric: some View {
        VStack(spacing: AppSpacing.xs) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(formatPercentage(metrics.roi))
                    .font(AppTypography.heading2)
                    .foregroundColor(roiColor)
                    .contentTransition(.numericText())
            }

            Text("ROI")
                .font(AppTypography.captionSmall)
                .foregroundColor(AppColors.textSecondary)
        }
    }

    private var roiColor: Color {
        if metrics.roi > 0 {
            return AppColors.success
        } else if metrics.roi < 0 {
            return AppColors.error
        } else {
            return AppColors.textPrimary
        }
    }

    // MARK: - Helpers

    private func formatPercentage(_ value: Double) -> String {
        if value == 0 { return "0%" }
        if abs(value) >= 1000 {
            return "\(Int(value))%"
        }
        return String(format: "%.1f%%", value)
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        BusinessResultsSection()
            .padding(AppSpacing.screenPadding)
    }
    .environment(DataManager())
    .preferredColorScheme(.dark)
}
