# Technology Stack

**Analysis Date:** 2026-03-12

## Languages

**Primary:**
- TypeScript 5.8.3 - Frontend (React app in `src/`) and all Supabase edge functions
- Swift (latest Xcode-compatible) - iOS app in `AlphaHub/`

**Secondary:**
- SQL - Supabase migrations in `supabase/migrations/`
- JavaScript (config files only) - `eslint.config.js`, `postcss.config.js`

## Runtime

**Frontend:**
- Node.js (no `.nvmrc` detected; managed by Vite dev server)
- Browser target: ES2020

**Edge Functions:**
- Deno (Supabase managed runtime) — functions import from `https://esm.sh/`, `https://deno.land/std@0.168.0/`, or `npm:` prefix
- Two import styles in use: older `serve` from `deno.land/std@0.168.0/http/server.ts` and newer `Deno.serve()` directly

**iOS:**
- SwiftUI + Observation framework (`@Observable` macro — requires iOS 17+)

## Package Manager

**Frontend:**
- npm (lockfile: `package-lock.json` present)
- bun.lockb also present (legacy artifact, npm is authoritative)

**iOS:**
- Swift Package Manager (Xcode-native; packages declared in `AlphaHub.xcodeproj/project.pbxproj`)

## Frameworks

**Core Frontend:**
- React 18.3.1 — UI rendering
- Vite 5.4.19 — build tool and dev server (config: `vite.config.ts`)
- React Router DOM 6.30.1 — client-side routing with SPA rewrite via `vercel.json`

**UI Component System:**
- shadcn/ui (not a package — components live in `src/components/ui/`) built on Radix UI primitives
- All 25+ Radix UI packages are pinned (accordion, dialog, dropdown, popover, select, tabs, tooltip, etc.)
- Tailwind CSS 3.4.17 — utility-first styles (config: `tailwind.config.ts`)
- Framer Motion 12.23.26 — animations

**Data & Forms:**
- TanStack React Query 5.83.0 — all server state, data fetching, caching
- React Hook Form 7.61.1 + Zod 3.25.76 + `@hookform/resolvers` — form validation

**Data Visualization:**
- Recharts 2.15.4 — billing and ad spend charts

**Other Frontend:**
- date-fns 3.6.0 — date formatting
- lucide-react 0.462.0 — icons
- sonner 1.7.4 — toast notifications
- jsPDF 2.5.2 — PDF generation (invoices)
- canvas-confetti 1.9.4 — celebration animation (onboarding)
- hls.js 1.6.15 — HLS video streaming
- react-signature-canvas 1.0.7 — agreement signing
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities — drag-and-drop
- react-resizable-panels 2.1.9 — resizable layout panels
- input-otp 1.4.2 — OTP input for auth
- embla-carousel-react 8.6.0 — carousels
- next-themes 0.3.0 — dark/light mode
- react-helmet-async 2.0.5 — document head management
- vaul 0.9.9 — drawer/bottom sheet
- cmdk 1.1.1 — command palette
- crypto-js 4.2.0 — client-side encryption utilities
- react-plaid-link 4.1.1 — Plaid Link UI widget (bank connection flows)

**Stripe Frontend:**
- @stripe/react-stripe-js 5.6.0 + @stripe/stripe-js 8.7.0 — payment element, card collection
- Publishable keys fetched dynamically via `get-stripe-config` edge function at runtime

**iOS:**
- SwiftUI — declarative UI
- supabase-swift (via SPM from `github.com/supabase/supabase-swift`) — auth, database, realtime, storage

**Build/Dev:**
- @vitejs/plugin-react-swc 3.11.0 — SWC-based React transforms (fast builds)
- lovable-tagger 1.1.13 — Lovable.dev development tagging (dev-only via componentTagger)
- typescript-eslint 8.38.0 — TypeScript linting
- eslint 9.32.0 + eslint-plugin-react-hooks + eslint-plugin-react-refresh
- postcss 8.5.6 + autoprefixer 10.4.21
- @tailwindcss/typography 0.5.16 — prose styling

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.87.1 — database, auth, storage, realtime, edge function invocation
- `@tanstack/react-query` 5.83.0 — all data fetching; removing this would require rebuilding every hook in `src/hooks/`
- `react-router-dom` 6.30.1 — routing; all page components rely on this
- `zod` 3.25.76 — form validation schemas throughout the app

**Infrastructure:**
- Deno standard library `0.168.0` — used in older edge functions
- `npm:@supabase/supabase-js@2.87.1` — used in newer edge functions (Deno npm imports)
- `https://esm.sh/@supabase/supabase-js@2` — used in most edge functions
- `https://esm.sh/resend@2.0.0` — email SDK in `send-auth-email` and `send-password-reset`

## Configuration

**Environment (Frontend):**
- `.env` file (gitignored) with:
  - `VITE_SUPABASE_URL="https://qcunascacayiiuufjtaq.supabase.co"`
  - `VITE_SUPABASE_PROJECT_ID="qcunascacayiiuufjtaq"`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>`
- Stripe publishable keys are NOT in env — fetched at runtime via `get-stripe-config` edge function

**Environment (Edge Functions):**
- Set via Supabase secrets: `supabase secrets set KEY="value" --project-ref qcunascacayiiuufjtaq`
- Key secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
  `STRIPE_MANAGEMENT_SECRET_KEY`, `STRIPE_MANAGEMENT_WEBHOOK_SECRET`,
  `STRIPE_AD_SPEND_SECRET_KEY`, `STRIPE_AD_SPEND_WEBHOOK_SECRET`,
  `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_REDIRECT_URI`, `ENCRYPTION_KEY`,
  `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`,
  `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_MCC_CUSTOMER_ID`,
  `MASTER_TWILIO_ACCOUNT_SID`, `MASTER_TWILIO_AUTH_TOKEN`,
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`,
  `RESEND_API_KEY`, `LLM_API_KEY`,
  `SLACK_ADS_MANAGER_WEBHOOK_URL`, `SLACK_ADS_MANAGER_SIGNING_SECRET`,
  `SLACK_CHAT_WEBHOOK_URL`, `MCP_PROXY_SECRET`,
  `WEBFLOW_API_TOKEN`, `WEBFLOW_SITE_ID`,
  `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`,
  `FATHOM_API_KEY`

**Build:**
- `vite.config.ts` — aliases `@/` to `./src/`, manual chunk splitting for recharts/pdf/dnd/motion
- `tsconfig.app.json` — ES2020 target, `strict: false`, `@/*` path alias
- `vercel.json` — single SPA rewrite rule: all paths → `/index.html`
- `tailwind.config.ts` — dark mode via class, custom sidebar/alert/success color tokens
- `components.json` — shadcn/ui CLI config (not shown but present by inference from `components/ui/`)

## Platform Requirements

**Development:**
- Node.js + npm for frontend
- Supabase CLI for edge function deploy: `supabase functions deploy <name> --project-ref qcunascacayiiuufjtaq`
- Xcode for iOS builds

**Production:**
- Frontend: Vercel (auto-deploy from `main` branch on `itsforren/alphahub`)
  - Note: GitHub webhook is broken — Vercel deploy must be triggered manually via API
  - Vercel project ID: `prj_qjsttH6tKyeHt4uJSflL23CmBNF0`
- Edge Functions: Supabase managed Deno runtime (project `qcunascacayiiuufjtaq`)
- Database: Supabase PostgreSQL with pg_cron for scheduled jobs (jobids 17, 18, 19 = hourly Stripe syncs)
- iOS: App Store distribution (not confirmed, but standard SwiftUI app structure)

---

*Stack analysis: 2026-03-12*
