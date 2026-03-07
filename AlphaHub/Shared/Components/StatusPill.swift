import SwiftUI

/// Small capsule badge with outline/tinted style.
/// Color text + 15% fill + 30% border for modern look.
struct StatusPill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(AppTypography.captionSmall)
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(color.opacity(0.15))
            )
            .overlay(
                Capsule()
                    .stroke(color.opacity(0.30), lineWidth: 1)
            )
    }

    // MARK: - Factory Methods

    /// Green pill for paid/success status.
    static var paid: StatusPill {
        StatusPill(text: "Paid", color: AppColors.success)
    }

    /// Yellow/warning pill for pending status.
    static var pending: StatusPill {
        StatusPill(text: "Pending", color: AppColors.warning)
    }

    /// Red pill for overdue/failed status.
    static var overdue: StatusPill {
        StatusPill(text: "Overdue", color: AppColors.error)
    }

    /// Red pill for failed status.
    static var failed: StatusPill {
        StatusPill(text: "Failed", color: AppColors.error)
    }

    /// Gray pill for cancelled status.
    static var cancelled: StatusPill {
        StatusPill(text: "Cancelled", color: AppColors.textTertiary)
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        HStack(spacing: AppSpacing.sm) {
            StatusPill.paid
            StatusPill.pending
            StatusPill.overdue
            StatusPill.failed
            StatusPill.cancelled
        }
    }
    .preferredColorScheme(.dark)
}
