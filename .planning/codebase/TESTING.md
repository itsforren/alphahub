# Testing Patterns

**Analysis Date:** 2026-03-12

## Current State

**No test framework is installed or configured.** The `package.json` contains zero testing dependencies — no Vitest, Jest, Testing Library, Playwright, or Cypress. The `scripts` block has no `test` command. No test files (`.test.*`, `.spec.*`) exist anywhere in the repository.

This is a known gap.

## What Exists

**No test files found.** Searched the entire repository for `*.test.*` and `*.spec.*` — zero results.

**No test config files found.** No `vitest.config.*`, `jest.config.*`, `playwright.config.*`, or `cypress.config.*` files exist.

**ESLint only.** The only code quality tooling is ESLint (configured at `eslint.config.js`) with `typescript-eslint` and `react-hooks` plugins. This catches hook rule violations and TypeScript errors but does not test behavior.

## Run Commands

```bash
# No test commands available currently
npm run lint     # ESLint only — not behavioral tests
npm run build    # TypeScript compile check via vite build
```

## Recommendations

The codebase is well-structured for introducing tests. The following are the highest-value areas and suggested patterns:

### Recommended Framework: Vitest + Testing Library

Vitest integrates with the existing Vite setup with minimal config. Install:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Minimal `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### Where to Add Tests

**Highest value — pure utility and hook logic:**

- `src/hooks/useComputedWalletBalance.ts` — the balance calculation (`totalDeposits - displayedSpend`) is pure logic that currently has no safety net. A regression here causes incorrect billing display.
- `src/lib/utils.ts` — `cn()` utility is trivial but foundational.
- Helper functions exported from hook files: `getSLAStatus()`, `formatSLACountdown()` in `src/hooks/useTicketDashboard.ts`, `isWithinBusinessHours()` in `src/hooks/useChat.ts`, `calculateNextDueDate()` in `src/hooks/useBillingRecords.ts`.

**Medium value — component rendering:**
- `src/components/portal/AgreementSigningWidget.tsx` — simple, stateless, good first component test.
- `src/components/portal/ProfilePhotoUpload.tsx` — file validation logic (type check, size check).
- `src/components/ui/button.tsx` — shadcn components rarely need tests, but custom variants do.

**Lower priority — data-fetching hooks:**
These require mocking Supabase, which is feasible but adds friction. Mock `@/integrations/supabase/client` at the module level.

### Suggested Test File Layout

Co-locate tests with source files:
```
src/
├── hooks/
│   ├── useComputedWalletBalance.ts
│   ├── useComputedWalletBalance.test.ts   ← add here
│   ├── useChat.ts
│   └── useChat.test.ts                    ← isWithinBusinessHours(), etc.
├── components/portal/
│   ├── AgreementSigningWidget.tsx
│   └── AgreementSigningWidget.test.tsx    ← add here
└── test/
    └── setup.ts                           ← global test setup
```

### Example: Testing a Pure Utility Function

```typescript
// src/hooks/useChat.test.ts
import { describe, it, expect, vi } from 'vitest';
import { isWithinBusinessHours } from './useChat';

describe('isWithinBusinessHours', () => {
  it('returns true for Tuesday 10am EST', () => {
    // Mock Date to Tuesday 10am EST (15:00 UTC)
    vi.setSystemTime(new Date('2026-01-06T15:00:00Z'));
    expect(isWithinBusinessHours()).toBe(true);
  });

  it('returns false for Saturday', () => {
    vi.setSystemTime(new Date('2026-01-10T15:00:00Z'));
    expect(isWithinBusinessHours()).toBe(false);
  });

  it('returns false for 6pm EST (23:00 UTC)', () => {
    vi.setSystemTime(new Date('2026-01-06T23:00:00Z'));
    expect(isWithinBusinessHours()).toBe(false);
  });
});
```

### Example: Mocking Supabase for Hook Tests

```typescript
// src/hooks/useClientWallet.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClientWallet } from './useClientWallet';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'wallet-1', client_id: 'client-1', ad_spend_balance: 500 },
        error: null,
      }),
    }),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

it('returns wallet data for a client', async () => {
  const { result } = renderHook(() => useClientWallet('client-1'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.ad_spend_balance).toBe(500);
});
```

### Example: Testing an Edge Function Logic Unit

Edge functions are Deno TypeScript. They can be tested with Deno's built-in test runner if imported as modules:

```typescript
// supabase/functions/add-wallet-credit/index.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test('jsonRes returns correct content-type', () => {
  // Import and test the jsonRes helper
});
```

In practice, edge functions are better covered by integration tests against the Supabase local stack (`supabase start`).

## Test Coverage Gaps

**All business logic is untested.** The highest-risk gaps are:

**Wallet balance calculation (`src/hooks/useComputedWalletBalance.ts`):**
- `remainingBalance = totalDeposits - displayedSpend`
- `displayedSpend = applyPerformancePercentage(trackedSpend, pct)` (from `src/hooks/usePerformancePercentage.ts`)
- Risk: silent regression causes wrong balance displayed to clients
- Priority: **High**

**Billing date calculation (`src/hooks/useBillingRecords.ts`):**
- `calculateNextDueDate()` with `bi_weekly` and `monthly` logic
- Risk: incorrect renewal dates sent to Stripe
- Priority: **High**

**Business hours check (`src/hooks/useChat.ts`):**
- `isWithinBusinessHours()` timezone conversion
- Risk: incorrect UI state for chat availability
- Priority: **Medium**

**SLA status helpers (`src/hooks/useTicketDashboard.ts`):**
- `getSLAStatus()` and `formatSLACountdown()`
- Risk: incorrect urgency displayed in ticket dashboard
- Priority: **Medium**

**Duplicate message suppression (`src/hooks/useChat.ts`, `src/hooks/useAdminChat.ts`):**
- `error.code === '23505'` guard appears in 3+ mutation functions
- Risk: silent failure masking real errors if condition is too broad
- Priority: **Low**

---

*Testing analysis: 2026-03-12*
