import SwiftUI

/// Half-sheet showing full transaction details.
/// Uses `.presentationDetents([.medium])` for a clean bottom sheet.
struct TransactionDetailSheet: View {
    let record: BillingRecord

    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            // Drag indicator area (handled by .presentationDragIndicator)

            // Hero amount
            Text(record.amount.currencyFull)
                .font(AppTypography.heroMedium)
                .foregroundColor(AppColors.textPrimary)
                .heroStyle()
                .padding(.top, AppSpacing.md)

            // Status pill
            statusPill

            // Detail rows
            VStack(spacing: AppSpacing.md) {
                detailRow(label: "Type", value: billingTypeLabel)
                detailRow(label: "Date", value: formattedFullDate(record.createdAt))

                if let start = record.billingPeriodStart,
                   let end = record.billingPeriodEnd {
                    detailRow(
                        label: "Billing Period",
                        value: "\(formattedShortDate(start)) - \(formattedShortDate(end))"
                    )
                }

                if let dueDate = record.dueDate {
                    detailRow(label: "Due Date", value: formattedFullDate(dueDate))
                }

                if let paidAt = record.paidAt {
                    detailRow(label: "Paid", value: formattedFullDate(paidAt))
                }

                if let stripeAccount = record.stripeAccount {
                    detailRow(label: "Account", value: stripeAccountLabel(stripeAccount))
                }

                detailRow(label: "Status", value: record.status.capitalized)
            }
            .padding(.horizontal, AppSpacing.md)

            Spacer()

            // View on Web button
            Button {
                if let url = URL(string: "https://alphaagent.io") {
                    UIApplication.shared.open(url)
                }
            } label: {
                HStack(spacing: AppSpacing.sm) {
                    Text("View on Web")
                        .font(AppTypography.bodyLarge)
                    Image(systemName: "arrow.up.right.square")
                        .font(.system(size: 14))
                }
                .foregroundColor(AppColors.accent)
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.md)
                .background(AppColors.accent.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppColors.accentBorder, lineWidth: 1)
                )
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.md)
        }
        .frame(maxWidth: .infinity)
        .background(AppColors.surfaceElevated)
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

    private func stripeAccountLabel(_ account: String) -> String {
        switch account {
        case "ad_spend": return "Ad Spend Account"
        case "management": return "Management Account"
        default: return account.capitalized
        }
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(AppTypography.body)
                .foregroundColor(AppColors.textPrimary)
        }
    }

    // MARK: - Date Formatting

    private func formattedFullDate(_ dateString: String) -> String {
        guard let date = dateString.parsedDate else { return dateString }
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    private func formattedShortDate(_ dateString: String) -> String {
        guard let date = dateString.parsedDate else { return dateString }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}
