import UIKit

enum AppFonts {
    /// Verify that all required Inter font weights are available.
    /// Call from AlphaHubApp.init() to detect missing fonts early.
    /// If a font is missing, SwiftUI's Font.custom will silently fall back to the system font.
    @MainActor
    static func registerFonts() {
        let requiredFonts = ["Inter-Regular", "Inter-Medium", "Inter-SemiBold", "Inter-Bold"]
        for fontName in requiredFonts {
            if UIFont(name: fontName, size: 12) == nil {
                print("[AlphaHub] Font '\(fontName)' not found -- falling back to system font")
            }
        }
    }
}
