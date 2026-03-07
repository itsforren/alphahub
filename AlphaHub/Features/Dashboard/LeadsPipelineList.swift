import SwiftUI

/// Searchable leads pipeline list at the bottom of the dashboard.
/// Shows most recent leads first, with status pills and search filtering.
/// Tapping a lead opens LeadDetailSheet at .large detent.
struct LeadsPipelineList: View {
    @Environment(DataManager.self) private var dataManager
    @State private var searchText = ""
    @State private var selectedLead: Lead?

    /// Maximum leads displayed for performance.
    private let displayLimit = 50

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            SectionHeader(title: "Leads Pipeline")

            // Search bar
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.textTertiary)

                TextField("Search leads...", text: $searchText)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.textTertiary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(AppColors.surfaceElevated)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AppColors.border, lineWidth: 0.5)
            )

            // Leads list
            if filteredLeads.isEmpty {
                emptyState
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(filteredLeads) { lead in
                        leadRow(lead)
                            .onTapGesture {
                                selectedLead = lead
                            }
                    }
                }
            }
        }
        .sheet(item: $selectedLead) { lead in
            LeadDetailSheet(lead: lead)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Lead Row

    private func leadRow(_ lead: Lead) -> some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Text(lead.displayName)
                        .font(AppTypography.bodyLarge)
                        .foregroundColor(AppColors.textPrimary)

                    if let leadDate = lead.leadDate {
                        Text(leadDate.relativeDate)
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textTertiary)
                    }
                }

                Spacer()

                LeadStatusPill(status: lead.status)
            }
            .padding(.vertical, 12)

            AppColors.divider
                .frame(height: 1)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: AppSpacing.sm) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 32))
                .foregroundColor(AppColors.textTertiary)
            Text(searchText.isEmpty ? "No leads yet" : "No matching leads")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.xl)
    }

    // MARK: - Computed

    /// Filtered leads: search by name or email, limited to displayLimit for performance.
    private var filteredLeads: [Lead] {
        let leads: [Lead]
        if searchText.isEmpty {
            leads = dataManager.leads
        } else {
            let query = searchText.lowercased()
            leads = dataManager.leads.filter { lead in
                lead.displayName.lowercased().contains(query) ||
                (lead.email?.lowercased().contains(query) ?? false)
            }
        }
        return Array(leads.prefix(displayLimit))
    }
}

#Preview {
    ScrollView {
        LeadsPipelineList()
            .padding(AppSpacing.screenPadding)
    }
    .background(AppColors.pureBlack)
    .environment(DataManager())
    .preferredColorScheme(.dark)
}
