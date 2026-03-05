import Auth
import Supabase
import Foundation

enum UserRole: String, Codable, Sendable {
    case client
    case admin
    case member
    case guest
    case referrer
}

@MainActor
@Observable
final class AuthManager: Sendable {
    private(set) var session: Session?
    private(set) var isAuthenticated = false
    private(set) var isLoading = true
    private(set) var userRole: UserRole = .guest

    private let supabase: SupabaseClient

    init(supabase: SupabaseClient = SupabaseConfig.client) {
        self.supabase = supabase
    }

    // MARK: - Auth State Listening

    func startListening() async {
        for await (event, session) in supabase.auth.authStateChanges {
            await handleAuthEvent(event: event, session: session)
        }
    }

    private func handleAuthEvent(event: AuthChangeEvent, session: Session?) async {
        switch event {
        case .initialSession:
            self.session = session
            self.isAuthenticated = session != nil
            if let userId = session?.user.id {
                await fetchUserRole(userId: userId)
            }
            self.isLoading = false

        case .signedIn:
            self.session = session
            self.isAuthenticated = true
            if let userId = session?.user.id {
                await fetchUserRole(userId: userId)
            }
            self.isLoading = false

        case .signedOut:
            self.session = nil
            self.isAuthenticated = false
            self.userRole = .guest
            self.isLoading = false

        case .tokenRefreshed:
            self.session = session

        case .userUpdated:
            self.session = session

        case .passwordRecovery:
            break

        default:
            break
        }
    }

    // MARK: - Role Fetching

    private func fetchUserRole(userId: UUID) async {
        do {
            let response: String = try await supabase
                .rpc("get_user_role", params: ["_user_id": userId.uuidString])
                .execute()
                .value
            if let role = UserRole(rawValue: response) {
                self.userRole = role
            }
        } catch {
            // Default to client role if RPC fails — the user is still authenticated
            self.userRole = .client
        }
    }

    // MARK: - Sign In / Out

    func signIn(email: String, password: String) async throws {
        try await supabase.auth.signIn(email: email, password: password)
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
        self.session = nil
        self.isAuthenticated = false
        self.userRole = .guest
    }

    // MARK: - Password Reset (OTP Flow)

    func resetPassword(email: String) async throws {
        try await supabase.auth.resetPasswordForEmail(email)
    }

    func verifyOTP(email: String, token: String) async throws {
        _ = try await supabase.auth.verifyOTP(
            email: email,
            token: token,
            type: .recovery
        )
    }

    func updatePassword(newPassword: String) async throws {
        try await supabase.auth.update(
            user: UserAttributes(password: newPassword)
        )
    }
}
