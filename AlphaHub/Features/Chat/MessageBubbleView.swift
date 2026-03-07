import SwiftUI

// MARK: - Bubble Shape

/// Custom shape with flat corner for conversational grouping.
/// Client messages: flat bottom-right. Admin messages: flat bottom-left.
struct BubbleShape: Shape {
    let isClient: Bool

    func path(in rect: CGRect) -> Path {
        let radius: CGFloat = 18
        let flatRadius: CGFloat = 4

        let topLeft = radius
        let topRight = radius
        let bottomLeft = isClient ? radius : flatRadius
        let bottomRight = isClient ? flatRadius : radius

        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: .allCorners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        // Use RoundedRectangle with custom corners instead
        return Path { p in
            let w = rect.width
            let h = rect.height

            p.move(to: CGPoint(x: topLeft, y: 0))
            p.addLine(to: CGPoint(x: w - topRight, y: 0))
            p.addQuadCurve(to: CGPoint(x: w, y: topRight), control: CGPoint(x: w, y: 0))
            p.addLine(to: CGPoint(x: w, y: h - bottomRight))
            p.addQuadCurve(to: CGPoint(x: w - bottomRight, y: h), control: CGPoint(x: w, y: h))
            p.addLine(to: CGPoint(x: bottomLeft, y: h))
            p.addQuadCurve(to: CGPoint(x: 0, y: h - bottomLeft), control: CGPoint(x: 0, y: h))
            p.addLine(to: CGPoint(x: 0, y: topLeft))
            p.addQuadCurve(to: CGPoint(x: topLeft, y: 0), control: CGPoint(x: 0, y: 0))
        }
    }
}

// MARK: - Message Bubble View

/// Renders a single chat message with bubble styling, timestamps, and read receipts.
struct MessageBubbleView: View {
    let message: ChatMessage
    var showAvatar: Bool = true

    @State private var showTimestamp = false

    // MARK: - Formatters

    nonisolated(unsafe) private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    nonisolated(unsafe) private static let dateTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, h:mm a"
        return f
    }()

    var body: some View {
        HStack(alignment: .bottom, spacing: AppSpacing.sm) {
            if message.isClient {
                Spacer(minLength: 60)
            }

            // Admin avatar
            if !message.isClient {
                if showAvatar {
                    avatarView
                } else {
                    Color.clear
                        .frame(width: 28, height: 28)
                }
            }

            VStack(alignment: message.isClient ? .trailing : .leading, spacing: 2) {
                // Message bubble
                Text(message.message)
                    .font(AppTypography.body)
                    .foregroundColor(message.isClient ? .black : AppColors.textPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        message.isClient
                            ? AppColors.accent
                            : AppColors.surfaceElevated
                    )
                    .clipShape(BubbleShape(isClient: message.isClient))
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            showTimestamp.toggle()
                        }
                    }

                // Timestamp + Read receipt
                if showTimestamp {
                    HStack(spacing: 4) {
                        Text(formattedTimestamp)
                            .font(AppTypography.captionSmall)
                            .foregroundColor(AppColors.textTertiary)

                        if message.isClient && message.readAt != nil {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 10))
                                .foregroundColor(AppColors.textTertiary)
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }

                // Read receipt (always visible for read client messages)
                if !showTimestamp && message.isClient && message.readAt != nil {
                    Text("Read")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(AppColors.textTertiary)
                }
            }
            .frame(maxWidth: 280, alignment: message.isClient ? .trailing : .leading)

            if !message.isClient {
                Spacer(minLength: 60)
            }
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, 1)
    }

    // MARK: - Avatar

    private var avatarView: some View {
        Group {
            if let url = message.senderAvatarUrl, let imageUrl = URL(string: url) {
                AsyncImage(url: imageUrl) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    initialsView
                }
            } else {
                initialsView
            }
        }
        .frame(width: 28, height: 28)
        .clipShape(Circle())
    }

    private var initialsView: some View {
        ZStack {
            AppColors.surfaceOverlay
            Text(String(message.senderName.prefix(1)).uppercased())
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(AppColors.textSecondary)
        }
    }

    // MARK: - Timestamp Formatting

    private var formattedTimestamp: String {
        guard let date = message.parsedCreatedAt else { return "" }
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return Self.timeFormatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday \(Self.timeFormatter.string(from: date))"
        } else {
            return Self.dateTimeFormatter.string(from: date)
        }
    }
}

// MARK: - Pending Message Bubble

/// Renders a pending (unsent) message with sending/failed status.
struct PendingMessageBubble: View {
    let pending: PendingMessage
    var onRetry: (() -> Void)?

    var body: some View {
        HStack(alignment: .bottom, spacing: AppSpacing.sm) {
            Spacer(minLength: 60)

            VStack(alignment: .trailing, spacing: 2) {
                Text(pending.text)
                    .font(AppTypography.body)
                    .foregroundColor(.black)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(AppColors.accent.opacity(0.6))
                    .clipShape(BubbleShape(isClient: true))

                switch pending.status {
                case .sending:
                    Text("Sending...")
                        .font(AppTypography.captionSmall)
                        .foregroundColor(AppColors.textTertiary)
                case .failed:
                    Button {
                        onRetry?()
                    } label: {
                        Text("Failed \u{2014} Tap to retry")
                            .font(AppTypography.captionSmall)
                            .foregroundColor(AppColors.error)
                    }
                }
            }
            .frame(maxWidth: 280, alignment: .trailing)
        }
        .padding(.horizontal, AppSpacing.md)
        .padding(.vertical, 1)
    }
}
