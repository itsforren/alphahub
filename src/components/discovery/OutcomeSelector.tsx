import { cn } from '@/lib/utils';
import { Calendar, XCircle, Voicemail, PhoneMissed, PhoneForwarded, Sprout, Video, Clock } from 'lucide-react';
import type { DiscoveryOutcome } from '@/hooks/useDiscoveryCalls';

interface OutcomeSelectorProps {
  value: DiscoveryOutcome | null;
  onChange: (outcome: DiscoveryOutcome) => void;
}

const outcomes: { value: DiscoveryOutcome; label: string; icon: React.ElementType; colorClass: string }[] = [
  { value: 'strategy_booked', label: 'Book Strategy Call', icon: Video, colorClass: 'border-green-500 bg-green-500/10 text-green-400' },
  { value: 'cant_book_now', label: "Can't Book Now", icon: Clock, colorClass: 'border-blue-500 bg-blue-500/10 text-blue-400' },
  { value: 'not_a_fit', label: 'Not a Fit', icon: XCircle, colorClass: 'border-rose-500 bg-rose-500/10 text-rose-400' },
  { value: 'call_back', label: 'Call Back', icon: PhoneForwarded, colorClass: 'border-amber-500 bg-amber-500/10 text-amber-400' },
  { value: 'long_term_nurture', label: 'Long-Term Nurture', icon: Sprout, colorClass: 'border-purple-500 bg-purple-500/10 text-purple-400' },
];

export function OutcomeSelector({ value, onChange }: OutcomeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {outcomes.map((o) => {
        const Icon = o.icon;
        const isSelected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all duration-200',
              isSelected ? o.colorClass : 'border-border bg-background/50 text-muted-foreground hover:border-primary/30'
            )}
          >
            <Icon className="h-4 w-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small badge for displaying outcome in lists */
export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return null;
  const allOutcomes: Record<string, { label: string; color: string }> = {
    strategy_booked: { label: 'Strategy Booked', color: 'bg-green-500/10 text-green-400 border-green-500/40' },
    scheduled: { label: 'Scheduled', color: 'bg-green-500/10 text-green-400 border-green-500/40' },
    cant_book_now: { label: "Can't Book", color: 'bg-blue-500/10 text-blue-400 border-blue-500/40' },
    not_a_fit: { label: 'Not a Fit', color: 'bg-rose-500/10 text-rose-400 border-rose-500/40' },
    bad_number: { label: 'Bad Number', color: 'bg-rose-500/10 text-rose-400 border-rose-500/40' },
    long_term_nurture: { label: 'Nurture', color: 'bg-purple-500/10 text-purple-400 border-purple-500/40' },
    voicemail: { label: 'Voicemail', color: 'bg-amber-500/10 text-amber-400 border-amber-500/40' },
    no_answer: { label: 'No Answer', color: 'bg-amber-500/10 text-amber-400 border-amber-500/40' },
    call_back: { label: 'Call Back', color: 'bg-amber-500/10 text-amber-400 border-amber-500/40' },
    intro_scheduled: { label: 'Intro Booked', color: 'bg-blue-500/10 text-blue-400 border-blue-500/40' },
    bad_timing: { label: 'Bad Timing', color: 'bg-amber-500/10 text-amber-400 border-amber-500/40' },
  };
  const cfg = allOutcomes[outcome] || { label: outcome.replace(/_/g, ' '), color: 'bg-muted/30 text-muted-foreground border-border' };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border', cfg.color)}>
      {cfg.label}
    </span>
  );
}
