import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CampaignWithClient, 
  Proposal, 
  useRollingSnapshots 
} from '@/hooks/useCampaignCommandCenter';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { HealthScoreIndicator } from './HealthScoreIndicator';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { 
  ExternalLink, 
  User, 
  Copy, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Target,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CampaignDetailModalProps {
  campaign: CampaignWithClient;
  proposal: Proposal | null;
  onClose: () => void;
}

const formatCurrency = (value: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

const formatPercent = (value: number, decimals = 1) => `${value.toFixed(decimals)}%`;

function MetricBox({ 
  label, 
  value, 
  subValue, 
  trend 
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-lg font-semibold">{value}</p>
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
        {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
      </div>
      {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
    </div>
  );
}

export function CampaignDetailModal({ campaign, proposal, onClose }: CampaignDetailModalProps) {
  const navigate = useNavigate();
  const { data: snapshots } = useRollingSnapshots(campaign.id);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const openGoogleAds = () => {
    const cleanCustomerId = campaign.google_customer_id.replace(/-/g, '');
    const url = `https://ads.google.com/aw/campaigns?campaignId=${campaign.google_campaign_id}&ocid=${cleanCustomerId}`;
    window.open(url, '_blank');
  };

  const walletInfo = campaign.walletInfo;
  const utilizationDisplay = campaign.yesterdayUtilization > 1.5 ? '150%+' : formatPercent(campaign.yesterdayUtilization * 100);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{campaign.clients?.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <CampaignStatusBadge status={campaign.status} safeMode={campaign.safe_mode} size="sm" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => copyToClipboard(campaign.google_campaign_id)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {campaign.google_campaign_id}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate(`/hub/admin/clients/${campaign.client_id}`)}
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={openGoogleAds}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Google Ads
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="metrics" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="pacing">Pacing</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 mt-4">
            {/* Yesterday + Day Before */}
            <div>
              <h4 className="text-sm font-medium mb-2">Yesterday's Performance</h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <MetricBox 
                  label="Spend" 
                  value={campaign.yesterdaySpend > 0 ? formatCurrency(campaign.yesterdaySpend) : '—'} 
                />
                <MetricBox 
                  label="Conversions" 
                  value={campaign.yesterdayConversions > 0 ? campaign.yesterdayConversions : '—'} 
                />
                <MetricBox 
                  label="CPL" 
                  value={campaign.yesterdayCPL > 0 ? formatCurrency(campaign.yesterdayCPL) : '—'} 
                />
                <MetricBox 
                  label="CTR" 
                  value={campaign.yesterdayCTR > 0 ? formatPercent(campaign.yesterdayCTR) : '—'} 
                />
                <MetricBox 
                  label="Utilization" 
                  value={campaign.yesterdayUtilization > 0 ? utilizationDisplay : '—'} 
                />
                <MetricBox 
                  label="Budget" 
                  value={formatCurrency(campaign.current_daily_budget || 0)} 
                />
              </div>
            </div>

            {/* 7-Day Trends */}
            <div>
              <h4 className="text-sm font-medium mb-2">7-Day Trends</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <MetricBox 
                  label="Total Spend (7d)" 
                  value={campaign.last7dSpend > 0 ? formatCurrency(campaign.last7dSpend) : '—'} 
                />
                <MetricBox 
                  label="Conversions (7d)" 
                  value={campaign.last7dConversions > 0 ? campaign.last7dConversions : '—'} 
                />
                <MetricBox 
                  label="Avg CPL (7d)" 
                  value={campaign.last7dCPL ? formatCurrency(campaign.last7dCPL) : '—'} 
                />
                <MetricBox 
                  label="Avg CTR (7d)" 
                  value={campaign.last7dCTR > 0 ? formatPercent(campaign.last7dCTR) : '—'} 
                />
                <MetricBox 
                  label="Avg CVR (7d)" 
                  value={campaign.last7dCVR > 0 ? formatPercent(campaign.last7dCVR) : '—'} 
                />
              </div>
            </div>

            {/* Utilization & Overdelivery Warning */}
            {campaign.yesterdayOverdelivery && (
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardContent className="p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">
                    Overdelivery detected: Google spent {utilizationDisplay} of the daily budget yesterday.
                  </span>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Pacing Tab */}
          <TabsContent value="pacing" className="space-y-4 mt-4">
            {walletInfo ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Wallet className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{formatCurrency(walletInfo.walletRemaining)}</p>
                      <p className="text-xs text-muted-foreground">Wallet Remaining</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{walletInfo.daysRemaining}</p>
                      <p className="text-xs text-muted-foreground">Days Left</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Target className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{formatCurrency(walletInfo.requiredDailySpend)}</p>
                      <p className="text-xs text-muted-foreground">Required Daily</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-2xl font-bold">{formatPercent(walletInfo.walletUtilizationPct)}</p>
                      <p className="text-xs text-muted-foreground">Spent To Date</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spent To Date</span>
                      <span className="font-medium">{formatCurrency(walletInfo.spentToDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Target (95%)</span>
                      <span className="font-medium">{formatCurrency(walletInfo.targetSpend)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cycle End</span>
                      <span className="font-medium">
                        {walletInfo.cycleEnd ? format(new Date(walletInfo.cycleEnd), 'MMM d, yyyy') : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pace Status</span>
                      <Badge 
                        variant="outline" 
                        className={
                          walletInfo.paceStatus === 'ahead' ? 'bg-green-100 text-green-700 border-green-300' :
                          walletInfo.paceStatus === 'behind' ? 'bg-red-100 text-red-700 border-red-300' :
                          'bg-blue-100 text-blue-700 border-blue-300'
                        }
                      >
                        {walletInfo.paceStatus === 'ahead' ? 'Ahead' : 
                         walletInfo.paceStatus === 'behind' ? 'Behind' : 'On Pace'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No pacing data available
              </div>
            )}
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Health Score</span>
                  <HealthScoreIndicator score={campaign.health_score} size="md" showLabel />
                </div>

                {campaign.ai_summary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">AI Summary</p>
                    <p className="text-sm">{campaign.ai_summary}</p>
                  </div>
                )}

                {campaign.reason_codes?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Reason Codes</p>
                    <div className="flex flex-wrap gap-1">
                      {campaign.reason_codes.map((code) => (
                        <Badge key={code} variant="outline" className="text-xs">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {proposal && (
                  <>
                    {proposal.ai_diagnosis && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">AI Diagnosis</p>
                        <p className="text-sm">{proposal.ai_diagnosis}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <ConfidenceIndicator
                        confidence={proposal.recommendation_confidence}
                        similarCasesCount={proposal.similar_cases_count}
                        similarCasesSummary={proposal.similar_cases_summary}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Recent budget changes and proposals will appear here.
            </div>
            {snapshots && snapshots.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Rolling Snapshots</h4>
                <div className="space-y-1">
                  {snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                      <span>{format(new Date(snapshot.snapshot_date), 'MMM d')}</span>
                      <span>Spend: {formatCurrency(snapshot.last_7d_spend)}</span>
                      <span>Conv: {snapshot.last_7d_conversions}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
