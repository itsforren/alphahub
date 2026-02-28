import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Bot, Zap, CheckCircle2, XCircle, PauseCircle,
  RefreshCw, MessageSquare, Sparkles, TrendingUp, Smile, Meh, Frown
} from 'lucide-react';
import { useEngineRoomData } from '@/hooks/useEngineRoomData';
import { GlassCard, AnimatedNumber } from '@/components/tv';
import { CircularProgress } from '@/components/tv/CircularProgress';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Cyberpunk color scheme
const COLORS = {
  neonGreen: '#00ff88',
  neonBlue: '#00d4ff',
  neonPink: '#ff00ff',
  neonYellow: '#ffff00',
  darkBg: '#0a0a0f',
};

// Live indicator with cyberpunk style
const CyberpunkLiveIndicator = memo(function CyberpunkLiveIndicator({ 
  lastUpdated,
  isLoading 
}: { 
  lastUpdated: Date | null;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        animate={{ 
          opacity: [1, 0.5, 1],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="flex items-center gap-2"
      >
        <div 
          className="w-3 h-3 rounded-full"
          style={{ 
            backgroundColor: COLORS.neonGreen,
            boxShadow: `0 0 10px ${COLORS.neonGreen}, 0 0 20px ${COLORS.neonGreen}50`
          }}
        />
        <span 
          className="font-mono font-bold tracking-widest"
          style={{ color: COLORS.neonGreen }}
        >
          {isLoading ? 'SYNCING' : 'ONLINE'}
        </span>
      </motion.div>
      {lastUpdated && !isLoading && (
        <span className="text-sm text-muted-foreground font-mono">
          {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </span>
      )}
      {isLoading && <RefreshCw className="w-4 h-4 animate-spin" style={{ color: COLORS.neonBlue }} />}
    </div>
  );
});

// Large Ring Gauge
const RingGauge = memo(function RingGauge({ 
  value, 
  label,
  color,
  size = 200
}: { 
  value: number; 
  label: string;
  color: string;
  size?: number;
}) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={12}
        />
        {/* Animated ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-6xl font-black tabular-nums"
          style={{ color, textShadow: `0 0 30px ${color}` }}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          {value.toFixed(0)}%
        </motion.span>
        <span className="text-sm text-muted-foreground uppercase tracking-wider mt-1">
          {label}
        </span>
      </div>
    </div>
  );
});

// AI Metric Counter
const AICounter = memo(function AICounter({ 
  icon: Icon,
  value, 
  label,
  color
}: { 
  icon: typeof Zap;
  value: number; 
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <Icon 
        className="w-10 h-10" 
        style={{ color, filter: `drop-shadow(0 0 15px ${color})` }}
      />
      <motion.span 
        className="text-5xl font-black tabular-nums font-mono"
        style={{ color, textShadow: `0 0 20px ${color}` }}
      >
        <AnimatedNumber value={value} format="number" />
      </motion.span>
      <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
});

// Sentiment Emoji
const SentimentDisplay = memo(function SentimentDisplay({ score }: { score: number }) {
  const getSentiment = () => {
    if (score >= 70) return { icon: Smile, color: COLORS.neonGreen, label: 'Positive' };
    if (score >= 40) return { icon: Meh, color: COLORS.neonYellow, label: 'Neutral' };
    return { icon: Frown, color: '#ff4444', label: 'Needs Attention' };
  };

  const sentiment = getSentiment();
  const Icon = sentiment.icon;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Icon 
          className="w-20 h-20" 
          style={{ color: sentiment.color, filter: `drop-shadow(0 0 20px ${sentiment.color})` }}
        />
      </motion.div>
      <span className="text-xl font-bold" style={{ color: sentiment.color }}>{sentiment.label}</span>
      <span className="text-sm text-muted-foreground">Sentiment Score: {score}%</span>
    </div>
  );
});

export default function AIAutopilot() {
  const { data, isLoading, dataUpdatedAt } = useEngineRoomData();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  // Mock bot data (would come from actual bot integration)
  const botResolutionRate = 65;
  const botEngagementRate = 78;
  const botSentimentScore = 72;

  return (
    <div 
      className="h-screen p-6 flex flex-col gap-6 overflow-hidden"
      style={{ backgroundColor: COLORS.darkBg }}
    >
      {/* Cyberpunk grid overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(${COLORS.neonBlue}20 1px, transparent 1px),
            linear-gradient(90deg, ${COLORS.neonBlue}20 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between shrink-0 relative z-10"
      >
        <div className="flex items-center gap-4">
          <Brain 
            className="w-10 h-10" 
            style={{ color: COLORS.neonGreen, filter: `drop-shadow(0 0 15px ${COLORS.neonGreen})` }}
          />
          <div>
            <h1 
              className="text-4xl font-black tracking-tight"
              style={{ 
                color: COLORS.neonGreen,
                textShadow: `0 0 30px ${COLORS.neonGreen}60`
              }}
            >
              AI AUTOPILOT
            </h1>
            <p className="text-muted-foreground text-sm font-mono">Neural Network Operations</p>
          </div>
          <CyberpunkLiveIndicator lastUpdated={lastUpdated} isLoading={isLoading} />
        </div>
      </motion.div>

      {/* Main Content - Split Screen */}
      <div className="flex-1 grid grid-cols-2 gap-6 relative z-10">
        {/* Left Half - Ads Manager AI */}
        <div 
          className="rounded-2xl border p-6 flex flex-col gap-6"
          style={{ 
            backgroundColor: 'rgba(0, 255, 136, 0.05)',
            borderColor: `${COLORS.neonGreen}30`
          }}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" style={{ color: COLORS.neonGreen }} />
            <h2 className="text-xl font-bold" style={{ color: COLORS.neonGreen }}>ADS MANAGER AI</h2>
          </div>

          {/* Large Acceptance Rate Ring */}
          <div className="flex-1 flex items-center justify-center">
            <RingGauge 
              value={data?.suggestionAcceptanceRate || 0} 
              label="Acceptance Rate"
              color={COLORS.neonGreen}
              size={280}
            />
          </div>

          {/* Kill/Scale Counts */}
          <div className="grid grid-cols-3 gap-4">
            <AICounter
              icon={CheckCircle2}
              value={Math.round((data?.suggestionAcceptanceRate || 0) * 0.5)}
              label="Accepted"
              color={COLORS.neonGreen}
            />
            <AICounter
              icon={PauseCircle}
              value={5}
              label="Pending"
              color={COLORS.neonYellow}
            />
            <AICounter
              icon={XCircle}
              value={Math.round((100 - (data?.suggestionAcceptanceRate || 0)) * 0.3)}
              label="Rejected"
              color="#ff4444"
            />
          </div>
        </div>

        {/* Right Half - Conversational Bot */}
        <div 
          className="rounded-2xl border p-6 flex flex-col gap-6"
          style={{ 
            backgroundColor: 'rgba(0, 212, 255, 0.05)',
            borderColor: `${COLORS.neonBlue}30`
          }}
        >
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6" style={{ color: COLORS.neonBlue }} />
            <h2 className="text-xl font-bold" style={{ color: COLORS.neonBlue }}>CONVERSATIONAL BOT</h2>
          </div>

          {/* Bot Resolution Rate */}
          <div className="flex-1 grid grid-rows-2 gap-6">
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center gap-3">
                <CircularProgress
                  value={botResolutionRate}
                  label="Resolution Rate"
                  size="lg"
                  greenThreshold={60}
                  redThreshold={30}
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="text-7xl font-black"
                  style={{ color: COLORS.neonBlue, textShadow: `0 0 30px ${COLORS.neonBlue}60` }}
                >
                  {botEngagementRate}%
                </div>
                <span className="text-sm text-muted-foreground uppercase tracking-wider">Engagement Rate</span>
              </div>
            </div>

            {/* Sentiment Display */}
            <div className="flex items-center justify-center">
              <SentimentDisplay score={botSentimentScore} />
            </div>
          </div>

          {/* Bot Metrics Footer */}
          <div 
            className="p-4 rounded-xl flex items-center justify-around"
            style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}
          >
            <div className="text-center">
              <span className="text-2xl font-bold" style={{ color: COLORS.neonBlue }}>2,847</span>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-2xl font-bold" style={{ color: COLORS.neonBlue }}>1.2s</span>
              <p className="text-xs text-muted-foreground">Avg Response</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-2xl font-bold" style={{ color: COLORS.neonBlue }}>94%</span>
              <p className="text-xs text-muted-foreground">Handoff Quality</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
