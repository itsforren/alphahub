import SwiftUI

struct LoginView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var viewModel = LoginViewModel()
    @State private var showPasswordReset = false
    @State private var loginSuccess = false
    @State private var loginFailed = false

    var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()
            ParticleBackground()

            // Login form
            ScrollView {
                VStack(spacing: 32) {
                    Spacer()
                        .frame(height: 80)

                    // Logo
                    VStack(spacing: 12) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 52))
                            .foregroundStyle(
                                .linearGradient(
                                    colors: [.white, .white.opacity(0.7)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )

                        Text("Alpha Hub")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }

                    // Form fields
                    VStack(spacing: 20) {
                        // Email
                        VStack(alignment: .leading, spacing: 6) {
                            TextField("Email", text: $viewModel.email)
                                .textContentType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .padding()
                                .background(Color.white.opacity(0.08))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            viewModel.emailError != nil ? Color.red.opacity(0.6) : Color.white.opacity(0.15),
                                            lineWidth: 1
                                        )
                                )
                                .foregroundColor(.white)
                                .tint(.white)

                            if let emailError = viewModel.emailError {
                                Text(emailError)
                                    .font(.caption)
                                    .foregroundColor(.red.opacity(0.9))
                            }
                        }

                        // Password
                        VStack(alignment: .leading, spacing: 6) {
                            SecureField("Password", text: $viewModel.password)
                                .textContentType(.password)
                                .padding()
                                .background(Color.white.opacity(0.08))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            viewModel.passwordError != nil ? Color.red.opacity(0.6) : Color.white.opacity(0.15),
                                            lineWidth: 1
                                        )
                                )
                                .foregroundColor(.white)
                                .tint(.white)

                            if let passwordError = viewModel.passwordError {
                                Text(passwordError)
                                    .font(.caption)
                                    .foregroundColor(.red.opacity(0.9))
                            }
                        }

                        // Error message
                        if let errorMessage = viewModel.errorMessage {
                            Text(errorMessage)
                                .font(.callout)
                                .foregroundColor(.red.opacity(0.9))
                                .multilineTextAlignment(.center)
                                .padding(.top, 4)
                        }
                    }

                    // Sign In button
                    Button {
                        Task {
                            await viewModel.signIn(using: authManager)
                            if authManager.isAuthenticated {
                                loginSuccess = true
                            } else if viewModel.errorMessage != nil {
                                loginFailed = true
                            }
                        }
                    } label: {
                        Group {
                            if viewModel.isLoading {
                                ProgressView()
                                    .tint(.black)
                            } else {
                                Text("Sign In")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.white)
                        .foregroundColor(.black)
                        .cornerRadius(12)
                    }
                    .disabled(viewModel.isLoading)
                    .sensoryFeedback(.success, trigger: loginSuccess)
                    .sensoryFeedback(.error, trigger: loginFailed)

                    // Forgot password
                    Button {
                        showPasswordReset = true
                    } label: {
                        Text("Forgot Password?")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 40)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .sheet(isPresented: $showPasswordReset) {
            PasswordResetView()
                .environment(authManager)
        }
    }
}
