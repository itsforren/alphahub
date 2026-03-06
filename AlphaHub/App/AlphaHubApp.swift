import SwiftUI

@main
struct AlphaHubApp: App {
    @State private var authManager = AuthManager()
    @State private var biometricManager = BiometricManager()
    @State private var router = AppRouter()

    init() {
        AppFonts.registerFonts()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authManager)
                .environment(biometricManager)
                .environment(router)
                .task {
                    await authManager.startListening()
                }
        }
    }
}

struct RootView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(BiometricManager.self) private var biometric

    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if auth.isLoading {
                LaunchScreenView()
            } else if !auth.isAuthenticated {
                LoginView()
            } else if !biometric.isUnlocked {
                BiometricLockView()
            } else {
                MainTabView(role: auth.userRole)
            }
        }
        .privacyBlur()
        .preferredColorScheme(.dark)
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                biometric.lock()
            }
        }
    }
}

struct LaunchScreenView: View {
    var body: some View {
        ZStack {
            AppColors.pureBlack.ignoresSafeArea()
            VStack(spacing: AppSpacing.md) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 48))
                    .foregroundColor(AppColors.textPrimary)
                Text("Alpha Hub")
                    .font(AppTypography.heading1)
                    .foregroundColor(AppColors.textPrimary)
                ProgressView()
                    .tint(.white)
            }
        }
    }
}
