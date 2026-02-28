# Phase 5: Frontend Deployment - Research

**Researched:** 2026-02-28
**Domain:** Vite React SPA deployment, Lovable extraction, Supabase client reconfiguration
**Confidence:** HIGH

## Summary

The AlphaHub frontend is a Vite 5 + React 18 + TypeScript + Tailwind CSS + shadcn/ui single-page application currently living inside `alphahub-v2/` in the `copy-alphahub` repo. The codebase is already in good shape -- `npm run build` succeeds with zero errors, producing a `dist/` directory. The Lovable-specific footprint is minimal: one dev dependency (`lovable-tagger`) and one import in `vite.config.ts`, both only active in development mode. The build is clean for production.

The primary work is: (1) create a new `alphahub` GitHub repo from the `alphahub-v2/` contents, (2) update the `.env` file to point at the new Supabase project, (3) add a `vercel.json` for SPA routing, (4) deploy to Vercel with git-connected CI/CD, (5) configure the `hub.alphaagent.io` custom domain, and (6) configure Supabase Auth redirect URLs for the new domain.

**Primary recommendation:** Deploy to Vercel (Hobby plan, free). It auto-detects Vite, provides zero-config git-connected CI/CD, and handles custom subdomains via simple CNAME record at Hostinger DNS.

## Standard Stack

### Core (Already in place -- no new libraries needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 5.4.19 | Build tool + dev server | Standard for React SPAs, already configured |
| React | 18.3.1 | UI framework | Already in use |
| react-router-dom | 6.30.1 | Client-side routing | Already in use, uses BrowserRouter |
| @supabase/supabase-js | 2.87.1 | Backend client | Already in use |
| Tailwind CSS | 3.4.17 | Styling | Already configured |
| @tanstack/react-query | 5.83.0 | Data fetching | Already in use |

### Supporting (New for deployment)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vercel platform | N/A | Hosting + CI/CD | Deploy target for the SPA |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel | Netlify | Nearly identical for static SPAs; Vercel has slightly better auto-detection for Vite projects and simpler SPA routing config (vercel.json vs netlify.toml) |
| Vercel | Cloudflare Pages | Good option too, but less friction with Vercel for Vite React SPAs |
| Vercel | Hostinger shared hosting | Would require manual build+upload, .htaccess for SPA routing, no git-connected deploys -- violates core requirement |

**Recommendation: Vercel.** Reasons:
1. User explicitly mentioned Vercel as acceptable
2. Zero-config Vite detection -- auto-detects build command (`npm run build`) and output directory (`dist`)
3. SPA routing: single `vercel.json` with one rewrite rule
4. Git-connected deploys: push to main -> auto-build in ~30 seconds
5. Free Hobby plan: 100GB bandwidth, 6000 build minutes/month -- more than sufficient
6. Custom subdomain: CNAME record at Hostinger DNS pointing to Vercel-provided value
7. Automatic SSL/TLS for custom domains
8. Environment variables managed in Vercel dashboard (not committed to repo)

**No new npm packages needed.** The existing `package.json` has everything required for build and deployment.

## Architecture Patterns

### Recommended New Repo Structure

The new `alphahub` GitHub repo should mirror the current `alphahub-v2/` directory contents:

```
alphahub/                    # Root = frontend project
├── src/                     # React source code
│   ├── components/          # UI components
│   ├── contexts/            # React contexts (Auth, etc.)
│   ├── hooks/               # React Query hooks
│   ├── integrations/supabase/  # Supabase client + types
│   ├── lib/                 # Utilities
│   ├── pages/               # Route pages
│   └── config/              # App config (stripe.ts, etc.)
├── public/                  # Static assets
├── supabase/                # Backend (NOT deployed by Vercel)
│   ├── functions/           # 106 edge functions
│   ├── migrations/          # SQL migrations
│   └── config.toml          # Function config
├── index.html               # Entry point
├── package.json             # Dependencies
├── vite.config.ts           # Vite config
├── tailwind.config.ts       # Tailwind config
├── tsconfig.json            # TypeScript config
├── vercel.json              # NEW: SPA routing for Vercel
├── .env.example             # NEW: Template for env vars (committed)
└── .gitignore               # Updated: must include .env
```

### Pattern 1: SPA Routing via vercel.json

**What:** All non-file routes rewrite to `/index.html` so React Router handles routing client-side.
**When to use:** Every Vite React SPA deployed to Vercel.
**Example:**
```json
// Source: https://vercel.com/docs/frameworks/frontend/vite
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Pattern 2: Environment Variables via Vercel Dashboard

**What:** VITE_* environment variables are set in Vercel project settings, not committed to the repo.
**When to use:** All Supabase connection details, any secrets.
**Example:** In Vercel Dashboard > Project > Settings > Environment Variables:
```
VITE_SUPABASE_URL = https://qcunascacayiiuufjtaq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = <new project anon key>
VITE_SUPABASE_ANON_KEY = <same anon key as above>
VITE_SUPABASE_PROJECT_ID = qcunascacayiiuufjtaq
```

### Pattern 3: Supabase Client Config (Already in place)

**What:** The Supabase client reads from `import.meta.env` at build time.
**Source:** `src/integrations/supabase/client.ts`
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### Anti-Patterns to Avoid
- **Hardcoding Supabase URLs:** The codebase properly uses `import.meta.env.VITE_SUPABASE_URL` everywhere. Do NOT introduce hardcoded URLs.
- **Committing `.env` to the new repo:** The current `.gitignore` does NOT include `.env` -- this MUST be fixed in the new repo.
- **Installing Vercel CLI locally:** Not needed. Git-connected deploys handle everything. The Vercel dashboard is sufficient for initial setup.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPA routing on Vercel | Custom server / middleware | `vercel.json` rewrites | One config file, battle-tested, zero maintenance |
| SSL certificates | Manual cert management | Vercel automatic SSL | Vercel provisions and renews certs for custom domains automatically |
| CI/CD pipeline | GitHub Actions workflow | Vercel git integration | Zero config -- connect repo, done. No YAML to maintain |
| Build caching | Custom caching logic | Vercel build cache | Built-in, automatic, speeds up subsequent builds |
| Environment variable management | `.env` files in repo | Vercel dashboard env vars | More secure, supports preview/production separation |

**Key insight:** For a static SPA deployment, the hosting platform handles 100% of the deployment infrastructure. There is literally nothing custom to build -- just configure and connect.

## Common Pitfalls

### Pitfall 1: Inconsistent Env Var Names for Supabase Anon Key
**What goes wrong:** The codebase uses TWO different env var names for the same Supabase anon key:
- `VITE_SUPABASE_PUBLISHABLE_KEY` -- used by `client.ts` (5 references) and `useOnboardingAutomation.ts`
- `VITE_SUPABASE_ANON_KEY` -- used by `ClientDetail.tsx` and `useClients.ts` (4 references)

Both must be set to the same value (the new project's anon key), or some edge function calls will fail silently with 401 errors.
**Why it happens:** Lovable used `PUBLISHABLE_KEY` naming; later code was written with standard `ANON_KEY` naming.
**How to avoid:** Set BOTH env vars in Vercel dashboard to the same value. Optionally normalize to one name in Phase 6.
**Warning signs:** Edge function calls returning 401 from some pages but not others.

### Pitfall 2: `.env` File Not Gitignored
**What goes wrong:** The current `.gitignore` in `alphahub-v2/` does NOT include `.env`. If the `.env` file (containing Supabase keys) is committed to the new `alphahub` repo, credentials are exposed in GitHub.
**Why it happens:** Lovable may have relied on a different gitignore strategy.
**How to avoid:** Add `.env` to `.gitignore` BEFORE the first commit of the new repo. Create `.env.example` with placeholder values for documentation.
**Warning signs:** Running `git status` shows `.env` as a tracked file.

### Pitfall 3: Supabase Auth Redirect URLs Not Configured
**What goes wrong:** After deploying to `hub.alphaagent.io`, password reset and email confirmation links redirect to the wrong URL (or fail entirely).
**Why it happens:** Supabase Auth has a "Site URL" and "Redirect URLs" allowlist in the dashboard. If `hub.alphaagent.io` is not in the list, auth redirects fail.
**How to avoid:** In Supabase Dashboard > Authentication > URL Configuration:
1. Set Site URL to `https://hub.alphaagent.io`
2. Add `https://hub.alphaagent.io/**` to Redirect URLs allowlist
3. Keep `http://localhost:8080/**` for local development
**Warning signs:** Password reset emails link to `localhost` or an old domain.

### Pitfall 4: Edge Function Hardcoded URLs Still Point to Lovable/Old Domain
**What goes wrong:** The `create-user-account` edge function constructs redirect URLs using `.lovable.app` domain. The `send-password-reset` function hardcodes `https://alphaagent.io/reset-password`. The `crm-oauth-callback` redirects to `https://alphaagent.io/hub/admin/ghl-bridge`.
**Why it happens:** Edge functions were written when the app was hosted on Lovable.
**How to avoid:** These are edge function issues (backend), not frontend deployment blockers. Note them for Phase 6 cleanup. The frontend's own auth redirects use `window.location.origin` which is correct and dynamic.
**Warning signs:** Users clicking password reset links in emails land on wrong domain.

### Pitfall 5: React Router Deep Links Return 404
**What goes wrong:** Direct URL access to any route except `/` returns a 404 page.
**Why it happens:** Vercel tries to find a file matching the URL path. Since this is an SPA, all routes must serve `index.html`.
**How to avoid:** Add `vercel.json` with the rewrite rule before first deploy.
**Warning signs:** Bookmarked links or shared URLs to `/hub/admin/clients` show Vercel's 404 page.

### Pitfall 6: `VITE_SUPABASE_PROJECT_ID` Must Be Updated
**What goes wrong:** GHLBridge page constructs Supabase function URLs using `VITE_SUPABASE_PROJECT_ID`. If this still points to old project, OAuth flows and calendar discovery break.
**Why it happens:** The `.env` file has old project ID (`qydkrpirrfelgtcqasdx`).
**How to avoid:** Set `VITE_SUPABASE_PROJECT_ID=qcunascacayiiuufjtaq` in Vercel env vars.
**Warning signs:** GHL Bridge page OAuth start redirects to old Supabase project.

## Code Examples

### vercel.json for SPA routing
```json
// Source: https://vercel.com/docs/frameworks/frontend/vite
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### .env.example (template for documentation)
```bash
# Supabase Connection
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

### .gitignore additions needed
```
# Environment files
.env
.env.local
.env.production
```

### CNAME DNS record at Hostinger
```
Type:  CNAME
Name:  hub
Value: cname.vercel-dns.com.
TTL:   3600
```
Note: The actual CNAME value is provided by Vercel after adding the domain. It may be a project-specific hash like `d1d4fc829fe7bc7c.vercel-dns-017.com`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lovable-hosted (auto-deploy from Lovable UI) | Vercel git-connected deploys | Phase 5 | Same push-to-deploy UX, independent of Lovable |
| `.env` with old Supabase project | Vercel env vars with new project | Phase 5 | Frontend talks to migrated backend |
| `lovable-tagger` in vite.config.ts | Remove or leave (dev-only, no prod impact) | Phase 5 | Build succeeds either way |

**Deprecated/outdated:**
- `lovable-tagger`: Dev-only plugin that tags Lovable components. Has zero production impact. Context says leave Lovable branding for now, so this can stay. Removing it is trivial (delete import + plugin line from vite.config.ts, `npm uninstall lovable-tagger`).

## Codebase Findings

### Build Status: PASSING
```
npm run build → ✓ 4573 modules transformed, built in 7.25s
```
Build output: `dist/` directory with all chunks
No TypeScript errors, no compilation warnings
One non-blocking warning: Browserslist data is 8 months old (cosmetic)
One non-blocking warning: Some chunks > 500KB (HLS.js, jsPDF, recharts -- expected for these libraries)

### Env Vars Used in Source Code (4 unique)
| Env Var | References | Where Used |
|---------|------------|------------|
| `VITE_SUPABASE_URL` | 12 | client.ts, hooks, components (edge function URLs) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 5 | client.ts (main client), useOnboardingAutomation.ts |
| `VITE_SUPABASE_ANON_KEY` | 4 | ClientDetail.tsx, useClients.ts (direct fetch to functions) |
| `VITE_SUPABASE_PROJECT_ID` | 3 | GHLBridge.tsx (constructs function URLs) |

### Lovable-Specific Code (Minimal)
1. `vite.config.ts` line 4: `import { componentTagger } from "lovable-tagger"` -- only used in dev mode
2. `package.json` devDependency: `"lovable-tagger": "^1.1.13"` -- only installed for dev
3. `.lovable/plan.md` -- Lovable internal planning file, irrelevant
4. `src/pages/hub/admin/CampaignSettings.tsx` line 324/331: UI dropdown has `lovable_llm` option -- cosmetic, deferred
5. `src/hooks/useCampaignCommandCenter.ts` line 805: default `ai_provider: 'lovable_llm'` -- cosmetic, deferred

### Auth Redirects: Correctly Dynamic
- `AuthContext.tsx` uses `window.location.origin` for password reset and signup redirects
- This means auth flows will automatically work on any domain (localhost, Vercel preview, hub.alphaagent.io)
- Edge functions have hardcoded URLs (`.lovable.app`, `alphaagent.io`) -- backend issue, not a Phase 5 blocker

### File Counts
- **Source files:** 389 (`.ts` + `.tsx`)
- **Edge functions:** 106 directories
- **Migrations:** 144 SQL files
- **Total source size:** 7.0 MB (src/) + 2.2 MB (supabase/) + 440 KB (public/)

### Pages to Verify (from App.tsx routes)
| Page | Route | Component |
|------|-------|-----------|
| Login | `/login` | `pages/auth/Login` |
| Dashboard (client view) | `/hub` | `PortalAdminClientDetail` (index route) |
| Client List | `/hub/admin/clients` | `pages/portal/admin/Clients` |
| Client Detail | `/hub/admin/clients/:id` | `pages/portal/admin/ClientDetail` |
| Billing | `/hub/admin/billing` | `pages/hub/admin/BillingDashboard` |
| Command Center (Campaigns) | `/hub/admin/command` | `pages/hub/admin/CommandCenter` |
| Sales (Leads/Pipeline) | `/hub/admin/sales` | `pages/hub/admin/UnifiedSales` |
| Analytics (TV) | `/hub/admin/analytics` | `pages/hub/admin/TVAnalytics` |
| Chat | `/hub/admin/chat` | `pages/hub/admin/UnifiedChat` |
| Settings | `/hub/admin/settings` | `pages/portal/admin/Settings` |

### CORS Status
From prior phase context: CORS allows all origins (`Access-Control-Allow-Origin: *`). This means the frontend can call edge functions from any domain -- no CORS issues expected when deploying to a new domain.

## Open Questions

1. **New Supabase project anon key value**
   - What we know: The env var names are `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_ANON_KEY`
   - What's unclear: The exact anon key value for project `qcunascacayiiuufjtaq` (must be retrieved from Supabase dashboard)
   - Recommendation: User retrieves from Supabase Dashboard > Settings > API > `anon` `public` key

2. **Vercel account / organization**
   - What we know: User needs a Vercel account to deploy
   - What's unclear: Whether user has an existing Vercel account or needs to create one
   - Recommendation: Vercel signup is free, can use GitHub OAuth (same GitHub account as repo owner)

3. **6 undeployed edge functions**
   - What we know: `verify-google-ads-campaign`, `verify-lead-delivery`, `verify-onboarding-live`, `verify-onboarding`, `webflow-cms-create`, `webflow-cms-update` are not deployed
   - What's unclear: Whether any of these are called from the frontend pages being verified
   - Recommendation: `verify-google-ads-campaign` IS called from `ClientDetail.tsx` (line 192). This page will have a broken "Verify Campaign" button. Note as known issue, not a blocker per context decisions.

4. **CNAME TTL and propagation**
   - What we know: Hostinger DNS supports CNAME records
   - What's unclear: Current DNS records for `hub.alphaagent.io` and propagation time
   - Recommendation: DNS propagation is typically 5-30 minutes. Set TTL to 3600 (1 hour). Check with `dig hub.alphaagent.io` after configuration.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- `package.json`, `vite.config.ts`, `src/integrations/supabase/client.ts`, `App.tsx`, `.env`, `.gitignore`
- **Build verification** -- `npm run build` executed successfully, zero errors
- **Vercel docs** -- https://vercel.com/docs/frameworks/frontend/vite (SPA routing, env vars)
- **Vercel domain docs** -- https://vercel.com/docs/domains/working-with-domains/add-a-domain (CNAME for subdomains)
- **Supabase auth docs** -- https://supabase.com/docs/guides/auth/redirect-urls (redirect URL configuration)

### Secondary (MEDIUM confidence)
- **Netlify docs** -- https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/ (alternative platform comparison)
- **Vercel pricing** -- https://vercel.com/pricing (Hobby plan limits: 100GB bandwidth, 6000 build minutes)

### Tertiary (LOW confidence)
- None -- all findings verified with codebase inspection or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- codebase inspected, build verified, no new libraries needed
- Architecture: HIGH -- Vercel Vite SPA deployment is well-documented and verified against official docs
- Pitfalls: HIGH -- all pitfalls discovered from actual codebase inspection (env var mismatch, .gitignore gap, hardcoded URLs)

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable -- Vercel Vite deployment patterns change slowly)
