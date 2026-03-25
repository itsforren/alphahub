import { cn } from '@/lib/utils';
import { Trophy, Phone, PhoneCall, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCallerLeaderboard } from '@/hooks/useCallerLeaderboard';

interface CallerLeaderboardProps {
  agentId: string;
}

const rankConfig: Record<number, { icon: string; color: string; border: string }> = {
  1: { icon: '\uD83E\uDD47', color: 'text-amber-400', border: 'border-l-amber-400/50' },
  2: { icon: '\uD83E\uDD48', color: 'text-gray-300', border: 'border-l-gray-300/50' },
  3: { icon: '\uD83E\uDD49', color: 'text-orange-400', border: 'border-l-orange-400/50' },
};

export function CallerLeaderboard({ agentId }: CallerLeaderboardProps) {
  const { data: callers, isLoading } = useCallerLeaderboard(agentId);

  // Only render if 2+ callers
  if (isLoading || !callers || callers.length < 2) return null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-amber-400" />
          Today's Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {callers.map((caller) => {
          const rank = rankConfig[caller.rank];
          return (
            <div
              key={caller.caller_name}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg border-l-2 bg-muted/10',
                rank?.border || 'border-l-transparent'
              )}
            >
              {/* Rank */}
              <span className={cn('text-sm font-bold w-6 text-center', rank?.color || 'text-muted-foreground')}>
                {rank?.icon || caller.rank}
              </span>

              {/* Name */}
              <span className="font-bold text-sm text-foreground flex-1 truncate">
                {caller.caller_name}
              </span>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground font-semibold">
                  <Phone className="h-3 w-3" /> {caller.calls_made}
                </span>
                <span className="flex items-center gap-1 text-green-400 font-semibold">
                  <PhoneCall className="h-3 w-3" /> {caller.connected}
                </span>
                {caller.booked > 0 && (
                  <span className="flex items-center gap-1 text-purple-400 font-semibold">
                    <Video className="h-3 w-3" /> {caller.booked}
                  </span>
                )}
                <span className={cn(
                  'font-semibold',
                  caller.pickup_rate >= 30 ? 'text-green-400' : caller.pickup_rate >= 15 ? 'text-amber-400' : 'text-red-400'
                )}>
                  {caller.pickup_rate}%
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
