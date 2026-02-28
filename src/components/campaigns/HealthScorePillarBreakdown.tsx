import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, 
  Target, 
  DollarSign, 
  Phone,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface HealthScorePillar {
  name: string;
  score: number;
  maxScore: number;
  icon: React.ElementType;
  details?: string;
}

interface HealthScorePillarBreakdownProps {
  healthScore: number;
  healthLabel?: string | null;
  healthScoreDelivery?: number | null;
  healthScoreCvr?: number | null;
  healthScoreCpl?: number | null;
  healthScoreBookedCall?: number | null;
  healthDrivers?: { positive: string[]; negative: string[] } | null;
  bookedCallRate7d?: number | null;
  leads7d?: number | null;
  bookedCalls7d?: number | null;
}

function PillarRow({ pillar }: { pillar: HealthScorePillar }) {
  const percentage = (pillar.score / pillar.maxScore) * 100;
  const Icon = pillar.icon;
  
  const getColorClass = () => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="p-1.5 rounded bg-muted">
        <Icon className={`h-4 w-4 ${getColorClass()}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{pillar.name}</span>
          <span className={`text-sm font-semibold ${getColorClass()}`}>
            {pillar.score}/{pillar.maxScore}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div 
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {pillar.details && (
          <p className="text-xs text-muted-foreground mt-1">{pillar.details}</p>
        )}
      </div>
    </div>
  );
}

function getHealthLabelBadge(score: number, label?: string | null) {
  const displayLabel = label || (
    score >= 85 ? 'Healthy' :
    score >= 70 ? 'Good' :
    score >= 55 ? 'At Risk' :
    'Critical'
  );
  
  const colorClass = score >= 85 ? 'bg-green-100 text-green-700 border-green-300' :
                     score >= 70 ? 'bg-blue-100 text-blue-700 border-blue-300' :
                     score >= 55 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                     'bg-red-100 text-red-700 border-red-300';

  const Icon = score >= 85 ? CheckCircle :
               score >= 55 ? AlertCircle :
               AlertTriangle;

  return (
    <Badge variant="outline" className={`${colorClass} gap-1`}>
      <Icon className="h-3 w-3" />
      {displayLabel}
    </Badge>
  );
}

export function HealthScorePillarBreakdown({
  healthScore,
  healthLabel,
  healthScoreDelivery,
  healthScoreCvr,
  healthScoreCpl,
  healthScoreBookedCall,
  healthDrivers,
  bookedCallRate7d,
  leads7d,
  bookedCalls7d,
}: HealthScorePillarBreakdownProps) {
  // 4 pillars totaling 95 points max
  const pillars: HealthScorePillar[] = [
    {
      name: 'Delivery & Pacing',
      score: healthScoreDelivery ?? 0,
      maxScore: 35,
      icon: Truck,
      details: 'Budget utilization and wallet pacing',
    },
    {
      name: 'Funnel CVR',
      score: healthScoreCvr ?? 0,
      maxScore: 25,
      icon: Target,
      details: 'Conversion rate performance',
    },
    {
      name: 'Cost Efficiency (CPL)',
      score: healthScoreCpl ?? 0,
      maxScore: 20,
      icon: DollarSign,
      details: 'Cost per lead optimization',
    },
    {
      name: 'Booked Call Quality',
      score: healthScoreBookedCall ?? 0,
      maxScore: 15,
      icon: Phone,
      details: bookedCallRate7d != null 
        ? `${bookedCallRate7d.toFixed(1)}% booked (${bookedCalls7d || 0}/${leads7d || 0} leads)`
        : 'Booked call conversion rate',
    },
  ];

  const totalScore = pillars.reduce((sum, p) => sum + p.score, 0);
  const totalMaxScore = 95; // 4 pillars total

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overall Health Score</p>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-3xl font-bold ${
                healthScore >= 85 ? 'text-green-500' :
                healthScore >= 70 ? 'text-blue-500' :
                healthScore >= 55 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {healthScore}
              </span>
              <span className="text-lg text-muted-foreground">/ {totalMaxScore}</span>
            </div>
          </div>
          {getHealthLabelBadge(healthScore, healthLabel)}
        </div>

        {/* Pillars Breakdown */}
        <div className="space-y-1 pt-2 border-t">
          {pillars.map((pillar) => (
            <PillarRow key={pillar.name} pillar={pillar} />
          ))}
        </div>

        {/* Health Drivers */}
        {healthDrivers && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Key Drivers</p>
            {healthDrivers.positive?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {healthDrivers.positive.map((driver, i) => (
                  <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                    ✓ {driver}
                  </Badge>
                ))}
              </div>
            )}
            {healthDrivers.negative?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {healthDrivers.negative.map((driver, i) => (
                  <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                    ✗ {driver}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
