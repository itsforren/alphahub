import SwiftUI

@main
struct AlphaHubApp: App {
    @State private var authManager = AuthManager()
    @State private var biometricManager = BiometricManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authManager)
                .environment(biometricManager)
                .task {
                    await authManager.startListening()
                }
        }
    }
}

struct RootView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(BiometricManager.self) private var biometric

    var body: some View {
        Group {
            if auth.isLoading {
                LaunchScreenView()
            } else if !auth.isAuthenticated {
                LoginView()
            } else if !biometric.isUnlocked {
                BiometricLockView()
            } else {
                PlaceholderView()
            }
        }
        .privacyBlur()
        .preferredColorScheme(.dark)
    }
}

struct LaunchScreenView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.white)
                Text("Alpha Hub")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                ProgressView()
                    .tint(.white)
            }
        }
    }
}
