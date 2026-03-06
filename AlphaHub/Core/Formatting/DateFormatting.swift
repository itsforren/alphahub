import Foundation

// MARK: - Reusable Date Formatters

/// Static formatters to avoid creating new instances per call.
/// Uses `nonisolated(unsafe)` because Foundation formatters are not Sendable
/// but these are initialized once and used read-only.
enum DateFormatting {
    /// ISO 8601 full datetime formatter (e.g. "2026-03-06T12:00:00.000Z")
    nonisolated(unsafe) static let iso8601Full: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    /// ISO 8601 without fractional seconds (e.g. "2026-03-06T12:00:00Z")
    nonisolated(unsafe) static let iso8601: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    /// Date-only formatter for DATE columns (e.g. "2026-03-06")
    static let dateOnly: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    /// Relative date formatter with full units ("2 days ago", "yesterday")
    nonisolated(unsafe) static let relative: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter
    }()
}

// MARK: - String Date Extensions

extension String {
    /// Converts an ISO date string to a relative description ("2 days ago", "yesterday").
    /// Tries multiple formats: ISO 8601 full datetime, then date-only.
    var relativeDate: String {
        guard let date = parsedDate else { return self }
        return DateFormatting.relative.localizedString(for: date, relativeTo: Date())
    }

    /// Attempts to parse the string as a Date.
    /// Tries ISO 8601 with fractional seconds, ISO 8601 without, then date-only format.
    var parsedDate: Date? {
        if let date = DateFormatting.iso8601Full.date(from: self) {
            return date
        }
        if let date = DateFormatting.iso8601.date(from: self) {
            return date
        }
        if let date = DateFormatting.dateOnly.date(from: self) {
            return date
        }
        return nil
    }
}
