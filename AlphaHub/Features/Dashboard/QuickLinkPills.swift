import SwiftUI

/// Horizontal scrollable pill buttons linking to client web pages.
/// Only shows pills for non-nil links. Hides entirely if all links are nil.
/// Fulfills DASH-05 as revised by the user during context discussion.
struct QuickLinkPills: View {
    let profile: ClientProfile?

    private var links: [(label: String, url: URL)] {
        guard let profile else { return [] }
        var result: [(String, URL)] = []
        if let s = profile.schedulerLink, let u = URL(string: s) { result.append(("Schedule", u)) }
        if let s = profile.nfiaLink, let u = URL(string: s) { result.append(("NFIA", u)) }
        if let s = profile.landerLink, let u = URL(string: s) { result.append(("Landing Page", u)) }
        if let s = profile.thankyouLink, let u = URL(string: s) { result.append(("Thank You", u)) }
        if let s = profile.tfwpProfileLink, let u = URL(string: s) { result.append(("Profile", u)) }
        return result
    }

    var body: some View {
        if !links.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.sm) {
                    ForEach(links, id: \.label) { link in
                        Button {
                            UIApplication.shared.open(link.url)
                        } label: {
                            Text(link.label)
                                .font(AppTypography.captionSmall)
                                .foregroundColor(AppColors.textSecondary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    Capsule()
                                        .fill(AppColors.surfaceElevated)
                                )
                                .overlay(
                                    Capsule()
                                        .stroke(AppColors.border, lineWidth: 0.5)
                                )
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    ZStack {
        AppColors.pureBlack.ignoresSafeArea()
        QuickLinkPills(profile: nil)
            .padding(AppSpacing.screenPadding)
    }
    .preferredColorScheme(.dark)
}
