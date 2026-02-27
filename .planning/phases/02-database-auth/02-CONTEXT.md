# Phase 2: Database & Auth - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the full database (all schemas, tables, data, functions, triggers, extensions, RLS policies) and all auth users from the Lovable-managed Supabase project to the new self-managed Supabase project. Everything must work identically. Phase 6 handles delta sync and cutover.

</domain>

<decisions>
## Implementation Decisions

### Data scope & cleanup
- Exact copy — mirror every row, every table, no cleanup or pruning during migration
- Point-in-time snapshot is acceptable; Phase 6 handles delta sync before cutover
- All data is critical, with ad spend tracking, billing payments, referrals, attribution, and offline conversions being especially high-stakes
- Full-fidelity migration with thorough verification across the board

### Unknown DB objects
- Migrate everything regardless of whether code references it — safety over leanness
- Include ALL schemas, not just public (custom schemas, any Lovable-created schemas)
- All database functions, triggers, extensions, and custom types — full fidelity
- Include Lovable-specific internal objects if found — don't filter anything out, clean up later if needed

### Auth migration scope
- Attempt full auth state migration: credentials, sessions, refresh tokens, metadata
- If sessions can't carry over (different JWT signing keys), one-time re-login is acceptable — passwords must work
- Preserve all auth metadata fields (raw_user_meta_data, etc.) even if purpose is unknown
- TOTP MFA configuration must be preserved and functional
- User notification about migration: defer to Phase 6 cutover decision

### Verification standard
- Claude's discretion on row count verification depth (critical tables exact match at minimum)
- Value spot-checks required for critical financial data: wallet balances, billing totals, ad spend figures
- Automated RLS verification: script confirms RLS enabled on every public table and anon key gets blocked from protected data
- User will manually test login with their own account as final auth confirmation

### Claude's Discretion
- Schema migration approach (pg_dump/restore, migration replay, or hybrid)
- Order of operations for schema vs data import
- Which specific tables/values to spot-check (prioritize by financial risk)
- Technical approach for session/token migration attempt
- RLS verification script design

</decisions>

<specifics>
## Specific Ideas

- "We need to be very delicate with this on verifying it was migrated correctly, because all this stuff is very important"
- Ad spend tracking daily, billing payments, referrals, attribution, offline conversions called out as especially critical data
- User wants to be hands-on for auth verification (manual login test)
- Delta sync concept confirmed understood and accepted for Phase 6

</specifics>

<deferred>
## Deferred Ideas

- User notification about migration — decide during Phase 6 cutover planning
- Data cleanup/pruning — can be done post-migration if needed, not during

</deferred>

---

*Phase: 02-database-auth*
*Context gathered: 2026-02-27*
