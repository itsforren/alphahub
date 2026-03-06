import SwiftUI

// MARK: - Color Tokens (OLED-optimized dark theme)

enum AppColors {
    // Backgrounds
    static let pureBlack = Color.black                    // #000000 -- true OLED black
    static let surface = Color(hex: "0A0A0A")             // Barely off-black for elevated surfaces
    static let surfaceElevated = Color(hex: "141414")      // Cards, sheets
    static let surfaceOverlay = Color(hex: "1E1E1E")       // Modals, popovers

    // Text
    static let textPrimary = Color.white
    static let textSecondary = Color(hex: "A0A0A0")
    static let textTertiary = Color(hex: "666666")

    // Accents
    static let accent = Color.white                        // White accent for v1 (Tesla aesthetic)
    static let accentNeon = Color(hex: "00FF88")           // Reserve for future neon highlights

    // Semantic
    static let success = Color(hex: "00C853")
    static let error = Color(hex: "FF3B30")
    static let warning = Color(hex: "FF9500")

    // Structural
    static let divider = Color.white.opacity(0.08)
    static let border = Color.white.opacity(0.12)
}

// MARK: - Typography (Inter font family)

enum AppTypography {
    static let heroLarge = Font.custom("Inter-Bold", size: 48, relativeTo: .largeTitle)
    static let heroMedium = Font.custom("Inter-Bold", size: 36, relativeTo: .title)
    static let heading1 = Font.custom("Inter-SemiBold", size: 28, relativeTo: .title)
    static let heading2 = Font.custom("Inter-SemiBold", size: 22, relativeTo: .title2)
    static let heading3 = Font.custom("Inter-SemiBold", size: 18, relativeTo: .title3)
    static let bodyLarge = Font.custom("Inter-Medium", size: 17, relativeTo: .body)
    static let body = Font.custom("Inter-Regular", size: 15, relativeTo: .body)
    static let caption = Font.custom("Inter-Regular", size: 13, relativeTo: .caption)
    static let captionSmall = Font.custom("Inter-Medium", size: 11, relativeTo: .caption2)
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
