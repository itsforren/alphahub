import SwiftUI

/// Displays two payment method cards: one for ad spend, one for management Stripe account.
/// Shows card brand, last 4 digits, expiry, and account label.
/// Includes a "Manage on web" link to alphaagent.io.
struct PaymentMethodCards: View {
    @Environment(DataManager.self) private var dataManager

    var body: some View {
        VStack(spacing: AppSpacing.md) {
            SectionHeader(title: "Payment Methods")

            // Two cards side by side
            HStack(spacing: AppSpacing.md) {
                paymentCard(
                    method: adSpendMethod,
                    label: "Ad Spend"
                )

                paymentCard(
                    method: managementMethod,
                    label: "Management"
                )
            }

            // Manage on web link
            Button {
                if let url = URL(string: "https://alphaagent.io") {
                    UIApplication.shared.open(url)
                }
            } label: {
                HStack(spacing: AppSpacing.xs) {
                    Text("Manage payment methods on alphaagent.io")
                        .font(AppTypography.captionSmall)
                    Image(systemName: "arrow.up.right.square")
                        .font(.system(size: 10))
                }
                .foregroundColor(AppColors.textSecondary)
            }
        }
    }

    // MARK: - Card View

    private func paymentCard(method: PaymentMethod?, label: String) -> some View {
        GlassCard(cornerRadius: 16) {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                if let method {
                    // Card brand icon
                    Image(systemName: "creditcard.fill")
                        .font(.system(size: 20))
                        .foregroundColor(AppColors.accent)

                    // Brand name
                    Text(method.brandDisplayName)
                        .font(AppTypography.bodyLarge)
                        .foregroundColor(AppColors.textPrimary)

                    // Last 4
                    Text("****\(method.cardLastFour ?? "----")")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)

                    // Expiry
                    if !method.expiryString.isEmpty {
                        Text(method.expiryString)
                            .font(AppTypography.captionSmall)
                            .foregroundColor(AppColors.textTertiary)
                    }

                    // Account label
                    Text(label)
                        .font(AppTypography.captionSmall)
                        .foregroundColor(AppColors.textSecondary)
                } else {
                    // No card on file placeholder
                    Image(systemName: "creditcard")
                        .font(.system(size: 20))
                        .foregroundColor(AppColors.textTertiary)

                    Text("No card on file")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textTertiary)

                    Text(label)
                        .font(AppTypography.captionSmall)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Computed Properties

    private var adSpendMethod: PaymentMethod? {
        dataManager.paymentMethods.first { $0.stripeAccount == "ad_spend" }
    }

    private var managementMethod: PaymentMethod? {
        dataManager.paymentMethods.first { $0.stripeAccount == "management" }
    }
}
