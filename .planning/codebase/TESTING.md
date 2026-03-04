# Testing Patterns

**Analysis Date:** 2026-03-04

## Test Framework

**Status:** Not configured
- No test framework (Jest, Vitest) in package.json
- No test files found in codebase (zero `.test.ts`, `.spec.ts` files)
- No test scripts in `package.json`
- No test configuration files (`jest.config.js`, `vitest.config.ts`, etc.)

**Testing Readiness:**
- TypeScript and ESLint configured for code quality
- Linting enforces react-hooks rules (helps prevent hook violations)
- Type safety provides compile-time error catching
- No runtime test coverage

## Code Quality Mechanisms (Non-Test)

**Type Safety:**
- Strict type annotations throughout (`tsconfig.app.json` has TypeScript strict disabled but types are explicit in code)
- Supabase auto-generated types ensure database contract correctness
- React component props typed via interfaces (`NPSPopupProps`, etc.)

**Linting Rules:**
- `eslint-plugin-react-hooks` enforces rules of hooks (dependency arrays, hook ordering)
- ESLint configuration in `eslint.config.js` targets `**/*.{ts,tsx}`
- Run linting: `npm run lint`

**Manual Verification Patterns:**
- Supabase query result type casting: `return data as Client[]`
- Error checking in mutations: `if (error) throw error;`
- React Query `enabled` conditions prevent invalid queries: `enabled: !!clientId`
- Optional chaining and nullish coalescing for undefined values

## Data Layer Testing Approaches

**React Query Implementation:**
All data fetching uses TanStack React Query (v5.83.0) with hooks pattern:

```typescript
// Query pattern - reads are cached and managed
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data as Client[];
    },
  });
}

// Mutation pattern - writes with optimistic updates
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, updates }: { clientId: string; updates: Partial<Client> }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] });
      toast.success('Client updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update client');
    },
  });
}
```

**Validation at Hook Level:**
- `enabled` conditions prevent queries when params undefined
- Type guards on nullable IDs: `if (!clientId) return null;`
- Result casting ensures type safety with database types

## Component Testing Approaches

**Pattern Verification:**
Components use standard React patterns testable through integration:
- Props interface validation via TypeScript
- Conditional rendering with clear boolean flags
- Event handlers via onClick, onChange etc.
- External dependencies injected via props

**Example testable component:**
```typescript
interface NPSPopupProps {
  clientId: string;
  clientName: string;
  onComplete?: () => void;
}

export function NPSPopup({ clientId, clientName, onComplete }: NPSPopupProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<NPSStep>('score');
  const [score, setScore] = useState<number | null>(null);

  // Effects, event handlers, render logic
}
```

Components are:
- Prop-typed and composable
- Use standard React hooks
- Manage state explicitly with useState
- Can be imported and used in tests via React Testing Library

## Integration Testing Patterns

**Supabase Integration:**
Database operations integrated via:
- Supabase JS client: `src/integrations/supabase/client.ts`
- Auto-generated types: `src/integrations/supabase/types.ts`
- React Query hooks abstract database calls
- All Supabase calls use same client instance

**Auth Context:**
Central authentication state in `src/contexts/AuthContext.tsx`:

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; requiresMFA?: boolean }>;
  signOut: () => Promise<void>;
  // ... other methods
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
    // ... initialization
  }, []);
}
```

Could be tested by:
- Mocking Supabase auth methods
- Verifying context value changes
- Testing hook usage within Auth boundaries

## Error Handling & Edge Cases

**Patterns in place (without formal tests):**

1. **Null/undefined checks:**
```typescript
export function useClient(clientId?: string) {
  return useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      if (!clientId) return null;  // Early return for undefined
      // ... query
    },
    enabled: !!clientId,  // Conditional query execution
  });
}
```

2. **Supabase error propagation:**
```typescript
const { data, error } = await supabase.from('clients').select('*');
if (error) throw error;  // Throws to React Query error handler
```

3. **User feedback on errors:**
```typescript
onError: (error: Error) => {
  toast.error(error.message || 'Failed to update client');
}
```

4. **Silent failures for non-critical:**
```typescript
try {
  await supabase.functions.invoke("track-event", { body: payload });
} catch (error) {
  console.debug("Tracking event failed:", error);
  // Don't throw - tracking must not break UX
}
```

## File Locations & Organization

**Test Cohabitation Pattern:**
- No test files observed
- If implemented, would likely use co-located pattern
- Example: `src/components/portal/NPSPopup.test.tsx` alongside `src/components/portal/NPSPopup.tsx`

**Hook testing:**
- Would be in `src/hooks/__tests__/` or `src/hooks/useClients.test.ts`
- Can use React Testing Library with `@testing-library/react-hooks`

**Utility testing:**
- `src/lib/tracking.test.ts` alongside `src/lib/tracking.ts`
- Can use plain Node testing (Jest/Vitest)

## Key Modules Needing Tests

**High Priority (complex logic):**
1. `src/lib/tracking.ts` - Complex attribution logic, multiple storage mechanisms, first-touch rules
2. `src/hooks/useClients.ts` - Multiple query variants, mutation handlers with cache invalidation
3. `src/contexts/AuthContext.tsx` - Auth state management, MFA handling, session persistence
4. `src/components/portal/NPSPopup.tsx` - Multi-step state machine, conditional rendering

**Medium Priority (business logic):**
1. `src/hooks/useChat.ts` - Chat state and message handling
2. `src/hooks/useBillingRecords.ts` - Financial calculations
3. `src/pages/app/Courses.tsx` and related - Course access logic
4. Custom hooks in `src/hooks/` directory

**Lower Priority (UI/presentational):**
1. Simple component renders
2. Navigation/routing (React Router integration)
3. Form interactions without complex state

## Recommended Testing Strategy

**If testing is to be implemented:**

1. **Setup:**
   - Add Vitest (modern, fast, Vite-native) or Jest
   - Add React Testing Library for component testing
   - Add @testing-library/react-hooks for hook testing
   - Add test script to `package.json`: `"test": "vitest"`

2. **Priority order:**
   - Start with utility functions in `src/lib/tracking.ts` (pure logic)
   - Move to React hooks in `src/hooks/` (isolated with mocks)
   - Integration tests for auth flows
   - Component rendering tests

3. **Mocking strategy:**
   - Mock Supabase client entirely in unit tests
   - Mock React Query for hook tests
   - Use real context in integration tests
   - Mock external services (tracking, toasts)

4. **Coverage targets:**
   - Aim for 70%+ coverage on utility functions
   - 50%+ on React components (hard to achieve without E2E)
   - 80%+ on hooks (easier to test with mocks)

## Type-Driven Development

**Current strengths:**
- TypeScript ensures prop contracts are verified
- Supabase types auto-generated from database schema
- Interface definitions catch type mismatches at compile time
- Type narrowing prevents many runtime errors

**Example:**
```typescript
export interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
  // ... 85 more fields
}

export interface OnboardingTask {
  id: string;
  client_id: string;
  task_name: string;
  completed: boolean;
  // ...
}

// Usage - TypeScript prevents passing wrong type
const client: Client = { /* must match all required fields */ };
const task: OnboardingTask = { /* different shape */ };
```

This type safety replaces many unit tests that would otherwise verify data shapes.

---

*Testing analysis: 2026-03-04*

**Note:** Codebase currently has zero test files and no testing framework configured. This document describes current patterns and recommended approaches if testing is to be added.
