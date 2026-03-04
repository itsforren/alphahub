# Technology Stack

**Analysis Date:** 2025-03-04

## Languages

**Primary:**
- TypeScript 5.8.3 - All frontend code (`src/**/*.ts`, `src/**/*.tsx`) and edge functions (`supabase/functions/**/*.ts`)
- JavaScript - Used minimally in config files
- SQL - Supabase migrations and database operations

**Secondary:**
- Deno - Runtime for Supabase Edge Functions (uses ES modules)

## Runtime

**Frontend Environment:**
- Node.js v22.14.0 (development)
- Browser (modern ES2020+)

**Backend Environment:**
- Supabase Edge Functions (Deno 1.x)

**Package Manager:**
- npm 10.9.2 (primary)
- Lockfile: `package-lock.json` present
- Alternative: `bun.lockb` also present (Bun package manager compatible)

## Frameworks

**Core Frontend:**
- React 18.3.1 - UI library
- Vite 5.4.19 - Build tool and dev server (`vite.config.ts`)
- React Router DOM 6.30.1 - Client-side routing

**UI & Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework (`tailwind.config.ts`)
- Radix UI (full suite) - Unstyled, accessible component primitives
  - Dialog, Dropdown, Select, Tabs, Tooltip, Popover, etc. (25+ Radix components)
- Framer Motion 12.23.26 - Animation library
- Lucide React 0.462.0 - Icon library
- Tailwind Merge 2.6.0 - Intelligent Tailwind class merging
- Tailwind CSS Animate 1.0.7 - Animation utility classes

**Form & Validation:**
- React Hook Form 7.61.1 - Performant form management
- Zod 3.25.76 - TypeScript-first schema validation library
- @hookform/resolvers 3.10.0 - Form resolver integration layer

**Data Fetching & State:**
- TanStack React Query 5.83.0 - Server state management and caching
- @supabase/supabase-js 2.87.1 - Supabase JavaScript client

**Payments:**
- Stripe 8.7.0 (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
  - Stripe.js SDK for client-side payments
  - Stripe React integration for payment forms

**Banking Integration:**
- React Plaid Link 4.1.1 - Plaid embedded link widget

**Charts & Visualization:**
- Recharts 2.15.4 - React charting library

**UI Components & Utilities:**
- Sonner 1.7.4 - Toast notifications
- Canvas Confetti 1.9.4 - Confetti effects
- Input OTP 1.4.2 - OTP input component
- CMDk 1.1.1 - Command menu/palette component
- Embla Carousel React 8.6.0 - Carousel library
- React Resizable Panels 2.1.9 - Resizable panel layouts
- Vaul 0.9.9 - Drawer/sliding panel component
- React Signature Canvas 1.0.7 - Signature drawing

**Document Generation:**
- jsPDF 2.5.2 - PDF generation
- Canvas API integration for diagrams

**Utilities:**
- Date-fns 3.6.0 - Date manipulation
- CryptoJS 4.2.0 - Client-side encryption
- Class Variance Authority 0.7.1 - CSS class variance pattern
- clsx 2.1.1 - Classname conditional builder
- React Helmet Async 2.0.5 - Document head management
- HLS.js 1.6.15 - HTTP Live Streaming player
- Next Themes 0.3.0 - Theme toggle utility

**Build & Dev Tools:**
- @vitejs/plugin-react-swc 3.11.0 - SWC React plugin for Vite
- Lovable Tagger 1.1.13 - Lovable.app integration tagging

**Code Quality:**
- TypeScript ESLint 8.38.0 - TypeScript linting
- ESLint 9.32.0 - JavaScript linting
- ESLint Plugin React Hooks 5.2.0 - React hooks linting rules
- ESLint Plugin React Refresh 0.4.20 - React Fast Refresh linting
- Autoprefixer 10.4.21 - CSS vendor prefixing
- PostCSS 8.5.6 - CSS processing

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.87.1 - All database and auth operations
- `@stripe/stripe-js` 8.7.0 - Stripe payment processing
- `react-router-dom` 6.30.1 - Application routing
- `@tanstack/react-query` 5.83.0 - Server state management

**Infrastructure:**
- `vite` 5.4.19 - Development server and build pipeline
- `tailwindcss` 3.4.17 - CSS framework
- `typescript` 5.8.3 - Type safety
- `react-hook-form` 7.61.1 - Form state management
- `zod` 3.25.76 - Runtime validation

**External APIs:**
- `@stripe/react-stripe-js` 5.6.0 - Stripe React components
- `react-plaid-link` 4.1.1 - Plaid bank connection
- All @radix-ui/* packages - Accessible component primitives

## Configuration

**Environment Variables (Frontend):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (alternate)
- `VITE_SUPABASE_PROJECT_ID` - Project ID (qydkrpirrfelgtcqasdx)

All env vars prefixed with `VITE_` are exposed to browser. No secrets should use this prefix.

**Build Configuration:**
- `tsconfig.json` - Root TypeScript config with path aliases (`@/*` → `./src/*`)
- `tsconfig.app.json` - App-specific TypeScript config
- `tsconfig.node.json` - Node/build tool TypeScript config
- `vite.config.ts` - Vite build configuration with React SWC plugin, path alias resolution, React dedupe
- `tailwind.config.ts` - Tailwind CSS customization (custom fonts, colors, animations, sidebar theming)
- `postcss.config.js` - PostCSS processing pipeline
- `eslint.config.js` - ESLint linting rules
- `components.json` - shadcn/ui component config
- `vercel.json` - Vercel deployment config with SPA rewrite rules

**Development Server:**
- Vite dev server on `::` (IPv6) port 8080 (`vite.config.ts` line 8-11)
- Component tagging for Lovable in development mode

## Platform Requirements

**Development:**
- Node.js 22.14.0+
- npm 10.9.2+
- TypeScript 5.8.3
- Git (for version control)

**Production:**
- Browser with ES2020+ support
- Supabase project (qydkrpirrfelgtcqasdx)
- Stripe account (dual keys: management + ad_spend)

**Deployment:**
- Vercel (frontend SPA)
- Supabase Edge Functions (backend logic, Deno runtime)

## Notable Patterns

**Type Safety:**
- Strict TypeScript with `skipLibCheck: true`, `strictNullChecks: false` (permissive null handling)
- Auto-generated Supabase types from schema (`src/integrations/supabase/types.ts`)

**API Pattern:**
- No traditional REST API layer
- Direct Supabase client calls from React components
- Supabase Edge Functions for complex server logic (Deno runtime)
- Function invocation via `supabase.functions.invoke()`

**State Management:**
- React Query for server state (preferred)
- Custom React Context for auth (`AuthContext.tsx`, `NotificationContext.tsx`)
- Local component state via `useState`
- No Redux/Zustand

**Styling Approach:**
- Tailwind CSS utilities (primary)
- CSS variables for theme colors (`tailwind.config.ts`)
- Dark mode via CSS class strategy
- Custom animations (fade-in, scale-in, glow-pulse)

---

*Stack analysis: 2025-03-04*
