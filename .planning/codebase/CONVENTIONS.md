# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `NPSPopup.tsx`, `Navbar.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useClients.ts`, `useChat.ts`)
- Utilities: camelCase (e.g., `tracking.ts`, `utils.ts`)
- Context files: PascalCase (e.g., `AuthContext.tsx`, `CalculatorContext.tsx`)
- Pages: PascalCase (e.g., `Index.tsx`, `Pricing.tsx`)

**Functions:**
- React components: PascalCase (exported as named exports)
- Hooks: camelCase starting with `use` (e.g., `useClients()`, `useUpdateClient()`)
- Utility functions: camelCase (e.g., `formatCurrency()`, `detectTrafficSource()`)
- Internal helpers: camelCase (e.g., `checkShouldShowNPS()`, `handleScoreSelect()`)

**Variables:**
- State variables: camelCase (e.g., `isOpen`, `feedback`, `score`)
- Constants: UPPER_SNAKE_CASE (e.g., `VISITOR_ID_KEY`, `SESSION_ID_KEY`, `STATIC_PREMIUM_AMOUNT`)
- Type discriminators: lowercase literals (e.g., `'score' | 'feedback' | 'review_offer' | 'thank_you'`)

**Types/Interfaces:**
- Interfaces: PascalCase (e.g., `NPSPopupProps`, `Client`, `AuthContextType`)
- Type aliases: PascalCase (e.g., `NPSStep`, `AppRole`)
- Database row/record types: Singular (e.g., `Client` not `Clients`)
- Props interfaces: ComponentNameProps pattern (e.g., `NPSPopupProps`)

## Code Style

**Formatting:**
- No explicit formatter configured (Prettier not in dependencies)
- Tab size: 2 spaces (based on file structure)
- Line length: No hard limit observed
- Arrow functions preferred over `function` keyword for components and callbacks

**Linting:**
- ESLint configured with TypeScript support
- Config: `eslint.config.js` (flat config format)
- Key rules:
  - `@typescript-eslint/no-unused-vars`: OFF (disabled to allow flexibility)
  - `react-refresh/only-export-components`: WARN (allows constant exports)
  - `react-hooks/rules-of-hooks`: ENABLED (enforced)
  - Default ESLint recommended rules enabled

**TypeScript:**
- `tsconfig.app.json` targets ES2020
- `strict: false` (not strict mode)
- `noUnusedLocals: false` and `noUnusedParameters: false` (lenient)
- `noImplicitAny: false` (implicit any allowed)
- `jsx: "react-jsx"` (modern JSX transform)
- Path aliases configured: `@/*` maps to `./src/*`

## Import Organization

**Order:**
1. React and core libraries (e.g., `import { useState } from 'react'`)
2. Third-party UI libraries (e.g., `@radix-ui/react-dialog`, `lucide-react`)
3. Motion/animation libraries (e.g., `framer-motion`)
4. Form/state libraries (e.g., `@tanstack/react-query`, `react-hook-form`)
5. Internal integrations (e.g., `import { supabase } from '@/integrations/supabase/client'`)
6. Internal contexts (e.g., `import { useAuth } from '@/contexts/AuthContext'`)
7. Internal components (e.g., `import { Button } from '@/components/ui/button'`)
8. Internal utilities and hooks (e.g., `import { cn } from '@/lib/utils'`)
9. Asset imports (e.g., `import nfiaLogo from '@/assets/nfia-logo.png'`)

**Path Aliases:**
- `@/*` → `./src/*` (always use this, never relative paths like `../../../`)
- `@/components` → components subdirectory
- `@/hooks` → hooks subdirectory
- `@/lib` → utility libraries
- `@/integrations` → external service integrations

Barrel files not extensively used. Direct imports preferred.

## Error Handling

**Patterns:**
- Supabase queries: Destructure `{ data, error }` and check `if (error) throw error;`
- React Query mutations: Handle errors via `onError` callback for toast notifications
- Try-catch blocks used sparingly, mainly in top-level async functions
- Error messages surfaced to user via `toast.error()` from `sonner` library
- Silent failures allowed for non-critical operations (e.g., tracking): `console.debug()` then return
- Console error logging: `console.error()` for debugging, not production telemetry

**Example patterns:**
```typescript
// Supabase query pattern
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('id', clientId)
  .single();

if (error) throw error;
return data as Client;

// React Query mutation pattern
return useMutation({
  mutationFn: async ({ clientId, updates }) => {
    // implementation
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    toast.success('Client updated successfully');
  },
  onError: (error: Error) => {
    toast.error(error.message || 'Failed to update client');
  },
});

// Silent failure pattern
try {
  // async operation
} catch (error) {
  console.debug("Tracking event failed:", error);
  // don't throw - tracking should not break UX
}
```

## Logging

**Framework:** No dedicated logging library. Direct use of `console` object.

**Patterns:**
- `console.error()`: Error cases (e.g., "Error checking NPS eligibility:", error)
- `console.debug()`: Non-critical operational messages (e.g., "[Tracking] First-touch referral code captured")
- No production telemetry logger configured
- Debug logs often include context prefix in brackets (e.g., "[Tracking]")

**When to log:**
- Errors that affect UX but aren't displayed to user
- Debug state transitions in complex flows
- Attribution/tracking lifecycle events for troubleshooting
- Never log sensitive data (passwords, API keys, PII)

## Comments

**When to Comment:**
- Complex business logic requiring explanation (e.g., attribution tracking rules)
- Non-obvious workarounds or hacks
- Multi-step processes that need sequential explanation
- Rare: one-liners are self-documenting due to clear naming

**JSDoc/TSDoc:**
- Not heavily used
- Block comments used for function/module documentation in utility files
- Example from `tracking.ts`:
```typescript
/**
 * Attribution Tracking Library
 *
 * Implements Hyros-style multi-touch attribution tracking including:
 * - Persistent visitor ID across sessions
 * - UTM parameter capture and storage
 * - Page view and event tracking
 */
```

- Inline comments for clarification of intent (CRITICAL, IMPORTANT prefixes used)
- No individual function JSDoc blocks observed

## Function Design

**Size:** Generally compact, 20-100 lines for most hooks. No strict limit enforced.

**Parameters:**
- Single object parameter preferred for multiple args (e.g., `{ clientId, updates }`)
- Destructuring in parameter list
- Optional parameters marked with `?`
- Type annotations always present for parameters

**Return Values:**
- Explicit return type annotations for all functions
- React Query hooks return `useQuery()` or `useMutation()` objects
- Async functions return Promises with explicit type
- Generic functions use type parameters (e.g., `Record<string, string>`)

## Module Design

**Exports:**
- Named exports preferred (no default exports observed in hooks/utils)
- Interfaces exported alongside implementations
- Context providers exported as named functions
- Components exported as named exports

**Barrel Files:**
- Not used. Direct imports from source files required.
- Example: `import { Button } from '@/components/ui/button'` (not from barrel)

**Compartmentalization:**
- `/hooks` directory: All React Query hooks and custom hooks
- `/components/ui` directory: shadcn/ui primitives
- `/components/[feature]` directories: Feature-specific components
- `/contexts` directory: React context providers
- `/lib` directory: Utility functions and helpers
- `/integrations/supabase` directory: Database client and types

## Async/Await

- Consistently used for Supabase queries and mutations
- Promise-based error handling with `.then()` and `.catch()` not used
- `await` used within `async` functions throughout

## Conditional Rendering

- Inline ternary for simple conditions
- Early returns for complex branching
- Logical AND (`&&`) for existence checks
- `AnimatePresence` with conditional `motion.div` for multi-step flows

## State Management

- React `useState` for component-level state
- React Context for app-level state (auth, notifications, calculator)
- TanStack React Query for server state (client data, billing records, etc.)
- No Redux or global state management observed
- localStorage and sessionStorage for persistence

---

*Convention analysis: 2026-03-04*
