import SwiftUI

/// Section title row with optional trailing action button.
/// Title uses heading3 font with tracking, action link in crimson.
struct SectionHeader: View {
    let title: String
    var action: (() -> Void)?
    var actionLabel: String = "See All"

    var body: some View {
        HStack {
            Text(title)
                .font(AppTypography.heading3)
                .foregroundColor(AppColors.textPrimary)
                .headingTracked()

            Spacer()

            if let action {
                Button(action: action) {
                    HStack(spacing: 4) {
                        Text(actionLabel)
                            .font(AppTypography.caption)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundColor(AppColors.accent)
                }
            }
        }
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        VStack(spacing: AppSpacing.lg) {
            SectionHeader(title: "Business Results")
            SectionHeader(title: "Leads Pipeline", action: {}, actionLabel: "See All")
            SectionHeader(title: "Cost Metrics")
        }
        .padding(AppSpacing.screenPadding)
    }
    .preferredColorScheme(.dark)
}
