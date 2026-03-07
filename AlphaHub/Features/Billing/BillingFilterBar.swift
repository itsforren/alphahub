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
/// Crimson tint on selected segment.
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
            let crimson = UIColor(red: 196/255, green: 30/255, blue: 58/255, alpha: 1.0)
            UISegmentedControl.appearance().selectedSegmentTintColor = crimson.withAlphaComponent(0.25)
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
