import SwiftUI

/// Large bold financial number display. Crimson prefix, white number, tracked text.
struct HeroNumber: View {
    let value: String
    let label: String
    var prefix: String = ""
    var size: HeroSize = .large

    enum HeroSize {
        case large
        case medium

        var font: Font {
            switch self {
            case .large: return AppTypography.heroLarge
            case .medium: return AppTypography.heroMedium
            }
        }
    }

    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                if !prefix.isEmpty {
                    Text(prefix)
                        .font(size.font)
                        .foregroundColor(AppColors.accent)
                }
                Text(value)
                    .font(size.font)
                    .foregroundColor(AppColors.textPrimary)
                    .contentTransition(.numericText())
            }
            .heroStyle()

            if !label.isEmpty {
                Text(label)
                    .font(AppTypography.overline)
                    .foregroundColor(AppColors.textSecondary)
                    .overlineStyle()
            }
        }
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()

        VStack(spacing: AppSpacing.xl) {
            HeroNumber(value: "12,450", label: "Total Balance", prefix: "$")
            HeroNumber(value: "3,200", label: "Monthly Spend", prefix: "$", size: .medium)
        }
    }
    .preferredColorScheme(.dark)
}
