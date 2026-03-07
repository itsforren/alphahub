import SwiftUI

/// Text input bar with attachment button and send button.
/// Debounces typing indicator: fires onTypingChanged(true) after 0.5s of typing,
/// then onTypingChanged(false) after 3s of inactivity.
struct ChatInputBar: View {
    var onSend: (String) -> Void
    var onAttachmentSelected: (AttachmentData) -> Void
    var onTypingChanged: (Bool) -> Void

    @State private var text = ""
    @State private var typingDebounceTask: Task<Void, Never>?
    @State private var typingStopTask: Task<Void, Never>?
    @State private var showAttachmentPicker = false
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            Divider()
                .overlay(AppColors.divider)

            HStack(spacing: AppSpacing.sm) {
                // Attachment button
                Button {
                    showAttachmentPicker = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(AppColors.textSecondary)
                }

                // Text field
                TextField("Message...", text: $text, axis: .vertical)
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textPrimary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(AppColors.surfaceElevated)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .lineLimit(1...5)
                    .focused($isFocused)
                    .onChange(of: text) { _, _ in
                        handleTyping()
                    }

                // Send button
                Button {
                    send()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? AppColors.textTertiary
                            : AppColors.accent)
                }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.sm)
        }
        .background(AppColors.surfaceElevated.opacity(0.95))
        .sheet(isPresented: $showAttachmentPicker) {
            AttachmentPickerSheet { attachment in
                onAttachmentSelected(attachment)
            }
        }
    }

    // MARK: - Actions

    private func send() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        onSend(trimmed)
        text = ""

        // Stop typing indicator
        typingDebounceTask?.cancel()
        typingStopTask?.cancel()
        onTypingChanged(false)

        HapticManager.impact(.light)
    }

    private func handleTyping() {
        // Debounce: wait 0.5s before sending typing=true
        typingDebounceTask?.cancel()
        typingDebounceTask = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            onTypingChanged(true)
        }

        // Auto-stop: send typing=false after 3s of inactivity
        typingStopTask?.cancel()
        typingStopTask = Task {
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            onTypingChanged(false)
        }
    }
}
