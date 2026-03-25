import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Zap, Phone, PhoneCall, Video, AlertTriangle, TrendingUp } from 'lucide-react';
import type { DiscoveryCallStats } from '@/hooks/useDiscoveryCallStats';
import type { DiscoveryQueueData } from '@/hooks/useLeadDiscoveryQueue';

interface SpeedToLeadScoreboardProps {
  stats: DiscoveryCallStats | null;
  queueData: DiscoveryQueueData;
}

export function SpeedToLeadScoreboard({ stats, queueData }: SpeedToLeadScoreboardProps) {
  const todayStats = useMemo(() => {
    if (!stats) return { total: 0, connected: 0, booked: 0 };
    const today = new Date().toISOString().split('T')[0];
    const todayCalls = stats.recentActivity.filter(
      (c) => c.call_date.startsWith(today)
    );
    const connected = todayCalls.filter((c) => c.answered).length;
    const booked = todayCalls.filter(
      (c) => c.outcome === 'strategy_booked' || c.outcome === 'scheduled'
    ).length;
    return { total: todayCalls.length, connected, booked };
  }, [stats]);

  const untouched = useMemo(() => {
    const leads = queueData.queue.filter((l) => (l.call_attempt_count || 0) === 0);
    if (leads.length === 0) return null;
    // Find oldest untouched lead
    let oldestMs = Infinity;
    leads.forEach((l) => {
      if (l.lead_date) {
        const t = new Date(l.lead_date).getTime();
        if (t < oldestMs) oldestMs = t;
      }
    });
    const ageMs = oldestMs < Infinity ? Date.now() - oldestMs : 0;
    const ageMinutes = ageMs / 60_000;
    let ageLabel = '';
    if (ageMinutes < 60) ageLabel = `${Math.round(ageMinutes)}m`;
    else if (ageMinutes < 1440) ageLabel = `${Math.round(ageMinutes / 60)}h`;
    else ageLabel = `${Math.round(ageMinutes / 1440)}d`;

    return { count: leads.length, ageLabel };
  }, [queueData.queue]);

  const pickupRate = todayStats.total > 0
    ? Math.round((todayStats.connected / todayStats.total) * 100)
    : 0;
  const bookingRate = todayStats.connected > 0
    ? Math.round((todayStats.booked / todayStats.connected) * 100)
    : 0;

  const rateColor = (rate: number) =>
    rate >= 30 ? 'text-green-400' : rate >= 15 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-muted/20 border border-border/30 text-xs flex-wrap">
      {/* Untouched alert */}
      {untouched && (
        <span className="flex items-center gap-1.5 font-bold text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
          {untouched.count} untouched
          <span className="text-red-400/60">(oldest: {untouched.ageLabel})</span>
        </span>
      )}

      <span className="flex items-center gap-1.5 font-bold text-muted-foreground">
        <Zap className="h-3.5 w-3.5 text-amber-400" /> Today
      </span>

      <span className="flex items-center gap-1 text-foreground font-semibold">
        <Phone className="h-3 w-3 text-muted-foreground" /> {todayStats.total} calls
      </span>

      <span className="flex items-center gap-1 text-green-400 font-semibold">
        <PhoneCall className="h-3 w-3" /> {todayStats.connected} connected
      </span>

      {todayStats.booked > 0 && (
        <span className="flex items-center gap-1 text-purple-400 font-semibold">
          <Video className="h-3 w-3" /> {todayStats.booked} booked
        </span>
      )}

      <span className={cn('flex items-center gap-1 font-semibold', rateColor(pickupRate))}>
        <TrendingUp className="h-3 w-3" /> {pickupRate}% pickup
      </span>

      {todayStats.connected > 0 && (
        <span className={cn('flex items-center gap-1 font-semibold', rateColor(bookingRate))}>
          {bookingRate}% booking
        </span>
      )}
    </div>
  );
}
