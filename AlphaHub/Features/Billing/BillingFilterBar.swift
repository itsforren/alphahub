import SwiftUI

/// Filter options for billing transaction list.
enum BillingFilter: String, CaseIterable {
    case all
    case adSpend
    case management

    var displayLabel: String {
        switch self {
        case .all: return "All"
        case .adSpend: return "Ad Spend"
        case .management: return "Management"
        }
    }
}

/// Three-segment filter control for billing transactions.
/// Uses native Picker with `.segmented` style, styled for dark theme.
struct BillingFilterBar: View {
    @Binding var selectedFilter: BillingFilter

    var body: some View {
        Picker("Filter", selection: $selectedFilter) {
            ForEach(BillingFilter.allCases, id: \.self) { filter in
                Text(filter.displayLabel)
                    .tag(filter)
            }
        }
        .pickerStyle(.segmented)
        .onAppear {
            // Style segmented control for dark theme
            UISegmentedControl.appearance().selectedSegmentTintColor = UIColor.white.withAlphaComponent(0.15)
            UISegmentedControl.appearance().setTitleTextAttributes(
                [.foregroundColor: UIColor.white],
                for: .selected
            )
            UISegmentedControl.appearance().setTitleTextAttributes(
                [.foregroundColor: UIColor.white.withAlphaComponent(0.5)],
                for: .normal
            )
            UISegmentedControl.appearance().backgroundColor = UIColor.white.withAlphaComponent(0.05)
        }
    }
}
