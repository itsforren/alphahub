import Foundation

/// Computed dashboard metrics derived from leads array + client profile.
/// These are calculated client-side, matching the web app's `useLeadMetrics.ts` pattern.
struct DashboardMetrics: Sendable {
    let totalLeads: Int
    let totalBookedCalls: Int
    let totalSubmittedApps: Int
    let totalIssuedPaid: Int
    let totalAdSpend: Double
    let totalSubmittedBusiness: Double
    let totalIssuedBusiness: Double
    let contractPercentage: Double

    /// Cost per lead (total ad spend / total leads)
    var costPerLead: Double {
        guard totalLeads > 0 else { return 0 }
        return totalAdSpend / Double(totalLeads)
    }

    /// Cost per booked call
    var costPerBookedCall: Double {
        guard totalBookedCalls > 0 else { return 0 }
        return totalAdSpend / Double(totalBookedCalls)
    }

    /// Cost per submitted app
    var costPerSubmittedApp: Double {
        guard totalSubmittedApps > 0 else { return 0 }
        return totalAdSpend / Double(totalSubmittedApps)
    }

    /// Cost per issued/paid app
    var costPerIssuedPaid: Double {
        guard totalIssuedPaid > 0 else { return 0 }
        return totalAdSpend / Double(totalIssuedPaid)
    }

    /// Average commission per issued/paid case
    var averageCommissionSize: Double {
        guard totalIssuedPaid > 0 else { return 0 }
        return totalIssuedBusiness / Double(totalIssuedPaid)
    }

    /// ROI: (issued business - ad spend) / ad spend * 100
    var roi: Double {
        guard totalAdSpend > 0 else { return 0 }
        return (totalIssuedBusiness - totalAdSpend) / totalAdSpend * 100
    }

    /// Initialize from leads array, client profile, and total ad spend.
    init(leads: [Lead], clientProfile: ClientProfile?, totalAdSpend: Double) {
        self.totalLeads = leads.count
        self.totalBookedCalls = leads.filter { LeadStatus(rawValue: $0.status) == .bookedCall }.count
        self.totalSubmittedApps = leads.filter { LeadStatus(rawValue: $0.status) == .submittedApp }.count
        self.totalIssuedPaid = leads.filter { LeadStatus(rawValue: $0.status) == .issuedPaid }.count
        self.totalAdSpend = totalAdSpend
        self.totalSubmittedBusiness = leads.compactMap(\.submittedPremium).reduce(0, +)
        self.totalIssuedBusiness = leads.compactMap(\.issuedPremium).reduce(0, +)
        self.contractPercentage = clientProfile?.commissionContractPercent ?? 0
    }
}

/// Display metrics for the wallet hero card section.
struct WalletDisplayMetrics: Sendable {
    let balance: Double
    let monthlyMax: Double
    let spentThisMonth: Double
    let remaining: Double
    let dayOfMonth: Int
    let daysInMonth: Int
    let threshold: Double
    let rechargeAmount: Double

    /// Spending progress as a fraction (0...1) clamped.
    var spendingProgress: Double {
        guard monthlyMax > 0 else { return 0 }
        return min(spentThisMonth / monthlyMax, 1.0)
    }
}
