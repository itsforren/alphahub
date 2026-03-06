import SwiftUI

/// Color-coded status pill for leads. Different from StatusPill (billing).
/// Maps raw status strings from the database to display names and colors.
struct LeadStatusPill: View {
    let status: String

    var body: some View {
        Text(displayName)
            .font(AppTypography.captionSmall)
            .foregroundColor(pillColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(pillColor.opacity(0.2))
            )
    }

    // MARK: - Display Mapping

    private var displayName: String {
        switch status {
        case "new", "new_lead":
            return "New Lead"
        case "contacted":
            return "Contacted"
        case "booked_call":
            return "Booked Call"
        case "submitted_app", "submitted":
            return "Submitted"
        case "issued_paid", "issued":
            return "Issued/Paid"
        case "declined":
            return "Declined"
        case "no_show":
            return "No Show"
        default:
            return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    private var pillColor: Color {
        switch status {
        case "new", "new_lead":
            return Color(hex: "00BFFF")        // Bright blue
        case "contacted":
            return Color(hex: "00E5FF")        // Cyan
        case "booked_call":
            return AppColors.warning           // Orange
        case "submitted_app", "submitted":
            return Color(hex: "AF52DE")        // Purple
        case "issued_paid", "issued":
            return AppColors.success           // Green
        case "declined":
            return AppColors.error             // Red
        case "no_show":
            return AppColors.textTertiary      // Gray
        default:
            return AppColors.textTertiary
        }
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        VStack(spacing: AppSpacing.sm) {
            LeadStatusPill(status: "new_lead")
            LeadStatusPill(status: "contacted")
            LeadStatusPill(status: "booked_call")
            LeadStatusPill(status: "submitted_app")
            LeadStatusPill(status: "issued_paid")
            LeadStatusPill(status: "declined")
            LeadStatusPill(status: "no_show")
        }
    }
    .preferredColorScheme(.dark)
}
