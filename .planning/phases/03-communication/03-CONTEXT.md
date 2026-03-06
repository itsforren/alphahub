# Phase 3: Communication - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Real-time chat between client and Alpha Hub support, plus push notifications for key events with deep linking. Single conversation thread per client. Attachments (images, PDFs) and link previews in chat. APNs-based push notifications with grouped delivery and deep link routing.

</domain>

<decisions>
## Implementation Decisions

### Chat experience
- Single conversation thread per client (not multiple threads/channels)
- Date separators between days ("Today", "Yesterday", "Mar 4"); tap any message to reveal exact time
- Business hours banner shown ONLY when outside business hours ("We're offline — replies within 24h"); hidden during hours
- Welcome message + support hours prompt on empty chat (first-time experience)

### Attachment & media handling
- Image sources: photo library AND camera (both available via picker)
- Supported file types: images + PDFs only (no Word/Excel/etc.)
- Images display as large inline previews in the bubble (fill most of bubble width), tappable for fullscreen with pinch-to-zoom
- Link previews: card-style (site icon, title, description, thumbnail) below the message text — like iMessage/Slack

### Push notification behavior
- Notification types: new chat messages, payment reminders, low wallet balance, new course content, AND new lead notifications
- Notifications grouped by type in notification center (chat stacked together, billing together, etc.)
- In-app: show slide-down banner only when user is NOT on the chat screen; if on chat, messages appear in real time (no double notification)
- App badge: unread chat messages count only; clears when chat is opened

### Offline & message delivery
- Offline sending: messages queue locally with "sending..." indicator, auto-retry when connection returns, failed messages show retry button
- Message delivery status: "sending..." state, then clear once sent; read receipts shown as indicator (no delivered/received intermediate states)

### Claude's Discretion
- Message grouping style (consecutive same-sender bubbles)
- Reconnection UX after WebSocket disconnect (silent catch-up vs indicator)
- Image compression/sizing before upload
- Exact typing indicator animation
- Chat input bar design (attachment button placement, send button style)
- Push notification sounds

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches. The overall vibe should match the dark-first design system established in Phase 1.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-communication*
*Context gathered: 2026-03-06*
