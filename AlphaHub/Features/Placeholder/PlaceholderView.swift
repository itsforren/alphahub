import SwiftUI

struct PlaceholderView: View {
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
            }
        }
        .preferredColorScheme(.dark)
    }
}
