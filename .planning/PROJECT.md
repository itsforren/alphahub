# Alpha Agent — iOS App

## What This Is

A native Swift iOS app that gives Alpha Hub clients (insurance agents) full access to their portal on iPhone. Dashboard, billing, wallet, real-time chat, courses, referrals, onboarding, and agreement signing — all connected to the existing Supabase backend. Dark & bold design aesthetic, premium feel, App Store published.

## Core Value

Clients can manage their entire Alpha Hub experience from their phone — check wallet balance, chat with support, watch course videos, and track referrals — with the same data they see on the web, in real time.

## Requirements

### Validated

The backend already supports all of these via Supabase tables + 110+ edge functions:

- ✓ Supabase Auth (email/password, session management) — existing
- ✓ Client profiles and role-based access — existing
- ✓ Billing records, wallet transactions, payment methods (dual Stripe) — existing
- ✓ Real-time chat (chat_messages table) — existing
- ✓ Courses, enrollments, lesson progress — existing
- ✓ Referral codes and tracking — existing
- ✓ Onboarding tasks and checklist — existing
- ✓ Agreement signing with OTP verification — existing
- ✓ Push notification infrastructure (Supabase Realtime) — existing

### Active

- [ ] Native Swift iOS app with SwiftUI
- [ ] Dark & bold design system (Tesla/Coinbase aesthetic)
- [ ] Supabase Auth integration with Face ID / Touch ID
- [ ] Dashboard: wallet balance, key stats, upcoming payments
- [ ] Billing: records table, payment methods, wallet balance & runway
- [ ] Real-time chat with support team
- [ ] Courses: browse, enroll, watch video lessons, track progress
- [ ] Referrals: view code, share link, track commissions
- [ ] Onboarding: task checklist with completion tracking
- [ ] Agreement signing with OTP verification
- [ ] Profile & settings management
- [ ] Push notifications: chat messages, billing events, onboarding updates
- [ ] Apple App Store submission and approval
- [ ] Apple Developer account setup

### Out of Scope

- Admin portal on mobile — deferred to v2 (client portal is the priority, admin is desktop-first)
- Android app — deferred to future milestone (iOS first, then cross-platform strategy)
- Offline mode — online only for v1 (simpler, data always fresh)
- Campaign management on mobile — admin feature, not client-facing
- Lead routing/delivery — backend-only, no mobile UI needed
- Google Ads integration UI — admin feature
- Community feed — low priority for v1, can add in update
- Magic link auth — email/password + biometric is sufficient

## Context

- **Existing backend**: Supabase project `qcunascacayiiuufjtaq` with 110+ edge functions, dual Stripe accounts, GHL/Google Ads integrations
- **Web app**: React + TypeScript at alphaagent.io (Vercel), serves as the reference implementation
- **Users**: Insurance agents who are Alpha Hub clients — they use the platform to manage their lead generation, billing, and business growth
- **Supabase Swift SDK**: Official SDK exists for auth, database, realtime, storage — key enabler for native Swift
- **Real-time sync**: Supabase Realtime subscriptions ensure mobile and web show the same data
- **App Store experience**: First submission — process, guidelines, and review requirements need research
- **Design direction**: Dark & bold like Tesla app, Coinbase — strong visual identity, premium data-rich UI

## Constraints

- **Tech stack**: Native Swift + SwiftUI — user wants best possible iOS experience, no cross-platform frameworks
- **Backend**: Must use existing Supabase backend (no new backend) — edge functions, tables, auth all shared with web
- **Stripe**: Dual account setup (management + ad_spend) — iOS app reads billing data, doesn't process payments directly
- **Apple guidelines**: Must comply with App Store Review Guidelines (no web-view wrapping, proper native UI)
- **Auth**: Must share Supabase Auth with web app — same credentials, same sessions
- **Minimum iOS version**: Research needed (likely iOS 16+ for latest SwiftUI features)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Native Swift over React Native | User prioritizes best iOS experience; Android comes later with its own strategy | — Pending (research will validate) |
| Client portal only for v1 | Gets to App Store faster; admin is desktop-first workflow | — Pending |
| Online only (no offline) | Simpler architecture, data always fresh, avoids sync complexity | — Pending |
| Dark & bold design | User preference — Tesla/Coinbase aesthetic, premium feel | — Pending |
| Supabase Swift SDK for backend | Official SDK, supports auth + realtime + database — avoids custom API layer | — Pending |

---
*Last updated: 2025-03-05 after initialization*
