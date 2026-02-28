# Alpha Hub — Claude Code Instructions

## Quick Connect

This is the **Alpha Agent Flow** platform (aka "Alpha Hub").

- **Repo**: https://github.com/itsforren/alpha-agent-flow.git
- **Local path**: `/Users/forren/workspace/alpha-agent-flow-review/`
- **Live app**: https://alpha-agent-flow.lovable.app
- **Supabase project**: `qydkrpirrfelgtcqasdx`
- **Stack**: Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui + Supabase

If you're told to "connect to Alpha Hub" or "update Alpha Hub", this is the repo. Navigate here:
```bash
cd /Users/forren/workspace/alpha-agent-flow-review
```

## CRITICAL: Multi-Agent Safety Protocol

Multiple Claude Code instances AND Lovable may be editing this repo concurrently. Follow these rules **every time**:

### Before ANY edit:
1. **Pull first** — always start with `git pull origin main` to get the latest
2. **Check for uncommitted changes** — run `git status`. If there are unstaged changes from another session, do NOT overwrite them. Ask the user what to do.
3. **Never force push** — `git push --force` is forbidden. It will destroy other agents' work.

### While editing:
4. **Work on a feature branch** if your task is multi-file or takes more than a few minutes:
   ```bash
   git checkout -b feature/<short-name>
   ```
   Merge back to main when done: `git checkout main && git pull && git merge feature/<short-name>`
5. **If staying on main** (small changes), commit frequently — small atomic commits, not one big dump at the end.
6. **Never amend commits** that have been pushed. Create new commits instead.

### After editing:
7. **Push promptly** — don't leave committed changes sitting locally. Push so other agents can pull.
8. **If push fails** (rejected), pull with rebase: `git pull --rebase origin main`, resolve any conflicts, then push.

## Lovable Sync Awareness

- Lovable auto-commits to this repo when the user makes changes in the Lovable UI
- After pushing your changes, the user clicks **"Publish"** in Lovable to deploy the frontend
- Lovable creates snapshot branches like `lovable-snapshot-YYYY-MM-DD` — **do not delete these**
- If you see unexpected recent commits you didn't make, they're likely from Lovable — pull and work on top of them

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
└── config.toml            # Function registration + cron schedules
```

## Supabase Edge Functions

Edge functions are in `supabase/functions/`. Each function is a directory with an `index.ts` file using Deno runtime.

**Deploy a function:**
```bash
supabase functions deploy <function-name>
```

**Deploy a migration:**
```bash
supabase db push
```

**Regenerate types after schema changes:**
```bash
supabase gen types typescript --project-id qydkrpirrfelgtcqasdx > src/integrations/supabase/types.ts
```

The Supabase CLI must be linked first: `supabase link --project-ref qydkrpirrfelgtcqasdx`

## Environment Variables

- Frontend env vars are in `.env` (VITE_* prefix) — **never commit secrets**
- Edge function secrets are set via `supabase secrets set KEY="value"` — NOT in any file
- `.env` is gitignored. If it's missing, create from this template:
  ```
  VITE_SUPABASE_URL=https://qydkrpirrfelgtcqasdx.supabase.co
  VITE_SUPABASE_ANON_KEY=<ask user>
  VITE_STRIPE_MANAGEMENT_PUBLISHABLE_KEY=<ask user>
  VITE_STRIPE_AD_SPEND_PUBLISHABLE_KEY=<ask user>
  ```

## Key Patterns

- **UI components**: shadcn/ui (Radix primitives) — import from `@/components/ui/`
- **Data fetching**: TanStack React Query — all DB access through custom hooks in `src/hooks/`
- **Toasts**: `import { toast } from 'sonner'`
- **Icons**: `lucide-react`
- **Supabase client**: `import { supabase } from '@/integrations/supabase/client'`
- **Edge functions**: Raw `fetch()` to Stripe API (no SDK), `createClient` from `@supabase/supabase-js` for DB

## Do NOT

- Delete or modify `.lovable/` directory
- Force push to main
- Commit `.env` files or API keys
- Edit `src/integrations/supabase/types.ts` manually (it's auto-generated)
- Delete branches named `lovable-snapshot-*`
