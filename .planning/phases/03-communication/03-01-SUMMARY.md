---
phase: "03-communication"
plan: "01"
subsystem: "chat"
tags: [realtime, websocket, chat, supabase, swiftui]
dependency_graph:
  requires: ["01-foundation", "02-core-value"]
  provides: ["chat-models", "realtime-manager", "chat-view", "chat-viewmodel"]
  affects: ["03-02", "03-03"]
tech_stack:
  added: []
  patterns: ["RealtimeManager @Observable environment injection", "postgresChange AsyncStream for WebSocket subscriptions", "BubbleShape custom Shape for chat bubbles", "PendingMessage offline queue pattern", "broadcastStream for typing indicators"]
key_files:
  created:
    - "AlphaHub/Core/Data/Models/ChatModels.swift"
    - "AlphaHub/Core/Realtime/RealtimeManager.swift"
    - "AlphaHub/Features/Chat/ChatViewModel.swift"
    - "AlphaHub/Features/Chat/ChatView.swift"
    - "AlphaHub/Features/Chat/MessageBubbleView.swift"
    - "AlphaHub/Features/Chat/ChatInputBar.swift"
    - "AlphaHub/Features/Chat/DateSeparatorView.swift"
    - "AlphaHub/Features/Chat/TypingIndicatorView.swift"
    - "AlphaHub/Features/Chat/BusinessHoursBanner.swift"
    - "AlphaHub/Features/Chat/ChatEmptyStateView.swift"
  modified:
    - "AlphaHub/Core/Data/DataManager.swift"
    - "AlphaHub/App/AlphaHubApp.swift"
    - "AlphaHub/Features/Shell/ClientTabView.swift"
    - "AlphaHub/AlphaHub.xcodeproj/project.pbxproj"
decisions:
  - id: "03-01-D1"
    decision: "Use callback-based Realtime API (postgresChange returns AsyncStream, iterated in Tasks) rather than closure-based onPostgresChange"
    rationale: "Matches official Supabase Swift examples and provides clean async/await integration"
  - id: "03-01-D2"
    decision: "Client bubbles use AppColors.accent (white) with black text; admin bubbles use surfaceElevated with white text"
    rationale: "Follows Tesla dark aesthetic -- white accent on OLED black distinguishes sender clearly"
  - id: "03-01-D3"
    decision: "markMessagesAsRead uses direct await instead of fire-and-forget Task"
    rationale: "PostgrestResponse<Void> is not Sendable, causing Swift 6 strict concurrency errors in Task closures"
  - id: "03-01-D4"
    decision: "Chat notification edge function called via supabase.functions.invoke (fire-and-forget)"
    rationale: "Non-blocking notification after message send; failure doesn't affect message delivery"
metrics:
  duration: "~9min"
  completed: "2026-03-07"
---

# Phase 03 Plan 01: Chat Core Summary

Real-time chat with Codable models, WebSocket lifecycle management, message CRUD with offline queue, and full chat UI with message bubbles, typing indicators, business hours banner, and date separators.

## What Was Built

### Task 1: Chat Models, RealtimeManager, and ChatViewModel

**ChatModels.swift** -- Six Codable types matching the existing Supabase schema:
- `ChatConversation`: conversation metadata with unread counts
- `ChatMessage`: full message with sender info, attachments, link preview, read receipts
- `ChatMessageInsert`: insert-only DTO for RLS-compliant message creation
- `PendingMessage`: local-only offline queue entry (sending/failed states)
- `LinkPreviewData`: JSON sub-object for link previews (wired in 03-02)
- `ChatSettings`: business hours configuration

**RealtimeManager.swift** -- `@Observable @MainActor` WebSocket lifecycle manager:
- `connect()`: creates channel, subscribes to postgres INSERT changes + broadcast typing events
- Iterates `AsyncStream<InsertAction>` for new message notifications
- Iterates `broadcastStream(event: "typing")` with auto-clear after 5 seconds
- `sendTyping()`: broadcasts typing indicator to other participants
- `disconnect()`: cancels tasks, removes channel, resets state
- `reconnect()`: clean disconnect + connect (background/foreground transitions)

**ChatViewModel.swift** -- `@Observable @MainActor` message state manager:
- `loadConversation()`: get-or-create conversation by client_id
- `fetchMessages()`: paginated fetch (50 per page, descending, reversed for display)
- `fetchMoreMessages()`: cursor-based pagination for older messages
- `fetchMessagesSince()`: catch-up query after reconnect with deduplication
- `handleNewMessage()`: deduplicates against `knownMessageIds` Set before appending
- `sendMessage()`: creates PendingMessage, inserts via REST (sender_id = auth.uid() for RLS), removes on success, marks failed on error
- `retryMessage()`: removes failed pending, re-sends
- `markMessagesAsRead()`: calls `mark_messages_read` RPC with client role

**DataManager** -- Added `unreadChatCount` property fetched from `chat_conversations.unread_count_client`, drives badge on Chat tab.

**AlphaHubApp** -- Added `RealtimeManager` as `@State` with `.environment()` injection.

### Task 2: ChatView UI and Subviews

**MessageBubbleView.swift** -- Chat message bubble with:
- `BubbleShape` custom Shape (flat bottom-right for client, flat bottom-left for admin)
- Client: white accent background, black text, right-aligned
- Admin: elevated surface background, white text, left-aligned with avatar
- Tap-to-reveal timestamp (relative: "2:30 PM" / "Yesterday 2:30 PM" / "Mar 4, 2:30 PM")
- Read receipt: "Read" text below client bubbles when `readAt` is set
- `PendingMessageBubble`: "Sending..." or "Failed -- Tap to retry" states

**ChatInputBar.swift** -- Input bar with:
- Expandable TextField (1-5 lines) with dark background
- Attachment button (plus.circle.fill, no-op until 03-02)
- Send button (arrow.up.circle.fill, enabled only with non-empty text)
- Typing indicator debounce: 0.5s delay before true, 3s auto-stop

**DateSeparatorView.swift** -- Centered date labels: "Today", "Yesterday", or "Mar 4"

**TypingIndicatorView.swift** -- Three bouncing dots with sequential animation delays, sender name label

**BusinessHoursBanner.swift** -- Amber banner "We're offline -- replies within 24h" shown only outside 9-5 EST Mon-Fri. Uses `TimeZone(identifier: "America/New_York")` explicitly.

**ChatEmptyStateView.swift** -- Welcome screen with chat bubble icon, support hours info

**ChatView.swift** -- Main composition:
- ScrollViewReader with LazyVStack for message list
- Date separators inserted between messages from different days
- Consecutive same-sender grouping (avatar suppression)
- Auto-scroll to bottom on new messages
- Background/foreground lifecycle: disconnect on background, reconnect + catch-up on active
- "Load earlier messages" button for pagination

**ClientTabView.swift** -- Replaced Chat tab `PlaceholderView` with `ChatView()`

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 03-01-D1 | AsyncStream-based Realtime API | Matches official examples, clean async/await |
| 03-01-D2 | White accent client bubbles, elevated surface admin bubbles | Tesla dark aesthetic consistency |
| 03-01-D3 | Direct await for markMessagesAsRead (not fire-and-forget Task) | Swift 6 Sendable conformance requirement |
| 03-01-D4 | supabase.functions.invoke for chat notifications | Non-blocking, failure-tolerant |

## Commits

| Commit | Description |
|--------|-------------|
| `4b597c1` | feat(03-01): chat models, RealtimeManager, and ChatViewModel |
| `1d4d2f5` | feat(03-01): ChatView UI with message bubbles, typing, business hours, and input bar |

## Next Phase Readiness

Plan 03-02 (Attachments & Link Previews) can proceed immediately:
- ChatView is ready for attachment button wiring (ChatInputBar has placeholder)
- ChatMessage already has attachmentUrl/attachmentType/attachmentName/linkPreview fields
- MessageBubbleView can be extended for attachment rendering

No blockers. All infrastructure is in place.
