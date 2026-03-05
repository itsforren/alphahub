# Phase 1: Foundation - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Xcode project setup, Supabase auth with biometric security, dark-first design system, and tab navigation shell. Client can securely log in and see a polished dark-themed app with tab navigation — the authenticated skeleton that every subsequent feature plugs into. Dual-mode: admin and client users see different tab structures.

</domain>

<decisions>
## Implementation Decisions

### Login & auth flow
- Centered minimal login screen — logo, email/password fields, sign-in button
- Animated 3D particle/data-point background on login screen — flowing points that feel futuristic but elegant (Tesla-inspired, black and white)
- Face ID always on — required on every app open, no opt-in prompt needed
- Inline field-level error messages for login failures (red text below the failed field)
- In-app password reset flow (email input -> magic link or OTP -> reset password, all native)

### Design system direction
- Pure black base with liquid glass effects (Apple-style translucency, blur, light refraction)
- Black and white core palette — white accents on black, stark and clean like Tesla
- Neon accent pops on highlights for modern feel (exact color TBD, white for initial build)
- Liquid glass cards — translucent with blur and light refraction effects
- Custom geometric sans-serif typography (e.g., Inter, Outfit, or Satoshi) — distinctive brand feel
- Smooth, spring-based animations — elegant and deliberate, Apple-style fluid motion
- Rich and frequent haptic feedback — tactile on most interactions (taps, swipes, transitions, toggles)
- Large, bold hero numbers for financial data — data is the star of the screen
- Circular progress rings and gauge elements for visual data display
- **Design references:** Robinhood (bold, data-forward), finance banking app with glass cards and big white numbers, solar monitoring app with neon accents and dark cards

### Tab navigation structure
- **Client tabs (5):** Home (stats/ROI), Wallet (financial hub), Chat, Courses, More (profile/settings/referrals)
- **Admin tabs (4):** Dashboard, Clients, Chat, More (analytics and campaigns nest inside Dashboard or More later)
- Role detection at login — show different tab set based on admin vs client role
- Default landing tab: Home (stats/ROI)
- Floating pill tab bar with glass effect — rounded, hovering above bottom edge, matches liquid glass theme
- Icons + text labels on tabs

### Privacy & security UX
- Full gaussian blur overlay when app is backgrounded — completely obscures all financial data
- 30-second grace period for biometric re-auth — quick app switches (under 30s) skip Face ID
- Device passcode as fallback if Face ID fails 3 times (standard iOS pattern)
- Sessions never expire — biometric is the only gate, user only re-logs-in on explicit sign out

### Claude's Discretion
- Exact particle animation implementation for login background
- Specific geometric font selection (Inter vs Outfit vs Satoshi)
- Loading skeleton designs
- Error state handling patterns
- Exact spacing, padding, and component sizing
- Admin tab placeholder screen designs
- Haptic feedback intensity per interaction type (light vs medium vs heavy)

</decisions>

<specifics>
## Specific Ideas

- "I want it to feel like Tesla — black and white, futuristic but elegant"
- "Modern and bold like Robinhood"
- Login background: 3D data points flowing/moving — futuristic, elegant, not distracting
- Liquid glass more than frosted glass — Apple's liquid glass direction
- "Neon on the highlights to make it feel modern"
- Financial numbers should be large, bold, hero-level — data is the star
- Reference images provided: dark finance app with glass cards and $25,999 hero numbers, solar monitoring app with neon yellow-green accents and circular gauges
- Admin view should match the web UI pattern: see all clients, click into client detail with wallet/billing/leads/links all on one page

</specifics>

<deferred>
## Deferred Ideas

**Admin features (future phases):**
- Client list + client detail view (wallet, billing, performance, leads, links on one page)
- CEO overview dashboard (total revenue MTD, profit MTD, management fees, ad spend)
- Internal sales dashboard
- Engine room dashboard
- AI co-pilot dashboard
- Client success dashboard
- Volume leaders / agent leaderboards (issued, paid premiums, etc.)
- Watchtower — alert center for anything going wrong
- Analytics tab with multiple cycled dashboard pages
- Ads command center (manage/oversee ad campaigns)
- Team chat (admin internal) + customer chat (admin view of all client chats)
- Admin billing management (active/canceled status, adjustments)
- Client onboarding Q&A process view

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-05*
