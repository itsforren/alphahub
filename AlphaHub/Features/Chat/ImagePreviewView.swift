import SwiftUI

/// Fullscreen image viewer with pinch-to-zoom and drag-to-dismiss.
/// Presented via `.fullScreenCover()` from MessageBubbleView when an image attachment is tapped.
struct ImagePreviewView: View {
    let imageURL: URL
    @Environment(\.dismiss) private var dismiss

    @State private var scale: CGFloat = 1.0
    @GestureState private var magnification: CGFloat = 1.0
    @State private var dragOffset: CGSize = .zero
    @State private var isDragging = false

    var body: some View {
        ZStack {
            // Dark background
            Color.black
                .ignoresSafeArea()
                .opacity(backgroundOpacity)

            // Image
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case .empty:
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(1.5)
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                        .scaleEffect(scale * magnification)
                        .offset(dragOffset)
                        .gesture(pinchGesture)
                        .gesture(dragGesture)
                case .failure:
                    VStack(spacing: AppSpacing.sm) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 40))
                            .foregroundColor(AppColors.textTertiary)
                        Text("Failed to load image")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                @unknown default:
                    EmptyView()
                }
            }

            // Close button
            VStack {
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.8))
                            .background(
                                Circle()
                                    .fill(Color.black.opacity(0.4))
                                    .frame(width: 32, height: 32)
                            )
                    }
                    .padding(.trailing, AppSpacing.md)
                    .padding(.top, AppSpacing.md)
                }
                Spacer()
            }
        }
        .statusBarHidden()
    }

    // MARK: - Gestures

    private var pinchGesture: some Gesture {
        MagnifyGesture()
            .updating($magnification) { value, state, _ in
                state = value.magnification
            }
            .onEnded { value in
                scale = max(1.0, scale * value.magnification)
                // Reset to 1.0 if zoomed out below minimum
                if scale < 1.0 {
                    withAnimation(.spring(duration: 0.3)) {
                        scale = 1.0
                    }
                }
            }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                // Only allow vertical drag for dismiss when not zoomed
                guard scale <= 1.0 else { return }
                isDragging = true
                dragOffset = CGSize(width: 0, height: value.translation.height)
            }
            .onEnded { value in
                isDragging = false
                // Dismiss if dragged far enough
                if abs(value.translation.height) > 150 {
                    dismiss()
                } else {
                    withAnimation(.spring(duration: 0.3)) {
                        dragOffset = .zero
                    }
                }
            }
    }

    /// Background opacity decreases as user drags to dismiss.
    private var backgroundOpacity: Double {
        let progress = abs(dragOffset.height) / 300.0
        return max(0.3, 1.0 - progress)
    }
}
