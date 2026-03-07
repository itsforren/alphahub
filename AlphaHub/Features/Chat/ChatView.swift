import SwiftUI

/// Main chat screen composing all chat subviews: message list, input bar,
/// typing indicator, business hours banner, date separators, and empty state.
struct ChatView: View {
    @State private var viewModel = ChatViewModel()
    @Environment(RealtimeManager.self) private var realtimeManager
    @Environment(DataManager.self) private var dataManager
    @Environment(\.scenePhase) private var scenePhase

    @State private var isWithinBusinessHours = true
    @State private var scrollToBottom = false

    var body: some View {
        VStack(spacing: 0) {
            // Business hours banner
            BusinessHoursBanner(isWithinBusinessHours: isWithinBusinessHours)

            if viewModel.messages.isEmpty && viewModel.pendingMessages.isEmpty && !viewModel.isLoadingInitial {
                // Empty state
                ChatEmptyStateView()
            } else if viewModel.isLoadingInitial {
                // Loading state
                Spacer()
                ProgressView()
                    .tint(.white)
                Spacer()
            } else {
                // Message list
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            // Load more indicator
                            if viewModel.hasMoreMessages {
                                Button {
                                    Task {
                                        await viewModel.fetchMoreMessages()
                                    }
                                } label: {
                                    if viewModel.isLoadingMore {
                                        ProgressView()
                                            .tint(.white)
                                            .padding()
                                    } else {
                                        Text("Load earlier messages")
                                            .font(AppTypography.captionSmall)
                                            .foregroundColor(AppColors.textTertiary)
                                            .padding()
                                    }
                                }
                            }

                            // Messages with date separators
                            ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                                // Date separator
                                if shouldShowDateSeparator(at: index) {
                                    if let date = message.parsedCreatedAt {
                                        DateSeparatorView(date: date)
                                    }
                                }

                                // Message bubble
                                MessageBubbleView(
                                    message: message,
                                    showAvatar: shouldShowAvatar(at: index)
                                )
                            }

                            // Pending messages
                            ForEach(viewModel.pendingMessages) { pending in
                                PendingMessageBubble(pending: pending) {
                                    Task {
                                        await viewModel.retryMessage(
                                            pending,
                                            senderName: dataManager.clientProfile?.name ?? "You",
                                            senderAvatarUrl: dataManager.clientProfile?.profileImageUrl
                                        )
                                    }
                                }
                            }

                            // Typing indicator
                            if !realtimeManager.typingUsers.isEmpty {
                                TypingIndicatorView(senderName: "Support")
                                    .transition(.opacity)
                            }

                            // Scroll anchor
                            Color.clear
                                .frame(height: 1)
                                .id("bottom")
                        }
                        .padding(.vertical, AppSpacing.sm)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: viewModel.messages.count) { _, _ in
                        withAnimation(.easeOut(duration: 0.3)) {
                            proxy.scrollTo("bottom", anchor: .bottom)
                        }
                    }
                    .onChange(of: viewModel.pendingMessages.count) { _, _ in
                        withAnimation(.easeOut(duration: 0.3)) {
                            proxy.scrollTo("bottom", anchor: .bottom)
                        }
                    }
                    .onChange(of: realtimeManager.typingUsers.isEmpty) { _, _ in
                        withAnimation(.easeOut(duration: 0.3)) {
                            proxy.scrollTo("bottom", anchor: .bottom)
                        }
                    }
                    .onAppear {
                        // Scroll to bottom on first appear
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            proxy.scrollTo("bottom", anchor: .bottom)
                        }
                    }
                }
            }

            // Input bar
            ChatInputBar(
                onSend: { text in
                    Task {
                        await viewModel.sendMessage(
                            text: text,
                            senderName: dataManager.clientProfile?.name ?? "You",
                            senderAvatarUrl: dataManager.clientProfile?.profileImageUrl
                        )
                    }
                },
                onTypingChanged: { isTyping in
                    Task {
                        await realtimeManager.sendTyping(isTyping: isTyping)
                    }
                }
            )
        }
        .background(AppColors.pureBlack)
        .navigationTitle("Chat")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            isWithinBusinessHours = BusinessHoursBanner.checkBusinessHours()
            loadChat()
        }
        .onDisappear {
            Task {
                await realtimeManager.disconnect()
            }
        }
        .onChange(of: scenePhase) { _, newPhase in
            switch newPhase {
            case .active:
                reconnectAndCatchUp()
            case .background:
                Task {
                    await realtimeManager.disconnect()
                }
            default:
                break
            }
        }
    }

    // MARK: - Load & Connect

    private func loadChat() {
        guard let clientId = dataManager.clientProfile?.id else { return }
        Task {
            await viewModel.loadConversation(clientId: clientId)
            connectRealtime()
            await viewModel.markMessagesAsRead()
            // Reset unread badge
            dataManager.unreadChatCount = 0
        }
    }

    private func connectRealtime() {
        guard let conversationId = viewModel.conversationId else { return }
        Task {
            await realtimeManager.connect(conversationId: conversationId) { [viewModel] message in
                viewModel.handleNewMessage(message)
                Task {
                    await viewModel.markMessagesAsRead()
                }
            }
        }
    }

    private func reconnectAndCatchUp() {
        guard let conversationId = viewModel.conversationId else { return }
        Task {
            // Catch up on missed messages
            if let lastTimestamp = viewModel.lastMessageTimestamp {
                await viewModel.fetchMessagesSince(lastTimestamp)
            }
            // Reconnect WebSocket
            await realtimeManager.reconnect(conversationId: conversationId) { [viewModel] message in
                viewModel.handleNewMessage(message)
                Task {
                    await viewModel.markMessagesAsRead()
                }
            }
            await viewModel.markMessagesAsRead()
            isWithinBusinessHours = BusinessHoursBanner.checkBusinessHours()
        }
    }

    // MARK: - Date Separator Logic

    /// Show date separator when this message's date differs from the previous message's date.
    private func shouldShowDateSeparator(at index: Int) -> Bool {
        guard let currentDate = viewModel.messages[index].parsedCreatedAt else { return false }
        if index == 0 { return true }
        guard let previousDate = viewModel.messages[index - 1].parsedCreatedAt else { return true }
        return !Calendar.current.isDate(currentDate, inSameDayAs: previousDate)
    }

    /// Show avatar when the sender differs from the next message's sender (visual grouping).
    private func shouldShowAvatar(at index: Int) -> Bool {
        let message = viewModel.messages[index]
        if message.isClient { return false } // Client messages don't show avatars
        if index == viewModel.messages.count - 1 { return true } // Last message shows avatar
        let next = viewModel.messages[index + 1]
        return next.senderId != message.senderId
    }
}
