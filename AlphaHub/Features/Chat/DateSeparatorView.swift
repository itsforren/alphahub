import SwiftUI

/// Centered date label between messages from different days.
/// Shows "Today", "Yesterday", or "Mar 4" for older dates.
struct DateSeparatorView: View {
    let date: Date

    nonisolated(unsafe) private static let monthDayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    var body: some View {
        Text(label)
            .font(AppTypography.captionSmall)
            .foregroundColor(AppColors.textTertiary)
            .padding(.vertical, AppSpacing.sm)
            .frame(maxWidth: .infinity)
    }

    private var label: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            return Self.monthDayFormatter.string(from: date)
        }
    }
}
