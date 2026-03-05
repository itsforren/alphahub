import SwiftUI

struct PasswordResetView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(\.dismiss) private var dismiss
    @State private var step: ResetStep = .email
    @State private var email = ""
    @State private var otpCode = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    enum ResetStep {
        case email
        case otp
        case newPassword
        case success
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 24) {
                    switch step {
                    case .email:
                        emailStep

                    case .otp:
                        otpStep

                    case .newPassword:
                        newPasswordStep

                    case .success:
                        successStep
                    }
                }
                .padding(.horizontal, 32)
            }
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.white.opacity(0.7))
                }
            }
            .preferredColorScheme(.dark)
        }
    }

    // MARK: - Steps

    private var emailStep: some View {
        VStack(spacing: 20) {
            Text("Enter your email address and we'll send you a verification code.")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)

            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled()
                .padding()
                .background(Color.white.opacity(0.08))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
                .foregroundColor(.white)
                .tint(.white)

            errorView

            actionButton(title: "Send Code") {
                await sendResetCode()
            }
        }
    }

    private var otpStep: some View {
        VStack(spacing: 20) {
            Text("Enter the 6-digit code sent to \(email)")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)

            TextField("Verification Code", text: $otpCode)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.title2.monospaced())
                .padding()
                .background(Color.white.opacity(0.08))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
                .foregroundColor(.white)
                .tint(.white)

            errorView

            actionButton(title: "Verify") {
                await verifyCode()
            }
        }
    }

    private var newPasswordStep: some View {
        VStack(spacing: 20) {
            Text("Create your new password")
                .font(.subheadline)
                .foregroundColor(.gray)

            SecureField("New Password", text: $newPassword)
                .textContentType(.newPassword)
                .padding()
                .background(Color.white.opacity(0.08))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
                .foregroundColor(.white)
                .tint(.white)

            SecureField("Confirm Password", text: $confirmPassword)
                .textContentType(.newPassword)
                .padding()
                .background(Color.white.opacity(0.08))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
                .foregroundColor(.white)
                .tint(.white)

            errorView

            actionButton(title: "Reset Password") {
                await resetPassword()
            }
        }
    }

    private var successStep: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)

            Text("Password Reset Successfully")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.white)

            Text("You can now sign in with your new password.")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .task {
            try? await Task.sleep(for: .seconds(2))
            dismiss()
        }
    }

    // MARK: - Shared Components

    @ViewBuilder
    private var errorView: some View {
        if let errorMessage {
            Text(errorMessage)
                .font(.callout)
                .foregroundColor(.red.opacity(0.9))
                .multilineTextAlignment(.center)
        }
    }

    private func actionButton(title: String, action: @escaping () async -> Void) -> some View {
        Button {
            Task { await action() }
        } label: {
            Group {
                if isLoading {
                    ProgressView()
                        .tint(.black)
                } else {
                    Text(title)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.white)
            .foregroundColor(.black)
            .cornerRadius(12)
        }
        .disabled(isLoading)
    }

    // MARK: - Actions

    private func sendResetCode() async {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            errorMessage = "Please enter your email"
            return
        }

        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            try await authManager.resetPassword(email: trimmed)
            step = .otp
        } catch {
            errorMessage = "Failed to send code. Please try again."
        }
    }

    private func verifyCode() async {
        guard !otpCode.isEmpty else {
            errorMessage = "Please enter the verification code"
            return
        }

        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            try await authManager.verifyOTP(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                token: otpCode
            )
            step = .newPassword
        } catch {
            errorMessage = "Invalid or expired code. Please try again."
        }
    }

    private func resetPassword() async {
        guard !newPassword.isEmpty else {
            errorMessage = "Please enter a new password"
            return
        }
        guard newPassword == confirmPassword else {
            errorMessage = "Passwords don't match"
            return
        }
        guard newPassword.count >= 6 else {
            errorMessage = "Password must be at least 6 characters"
            return
        }

        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            try await authManager.updatePassword(newPassword: newPassword)
            step = .success
        } catch {
            errorMessage = "Failed to reset password. Please try again."
        }
    }
}
