import Foundation

@MainActor
@Observable
final class LoginViewModel {
    var email = ""
    var password = ""
    var isLoading = false
    var errorMessage: String?
    var emailError: String?
    var passwordError: String?

    func validate() -> Bool {
        emailError = nil
        passwordError = nil

        var isValid = true

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedEmail.isEmpty {
            emailError = "Email is required"
            isValid = false
        } else if !trimmedEmail.contains("@") || !trimmedEmail.contains(".") {
            emailError = "Enter a valid email address"
            isValid = false
        }

        if password.isEmpty {
            passwordError = "Password is required"
            isValid = false
        }

        return isValid
    }

    func signIn(using authManager: AuthManager) async {
        guard validate() else { return }

        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            try await authManager.signIn(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password
            )
        } catch {
            errorMessage = friendlyMessage(for: error)
        }
    }

    private func friendlyMessage(for error: Error) -> String {
        let message = error.localizedDescription.lowercased()

        if message.contains("invalid login credentials") || message.contains("invalid_credentials") {
            return "Incorrect email or password"
        }
        if message.contains("email not confirmed") {
            return "Please verify your email before signing in"
        }
        if message.contains("too many requests") || message.contains("rate limit") {
            return "Too many attempts. Please wait a moment"
        }
        if message.contains("network") || message.contains("offline") || message.contains("timed out") {
            return "Network error. Check your connection and try again"
        }

        return "Sign in failed. Please try again"
    }
}
