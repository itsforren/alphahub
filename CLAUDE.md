> **Knowledge Base**: Read `~/knowledge/projects/alphahub.md` first for consolidated reference.
> Full system context: `~/knowledge/SYSTEM.md` | APIs: `~/knowledge/apis/` | Runbooks: `~/knowledge/runbooks/`
> This CLAUDE.md has additional project-specific details below.

# Alpha Hub — Claude Code Instructions

## Quick Connect

This is the **Alpha Hub** production platform at `alphaagent.io`.

- **Official Repo**: https://github.com/itsforren/alphahub.git
- **Local working path**: `/Users/forren/workspace/copy-alphahub/`
- **Live app**: https://alphaagent.io (Vercel, auto-deploys from `main`)
- **Supabase project**: `qcunascacayiiuufjtaq`
- **Stack**: Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui + Supabase

## ⚠️ CRITICAL: Repo Identity

**ALWAYS push to `itsforren/alphahub` — this is the ONLY correct repo.**

**NEVER touch `itsforren/alpha-agent-flow`** — that is the OLD Lovable app, completely separate, not connected to alphaagent.io. Pushing there does nothing for production.

To work in this repo:
```bash
cd /Users/forren/workspace/copy-alphahub
git pull origin main
```

Edge functions deploy directly to Supabase (separate from Vercel):
```bash
cd /Users/forren/workspace/copy-alphahub/alphahub-v2
supabase functions deploy <function-name> --project-ref qcunascacayiiuufjtaq
```

## Deployment Flow

1. **Frontend** → push to `main` on `itsforren/alphahub` → Vercel auto-deploys to `alphaagent.io`
2. **Edge Functions** → `supabase functions deploy <name> --project-ref qcunascacayiiuufjtaq`
3. **DB changes** → Supabase Management API or migrations

## CRITICAL: Multi-Agent Safety Protocol

### Before ANY edit:
1. **Pull first** — `git pull origin main` from `/Users/forren/workspace/copy-alphahub`
2. **Check for uncommitted changes** — `git status`. Do NOT overwrite them without asking.
3. **Never force push** — forbidden.

### While editing:
4. **Feature branch for multi-file changes**: `git checkout -b feature/<short-name>`
5. **Small changes**: stay on main, commit frequently.
6. **Never amend pushed commits.**

### After editing:
7. **Push promptly** — `git push origin main` (or merge feature branch)
8. **If push fails**: `git pull --rebase origin main`, resolve conflicts, push.

## Project Structure

```
src/
├── components/portal/     # Main UI components (client detail, billing, wallets, etc.)
├── hooks/                 # React Query hooks (useBillingRecords, useClientWallet, etc.)
├── pages/portal/          # Route pages (admin/, client/)
├── integrations/supabase/ # Supabase client + auto-generated types
├── config/                # App config (stripe.ts, etc.)
└── lib/                   # Utilities
supabase/
├── functions/             # Deno edge functions (deployed via Supabase CLI)
├── migrations/            # SQL migrations
└── config.toml            # Function registration
```

## Supabase Edge Functions

```bash
# Deploy a function
supabase functions deploy <function-name> --project-ref qcunascacayiiuufjtaq

# Regenerate types after schema changes
supabase gen types typescript --project-id qcunascacayiiuufjtaq > src/integrations/supabase/types.ts

# Link CLI to project
supabase link --project-ref qcunascacayiiuufjtaq
```

## Environment Variables

- `.env` in project root (gitignored, never commit)
- Correct values:
  ```
  VITE_SUPABASE_PROJECT_ID="qcunascacayiiuufjtaq"
  VITE_SUPABASE_URL="https://qcunascacayiiuufjtaq.supabase.co"
  VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
  ```
- Edge function secrets: `supabase secrets set KEY="value" --project-ref qcunascacayiiuufjtaq`

## Key Patterns

- **UI components**: shadcn/ui (Radix primitives) — import from `@/components/ui/`
- **Data fetching**: TanStack React Query — all DB access through custom hooks in `src/hooks/`
- **Toasts**: `import { toast } from 'sonner'`
- **Icons**: `lucide-react`
- **Supabase client**: `import { supabase } from '@/integrations/supabase/client'`
- **Edge functions**: Raw `fetch()` to Stripe API (no SDK), `createClient` from `@supabase/supabase-js`

## Do NOT

- Push to `itsforren/alpha-agent-flow` — wrong repo, old Lovable app
- Force push to main
- Commit `.env` files or API keys
- Edit `src/integrations/supabase/types.ts` manually (auto-generated)
- Use Supabase project ID `qydkrpirrfelgtcqasdx` — that is the OLD project
