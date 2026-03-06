import SwiftUI

/// Single transaction row showing amount, billing type, status pill, and relative date.
/// Tesla-clean aesthetic: clean rows, no heavy borders, numbers bold and bright.
struct BillingTransactionRow: View {
    let record: BillingRecord

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .center) {
                // Left: amount and billing type
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text(record.amount.abbreviatedCurrency)
                        .font(AppTypography.heading3)
                        .foregroundColor(AppColors.textPrimary)

                    Text(billingTypeLabel)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                // Right: status pill and date
                VStack(alignment: .trailing, spacing: AppSpacing.xs) {
                    statusPill

                    Text(record.createdAt.relativeDate)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)
                }
            }
            .padding(.vertical, AppSpacing.md)

            // Subtle bottom divider
            Rectangle()
                .fill(AppColors.divider)
                .frame(height: 0.5)
        }
    }

    // MARK: - Helpers

    private var billingTypeLabel: String {
        switch record.billingType {
        case "ad_spend": return "Ad Spend"
        case "management": return "Management"
        default: return record.billingType.capitalized
        }
    }

    private var statusPill: StatusPill {
        switch record.status.lowercased() {
        case "paid": return .paid
        case "pending": return .pending
        case "overdue": return .overdue
        case "failed": return .failed
        case "cancelled": return .cancelled
        default: return StatusPill(text: record.status.capitalized, color: AppColors.textTertiary)
        }
    }
}
