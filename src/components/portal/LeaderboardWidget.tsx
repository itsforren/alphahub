import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Crown, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useClientSuccessData, TopProducer } from '@/hooks/useClientSuccessData';
import { cn } from '@/lib/utils';

const formatCompact = (value: number) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return null;
}

const rankColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
};

const rankBg: Record<number, string> = {
  1: 'bg-yellow-400/10 border-yellow-400/20',
  2: 'bg-gray-300/10 border-gray-300/20',
  3: 'bg-amber-600/10 border-amber-600/20',
};

function ProducerRow({ producer }: { producer: TopProducer }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: producer.rank * 0.1 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        rankBg[producer.rank] || 'bg-muted/30 border-white/5'
      )}
    >
      {/* Rank badge */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        producer.rank === 1 && "bg-yellow-400/20",
        producer.rank === 2 && "bg-gray-300/20",
        producer.rank === 3 && "bg-amber-600/20",
      )}>
        <RankIcon rank={producer.rank} />
      </div>

      {/* Name + metrics */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-semibold text-base truncate",
          rankColors[producer.rank] || 'text-foreground'
        )}>
          {producer.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-sm text-muted-foreground">
          <span>
            Incoming: <span className="text-foreground font-medium">{formatCompact(producer.incomingCommissions)}</span>
          </span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span>
            Paid: <span className="text-emerald-400 font-semibold">{formatCompact(producer.paidCommissions)}</span>
          </span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span>
            Avg: <span className="text-foreground font-medium">{formatCompact(producer.avgCommissionSize)}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function LeaderboardWidget() {
  const { data, isLoading } = useClientSuccessData();
  const producers = data?.topProducers || [];

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-white/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-muted/50 rounded-full animate-pulse" />
            <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (producers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn(
        "relative overflow-hidden",
        "bg-card/50 border-white/10",
        "backdrop-blur-xl"
      )}>
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Top Alpha Agents
              </h3>
            </div>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-muted/50 text-muted-foreground">
              60-Day Rolling
            </Badge>
          </div>

          {/* Ranked by label */}
          <p className="text-xs text-muted-foreground mb-3">
            Ranked by paid commissions — using the same system you use
          </p>

          {/* Producer rows */}
          <div className="space-y-2">
            {producers.map(producer => (
              <ProducerRow key={producer.id} producer={producer} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
