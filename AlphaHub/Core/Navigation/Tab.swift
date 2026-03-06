import Foundation

// MARK: - TabItem Protocol

protocol TabItem: Hashable, CaseIterable, Sendable {
    var title: String { get }
    var icon: String { get }
}

// MARK: - Client Tabs (5)

enum ClientTab: String, CaseIterable, Hashable, Sendable, TabItem {
    case home, wallet, chat, courses, more

    var title: String {
        switch self {
        case .home: return "Home"
        case .wallet: return "Wallet"
        case .chat: return "Chat"
        case .courses: return "Courses"
        case .more: return "More"
        }
    }

    var icon: String {
        switch self {
        case .home: return "chart.bar.fill"
        case .wallet: return "wallet.pass.fill"
        case .chat: return "bubble.left.and.bubble.right.fill"
        case .courses: return "book.fill"
        case .more: return "ellipsis.circle.fill"
        }
    }
}

// MARK: - Admin Tabs (4)

enum AdminTab: String, CaseIterable, Hashable, Sendable, TabItem {
    case dashboard, clients, chat, more

    var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .clients: return "Clients"
        case .chat: return "Chat"
        case .more: return "More"
        }
    }

    var icon: String {
        switch self {
        case .dashboard: return "square.grid.2x2.fill"
        case .clients: return "person.2.fill"
        case .chat: return "bubble.left.and.bubble.right.fill"
        case .more: return "ellipsis.circle.fill"
        }
    }
}
