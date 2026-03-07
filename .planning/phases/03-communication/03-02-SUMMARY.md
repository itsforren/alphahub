---
phase: 03-communication
plan: 02
subsystem: ui
tags: [swift, swiftui, supabase-storage, photospicker, async-image, link-preview, pinch-to-zoom]

# Dependency graph
requires:
  - phase: 03-01
    provides: ChatView, ChatViewModel, ChatInputBar, MessageBubbleView, ChatMessage model with attachment/linkPreview fields
provides:
  - AttachmentPickerSheet with Photo Library, Camera, and File (PDF) options
  - Image upload to Supabase Storage chat-attachments bucket with JPEG compression
  - ImagePreviewView fullscreen viewer with pinch-to-zoom and drag-to-dismiss
  - LinkPreviewCard for OG metadata display
  - MessageBubbleView extended with inline image, file card, and link preview rendering
  - Link preview detection triggering fetch-link-preview edge function
affects: [03-03-push-notifications, 04-courses]

# Tech tracking
tech-stack:
  added: [PhotosUI, UniformTypeIdentifiers]
  patterns: [Supabase Storage upload with FileOptions, AttachmentData struct for cross-view data passing, MagnifyGesture for pinch-to-zoom, separate View struct to avoid Swift 6 isolation crossing in PhotosPicker label]

key-files:
  created:
    - AlphaHub/Features/Chat/AttachmentPickerSheet.swift
    - AlphaHub/Features/Chat/ImagePreviewView.swift
    - AlphaHub/Features/Chat/LinkPreviewCard.swift
  modified:
    - AlphaHub/Features/Chat/ChatInputBar.swift
    - AlphaHub/Features/Chat/ChatViewModel.swift
    - AlphaHub/Features/Chat/ChatView.swift
    - AlphaHub/Features/Chat/MessageBubbleView.swift
    - AlphaHub/Core/Data/Models/ChatModels.swift
    - AlphaHub/AlphaHub.xcodeproj/project.pbxproj
    - AlphaHub/Info.plist

key-decisions:
  - "AttachmentOptionRow extracted to separate struct to avoid Swift 6 'non-Sendable result crosses isolation boundary' in PhotosPicker label closure"
  - "AttachmentData marked Sendable for safe cross-isolation passing"
  - "Image compression uses progressive quality reduction (0.8 -> 0.1) targeting < 1MB"
  - "Link preview detection via NSDataDetector fire-and-forget to fetch-link-preview edge function"
  - "File attachment opens in Safari (QuickLook deferred to future iteration)"

patterns-established:
  - "AttachmentData: Sendable struct for passing file data between views and view models"
  - "Separate View struct for PhotosPicker labels: avoids Swift 6 isolation crossing errors"
  - "Supabase Storage upload pattern: generate unique path, compress if image, upload with FileOptions, get public URL"

# Metrics
duration: 11min
completed: 2026-03-07
---

# Phase 03 Plan 02: Chat Attachments & Link Previews Summary

**Image/PDF upload via Supabase Storage with inline preview, fullscreen pinch-to-zoom, and OG link preview cards**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-07T00:44:42Z
- **Completed:** 2026-03-07T00:55:34Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Attachment picker sheet with Photo Library (PhotosPicker), Camera (UIImagePickerController), and File (PDF) options
- Image upload to Supabase Storage with JPEG compression and 10MB limit enforcement
- Fullscreen image viewer with MagnifyGesture pinch-to-zoom and drag-to-dismiss
- Link preview cards showing OG metadata (thumbnail, title, description, site name)
- Message bubbles extended with inline image preview, file attachment card, and link preview rendering
- Link preview detection triggers fetch-link-preview edge function on message send

## Task Commits

Each task was committed atomically:

1. **Task 1: AttachmentPickerSheet, image upload, and ChatViewModel attachment support** - `3f83b22` (feat)
2. **Task 2: ImagePreviewView, LinkPreviewCard, and MessageBubbleView media rendering** - `cebe75f` (feat)

## Files Created/Modified
- `AlphaHub/Features/Chat/AttachmentPickerSheet.swift` - Bottom sheet with Photo Library, Camera, and File picker options + CameraPickerView UIViewControllerRepresentable
- `AlphaHub/Features/Chat/ImagePreviewView.swift` - Fullscreen image viewer with pinch-to-zoom and drag-to-dismiss
- `AlphaHub/Features/Chat/LinkPreviewCard.swift` - OG metadata card (thumbnail, site name, title, description)
- `AlphaHub/Features/Chat/ChatInputBar.swift` - Wired attachment button to present AttachmentPickerSheet via .sheet()
- `AlphaHub/Features/Chat/ChatViewModel.swift` - Added uploadAttachment(), extended sendMessage() with attachment support, added triggerLinkPreview()
- `AlphaHub/Features/Chat/ChatView.swift` - Passed onAttachmentSelected callback to ChatInputBar
- `AlphaHub/Features/Chat/MessageBubbleView.swift` - Added inline image preview, file attachment card, and LinkPreviewCard rendering
- `AlphaHub/Core/Data/Models/ChatModels.swift` - Extended ChatMessageInsert with attachment_url, attachment_type, attachment_name fields
- `AlphaHub/Info.plist` - Added NSCameraUsageDescription
- `AlphaHub/AlphaHub.xcodeproj/project.pbxproj` - Registered 3 new Swift files

## Decisions Made
- Extracted AttachmentOptionRow to a separate View struct to avoid Swift 6 strict concurrency errors when used inside PhotosPicker label closure (non-Sendable result crossing isolation boundary)
- Made AttachmentData a Sendable struct for safe cross-isolation passing
- Used progressive JPEG compression (quality 0.8 down to 0.1 in 0.1 steps) targeting < 1MB upload size
- Link preview detection via NSDataDetector is fire-and-forget: triggers edge function but does not wait for response (preview appears on next message load via Realtime)
- PDF files open in Safari via UIApplication.shared.open(url) for simplicity; QuickLook integration deferred

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed 03-03 AppDelegate Swift 6 conformance errors**
- **Found during:** Task 1 (build verification)
- **Issue:** Uncommitted 03-03 files (AppDelegate+Push.swift, PushNotificationManager.swift, AlphaHubApp.swift) had Swift 6 strict concurrency errors: UNUserNotificationCenterDelegate conformance crossing isolation boundaries, missing `router` in RootView scope, non-Sendable userInfo data race
- **Fix:** Put UNUserNotificationCenterDelegate conformance on class declaration (not extension), added nonisolated to delegate methods, added @Environment(AppRouter.self) to RootView, extracted sendable type string before Task boundary, refactored handleNotificationTap to accept Sendable [String: String]
- **Files modified:** AppDelegate+Push.swift, PushNotificationManager.swift, AlphaHubApp.swift
- **Verification:** Build succeeds with zero errors
- **Committed in:** 3f83b22 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Swift 6 isolation crossing in AttachmentPickerSheet**
- **Found during:** Task 1 (build verification)
- **Issue:** `optionRow()` method returning `some View` from main-actor-isolated instance method could not be used in PhotosPicker label closure (crosses isolation boundary in Swift 6)
- **Fix:** Extracted to standalone `AttachmentOptionRow` struct (separate View type, no isolation conflict)
- **Files modified:** AttachmentPickerSheet.swift
- **Verification:** Build succeeds, PhotosPicker renders option row correctly
- **Committed in:** 3f83b22 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking from 03-03 uncommitted code, 1 Swift 6 concurrency bug)
**Impact on plan:** Both fixes were necessary for compilation. No scope creep.

## Issues Encountered
- Build initially failed due to uncommitted 03-03 files (AppDelegate, PushNotificationManager, NotificationModels) that modified AlphaHubApp.swift with references to types not yet in the project. These files existed on disk but had Swift 6 concurrency errors. Fixed as deviation Rule 3.
- iPhone 16 simulator not available (Xcode 26 SDK ships iPhone 17 simulators). Used `iPhone 17 Pro` destination instead.

## User Setup Required
None - no external service configuration required. The chat-attachments Storage bucket and fetch-link-preview edge function already exist on Supabase.

## Next Phase Readiness
- Chat feature now complete: text messaging (03-01) + attachments and link previews (03-02)
- Push notifications (03-03) files already on disk, need Swift 6 fixes committed (partially addressed here)
- All chat message types render correctly: text-only, image attachment, PDF attachment, link preview

---
*Phase: 03-communication*
*Completed: 2026-03-07*
