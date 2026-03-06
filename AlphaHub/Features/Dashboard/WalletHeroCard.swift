import SwiftUI

/// Hero wallet card -- the dominant dashboard element.
/// Shows balance as a large bold number, compact stats row, spending progress bar,
/// threshold/recharge info, and upcoming payment indicator.
struct WalletHeroCard: View {
    @Environment(DataManager.self) private var dataManager

    var body: some View {
        let metrics = dataManager.walletMetrics

        GlassCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                // Label
                Text("Wallet Balance")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)

                // Hero balance number -- THE biggest, boldest element
                HeroNumber(
                    value: metrics.balance.abbreviatedCurrency.replacingOccurrences(of: "$", with: ""),
                    label: "",
                    prefix: "$",
                    size: .large
                )
                .frame(maxWidth: .infinity, alignment: .leading)

                // Compact stats row
                HStack(spacing: 0) {
                    compactStat(
                        value: (metrics.monthlyMax).abbreviatedCurrency,
                        label: "Monthly Max"
                    )

                    Spacer()

                    compactStat(
                        value: metrics.remaining.abbreviatedCurrency,
                        label: "Remaining"
                    )

                    Spacer()

                    compactStat(
                        value: "Day \(metrics.dayOfMonth)",
                        label: "of \(metrics.daysInMonth)"
                    )
                }

                // Progress bar
                progressBar(progress: metrics.spendingProgress)

                // Threshold / Recharge line
                Text("Threshold: \(metrics.threshold.abbreviatedCurrency)  |  Recharge: \(metrics.rechargeAmount.abbreviatedCurrency)")
                    .font(AppTypography.captionSmall)
                    .foregroundColor(AppColors.textTertiary)

                // Upcoming payment indicator
                if let payment = dataManager.nextUpcomingPayment {
                    upcomingPaymentRow(payment: payment)
                }
            }
        }
    }

    // MARK: - Compact Stat

    private func compactStat(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(AppTypography.bodyLarge)
                .foregroundColor(AppColors.textPrimary)
                .contentTransition(.numericText())
            Text(label)
                .font(AppTypography.captionSmall)
                .foregroundColor(AppColors.textTertiary)
        }
    }

    // MARK: - Progress Bar

    private func progressBar(progress: Double) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(AppColors.surfaceOverlay)
                    .frame(height: 4)

                RoundedRectangle(cornerRadius: 2)
                    .fill(
                        LinearGradient(
                            colors: [AppColors.accent, AppColors.accent.opacity(0.3)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geo.size.width * CGFloat(progress), height: 4)
                    .animation(.easeInOut(duration: 0.6), value: progress)
            }
        }
        .frame(height: 4)
    }

    // MARK: - Upcoming Payment Row

    private func upcomingPaymentRow(payment: BillingRecord) -> some View {
        VStack(spacing: AppSpacing.sm) {
            AppColors.divider
                .frame(height: 1)

            HStack {
                Text("Upcoming")
                    .font(AppTypography.captionSmall)
                    .foregroundColor(AppColors.warning)

                Spacer()

                Text(payment.amount.abbreviatedCurrency)
                    .font(AppTypography.bodyLarge)
                    .foregroundColor(AppColors.textPrimary)

                Spacer()

                if let dueDate = payment.dueDate {
                    Text(dueDate.relativeDate)
                        .font(AppTypography.captionSmall)
                        .foregroundColor(AppColors.textTertiary)
                }
            }
        }
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        WalletHeroCard()
            .padding(AppSpacing.screenPadding)
    }
    .environment(DataManager())
    .preferredColorScheme(.dark)
}
