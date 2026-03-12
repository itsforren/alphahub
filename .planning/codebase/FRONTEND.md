# Alpha Hub — Frontend Features Reference

> Complete reference for all pages, components, hooks, navigation, authentication, and the iOS app.

## Architecture

- **Framework:** Vite + React 18 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (53 components) + Framer Motion
- **State:** TanStack React Query (server state) + React Context (auth, calculator, notifications, client preview)
- **Routing:** React Router with lazy loading + protected routes
- **Real-time:** Supabase real-time subscriptions (chat, tickets, campaigns)
- **Icons:** lucide-react
- **Toasts:** sonner
- **Charts:** Recharts (via shadcn chart component)

## Navigation Structure

### Sidebar (AgentHubLayout.tsx)

**Client Sections:**
- My Portal (Dashboard)
- My Business → Referrals
- Learn → Courses, Community
- Support → Chat with Team, Support Tickets

**Admin-Only Sections:**
- Operations → All Clients, Command Center, Chat, Billing
- Growth → Sales, Analytics
- Admin → Courses, Settings

### Route Redirect Logic
- `/hub` → `/hub/admin/clients` for admins
- `/hub` → Client's own detail page for clients

## All Pages

### Public Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Index.tsx | Homepage with hero, ROI calculator, testimonials, CTAs |
| `/apply` | Apply.tsx | 7-step qualification form (contact → license → states → budget → timeline → bottleneck → source) |
| `/book-call` | BookCall.tsx | Schedule sales call |
| `/schedule-onboarding` | ScheduleOnboarding.tsx | Onboarding scheduling |
| `/admin` | Admin.tsx | Admin login |
| `/pricing` | Pricing.tsx | Pricing plans |
| `/partner` | Partner.tsx | Partner information |
| `/partner-pricing` | PartnerPricing.tsx | Partner pricing |
| `/book-partner-call` | BookPartnerCall.tsx | Schedule partner call |
| `/call-confirmed` | CallConfirmed.tsx | Call confirmation |
| `/welcome` | Welcome.tsx | Welcome onboarding |
| `/not-qualified-license` | NotQualifiedLicense.tsx | Disqualification (license) |
| `/not-qualified-budget` | NotQualifiedBudget.tsx | Disqualification (budget) |
| `/blog` | Blog.tsx | Blog listing |
| `/blog/:slug` | BlogPost.tsx | Individual blog post |
| `/about` | About.tsx | About page |
| `/privacy` | Privacy.tsx | Privacy policy |
| `/terms` | Terms.tsx | Terms of service |

### Auth Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/auth/login` | Login.tsx | Email verify → login/signup → MFA → password setup |
| `/auth/forgot-password` | ForgotPassword.tsx | Password reset request |
| `/auth/reset-password` | ResetPassword.tsx | Password reset confirmation |

### Client Hub Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/hub` | Dashboard | Client portal home (redirects based on role) |
| `/hub/referrals` | Referrals.tsx | Referral program, earnings, sharing |
| `/hub/profile` | Profile.tsx | Profile management |
| `/hub/settings` | Settings.tsx | Notification preferences, MFA enrollment |
| `/hub/sign-agreement` | SignAgreement.tsx | 5-step agreement signing (OTP → info → review → terms → signature) |
| `/hub/chat` | Chat.tsx | Client chat interface |
| `/hub/support` | Support.tsx | Client support tickets |
| `/hub/courses` | Courses.tsx | Course catalog |
| `/hub/courses/:id` | CourseDetail.tsx | Course details |
| `/hub/courses/:id/lessons/:lessonId` | LessonView.tsx | Video lesson player |
| `/hub/community` | CommunityFeed.tsx | Community forum |

### Admin Hub Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/hub/admin/clients` | Clients.tsx | Client list with filters, search, bulk actions |
| `/hub/admin/clients/:id` | ClientDetail.tsx | **Central admin hub** — all client data |
| `/hub/admin/clients/archived` | ArchivedClients.tsx | Archived clients |
| `/hub/admin/command` | CommandCenter.tsx | Campaigns, lead routing, change log, settings |
| `/hub/admin/chat` | UnifiedChat.tsx | Client inbox + team chat + tickets (3 tabs) |
| `/hub/admin/TeamChat` | TeamChat.tsx | Internal team messaging |
| `/hub/admin/tickets` | TicketDashboard.tsx | Ticket management with SLA tracking |
| `/hub/admin/billing` | BillingDashboard.tsx | Stripe billing, payments, disputes |
| `/hub/admin/sales` | UnifiedSales.tsx | Kanban pipeline + attribution + partner referrals |
| `/hub/admin/analytics` | TVAnalytics.tsx | 8 TV screens (keyboard 1-8, F for fullscreen) |
| `/hub/admin/settings` | Settings.tsx | System configuration |

### TV Analytics Screens (Press 1-8, F for fullscreen)

| Key | Screen | Focus |
|-----|--------|-------|
| 1 | CEO Board | Financial KPIs only |
| 2 | Internal Sales | Agent acquisition pipeline |
| 3 | Engine Room | Client marketing operations |
| 4 | AI Autopilot | Intelligence system dashboard |
| 5 | Client Success | Outcome metrics |
| 6 | Agent Leaderboards | Competitive rankings |
| 7 | Watchtower | Operations & support health |
| 8 | Alert Center | Error/alert feed |

## Client Detail Page (Admin's Central Hub)

The admin client detail page (`/hub/admin/clients/:id`) is the most complex page, containing:

### Sections & Widgets:
- **Profile:** Avatar, name, email, phone, state, license status, package type
- **Agreement:** Signing status widget
- **Onboarding:** 18-step automation progress tracker
- **Billing:** BillingWidget, BillingRecordsTable, UpcomingPaymentsWidget, PaymentMethodCard
- **Wallet:** AdSpendWalletHorizontal, DailySpendChart, EditBudgetDialog
- **Leads:** LeadsWidget (pipeline: leads → booked calls → applications → issued → paid)
- **Performance:** HeroStatsCard, date range selector, CPL/CTR/CVR metrics
- **Campaigns:** CampaignPanel (dual-campaign, build, edit, sync, states)
- **Success Manager:** SuccessManagerCard, LeaderboardWidget
- **Support:** SupportTicketPanel, ChatPopup
- **Settings:** StateSelector, webhook config, GHL field mapping
- **Advanced:** Client preview mode, churn reason, archive/delete, admin notes

## Authentication & Authorization

### Auth System (AuthContext.tsx)
- **Provider:** Supabase Auth
- **Methods:** Email/password, TOTP MFA
- **Roles:** `admin` | `member` | `guest` | `client` | `referrer`

### Login Flow (Login.tsx)
1. Enter email → `check-client-email` edge function determines status
2. Not found → create account
3. Existing → enter password
4. Needs setup → set password
5. MFA challenge if enrolled
6. Blocking/quarantine check

### iOS Biometric Auth
- Face ID / Touch ID via BiometricManager
- Session persistence across app launches

### Protected Routes
- `ProtectedRoute` component enforces role-based access
- `useAuth()` hook provides: user, session, profile, role, MFA status, signIn/signUp/signOut

## Chat System

### Architecture
- **Admin view:** AdminChatView.tsx — timeline of messages + tickets
- **Client view:** ChatPopup.tsx — floating chat widget
- **Real-time:** Supabase real-time subscriptions via `useChatRealtime`
- **Infinite scroll:** Pagination for message history

### Features
- Text messages + file attachments
- Message deduplication (by message ID)
- Auto-mark read when viewed
- Link previews with metadata
- Business hours banner
- Convert chat to ticket
- Open ticket banner inline in chat
- Team chat (internal messaging)
- Attachment upload support

### Hooks
| Hook | Purpose |
|------|---------|
| `useChat` | Client-side messages and conversation |
| `useAdminChat` | Admin-side chat data with unread counts |
| `useChatRealtime` | Real-time subscription for new messages |
| `useUnreadCount` | Badge counts for navigation |

## Ticket System

### TicketDashboard.tsx Features
- **Status filters:** Open, In Progress, Waiting, Closed
- **Priority levels:** Low, Normal, High, Urgent
- **Categories:** Billing, Technical, Leads, Onboarding, Other
- **SLA tracking:** Deadline countdown with color indicators
- **Metrics card:** Open count, in-progress, awaiting response, overdue
- **Activity timeline:** Message history + audit trail
- **Image gallery:** Attachment and screenshot previews
- **Internal notes:** Admin-only notes on tickets
- **Assignment:** Support agent assignment
- **Formatted IDs:** TKT-0001 format

### Hooks
| Hook | Purpose |
|------|---------|
| `useTicketDashboard` | All tickets with filtering |
| `useTicketMetrics` | Ticket statistics |
| `useAssignTicket` | Assign to agent |
| `useUpdateTicket` | Update status/priority |
| `useTicketRealtime` | Real-time sync |

## Agreement Signing Flow

### SignAgreement.tsx — 5 Steps:
1. **Verify** — SMS OTP verification
2. **Info** — Personal info collection
3. **Review** — Agreement document viewer
4. **Terms** — Checkbox acceptance of key terms (accordion)
5. **Sign** — Signature canvas + initials capture

### Advanced Features:
- PDF generation with timestamp
- Session tracking (scroll position, focus time, device info, IP)
- CSRF token and session ID
- Full audit log of all actions
- Success animation with floating particles
- Disqualification paths for missing requirements

## Referral System

### For Clients:
- Referral code generation
- Copy-to-clipboard link + social sharing (Twitter, LinkedIn, Email, WhatsApp)
- Referral history table (status, date, reward)
- Reward tracking (Pending, Approved, Paid, Cancelled)
- Monthly earnings breakdown

### For Partners:
- Partner-specific referral code and link
- Partner statistics and earnings dashboard
- Partner reward history

### Hooks
| Hook | Purpose |
|------|---------|
| `useReferralCode` | Client referral code |
| `useReferralStats` | Statistics |
| `useReferralHistory` | Referred clients |
| `useRewardsHistory` | Reward tracking |
| `useReferralPartner` | Partner data |

## Sales Pipeline

### UnifiedSales.tsx — 3 Tabs:
1. **Sales Pipeline** — Kanban board for prospects (drag-and-drop stages)
2. **Attribution** — B2B lead attribution analytics (UTM, campaign, revenue)
3. **Referral Admin** — Partner referral management (commissions, approval)

### Components:
- SalesKanbanBoard.tsx — Prospect pipeline kanban
- ProspectCard.tsx, ProspectDetailModal.tsx — Prospect management
- DispositionModal.tsx — Lead disposition
- ClosedWonModal.tsx — Won deal tracking
- JourneyTimeline.tsx — Prospect journey visualization

## Notification Systems

1. **Toast Notifications** (Sonner) — Brief messages for actions
2. **Live Notifications** — Homepage popups with client social proof
3. **Browser Notifications** — Push notifications via BrowserNotificationProvider
4. **Banners** — Persistent messages (maintenance, campaign updates)
5. **NPS Popup** — Net Promoter Score survey popup

## All Hooks (62 Total)

### Client Management
`useClients`, `useClient`, `useClientByUserId`, `useClientByAgentId`, `useUpdateClient`, `useHardDeleteClient`

### Billing & Payments
`useBillingDashboard`, `useBillingRecords`, `useBillingTracker`, `useUpcomingPayments`, `usePaymentMethods`, `useComputedWalletBalance`, `useClientWallet`, `useClientCredits`

### Chat & Support
`useChat`, `useAdminChat`, `useChatRealtime`, `useUnreadCount`, `useChatSLAMetrics`

### Tickets
`useTicketDashboard`, `useAllTickets`, `useTicketMetrics`, `useAssignTicket`, `useUpdateTicket`, `useTicketRealtime`, `useTicketExtensions`

### Leads & Performance
`useLeadMetrics`, `useLeadStats`, `useLeads`, `useAccountWideMetrics`, `usePerformancePercentage`

### Campaigns
`useCampaigns`, `useCampaignCommandCenter`

### Referrals
`useReferralCode`, `useReferralStats`, `useReferralHistory`, `useRewardsHistory`, `useReferralPartner`, `usePartnerReferralCode`, `usePartnerReferralStats`

### Agreements
`useAgreement`, `useCreateAgreement`, `useSignAgreement`, `useUploadSignature`, `useUploadAgreementPdf`, `useAgreementOTP`, `useAuditLog`, `useAgreementTracking`

### Success & Operations
`useClientSuccessData`, `useOnboardingAutomation`, `useOnboardingChecklist`, `useOnboardingTasks`, `useClientSelfOnboarding`

### Analytics & Reports
`useCEOBoardData`, `useEngineRoomData`, `useInternalSalesData`, `useSalesPipeline`, `useWatchtowerData`, `useRedAlertData`

### Settings & Config
`usePortalSettings`, `useSLASettings`, `useSupportAgents`, `useSuccessManagerSettings`, `useSystemAlerts`, `useWebhookApiKeys`, `useCourseAnalytics`

### Integrations
`usePlaidLink`

## iOS App (AlphaHub/)

### Architecture
- SwiftUI native app
- Supabase Swift SDK backend
- Biometric auth (Face ID/Touch ID)
- Push notifications + deep linking
- Real-time data sync

### Features

| Feature | Screens |
|---------|---------|
| **Login** | Email/password, biometric setup, MFA |
| **Dashboard** | Welcome greeting, quick action pills, wallet hero, business results, campaign spend chart, cost metrics grid, leads pipeline |
| **Chat** | Chat list, chat view, input bar, image preview, link preview, date separators |
| **Leads** | Leads list with status, lead detail, filtering, metrics |
| **Billing** | Billing overview, payment history, invoice details, payment methods, wallet management |
| **Shell** | Tab navigation, floating action menu, bottom tab bar |

### Design System
- Spacing tokens (sm, md, lg, xl)
- Color theme (light/dark mode)
- Typography hierarchy
- Haptic feedback patterns

## Component Inventory

| Directory | Count | Examples |
|-----------|-------|---------|
| `src/components/portal/` | 57 | BillingWidget, CampaignPanel, ClientDetailView, LeadsWidget |
| `src/components/portal/chat/` | 12 | AdminChatView, ChatInput, ChatMessage, ChatPopup |
| `src/components/admin/` | 34+ | OnboardingAutomationWidget, DisputesWidget, SLASettingsWidget |
| `src/components/campaigns/` | 13 | CampaignCommandCenter, CampaignDetailModal, ProposalApprovalModal |
| `src/components/sales/` | 10 | SalesKanbanBoard, ProspectCard, ClosedWonModal |
| `src/components/hub/` | 6 | AgentHubLayout, MaintenanceBanner |
| `src/components/agreement/` | 4 | AgreementViewer, InitialsSection, KeyTermsAccordion |
| `src/components/auth/` | 4 | Login flow, MFA enrollment/verification |
| `src/components/tv/` | 24 | TV dashboard screen components |
| `src/components/attribution/` | 6 | CampaignDrilldown, lead attribution |
| `src/components/partner/` | 12 | Partner portal components |
| `src/components/ui/` | 53 | shadcn/ui component library |
| Homepage components | 20+ | HeroSection, ROICalculator, testimonials |

## Admin Settings Page

Comprehensive configuration:
- SLA & KPI Settings
- Performance Percentage (commission factor)
- Support Agents management
- Success Manager Defaults
- Portal Visibility toggles (per-feature flags)
- Webhook configuration
- Lead/Client Bulk Import
- Onboarding Settings
- Agreement Templates
- Prospect Field Mapping
- Enhanced Conversions setup
- GHL OAuth configuration
- Test Data Purge

---
*Generated: 2026-03-12*
