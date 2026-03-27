---
plan: 001
type: execute
autonomous: true
files_modified:
  # Plan 01 - Scoreboard + Progress Bar + Cadence
  - src/components/discovery/SpeedToLeadScoreboard.tsx
  - src/components/discovery/AttemptProgressBar.tsx
  - src/components/discovery/CadenceSuggestion.tsx
  - src/components/discovery/LeadCard.tsx
  - src/components/discovery/LeadDiscoveryDashboard.tsx
  # Plan 02 - Call Next + Smart Sort
  - src/components/discovery/DiscoveryCallSheet.tsx
  - src/hooks/useLeadDiscoveryQueue.ts
  # Plan 03 - Leaderboard
  - src/components/discovery/CallerLeaderboard.tsx
  - src/hooks/useCallerLeaderboard.ts
  # Plan 04 - Reports + Time-of-Day
  - src/components/discovery/DailyWeeklyReport.tsx
  - src/components/discovery/TimeOfDayHeatmap.tsx
  - src/hooks/useDiscoveryReportStats.ts

must_haves:
  truths:
    - "Dashboard shows red alert count for untouched leads, today's calls/connected/booked, pick-up rate, and booking rate"
    - "After saving a call, user sees a prominent Call Next Lead button that opens the next priority lead"
    - "Each lead card shows a 5-dot attempt progress bar with count text"
    - "Each lead card shows cadence suggestion text based on attempt number and timing"
    - "Follow-up queue is sorted by priority score (speed-to-lead > callbacks due > low attempts > high attempts > already called today)"
    - "Leaderboard shows all callers ranked by today's stats"
    - "Report section shows coverage rate, speed to contact, pick-up by time of day, booking trend, and fallen-through leads"
    - "Time-of-day chart shows answered vs total calls per hour with best windows highlighted"
  artifacts:
    - path: "src/components/discovery/SpeedToLeadScoreboard.tsx"
      provides: "Urgency scoreboard replacing basic stats bar"
    - path: "src/components/discovery/AttemptProgressBar.tsx"
      provides: "5-dot visual progress indicator"
    - path: "src/components/discovery/CadenceSuggestion.tsx"
      provides: "Next action timing suggestions"
    - path: "src/components/discovery/CallerLeaderboard.tsx"
      provides: "Multi-user competitive stats"
    - path: "src/components/discovery/DailyWeeklyReport.tsx"
      provides: "Collapsible report with coverage, speed, trends"
    - path: "src/components/discovery/TimeOfDayHeatmap.tsx"
      provides: "Hour-by-hour pick-up rate visualization"
    - path: "src/hooks/useCallerLeaderboard.ts"
      provides: "Hook fetching grouped caller stats from discovery_calls"
    - path: "src/hooks/useDiscoveryReportStats.ts"
      provides: "Hook computing report metrics from discovery_calls + leads"
  key_links:
    - from: "SpeedToLeadScoreboard.tsx"
      to: "useDiscoveryCallStats"
      via: "stats prop passed from Dashboard"
      pattern: "stats\\."
    - from: "DiscoveryCallSheet.tsx"
      to: "useLeadDiscoveryQueue"
      via: "onCallNext callback finds next priority lead from queue data"
      pattern: "onCallNext"
    - from: "useLeadDiscoveryQueue.ts"
      to: "leads table"
      via: "priority scoring in sort function"
      pattern: "priorityScore"
---

<objective>
Build all 8 elite improvements to the discovery call tool in 4 execution plans.

Purpose: Transform the existing dial tracker from a basic lead list into a high-performance calling station with urgency signals, momentum features, smart sorting, competitive leaderboards, and analytics.

Output: 8 new features integrated into the existing discovery tool components.
</objective>

<execution_context>
@/Users/forren/.claude/get-shit-done/workflows/execute-plan.md
@/Users/forren/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/discovery/LeadDiscoveryDashboard.tsx
@src/components/discovery/LeadCard.tsx
@src/components/discovery/DiscoveryCallSheet.tsx
@src/hooks/useDiscoveryCallStats.ts
@src/hooks/useLeadDiscoveryQueue.ts
@src/hooks/useDiscoveryCalls.ts
@src/pages/hub/Leads.tsx
@src/components/ui/chart.tsx
</context>

<tasks>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- PLAN 01: Scoreboard + Progress Bar + Cadence Suggestions                 -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 1: Speed-to-Lead Scoreboard + Attempt Progress Bar + Cadence Suggestions</name>
  <files>
    src/components/discovery/SpeedToLeadScoreboard.tsx
    src/components/discovery/AttemptProgressBar.tsx
    src/components/discovery/CadenceSuggestion.tsx
    src/components/discovery/LeadCard.tsx
    src/components/discovery/LeadDiscoveryDashboard.tsx
  </files>
  <action>
    **1. Create `SpeedToLeadScoreboard.tsx`** — replaces the existing Quick Stats Bar (lines 114-137 of LeadDiscoveryDashboard.tsx).

    Props: `{ stats: DiscoveryCallStats | null; queueData: DiscoveryQueueData }`

    Layout: A single row of stat cards in a rounded container (matching existing bg-muted/20 style):
    - **Untouched Leads** (red alert): Count leads where `call_attempt_count === 0`. If any exist, show count in red with `AlertTriangle` icon + age of oldest untouched lead (e.g., "3 untouched (oldest: 4h)"). Use `animate-pulse` on the icon when count > 0.
    - **Today's Calls**: total calls today (from `stats.recentActivity` filtered to today's date)
    - **Connected**: count of answered calls today, shown in green
    - **Booked**: count of strategy_booked/scheduled outcomes today, shown in purple
    - **Pick-up Rate**: `(connected / total) * 100`%, shown as percentage. Color: green if >= 30%, amber if >= 15%, red if < 15%
    - **Booking Rate**: `(booked / connected) * 100`%, same color scheme

    Use `Zap`, `Phone`, `PhoneCall`, `Video`, `AlertTriangle`, `TrendingUp` icons from lucide-react. Keep text-xs styling. The untouched count should be computed from `queueData.queue.filter(l => l.call_attempt_count === 0)`.

    Then in `LeadDiscoveryDashboard.tsx`, replace the existing Quick Stats Bar block (the `{todayStats && todayStats.total > 0 && (...)}` section) with `<SpeedToLeadScoreboard stats={stats} queueData={data} />`. Always show it (not just when todayStats.total > 0) — the untouched lead alert should show even when no calls have been made today.

    Remove the `todayStats` useMemo from the dashboard since the scoreboard computes its own stats.

    **2. Create `AttemptProgressBar.tsx`**

    Props: `{ attempts: number; maxAttempts?: number }` (default max = 5)

    Render 5 small circles/dots in a row:
    - Filled dots: `bg-green-400` for completed attempts
    - Empty dots: `bg-muted-foreground/20` for remaining
    - At 5/5: all dots red (`bg-red-400`) with a small "Move to nurture?" text in red-400/60
    - Text below: "2/5 attempts" in text-[10px] text-muted-foreground

    Each dot should be `w-1.5 h-1.5 rounded-full`. Keep it compact — this sits on the LeadCard.

    **3. Create `CadenceSuggestion.tsx`**

    Props: `{ attemptCount: number; lastAttemptAt: string | null }`

    Logic:
    - attempt 0 (new): "Call now — speed to lead!"
    - After attempt 1: "Try again in 2-4 hours" (show "Due now" if >2h since last attempt)
    - After attempt 2: "Try tomorrow morning" (show "Due now" if >24h since last)
    - After attempt 3: "Try in 2 days, afternoon" (show "Due now" if >48h since last)
    - After attempt 4: "Final attempt — try different time of day" (show "Overdue" if >48h since last)

    Render as a single line of text-[10px]. Color: text-amber-400 if due/overdue, text-muted-foreground/50 otherwise. Use `Clock` icon (h-2.5 w-2.5) inline.

    **4. Integrate into LeadCard.tsx:**

    Add `AttemptProgressBar` after the stage badge area (right side of the card, above the arrow). Place it between the existing right-side content and the arrow chevron.

    Add `CadenceSuggestion` below the "Last: Xh ago" line (after the last_call_attempt_at block). Only show when lead is in the queue (activeStages: new through attempt_4, discovery_complete).
  </action>
  <verify>
    Run `cd /Users/forren/workspace/copy-alphahub && npx tsc --noEmit` — no type errors.
    Run `cd /Users/forren/workspace/copy-alphahub && npx vite build` — builds successfully.
    Visually: Scoreboard replaces old stats bar and always shows. Lead cards show 5-dot progress and cadence text.
  </verify>
  <done>
    - Scoreboard shows untouched count (red alert), today's calls/connected/booked, pick-up rate, booking rate
    - Each lead card has a 5-dot attempt progress bar with "X/5 attempts" text
    - Each lead card shows cadence suggestion with due/overdue coloring
    - Old Quick Stats Bar code is removed from dashboard
  </done>
</task>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- PLAN 02: Call Next Button + Smart Queue Sorting                           -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 2: Call Next Button + Smart Priority Queue Sorting</name>
  <files>
    src/components/discovery/DiscoveryCallSheet.tsx
    src/components/discovery/LeadDiscoveryDashboard.tsx
    src/hooks/useLeadDiscoveryQueue.ts
  </files>
  <action>
    **1. Add "Call Next Lead" button to DiscoveryCallSheet.tsx saved step:**

    The sheet needs access to the queue data to find the next lead. Add a new prop to DiscoveryCallSheetProps:
    ```
    onCallNext?: (lead: DiscoveryLead) => void;
    queueData?: DiscoveryQueueData;
    ```

    In the `step === 'saved'` block (around line 722), add a "Call Next Lead" button ABOVE the existing "Back to Dashboard" button:

    ```tsx
    {/* Find next priority lead (exclude current lead) */}
    {queueData && (() => {
      const nextLead = queueData.queue.find(l => l.id !== lead.id);
      if (!nextLead) return null;
      const nextName = [nextLead.first_name, nextLead.last_name].filter(Boolean).join(' ') || 'Next Lead';
      return (
        <Button
          size="lg"
          className="w-full h-14 text-base font-bold border-2 border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20"
          variant="outline"
          onClick={() => onCallNext?.(nextLead)}
        >
          <PhoneCall className="h-5 w-5 mr-2" />
          Call Next: {nextName}
        </Button>
      );
    })()}
    ```

    The `queueData.queue` will already be sorted by priority (from the sort change below), so `queue[0]` that isn't the current lead is the next best lead.

    **2. Wire onCallNext in LeadDiscoveryDashboard.tsx:**

    Add a `handleCallNext` function that:
    - Sets `selectedLead` to the new lead
    - Keeps `sheetOpen` true (the sheet stays open, just resets for the new lead)

    Pass `onCallNext={handleCallNext}` and `queueData={data}` to DiscoveryCallSheet.

    **3. Smart Priority Queue Sorting in `useLeadDiscoveryQueue.ts`:**

    Replace the existing `sortNewestFirst` function (lines 101-105) with a `computePriorityScore` function:

    ```typescript
    function computePriorityScore(lead: DiscoveryLead): number {
      const now = Date.now();
      const leadAge = lead.lead_date ? now - new Date(lead.lead_date).getTime() : Infinity;
      const leadAgeMinutes = leadAge / 60_000;
      const lastAttemptAge = lead.last_call_attempt_at
        ? now - new Date(lead.last_call_attempt_at).getTime()
        : Infinity;
      const lastAttemptHours = lastAttemptAge / 3_600_000;
      const attempts = lead.call_attempt_count || 0;

      // Brand new lead (0 attempts, <30 min old) = HIGHEST priority (1000)
      if (attempts === 0 && leadAgeMinutes < 30) return 1000;

      // Brand new lead (0 attempts, older) = very high (900 - age penalty)
      if (attempts === 0) return 900 - Math.min(leadAgeMinutes / 60, 100);

      // Callback due now or overdue (discovery_complete stage with callback) = HIGH (800)
      if (lead.discovery_stage === 'discovery_complete') return 800;

      // Lead with <3 attempts not called today = MEDIUM (600 + recency bonus)
      const calledToday = lastAttemptHours < 12; // rough "today" check
      if (attempts < 3 && !calledToday) return 600 + (3 - attempts) * 50;

      // Lead with 4 attempts (needs final attempt) = LOWER but still needs attention (400)
      if (attempts >= 4 && !calledToday) return 400;

      // Lead with <3 attempts called today = LOW (200)
      if (attempts < 3 && calledToday) return 200;

      // Already attempted today with 4+ attempts = LOWEST (100)
      return 100;
    }
    ```

    Replace the sort in the `queue` return:
    ```typescript
    queue: processed
      .filter(...)
      .sort((a, b) => computePriorityScore(b) - computePriorityScore(a)),
    ```

    Also add a `priority_score` field to DiscoveryLead interface (optional, computed client-side). Actually, do NOT add it to the interface — compute it at sort time only. Keep it clean.

    **4. Show priority indicator on LeadCard:**

    In LeadDiscoveryDashboard.tsx, when rendering LeadCards in the queue tab, remove the stage-grouped rendering (the `stageOrder.map(stage => ...)` block) and instead render a flat sorted list. The priority sorting replaces stage grouping. Add a subtle priority badge:
    - Score >= 900: tiny "URGENT" badge in red
    - Score >= 700: tiny "HIGH" badge in amber
    - No badge for MEDIUM and below

    Export `computePriorityScore` from useLeadDiscoveryQueue.ts so the dashboard can call it for badge display.

    Keep the stage-group headers but reorganize: instead of grouping by stage, just render the flat sorted queue. Each card already shows its stage badge. Remove the `groupedQueue` useMemo and `stageOrder.map` rendering. Replace with a simple flat map over the sorted `data.queue`.
  </action>
  <verify>
    Run `cd /Users/forren/workspace/copy-alphahub && npx tsc --noEmit` — no type errors.
    Run `cd /Users/forren/workspace/copy-alphahub && npx vite build` — builds successfully.
    Verify: Queue is sorted by priority (new hot leads first, already-called-today last). "Call Next" button appears on saved step.
  </verify>
  <done>
    - "Call Next Lead" button appears after saving a call, showing the next priority lead's name
    - Clicking it opens that lead's call sheet without navigating to dashboard
    - Queue is sorted by priority score, not just newest-first
    - Urgent/High priority leads show a subtle indicator badge
    - Stage grouping is replaced by flat priority-sorted list
  </done>
</task>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- PLAN 03: Leaderboard                                                      -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 3: Caller Leaderboard</name>
  <files>
    src/hooks/useCallerLeaderboard.ts
    src/components/discovery/CallerLeaderboard.tsx
    src/components/discovery/LeadDiscoveryDashboard.tsx
  </files>
  <action>
    **1. Create `useCallerLeaderboard.ts` hook:**

    ```typescript
    interface CallerStats {
      caller_name: string;
      calls_made: number;
      connected: number;
      booked: number;
      pickup_rate: number; // percentage
      rank: number;
    }
    ```

    Query: Fetch from `discovery_calls` table filtered by `agent_id` and `call_date >= today start (midnight)`. Group by `called_by_name`.

    Implementation:
    ```typescript
    export function useCallerLeaderboard(agentId: string | null) {
      return useQuery({
        queryKey: ['caller-leaderboard', agentId],
        queryFn: async (): Promise<CallerStats[]> => {
          if (!agentId) return [];
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const { data, error } = await supabase
            .from('discovery_calls')
            .select('called_by_name, answered, outcome, call_date')
            .eq('agent_id', agentId)
            .gte('call_date', todayStart.toISOString());

          if (error) throw error;
          if (!data || data.length === 0) return [];

          // Group by caller
          const grouped = new Map<string, { calls: number; connected: number; booked: number }>();
          data.forEach(c => {
            const name = c.called_by_name || 'Unknown';
            const entry = grouped.get(name) || { calls: 0, connected: 0, booked: 0 };
            entry.calls++;
            if (c.answered) entry.connected++;
            if (c.outcome === 'strategy_booked' || c.outcome === 'scheduled') entry.booked++;
            grouped.set(name, entry);
          });

          // Convert to array, sort by calls made desc, assign ranks
          const stats = Array.from(grouped.entries())
            .map(([name, s]) => ({
              caller_name: name,
              calls_made: s.calls,
              connected: s.connected,
              booked: s.booked,
              pickup_rate: s.calls > 0 ? Math.round((s.connected / s.calls) * 100) : 0,
              rank: 0,
            }))
            .sort((a, b) => b.calls_made - a.calls_made);

          stats.forEach((s, i) => s.rank = i + 1);
          return stats;
        },
        enabled: !!agentId,
        refetchInterval: 60_000, // Refresh every minute
      });
    }
    ```

    **2. Create `CallerLeaderboard.tsx`:**

    Props: `{ agentId: string }`

    Uses the `useCallerLeaderboard` hook. Only renders if there are 2+ callers (no point showing leaderboard for 1 person).

    Layout: A Card with a header "Today's Leaderboard" and a Trophy icon (from lucide-react).

    Each caller row:
    - Rank number (1st gets a gold `Trophy` icon, 2nd silver, 3rd bronze — use text colors)
    - Caller name (bold)
    - Stats in a row: calls made, connected (green), booked (purple), pickup rate
    - Use a simple table-like layout with Tailwind grid or flex

    Style competitively:
    - First place row gets a subtle gold border-left or glow
    - Compact rows, text-xs/text-sm
    - If only 1 caller, don't render the component at all

    **3. Add to LeadDiscoveryDashboard.tsx:**

    Add a new tab "Stats" to the existing Tabs component (after "Lost"):
    ```tsx
    <TabsTrigger value="stats" className="gap-2">
      <TrendingUp className="h-4 w-4" />
      Stats
    </TabsTrigger>
    ```

    In the TabsContent for "stats", render the CallerLeaderboard (and later the report/time-of-day components from Task 4).

    Import TrendingUp from lucide-react.
  </action>
  <verify>
    Run `cd /Users/forren/workspace/copy-alphahub && npx tsc --noEmit` — no type errors.
    Run `cd /Users/forren/workspace/copy-alphahub && npx vite build` — builds successfully.
    Verify: Stats tab exists. Leaderboard shows caller rows ranked by calls made. Only renders for 2+ callers.
  </verify>
  <done>
    - New "Stats" tab in dashboard
    - CallerLeaderboard shows each caller's today stats: calls, connected, booked, pickup rate
    - Callers ranked by calls made, top 3 have visual rank indicators
    - Only renders when 2+ callers have data
    - Refreshes every 60 seconds
  </done>
</task>

<!-- ══════════════════════════════════════════════════════════════════════════ -->
<!-- PLAN 04: Daily/Weekly Report + Time-of-Day Analysis                      -->
<!-- ══════════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 4: Daily/Weekly Report + Time-of-Day Pick-Up Analysis</name>
  <files>
    src/hooks/useDiscoveryReportStats.ts
    src/components/discovery/DailyWeeklyReport.tsx
    src/components/discovery/TimeOfDayHeatmap.tsx
    src/components/discovery/LeadDiscoveryDashboard.tsx
  </files>
  <action>
    **1. Create `useDiscoveryReportStats.ts` hook:**

    Props: `agentId: string | null, dateRange: 'today' | 'week' | 'custom', customStart?: string, customEnd?: string`

    Fetches `discovery_calls` and `leads` for the agent within the date range.

    Computes and returns:
    ```typescript
    interface DiscoveryReportStats {
      // Coverage
      totalLeadsReceived: number;      // leads with lead_date in range
      totalLeadsContacted: number;     // leads with at least 1 call in range
      coverageRate: number;            // percentage
      // Speed
      avgSpeedToFirstContact: number;  // minutes
      // Pick-up by hour
      hourlyPickup: { hour: number; total: number; answered: number; rate: number }[];
      // Booking trend (daily)
      dailyBookings: { date: string; count: number }[];
      // Fallen through
      fallenThrough: number;           // leads received >24h ago with 0 calls
      // Booking rate
      totalConnected: number;
      totalBooked: number;
      bookingRate: number;
    }
    ```

    For `hourlyPickup`: Group all discovery_calls by hour of `call_date` (0-23). For each hour, count total and answered. Compute rate.

    For `dailyBookings`: Group calls with outcome='strategy_booked'|'scheduled' by date. Return array of {date, count}.

    For `fallenThrough`: Count leads where `lead_date` is in range, `lead_date` is >24h ago, and `call_attempt_count === 0`.

    Date range logic:
    - 'today': call_date >= today midnight
    - 'week': call_date >= 7 days ago midnight
    - 'custom': call_date between customStart and customEnd

    Use React Query with `['discovery-report', agentId, dateRange, customStart, customEnd]` as key.

    **2. Create `TimeOfDayHeatmap.tsx`:**

    Props: `{ hourlyData: { hour: number; total: number; answered: number; rate: number }[] }`

    Use recharts `BarChart` with the shadcn/ui `ChartContainer` wrapper from `@/components/ui/chart`.

    - X-axis: hours 6am-9pm (skip overnight hours with 0 data, or show all 24)
    - Y-axis: count
    - Stacked bars: answered (green) and unanswered (red/gray)
    - Tooltip showing: "2pm: 8 calls, 5 answered (63%)"
    - Highlight the best 3 hours with a subtle green background or border

    Also show a text summary below the chart: "Best windows: 10am-12pm, 2pm-4pm" based on highest pickup rates (only hours with >= 3 calls to be statistically meaningful).

    Keep it compact — this goes inside the Stats tab. Max height ~200px for the chart.

    Chart config:
    ```typescript
    const chartConfig = {
      answered: { label: 'Answered', color: 'hsl(142, 76%, 36%)' },
      unanswered: { label: 'No Answer', color: 'hsl(0, 0%, 40%)' },
    } satisfies ChartConfig;
    ```

    **3. Create `DailyWeeklyReport.tsx`:**

    Props: `{ agentId: string }`

    Uses `useDiscoveryReportStats` hook. Has a date range toggle (today / this week / custom).

    Layout using shadcn `Collapsible` component:
    - Trigger: "Performance Report" with a ChevronDown icon, default open
    - Content: Grid of stat cards + the TimeOfDayHeatmap + booking trend

    Stat cards (2-column grid on mobile, 3-column on desktop):
    - **Coverage**: `{contacted}/{received} ({rate}%)` — icon: Users
    - **Avg Speed to Contact**: `{minutes}m` or `{hours}h` — icon: Zap
    - **Pick-up Rate**: `{rate}%` with color coding — icon: PhoneCall
    - **Booking Rate**: `{rate}%` — icon: Calendar
    - **Fallen Through**: `{count} leads` in red if > 0 — icon: AlertTriangle

    Below the stat cards:
    - TimeOfDayHeatmap component (always visible)
    - Daily bookings mini chart if range is 'week' (simple line or bar, recharts)

    Date range toggle: Three small buttons (Today / Week / Custom). If custom, show two date inputs.

    **4. Wire into LeadDiscoveryDashboard.tsx Stats tab:**

    In the "stats" TabsContent (created in Task 3), add DailyWeeklyReport below the CallerLeaderboard:

    ```tsx
    <TabsContent value="stats" className="space-y-6">
      <CallerLeaderboard agentId={agentId} />
      <DailyWeeklyReport agentId={agentId} />
    </TabsContent>
    ```

    Import DailyWeeklyReport. The component handles its own data fetching internally.
  </action>
  <verify>
    Run `cd /Users/forren/workspace/copy-alphahub && npx tsc --noEmit` — no type errors.
    Run `cd /Users/forren/workspace/copy-alphahub && npx vite build` — builds successfully.
    Verify: Stats tab shows report with coverage/speed/pickup/booking metrics, time-of-day chart with bars, and booking trend.
  </verify>
  <done>
    - DailyWeeklyReport shows coverage rate, avg speed to contact, pickup rate, booking rate, fallen-through count
    - Date range toggle switches between today/week/custom
    - TimeOfDayHeatmap shows stacked bar chart of answered vs unanswered by hour
    - Best calling windows are highlighted and summarized in text
    - All metrics are accurate based on discovery_calls and leads data
    - Everything renders in the Stats tab below the leaderboard
  </done>
</task>

</tasks>

<verification>
After all 4 tasks are complete:
1. `npx tsc --noEmit` passes with no errors
2. `npx vite build` produces clean build
3. Dashboard shows Speed-to-Lead Scoreboard (always visible, with untouched count)
4. Lead cards show 5-dot progress bars and cadence suggestions
5. Saved step in call sheet has "Call Next Lead" button
6. Queue is sorted by priority score, not just newest-first
7. Stats tab has leaderboard and full report with time-of-day chart
</verification>

<success_criteria>
- All 8 improvements are implemented and integrated
- No TypeScript errors, clean Vite build
- Existing functionality (call sheet flow, booking, GHL sync) is unbroken
- New components follow existing patterns (shadcn/ui, Tailwind, React Query, lucide-react icons)
- Charts use recharts with shadcn ChartContainer wrapper
</success_criteria>

<output>
After completion, create `.planning/quick/001-discovery-tool-elite-improvements/001-SUMMARY.md`
</output>
