import SwiftUI

struct BiometricLockView: View {
    @Environment(BiometricManager.self) private var biometricManager

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.white.opacity(0.6))

                Text("Unlock Alpha Hub")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)

                Text("Authenticate to access your account")
                    .font(.subheadline)
                    .foregroundColor(.gray)

                Button {
                    Task {
                        await biometricManager.authenticate()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "faceid")
                        Text("Unlock")
                    }
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.white)
                    .foregroundColor(.black)
                    .cornerRadius(12)
                }
                .padding(.horizontal, 48)
                .padding(.top, 8)
            }
        }
        .task {
            await biometricManager.authenticate()
        }
    }
}
