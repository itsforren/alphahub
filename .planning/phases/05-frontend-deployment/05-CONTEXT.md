# Phase 5: Frontend Deployment - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract the AlphaHub frontend from the Lovable-managed alpha-agent-flow repo, reconfigure it to use the new Supabase backend, and deploy it independently at hub.alphaagent.io. The result is a standalone, deployable React SPA connected to the migrated Supabase project. No new features or UI changes — just make the existing frontend work outside Lovable.

</domain>

<decisions>
## Implementation Decisions

### Hosting platform
- Domain: `hub.alphaagent.io` (owned on Hostinger, active)
- Platform: Claude's Discretion — pick the best option for a Vite React SPA with git-connected deploys
- Vercel is acceptable (user explicitly mentioned it); Hostinger shared hosting also available (cloud_economy plan, order 45723717)
- Key requirement: `git push` → auto-deploys. User wants to edit via Claude Code and see changes deploy automatically
- DNS managed via Hostinger — point `hub.alphaagent.io` CNAME to whatever hosting is chosen

### Lovable cleanup scope
- **Minimal cleanup** — just make it build. Don't clean up code patterns or unused dependencies beyond what blocks the build
- Leave Lovable branding (badges, favicon, meta tags) for now — cosmetic cleanup deferred
- Supabase connection config via **environment variables** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), not hardcoded
- Remove/modify only what prevents `npm run build` from succeeding

### Deployment workflow
- **New standalone GitHub repo** named `alphahub`
- Contains **everything**: frontend (`src/`) + Supabase backend (`supabase/functions/`, `supabase/migrations/`, `supabase/config.toml`)
- Git-connected CI/CD: push to main → auto-build and deploy frontend
- Workflow: Claude Code edits code → `git push` → hosting auto-deploys (~30 seconds)
- Supabase functions continue to deploy via `supabase functions deploy` from the same repo

### Page verification approach
- **Pages load + real data shows** from the new Supabase backend
- Manual verification by user using their admin account
- Pages to verify: login, dashboard, client list, client detail, billing, wallets, campaigns, leads, communications
- Minor issues (chart not rendering, count slightly off) are **not blockers** — noted and fixed in Phase 6
- No automated smoke tests — user does a manual walkthrough with a checklist

### Claude's Discretion
- Specific hosting platform selection (Vercel vs Netlify vs Cloudflare Pages vs Hostinger)
- Build configuration and optimization settings
- .htaccess or routing configuration details
- CI/CD pipeline specifics (build commands, environment variable setup)
- How to structure the extraction from alpha-agent-flow to alphahub repo

</decisions>

<specifics>
## Specific Ideas

- "I want to be able to just talk with Claude Code, make changes, and update in real time, real easy" — frictionless edit-push-deploy loop is the primary UX goal
- `conscious.sysconscious.com` is a completely different frontend (Agent Command Center) — not related to this phase
- `alphaagent.io` main domain is currently pointed to Lovable — the subdomain `hub.alphaagent.io` is the new deployment target
- User is open to temporary hosting (e.g., Vercel) that can be repointed later

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-frontend-deployment*
*Context gathered: 2026-02-28*
