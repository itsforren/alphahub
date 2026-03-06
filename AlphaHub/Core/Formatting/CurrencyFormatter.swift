import Foundation

extension Double {
    /// Formats as abbreviated currency: "$12.4K", "$1.2M", "$0"
    /// Uses Foundation's compact notation for localized K/M/B suffixes.
    var abbreviatedCurrency: String {
        if self == 0 { return "$0" }
        let formatted = Decimal(self).formatted(
            .number.notation(.compactName).precision(.fractionLength(0...1))
        )
        return "$\(formatted)"
    }

    /// Formats as full currency with commas: "$12,450.00"
    var currencyFull: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        return formatter.string(from: NSNumber(value: self)) ?? "$0.00"
    }
}
