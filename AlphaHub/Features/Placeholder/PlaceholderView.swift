import SwiftUI

struct PlaceholderView: View {
    @Environment(AuthManager.self) private var authManager

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
                Text("Coming soon")
                    .font(.subheadline)
                    .foregroundColor(.gray)

                Spacer()
                    .frame(height: 40)

                Button {
                    Task {
                        try? await authManager.signOut()
                    }
                } label: {
                    Text("Sign Out")
                        .font(.subheadline)
                        .foregroundColor(.red.opacity(0.8))
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
