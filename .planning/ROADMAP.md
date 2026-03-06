# Roadmap: Alpha Agent iOS App

## Overview

Build a native Swift iOS app that gives Alpha Hub insurance agent clients full access to their portal from iPhone. The journey starts with project foundation and authentication (the dependency of every feature), progresses through the daily-use features (dashboard, billing, chat), delivers learning and activation features (courses, onboarding, agreements), adds growth mechanics (referrals, widgets), and culminates in App Store submission. Six phases, each delivering a coherent, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Xcode project, Supabase auth, biometric security, dark-first design system, navigation
- [ ] **Phase 2: Core Value** - Dashboard with wallet/metrics and billing history with transactions/payments
- [ ] **Phase 3: Communication** - Real-time chat with attachments and push notifications with deep linking
- [ ] **Phase 4: Learning & Activation** - Course video player, onboarding checklist, agreement signing
- [ ] **Phase 5: Growth & Polish** - Referral sharing, home screen widgets, leads view, profile/settings
- [ ] **Phase 6: App Store Submission** - TestFlight, screenshots, review prep, submission

## Phase Details

### Phase 1: Foundation
**Goal**: Client can securely log in to the app and see a polished dark-themed shell with tab navigation -- the authenticated skeleton that every subsequent feature plugs into
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, DSGN-01, DSGN-02, DSGN-03, DSGN-04, STOR-01
**Success Criteria** (what must be TRUE):
  1. Client can log in with their existing alphaagent.io email and password and land on a tabbed home screen
  2. Client can unlock the app with Face ID or Touch ID after initial login, with device passcode as fallback
  3. App displays a blur overlay when backgrounded and requires biometric re-authentication on return
  4. Session persists across app kills and relaunches without requiring re-login
  5. All screens use the dark-first design system with consistent color tokens, typography, and haptic feedback
**Plans**: 3 plans in 3 waves (sequential)

Plans:
- [x] 01-01-PLAN.md — Xcode project skeleton, SPM dependencies, folder structure, Info.plist
- [x] 01-02-PLAN.md — Supabase auth, Keychain session persistence, Face ID biometric gating, login screen, password reset, privacy blur, sign out
- [x] 01-03-PLAN.md — Dark design system, Inter font, haptics, glass effects, floating pill tab bar, role-based tab navigation, PrivacyInfo.xcprivacy

### Phase 2: Core Value
**Goal**: Client can check their wallet balance, view billing history, see key business metrics, browse campaign spend charts, and access their leads pipeline -- the daily-use features that justify installing the app
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06
**Success Criteria** (what must be TRUE):
  1. Client sees their wallet balance, tracked ad spend, and total deposits prominently on the dashboard
  2. Client sees key metrics (leads count, cost-per-lead, total ad spend) and a 30-day ad spend sparkline
  3. Client can browse their full billing history grouped by month, filter by type (All/Ad Spend/Management), and tap any transaction for details
  4. Client can see their payment methods on file (card brand, last 4, expiry) with a link to manage them on the web
  5. Dashboard loads with skeleton states on first load and supports pull-to-refresh with haptic feedback
**Plans**: 4 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md — Data layer: Codable models, DataManager, formatters, shared components (shimmer, status pill, metric card)
- [x] 02-02-PLAN.md — Dashboard top: wallet hero card, welcome greeting, quick-link pills, business results section
- [x] 02-03-PLAN.md — Billing screen: transaction list, month grouping, filters, status badges, detail sheet, payment methods
- [x] 02-04-PLAN.md — Dashboard bottom: campaign spend chart, cost metrics grid, leads pipeline list, lead detail sheet

### Phase 3: Communication
**Goal**: Client can have real-time conversations with support and receive push notifications for important events -- the features that make the app sticky
**Depends on**: Phase 2
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, PUSH-01, PUSH-02, PUSH-03, PUSH-04, PUSH-05, PUSH-06
**Success Criteria** (what must be TRUE):
  1. Client can send and receive messages in real time with proper bubble styling (client blue/right, admin gray/left)
  2. Client sees typing indicators, read receipts, and a business hours banner in the chat
  3. Client can send image and file attachments in chat and see link previews for URLs
  4. Client receives push notifications for new chat messages, payment reminders, low wallet balance, and new course content
  5. Tapping a push notification opens the app directly to the relevant screen (deep linking)
**Plans**: TBD

Plans:
- [ ] 03-01: RealtimeManager lifecycle, chat UI (bubbles, typing, read receipts, business hours)
- [ ] 03-02: Chat attachments (image/file upload via Supabase Storage) and link previews
- [ ] 03-03: APNs setup, PushNotificationManager, notification types, deep link routing, badge management

### Phase 4: Learning & Activation
**Goal**: Client can watch course videos, complete onboarding tasks, and sign their agreement -- the activation features that drive long-term engagement and new client setup
**Depends on**: Phase 3
**Requirements**: CRSE-01, CRSE-02, CRSE-03, CRSE-04, CRSE-05, CRSE-06, CRSE-07, ONBD-01, ONBD-02, ONBD-03, AGMT-01, AGMT-02, AGMT-03, AGMT-04, AGMT-05
**Success Criteria** (what must be TRUE):
  1. Client can browse available courses, enroll, and watch video lessons in a native player with Picture-in-Picture
  2. Client can resume a lesson exactly where they left off, navigate between chapters, and see completion progress
  3. Client sees a progressive onboarding checklist with a progress ring, and tapping each task navigates to the relevant screen
  4. Client can read the full agreement, check key terms, verify identity via email OTP, and sign with either a drawn or typed signature
  5. Client sees a celebration animation with haptic feedback when all onboarding tasks are complete
**Plans**: TBD

Plans:
- [ ] 04-01: Course browser, enrollment, native AVKit video player (PiP, progress resume, chapter navigation)
- [ ] 04-02: Lesson completion marking, downloadable resources
- [ ] 04-03: Onboarding checklist with progress ring, deep links, completion celebration
- [ ] 04-04: Agreement signing -- scrollable text, key terms, OTP verification, PencilKit signature canvas, typed alternative

### Phase 5: Growth & Polish
**Goal**: Client can share their referral link, see referral status, view leads, manage their profile, and glance at key data from home screen widgets -- the growth and personalization features
**Depends on**: Phase 4
**Requirements**: REFR-01, REFR-02, REFR-03, REFR-04, WDGT-01, WDGT-02, LEAD-01, LEAD-02, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. Client can view their referral dashboard showing referred clients, status, and reward amounts
  2. Client can share their referral link via the native iOS share sheet with a pre-populated message, or copy it to clipboard with haptic feedback
  3. Client can see their incoming leads list with name, date, delivery status, and a daily trend indicator
  4. Client can view and edit their profile (name, phone, email, photo) and manage settings (Face ID toggle, notifications, theme)
  5. Client can add a wallet balance widget and an unread messages widget to their iPhone home screen
**Plans**: TBD

Plans:
- [ ] 05-01: Referral dashboard, share sheet, copy link, pre-populated share text
- [ ] 05-02: Leads list view with daily trend indicator
- [ ] 05-03: Profile view/edit and settings screen (Face ID toggle, notifications, theme, sign out)
- [ ] 05-04: WidgetKit home screen widgets (wallet balance, unread messages) with App Groups

### Phase 6: App Store Submission
**Goal**: App is published on the Apple App Store and available for clients to download
**Depends on**: Phase 5
**Requirements**: STOR-02, STOR-03, STOR-04, STOR-05, STOR-06
**Success Criteria** (what must be TRUE):
  1. Privacy policy is live at a public URL and PrivacyInfo.xcprivacy manifest is validated with all required API reason declarations
  2. App Store screenshots are captured for both 6.7-inch and 6.1-inch display sizes
  3. A demo account with pre-populated data (wallet balance, billing history, chat messages, course progress, referrals) is ready for Apple Review
  4. App is distributed via TestFlight to internal testers and all critical flows are verified on physical devices
  5. App is submitted to App Store with review notes explaining the external billing model and real-world services
**Plans**: TBD

Plans:
- [ ] 06-01: Privacy policy, PrivacyInfo.xcprivacy validation, App Privacy Labels
- [ ] 06-02: TestFlight distribution, QA on physical devices
- [ ] 06-03: Screenshots, demo account, App Store metadata, review notes, submission

## Progress

**Execution Order:**
Phases execute in numeric order: 1 > 2 > 3 > 4 > 5 > 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-05 |
| 2. Core Value | 4/4 | Complete | 2026-03-06 |
| 3. Communication | 0/3 | Not started | - |
| 4. Learning & Activation | 0/4 | Not started | - |
| 5. Growth & Polish | 0/4 | Not started | - |
| 6. App Store Submission | 0/3 | Not started | - |
