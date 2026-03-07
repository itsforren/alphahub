import SwiftUI

/// Card displaying Open Graph metadata for URLs detected in chat messages.
/// Shows thumbnail image, site name, title, and description in an iMessage-style card.
struct LinkPreviewCard: View {
    let preview: LinkPreviewData

    var body: some View {
        Button {
            openURL()
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                // Thumbnail image
                if let imageString = preview.image, let imageURL = URL(string: imageString) {
                    AsyncImage(url: imageURL) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(maxWidth: .infinity)
                                .frame(height: 120)
                                .clipped()
                        case .failure:
                            EmptyView()
                        case .empty:
                            Rectangle()
                                .fill(AppColors.surfaceOverlay)
                                .frame(height: 120)
                                .overlay {
                                    ProgressView()
                                        .tint(AppColors.textTertiary)
                                }
                        @unknown default:
                            EmptyView()
                        }
                    }
                }

                // Text content
                VStack(alignment: .leading, spacing: 4) {
                    // Site name
                    if let siteName = preview.siteName, !siteName.isEmpty {
                        Text(siteName.uppercased())
                            .font(AppTypography.captionSmall)
                            .foregroundColor(AppColors.textTertiary)
                            .lineLimit(1)
                    }

                    // Title
                    if let title = preview.title, !title.isEmpty {
                        Text(title)
                            .font(AppTypography.bodyLarge)
                            .foregroundColor(AppColors.textPrimary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }

                    // Description
                    if let description = preview.description, !description.isEmpty {
                        Text(description)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                    }
                }
                .padding(AppSpacing.sm + 2)
            }
            .background(AppColors.surfaceElevated)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.05), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Open URL

    private func openURL() {
        guard let urlString = preview.url, let url = URL(string: urlString) else { return }
        UIApplication.shared.open(url)
    }
}
