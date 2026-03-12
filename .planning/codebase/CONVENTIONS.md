# Coding Conventions

**Analysis Date:** 2026-03-12

## Naming Patterns

**Files:**
- React components: PascalCase, `.tsx` extension — `CampaignPanel.tsx`, `AdminChatView.tsx`, `ProfilePhotoUpload.tsx`
- Hooks: camelCase with `use` prefix, `.ts` extension — `useClientWallet.ts`, `useComputedWalletBalance.ts`
- Pages: PascalCase, `.tsx` extension — `TicketDashboard.tsx`, `TeamChat.tsx`
- Config files: camelCase, `.ts` extension — `stripe.ts`, `webhook.ts`
- Edge functions: kebab-case directories, each with `index.ts` — `add-wallet-credit/index.ts`

**Functions:**
- React components: PascalCase named exports — `export function CampaignPanel(...)`
- Hooks: camelCase named exports — `export function useClientWallet(...)`
- Edge function handlers: helper functions in camelCase — `decryptToken`, `encryptToken`, `getAgencyToken`
- Local helpers in components: camelCase — `handleBuildCampaign`, `handleSubmit`, `buildGoogleAdsUrl`
- Handler naming convention: `handle` prefix for event handlers — `handleFileSelect`, `handleSubmit`

**Variables:**
- camelCase throughout — `clientId`, `queryClient`, `isUploading`
- Boolean state flags: `is` prefix — `isBuilding`, `isSavingManual`, `isUploading`
- Ref flags: descriptive past-tense — `isSendingRef`, `isInitialLoad`, `prevConversationId`
- Constants (module-level): SCREAMING_SNAKE_CASE — `MESSAGES_PER_PAGE`, `DEFAULT_LOW_BALANCE_THRESHOLD`, `GHL_API_BASE`

**Types / Interfaces:**
- PascalCase, `interface` preferred over `type` for object shapes
- `type` used for unions — `type AppRole = 'admin' | 'member' | 'guest' | 'client' | 'referrer'`
- `type` used for local discriminated unions — `type NPSStep = 'score' | 'feedback' | 'review_offer' | 'thank_you'`
- Database enum types imported from generated types: `type TicketPriority = Database['public']['Enums']['ticket_priority']`

## Code Style

**Formatting:**
- No Prettier configured. Code is formatted manually.
- 2-space indentation throughout.
- Single quotes for strings in TypeScript (`'admin'`, `'client'`).
- Double quotes for JSX attribute strings (`className="..."`) — standard JSX convention.
- Trailing commas in multi-line arrays/objects.

**Linting:**
- ESLint with `typescript-eslint` — config at `eslint.config.js`
- `@typescript-eslint/no-unused-vars`: **off** (unused vars not flagged)
- `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`: enabled (hooks rules enforced)
- `react-refresh/only-export-components`: warn
- TypeScript strict mode: **disabled** — `noImplicitAny: false`, `strict: false`, `noUnusedLocals: false`

## Import Organization

**Order observed in source files:**
1. React and React ecosystem (`react`, `react-router-dom`)
2. Third-party libraries (`framer-motion`, `date-fns`, `lucide-react`, `sonner`)
3. shadcn/ui components (`@/components/ui/...`)
4. Internal components (`@/components/portal/...`)
5. Internal hooks (`@/hooks/...`)
6. Internal contexts (`@/contexts/...`)
7. Supabase client/types (`@/integrations/supabase/...`)
8. Utilities (`@/lib/utils`)

**Path Aliases:**
- `@/` maps to `src/` — configured in `tsconfig.app.json` and `vite.config.ts`
- Always use `@/` for internal imports, never relative paths like `../../`

**Example from `AdminChatView.tsx`:**
```typescript
import { useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversation, useChatMessages, useSendMessage } from '@/hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';
```

## Component Patterns

**Named exports only** — no default exports for components in `src/components/`:
```typescript
export function CampaignPanel({ clientId, campaigns }: CampaignPanelProps) { ... }
export function AgreementSigningWidget({ clientId }: AgreementSigningWidgetProps) { ... }
```

Pages use **default exports** (required for React.lazy):
```typescript
export default function TeamChat() { ... }
```

**Props interface defined inline above component:**
```typescript
interface CampaignPanelProps {
  clientId: string;
  campaigns: Campaign[];
  trackingStartDate?: string | null;
  onRefresh: () => void;
  onUpdateStates: (states: string) => Promise<void>;
}
```

**shadcn/ui component usage:**
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
```

**`cn()` utility for conditional classes** (always use, never string concatenation):
```typescript
import { cn } from '@/lib/utils';
// Usage:
className={cn("base-classes", condition && "conditional-class", className)}
```

**Config objects for status/category styling** (pattern used in `TicketDashboard.tsx`):
```typescript
const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Circle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Loader2 },
};
```

**framer-motion animations on interactive widgets:**
```typescript
<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
```

**Lazy loading for all route-level pages:**
```typescript
const TeamChat = lazy(() => import('./pages/hub/admin/TeamChat'));
// Wrapped in Suspense with Loader2 spinner fallback
```

**Local state config objects** (prefer lookup objects over switch/if chains):
```typescript
const sizeClasses = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-20 h-20' };
```

**`useRef` for guards against double-submit:**
```typescript
const isSendingRef = useRef(false);
if (isSendingRef.current) return;
isSendingRef.current = true;
// ... async work ...
isSendingRef.current = false;
```

## Hook Patterns

**All DB access through custom hooks in `src/hooks/`** — never query Supabase directly in components (except legacy cases in `CampaignPanel.tsx` and `NPSPopup.tsx`).

**Hook file structure** — one file per domain, multiple hooks exported:
```typescript
// useChat.ts exports:
export function useClientConversation(...)  // useQuery
export function useChatMessages(...)         // useInfiniteQuery
export function useSendMessage()             // useMutation
export function useMarkAsRead()              // useMutation
export function useChatRealtime(...)         // side-effect only hook
```

**Query key conventions:**
```typescript
queryKey: ['chat-conversation', clientId]           // kebab-case, array with params
queryKey: ['chat-messages', conversationId]
queryKey: ['client-wallet', clientId]
queryKey: ['wallet-transactions', clientId]
queryKey: ['all-tickets', filters]                  // pass filter objects as-is
```

**Query enabled guard pattern:**
```typescript
enabled: !!clientId,
// or
enabled: !!clientId && !!walletQuery.data?.tracking_start_date,
```

**Mutation with cache invalidation in `onSuccess`:**
```typescript
return useMutation({
  mutationFn: async (input) => {
    // ... DB operations ...
    return data;
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['client-wallet', data.client_id] });
    queryClient.invalidateQueries({ queryKey: ['wallet-transactions', data.client_id] });
  },
});
```

**Realtime subscription hooks** (side-effect only, no return value):
```typescript
export function useChatRealtime(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`chat-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', ... }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);
}
```

**Calling realtime hooks in components — always unconditional at top level:**
```typescript
useChatRealtime(conversationId);
useAdminDMRealtime(selectedChat?.type === 'dm' ? selectedChat.id : undefined);
```

**Interfaces exported from hook files** for use in consuming components:
```typescript
// In useChat.ts:
export interface ChatMessage { ... }
export interface ChatConversation { ... }

// In consuming component:
import { ChatMessage as ChatMessageType } from '@/hooks/useChat';
```

**Supabase client** — always import from the singleton:
```typescript
import { supabase } from '@/integrations/supabase/client';
```

## Edge Function Patterns

**Entry point — always `Deno.serve(async (req) => { ... })`:**
```typescript
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  // ...
});
```

Older functions may use `serve` from `https://deno.land/std@0.168.0/http/server.ts` — prefer `Deno.serve`.

**CORS headers — defined once at top of each file:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```
Always handle preflight: `if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });`

**Supabase client in edge functions — always service role, created per-request:**
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**Import styles — two patterns in use:**
```typescript
// Newer preferred (npm specifier):
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

// Older (esm.sh):
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

**JSON response helper pattern** (used in `add-wallet-credit/index.ts`):
```typescript
function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**Error response shape:**
```typescript
return new Response(JSON.stringify({ error: 'Missing clientId' }), {
  status: 400,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

**External API calls — raw `fetch()`, no SDKs:**
```typescript
const res = await fetch(`${GHL_API_BASE}/locations/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Version': GHL_API_VERSION,
  },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  const errBody = await res.text();
  throw new Error(`GHL API error [${res.status}]: ${errBody}`);
}
```

**Constants at top of file:**
```typescript
const GHL_API_BASE = "https://services.leadconnectorhq.com";
const COMPANY_ID = "30bFOq4ZtlhKuMOvVPwA";
const GHL_API_VERSION = '2021-07-28';
```

**Helper functions defined above `Deno.serve()`** — not inside the handler:
```typescript
async function decryptToken(encryptedData: string, key: string): Promise<string> { ... }
async function getAgencyToken(supabase: any, encryptionKey: string): Promise<string> { ... }

Deno.serve(async (req) => { ... });
```

## Error Handling

**Frontend (React components) — try/catch with toast:**
```typescript
const handleBuildCampaign = async () => {
  setIsBuilding(true);
  try {
    const { data, error } = await supabase.functions.invoke('create-google-ads-campaign', { body: { ... } });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Failed to create campaign');
    toast.success('Campaign created', { description: `Campaign ID: ${data.campaignId}` });
  } catch (error) {
    console.error('Error building campaign:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to build campaign');
  } finally {
    setIsBuilding(false);
  }
};
```

**Supabase query pattern — always destructure `error`, throw on truthy:**
```typescript
const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
if (error) throw error;
```

**`maybeSingle()` vs `single()`:**
- Use `maybeSingle()` when record may not exist (returns `null`, no error)
- Use `single()` when record must exist (throws error if missing)

**Edge functions — top-level try/catch, structured error response:**
```typescript
Deno.serve(async (req) => {
  try {
    // ... logic ...
    return jsonRes({ success: true, ... });
  } catch (error) {
    console.error('function-name error:', error);
    return jsonRes({ error: (error as Error).message || 'Internal server error' }, 500);
  }
});
```

**Known error suppression (Postgres duplicate key):**
```typescript
if (error.code === '23505' || error.message?.includes('Duplicate message')) {
  console.warn('Duplicate message suppressed');
  return null;
}
throw error;
```

## Logging

**Console usage:**
- `console.log()` — for informational flow in edge functions (e.g., `console.log('Wallet credit: $${amount}')`)
- `console.warn()` — for suppressed/expected errors (duplicate detection)
- `console.error()` — for actual errors, always with context label and error object

**No structured logging library** — console only on both frontend and edge functions.

## Comments

**When to comment:**
- Above blocks of related logic within a function
- Above step definitions and constants with business significance
- Inline for non-obvious behavior — `// upsert replaces existing file`, `// Reverse so oldest first in display`
- Force-redeploy comments at top of edge function files when version pinning matters

**No JSDoc/TSDoc** — function signatures are self-documenting via TypeScript types.

**Section headers in long edge functions:**
```typescript
// =========================================================================
// ADS MANAGER SLACK FEED
// =========================================================================
```

## Module Design

**Exports:**
- Named exports for all hooks and components
- No barrel files (`index.ts`) in `src/hooks/` or `src/components/portal/`
- `src/pages/hub/tv/index.ts` is the only barrel file observed (TV page exports)

**Re-exports from hooks** — types and utility functions exported alongside hooks for use in pages:
```typescript
// useTicketDashboard.ts exports hooks + helper functions:
export function getSLAStatus(...) { ... }
export function formatSLACountdown(...) { ... }
export { useAllTickets, useTicketMetrics, type TicketFilters, type TicketWithDetails }
```

---

*Convention analysis: 2026-03-12*
