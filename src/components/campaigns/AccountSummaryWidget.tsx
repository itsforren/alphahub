import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Wallet,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { CampaignWithClient, Proposal } from '@/hooks/useCampaignCommandCenter';

interface AccountSummaryWidgetProps {
  campaigns: CampaignWithClient[] | undefined;
  proposals: Proposal[] | undefined;
  stats: {
    totalWalletRemaining?: number;
    pendingApprovalsCount?: number;
    safeModeCount?: number;
    behindPaceCount?: number;
    avgCPL?: number;
    totalSpendYesterday?: number;
  } | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

interface Alert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  action?: string;
}

function calculateOverallHealth(campaigns: CampaignWithClient[]): number {
  if (!campaigns || campaigns.length === 0) return 0;
  
  // Filter out campaigns with no data
  const campaignsWithHealth = campaigns.filter(c => c.health_score != null);
  if (campaignsWithHealth.length === 0) return 0;
  
  // Calculate weighted average based on wallet remaining (more spend = more importance)
  let totalWeight = 0;
  let weightedSum = 0;
  
  campaignsWithHealth.forEach(c => {
    const weight = c.walletInfo?.walletRemaining || c.current_daily_budget || 1;
    totalWeight += weight;
    weightedSum += (c.health_score || 0) * weight;
  });
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: 'text-green-600' };
  if (score >= 70) return { label: 'Good', color: 'text-green-500' };
  if (score >= 50) return { label: 'Fair', color: 'text-yellow-500' };
  if (score >= 30) return { label: 'Needs Attention', color: 'text-orange-500' };
  return { label: 'Critical', color: 'text-red-600' };
}

function generateAlerts(
  campaigns: CampaignWithClient[] | undefined,
  proposals: Proposal[] | undefined,
  stats: AccountSummaryWidgetProps['stats']
): Alert[] {
  const alerts: Alert[] = [];
  
  // Safe mode campaigns
  const safeModeCount = stats?.safeModeCount || 0;
  if (safeModeCount > 0) {
    const safeModeCampaigns = campaigns?.filter(c => c.safe_mode) || [];
    const names = safeModeCampaigns.slice(0, 2).map(c => c.clients?.name || 'Unknown').join(', ');
    alerts.push({
      type: 'critical',
      message: `${safeModeCount} campaign${safeModeCount > 1 ? 's' : ''} in Safe Mode: ${names}${safeModeCount > 2 ? ` +${safeModeCount - 2} more` : ''}`,
      action: 'Review wallets',
    });
  }
  
  // Pending approvals
  const pendingCount = stats?.pendingApprovalsCount || 0;
  if (pendingCount > 0) {
    const totalBudgetChange = proposals?.reduce((sum, p) => {
      if (p.status === 'pending' && p.proposed_daily_budget != null) {
        const campaign = campaigns?.find(c => c.id === p.campaign_id);
        return sum + ((p.proposed_daily_budget || 0) - (campaign?.current_daily_budget || 0));
      }
      return sum;
    }, 0) || 0;
    
    alerts.push({
      type: 'warning',
      message: `${pendingCount} pending approval${pendingCount > 1 ? 's' : ''} (${totalBudgetChange >= 0 ? '+' : ''}$${totalBudgetChange.toFixed(0)}/day total)`,
      action: 'Review proposals',
    });
  }
  
  // Behind pace
  const behindPaceCount = stats?.behindPaceCount || 0;
  if (behindPaceCount > 0) {
    alerts.push({
      type: 'warning',
      message: `${behindPaceCount} campaign${behindPaceCount > 1 ? 's are' : ' is'} behind pace`,
      action: 'Check budgets',
    });
  }
  
  // Low wallet warning
  const lowWalletCampaigns = campaigns?.filter(c => {
    const daysRemaining = c.walletInfo?.daysRemaining;
    return daysRemaining != null && daysRemaining < 7 && !c.safe_mode;
  }) || [];
  
  if (lowWalletCampaigns.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${lowWalletCampaigns.length} campaign${lowWalletCampaigns.length > 1 ? 's' : ''} with less than 7 days of budget remaining`,
      action: 'Request deposits',
    });
  }
  
  return alerts;
}

function generateSummary(
  campaigns: CampaignWithClient[] | undefined,
  stats: AccountSummaryWidgetProps['stats'],
  overallHealth: number
): string {
  if (!campaigns || campaigns.length === 0) {
    return 'No active campaigns to analyze. Run AI Review to get started.';
  }
  
  const activeCampaigns = campaigns.filter(c => c.clients?.billing_status !== 'churned');
  const greenCount = activeCampaigns.filter(c => c.status === 'green' && !c.safe_mode).length;
  const yellowCount = activeCampaigns.filter(c => c.status === 'yellow' && !c.safe_mode).length;
  const redCount = activeCampaigns.filter(c => c.status === 'red' && !c.safe_mode).length;
  const safeModeCount = activeCampaigns.filter(c => c.safe_mode).length;
  
  const totalWallet = stats?.totalWalletRemaining || 0;
  const avgDaysRemaining = activeCampaigns.reduce((sum, c) => sum + (c.walletInfo?.daysRemaining || 0), 0) / activeCampaigns.length || 0;
  
  let summary = `${greenCount} of ${activeCampaigns.length} campaigns are performing well. `;
  
  if (yellowCount > 0 || redCount > 0) {
    summary += `${yellowCount + redCount} need${yellowCount + redCount === 1 ? 's' : ''} attention`;
    if (safeModeCount > 0) {
      summary += ` and ${safeModeCount} ${safeModeCount === 1 ? 'is' : 'are'} in safe mode`;
    }
    summary += '. ';
  }
  
  summary += `Total wallet: $${(totalWallet / 1000).toFixed(1)}k across all accounts`;
  
  if (avgDaysRemaining > 0) {
    summary += ` with ~${Math.round(avgDaysRemaining)} days average remaining.`;
  } else {
    summary += '.';
  }
  
  return summary;
}

export function AccountSummaryWidget({
  campaigns,
  proposals,
  stats,
  isLoading,
  onRefresh,
}: AccountSummaryWidgetProps) {
  const overallHealth = useMemo(() => 
    calculateOverallHealth(campaigns || []), 
    [campaigns]
  );
  
  const { label: healthLabel, color: healthColor } = getHealthLabel(overallHealth);
  
  const alerts = useMemo(() => 
    generateAlerts(campaigns, proposals, stats),
    [campaigns, proposals, stats]
  );
  
  const summary = useMemo(() => 
    generateSummary(campaigns, stats, overallHealth),
    [campaigns, stats, overallHealth]
  );

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 via-background to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-primary" />
              AI Account Summary
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/5 via-background to-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Account Summary
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Health Score */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Overall Health:</span>
            <span className={`text-2xl font-bold ${healthColor}`}>
              {overallHealth}
            </span>
            <span className={`text-sm font-medium ${healthColor}`}>
              ({healthLabel})
            </span>
          </div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                overallHealth >= 70 ? 'bg-green-500' :
                overallHealth >= 50 ? 'bg-yellow-500' :
                overallHealth >= 30 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${overallHealth}%` }}
            />
          </div>
        </div>

        {/* AI Summary Text */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          "{summary}"
        </p>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Top Actions:
            </div>
            <div className="space-y-1.5">
              {alerts.slice(0, 4).map((alert, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                    alert.type === 'critical' ? 'bg-red-500/10 text-red-600' :
                    alert.type === 'warning' ? 'bg-yellow-500/10 text-yellow-700' :
                    'bg-blue-500/10 text-blue-600'
                  }`}
                >
                  {alert.type === 'critical' ? (
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1">{alert.message}</span>
                  {alert.action && (
                    <Badge variant="outline" className="text-xs">
                      {alert.action}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-3 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {campaigns?.filter(c => c.status === 'green' && !c.safe_mode).length || 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Healthy</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {campaigns?.filter(c => c.status === 'yellow' && !c.safe_mode).length || 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Drifting</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {campaigns?.filter(c => c.status === 'red' && !c.safe_mode).length || 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">At Risk</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-600">
              <Shield className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {campaigns?.filter(c => c.safe_mode).length || 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Safe Mode</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
