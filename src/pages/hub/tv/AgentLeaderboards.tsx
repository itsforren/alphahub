import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Users, Target, DollarSign, Award,
  RefreshCw, Medal, Crown
} from 'lucide-react';
import { useClientSuccessData, AgentRank } from '@/hooks/useClientSuccessData';
import { AuroraBackground, GlassCard, AnimatedNumber } from '@/components/tv';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Color scheme
const COLORS = {
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
  leads: '#60a5fa',
  booked: '#a78bfa',
  premium: '#4ade80',
  commission: '#fbbf24',
};

// Live indicator
const LiveIndicator = memo(function LiveIndicator({ 
  lastUpdated,
  isLoading 
}: { 
  lastUpdated: Date | null;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
        </span>
        <span className="text-emerald-400 font-semibold tracking-wide">LIVE</span>
      </div>
      {lastUpdated && !isLoading && (
        <span className="text-sm text-muted-foreground">
          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </span>
      )}
      {isLoading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
    </div>
  );
});

// Rank Badge
const RankBadge = memo(function RankBadge({ rank }: { rank: number }) {
  const getStyle = () => {
    switch (rank) {
      case 1:
        return {
          bg: 'linear-gradient(135deg, #ffd700, #ffb700)',
          shadow: `0 0 20px ${COLORS.gold}`,
          icon: Crown,
          textColor: '#1a1a1a'
        };
      case 2:
        return {
          bg: 'linear-gradient(135deg, #c0c0c0, #a0a0a0)',
          shadow: `0 0 15px ${COLORS.silver}50`,
          icon: Medal,
          textColor: '#1a1a1a'
        };
      case 3:
        return {
          bg: 'linear-gradient(135deg, #cd7f32, #b87333)',
          shadow: `0 0 15px ${COLORS.bronze}50`,
          icon: Medal,
          textColor: '#fff'
        };
      default:
        return {
          bg: 'rgba(255,255,255,0.1)',
          shadow: 'none',
          icon: null,
          textColor: 'rgba(255,255,255,0.7)'
        };
    }
  };

  const style = getStyle();

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0"
      style={{
        background: style.bg,
        boxShadow: style.shadow,
        color: style.textColor
      }}
    >
      {style.icon ? <style.icon className="w-6 h-6" /> : rank}
    </motion.div>
  );
});

// Leaderboard Entry
const LeaderboardEntry = memo(function LeaderboardEntry({ 
  agent, 
  isCurrency = false,
  color,
  index
}: { 
  agent: AgentRank;
  isCurrency?: boolean;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-all",
        agent.rank <= 3 ? "bg-white/5" : "bg-white/[0.02]"
      )}
    >
      <RankBadge rank={agent.rank} />
      
      <div className="flex-1 min-w-0">
        <span 
          className={cn(
            "font-bold block truncate",
            agent.rank === 1 ? "text-3xl" : agent.rank === 2 ? "text-2xl" : agent.rank === 3 ? "text-xl" : "text-lg"
          )}
          style={{ 
            color: agent.rank <= 3 ? (agent.rank === 1 ? COLORS.gold : agent.rank === 2 ? COLORS.silver : COLORS.bronze) : 'white'
          }}
        >
          {agent.name}
        </span>
      </div>

      <div 
        className={cn(
          "font-mono font-bold tabular-nums",
          agent.rank === 1 ? "text-4xl" : agent.rank === 2 ? "text-3xl" : agent.rank === 3 ? "text-2xl" : "text-xl"
        )}
        style={{ color }}
      >
        {isCurrency ? `$${(agent.value / 1000).toFixed(0)}k` : agent.value.toLocaleString()}
      </div>
    </motion.div>
  );
});

// Leaderboard Card
const LeaderboardCard = memo(function LeaderboardCard({ 
  icon: Icon,
  title,
  agents,
  isCurrency = false,
  color
}: { 
  icon: typeof Trophy;
  title: string;
  agents: AgentRank[];
  isCurrency?: boolean;
  color: string;
}) {
  return (
    <GlassCard className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
        <Icon className="w-6 h-6" style={{ color }} />
        <h3 className="text-lg font-semibold uppercase tracking-wide" style={{ color }}>{title}</h3>
      </div>
      
      <div className="flex-1 p-4 space-y-3 overflow-auto">
        {agents.length > 0 ? (
          agents.map((agent, i) => (
            <LeaderboardEntry 
              key={agent.id} 
              agent={agent} 
              isCurrency={isCurrency}
              color={color}
              index={i}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Trophy className="w-12 h-12 mb-4 opacity-30" />
            <span>No data available</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
});

export default function AgentLeaderboards() {
  const { data, isLoading, isRefetching } = useClientSuccessData();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (data?.lastUpdated) {
      setLastUpdated(data.lastUpdated);
    }
  }, [data?.lastUpdated]);

  // Generate commission data from premium (estimated 10% commission)
  const topAgentsByCommissions = (data?.topAgentsByIssuedPremium || []).map(agent => ({
    ...agent,
    value: Math.round(agent.value * 0.1)
  }));

  return (
    <AuroraBackground>
      <div className="h-screen p-6 flex flex-col gap-6 overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-4">
            <Trophy 
              className="w-10 h-10" 
              style={{ color: COLORS.gold, filter: `drop-shadow(0 0 15px ${COLORS.gold})` }}
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Agent Leaderboards</h1>
              <p className="text-muted-foreground text-sm">30-Day Rolling Performance</p>
            </div>
            <LiveIndicator lastUpdated={lastUpdated} isLoading={isLoading || isRefetching} />
          </div>
        </motion.div>

        {/* Two-Zone Layout */}
        <div className="flex-1 grid grid-cols-2 gap-8 min-h-0">
          {/* Left Zone - Volume Metrics */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-4">
              <Users className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-blue-400">VOLUME LEADERS</h2>
            </div>
            
            <div className="flex-1 grid grid-rows-2 gap-6 min-h-0">
              <LeaderboardCard
                icon={Users}
                title="Top Lead Volume"
                agents={data?.topAgentsByLeadVolume || []}
                color={COLORS.leads}
              />
              <LeaderboardCard
                icon={Target}
                title="Top Booked Calls"
                agents={data?.topAgentsByBookedCalls || []}
                color={COLORS.booked}
              />
            </div>
          </div>

          {/* Right Zone - Money Metrics */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-4">
              <DollarSign className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-green-400">MONEY LEADERS</h2>
            </div>
            
            <div className="flex-1 grid grid-rows-2 gap-6 min-h-0">
              <LeaderboardCard
                icon={DollarSign}
                title="Top Issued Premium"
                agents={data?.topAgentsByIssuedPremium || []}
                isCurrency
                color={COLORS.premium}
              />
              <LeaderboardCard
                icon={Award}
                title="Top Commissions"
                agents={topAgentsByCommissions}
                isCurrency
                color={COLORS.commission}
              />
            </div>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
