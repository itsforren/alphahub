# Lovable Migration Guide — Official Instructions

Captured from Lovable support + official docs (2026-02-26).

## Source: Lovable Support Response

> The migration is doable if you follow the guide carefully, but it does involve several manual steps:
> - Creating a new Supabase project and updating credentials
> - Running database migrations in the correct order
> - Exporting/importing your data as CSV files
> - Reconfiguring authentication providers
> - Migrating storage files and secrets

> After migrating, you'll need to continue development in a local environment or your preferred IDE. Changes made in Lovable after migration won't sync with your new Supabase setup.

## Source: docs.lovable.dev/tips-tricks/external-deployment-hosting

### Frontend Deployment

**Build configuration:**
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22

**Required environment variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**SPA routing:** Must enable fallback to `index.html` on hosting platform.

**OAuth redirect URLs:** Must be updated with new production domain.

### Backend Migration to Managed Supabase

**Prerequisites:**
- New Supabase project created
- Project ID, API key, and URL saved

**Migration steps (IN ORDER):**
1. Update `.env` with new Supabase credentials
2. Modify `supabase/config.toml` with new project ID
3. Execute SQL migrations from `supabase/migrations/` in **chronological order**
4. Export/import data as CSV files
5. Reconfigure authentication providers
6. Migrate storage files manually
7. Set up external service credentials

### Key Detail: Migration Files vs pg_dump

Lovable recommends applying the `supabase/migrations/` files in order rather than doing a full pg_dump/restore. This is important because:
- Migration files are version-controlled and known-good
- They include RLS policies, functions, triggers as part of the migration sequence
- pg_dump may miss Lovable-specific configurations

However, our research found 133+ migration files for 111 tables — so this is a LARGE migration set. Consider whether applying migrations or using pg_dump is more reliable for this scale.

### Data Migration: CSV Approach

Lovable specifically recommends CSV export/import for data. This means:
- Export each table to CSV from old Supabase
- Import CSV into new Supabase project
- Must handle foreign key ordering (parent tables first)
- Must handle data types that don't serialize well to CSV (JSONB, arrays, timestamps)

### Auth Migration Notes

From Supabase docs (confirmed by our research):
- Auth users CAN be migrated with password hashes via pg_dump of auth schema
- This is better than CSV for auth because it preserves hashed passwords
- TOTP MFA configuration needs to be reconfigured

### Storage Migration

- Manual file migration required
- 3 buckets: media (public), agreements (private), chat-attachments (public)
- Must recreate bucket policies on new project

### Edge Function Deployment

- All 90+ edge functions need to be deployed via `supabase functions deploy`
- Secrets must be configured via `supabase secrets set`
- `config.toml` must be updated with new project ID
- CORS origins must include new domain

## Lovable-Specific Code to Remove

- `lovable-tagger` dev dependency
- Any Lovable-specific environment references
- Lovable Cloud-specific configurations

## Post-Migration Important Note

> Changes made in Lovable after migration won't sync with your new Supabase setup.

This means: once we migrate, the Lovable editor is no longer usable for this project. All development moves to Claude Code / local IDE. This is the desired outcome.
