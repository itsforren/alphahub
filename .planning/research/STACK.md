# Technology Stack: AlphaHub Migration

**Project:** AlphaHub Lovable Cloud to Self-Managed Supabase Migration
**Researched:** 2026-02-26
**Overall Confidence:** HIGH (verified against official Supabase docs, Lovable docs, and Stripe docs)

---

## Migration Approach Summary

This is NOT a greenfield stack decision. AlphaHub already runs React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase + Stripe. The "stack" here is the **migration tooling** -- what tools extract the current system and re-deploy it on self-managed infrastructure. The app code stays the same; the infrastructure changes underneath.

---

## Phase 1: Source Code Export

### Lovable GitHub Sync

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| Lovable GitHub Integration | Built-in | Export full codebase to GitHub | Only supported export path; two-way sync means repo always has latest code |

**Confidence:** HIGH (verified via [Lovable GitHub docs](https://docs.lovable.dev/integrations/github))

**Process:**
1. Connect Lovable project to GitHub via Settings > Connectors > GitHub
2. Select repository (personal account or organization)
3. Two-way sync creates full repo with all source code
4. Clone locally: `git clone <repo-url>`

**What you get:**
- Full React + Vite + TypeScript frontend code
- `supabase/migrations/` folder with chronologically-ordered SQL migration files
- `supabase/functions/` folder with Edge Functions (TypeScript/Deno)
- `supabase/config.toml` with project configuration
- Standard Vite project structure (`src/`, `public/`, `package.json`, `vite.config.ts`)

**What you do NOT get:**
- Data (lives in Supabase, not in code)
- Auth users and sessions (in Supabase auth schema)
- Storage objects/files (in Supabase storage)
- Edge Function secrets/environment variables
- Stripe webhook configurations

**Critical note:** After migration, changes made in Lovable will NOT sync with your new Supabase project. You must stop using Lovable for edits once you cut over. This is a one-way door.

---

## Phase 2: Database Migration (Schema + Data)

### Supabase CLI

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| Supabase CLI | v2.76.15+ (latest as of 2026-02-26) | Schema dump, data export, edge function deployment, secrets management | Official tool; wraps pg_dump with Supabase-aware schema exclusions |
| Docker Desktop | Latest | Required by CLI for local pg_dump operations | CLI runs pg_dump inside a container |
| psql | 15+ | Restore dumps to new project | Direct Postgres connection for importing |

**Confidence:** HIGH (verified via [Supabase CLI docs](https://supabase.com/docs/reference/cli/supabase-db-dump), [Backup/Restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore))

### Installation

```bash
# Install Supabase CLI (macOS)
brew install supabase/tap/supabase

# Or via npm (Node.js 20+)
npm install -D supabase

# Verify installation
supabase --version
# Expected: 2.76.15 or later
```

### Two Migration Strategies

You have two paths. Use **Strategy A** (the Lovable-native path) because AlphaHub already has migration files in the repo.

#### Strategy A: Apply Migration Files (RECOMMENDED)

Use the migration files already in `supabase/migrations/`. This is the cleanest path because:
- Migration files are version-controlled and tested
- They create schema in the correct order
- They include RLS policies, triggers, and functions created through Lovable
- They represent the intended schema state, not accumulated drift

```bash
# 1. Create new Supabase project at supabase.com
# 2. Link local project to new instance
supabase link --project-ref <NEW_PROJECT_ID>

# 3. Push all migration files to new project
supabase db push

# 4. Verify schema
supabase db diff --linked
```

**Then export and import DATA separately:**

```bash
# Connect to OLD project to dump data
supabase db dump --db-url "postgresql://postgres:[PASSWORD]@db.[OLD_REF].supabase.co:5432/postgres" \
  -f data.sql \
  --data-only \
  --use-copy

# Import data into NEW project
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "postgresql://postgres:[PASSWORD]@db.[NEW_REF].supabase.co:5432/postgres"
```

The `session_replication_role = replica` setting is critical -- it disables all triggers during import so columns are not double-encrypted and auto-generated values are not re-computed.

#### Strategy B: Full pg_dump/Restore (FALLBACK)

If migration files are incomplete or the schema has drifted from migrations:

```bash
# Export from OLD project (3 separate dumps)
# 1. Roles
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only

# 2. Schema (excludes auth, storage, extension schemas by default)
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql

# 3. Data
supabase db dump --db-url "$OLD_DB_URL" -f data.sql --use-copy --data-only

# Restore to NEW project (single transaction)
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$NEW_DB_URL"
```

**Connection string format:** `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`

Use Supavisor session mode (port 5432) for pg_dump/restore operations, NOT transaction mode (port 6543).

### What `supabase db dump` Excludes by Default

The CLI automatically excludes Supabase-managed schemas:
- `auth` schema (auth.users, auth.sessions, etc.)
- `storage` schema (storage.buckets, storage.objects)
- Extension-created schemas

To include these, use the `--schema` flag explicitly:

```bash
supabase db dump --db-url "$DB_URL" -f auth_schema.sql --schema auth
supabase db dump --db-url "$DB_URL" -f storage_schema.sql --schema storage
```

---

## Phase 3: Auth Migration

### Auth Users Export/Import

| Tool | Purpose | Why |
|------|---------|-----|
| pg_dump with `--schema auth` | Export auth.users with password hashes | Preserves bcrypt hashes so users do not need to reset passwords |
| psql | Import auth data to new project | Direct SQL import |

**Confidence:** MEDIUM (verified via [Supabase auth migration troubleshooting](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects), but process is not fully documented as a one-size-fits-all script)

**Process:**

```bash
# Export auth schema + data from OLD project
pg_dump --no-owner --no-privileges \
  --schema=auth \
  --dbname "$OLD_DB_URL" \
  -f auth_dump.sql

# Import to NEW project
psql --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file auth_dump.sql \
  --dbname "$NEW_DB_URL"
```

**Critical considerations:**

1. **JWT Secret:** Each Supabase project has a unique JWT secret. Two options:
   - **Copy JWT secret** from old project to new (Settings > API > JWT Secret). This preserves existing tokens so users stay logged in. BUT: changing JWT secret regenerates your anon and service_role API keys.
   - **Different JWT secret** (default): Existing tokens become invalid. Users must re-authenticate. Simpler and safer for a planned cutover with brief downtime.

   **Recommendation:** Use different JWT secret. Since this migration has planned downtime, requiring re-login is acceptable and avoids key management complexity.

2. **Password hashes:** Supabase stores passwords as bcrypt in `auth.users.encrypted_password`. These transfer via pg_dump/psql, so users keep their passwords.

3. **OAuth identities:** The `auth.identities` table stores Google OAuth links. This must also be migrated to preserve Google login.

### Google OAuth Reconfiguration

| Tool | Purpose | Why |
|------|---------|-----|
| Google Cloud Console | Update OAuth redirect URI | New Supabase project has new callback URL |
| Supabase Dashboard | Configure Google provider | Must enter Client ID and Client Secret |

**Confidence:** HIGH (verified via [Supabase Google OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-google))

**Process:**

1. In Google Cloud Console > APIs & Services > Credentials:
   - Update Authorized redirect URIs to: `https://<NEW_REF>.supabase.co/auth/v1/callback`
   - Keep the old URI temporarily during parallel testing

2. In new Supabase project Dashboard > Auth > Providers:
   - Enable Google
   - Enter the same Client ID and Client Secret from Google Cloud Console

3. In frontend code, update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to new project values

---

## Phase 4: Edge Functions Migration

### Supabase Edge Functions (Deno Runtime)

| Tool | Purpose | Why |
|------|---------|-----|
| Supabase CLI `functions deploy` | Deploy edge functions to new project | Official deployment path |
| Supabase CLI `secrets set` | Configure environment variables | Secrets are NOT part of code; must be set separately |

**Confidence:** HIGH (verified via [Edge Functions deploy docs](https://supabase.com/docs/guides/functions/deploy), [Secrets docs](https://supabase.com/docs/guides/functions/secrets))

**Process:**

```bash
# Link to new project
supabase link --project-ref <NEW_PROJECT_ID>

# Deploy ALL edge functions at once
supabase functions deploy

# Or deploy individually
supabase functions deploy <function-name>

# For webhook-receiving functions (no JWT required)
supabase functions deploy <function-name> --no-verify-jwt
```

**Secrets management:**

Edge functions get these secrets automatically (no configuration needed):
- `SUPABASE_URL` -- new project's API gateway
- `SUPABASE_ANON_KEY` -- new project's anon key
- `SUPABASE_SERVICE_ROLE_KEY` -- new project's service role key
- `SUPABASE_DB_URL` -- new project's direct Postgres URL

Custom secrets (Stripe keys, API keys, etc.) must be set manually:

```bash
# Set from .env file
supabase secrets set --env-file ./supabase/.env

# Set individually
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_ADSPEND_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_ADSPEND_WEBHOOK_SECRET=whsec_...

# Verify secrets are set
supabase secrets list
```

**Important:** Secrets take effect immediately -- no re-deploy needed after setting.

**Function-specific config** in `supabase/config.toml`:

```toml
[functions.stripe-webhook]
verify_jwt = false

[functions.stripe-adspend-webhook]
verify_jwt = false
```

---

## Phase 5: Storage Migration

### Supabase Storage Objects

| Tool | Purpose | Why |
|------|---------|-----|
| Custom Node.js script | Download from old project, upload to new | Storage objects are NOT included in pg_dump; require manual migration |
| Supabase JS Client | API-based file transfer | Official client library for storage operations |

**Confidence:** MEDIUM (storage migration is documented as manual process; [Supabase backup/restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) references a migration script but does not fully document it)

**Process:**
1. Schema dump includes bucket definitions and RLS policies (from `storage` schema)
2. Physical files must be downloaded from old project and uploaded to new
3. Supabase provides a Node.js migration script template for this

```bash
# Pull storage schema (bucket definitions + policies)
supabase db pull --schema storage
```

**Note:** If AlphaHub uses minimal storage (likely -- it's a client management platform, not a file-heavy app), this may be trivial. Verify what's actually in storage buckets before investing time here.

---

## Phase 6: Stripe Webhook Transition

### Stripe Dashboard + Edge Functions

| Tool | Purpose | Why |
|------|---------|-----|
| Stripe Dashboard | Update webhook endpoint URLs | Both Stripe accounts need new webhook URLs pointing to new Supabase edge functions |
| Stripe CLI | Test webhooks locally | Verify webhook delivery before cutover |

**Confidence:** HIGH (verified via [Stripe webhook docs](https://docs.stripe.com/development/dashboard/webhooks))

**Process for BOTH Stripe accounts (management fees + ad spend):**

1. **Before cutover:** Create new webhook endpoints in Stripe Dashboard pointing to new URLs:
   - `https://<NEW_REF>.supabase.co/functions/v1/stripe-webhook`
   - `https://<NEW_REF>.supabase.co/functions/v1/stripe-adspend-webhook`

2. **Configure events:** Match the same event types as existing webhooks

3. **Get new webhook signing secrets:** Each new endpoint generates a new `whsec_` secret. Set these in edge function secrets.

4. **During cutover:** Disable old webhook endpoints, enable new ones

5. **Stripe customer/subscription IDs:** These do NOT change. The same Stripe accounts continue to work. You are only changing where webhooks are delivered.

**Critical:** Do NOT create new Stripe accounts or new customers. The existing `cus_`, `sub_`, `pi_`, `in_` IDs all stay the same. Only the webhook delivery URL changes.

---

## Phase 7: Frontend Deployment

### Recommended: Netlify

| Technology | Purpose | Why |
|------------|---------|-----|
| **Netlify** | Frontend hosting + CI/CD | Best DX for React+Vite SPAs; simple env var management; generous free tier; native Supabase integration |

**Confidence:** MEDIUM-HIGH (comparison verified via multiple 2025-2026 sources)

### Comparison Matrix

| Criterion | Netlify | Vercel | Cloudflare Pages |
|-----------|---------|--------|-----------------|
| React+Vite support | Native, zero-config | Native, zero-config | Requires minor config |
| Free bandwidth | 100 GB/mo | 100 GB/mo | Unlimited |
| Free builds | 300 min/mo | 6000 min/mo | 500 builds/mo |
| Env var management | Dashboard + CLI | Dashboard + CLI | Dashboard + CLI (wrangler) |
| SPA routing | `_redirects` file or `netlify.toml` | `vercel.json` rewrites | `_redirects` file |
| Supabase integration | Native integration available | Manual env vars | Manual env vars |
| Custom domain + SSL | Free, automatic | Free, automatic | Free, automatic |
| Preview deploys | Per-branch, automatic | Per-branch, automatic | Per-branch, automatic |
| Edge functions (frontend) | Netlify Functions | Vercel Functions | Cloudflare Workers |
| Pricing risk at scale | Predictable | Can spike with serverless | Most predictable |

**Recommendation: Netlify** because:
1. Native Supabase integration auto-configures environment variables
2. Simple `_redirects` file handles SPA routing (no config file needed)
3. Deploy previews for testing before cutover
4. No framework lock-in risk (Vercel optimizes for Next.js)
5. Straightforward pricing without serverless execution surprises

**Runner-up: Cloudflare Pages** if cost is the primary concern (unlimited bandwidth on free tier).

**Avoid: Self-hosting on VPS** for frontend. The VPS at 72.61.6.102 runs n8n and agent processes. Adding frontend hosting creates ops burden (SSL management, CDN, build pipeline) that platforms solve for free.

### Netlify Setup

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize (from project root)
netlify init

# Build settings
# Build command: npm run build
# Publish directory: dist
```

**SPA routing fix** -- create `public/_redirects`:
```
/*    /index.html   200
```

**Environment variables** (set in Netlify Dashboard > Site settings > Environment variables):
```
VITE_SUPABASE_URL=https://<NEW_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Important:** Vite exposes client-side env vars via `import.meta.env.VITE_*`. Only `VITE_`-prefixed variables are included in the build. Never put secret keys in `VITE_` variables.

---

## Phase 8: DNS and Domain Cutover

### Domain Configuration

| Tool | Purpose | Why |
|------|---------|-----|
| DNS provider (Hostinger/Cloudflare) | Update CNAME records | Point conscious.sysconscious.com to new hosting |
| Netlify Dashboard | Custom domain configuration | Automatic SSL provisioning |

**Confidence:** HIGH (standard DNS operations)

**Process:**
1. Add custom domain in Netlify: `conscious.sysconscious.com`
2. Update DNS CNAME record to point to Netlify's domain
3. Wait for SSL certificate provisioning (automatic)
4. Verify site loads on custom domain

---

## Migration-Specific Tooling Summary

### Required Tools

| Tool | Install | Version | Purpose |
|------|---------|---------|---------|
| Supabase CLI | `brew install supabase/tap/supabase` | v2.76.15+ | Schema dump, data export, edge function deploy, secrets |
| Docker Desktop | docker.com | Latest | Required by Supabase CLI for pg_dump operations |
| psql | Included with Postgres | 15+ | Database restore |
| Netlify CLI | `npm install -g netlify-cli` | Latest | Frontend deployment |
| Stripe CLI | `brew install stripe/stripe-cli/stripe` | Latest | Webhook testing |
| Git | System | Latest | Source code management |
| Node.js | System | 20+ | Build tooling, storage migration script |

### NOT Needed

| Tool | Why Not |
|------|---------|
| Terraform/Pulumi | Overkill for a single Supabase project + Netlify site |
| Docker Compose for Supabase | We are using managed Supabase (supabase.com), not self-hosting |
| Prisma/Drizzle ORM | AlphaHub uses Supabase client directly; adding an ORM introduces unnecessary migration risk |
| Next.js | AlphaHub is React+Vite; no reason to change frameworks during a 1:1 migration |
| Third-party migration services ($99 tools) | Manual migration gives full control and understanding of the system; this is production billing infrastructure |

---

## Existing Stack (Preserved As-Is)

These are NOT changing during migration. Listed for completeness.

### Frontend (No Changes)

| Technology | Purpose |
|------------|---------|
| React 18+ | UI framework |
| Vite | Build tool + dev server |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| React Router | Client-side routing |
| TanStack Query | Server state management |
| Recharts | Charts and data visualization |

### Backend (New Infrastructure, Same APIs)

| Technology | Purpose |
|------------|---------|
| Supabase (supabase.com) | Managed Postgres + Auth + Edge Functions + Storage + Realtime |
| Supabase Auth | Authentication (Google OAuth + email/password) |
| Supabase Edge Functions | Server-side logic (Deno runtime) |
| Supabase Realtime | Live subscriptions (if used) |
| Stripe API | Payment processing (dual accounts) |

### Integrations (Reconfigured, Not Replaced)

| Integration | What Changes |
|-------------|-------------|
| Stripe (Management) | Webhook URL only |
| Stripe (Ad Spend) | Webhook URL only |
| Google OAuth | Redirect URI in Google Console + Supabase provider config |
| AlphaHub MCP Server | Supabase URL + API keys in MCP config |

---

## Pre-Migration Checklist Commands

Run these against the OLD Supabase project to assess migration scope:

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Postgres version
SELECT version();

-- Extensions in use
SELECT * FROM pg_extension ORDER BY extname;

-- Table count and sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'supabase_functions', 'extensions', 'graphql', 'graphql_public', 'pgsodium', 'pgsodium_masks', 'realtime', 'vault', '_analytics', '_realtime')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Auth user count
SELECT count(*) FROM auth.users;

-- Storage bucket inventory
SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets;

-- Storage object count per bucket
SELECT bucket_id, count(*) FROM storage.objects GROUP BY bucket_id;

-- RLS policy count
SELECT count(*) FROM pg_policies;

-- Edge function inventory (check supabase/functions/ directory in repo)

-- Active Stripe webhook endpoints (check Stripe Dashboard for both accounts)
```

---

## Post-Migration Verification Commands

```sql
-- On NEW project: verify table counts match
SELECT schemaname, tablename,
       (xpath('/row/count/text()',
        query_to_xml('SELECT count(*) FROM '||schemaname||'.'||tablename, false, true, '')))[1]::text::int as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify auth users migrated
SELECT count(*) FROM auth.users;

-- Verify RLS policies exist
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Verify extensions
SELECT * FROM pg_extension ORDER BY extname;
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Migration path | Apply migration files + data dump | Full pg_dump/restore | Migration files are cleaner; full dump may include Supabase internals that conflict |
| Migration path | Manual migration | $99 automated tool (Next Lovable Migrator) | Production billing data needs full control and auditability |
| Frontend hosting | Netlify | Vercel | Vercel optimizes for Next.js; no advantage for React+Vite |
| Frontend hosting | Netlify | Cloudflare Pages | Netlify has native Supabase integration; CF requires more config |
| Frontend hosting | Netlify | Self-hosted on VPS | VPS adds ops burden (SSL, CDN, builds) that Netlify handles for free |
| Supabase hosting | supabase.com (managed) | Self-hosted via Docker | Managed = less ops, same API surface, automatic backups, easier edge functions |
| Auth approach | Migrate auth.users with pg_dump | Re-invite all users | Re-inviting loses data integrity and disrupts 15+ active clients |
| JWT secret | Different secret (re-login required) | Copy JWT secret | Different secret is simpler; re-login during planned downtime is acceptable |

---

## Sources

### HIGH Confidence (Official Documentation)
- [Supabase CLI - db dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
- [Supabase CLI - db pull](https://supabase.com/docs/reference/cli/supabase-db-pull)
- [Supabase Backup/Restore via CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase Auth User Migration](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects)
- [Supabase Edge Functions Deploy](https://supabase.com/docs/guides/functions/deploy)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase CLI GitHub Releases](https://github.com/supabase/cli/releases) -- v2.76.15 as of 2026-02-25
- [Lovable GitHub Integration](https://docs.lovable.dev/integrations/github)
- [Lovable Self-Hosting Guide](https://docs.lovable.dev/tips-tricks/self-hosting)
- [Stripe Webhook Endpoints API](https://docs.stripe.com/api/webhook_endpoints/update)
- [Stripe Dashboard Webhooks](https://docs.stripe.com/development/dashboard/webhooks)

### MEDIUM Confidence (Multiple Sources Agree)
- [Vercel vs Netlify vs Cloudflare Pages 2025 Comparison](https://www.digitalapplied.com/blog/vercel-vs-netlify-vs-cloudflare-pages-comparison)
- [Cloudflare vs Vercel vs Netlify Edge Performance 2026](https://dev.to/dataformathub/cloudflare-vs-vercel-vs-netlify-the-truth-about-edge-performance-2026-50h0)
- [Netlify Vite Setup Guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)
- [Vercel Vite Deployment](https://vercel.com/docs/frameworks/frontend/vite)

### LOW Confidence (Needs Validation)
- Storage object migration script -- Supabase docs reference it but do not fully document it. Must verify during Phase 5.
- `supabase seed buckets --linked` command -- appears to be in beta (`supabase@beta`). Verify availability at migration time.
