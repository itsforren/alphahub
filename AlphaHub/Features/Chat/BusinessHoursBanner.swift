import SwiftUI

/// Amber banner shown ONLY outside business hours (9 AM - 5 PM EST, Mon-Fri).
/// Completely hidden (EmptyView) during business hours.
struct BusinessHoursBanner: View {
    let isWithinBusinessHours: Bool

    var body: some View {
        if !isWithinBusinessHours {
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: "moon.fill")
                    .font(.system(size: 12))

                Text("We're offline \u{2014} replies within 24h")
                    .font(AppTypography.captionSmall)
            }
            .foregroundColor(Color(hex: "92400E"))
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)
            .frame(maxWidth: .infinity)
            .background(Color(hex: "FEF3C7").opacity(0.15))
            .overlay(
                RoundedRectangle(cornerRadius: 0)
                    .stroke(Color(hex: "F59E0B").opacity(0.2), lineWidth: 0.5)
            )
        }
    }

    // MARK: - Business Hours Check

    /// Determines if the current moment falls within business hours.
    /// Business hours: 9 AM - 5 PM EST (America/New_York), Monday through Friday.
    static func checkBusinessHours() -> Bool {
        guard let estTimeZone = TimeZone(identifier: "America/New_York") else { return true }

        var calendar = Calendar.current
        calendar.timeZone = estTimeZone

        let now = Date()
        let hour = calendar.component(.hour, from: now)
        let weekday = calendar.component(.weekday, from: now)

        // weekday: 1 = Sunday, 2 = Monday, ..., 6 = Friday, 7 = Saturday
        let isWeekday = weekday >= 2 && weekday <= 6
        let isDuringHours = hour >= 9 && hour < 17

        return isWeekday && isDuringHours
    }
}
