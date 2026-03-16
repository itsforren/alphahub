import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SyncHealthEntry } from '@/hooks/useBillingVerification';

interface SyncHealthBarProps {
  entries: SyncHealthEntry[];
  isLoading: boolean;
}

const FUNCTION_LABELS: Record<string, string> = {
  'sync-all-google-ads': 'Google Ads',
  'sync-stripe-charges': 'Stripe',
  'auto-recharge-run': 'Recharge',
  'check-low-balance': 'Balance Check',
};

// Canonical display order
const FUNCTION_ORDER = [
  'sync-all-google-ads',
  'sync-stripe-charges',
  'auto-recharge-run',
  'check-low-balance',
];

function statusDot(failures: number) {
  if (failures === 0) return 'bg-green-400';
  if (failures < 3) return 'bg-yellow-400';
  return 'bg-red-400';
}

function lastSyncText(lastSuccessAt: string | null): string {
  if (!lastSuccessAt) return 'never';
  try {
    return formatDistanceToNow(new Date(lastSuccessAt), { addSuffix: true });
  } catch {
    return 'unknown';
  }
}

export function SyncHealthBar({ entries, isLoading }: SyncHealthBarProps) {
  if (isLoading || entries.length === 0) return null;

  // Build lookup map
  const entryMap = new Map(entries.map(e => [e.function_name, e]));

  // Render in canonical order, skip any that don't exist
  const ordered = FUNCTION_ORDER
    .map(name => entryMap.get(name))
    .filter((e): e is SyncHealthEntry => !!e);

  return (
    <div className="flex items-center gap-4 flex-wrap px-4 py-2 border-b border-border/30 bg-muted/10">
      <span className="text-xs font-medium text-muted-foreground">Sync Status:</span>
      {ordered.map(entry => (
        <div
          key={entry.function_name}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          title={
            entry.consecutive_failures > 0 && entry.last_error
              ? `Last error: ${entry.last_error}`
              : undefined
          }
        >
          <span className={cn('w-2 h-2 rounded-full shrink-0', statusDot(entry.consecutive_failures))} />
          <span className="font-medium">
            {FUNCTION_LABELS[entry.function_name] ?? entry.function_name}
          </span>
          <span className="text-muted-foreground/70">
            {lastSyncText(entry.last_success_at)}
          </span>
          {entry.consecutive_failures > 0 && (
            <span className={cn(
              'text-[10px] font-medium px-1 py-0.5 rounded',
              entry.consecutive_failures >= 3
                ? 'bg-red-500/10 text-red-400'
                : 'bg-yellow-500/10 text-yellow-400'
            )}>
              {entry.consecutive_failures} fail{entry.consecutive_failures !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
