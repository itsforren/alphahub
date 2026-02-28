import { useState } from 'react';
import { CampaignCommandCenter } from '@/components/campaigns/CampaignCommandCenter';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import { Calendar, TrendingUp, DollarSign, Users, Target, MousePointerClick, Eye, RefreshCw } from 'lucide-react';
import { 
  useAccountWideMetrics, 
  useDailySpendData, 
  useClientSpendData,
  DateRange 
} from '@/hooks/useAccountWideMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { MetricCard, MetricCardGroup } from '@/components/analytics/MetricCard';
import { AccountSpendChart } from '@/components/analytics/AccountSpendChart';
import { SpendByClientChart } from '@/components/analytics/SpendByClientChart';
import { FunnelVisualization } from '@/components/analytics/FunnelVisualization';
import { ClientPerformanceTable } from '@/components/analytics/ClientPerformanceTable';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, decimals = 0) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

type PresetRange = 'today' | 'last7' | 'last30' | 'mtd' | 'lastMonth' | 'ytd' | 'custom';

const presets: { label: string; value: PresetRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Last 30 Days', value: 'last30' },
  { label: 'Month to Date', value: 'mtd' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Year to Date', value: 'ytd' },
];

function getDateRangeFromPreset(preset: PresetRange): DateRange {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: now, to: now };
    case 'last7':
      return { from: subDays(now, 7), to: now };
    case 'last30':
      return { from: subDays(now, 30), to: now };
    case 'mtd':
      return { from: startOfMonth(now), to: now };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'ytd':
      return { from: startOfYear(now), to: now };
    default:
      return { from: subDays(now, 30), to: now };
  }
}

export default function Analytics() {
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('last30');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('last30'));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useAccountWideMetrics(dateRange);
  const { data: dailySpend, isLoading: dailyLoading, refetch: refetchDaily } = useDailySpendData(dateRange);
  const { data: clientSpend, isLoading: clientsLoading, refetch: refetchClients } = useClientSpendData(dateRange);

  const handlePresetChange = (preset: PresetRange) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setDateRange(getDateRangeFromPreset(preset));
    }
  };

  const handleRefresh = () => {
    refetchMetrics();
    refetchDaily();
    refetchClients();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Account-wide performance metrics and insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Presets */}
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={selectedPreset === preset.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handlePresetChange(preset.value)}
                className={cn(
                  "text-xs",
                  selectedPreset === preset.value && 'bg-primary/10 text-primary'
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          {/* Custom Date Range */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setSelectedPreset('custom');
                  } else if (range?.from) {
                    setDateRange({ from: range.from, to: range.from });
                    setSelectedPreset('custom');
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="command-center" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="command-center">Campaign Command Center</TabsTrigger>
          <TabsTrigger value="client-performance">Client Performance</TabsTrigger>
          <TabsTrigger value="sales-marketing" disabled>Sales & Marketing (Coming Soon)</TabsTrigger>
        </TabsList>

        <TabsContent value="command-center" className="space-y-6">
          <CampaignCommandCenter />
        </TabsContent>

        <TabsContent value="client-performance" className="space-y-6">
          {/* Section 1: Account-Wide KPI Cards */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Ad Spend Overview</h2>
            <MetricCardGroup columns={5}>
              <MetricCard
                title="Total Ad Spend"
                value={formatCurrency(metrics?.totalSpend || 0)}
                icon={DollarSign}
                isLoading={metricsLoading}
                variant="primary"
              />
              <MetricCard
                title="Total Conversions"
                value={metrics?.totalConversions || 0}
                icon={Target}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Avg CTR"
                value={formatPercent(metrics?.avgCTR || 0)}
                icon={MousePointerClick}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Avg CVR"
                value={formatPercent(metrics?.avgCVR || 0)}
                icon={TrendingUp}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Cost / Conversion"
                value={formatCurrency(metrics?.avgCostPerConversion || 0)}
                icon={DollarSign}
                isLoading={metricsLoading}
              />
            </MetricCardGroup>
          </div>

          {/* Section 2: Funnel Cost Metrics */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Cost per Funnel Stage</h2>
            <MetricCardGroup columns={5}>
              <MetricCard
                title="Cost per Lead"
                value={formatCurrency(metrics?.cpl || 0)}
                subtitle={`${metrics?.totalLeads || 0} leads`}
                isLoading={metricsLoading}
                variant={metrics?.cpl && metrics.cpl < 50 ? 'success' : 'default'}
              />
              <MetricCard
                title="Cost per Booked Call"
                value={formatCurrency(metrics?.cpba || 0)}
                subtitle={`${metrics?.bookedCalls || 0} booked`}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Cost per Submitted"
                value={formatCurrency(metrics?.cpSubmitted || 0)}
                subtitle={`${metrics?.submittedApps || 0} submitted`}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Cost per Approved"
                value={formatCurrency(metrics?.cpApproved || 0)}
                subtitle={`${metrics?.approvedApps || 0} approved`}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Cost per Issued Paid"
                value={formatCurrency(metrics?.cpIssuedPaid || 0)}
                subtitle={`${metrics?.issuedPaid || 0} issued`}
                isLoading={metricsLoading}
                variant="success"
              />
            </MetricCardGroup>
          </div>

          {/* Section 3: Premium Tracking */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Premium Tracking</h2>
            <MetricCardGroup columns={4}>
              <MetricCard
                title="Total Target Premium"
                value={formatCurrency(metrics?.totalTargetPremium || 0)}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Total Submitted Premium"
                value={formatCurrency(metrics?.totalSubmittedPremium || 0)}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Total Approved Premium"
                value={formatCurrency(metrics?.totalApprovedPremium || 0)}
                isLoading={metricsLoading}
              />
              <MetricCard
                title="Total Issued Premium"
                value={formatCurrency(metrics?.totalIssuedPremium || 0)}
                isLoading={metricsLoading}
                variant="success"
              />
            </MetricCardGroup>
          </div>

          {/* Section 4: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AccountSpendChart data={dailySpend} isLoading={dailyLoading} />
            <SpendByClientChart data={clientSpend} isLoading={clientsLoading} />
          </div>

          {/* Funnel Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FunnelVisualization metrics={metrics} isLoading={metricsLoading} />
            
            {/* Quick Stats Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Performance Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  title="Total Impressions"
                  value={(metrics?.totalImpressions || 0).toLocaleString()}
                  icon={Eye}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  title="Total Clicks"
                  value={(metrics?.totalClicks || 0).toLocaleString()}
                  icon={MousePointerClick}
                  isLoading={metricsLoading}
                />
                <MetricCard
                  title="Active Clients"
                  value={clientSpend?.length || 0}
                  icon={Users}
                  isLoading={clientsLoading}
                />
                <MetricCard
                  title="Avg Spend / Client"
                  value={formatCurrency(
                    clientSpend && clientSpend.length > 0 
                      ? (metrics?.totalSpend || 0) / clientSpend.length 
                      : 0
                  )}
                  icon={DollarSign}
                  isLoading={metricsLoading || clientsLoading}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Client Performance Table */}
          <ClientPerformanceTable data={clientSpend} isLoading={clientsLoading} />
        </TabsContent>

        <TabsContent value="sales-marketing">
          <div className="py-12 text-center text-muted-foreground">
            Sales & Marketing analytics coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
