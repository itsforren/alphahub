# Phase 6: Cutover & Verification - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Execute the production cutover: full data re-sync from old to new system, switch all external integrations (webhooks, DNS), verify all 7 core features end-to-end, then decommission old Lovable deployment. Both Stripe accounts and lead routing are already partially on the new backend (Phase 4) — this phase completes the transition.

</domain>

<decisions>
## Implementation Decisions

### Maintenance Window Strategy
- Gradual transition, not hard cutover: Stripe + leads switch first, verify, then move users last
- Fix forward if issues arise — no reverting to old system
- Quick heads-up to users the day before (brief, informal)
- Urgency: this week — leads may be broken, agents not receiving them
- Timeline: Stripe + lead routing first (already urgent), then full user cutover

### Delta Sync Approach
- Full re-sync: wipe new DB data and re-import everything from old system right before cutover
- Clean slate approach — no merging with existing webhook-generated data on new system
- Accept small gap of missed writes during sync (old system stays live, no maintenance mode)
- 209 stale pending billing_records cleanup: Claude's discretion on timing (re-sync wipe may handle it)

### External Integration Switchover
- All 17 webhook URLs switched at once during cutover window (not staged)
- Lead router status unknown — needs investigation, agents may not be getting leads
- Old Stripe webhook endpoints: disable immediately during cutover (new ones already active)
- MCP server update: separate task after main cutover (developer tool, not user-facing)

### Feature Verification Process
- Automated checks (scripts hitting API and checking responses), not manual click-through
- All 7 core features must be verified: client management, billing, wallets, campaigns, leads, comms, projections
- Go/no-go: everything must pass before DNS switch — no exceptions
- Post-cutover: monitor for 24-48 hours (Stripe webhooks, lead flow, error logs)

### Claude's Discretion
- Stale billing_records cleanup timing (before vs during re-sync)
- Exact re-sync technical approach (bridge function reuse vs new method)
- Order of operations within the "all at once" webhook switch
- Automated verification script design and pass/fail thresholds
- Post-cutover monitoring approach

</decisions>

<specifics>
## Specific Ideas

- User wants parallel-run approach: new system handles Stripe payments while users still sign in on old one, then verify everything works before full switch
- Lead routing is the most urgent concern — agents may not be getting leads, this needs investigation and fixing ASAP
- Sequence: re-sync data -> confirm billing correct -> fix bugs -> point domain to new system
- "I just want it right before we do the official cutover"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-cutover-verification*
*Context gathered: 2026-03-02*
