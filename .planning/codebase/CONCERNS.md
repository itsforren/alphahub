# Codebase Concerns

**Analysis Date:** 2026-03-04

## Tech Debt

**Incomplete Behind-Pace Calculation:**
- Issue: Campaign command center shows hard-coded `behindPaceCount = 0` instead of actual calculation
- Files: `src/hooks/useCampaignCommandCenter.ts` (line 665)
- Impact: Dashboard reports don't reflect true campaign pacing performance; clients may miss optimization opportunities
- Fix approach: Implement proper pacing calculation based on spend rate vs budget allocation, integrate with daily spend tracking

**Performance Percentage String Conversion:**
- Issue: Performance percentage stored as string in `onboarding_settings.setting_value`, converted with `Number()` on each query
- Files: `src/hooks/usePerformancePercentage.ts` (lines 19-24)
- Impact: Adds computation on every wallet calculation, slightly increases latency for frequent balance checks
- Fix approach: Store performance percentage as numeric column in database, migrate existing string values

**Stripe Key Lazy Loading Race Condition:**
- Issue: `fetchKeys()` in stripe config can be called simultaneously from multiple Stripe instances, all creating new promises
- Files: `src/config/stripe.ts` (lines 6-21)
- Impact: Multiple concurrent key fetches waste API calls and may cause race conditions in key initialization
- Fix approach: Implement promise memoization with proper deduplication to ensure only one fetch in-flight

## Known Bugs

**Video HLS Loading Without Error Boundary:**
- Issue: HLS.js initialization in FollowUpCallVideo lacks error handling
- Files: `src/pages/FollowUpCallVideo.tsx` (lines 20-32)
- Impact: If HLS library fails to load or video URL is invalid, page displays blank with no user feedback
- Workaround: None—user sees broken video player
- Root cause: No try-catch wrapping the dynamic import of hls.js

**Low Balance Check Potential Race Condition:**
- Issue: `useComputedWalletBalance` triggers low balance check on mount without preventing duplicate invocations
- Files: `src/hooks/useComputedWalletBalance.ts` (lines 92-123)
- Impact: Multiple client detail tabs open simultaneously may trigger multiple low-balance checks for same client in rapid succession
- Workaround: Relies on `lowBalanceCheckedRef` but async function does not prevent overlapping calls
- Root cause: `lowBalanceCheckedRef` only prevents within single component instance; doesn't prevent across instances

**Wallet Deposit Duplication Risk in sync-stripe-charges:**
- Issue: `ensureWalletDeposit()` checks existence of deposit BEFORE inserting but doesn't handle race condition between check and insert
- Files: `supabase/functions/sync-stripe-charges/index.ts` (lines 58-123)
- Impact: If two sync runs occur simultaneously for same billing record, duplicate wallet deposits may be created (violates idempotency)
- Workaround: Database unique constraint on (billing_record_id) prevents actual duplicates but creates failed inserts
- Root cause: Check-before-insert pattern without database-level locking

**Client Wallet Tracking Start Date Not Set on Initial Deposit:**
- Issue: New clients without tracking_start_date have wallet created in sync-stripe-charges but tracking may not start until next paid invoice
- Files: `supabase/functions/sync-stripe-charges/index.ts` (lines 83-104)
- Impact: Wallet balance calculations may be incomplete if tracking_start_date is null when balance is queried
- Workaround: `useComputedWalletBalance` checks for null tracking_start_date but returns 0 spend which is incorrect
- Root cause: Tracking start date only set when first paid invoice processed, not on wallet creation

## Security Considerations

**Unsafe Type Assertions in ClientDetail:**
- Risk: Multiple `as any` casts throughout ClientDetail component without validation
- Files: `src/pages/portal/admin/ClientDetail.tsx` (lines 1605, and throughout)
- Current mitigation: Supabase auth and RLS policies on database level
- Recommendations:
  - Remove unnecessary `as any` casts
  - Use proper type guards for client data before casting
  - Validate subaccount_id structure before using in GHL API calls

**localStorage Used for Tracking IDs:**
- Risk: Visitor ID, session ID, and attribution data stored in localStorage without encryption
- Files: `src/lib/tracking.ts` (lines with localStorage access)
- Current mitigation: Data is non-sensitive user attribution/session info
- Recommendations:
  - Consider migrating to sessionStorage for session-specific data
  - Add CSRF token validation for attribution tracking submissions

**Missing Input Validation on Agreement Signing:**
- Risk: NPN, phone, address fields accepted without validation format
- Files: `src/pages/hub/SignAgreement.tsx` (agreement input fields)
- Current mitigation: Client-side validation only
- Recommendations:
  - Add server-side validation for NPN format (must be valid insurance producer number)
  - Validate phone format before storing
  - Sanitize address fields for injection attacks

**Stripe Config Exposed in Browser Bundle:**
- Risk: `getStripePromise()` exposes publishable keys but no validation of key format
- Files: `src/config/stripe.ts`
- Current mitigation: Stripe publishable keys are safe by design
- Recommendations:
  - Consider caching stripe instances at session level instead of process level
  - Add fallback if key fetch fails instead of returning empty string

## Performance Bottlenecks

**useComputedWalletBalance Expensive Triple Query Pattern:**
- Problem: Wallet balance calculation fetches wallet metadata, deposits, and daily spend in three separate queries
- Files: `src/hooks/useComputedWalletBalance.ts` (lines 27-80)
- Cause: Separate query for wallet config, deposits sum, and spend sum
- Improvement path:
  - Combine wallet metadata + deposits into single query with aggregation
  - Use database view for `total_deposits_by_client` and cache aggressively
  - Consider denormalized `wallet_balance_cache` table updated by triggers

**Campaign Command Center Queries Entire Campaign List:**
- Problem: `useCampaignCommandCenter` fetches ALL campaigns to compute stats instead of using aggregates
- Files: `src/hooks/useCampaignCommandCenter.ts` (lines 620-700)
- Cause: Multiple filter and count operations on full dataset in JavaScript
- Improvement path:
  - Create `campaign_stats_view` in Supabase with pre-computed counts by status
  - Use aggregation functions in query instead of fetching and filtering in JS
  - Implement caching with 5-minute TTL for dashboard stats

**Stripe Sync Promise.all() Unbounded Parallelism:**
- Problem: `syncGlobal()` calls `Promise.all()` on all pending records without rate limiting
- Files: `supabase/functions/sync-stripe-charges/index.ts` (line 322)
- Cause: No concurrent request limiting for Stripe API calls
- Improvement path:
  - Implement queue with max 5 concurrent Stripe fetches
  - Add exponential backoff for rate-limited responses (429)
  - Split sync into batches of 50 records max

**Billing Records No Pagination on Large Accounts:**
- Problem: `sync-stripe-charges` fetches ALL billing records without cursor-based pagination
- Files: `supabase/functions/sync-stripe-charges/index.ts` (line 309)
- Cause: Supabase query assumes all records fit in memory
- Improvement path:
  - Implement cursor-based pagination with 100-record batches
  - Process in chunks to avoid timeout on high-volume accounts

## Fragile Areas

**ClientDetail Component Complexity:**
- Files: `src/pages/portal/admin/ClientDetail.tsx`
- Why fragile: 1678 lines handling multiple tabs, nested API calls, state synchronization across onboarding/billing/wallets
- Safe modification:
  - Extract each tab into separate component
  - Create custom hooks for each data domain (useClientOnboarding, useClientBilling, useClientWallet)
  - Use composition over monolithic page component
- Test coverage: Appears to be no dedicated unit tests; relies on manual testing

**Agreement Signing Flow State Management:**
- Files: `src/pages/hub/SignAgreement.tsx` (1699 lines)
- Why fragile: Complex state tracking for OTP, signature, initials, key term checkboxes across multiple steps
- Safe modification:
  - Break into smaller step components (OTPStep, SignatureStep, InitialsStep)
  - Use reducer pattern for state instead of multiple useState
  - Add step validation guards
- Test coverage: No automated tests; one-off signature flow

**useCampaignCommandCenter Hook:**
- Files: `src/hooks/useCampaignCommandCenter.ts` (1125 lines)
- Why fragile: Complex data aggregation, multiple status enums, proposal workflow with approval/denial branches
- Safe modification:
  - Extract stats calculation into pure function with unit tests
  - Separate read queries from write mutations into separate hooks
  - Add input validation on proposal actions
- Test coverage: No tests for calculation logic; high risk of silent calculation errors

**Billing and Wallet Interaction:**
- Files: Multiple files interacting (useBillingRecords, useClientWallet, useComputedWalletBalance, sync-stripe-charges)
- Why fragile: Payment flow depends on precise sequencing: billing record → wallet deposit → balance calculation
- Safe modification:
  - Document data flow in README
  - Add integration tests covering full payment flow
  - Add logging/observability to detect sync failures early
- Test coverage: No tests; full flow only verified manually

## Scaling Limits

**Wallet Spend Aggregation on Query Time:**
- Current capacity: Works up to ~10k daily spend records per client
- Limit: Query timeout when summing >50k daily spend entries per client
- Scaling path:
  - Create `client_wallet_spend_aggregates` table with daily/monthly summaries
  - Update via triggers on ad_spend_daily inserts
  - Use aggregates for balance calculations instead of full table scan

**sync-stripe-charges Pagination Limit:**
- Current capacity: 250 invoices per customer (5 pages × 50)
- Limit: Accounts with >250 invoices won't sync older invoices
- Scaling path:
  - Remove page limit (line 162) or increase to 1000
  - Implement cursor tracking to resume from last synced invoice
  - Add batch reconciliation for historical data

**Proposal Execution Concurrency:**
- Current capacity: Single proposal execution at a time per campaign
- Limit: If 50 proposals approved simultaneously, approval handler may timeout
- Scaling path:
  - Queue proposal executions with worker pattern
  - Track execution status separately from proposal status
  - Add retry logic for failed executions

**File Storage Without Limits:**
- Current capacity: Agreement PDFs, screenshots, documents stored without quota
- Limit: Storage will grow unbounded with no cleanup policy
- Scaling path:
  - Implement retention policy (delete documents >1 year old)
  - Add file size limits on upload
  - Use Supabase storage object lifecycle policies

## Dependencies at Risk

**Stripe SDK Version Pinned Without Updates:**
- Risk: `@stripe/stripe-js@^8.7.0` may have security updates
- Impact: Missing security patches in Stripe integration
- Migration plan:
  - Quarterly dependency updates
  - Review Stripe changelog before updating
  - Test payment flows after any Stripe upgrade

**React Query Version Gap:**
- Risk: `@tanstack/react-query@^5.83.0` released in late 2024, potential bugs in minor versions
- Impact: Silent query state bugs, race conditions in data fetching
- Migration plan:
  - Update to latest 5.x version quarterly
  - Monitor GitHub issues for critical bugs
  - Add regression tests for cache invalidation logic

**Deprecated Plaid Integration:**
- Risk: `react-plaid-link@^4.1.1` has moving target for Plaid API versions
- Impact: Account link failures, changing authentication requirements
- Migration plan:
  - Plan migration to Plaid's web components
  - Monitor Plaid deprecation timeline
  - Add feature flag to disable Plaid if API breaks

**HLS.js Runtime Loading:**
- Risk: `hls.js` loaded at runtime without version pinning
- Impact: Breaking changes in HLS.js could crash video playback
- Migration plan:
  - Add version pinning in dynamic import or package.json
  - Add error boundary for HLS initialization
  - Consider native video player fallback

## Missing Critical Features

**No End-to-End Encryption for Payment Data:**
- Problem: Billing records stored in plain text; no PCI compliance features
- Blocks: Cannot legally handle credit card data end-to-end
- Priority: High if handling direct card data

**No Audit Trail for Financial Changes:**
- Problem: Wallet deposits, billing updates have no change history
- Blocks: Cannot investigate billing discrepancies or client disputes
- Priority: High for compliance

**No Webhook Validation Signature:**
- Problem: stripe-webhook doesn't validate Stripe signature header
- Blocks: Cannot detect forged webhook events
- Priority: Critical

**No Idempotency Keys on Payment Operations:**
- Problem: Payment mutations in billing workflow lack idempotency tokens
- Blocks: Retry logic may charge client twice
- Priority: Critical

**No Circuit Breaker for Stripe API:**
- Problem: If Stripe API is down, sync functions fail and block webhooks
- Blocks: Cannot gracefully degrade when external service fails
- Priority: Medium

## Test Coverage Gaps

**No Tests for Wallet Balance Calculations:**
- What's not tested: The entire `useComputedWalletBalance` calculation, performance percentage application
- Files: `src/hooks/useComputedWalletBalance.ts`, `src/hooks/usePerformancePercentage.ts`
- Risk: Silent calculation errors could under/over-bill clients
- Priority: High

**No Tests for Billing Sync Logic:**
- What's not tested: sync-stripe-charges function, invoice mapping, wallet deposit creation
- Files: `supabase/functions/sync-stripe-charges/index.ts`
- Risk: Billing records may not sync or create duplicate deposits
- Priority: Critical

**No Tests for Agreement Signing:**
- What's not tested: OTP verification flow, signature data storage, initials section completion
- Files: `src/pages/hub/SignAgreement.tsx`
- Risk: Agreements may not store properly, bypassing legal requirements
- Priority: High

**No Tests for Campaign Proposal Approval:**
- What's not tested: Proposal execution, budget updates, approval workflow
- Files: `src/hooks/useCampaignCommandCenter.ts`, proposal mutations
- Risk: Campaigns may not update budgets or execute proposals correctly
- Priority: High

**No Integration Tests for Payment Flow:**
- What's not tested: End-to-end from stripe webhook → billing record → wallet deposit → balance update
- Files: Multiple files (stripe-webhook, sync-stripe-charges, useClientWallet, useComputedWalletBalance)
- Risk: Payment sync failures go undetected until client reports missing credits
- Priority: Critical

**No E2E Tests:**
- What's not tested: UI flows, form submissions, client portal features
- Files: All frontend code
- Risk: Regressions in critical user paths not caught
- Priority: Medium

---

*Concerns audit: 2026-03-04*
