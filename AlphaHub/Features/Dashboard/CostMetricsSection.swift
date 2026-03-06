import SwiftUI

/// Cost metrics grid: Total Leads, CPL, CPBC, CPSA, CPIA, Avg Commission.
/// Uses MetricCard components arranged in a 3-column grid.
/// Zero values show as $0 or 0 (no empty state messages).
struct CostMetricsSection: View {
    @Environment(DataManager.self) private var dataManager

    private let columns = [
        GridItem(.flexible(), spacing: AppSpacing.md),
        GridItem(.flexible(), spacing: AppSpacing.md),
        GridItem(.flexible(), spacing: AppSpacing.md),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            SectionHeader(title: "Cost Metrics")

            LazyVGrid(columns: columns, spacing: AppSpacing.lg) {
                // Total Leads -- plain number, no currency prefix
                MetricCard(
                    value: "\(dataManager.leads.count)",
                    label: "Total Leads"
                )

                // Cost per Lead
                MetricCard(
                    value: dataManager.dashboardMetrics.costPerLead.abbreviatedCurrency,
                    label: "Cost/Lead"
                )

                // Cost per Booked Call
                MetricCard(
                    value: dataManager.dashboardMetrics.costPerBookedCall.abbreviatedCurrency,
                    label: "Cost/Booked Call"
                )

                // Cost per Submitted App
                MetricCard(
                    value: dataManager.dashboardMetrics.costPerSubmittedApp.abbreviatedCurrency,
                    label: "Cost/Submitted"
                )

                // Cost per Issued/Paid
                MetricCard(
                    value: dataManager.dashboardMetrics.costPerIssuedPaid.abbreviatedCurrency,
                    label: "Cost/Issued"
                )

                // Average Commission
                MetricCard(
                    value: dataManager.dashboardMetrics.averageCommissionSize.abbreviatedCurrency,
                    label: "Avg Commission"
                )
            }
        }
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        CostMetricsSection()
            .padding(AppSpacing.screenPadding)
    }
    .environment(DataManager())
    .preferredColorScheme(.dark)
}
