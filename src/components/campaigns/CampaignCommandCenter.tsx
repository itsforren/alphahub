import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  useCampaigns, 
  usePendingProposals, 
  useCommandCenterStats,
  useApproveProposal,
  useRunMorningReview,
  useManualBudgetOverride,
  useIgnoreCampaign,
  useUnignoreCampaign,
  CampaignWithClient,
  Proposal,
} from '@/hooks/useCampaignCommandCenter';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { ProposalApprovalModal } from './ProposalApprovalModal';
import { CampaignDetailModal } from './CampaignDetailModal';
import { ManualBudgetDialog } from './ManualBudgetDialog';
import { IgnoreCampaignDialog } from './IgnoreCampaignDialog';
import { FindUntrackedCampaignsDialog } from './FindUntrackedCampaignsDialog';
import { AccountSummaryWidget } from './AccountSummaryWidget';
import { OverallHealthScore } from './OverallHealthScore';
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  Wallet,
  Ban,
  Play,
  ArrowUp,
  ArrowDown,
  Minus,
  History,
  Edit,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const formatCurrency = (value: number, decimals = 0) => 
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

const formatPercent = (value: number, decimals = 1) => `${value.toFixed(decimals)}%`;

// ======= STAT CARD =======
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  isLoading?: boolean;
  onClick?: () => void;
}

function StatCard({ title, value, icon: Icon, variant = 'default', isLoading, onClick }: StatCardProps) {
  const variants = {
    default: 'bg-card border-border',
    success: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
  };

  return (
    <Card 
      className={`${variants[variant]} ${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <p className="text-lg font-semibold">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ======= FILTER TYPES =======
type FilterType = 'all' | 'approvals_needed' | 'red' | 'yellow' | 'green' | 'safe_mode' | 'no_data' | 'ignored';

// ======= FILTER BUTTONS =======
function FilterButtons({ 
  activeFilter, 
  onFilterChange,
  counts,
}: { 
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}) {
  const filters: { key: FilterType; label: string; emoji?: string }[] = [
    { key: 'approvals_needed', label: 'Approvals Needed', emoji: '⏳' },
    { key: 'all', label: 'All' },
    { key: 'red', label: 'Red', emoji: '🔴' },
    { key: 'yellow', label: 'Yellow', emoji: '🟡' },
    { key: 'green', label: 'Green', emoji: '🟢' },
    { key: 'safe_mode', label: 'Safe Mode', emoji: '🛡️' },
    { key: 'no_data', label: 'No Data' },
    { key: 'ignored', label: 'Ignored', emoji: '🚫' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(({ key, label, emoji }) => (
        <Button
          key={key}
          size="sm"
          variant={activeFilter === key ? 'default' : 'outline'}
          onClick={() => onFilterChange(key)}
          className={activeFilter === key && key === 'red' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          {emoji && `${emoji} `}{label} ({counts[key]})
        </Button>
      ))}
    </div>
  );
}

// ======= ACTION LABEL =======
function getActionLabel(
  proposal: Proposal | undefined,
  campaign: CampaignWithClient
): { type: 'increase' | 'decrease' | 'hold' | 'safe'; label: string; budget?: number; delta?: number } {
  // Safe mode takes priority
  if (campaign.safe_mode) {
    return { type: 'safe', label: `AUTO SAFE: ${campaign.safe_mode_reason || 'Low wallet'}` };
  }
  
  if (!proposal) {
    return { type: 'hold', label: 'HOLD' };
  }

  if (proposal.proposed_action_type === 'SAFE_MODE') {
    return { type: 'safe', label: 'SAFE MODE ($0.01/day)' };
  }

  if (proposal.proposed_action_type === 'INVESTIGATE') {
    return { type: 'hold', label: 'INVESTIGATE' };
  }

  const current = campaign.current_daily_budget || 0;
  const proposed = proposal.proposed_daily_budget;
  
  // If no proposed budget, show hold
  if (proposed == null) {
    return { type: 'hold', label: 'HOLD' };
  }

  const delta = proposal.delta_pct || 0;

  if (proposed > current) {
    return { 
      type: 'increase', 
      label: `INCREASE to ${formatCurrency(proposed)}`, 
      budget: proposed,
      delta 
    };
  } else if (proposed < current) {
    return { 
      type: 'decrease', 
      label: `DECREASE to ${formatCurrency(proposed)}`, 
      budget: proposed,
      delta 
    };
  }
  return { type: 'hold', label: 'HOLD' };
}

function ActionBadge({ action }: { action: ReturnType<typeof getActionLabel> }) {
  const icons = {
    increase: ArrowUp,
    decrease: ArrowDown,
    hold: Minus,
    safe: Shield,
  };
  const colors = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    hold: 'text-muted-foreground',
    safe: 'text-orange-600',
  };
  const Icon = icons[action.type];

  return (
    <div className="flex items-center gap-1">
      <Icon className={`h-4 w-4 ${colors[action.type]}`} />
      <span className={`text-sm font-medium ${colors[action.type]}`}>
        {action.label}
        {action.delta !== undefined && action.delta !== 0 && (
          <span className="text-xs ml-1">({action.delta >= 0 ? '+' : ''}{action.delta.toFixed(1)}%)</span>
        )}
      </span>
    </div>
  );
}

// ======= MAIN COMPONENT =======
export function CampaignCommandCenter() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading: campaignsLoading, refetch: refetchCampaigns } = useCampaigns();
  const { data: proposals, isLoading: proposalsLoading, refetch: refetchProposals } = usePendingProposals();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useCommandCenterStats();
  const approveProposal = useApproveProposal();
  const runMorningReview = useRunMorningReview();
  const manualBudgetOverride = useManualBudgetOverride();
  const ignoreCampaign = useIgnoreCampaign();
  const unignoreCampaign = useUnignoreCampaign();
  
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithClient | null>(null);
  const [manualBudgetCampaign, setManualBudgetCampaign] = useState<CampaignWithClient | null>(null);
  const [ignoreCampaignTarget, setIgnoreCampaignTarget] = useState<CampaignWithClient | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('approvals_needed');
  const [showInactive, setShowInactive] = useState(false);
  const [lastReviewTime, setLastReviewTime] = useState<string | null>(null);

  // Get proposal for campaign
  const getProposalForCampaign = (campaignId: string) => 
    proposals?.find(p => p.campaign_id === campaignId);

  // Filter counts - exclude ignored campaigns from regular counts, show separate ignored count
  const filterCounts = useMemo(() => {
    const allCampaigns = showInactive 
      ? campaigns 
      : campaigns?.filter(c => c.clients?.billing_status !== 'churned');
    
    // For regular filters, exclude ignored campaigns
    const activeCampaigns = allCampaigns?.filter(c => !c.ignored);
    
    return {
      all: activeCampaigns?.length || 0,
      approvals_needed: proposals?.filter(p => {
        const campaign = campaigns?.find(c => c.id === p.campaign_id);
        return p.status === 'pending' && !campaign?.ignored;
      }).length || 0,
      red: activeCampaigns?.filter(c => c.status === 'red' && !c.safe_mode).length || 0,
      yellow: activeCampaigns?.filter(c => c.status === 'yellow' && !c.safe_mode).length || 0,
      green: activeCampaigns?.filter(c => c.status === 'green' && !c.safe_mode).length || 0,
      safe_mode: activeCampaigns?.filter(c => c.safe_mode).length || 0,
      no_data: activeCampaigns?.filter(c => c.noData).length || 0,
      ignored: allCampaigns?.filter(c => c.ignored).length || 0,
    };
  }, [campaigns, proposals, showInactive]);

  // Apply filters
  const filteredCampaigns = useMemo(() => {
    let result = showInactive 
      ? campaigns 
      : campaigns?.filter(c => c.clients?.billing_status !== 'churned');

    if (!result) return [];

    switch (activeFilter) {
      case 'approvals_needed':
        const pendingIds = new Set(proposals?.filter(p => p.status === 'pending').map(p => p.campaign_id) || []);
        return result.filter(c => pendingIds.has(c.id) && !c.ignored);
      case 'red':
        return result.filter(c => c.status === 'red' && !c.safe_mode && !c.ignored);
      case 'yellow':
        return result.filter(c => c.status === 'yellow' && !c.safe_mode && !c.ignored);
      case 'green':
        return result.filter(c => c.status === 'green' && !c.safe_mode && !c.ignored);
      case 'safe_mode':
        return result.filter(c => c.safe_mode && !c.ignored);
      case 'no_data':
        return result.filter(c => c.noData && !c.ignored);
      case 'ignored':
        return result.filter(c => c.ignored);
      default:
        // 'all' filter - exclude ignored unless specifically viewing ignored
        return result.filter(c => !c.ignored);
    }
  }, [campaigns, proposals, activeFilter, showInactive]);

  const handleRefresh = () => {
    refetchCampaigns();
    refetchProposals();
    refetchStats();
    toast.success('Refreshed');
  };

  const handleRunReview = async () => {
    toast.loading('Running AI review...');
    try {
      await runMorningReview.mutateAsync();
      toast.dismiss();
      toast.success('AI review completed');
      setLastReviewTime(format(new Date(), 'h:mm a'));
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to run review');
    }
  };

  const handleApprove = async (proposalId: string) => {
    try {
      await approveProposal.mutateAsync({ proposalId });
      toast.success('Approved and executed');
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleRowClick = (campaign: CampaignWithClient) => {
    setSelectedCampaign(campaign);
  };

  const handleManualBudgetSubmit = async (data: {
    newBudget: number;
    reasonCategory: string;
    reasonDetail: string;
  }) => {
    if (!manualBudgetCampaign) return;
    
    try {
      const result = await manualBudgetOverride.mutateAsync({
        campaignId: manualBudgetCampaign.id,
        clientId: manualBudgetCampaign.client_id,
        newBudget: data.newBudget,
        reasonCategory: data.reasonCategory,
        reasonDetail: data.reasonDetail,
        previousBudget: manualBudgetCampaign.current_daily_budget || 0,
      });
      
      // Show appropriate feedback based on Google Ads update result
      if (result.googleAdsUpdated) {
        toast.success(`Budget updated to $${data.newBudget.toFixed(2)}/day in Google Ads ✓`, {
          description: 'Campaign status reset to yellow for next AI review.',
        });
      } else {
        toast.warning(`Database updated to $${data.newBudget.toFixed(2)}/day`, {
          description: result.googleAdsError 
            ? `Google Ads update failed: ${result.googleAdsError}` 
            : 'Google Ads budget may not have been updated. Please verify manually.',
        });
      }
      
      setManualBudgetCampaign(null);
      handleRefresh();
    } catch (error) {
      toast.error('Failed to update budget', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Handle ignore campaign
  const handleIgnoreCampaign = async (data: {
    reason: string;
    notes: string;
    ignoreUntil?: string;
  }) => {
    if (!ignoreCampaignTarget) return;
    
    try {
      await ignoreCampaign.mutateAsync({
        campaignId: ignoreCampaignTarget.id,
        clientId: ignoreCampaignTarget.client_id,
        reason: data.reason,
        notes: data.notes,
        ignoreUntil: data.ignoreUntil,
      });
      toast.success(`${ignoreCampaignTarget.clients?.name || 'Campaign'} ignored`);
      setIgnoreCampaignTarget(null);
    } catch (error) {
      toast.error('Failed to ignore campaign');
    }
  };

  // Handle unignore campaign
  const handleUnignoreCampaign = async (campaign: CampaignWithClient) => {
    try {
      await unignoreCampaign.mutateAsync({
        campaignId: campaign.id,
        clientId: campaign.client_id,
      });
      toast.success(`${campaign.clients?.name || 'Campaign'} unignored`);
    } catch (error) {
      toast.error('Failed to unignore campaign');
    }
  };

  // Batch approve all green pending proposals
  const handleBatchApproveGreen = async () => {
    const greenPendingProposals = proposals?.filter(p => {
      const campaign = campaigns?.find(c => c.id === p.campaign_id);
      return p.status === 'pending' && campaign?.status === 'green' && !campaign?.safe_mode;
    }) || [];

    if (greenPendingProposals.length === 0) {
      toast.info('No green proposals to approve');
      return;
    }

    const confirmed = window.confirm(
      `Approve ${greenPendingProposals.length} green campaign proposal${greenPendingProposals.length > 1 ? 's' : ''}?`
    );
    
    if (!confirmed) return;

    toast.loading(`Approving ${greenPendingProposals.length} proposals...`);
    
    let successCount = 0;
    for (const proposal of greenPendingProposals) {
      try {
        await approveProposal.mutateAsync({ proposalId: proposal.id });
        successCount++;
      } catch (error) {
        console.error('Failed to approve proposal:', proposal.id, error);
      }
    }
    
    toast.dismiss();
    toast.success(`Approved ${successCount} of ${greenPendingProposals.length} proposals`);
    handleRefresh();
  };

  const greenPendingCount = useMemo(() => {
    return proposals?.filter(p => {
      const campaign = campaigns?.find(c => c.id === p.campaign_id);
      return p.status === 'pending' && campaign?.status === 'green' && !campaign?.safe_mode;
    }).length || 0;
  }, [proposals, campaigns]);

  return (
    <div className="space-y-6">
      {/* AI Account Summary Widget */}
      <AccountSummaryWidget
        campaigns={campaigns}
        proposals={proposals}
        stats={stats}
        isLoading={campaignsLoading || statsLoading}
        onRefresh={handleRefresh}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">Campaign Command Center</h2>
          <p className="text-sm text-muted-foreground">
            Yesterday's performance (Eastern) 
            {lastReviewTime && <span className="ml-2">• Last AI Review: {lastReviewTime}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {greenPendingCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              className="border-green-500/50 text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={handleBatchApproveGreen}
              disabled={approveProposal.isPending}
            >
              <Zap className="h-4 w-4 mr-2" />
              Approve All Green ({greenPendingCount})
            </Button>
          )}
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleRunReview}
            disabled={runMorningReview.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            Run AI Review
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/hub/admin/campaign-changes')}
          >
            <History className="h-4 w-4 mr-2" />
            Change Log
          </Button>
          <FindUntrackedCampaignsDialog />
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Row: Health Score + KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Overall Health Score - takes more space */}
        <div className="md:col-span-1">
          <OverallHealthScore campaigns={campaigns} isLoading={campaignsLoading} />
        </div>
        
        {/* KPI Cards */}
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Pending Approvals"
            value={stats?.pendingApprovalsCount || 0}
            icon={Clock}
            variant={stats?.pendingApprovalsCount ? 'danger' : 'default'}
            isLoading={statsLoading}
            onClick={() => setActiveFilter('approvals_needed')}
          />
          <StatCard
            title="Safe Mode"
            value={stats?.safeModeCount || 0}
            icon={Shield}
            variant={stats?.safeModeCount ? 'danger' : 'default'}
            isLoading={statsLoading}
            onClick={() => setActiveFilter('safe_mode')}
          />
          <StatCard
            title="Behind Pace"
            value={stats?.behindPaceCount || 0}
            icon={AlertTriangle}
            variant={stats?.behindPaceCount ? 'warning' : 'default'}
            isLoading={statsLoading}
          />
          <StatCard
            title="No Data"
            value={stats?.noSpendCount || 0}
            icon={Ban}
            variant={stats?.noSpendCount ? 'warning' : 'default'}
            isLoading={statsLoading}
            onClick={() => setActiveFilter('no_data')}
          />
        </div>
      </div>

      {/* Top KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Wallet Remaining"
          value={formatCurrency(stats?.totalWalletRemaining || 0)}
          icon={Wallet}
          isLoading={statsLoading}
        />
        <StatCard
          title="Spend Yesterday"
          value={formatCurrency(stats?.totalSpendYesterday || 0)}
          icon={DollarSign}
          isLoading={statsLoading}
        />
        <StatCard
          title="Avg CPL"
          value={formatCurrency(stats?.avgCPL || 0)}
          icon={Target}
          isLoading={statsLoading}
        />
        <StatCard
          title="Avg CTR"
          value={formatPercent(stats?.avgCTR || 0)}
          icon={ArrowUpRight}
          isLoading={statsLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <FilterButtons 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={filterCounts}
        />
        <div className="flex items-center gap-2">
          <Switch 
            id="show-inactive" 
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
            Show inactive
          </Label>
        </div>
      </div>

      {/* Campaign Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Campaigns {filteredCampaigns && `(${filteredCampaigns.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Health</TableHead>
                  <TableHead className="text-right">Wallet Left</TableHead>
                  <TableHead className="text-right">Days Left</TableHead>
                  <TableHead className="text-right">7d Avg CPL</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Suggested</TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">Change</TooltipTrigger>
                        <TooltipContent>% difference between current and suggested budget</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 12 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredCampaigns?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      {activeFilter === 'approvals_needed' 
                        ? 'No pending approvals. All caught up! 🎉' 
                        : 'No campaigns found. Click "Run AI Review" to analyze.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns?.map((campaign) => {
                    const proposal = getProposalForCampaign(campaign.id);
                    const action = getActionLabel(proposal, campaign);
                    const walletInfo = campaign.walletInfo;
                    const showApproveButtons = proposal?.status === 'pending' && !campaign.safe_mode;

                    // Row background color based on status - use proper semantic colors for dark mode
                    const rowBgClass = campaign.ignored
                      ? 'bg-muted/50 border-l-4 border-l-muted-foreground opacity-70'
                      : campaign.safe_mode 
                        ? 'bg-orange-500/15 border-l-4 border-l-orange-500' 
                        : campaign.status === 'red' 
                          ? 'bg-destructive/10 border-l-4 border-l-destructive' 
                          : campaign.status === 'yellow' 
                            ? 'bg-yellow-500/10 border-l-4 border-l-yellow-500' 
                            : '';

                    return (
                      <TableRow 
                        key={campaign.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${rowBgClass}`}
                        onClick={() => handleRowClick(campaign)}
                      >
                        {/* Client */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-medium text-foreground hover:text-primary"
                            onClick={() => navigate(`/hub/admin/clients/${campaign.client_id}`)}
                          >
                            {campaign.clients?.name || 'Unknown'}
                          </Button>
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CampaignStatusBadge 
                              status={campaign.status} 
                              safeMode={campaign.safe_mode} 
                              size="sm"
                            />
                            {campaign.ignored && (
                              <Badge variant="outline" className="text-xs bg-muted">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Ignored
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Health Score */}
                        <TableCell className="text-right">
                          {campaign.health_score != null ? (
                            <span className={
                              campaign.health_score >= 85 ? 'text-green-600 font-medium' :
                              campaign.health_score >= 60 ? 'text-yellow-600 font-medium' :
                              campaign.health_score >= 30 ? 'text-orange-600 font-medium' :
                              'text-red-600 font-medium'
                            }>
                              {campaign.health_score}%
                            </span>
                          ) : '—'}
                        </TableCell>
                        
                        {/* Wallet Remaining */}
                        <TableCell className="text-right">
                          {walletInfo ? formatCurrency(walletInfo.walletRemaining) : '—'}
                        </TableCell>
                        
                        {/* Days Left */}
                        <TableCell className="text-right">
                          {walletInfo?.daysRemaining ?? '—'}
                        </TableCell>
                        
                        {/* 7-day Avg CPL */}
                        <TableCell className="text-right">
                          {campaign.last7dAvgCPL != null 
                            ? formatCurrency(campaign.last7dAvgCPL) 
                            : '—'}
                        </TableCell>
                        
                        {/* Current Budget */}
                        <TableCell className="text-right">
                          {formatCurrency(campaign.current_daily_budget || 0)}
                        </TableCell>
                        
                        {/* Suggested Budget - show proposal budget or required daily spend */}
                        <TableCell className="text-right font-medium">
                          {(() => {
                            // Use proposal budget if available, otherwise use required daily spend
                            const suggested = proposal?.proposed_daily_budget ?? walletInfo?.requiredDailySpend;
                            return suggested != null ? formatCurrency(suggested) : '—';
                          })()}
                        </TableCell>
                        
                        {/* Change % - calculate from suggested vs current */}
                        <TableCell className="text-right">
                          {(() => {
                            const currentBudget = campaign.current_daily_budget || 0;
                            const suggested = proposal?.proposed_daily_budget ?? walletInfo?.requiredDailySpend;
                            
                            if (suggested == null || currentBudget === 0) return '—';
                            
                            const deltaPct = ((suggested - currentBudget) / currentBudget) * 100;
                            // Only show if meaningful change (> 1%)
                            if (Math.abs(deltaPct) < 1) return '—';
                            
                            return (
                              <span className={deltaPct >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </TableCell>
                        
                        {/* Confidence */}
                        <TableCell>
                          {proposal ? (
                            <ConfidenceIndicator
                              confidence={proposal.recommendation_confidence}
                              similarCasesCount={proposal.similar_cases_count}
                              similarCasesSummary={proposal.similar_cases_summary}
                            />
                          ) : '—'}
                        </TableCell>
                        
                        {/* Action Label with AI explanation tooltip */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <ActionBadge action={action} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                {proposal?.ai_diagnosis || proposal?.ai_summary || (
                                  campaign.safe_mode 
                                    ? `Safe mode active: ${campaign.safe_mode_reason || 'Low wallet balance'}`
                                    : walletInfo 
                                      ? `Based on ${walletInfo.daysRemaining} days left and $${walletInfo.walletRemaining.toFixed(0)} remaining, the suggested daily spend is $${walletInfo.requiredDailySpend?.toFixed(0) || '—'}/day to hit 95% utilization.`
                                      : 'No pacing data available. Run AI Review to analyze.'
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        
                        {/* Approve/Deny/Edit Buttons */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {/* Manual Budget Edit Button - always visible */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    onClick={() => setManualBudgetCampaign(campaign)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Manual Budget Override</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {showApproveButtons && !campaign.ignored && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleApprove(proposal!.id)}
                                        disabled={approveProposal.isPending}
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Approve</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => setSelectedProposal(proposal!)}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Deny</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                            
                            {/* Ignore / Unignore Button */}
                            {campaign.ignored ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() => handleUnignoreCampaign(campaign)}
                                      disabled={unignoreCampaign.isPending}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Unignore Campaign
                                    {campaign.ignored_reason && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Reason: {campaign.ignored_reason}
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="h-7 px-2 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                                      onClick={() => setIgnoreCampaignTarget(campaign)}
                                    >
                                      <EyeOff className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ignore Campaign</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          proposal={getProposalForCampaign(selectedCampaign.id) || null}
          onClose={() => setSelectedCampaign(null)}
        />
      )}

      {/* Deny Modal */}
      {selectedProposal && (
        <ProposalApprovalModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
        />
      )}

      {/* Manual Budget Override Dialog */}
      {manualBudgetCampaign && (
        <ManualBudgetDialog
          isOpen={!!manualBudgetCampaign}
          onClose={() => setManualBudgetCampaign(null)}
          onSubmit={handleManualBudgetSubmit}
          campaignName={manualBudgetCampaign.clients?.name || 'Unknown'}
          currentBudget={manualBudgetCampaign.current_daily_budget || 0}
          suggestedBudget={
            getProposalForCampaign(manualBudgetCampaign.id)?.proposed_daily_budget ??
            manualBudgetCampaign.walletInfo?.requiredDailySpend
          }
          isSubmitting={manualBudgetOverride.isPending}
        />
      )}

      {/* Ignore Campaign Dialog */}
      {ignoreCampaignTarget && (
        <IgnoreCampaignDialog
          isOpen={!!ignoreCampaignTarget}
          onClose={() => setIgnoreCampaignTarget(null)}
          onSubmit={handleIgnoreCampaign}
          campaignName={ignoreCampaignTarget.clients?.name || 'Unknown'}
          isSubmitting={ignoreCampaign.isPending}
        />
      )}
    </div>
  );
}
