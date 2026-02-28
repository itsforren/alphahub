import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';
import { CampaignWithClient } from '@/hooks/useCampaignCommandCenter';

interface OverallHealthScoreProps {
  campaigns: CampaignWithClient[] | undefined;
  isLoading?: boolean;
}

function calculateOverallHealth(campaigns: CampaignWithClient[]): {
  score: number;
  breakdown: {
    green: number;
    yellow: number;
    red: number;
    safeMode: number;
    noData: number;
  };
} {
  if (!campaigns || campaigns.length === 0) {
    return {
      score: 0,
      breakdown: { green: 0, yellow: 0, red: 0, safeMode: 0, noData: 0 },
    };
  }

  const activeCampaigns = campaigns.filter(c => c.clients?.billing_status !== 'churned');
  
  const breakdown = {
    green: activeCampaigns.filter(c => c.status === 'green' && !c.safe_mode).length,
    yellow: activeCampaigns.filter(c => c.status === 'yellow' && !c.safe_mode).length,
    red: activeCampaigns.filter(c => c.status === 'red' && !c.safe_mode).length,
    safeMode: activeCampaigns.filter(c => c.safe_mode).length,
    noData: activeCampaigns.filter(c => c.noData).length,
  };

  // Weighted score calculation
  // Green = 100, Yellow = 60, Red = 20, SafeMode = 10, NoData = 0
  const weights = {
    green: 100,
    yellow: 60,
    red: 20,
    safeMode: 10,
    noData: 0,
  };

  const total = activeCampaigns.length;
  if (total === 0) return { score: 0, breakdown };

  const weightedSum = 
    breakdown.green * weights.green +
    breakdown.yellow * weights.yellow +
    breakdown.red * weights.red +
    breakdown.safeMode * weights.safeMode +
    breakdown.noData * weights.noData;

  const score = Math.round(weightedSum / total);

  return { score, breakdown };
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-green-500 to-green-600';
  if (score >= 60) return 'from-yellow-500 to-yellow-600';
  if (score >= 40) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Work';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

export function OverallHealthScore({ campaigns, isLoading }: OverallHealthScoreProps) {
  const { score, breakdown } = useMemo(
    () => calculateOverallHealth(campaigns || []),
    [campaigns]
  );

  const total = breakdown.green + breakdown.yellow + breakdown.red + breakdown.safeMode + breakdown.noData;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const gradient = getScoreGradient(score);

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="relative overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Circular gauge */}
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      strokeWidth="8"
                      fill="none"
                      className="stroke-muted"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      className={`stroke-current ${scoreColor} transition-all duration-500`}
                      strokeDasharray={`${(score / 100) * 213.6} 213.6`}
                    />
                  </svg>
                  {/* Score text in center */}
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`text-xl font-bold ${scoreColor}`}>{score}</span>
                  </div>
                </div>

                {/* Labels and breakdown */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className={`h-4 w-4 ${scoreColor}`} />
                    <span className="text-sm font-medium">Account Health</span>
                  </div>
                  <span className={`text-lg font-semibold ${scoreColor}`}>{scoreLabel}</span>
                  
                  {/* Mini breakdown bar */}
                  <div className="flex h-2 mt-2 rounded-full overflow-hidden bg-muted">
                    {breakdown.green > 0 && (
                      <div 
                        className="bg-green-500 transition-all duration-300"
                        style={{ width: `${(breakdown.green / total) * 100}%` }}
                      />
                    )}
                    {breakdown.yellow > 0 && (
                      <div 
                        className="bg-yellow-500 transition-all duration-300"
                        style={{ width: `${(breakdown.yellow / total) * 100}%` }}
                      />
                    )}
                    {breakdown.red > 0 && (
                      <div 
                        className="bg-red-500 transition-all duration-300"
                        style={{ width: `${(breakdown.red / total) * 100}%` }}
                      />
                    )}
                    {breakdown.safeMode > 0 && (
                      <div 
                        className="bg-orange-500 transition-all duration-300"
                        style={{ width: `${(breakdown.safeMode / total) * 100}%` }}
                      />
                    )}
                    {breakdown.noData > 0 && (
                      <div 
                        className="bg-gray-400 transition-all duration-300"
                        style={{ width: `${(breakdown.noData / total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64">
          <div className="space-y-2">
            <p className="font-medium">Health Score Breakdown</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Green: {breakdown.green}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Yellow: {breakdown.yellow}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Red: {breakdown.red}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Safe Mode: {breakdown.safeMode}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t">
              Score weighted: Green=100, Yellow=60, Red=20, Safe=10
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
