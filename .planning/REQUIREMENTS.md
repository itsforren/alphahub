# Requirements: Alpha Agent iOS App

**Defined:** 2025-03-05
**Core Value:** Clients can manage their entire Alpha Hub experience from their phone -- wallet, chat, courses, referrals -- with real-time sync to the web app.

## v1 Requirements

### Authentication & Security

- [x] **AUTH-01**: Client can log in with existing email/password (Supabase Auth)
- [x] **AUTH-02**: Client can unlock app with Face ID / Touch ID after initial login
- [x] **AUTH-03**: App falls back to device passcode when biometrics fail
- [x] **AUTH-04**: App shows blur overlay when entering background (protects financial data)
- [x] **AUTH-05**: Session persists across app launches (Keychain storage)
- [x] **AUTH-06**: Client can sign out from any screen

### Dashboard

- [x] **DASH-01**: Wallet balance hero card showing remaining balance, tracked spend, total deposits
- [x] **DASH-02**: Key metrics cards -- leads count, cost-per-lead, total ad spend
- [x] **DASH-03**: Daily ad spend sparkline chart (last 30 days, mobile-optimized)
- [x] **DASH-04**: Upcoming payment indicator with due date and amount
- [x] **DASH-05**: Quick action navigation buttons (Chat, Courses, Billing, Referrals)
- [x] **DASH-06**: Pull-to-refresh with haptic feedback on completion
- [x] **DASH-07**: Skeleton loading states on first load

### Leads

- [ ] **LEAD-01**: View incoming leads list with name, date, and delivery status
- [ ] **LEAD-02**: Lead count and daily trend indicator

### Billing & Wallet

- [x] **BILL-01**: Transaction list grouped by month (scrollable)
- [x] **BILL-02**: Filter by type -- All / Ad Spend / Management (segmented control)
- [x] **BILL-03**: Status badges on each record (paid, pending, overdue)
- [x] **BILL-04**: Payment method cards displayed (view-only -- card brand, last 4, expiry)
- [x] **BILL-05**: Transaction detail bottom sheet on tap
- [x] **BILL-06**: "Manage payment methods on alphaagent.io" link

### Real-Time Chat

- [ ] **CHAT-01**: Message bubbles -- client (blue, right), admin (gray, left) with avatars
- [ ] **CHAT-02**: Real-time message delivery via Supabase Realtime
- [ ] **CHAT-03**: Unread message badge on Chat tab
- [ ] **CHAT-04**: Business hours indicator banner
- [ ] **CHAT-05**: Send image/file attachments via Supabase Storage
- [ ] **CHAT-06**: Read receipts (double-check or "Read" text)
- [ ] **CHAT-07**: Typing indicator (animated dots when admin is typing)
- [ ] **CHAT-08**: Link previews (Open Graph metadata card)

### Courses & Learning

- [ ] **CRSE-01**: Course browser -- browse and enroll in available courses
- [ ] **CRSE-02**: Native video player (AVKit) for lessons
- [ ] **CRSE-03**: Picture-in-Picture video playback
- [ ] **CRSE-04**: Progress tracking -- resume exactly where client left off
- [ ] **CRSE-05**: Chapter/module navigation sidebar or bottom sheet
- [ ] **CRSE-06**: Lesson completion marking (manual + auto at 90% progress)
- [ ] **CRSE-07**: Downloadable lesson resources (PDFs, attachments)

### Onboarding

- [ ] **ONBD-01**: Progressive onboarding checklist with progress ring
- [ ] **ONBD-02**: Deep link from each task to the relevant screen
- [ ] **ONBD-03**: Celebration animation + haptic on all tasks complete

### Agreement Signing

- [ ] **AGMT-01**: Scrollable agreement text with scroll-to-bottom tracking
- [ ] **AGMT-02**: Key terms checkboxes for explicit consent
- [ ] **AGMT-03**: Email OTP verification with iOS auto-fill (.oneTimeCode)
- [ ] **AGMT-04**: Signature drawing canvas (PencilKit)
- [ ] **AGMT-05**: Typed signature alternative (script font preview)

### Referrals

- [ ] **REFR-01**: Referral dashboard -- referred clients, status (pending/active), reward amount
- [ ] **REFR-02**: Native iOS share sheet for referral link
- [ ] **REFR-03**: Copy referral link to clipboard with haptic feedback
- [ ] **REFR-04**: Pre-populated share text template

### Push Notifications

- [ ] **PUSH-01**: New chat message notification (with "Reply" action)
- [ ] **PUSH-02**: Payment due reminder notification
- [ ] **PUSH-03**: Low wallet balance alert notification
- [ ] **PUSH-04**: Course new content notification
- [ ] **PUSH-05**: Notification grouping by type (chat, billing, courses)
- [ ] **PUSH-06**: App icon badge count management

### Profile & Settings

- [ ] **PROF-01**: View and edit profile (name, phone, email, photo)
- [ ] **PROF-02**: Settings -- Face ID toggle, notification preferences, theme (System/Dark/Light)
- [ ] **PROF-03**: Sign out button

### Design System

- [x] **DSGN-01**: Dark-first design system -- near-black backgrounds, elevated surfaces, bold accent colors
- [x] **DSGN-02**: Haptic feedback throughout -- taps, pull-to-refresh, success/error states
- [x] **DSGN-03**: OLED-optimized dark theme (true black where appropriate)
- [x] **DSGN-04**: Consistent typography, spacing, and color tokens

### Widgets

- [ ] **WDGT-01**: Home screen widget -- wallet balance (small + medium sizes)
- [ ] **WDGT-02**: Home screen widget -- unread messages count with last message preview

### App Store

- [ ] **STOR-01**: Apple Developer account enrolled and configured
- [ ] **STOR-02**: Privacy policy page + PrivacyInfo.xcprivacy manifest
- [ ] **STOR-03**: App Store screenshots (6.7" and 6.1" displays)
- [ ] **STOR-04**: Demo account with pre-populated data for App Review
- [ ] **STOR-05**: TestFlight beta distribution to internal testers
- [ ] **STOR-06**: App Store submission with review notes explaining real-world services

## v2 Requirements

### Admin Companion

- **ADMN-01**: Client overview list with status and key metrics
- **ADMN-02**: Quick client stats (wallet balance, lead count)
- **ADMN-03**: Chat inbox -- respond to client messages
- **ADMN-04**: Alert notifications for system issues

### Payment Management

- **PYMT-01**: Client can add new payment method (Stripe) in-app
- **PYMT-02**: Client can update default payment method
- **PYMT-03**: Client can remove saved payment method

### Advanced Features

- **ADVN-01**: Universal Links for referral deep linking (requires AASA server config)
- **ADVN-02**: Spotlight search integration (courses, billing records)
- **ADVN-03**: Lock screen widgets (iOS 16+)
- **ADVN-04**: Offline caching of dashboard data
- **ADVN-05**: iPad-optimized layout

### Android

- **ANDR-01**: Android app with feature parity to iOS v1

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app Stripe payment processing | Launch with view-only; add in v2 after App Store approval established |
| Admin portal on mobile | Admin workflow is desktop-first; separate companion app in v2 |
| Android app | iOS first; Android is a future milestone |
| Offline mode | Online-only for v1; simpler architecture, data always fresh |
| Complex data charts | Mobile screens too small; use sparklines + numbers; full charts on web |
| Community feed | Low daily usage; can add in post-launch update |
| Apple Watch companion | Very low demand for this use case |
| iPad-specific layouts | iPhone-first; iPad uses scaled iPhone layout for now |
| Custom notification sounds | Unprofessional; use default iOS notification sound |
| Real-time for non-chat data | Battery drain; only chat uses WebSocket; everything else fetches on load |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| DASH-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| DASH-03 | Phase 2 | Complete |
| DASH-04 | Phase 2 | Complete |
| DASH-05 | Phase 2 | Complete |
| DASH-06 | Phase 2 | Complete |
| DASH-07 | Phase 2 | Complete |
| LEAD-01 | Phase 5 | Pending |
| LEAD-02 | Phase 5 | Pending |
| BILL-01 | Phase 2 | Complete |
| BILL-02 | Phase 2 | Complete |
| BILL-03 | Phase 2 | Complete |
| BILL-04 | Phase 2 | Complete |
| BILL-05 | Phase 2 | Complete |
| BILL-06 | Phase 2 | Complete |
| CHAT-01 | Phase 3 | Pending |
| CHAT-02 | Phase 3 | Pending |
| CHAT-03 | Phase 3 | Pending |
| CHAT-04 | Phase 3 | Pending |
| CHAT-05 | Phase 3 | Pending |
| CHAT-06 | Phase 3 | Pending |
| CHAT-07 | Phase 3 | Pending |
| CHAT-08 | Phase 3 | Pending |
| CRSE-01 | Phase 4 | Pending |
| CRSE-02 | Phase 4 | Pending |
| CRSE-03 | Phase 4 | Pending |
| CRSE-04 | Phase 4 | Pending |
| CRSE-05 | Phase 4 | Pending |
| CRSE-06 | Phase 4 | Pending |
| CRSE-07 | Phase 4 | Pending |
| ONBD-01 | Phase 4 | Pending |
| ONBD-02 | Phase 4 | Pending |
| ONBD-03 | Phase 4 | Pending |
| AGMT-01 | Phase 4 | Pending |
| AGMT-02 | Phase 4 | Pending |
| AGMT-03 | Phase 4 | Pending |
| AGMT-04 | Phase 4 | Pending |
| AGMT-05 | Phase 4 | Pending |
| REFR-01 | Phase 5 | Pending |
| REFR-02 | Phase 5 | Pending |
| REFR-03 | Phase 5 | Pending |
| REFR-04 | Phase 5 | Pending |
| PUSH-01 | Phase 3 | Pending |
| PUSH-02 | Phase 3 | Pending |
| PUSH-03 | Phase 3 | Pending |
| PUSH-04 | Phase 3 | Pending |
| PUSH-05 | Phase 3 | Pending |
| PUSH-06 | Phase 3 | Pending |
| PROF-01 | Phase 5 | Pending |
| PROF-02 | Phase 5 | Pending |
| PROF-03 | Phase 5 | Pending |
| DSGN-01 | Phase 1 | Complete |
| DSGN-02 | Phase 1 | Complete |
| DSGN-03 | Phase 1 | Complete |
| DSGN-04 | Phase 1 | Complete |
| WDGT-01 | Phase 5 | Pending |
| WDGT-02 | Phase 5 | Pending |
| STOR-01 | Phase 1 | Complete |
| STOR-02 | Phase 6 | Pending |
| STOR-03 | Phase 6 | Pending |
| STOR-04 | Phase 6 | Pending |
| STOR-05 | Phase 6 | Pending |
| STOR-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 69 total
- Mapped to phases: 69
- Unmapped: 0

---
*Requirements defined: 2025-03-05*
*Last updated: 2026-03-05 after roadmap creation (traceability populated)*
