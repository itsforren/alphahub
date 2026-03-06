import SwiftUI

/// Main billing screen with transaction list grouped by month, filter bar,
/// payment methods section, and transaction detail sheet.
/// Accessed from the Wallet tab in ClientTabView.
struct BillingView: View {
    @Environment(DataManager.self) private var dataManager

    @State private var selectedFilter: BillingFilter = .all
    @State private var selectedRecord: BillingRecord?
    @State private var showDetail = false

    var body: some View {
        ScrollView {
            if dataManager.isInitialLoad {
                shimmerContent
            } else {
                LazyVStack(spacing: AppSpacing.lg) {
                    // Filter bar
                    BillingFilterBar(selectedFilter: $selectedFilter)

                    // Payment methods section (placeholder for Task 2)
                    PaymentMethodCards()

                    // Transaction list grouped by month
                    if filteredRecords.isEmpty {
                        emptyState
                    } else {
                        transactionList
                    }
                }
                .padding(.horizontal, AppSpacing.screenPadding)
            }
        }
        .refreshable {
            await dataManager.refreshAll()
            HapticManager.notification(.success)
        }
        .sheet(isPresented: $showDetail) {
            if let record = selectedRecord {
                TransactionDetailSheet(record: record)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
        }
        .background(AppColors.pureBlack)
        .navigationTitle("Billing")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    // MARK: - Transaction List

    private var transactionList: some View {
        ForEach(sortedMonthKeys, id: \.self) { monthKey in
            Section {
                ForEach(groupedRecords[monthKey] ?? []) { record in
                    BillingTransactionRow(record: record)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedRecord = record
                            showDetail = true
                        }
                }
            } header: {
                Text(monthKey)
                    .font(AppTypography.heading3)
                    .foregroundColor(AppColors.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, AppSpacing.sm)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(AppColors.textTertiary)
            Text("No transactions found")
                .font(AppTypography.bodyLarge)
                .foregroundColor(AppColors.textSecondary)
        }
        .padding(.top, AppSpacing.xxl)
    }

    // MARK: - Shimmer Loading

    private var shimmerContent: some View {
        LazyVStack(spacing: AppSpacing.lg) {
            // Shimmer filter bar
            RoundedRectangle(cornerRadius: 8)
                .fill(AppColors.surfaceElevated)
                .frame(height: 32)
                .padding(.horizontal, AppSpacing.screenPadding)

            // Shimmer payment cards
            HStack(spacing: AppSpacing.md) {
                RoundedRectangle(cornerRadius: 16)
                    .fill(AppColors.surfaceElevated)
                    .frame(height: 100)
                RoundedRectangle(cornerRadius: 16)
                    .fill(AppColors.surfaceElevated)
                    .frame(height: 100)
            }
            .padding(.horizontal, AppSpacing.screenPadding)

            // Shimmer transaction rows
            ForEach(0..<6, id: \.self) { _ in
                HStack {
                    VStack(alignment: .leading, spacing: 6) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(AppColors.surfaceElevated)
                            .frame(width: 80, height: 20)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(AppColors.surfaceElevated)
                            .frame(width: 60, height: 14)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 6) {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(AppColors.surfaceElevated)
                            .frame(width: 50, height: 20)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(AppColors.surfaceElevated)
                            .frame(width: 70, height: 14)
                    }
                }
                .padding(.horizontal, AppSpacing.screenPadding)
            }
        }
        .shimmer()
    }

    // MARK: - Computed Properties

    /// Filter billing records by selected filter.
    private var filteredRecords: [BillingRecord] {
        switch selectedFilter {
        case .all:
            return dataManager.billingRecords
        case .adSpend:
            return dataManager.billingRecords.filter { $0.billingType == "ad_spend" }
        case .management:
            return dataManager.billingRecords.filter { $0.billingType == "management" }
        }
    }

    /// Group filtered records by month string ("March 2026", "February 2026").
    private var groupedRecords: [String: [BillingRecord]] {
        Dictionary(grouping: filteredRecords) { record in
            monthString(from: record.createdAt)
        }
    }

    /// Month keys sorted newest first.
    private var sortedMonthKeys: [String] {
        // Sort by parsing back to date for correct chronological ordering
        groupedRecords.keys.sorted { key1, key2 in
            let date1 = monthDate(from: key1) ?? .distantPast
            let date2 = monthDate(from: key2) ?? .distantPast
            return date1 > date2
        }
    }

    // MARK: - Date Helpers

    /// Format a date string as "MMMM yyyy" (e.g. "March 2026").
    private func monthString(from dateString: String) -> String {
        guard let date = dateString.parsedDate else { return "Unknown" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date)
    }

    /// Parse a "MMMM yyyy" string back to Date for sorting.
    private func monthDate(from monthString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: monthString)
    }
}
