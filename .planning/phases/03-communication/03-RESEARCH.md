# Phase 3: Communication - Research

**Researched:** 2026-03-06
**Domain:** Supabase Realtime chat (WebSocket), Supabase Storage file uploads, APNs push notifications, SwiftUI chat UI -- all for native iOS 17+ app
**Confidence:** HIGH (core patterns verified via official Supabase docs, Apple docs, and existing web app chat implementation)

## Summary

Phase 3 adds real-time client-admin chat and push notifications to the Alpha Hub iOS app. The chat backend already exists -- `chat_conversations`, `chat_messages`, and `chat_settings` tables are live in Supabase with RLS policies, realtime publication enabled, and a `chat-notification` edge function that sends email/SMS/Slack on new messages. The `chat-attachments` Storage bucket is also already created with public read access. The iOS app needs to subscribe to these existing tables via supabase-swift's Realtime API, build a SwiftUI chat UI, handle file uploads via the existing Storage bucket, and add APNs push notifications.

The critical blocker documented in STATE.md -- Supabase Realtime WebSocket disconnect on iOS background/foreground transitions -- is a real and documented issue. The WebSocket connection drops when the app is backgrounded (iOS suspends network after ~90 seconds). The recommended mitigation is a "reconnect + catch-up" pattern: detect foreground transition via `scenePhase`, re-subscribe to the Realtime channel, and re-fetch missed messages via a REST query. This is not a showstopper -- it is a well-understood pattern that the chat must implement.

For push notifications, the decision is APNs direct (no Firebase/FCM) since this is iOS-only. This requires: a `device_tokens` table in Supabase (new), a new edge function that signs JWT with the APNs .p8 key and sends HTTP/2 POST to api.push.apple.com, and client-side `UNUserNotificationCenter` registration with `UIApplicationDelegateAdaptor`. Deno supports both `node:http2` and HTTP/2 via `fetch()` to HTTPS URLs, making direct APNs calls from edge functions feasible.

**Primary recommendation:** Build a `RealtimeManager` @Observable class that owns the WebSocket channel lifecycle (connect on chat open, disconnect on chat close, reconnect on foreground). Use supabase-swift's `channel.postgresChange(InsertAction.self, ...)` for new messages and `channel.broadcast()` for typing indicators. For push notifications, create a `PushNotificationManager` that handles device token registration, permission prompts, and in-app notification display. Store device tokens in a new `device_tokens` table and create a `send-push-notification` edge function for server-side APNs delivery.

## Standard Stack

### Core (already installed from Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supabase-swift | 2.41.1+ | Realtime channels (postgres_changes, broadcast), Storage uploads, REST queries | Already configured; provides `.channel()`, `.postgresChange()`, `.broadcast()`, `.storage.from().upload()` |

### Apple Frameworks (no SPM needed)

| Framework | Purpose | When to Use |
|-----------|---------|-------------|
| UserNotifications | `UNUserNotificationCenter`, `UNMutableNotificationContent`, `UNNotificationServiceExtension` | Push notification registration, display, grouping, badge management |
| PhotosUI | `PhotosPicker` (iOS 16+), camera access | Image/file attachment selection in chat |
| UIKit | `UIApplicationDelegateAdaptor`, `UIApplication.shared.registerForRemoteNotifications()` | Device token capture (APNs) |
| LinkPresentation | `LPMetadataProvider` (optional, for client-side preview) | Link preview extraction -- but server-side edge function `fetch-link-preview` already exists |
| QuickLook | `QLPreviewController` for PDF viewing | Viewing PDF attachments inline |

### Already Existing Backend (no new setup)

| Component | Status | Notes |
|-----------|--------|-------|
| `chat_conversations` table | LIVE | One per client, unread counts, last_message_at, Realtime publication enabled |
| `chat_messages` table | LIVE | sender_id, sender_role, attachments, link_preview, read_at, Realtime publication enabled |
| `chat_settings` table | LIVE | Business hours config (9-5 EST Mon-Fri) |
| `chat-attachments` Storage bucket | LIVE | Public read, authenticated upload |
| `chat-notification` edge function | LIVE | Sends email + SMS + Slack on new messages |
| `fetch-link-preview` edge function | LIVE | OG metadata extraction, caches to link_preview column |
| `mark_messages_read` RPC | LIVE | Marks messages as read, resets unread counts |
| `update_conversation_on_message` trigger | LIVE | Auto-updates conversation on new message insert |
| `send_welcome_chat_message` trigger | LIVE | Sends welcome message on conversation creation |

### New Infrastructure Needed

| Component | Purpose | Notes |
|-----------|---------|-------|
| `device_tokens` table | Store APNs device tokens per user | New migration: user_id, device_token, platform, created_at |
| `send-push-notification` edge function | Send APNs HTTP/2 POST with JWT auth | New edge function: reads .p8 key from secrets, signs JWT, sends to api.push.apple.com |
| APNs Key (.p8 file) | Token-based auth with Apple | Must be generated in Apple Developer Portal, stored as Supabase secret |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct APNs from edge function | Firebase Cloud Messaging (FCM) | Adds Firebase dependency; unnecessary for iOS-only app |
| Direct APNs from edge function | OneSignal / Expo Push | Adds third-party dependency and vendor lock-in |
| PhotosPicker (SwiftUI native) | UIImagePickerController | Legacy UIKit; PhotosPicker is native SwiftUI since iOS 16 |
| Supabase Realtime Broadcast for typing | Presence for typing | Broadcast is simpler (fire-and-forget); Presence is overkill for ephemeral typing state |
| Server-side link preview (edge fn) | Client-side LPMetadataProvider | Edge function already exists and caches results; client-side would duplicate work |

**No new SPM dependencies needed.** Phase 3 uses only supabase-swift (already installed) plus Apple frameworks.

## Architecture Patterns

### Recommended Project Structure (additions to Phase 2)

```
AlphaHub/
├── Core/
│   ├── Data/
│   │   ├── DataManager.swift             # Existing -- add unreadChatCount property
│   │   └── Models/
│   │       ├── ChatModels.swift           # NEW: ChatConversation, ChatMessage, ChatAttachment
│   │       └── NotificationModels.swift   # NEW: PushNotificationType, DeviceToken
│   ├── Realtime/
│   │   └── RealtimeManager.swift          # NEW: @Observable -- WebSocket channel lifecycle
│   └── Notifications/
│       ├── PushNotificationManager.swift  # NEW: @Observable -- APNs registration, permissions
│       └── AppDelegate+Push.swift         # NEW: UIApplicationDelegateAdaptor for device token
├── Features/
│   ├── Chat/
│   │   ├── ChatView.swift                 # NEW: Main chat screen (messages + input)
│   │   ├── ChatViewModel.swift            # NEW: Sends messages, manages local state, offline queue
│   │   ├── MessageBubbleView.swift        # NEW: Single message bubble (alignment, avatar, time)
│   │   ├── ChatInputBar.swift             # NEW: Text field + attachment button + send button
│   │   ├── AttachmentPickerSheet.swift    # NEW: PhotosPicker + camera + file picker
│   │   ├── ImagePreviewView.swift         # NEW: Fullscreen image with pinch-to-zoom
│   │   ├── LinkPreviewCard.swift          # NEW: OG metadata card below message text
│   │   ├── DateSeparatorView.swift        # NEW: "Today", "Yesterday", "Mar 4" between days
│   │   ├── TypingIndicatorView.swift      # NEW: Animated dots when admin is typing
│   │   ├── BusinessHoursBanner.swift      # NEW: "We're offline" banner outside hours
│   │   └── ChatEmptyStateView.swift       # NEW: Welcome message + support hours
│   └── Shell/
│       ├── FloatingTabBar.swift           # Existing -- add badge count for chat tab
│       └── ClientTabView.swift            # Existing -- replace chat PlaceholderView
```

### Pattern 1: RealtimeManager -- WebSocket Channel Lifecycle

**What:** `@Observable` class managing Supabase Realtime channel for chat messages. Handles subscribe, unsubscribe, reconnect on foreground, and message streaming.
**When to use:** Whenever the chat screen is active.

```swift
// Source: supabase-swift official docs + Supabase Realtime troubleshooting guide
import Observation
import Supabase

@MainActor
@Observable
final class RealtimeManager {
    var isConnected = false
    var typingUsers: Set<String> = []

    private var channel: RealtimeChannelV2?
    private var messageTask: Task<Void, Never>?
    private var typingTask: Task<Void, Never>?
    private let supabase: SupabaseClient

    init(supabase: SupabaseClient = SupabaseConfig.client) {
        self.supabase = supabase
    }

    // MARK: - Connect to conversation channel

    func connect(conversationId: String, onNewMessage: @escaping (ChatMessage) -> Void) async {
        // Disconnect any existing channel first
        await disconnect()

        let ch = supabase.channel("chat-\(conversationId)")

        // Listen for new messages via postgres_changes
        let insertions = ch.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "chat_messages",
            filter: .eq("conversation_id", value: conversationId)
        )

        // Listen for typing indicators via broadcast
        let typingStream = ch.broadcastStream(event: "typing")

        await ch.subscribe()
        self.channel = ch
        self.isConnected = true

        // Process new messages
        messageTask = Task {
            for await change in insertions {
                if let message = try? change.record.decode(as: ChatMessage.self) {
                    onNewMessage(message)
                }
            }
        }

        // Process typing indicators
        typingTask = Task {
            for await payload in typingStream {
                if let userId = payload["user_id"]?.stringValue,
                   let isTyping = payload["is_typing"]?.boolValue {
                    if isTyping {
                        typingUsers.insert(userId)
                    } else {
                        typingUsers.remove(userId)
                    }
                    // Auto-clear after 5 seconds
                    Task {
                        try? await Task.sleep(for: .seconds(5))
                        typingUsers.remove(userId)
                    }
                }
            }
        }
    }

    // MARK: - Send typing indicator

    func sendTyping(isTyping: Bool) async {
        guard let channel else { return }
        await channel.broadcast(
            event: "typing",
            message: ["user_id": .string("client"), "is_typing": .bool(isTyping)]
        )
    }

    // MARK: - Disconnect

    func disconnect() async {
        messageTask?.cancel()
        typingTask?.cancel()
        if let channel {
            await supabase.removeChannel(channel)
        }
        channel = nil
        isConnected = false
        typingUsers = []
    }

    // MARK: - Reconnect (call on foreground transition)

    func reconnect(conversationId: String, onNewMessage: @escaping (ChatMessage) -> Void) async {
        await connect(conversationId: conversationId, onNewMessage: onNewMessage)
    }
}
```

### Pattern 2: Foreground Reconnect + Catch-Up (CRITICAL)

**What:** When the app returns from background, the WebSocket is dead. Must reconnect the channel AND re-fetch any missed messages via REST.
**When to use:** Every time the app transitions to foreground while on the chat screen.

```swift
// Source: Supabase troubleshooting docs + scenePhase Apple docs
// In ChatView.swift:

@Environment(\.scenePhase) private var scenePhase
@Environment(RealtimeManager.self) private var realtimeManager

.onChange(of: scenePhase) { _, newPhase in
    if newPhase == .active {
        Task {
            // 1. Reconnect WebSocket
            await realtimeManager.reconnect(
                conversationId: conversationId,
                onNewMessage: handleNewMessage
            )
            // 2. Catch up on missed messages since last known timestamp
            await viewModel.fetchMessagesSince(lastMessageTimestamp)
        }
    } else if newPhase == .background {
        Task {
            await realtimeManager.disconnect()
        }
    }
}
```

### Pattern 3: Offline Message Queue

**What:** Messages queued locally when offline, auto-sent when connection returns.
**When to use:** Handling message sending when network is unavailable.

```swift
// Source: Context decision -- offline sending with retry
struct PendingMessage: Identifiable {
    let id = UUID()
    let text: String
    let attachment: AttachmentData?
    var status: PendingStatus = .sending
    let createdAt = Date()

    enum PendingStatus {
        case sending
        case failed
    }
}

// In ChatViewModel:
var pendingMessages: [PendingMessage] = []

func sendMessage(text: String, attachment: AttachmentData?) async {
    let pending = PendingMessage(text: text, attachment: attachment)
    pendingMessages.append(pending)

    do {
        // Upload attachment if present
        var attachmentData: AttachmentInfo? = nil
        if let attachment {
            attachmentData = try await uploadAttachment(attachment)
        }

        // Insert message via REST
        let message: ChatMessage = try await supabase
            .from("chat_messages")
            .insert(ChatMessageInsert(
                conversationId: conversationId,
                senderId: userId,
                senderName: senderName,
                senderRole: "client",
                senderAvatarUrl: avatarUrl,
                message: text,
                attachmentUrl: attachmentData?.url,
                attachmentType: attachmentData?.type,
                attachmentName: attachmentData?.name
            ))
            .select()
            .single()
            .execute()
            .value

        // Remove from pending queue
        pendingMessages.removeAll { $0.id == pending.id }

        // Trigger notification edge function (fire-and-forget)
        try? await supabase.functions.invoke("chat-notification", options: .init(
            body: ["message": message, "type": "INSERT"]
        ))
    } catch {
        // Mark as failed -- user can tap to retry
        if let idx = pendingMessages.firstIndex(where: { $0.id == pending.id }) {
            pendingMessages[idx].status = .failed
        }
    }
}
```

### Pattern 4: Supabase Storage Upload for Attachments

**What:** Upload images/PDFs to the existing `chat-attachments` bucket and get a public URL.
**When to use:** When a user attaches an image or PDF to a chat message.

```swift
// Source: supabase-swift Storage docs + existing web app ChatInput.tsx pattern

func uploadAttachment(_ data: AttachmentData) async throws -> AttachmentInfo {
    let fileExt = data.fileName.components(separatedBy: ".").last ?? "dat"
    let uniqueName = "\(Int(Date().timeIntervalSince1970))-\(UUID().uuidString.prefix(7)).\(fileExt)"
    let filePath = "attachments/\(uniqueName)"

    // Compress image if needed (target < 1MB for fast upload)
    let uploadData: Data
    if data.mimeType.hasPrefix("image/"), let compressed = compressImage(data.fileData, maxBytes: 1_000_000) {
        uploadData = compressed
    } else {
        uploadData = data.fileData
    }

    try await supabase.storage
        .from("chat-attachments")
        .upload(
            path: filePath,
            file: uploadData,
            options: FileOptions(
                cacheControl: "3600",
                contentType: data.mimeType
            )
        )

    let publicURL = try supabase.storage
        .from("chat-attachments")
        .getPublicURL(path: filePath)

    return AttachmentInfo(
        url: publicURL.absoluteString,
        type: data.mimeType.hasPrefix("image/") ? "image" : "file",
        name: data.fileName
    )
}

// Image compression utility
func compressImage(_ data: Data, maxBytes: Int) -> Data? {
    guard let uiImage = UIImage(data: data) else { return nil }
    var quality: CGFloat = 0.8
    var compressed = uiImage.jpegData(compressionQuality: quality)
    while let c = compressed, c.count > maxBytes, quality > 0.1 {
        quality -= 0.1
        compressed = uiImage.jpegData(compressionQuality: quality)
    }
    return compressed
}
```

### Pattern 5: Push Notification Registration (Client-Side)

**What:** Register for APNs, capture device token, store in Supabase.
**When to use:** App launch, after user grants notification permission.

```swift
// Source: Apple UserNotifications docs + Supabase device_tokens pattern

// AppDelegate+Push.swift
import UIKit
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let tokenString = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task {
            await PushNotificationManager.shared.saveDeviceToken(tokenString)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Failed to register for push: \(error)")
    }

    // Handle notification when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Check if user is on chat screen -- if so, suppress notification
        let userInfo = notification.request.content.userInfo
        let notificationType = userInfo["type"] as? String

        if notificationType == "chat" && PushNotificationManager.shared.isOnChatScreen {
            // Suppress -- message appears in real-time via WebSocket
            completionHandler([])
        } else {
            // Show banner
            completionHandler([.banner, .sound, .badge])
        }
    }

    // Handle notification tap (deep link routing)
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        Task { @MainActor in
            PushNotificationManager.shared.handleNotificationTap(userInfo: userInfo)
        }
        completionHandler()
    }
}

// In AlphaHubApp.swift:
@UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
```

### Pattern 6: APNs Edge Function (Server-Side)

**What:** Supabase Edge Function that sends push notifications via APNs HTTP/2 API with JWT auth.
**When to use:** Triggered by database webhook on chat_messages INSERT, billing_records INSERT, etc.

```typescript
// Source: APNs HTTP/2 protocol docs + Deno node:http2 compatibility
// supabase/functions/send-push-notification/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY")!; // .p8 contents
const APNS_BUNDLE_ID = "com.alphaagent.ios";
const APNS_HOST = "https://api.push.apple.com"; // production

async function createAPNsJWT(): Promise<string> {
    const key = await crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(APNS_PRIVATE_KEY),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );

    return await create(
        { alg: "ES256", kid: APNS_KEY_ID },
        { iss: APNS_TEAM_ID, iat: getNumericDate(new Date()) },
        key
    );
}

async function sendPushNotification(
    deviceToken: string,
    payload: object,
    pushType: string = "alert"
): Promise<boolean> {
    const jwt = await createAPNsJWT();

    const response = await fetch(
        `${APNS_HOST}/3/device/${deviceToken}`,
        {
            method: "POST",
            headers: {
                "authorization": `bearer ${jwt}`,
                "apns-push-type": pushType,
                "apns-topic": APNS_BUNDLE_ID,
                "apns-priority": "10",
                "apns-expiration": "0",
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
        }
    );

    return response.ok;
}
```

### Pattern 7: Notification Grouping and Badge Management

**What:** Group notifications by type using `threadIdentifier`, manage app badge count.
**When to use:** All push notifications sent from server.

```json
// APNs payload structure for grouped chat notification
{
    "aps": {
        "alert": {
            "title": "Sierra",
            "subtitle": "Alpha Hub Support",
            "body": "Hey! Your campaign is performing great this week..."
        },
        "badge": 3,
        "sound": "default",
        "thread-id": "chat",
        "category": "CHAT_MESSAGE",
        "mutable-content": 1
    },
    "type": "chat",
    "conversation_id": "uuid-here",
    "sender_name": "Sierra"
}
```

```json
// APNs payload for billing notification
{
    "aps": {
        "alert": {
            "title": "Payment Due",
            "body": "Your management fee of $750 is due March 10"
        },
        "badge": 1,
        "sound": "default",
        "thread-id": "billing"
    },
    "type": "billing",
    "billing_record_id": "uuid-here"
}
```

### Anti-Patterns to Avoid

- **Keeping WebSocket connected when not on chat screen:** Only connect when the user is viewing chat. Disconnect on tab switch and background. Reconnect on return.
- **Polling for new messages:** Use Realtime subscription for live messages. Only fall back to REST for catch-up after reconnect.
- **Storing typing state in the database:** Use Supabase Broadcast (ephemeral, no persistence) for typing indicators. Never write typing state to a table.
- **Sending push notifications from the iOS app:** Always send from server-side (edge function). The iOS app only receives -- never sends to APNs directly.
- **Blocking UI on attachment upload:** Show the pending message immediately with a progress indicator. Upload happens in the background.
- **Double-notifying in-app:** When the user is on the chat screen and a new message arrives via WebSocket, do NOT also show an in-app banner. Check `isOnChatScreen` before presenting foreground notifications.
- **Trusting WebSocket will auto-reconnect reliably:** It will not on iOS. Always implement manual reconnect + REST catch-up on foreground transition.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket management | Custom URLSessionWebSocketTask | supabase-swift Realtime `.channel()` | Handles heartbeat, reconnection, auth automatically |
| Typing indicators | Database table with is_typing column | Supabase Realtime Broadcast | Ephemeral, no persistence, no DB writes, built-in |
| Image picker | Custom UIImagePickerController wrapper | SwiftUI `PhotosPicker` (iOS 16+) | Native SwiftUI, handles permissions, multi-selection |
| Image compression | Manual CGBitmapContext resizing | `UIImage.jpegData(compressionQuality:)` | One-liner, quality control built-in |
| Link preview extraction | Client-side HTML parsing | Existing `fetch-link-preview` edge function | Already built, caches results to DB |
| Notification permission prompt | Custom alert | `UNUserNotificationCenter.requestAuthorization()` | Native iOS dialog, proper permission flow |
| Badge count management | Manual count tracking | Server sets `badge` field in APNs payload + client clears on app open | Server is source of truth for unread count |
| Date separators ("Today", "Yesterday") | Manual date string comparison | `Calendar.isDateInToday()`, `.isDateInYesterday()`, `DateFormatter` | Built-in, locale-aware |
| PDF preview | Custom PDF renderer | `QLPreviewController` via UIViewControllerRepresentable | Full-featured PDF viewer with zoom, share |
| Message read receipts | Custom polling | Existing `mark_messages_read` RPC function | Already built, resets unread counts atomically |
| Business hours check | Custom time comparison | Port existing `isWithinBusinessHours()` logic from web app | Already defined: 9-5 EST, Mon-Fri, stored in `chat_settings` |

**Key insight:** The entire chat backend is already built. The iOS app is a client consuming existing tables, triggers, edge functions, and Storage buckets. The main engineering effort is the Realtime lifecycle management and SwiftUI chat UI.

## Common Pitfalls

### Pitfall 1: WebSocket Dies on Background and Silently Stays Dead

**What goes wrong:** After backgrounding and returning, the chat appears connected but no new messages arrive.
**Why it happens:** iOS suspends the app after ~90 seconds in background. The WebSocket heartbeat stops. The server drops the connection. The supabase-swift client may show "subscribed" status but the channel is dead.
**How to avoid:** Implement the reconnect + catch-up pattern (Pattern 2). On every `scenePhase == .active` transition:
1. Call `realtimeManager.disconnect()` to clean up stale channel
2. Call `realtimeManager.connect()` to establish fresh channel
3. Call `viewModel.fetchMessagesSince(lastTimestamp)` to catch up on missed messages
**Warning signs:** Messages sent by admin while app was backgrounded never appear until manual refresh.

### Pitfall 2: Duplicate Messages on Reconnect

**What goes wrong:** After reconnecting, the same messages appear twice in the UI.
**Why it happens:** The catch-up REST query returns messages that also arrive via the freshly reconnected WebSocket channel.
**How to avoid:** Deduplicate by message ID. Maintain a `Set<String>` of known message IDs. Before adding any message to the display array, check if its ID is already known. Use the message `id` (UUID) as the dedup key.
**Warning signs:** Same message appears twice with same timestamp and content.

### Pitfall 3: Device Token Changes

**What goes wrong:** Push notifications stop arriving on a user's device.
**Why it happens:** APNs device tokens can change when the app is reinstalled, the device is restored from backup, or the user updates iOS. If the old token is stored in the database, notifications are sent to a dead token.
**How to avoid:** Always send the device token on every app launch (in `didRegisterForRemoteNotificationsWithDeviceToken`). Upsert (not insert) into the `device_tokens` table keyed on `(user_id, device_token)`. Delete stale tokens when APNs returns a 410 Gone response.
**Warning signs:** APNs returns 410 status code; notifications silently fail.

### Pitfall 4: Chat Messages Insert Blocked by RLS

**What goes wrong:** Client can view messages but cannot send new ones.
**Why it happens:** The RLS INSERT policy on `chat_messages` requires `sender_id = auth.uid()`. If the iOS app sends a different sender_id (e.g., the client's `clients.id` instead of `auth.uid()`), the insert is rejected.
**How to avoid:** Always use `supabase.auth.session.user.id` as the `sender_id`. The existing RLS policy checks `sender_id = auth.uid()`.
**Warning signs:** Silent insert failure (Supabase returns 403 or empty response).

### Pitfall 5: Attachment Upload Fails Silently

**What goes wrong:** User attaches an image, message sends, but the image URL is broken or missing.
**Why it happens:** Storage upload fails (network error, file too large) but the message is sent anyway without the attachment.
**How to avoid:** Upload the attachment FIRST, THEN send the message. If upload fails, show an error and don't send the message. Enforce a file size limit (10MB matches web app).
**Warning signs:** Message sent with attachment_url pointing to a non-existent file.

### Pitfall 6: Business Hours Banner Timezone Issues

**What goes wrong:** Banner shows "offline" when it should be within business hours, or vice versa.
**Why it happens:** Business hours are 9-5 EST (America/New_York). If the app computes in the device's local timezone instead of EST, the banner is wrong.
**How to avoid:** Always convert to America/New_York timezone before comparing hours. Use `TimeZone(identifier: "America/New_York")` explicitly, matching the web app's `isWithinBusinessHours()` logic.
**Warning signs:** West coast users see "offline" banner at 8 AM local time (11 AM EST, which should be online).

### Pitfall 7: Push Notification Not Delivered to Background App

**What goes wrong:** Push notifications arrive when app is in foreground but not when backgrounded.
**Why it happens:** Missing required APNs headers (`apns-push-type: alert`), incorrect bundle ID in `apns-topic`, or the notification payload is malformed.
**How to avoid:** Always include ALL required headers: `apns-push-type`, `apns-topic` (bundle ID), `apns-priority`, `apns-expiration`. Test with the APNs sandbox environment first. Use Apple's Console.app to diagnose delivery issues.
**Warning signs:** Edge function returns 200 but device never receives notification.

### Pitfall 8: PhotosPicker Returns Wrong Data Format

**What goes wrong:** Image upload fails with encoding error.
**Why it happens:** `PhotosPicker` returns `PhotosPickerItem` which needs explicit loading via `loadTransferable(type: Data.self)`. Some images are HEIC format and may need conversion.
**How to avoid:** Always convert to JPEG before upload using `UIImage(data:)?.jpegData(compressionQuality:)`. This normalizes format and applies compression.
**Warning signs:** Upload succeeds but image displays broken in chat.

## Code Examples

### Supabase Query: Get or Create Conversation

```swift
// Source: Existing web app useClientConversation hook
// Matches the get_or_create_conversation RPC function

func getOrCreateConversation(clientId: String) async throws -> ChatConversation {
    // Try existing
    let existing: ChatConversation? = try? await supabase
        .from("chat_conversations")
        .select()
        .eq("client_id", value: clientId)
        .single()
        .execute()
        .value

    if let existing { return existing }

    // Create new (triggers welcome message via DB trigger)
    let newConvo: ChatConversation = try await supabase
        .from("chat_conversations")
        .insert(["client_id": clientId])
        .select()
        .single()
        .execute()
        .value

    return newConvo
}
```

### Supabase Query: Fetch Messages with Pagination

```swift
// Source: Existing web app useChatMessages hook
// Paginated, newest first, reversed for display

struct MessagePage {
    let messages: [ChatMessage]
    let nextCursor: String?  // created_at of oldest message in page
}

func fetchMessages(conversationId: String, before: String? = nil) async throws -> MessagePage {
    var query = supabase
        .from("chat_messages")
        .select()
        .eq("conversation_id", value: conversationId)
        .order("created_at", ascending: false)
        .limit(50)

    if let before {
        query = query.lt("created_at", value: before)
    }

    let messages: [ChatMessage] = try await query.execute().value
    let reversed = messages.reversed()  // oldest first for display

    let nextCursor = messages.count == 50 ? messages.last?.createdAt : nil

    return MessagePage(
        messages: Array(reversed),
        nextCursor: nextCursor
    )
}
```

### Supabase Query: Mark Messages as Read

```swift
// Source: Existing mark_messages_read RPC function

func markMessagesAsRead(conversationId: String) async {
    try? await supabase.rpc(
        "mark_messages_read",
        params: [
            "p_conversation_id": conversationId,
            "p_user_role": "client"
        ]
    ).execute()
}
```

### Business Hours Check (Port from Web App)

```swift
// Source: Ported from useChat.ts isWithinBusinessHours()

func isWithinBusinessHours() -> Bool {
    let calendar = Calendar.current
    let now = Date()

    // Convert to EST
    guard let est = TimeZone(identifier: "America/New_York") else { return true }
    var estCalendar = Calendar.current
    estCalendar.timeZone = est

    let hour = estCalendar.component(.hour, from: now)
    let weekday = estCalendar.component(.weekday, from: now)

    // weekday: 1 = Sunday, 7 = Saturday
    let isWeekend = weekday == 1 || weekday == 7
    let isBusinessHour = hour >= 9 && hour < 17

    return !isWeekend && isBusinessHour
}
```

### Date Separator Logic

```swift
// Source: Context decision -- "Today", "Yesterday", "Mar 4"

func dateSeparatorText(for date: Date) -> String {
    let calendar = Calendar.current
    if calendar.isDateInToday(date) {
        return "Today"
    } else if calendar.isDateInYesterday(date) {
        return "Yesterday"
    } else {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}
```

### Device Token Storage

```swift
// Source: Standard APNs device token pattern

// In PushNotificationManager:
func saveDeviceToken(_ token: String) async {
    guard let userId = try? await supabase.auth.session.user.id else { return }

    // Upsert: update if exists, insert if new
    try? await supabase
        .from("device_tokens")
        .upsert([
            "user_id": userId.uuidString,
            "device_token": token,
            "platform": "ios",
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ], onConflict: "user_id, device_token")
        .execute()
}
```

### Deep Link Routing from Push Notification

```swift
// Source: Context decision -- deep link from notification tap

// In PushNotificationManager:
@MainActor
func handleNotificationTap(userInfo: [AnyHashable: Any]) {
    guard let type = userInfo["type"] as? String else { return }

    switch type {
    case "chat":
        router.clientTab = .chat
    case "billing":
        router.clientTab = .wallet
    case "course":
        router.clientTab = .courses
    case "lead":
        router.clientTab = .home
    default:
        break
    }
}
```

## Database Migrations Needed

### New: `device_tokens` Table

```sql
CREATE TABLE public.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'ios',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, device_token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can manage their own device tokens"
ON public.device_tokens FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all tokens (for sending notifications)
CREATE POLICY "Admins can view all device tokens"
ON public.device_tokens FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UIImagePickerController | SwiftUI PhotosPicker | iOS 16 (2022) | Native SwiftUI picker, no UIKit wrapper needed |
| PHPickerViewController | SwiftUI PhotosPicker | iOS 16 (2022) | Same -- PhotosPicker replaces both |
| APNs certificate-based auth | APNs token-based auth (JWT, .p8 key) | 2020+ | No certificate expiration management; one key works for all apps |
| Legacy APNs binary protocol | HTTP/2 API | 2021+ (mandatory) | Standard HTTP, JSON payloads, better error responses |
| Firebase/FCM for iOS-only | Direct APNs | Always available | No Firebase dependency for iOS-only apps |
| Custom WebSocket via URLSession | supabase-swift Realtime | Available since supabase-swift v1 | Integrated with auth, automatic heartbeat, channel management |
| ObservableObject + @Published | @Observable (Observation framework) | iOS 17 (2023) | Less boilerplate, better performance, used throughout existing app |
| UNUserNotificationCenter via AppDelegate | Same (no change) | Stable since iOS 10 | Still the only way to handle device tokens in SwiftUI; UIApplicationDelegateAdaptor required |

**Deprecated/outdated:**
- APNs certificate-based auth: Being phased out by Apple. Use token-based (.p8) auth.
- Legacy APNs binary protocol: Discontinued. HTTP/2 is mandatory.
- UIImagePickerController: Legacy UIKit. Use PhotosPicker in SwiftUI.

## Open Questions

1. **Deno HTTP/2 + APNs Reliability**
   - What we know: Deno supports HTTP/2 via `fetch()` to HTTPS URLs and has `node:http2` compatibility. APNs requires HTTP/2.
   - What's unclear: Whether Deno's `fetch()` reliably negotiates HTTP/2 with api.push.apple.com, or whether we need `node:http2.connect()`. Some community reports mention issues with delivery despite 200 OK responses.
   - Recommendation: Build and test the edge function against APNs sandbox first. If `fetch()` doesn't work, fall back to `node:http2.connect()`. If neither works reliably, use an external service like OneSignal as a fallback (but try direct APNs first since it avoids dependencies).

2. **APNs .p8 Key Provisioning**
   - What we know: An APNs auth key (.p8 file) must be generated in Apple Developer Portal under Certificates > Keys.
   - What's unclear: Whether the Alpha Hub Apple Developer account already has a key, or if one needs to be created.
   - Recommendation: Check Apple Developer Portal. If no key exists, create one (limit of 2 per account). Store the key contents as a Supabase secret (`APNS_PRIVATE_KEY`).

3. **Supabase Realtime Channel Limits**
   - What we know: Supabase recommends removing unused channels. Each channel is a WebSocket subscription.
   - What's unclear: Whether there's a hard limit on concurrent channels per project, and what happens if many clients are online simultaneously.
   - Recommendation: For now, single channel per client is fine. Each client only has one conversation. Monitor via Supabase dashboard if scaling becomes an issue.

4. **Camera Access in SwiftUI (iOS 17+)**
   - What we know: PhotosPicker handles gallery selection natively. Camera requires separate handling.
   - What's unclear: The best SwiftUI pattern for camera access in iOS 17+. Apple removed the classic UIImagePickerController ActionSheet flow, and PhotosPicker doesn't support camera.
   - Recommendation: Use a separate camera button that wraps `UIImagePickerController(sourceType: .camera)` in a `UIViewControllerRepresentable`. Present it via `.fullScreenCover()`. This is the established workaround.

5. **Notification Categories for "Reply" Action**
   - What we know: PUSH-01 requires a "Reply" action on chat message notifications.
   - What's unclear: Whether to use `UNTextInputNotificationAction` (inline reply from notification) or just deep-link to chat screen.
   - Recommendation: Use `UNTextInputNotificationAction` registered as part of a `UNNotificationCategory` with identifier "CHAT_MESSAGE". This allows inline reply directly from the notification, matching iMessage behavior. The reply text would need to be sent via a `UNNotificationServiceExtension` or by opening the app.

## Sources

### Primary (HIGH confidence)
- [Supabase Swift Realtime Subscribe](https://supabase.com/docs/reference/swift/subscribe) -- `postgresChange()`, `broadcastStream()`, `channel()` Swift API
- [Supabase Swift Storage Upload](https://supabase.com/docs/reference/swift/storage-from-upload) -- `upload()`, `getPublicURL()` Swift API
- [Supabase Realtime Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast) -- Broadcast for ephemeral messaging (typing indicators)
- [Supabase LLM Reference (swift.txt)](https://supabase.com/llms/swift.txt) -- Complete supabase-swift API reference
- [Supabase Troubleshooting: Silent Disconnections](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) -- WebSocket background issue docs
- Existing codebase: `src/hooks/useChat.ts` -- Verified chat table schema, realtime patterns, message structure
- Existing codebase: `supabase/migrations/20251216053521_*.sql` -- Verified chat_conversations, chat_messages table definitions
- Existing codebase: `supabase/migrations/20251216223710_*.sql` -- Verified chat-attachments bucket, attachment columns
- Existing codebase: `supabase/functions/chat-notification/index.ts` -- Verified notification flow
- Existing codebase: `supabase/functions/fetch-link-preview/index.ts` -- Verified link preview implementation

### Secondary (MEDIUM confidence)
- [Apple PhotosPicker Docs](https://developer.apple.com/documentation/photokit/bringing-photos-picker-to-your-swiftui-app) -- iOS 16+ native SwiftUI photo picker
- [Hacking with Swift: Push Notifications Guide](https://medium.com/@jpmtech/your-complete-guide-to-push-notifications-in-swiftui-8a13f5662) -- UIApplicationDelegateAdaptor pattern for device tokens
- [Hacking with Swift: scenePhase](https://www.hackingwithswift.com/quick-start/swiftui/how-to-detect-when-your-app-moves-to-the-background-or-foreground-with-scenephase) -- Background/foreground detection
- [Hacking with Swift: threadIdentifier Grouping](https://www.hackingwithswift.com/example-code/system/how-to-group-user-notifications-using-threadidentifier-and-summaryargument) -- Notification grouping by type
- [Supabase Discussion: Realtime Reliability](https://github.com/orgs/supabase/discussions/5641) -- Community experiences with WebSocket reliability
- [Deno node:http2 API](https://docs.deno.com/api/node/http2/) -- HTTP/2 client compatibility for APNs
- [Supabase Push Notification Guide](https://supabase.com/docs/guides/functions/examples/push-notifications) -- Edge function patterns for push delivery

### Tertiary (LOW confidence)
- [AnswerOverflow: Channel subscription in iOS background](https://www.answeroverflow.com/m/1333235214448591011) -- Community report of background subscription issues
- Deno + APNs HTTP/2 reliability -- Community reports of 200 OK but no delivery; needs direct testing
- Camera access in iOS 17+ SwiftUI -- Community workarounds using UIViewControllerRepresentable; Apple docs don't address the ActionSheet removal clearly

## Metadata

**Confidence breakdown:**
- Chat UI patterns: HIGH -- SwiftUI message bubbles, input bars, date separators are well-documented standard patterns
- Supabase Realtime API: HIGH -- Verified via official Swift docs, complete API reference available
- WebSocket background/foreground: HIGH -- Well-documented issue with clear mitigation pattern (disconnect + reconnect + catch-up)
- Supabase Storage uploads: HIGH -- Verified upload/getPublicURL API; existing bucket already configured
- Existing backend infrastructure: HIGH -- Verified all tables, triggers, RPC functions, edge functions from codebase
- APNs client-side registration: HIGH -- Well-documented Apple API; stable since iOS 10
- APNs server-side from Deno edge function: MEDIUM -- Deno has HTTP/2 support but direct APNs delivery needs testing
- Notification grouping/badges: MEDIUM -- Standard iOS API, well-documented, but exact payload tuning requires testing
- Camera access pattern: MEDIUM -- Known workaround exists but not officially documented by Apple

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stable domain, existing backend, no expected schema changes)
