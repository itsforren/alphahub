import SwiftUI
import Charts

/// 30-day campaign spend chart with line + area gradient.
/// Campaign filter dropdown allows filtering by individual campaigns.
/// Handles empty data and single-point gracefully.
struct CampaignSpendChart: View {
    @Environment(DataManager.self) private var dataManager
    @State private var selectedCampaignId: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            SectionHeader(title: "Campaign Spend")

            // Campaign filter + date range
            HStack {
                campaignPicker
                Spacer()
                Text("Last 30 days")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
            }

            if chartData.isEmpty {
                emptyState
            } else {
                chartView
                summaryRow
            }
        }
    }

    // MARK: - Campaign Picker

    private var campaignPicker: some View {
        Menu {
            Button("All Campaigns") {
                selectedCampaignId = nil
            }
            ForEach(dataManager.campaigns) { campaign in
                Button(campaign.campaignName ?? campaign.id) {
                    selectedCampaignId = campaign.id
                }
            }
        } label: {
            HStack(spacing: AppSpacing.xs) {
                Text(selectedCampaignLabel)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textPrimary)
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(AppColors.textSecondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(AppColors.surfaceElevated)
            )
        }
    }

    private var selectedCampaignLabel: String {
        guard let id = selectedCampaignId,
              let campaign = dataManager.campaigns.first(where: { $0.id == id }) else {
            return "All Campaigns"
        }
        return campaign.campaignName ?? "Campaign"
    }

    // MARK: - Chart

    private var chartView: some View {
        Chart(chartData, id: \.date) { point in
            if chartData.count == 1 {
                // Single data point: show as a dot
                PointMark(
                    x: .value("Date", point.date),
                    y: .value("Spend", point.cost)
                )
                .foregroundStyle(AppColors.accent)
                .symbolSize(60)
            } else {
                AreaMark(
                    x: .value("Date", point.date),
                    y: .value("Spend", point.cost)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [AppColors.accent.opacity(0.3), AppColors.accent.opacity(0.01)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .interpolationMethod(.catmullRom)

                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Spend", point.cost)
                )
                .foregroundStyle(AppColors.accent)
                .lineStyle(StrokeStyle(lineWidth: 2))
                .interpolationMethod(.catmullRom)
            }
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: .day, count: 7)) { _ in
                AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                    .foregroundStyle(AppColors.textTertiary)
            }
        }
        .chartYAxis {
            AxisMarks { _ in
                AxisValueLabel()
                    .foregroundStyle(AppColors.textTertiary)
            }
        }
        .frame(height: 200)
    }

    // MARK: - Summary Row

    private var summaryRow: some View {
        HStack {
            Text("Avg/day: \(averageDailySpend.abbreviatedCurrency)")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)

            Spacer()

            if let target = dataManager.clientProfile?.targetDailySpend, target > 0 {
                Text("Target/day: \(target.abbreviatedCurrency)")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: AppSpacing.sm) {
            Image(systemName: "chart.line.downtrend.xyaxis")
                .font(.system(size: 32))
                .foregroundColor(AppColors.textTertiary)
            Text("No spend data available")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
    }

    // MARK: - Computed Data

    /// Aggregate data point for the chart (date + total cost for that date).
    struct ChartPoint: Sendable {
        let date: Date
        let cost: Double
    }

    /// Filtered and aggregated chart data: last 30 entries, sorted by date ascending.
    private var chartData: [ChartPoint] {
        // Filter by campaign if selected
        let filtered: [AdSpendDaily]
        if let campaignId = selectedCampaignId {
            filtered = dataManager.adSpendDaily.filter { $0.campaignId == campaignId }
        } else {
            filtered = dataManager.adSpendDaily
        }

        // Aggregate by date (sum costs for same date across campaigns)
        var dateMap: [String: Double] = [:]
        for entry in filtered {
            dateMap[entry.spendDate, default: 0] += entry.cost
        }

        // Convert to ChartPoints, sorted by date ascending, limit to 30
        let points = dateMap.compactMap { (dateString, cost) -> ChartPoint? in
            guard let date = DateFormatting.dateOnly.date(from: dateString) else { return nil }
            return ChartPoint(date: date, cost: cost)
        }
        .sorted { $0.date < $1.date }
        .suffix(30)

        return Array(points)
    }

    /// Average daily spend from the chart data.
    private var averageDailySpend: Double {
        guard !chartData.isEmpty else { return 0 }
        let total = chartData.reduce(0) { $0 + $1.cost }
        return total / Double(chartData.count)
    }
}

#Preview {
    ScrollView {
        CampaignSpendChart()
            .padding(AppSpacing.screenPadding)
    }
    .background(AppColors.pureBlack)
    .environment(DataManager())
    .preferredColorScheme(.dark)
}
