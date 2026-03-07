import SwiftUI

/// Full lead detail sheet presented at .large detent.
/// Shows lead info, action buttons (call/message), details, and survey answers.
struct LeadDetailSheet: View {
    let lead: Lead
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    headerSection
                    actionButtons
                    detailSection
                    surveySection
                    Spacer().frame(height: AppSpacing.xxl)
                }
                .padding(.horizontal, AppSpacing.screenPadding)
                .padding(.top, AppSpacing.md)
            }
            .background(AppColors.pureBlack)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(AppTypography.bodyLarge)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(lead.displayName)
                .font(AppTypography.heading1)
                .foregroundColor(AppColors.textPrimary)

            LeadStatusPill(status: lead.status)
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: AppSpacing.md) {
            if let phone = lead.phone, !phone.isEmpty {
                // Call button
                Button {
                    if let url = URL(string: "tel://\(phone)") {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Label("Call", systemImage: "phone.fill")
                        .font(AppTypography.bodyLarge)
                        .foregroundColor(AppColors.accent)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            Capsule()
                                .fill(AppColors.accent.opacity(0.12))
                        )
                        .overlay(
                            Capsule()
                                .stroke(AppColors.accentBorder, lineWidth: 1)
                        )
                }

                // Message button
                Button {
                    if let url = URL(string: "sms://\(phone)") {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Label("Message", systemImage: "message.fill")
                        .font(AppTypography.bodyLarge)
                        .foregroundColor(AppColors.accent)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            Capsule()
                                .fill(AppColors.accent.opacity(0.12))
                        )
                        .overlay(
                            Capsule()
                                .stroke(AppColors.accentBorder, lineWidth: 1)
                        )
                }
            }
        }
    }

    // MARK: - Detail Section

    private var detailSection: some View {
        VStack(spacing: 0) {
            if let email = lead.email, !email.isEmpty {
                detailRow(label: "Email", value: email)
            }
            if let phone = lead.phone, !phone.isEmpty {
                detailRow(label: "Phone", value: phone)
            }
            if let state = lead.state, !state.isEmpty {
                detailRow(label: "State", value: state)
            }
            if let leadDate = lead.leadDate {
                detailRow(label: "Date Received", value: formattedFullDate(leadDate))
            }
            if let premium = lead.submittedPremium, premium > 0 {
                detailRow(label: "Submitted Premium", value: premium.abbreviatedCurrency)
            }
            if let premium = lead.issuedPremium, premium > 0 {
                detailRow(label: "Issued Premium", value: premium.abbreviatedCurrency)
            }
            if let premium = lead.targetPremium, premium > 0 {
                detailRow(label: "Target Premium", value: premium.abbreviatedCurrency)
            }
        }
    }

    private func detailRow(label: String, value: String) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                Spacer()
                Text(value)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
            }
            .padding(.vertical, 12)

            AppColors.divider
                .frame(height: 1)
        }
    }

    // MARK: - Survey Answers

    @ViewBuilder
    private var surveySection: some View {
        if let leadData = lead.leadData, !leadData.isEmpty {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                SectionHeader(title: "Survey Answers")

                VStack(spacing: 0) {
                    ForEach(sortedLeadDataKeys, id: \.self) { key in
                        if let value = leadData[key] {
                            surveyRow(key: key, value: value)
                        }
                    }
                }
            }
        }
    }

    private var sortedLeadDataKeys: [String] {
        guard let leadData = lead.leadData else { return [] }
        return leadData.keys.sorted()
    }

    private func surveyRow(key: String, value: AnyCodableValue) -> some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                Text(formatKey(key))
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text(value.displayValue)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .multilineTextAlignment(.trailing)
            }
            .padding(.vertical, 12)

            AppColors.divider
                .frame(height: 1)
        }
    }

    // MARK: - Helpers

    /// Format snake_case keys to Title Case for display.
    private func formatKey(_ key: String) -> String {
        key.replacingOccurrences(of: "_", with: " ").capitalized
    }

    /// Format a date string to a full readable date.
    private func formattedFullDate(_ dateString: String) -> String {
        guard let date = dateString.parsedDate else { return dateString }
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

#Preview {
    let sampleLead = Lead(
        id: "1",
        leadId: "lead-1",
        agentId: "agent-1",
        leadDate: "2026-03-04T12:00:00Z",
        firstName: "John",
        lastName: "Smith",
        phone: "5551234567",
        email: "john@example.com",
        status: "booked_call",
        state: "CA",
        submittedPremium: 12500,
        issuedPremium: 8000,
        targetPremium: 15000,
        createdAt: "2026-03-04T12:00:00Z",
        leadData: [
            "income_range": .string("$100K - $150K"),
            "has_existing_policy": .bool(true),
            "family_size": .int(4),
        ]
    )

    LeadDetailSheet(lead: sampleLead)
        .preferredColorScheme(.dark)
}
