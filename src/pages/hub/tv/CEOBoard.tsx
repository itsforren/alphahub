import { memo, useState } from 'react';
import { 
  DollarSign, TrendingUp, Users, AlertTriangle, Clock, BarChart3, RefreshCw, 
  Percent, Target, Pencil
} from 'lucide-react';
import { useCEOBoardData, useUpdateCEOGoals } from '@/hooks/useCEOBoardData';
import { GlassCard } from '@/components/tv/GlassCard';
import { AnimatedNumber } from '@/components/tv/AnimatedNumber';
import { AuroraBackground } from '@/components/tv/AuroraBackground';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Consistent color palette - matching Client Success exactly
const COLORS = {
  revenue: '#fbbf24',    // Amber-400 (Gold)
  profit: '#22d3ee',     // Cyan-400
  green: '#4ade80',      // Green-400
  blue: '#60a5fa',       // Blue-400
  purple: '#a78bfa',     // Purple-400
  danger: '#f87171',     // Red-400
};

// Live indicator component - matching Client Success exactly
const LiveIndicator = memo(({ isRefetching }: { isRefetching?: boolean }) => (
  <div className="flex items-center gap-3 text-sm">
    <div className="relative flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
      </span>
      <span className="text-emerald-400 font-semibold tracking-wide">LIVE</span>
    </div>
    {isRefetching && (
      <span className="text-muted-foreground/80 flex items-center gap-1.5">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Refreshing...
      </span>
    )}
  </div>
));
LiveIndicator.displayName = 'LiveIndicator';

// Hero metric card with massive numbers - matching Client Success EXACTLY
const HeroMetric = memo(({ 
  icon: Icon, 
  value, 
  label, 
  rate,
  color,
  isCurrency = false,
}: { 
  icon: React.ElementType;
  value: number; 
  label: string;
  rate?: number;
  color: string;
  isCurrency?: boolean;
}) => {
  return (
    <GlassCard className="p-4 flex flex-col items-center justify-center relative overflow-hidden">
      <Icon className="h-8 w-8 mb-2" style={{ color, filter: `drop-shadow(0 0 12px ${color}60)` }} />
      <span 
        className="text-6xl xl:text-7xl font-black tabular-nums tracking-tight"
        style={{ color, textShadow: `0 0 30px ${color}60` }}
      >
        {isCurrency ? '$' : ''}
        <AnimatedNumber value={isCurrency && value >= 1000 ? Math.round(value / 1000) : value} format="number" />
        {isCurrency && value >= 1000 ? 'k' : ''}
      </span>
      <span className="text-sm text-muted-foreground mt-2 uppercase tracking-widest font-medium">{label}</span>
      {rate !== undefined && (
        <span className="text-base font-semibold mt-1" style={{ color: color + 'cc' }}>
          {rate.toFixed(1)}%
        </span>
      )}
    </GlassCard>
  );
});
HeroMetric.displayName = 'HeroMetric';

// Goal progress ring component
const GoalProgressRing = memo(({ 
  current, 
  goal, 
  color,
  size = 120,
}: { 
  current: number; 
  goal: number; 
  color: string;
  size?: number;
}) => {
  const percentage = Math.min((current / goal) * 100, 100);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
        opacity={0.3}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ 
          transition: 'stroke-dashoffset 1s ease-out',
          filter: `drop-shadow(0 0 8px ${color}60)`
        }}
      />
    </svg>
  );
});
GoalProgressRing.displayName = 'GoalProgressRing';

// Goal edit popover component
const GoalEditor = memo(({ 
  label,
  currentGoal,
  goalKey,
  onSave,
  isPending,
}: { 
  label: string;
  currentGoal: number;
  goalKey: 'revenue_goal_mtd' | 'profit_goal_mtd';
  onSave: (key: 'revenue_goal_mtd' | 'profit_goal_mtd', value: number) => void;
  isPending: boolean;
}) => {
  const [value, setValue] = useState(currentGoal.toString());
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onSave(goalKey, numValue);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-1 rounded-full hover:bg-muted/50 transition-colors">
          <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Edit {label}</h4>
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter goal amount"
            className="text-lg"
          />
          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Goal'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
GoalEditor.displayName = 'GoalEditor';

// Hero Goal Card - massive with progress ring
const HeroGoalCard = memo(({ 
  icon: Icon,
  value,
  goal,
  label,
  color,
  goalKey,
  onSaveGoal,
  isPending,
}: { 
  icon: React.ElementType;
  value: number;
  goal: number;
  label: string;
  color: string;
  goalKey: 'revenue_goal_mtd' | 'profit_goal_mtd';
  onSaveGoal: (key: 'revenue_goal_mtd' | 'profit_goal_mtd', value: number) => void;
  isPending: boolean;
}) => {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  
  return (
    <GlassCard glow className="p-6 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <GoalEditor 
          label={label} 
          currentGoal={goal} 
          goalKey={goalKey} 
          onSave={onSaveGoal}
          isPending={isPending}
        />
      </div>
      
      <div className="relative">
        <GoalProgressRing current={value} goal={goal} color={color} size={140} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="h-8 w-8 mb-1" style={{ color, filter: `drop-shadow(0 0 12px ${color}60)` }} />
        </div>
      </div>
      
      <span 
        className="text-5xl xl:text-6xl font-black tabular-nums tracking-tight mt-4"
        style={{ color, textShadow: `0 0 30px ${color}60` }}
      >
        ${value >= 1000 ? `${Math.round(value / 1000)}k` : value}
      </span>
      <span className="text-sm text-muted-foreground mt-2 uppercase tracking-widest font-medium">{label}</span>
      <span className="text-base mt-1 text-muted-foreground">
        of ${goal >= 1000 ? `${Math.round(goal / 1000)}k` : goal} ({percentage.toFixed(0)}%)
      </span>
    </GlassCard>
  );
});
HeroGoalCard.displayName = 'HeroGoalCard';

// Gauge component for rates
const GaugeMetric = memo(function GaugeMetric({ 
  value, 
  label, 
  greenThreshold = 70,
  redThreshold = 30,
  invert = false,
  color,
}: { 
  value: number; 
  label: string; 
  greenThreshold?: number;
  redThreshold?: number;
  invert?: boolean;
  color?: string;
}) {
  let displayColor = color || 'hsl(var(--warning))';
  if (!color) {
    if (invert) {
      if (value <= redThreshold) displayColor = COLORS.green;
      else if (value >= greenThreshold) displayColor = COLORS.danger;
    } else {
      if (value >= greenThreshold) displayColor = COLORS.green;
      else if (value <= redThreshold) displayColor = COLORS.danger;
    }
  }

  return (
    <GlassCard className="p-4 flex flex-col items-center justify-center">
      <span 
        className="text-5xl xl:text-6xl font-black tabular-nums tracking-tight"
        style={{ color: displayColor, textShadow: `0 0 30px ${displayColor}60` }}
      >
        <AnimatedNumber value={value} format="number" suffix="%" />
      </span>
      <span className="text-sm text-muted-foreground mt-2 uppercase tracking-widest font-medium">{label}</span>
    </GlassCard>
  );
});

export default function CEOBoard() {
  const { data, isLoading, isRefetching } = useCEOBoardData();
  const updateGoals = useUpdateCEOGoals();

  const handleSaveGoal = (key: 'revenue_goal_mtd' | 'profit_goal_mtd', value: number) => {
    updateGoals.mutate({ key, value }, {
      onSuccess: () => {
        toast.success('Goal updated successfully');
      },
      onError: () => {
        toast.error('Failed to update goal');
      },
    });
  };

  if (isLoading) {
    return (
      <AuroraBackground>
        <div className="p-6 space-y-5 h-screen">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-6" style={{ height: '30%' }}>
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-full rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-4 gap-5" style={{ height: '24%' }}>
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-full rounded-xl" />)}
          </div>
          <div className="grid grid-cols-4 gap-5" style={{ height: '24%' }}>
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-full rounded-xl" />)}
          </div>
        </div>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <div className="p-6 h-screen flex flex-col gap-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight">CEO Board</h1>
            <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">Financials</span>
          </div>
          <LiveIndicator isRefetching={isRefetching} />
        </div>

        {/* Row 1: Hero Revenue & Profit with Goals - 2 massive cards spanning 50% each */}
        <div className="grid grid-cols-2 gap-6 flex-shrink-0" style={{ height: '30%' }}>
          <HeroGoalCard 
            icon={DollarSign} 
            value={data?.totalRevenue || 0} 
            goal={data?.revenueGoal || 50000}
            label="Total Revenue MTD" 
            color={COLORS.revenue}
            goalKey="revenue_goal_mtd"
            onSaveGoal={handleSaveGoal}
            isPending={updateGoals.isPending}
          />
          <HeroGoalCard 
            icon={TrendingUp} 
            value={data?.profitMTD || 0} 
            goal={data?.profitGoal || 25000}
            label="Profit MTD" 
            color={COLORS.profit}
            goalKey="profit_goal_mtd"
            onSaveGoal={handleSaveGoal}
            isPending={updateGoals.isPending}
          />
        </div>

        {/* Row 2: Financial Details - 4 cards */}
        <div className="grid grid-cols-4 gap-5 flex-shrink-0" style={{ height: '24%' }}>
          <HeroMetric 
            icon={DollarSign} 
            value={data?.managementFeeRevenueMTD || 0} 
            label="Management Fees" 
            color={COLORS.green}
            isCurrency
          />
          <HeroMetric 
            icon={DollarSign} 
            value={data?.adSpendDepositsCollected || 0} 
            label="Ad Spend Deposits" 
            color={COLORS.blue}
            isCurrency
          />
          <HeroMetric 
            icon={Percent} 
            value={data?.performanceFeeRevenue || 0} 
            label="Performance Fees" 
            color={COLORS.purple}
            isCurrency
          />
          <HeroMetric 
            icon={Users} 
            value={data?.activeAgentsCount || 0} 
            label="Active Agents" 
            color={COLORS.profit}
          />
        </div>

        {/* Row 3: LTV & Health Metrics - 4 cards */}
        <div className="grid grid-cols-4 gap-5 flex-shrink-0" style={{ height: '24%' }}>
          <HeroMetric 
            icon={Target} 
            value={data?.averageClientLTV || 0} 
            label="Avg Client LTV" 
            color={COLORS.purple}
            isCurrency
          />
          <HeroMetric 
            icon={Clock} 
            value={data?.averageClientLifespan || 0} 
            label="Avg Lifespan (mo)" 
            color={COLORS.blue}
          />
          <GaugeMetric
            value={data?.profitMargin || 0}
            label="Profit Margin"
            greenThreshold={50}
            redThreshold={20}
          />
          <GaugeMetric
            value={data?.churnRate || 0}
            label="Churn Rate"
            greenThreshold={15}
            redThreshold={5}
            invert
          />
        </div>

        {/* Row 4: Churn & Projected - 2 wide cards */}
        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
          <GlassCard variant="danger" glow={!!data?.churnCount} className="p-6 flex flex-col items-center justify-center">
            <AlertTriangle className="h-10 w-10 mb-3" style={{ color: COLORS.danger, filter: 'drop-shadow(0 0 12px rgba(248,113,113,0.6))' }} />
            <span 
              className="text-6xl xl:text-7xl font-black tabular-nums tracking-tight"
              style={{ color: COLORS.danger, textShadow: '0 0 40px rgba(248,113,113,0.6)' }}
            >
              <AnimatedNumber value={data?.churnCount || 0} format="number" />
            </span>
            <span className="text-sm text-muted-foreground mt-3 uppercase tracking-widest font-medium">Churn Count MTD</span>
          </GlassCard>

          <HeroMetric 
            icon={TrendingUp} 
            value={data?.profitProjected || 0} 
            label="Projected Profit" 
            color={COLORS.revenue}
            isCurrency
          />
        </div>
      </div>
    </AuroraBackground>
  );
}
