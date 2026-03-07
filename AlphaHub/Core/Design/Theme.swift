import SwiftUI

// MARK: - Color Tokens (OLED-optimized dark theme with crimson accent)

enum AppColors {
    // Backgrounds
    static let pureBlack = Color.black                    // #000000 -- true OLED black
    static let surface = Color(hex: "0C0A0A")             // Warm off-black for elevated surfaces
    static let surfaceElevated = Color(hex: "161212")      // Cards, sheets (warm shift)
    static let surfaceOverlay = Color(hex: "201A1A")       // Modals, popovers (warm shift)

    // Text
    static let textPrimary = Color.white
    static let textSecondary = Color(hex: "9A9494")        // Warm gray
    static let textTertiary = Color(hex: "5C5555")         // Warm gray

    // Accents
    static let accent = Color(hex: "C41E3A")              // Deep crimson
    static let accentDark = Color(hex: "8B1A2B")          // Dark crimson (client bubbles)
    static let accentSubtle = Color(hex: "C41E3A").opacity(0.15)
    static let accentBorder = Color(hex: "C41E3A").opacity(0.25)

    // Semantic
    static let success = Color(hex: "00C853")
    static let error = Color(hex: "FF3B30")
    static let warning = Color(hex: "FF9500")

    // Structural
    static let divider = Color.white.opacity(0.06)
    static let border = Color.white.opacity(0.10)
}

// MARK: - Typography (Inter font family)

enum AppTypography {
    static let heroLarge = Font.custom("Inter-Bold", size: 52, relativeTo: .largeTitle)
    static let heroMedium = Font.custom("Inter-Bold", size: 36, relativeTo: .title)
    static let heading1 = Font.custom("Inter-Bold", size: 28, relativeTo: .title)
    static let heading2 = Font.custom("Inter-Bold", size: 22, relativeTo: .title2)
    static let heading3 = Font.custom("Inter-SemiBold", size: 18, relativeTo: .title3)
    static let bodyLarge = Font.custom("Inter-Medium", size: 17, relativeTo: .body)
    static let body = Font.custom("Inter-Regular", size: 15, relativeTo: .body)
    static let caption = Font.custom("Inter-Regular", size: 13, relativeTo: .caption)
    static let captionSmall = Font.custom("Inter-Medium", size: 11, relativeTo: .caption2)
    static let overline = Font.custom("Inter-SemiBold", size: 10, relativeTo: .caption2)
}

// MARK: - Tracking Helpers

extension View {
    /// Hero-level letter tracking (+2pt)
    func heroStyle() -> some View {
        self.tracking(2)
    }

    /// Heading-level letter tracking (+0.5pt)
    func headingTracked() -> some View {
        self.tracking(0.5)
    }

    /// Overline style: uppercase + wide tracking (+1.5pt)
    func overlineStyle() -> some View {
        self.tracking(1.5)
            .textCase(.uppercase)
    }
}

// MARK: - Color(hex:) Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        self.init(
            red: Double((rgbValue >> 16) & 0xFF) / 255.0,
            green: Double((rgbValue >> 8) & 0xFF) / 255.0,
            blue: Double(rgbValue & 0xFF) / 255.0
        )
    }
}
