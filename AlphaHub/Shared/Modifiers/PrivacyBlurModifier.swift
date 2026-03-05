import SwiftUI

struct PrivacyBlurModifier: ViewModifier {
    @Environment(\.scenePhase) private var scenePhase
    @State private var isBlurred = false

    func body(content: Content) -> some View {
        content
            .blur(radius: isBlurred ? 30 : 0)
            .animation(.easeInOut(duration: 0.2), value: isBlurred)
            .onChange(of: scenePhase) { _, newPhase in
                switch newPhase {
                case .active:
                    isBlurred = false
                case .inactive, .background:
                    isBlurred = true
                @unknown default:
                    break
                }
            }
            .onReceive(
                NotificationCenter.default.publisher(
                    for: UIApplication.willResignActiveNotification
                )
            ) { _ in
                isBlurred = true
            }
            .onReceive(
                NotificationCenter.default.publisher(
                    for: UIApplication.didBecomeActiveNotification
                )
            ) { _ in
                isBlurred = false
            }
    }
}

extension View {
    func privacyBlur() -> some View {
        modifier(PrivacyBlurModifier())
    }
}
