import { useState, useMemo } from 'react';
import { usePostHogQuery } from '@/hooks/usePostHogQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Activity,
  Users,
  Target,
  Clock,
  MousePointerClick,
  Gauge,
  Monitor,
  Smartphone,
  RefreshCw,
  Search,
  Play,
  Sparkles,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimeRange = 'today' | '7d' | '30d';
type PageVariant = 'all' | 'general' | 'iul' | 'tax-free' | 'infinite-banking' | 'compound';

interface PostHogRow {
  [key: string]: string | number | null;
}

interface PostHogResult {
  columns?: string[];
  results?: (string | number | null)[][];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startDateFromRange(range: TimeRange): string {
  const now = new Date();
  switch (range) {
    case 'today':
      return format(now, 'yyyy-MM-dd');
    case '7d':
      return format(subDays(now, 7), 'yyyy-MM-dd');
    case '30d':
      return format(subDays(now, 30), 'yyyy-MM-dd');
  }
}

function variantFilter(variant: PageVariant): string {
  if (variant === 'all') return '1=1';
  return `properties.page_variant = '${variant}'`;
}

function parseRows(data: PostHogResult | undefined): PostHogRow[] {
  if (!data?.columns || !data?.results) return [];
  return data.results.map((row) => {
    const obj: PostHogRow = {};
    data.columns!.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(Number(n))) return '--';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '--';
  return `${Number(n).toFixed(1)}%`;
}

function fmtSeconds(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '--';
  const s = Number(n);
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

function buildQueries(startDate: string, vFilter: string) {
  return {
    visitors: `
      SELECT count(distinct distinct_id) as visitors
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= '${startDate}'
        AND ${vFilter}
    `,
    conversions: `
      SELECT count(distinct distinct_id) as conversions
      FROM events
      WHERE event = 'survey_complete'
        AND timestamp >= '${startDate}'
        AND ${vFilter}
    `,
    avgTimeToConvert: `
      SELECT avg(properties.time_to_convert) as avg_time
      FROM events
      WHERE event = 'survey_complete'
        AND timestamp >= '${startDate}'
        AND ${vFilter}
    `,
    rageClicks: `
      SELECT count(*) as rage_clicks
      FROM events
      WHERE event = '$rageclick'
        AND timestamp >= '${startDate}'
        AND ${vFilter}
    `,
    avgPageLoad: `
      SELECT avg(properties.$performance_raw.connect_end) as avg_load
      FROM events
      WHERE event = '$pageview'
        AND timestamp >= '${startDate}'
        AND ${vFilter}
    `,
    surveyFunnel: `
      SELECT
        properties.step_number as step,
        count(distinct distinct_id) as users
      FROM events
      WHERE event = 'survey_step_view'
        AND timestamp >= '${startDate}'
        AND ${vFilter}
      GROUP BY step
      ORDER BY step
    `,
    abandonment: `
      SELECT
        properties.step_number as step,
        count(*) as abandons,
        avg(properties.hesitation_time) as avg_hesitation,
        avg(properties.scroll_depth) as avg_scroll
      FROM events
      WHERE event = 'survey_abandon'
        AND timestamp >= '${startDate}'
        AND ${vFilter}
      GROUP BY step
      ORDER BY step
    `,
    pageVariantComparison: `
      SELECT
        properties.page_variant as variant,
        count(distinct distinct_id) as visitors,
        countIf(event = 'survey_complete') as conversions,
        round(countIf(event = 'survey_complete') * 100.0 / count(distinct distinct_id), 1) as conv_rate,
        avg(properties.$performance_raw.connect_end) as avg_load
      FROM events
      WHERE event IN ('$pageview', 'survey_complete')
        AND timestamp >= '${startDate}'
      GROUP BY variant
      ORDER BY conv_rate DESC
    `,
    scrollDepth: `
      SELECT
        countIf(properties.scroll_depth >= 25) as d25,
        countIf(properties.scroll_depth >= 50) as d50,
        countIf(properties.scroll_depth >= 75) as d75,
        countIf(properties.scroll_depth >= 100) as d100,
        count(*) as total
      FROM events
      WHERE event = 'scroll_depth'
        AND timestamp >= '${startDate}'
        AND ${vFilter}
    `,
    deviceBreakdown: `
      SELECT
        properties.$device_type as device,
        count(distinct distinct_id) as visitors,
        countIf(event = 'survey_complete') as conversions,
        round(countIf(event = 'survey_complete') * 100.0 / count(distinct distinct_id), 1) as conv_rate,
        avg(properties.$performance_raw.connect_end) as avg_load
      FROM events
      WHERE event IN ('$pageview', 'survey_complete')
        AND timestamp >= '${startDate}'
        AND ${vFilter}
      GROUP BY device
    `,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton({ className = 'h-24' }: { className?: string }) {
  return <Skeleton className={className} />;
}

function KPICard({
  icon: Icon,
  label,
  value,
  color = 'text-white',
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        {isLoading ? (
          <LoadingSkeleton className="h-16" />
        ) : (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/[0.06]">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Custom Tooltip for recharts
function FunnelTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-background/95 backdrop-blur-sm px-3 py-2 text-sm shadow-xl">
      <p className="font-medium">{d.label}</p>
      <p className="text-muted-foreground">{fmtNum(d.users)} users</p>
      {d.dropOff != null && (
        <p className="text-red-400">Drop-off: {fmtPct(d.dropOff)}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FunnelAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [pageVariant, setPageVariant] = useState<PageVariant>('all');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Ad-hoc query console state
  const [consoleQuery, setConsoleQuery] = useState('');
  const [executedQuery, setExecutedQuery] = useState('');
  const [runConsole, setRunConsole] = useState(false);

  const startDate = useMemo(() => startDateFromRange(timeRange), [timeRange]);
  const vFilter = useMemo(() => variantFilter(pageVariant), [pageVariant]);
  const queries = useMemo(() => buildQueries(startDate, vFilter), [startDate, vFilter]);

  // ---- Data hooks ----
  const visitors = usePostHogQuery(queries.visitors);
  const conversions = usePostHogQuery(queries.conversions);
  const avgTime = usePostHogQuery(queries.avgTimeToConvert);
  const rageClicks = usePostHogQuery(queries.rageClicks);
  const avgLoad = usePostHogQuery(queries.avgPageLoad);
  const surveyFunnel = usePostHogQuery(queries.surveyFunnel);
  const abandonment = usePostHogQuery(queries.abandonment);
  const variantComp = usePostHogQuery(queries.pageVariantComparison);
  const scrollDepth = usePostHogQuery(queries.scrollDepth);
  const deviceBreak = usePostHogQuery(queries.deviceBreakdown);
  const consoleResult = usePostHogQuery(executedQuery, {
    enabled: runConsole && executedQuery.length > 0,
  });

  // ---- Derived data ----
  const visitorCount = parseRows(visitors.data)?.[0]?.visitors as number | undefined;
  const conversionCount = parseRows(conversions.data)?.[0]?.conversions as number | undefined;
  const convRate =
    visitorCount && conversionCount
      ? (Number(conversionCount) / Number(visitorCount)) * 100
      : undefined;
  const avgConvertTime = parseRows(avgTime.data)?.[0]?.avg_time as number | undefined;
  const rageCount = parseRows(rageClicks.data)?.[0]?.rage_clicks as number | undefined;
  const avgLoadTime = parseRows(avgLoad.data)?.[0]?.avg_load as number | undefined;

  // Funnel data with drop-off
  const funnelData = useMemo(() => {
    const rows = parseRows(surveyFunnel.data);
    if (!rows.length) return [];
    const stepLabels = [
      'Start',
      'Step 1',
      'Step 2',
      'Step 3',
      'Step 4',
      'Step 5',
      'Step 6',
      'Step 7',
      'Step 8',
      'Step 9',
      'Converted',
    ];
    return rows.map((row, i) => {
      const prev = i > 0 ? Number(rows[i - 1].users) : null;
      const current = Number(row.users);
      const dropOff = prev != null ? ((prev - current) / prev) * 100 : null;
      return {
        step: Number(row.step),
        label: stepLabels[Number(row.step)] ?? `Step ${row.step}`,
        users: current,
        dropOff,
      };
    });
  }, [surveyFunnel.data]);

  const worstDropStep = useMemo(() => {
    if (!funnelData.length) return -1;
    let worst = -1;
    let worstVal = 0;
    funnelData.forEach((d, i) => {
      if (d.dropOff != null && d.dropOff > worstVal) {
        worstVal = d.dropOff;
        worst = i;
      }
    });
    return worst;
  }, [funnelData]);

  // Abandonment rows
  const abandonRows = useMemo(() => parseRows(abandonment.data), [abandonment.data]);

  // Variant comparison rows
  const variantRows = useMemo(() => parseRows(variantComp.data), [variantComp.data]);
  const bestVariant = useMemo(() => {
    if (!variantRows.length) return null;
    return variantRows.reduce((best, row) =>
      Number(row.conv_rate) > Number(best.conv_rate) ? row : best
    );
  }, [variantRows]);

  // Scroll depth
  const scrollData = useMemo(() => {
    const rows = parseRows(scrollDepth.data);
    if (!rows.length) return [];
    const total = Number(rows[0].total) || 1;
    return [
      { label: '25%', pct: (Number(rows[0].d25) / total) * 100 },
      { label: '50%', pct: (Number(rows[0].d50) / total) * 100 },
      { label: '75%', pct: (Number(rows[0].d75) / total) * 100 },
      { label: '100%', pct: (Number(rows[0].d100) / total) * 100 },
    ];
  }, [scrollDepth.data]);

  // Device breakdown
  const deviceRows = useMemo(() => parseRows(deviceBreak.data), [deviceBreak.data]);
  const mobileDevice = deviceRows.find(
    (r) => String(r.device).toLowerCase() === 'mobile'
  );
  const desktopDevice = deviceRows.find(
    (r) => String(r.device).toLowerCase() === 'desktop'
  );

  // Console parsed results
  const consoleRows = useMemo(() => parseRows(consoleResult.data), [consoleResult.data]);
  const consoleColumns = consoleResult.data?.columns ?? [];

  // ---- Actions ----
  const handleRefresh = () => {
    setLastRefreshed(new Date());
    visitors.refetch();
    conversions.refetch();
    avgTime.refetch();
    rageClicks.refetch();
    avgLoad.refetch();
    surveyFunnel.refetch();
    abandonment.refetch();
    variantComp.refetch();
    scrollDepth.refetch();
    deviceBreak.refetch();
  };

  const handleRunConsole = () => {
    if (!consoleQuery.trim()) return;
    setExecutedQuery(consoleQuery.trim());
    setRunConsole(true);
  };

  const exampleQueries = [
    {
      label: 'Top pages by views',
      query: `SELECT properties.$current_url as url, count(*) as views FROM events WHERE event = '$pageview' AND timestamp >= '${startDate}' GROUP BY url ORDER BY views DESC LIMIT 20`,
    },
    {
      label: 'Events by type',
      query: `SELECT event, count(*) as cnt FROM events WHERE timestamp >= '${startDate}' GROUP BY event ORDER BY cnt DESC LIMIT 20`,
    },
    {
      label: 'Avg session duration',
      query: `SELECT avg(properties.$session_duration) as avg_duration FROM events WHERE event = '$pageview' AND timestamp >= '${startDate}'`,
    },
  ];

  // ---- Render ----
  const timeRangeOptions: { label: string; value: TimeRange }[] = [
    { label: 'Today', value: 'today' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
  ];

  const variantOptions: { label: string; value: PageVariant }[] = [
    { label: 'All Variants', value: 'all' },
    { label: 'General', value: 'general' },
    { label: 'IUL', value: 'iul' },
    { label: 'Tax-Free', value: 'tax-free' },
    { label: 'Infinite Banking', value: 'infinite-banking' },
    { label: 'Compound', value: 'compound' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            Funnel Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Survey funnel performance and visitor behavior
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Time Range */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {timeRangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  timeRange === opt.value
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-muted-foreground hover:bg-white/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Page Variant */}
          <Select
            value={pageVariant}
            onValueChange={(val) => setPageVariant(val as PageVariant)}
          >
            <SelectTrigger className="w-[180px] bg-white/[0.04] border-white/10">
              <SelectValue placeholder="All Variants" />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-white/10 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <span className="text-xs text-muted-foreground">
            Updated {format(lastRefreshed, 'h:mm:ss a')}
          </span>
        </div>
      </div>

      {/* Panel 1: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          icon={Users}
          label="Visitors"
          value={fmtNum(visitorCount)}
          color="text-blue-400"
          isLoading={visitors.isLoading}
        />
        <KPICard
          icon={Target}
          label="Conversions"
          value={fmtNum(conversionCount)}
          color="text-emerald-400"
          isLoading={conversions.isLoading}
        />
        <KPICard
          icon={Sparkles}
          label="Conversion Rate"
          value={fmtPct(convRate)}
          color={convRate != null && convRate >= 5 ? 'text-emerald-400' : 'text-amber-400'}
          isLoading={visitors.isLoading || conversions.isLoading}
        />
        <KPICard
          icon={Clock}
          label="Avg Time to Convert"
          value={fmtSeconds(avgConvertTime)}
          color="text-violet-400"
          isLoading={avgTime.isLoading}
        />
        <KPICard
          icon={MousePointerClick}
          label="Rage Clicks"
          value={fmtNum(rageCount)}
          color={rageCount != null && rageCount > 50 ? 'text-red-400' : 'text-emerald-400'}
          isLoading={rageClicks.isLoading}
        />
        <KPICard
          icon={Gauge}
          label="Avg Page Load"
          value={avgLoadTime != null ? `${(Number(avgLoadTime) / 1000).toFixed(2)}s` : '--'}
          color={
            avgLoadTime != null && Number(avgLoadTime) > 3000
              ? 'text-red-400'
              : 'text-emerald-400'
          }
          isLoading={avgLoad.isLoading}
        />
      </div>

      {/* Panel 2: Survey Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-400" />
            Survey Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {surveyFunnel.isLoading ? (
            <LoadingSkeleton className="h-64" />
          ) : funnelData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">
              No funnel data for this time range.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#333' }}
                    tickLine={false}
                  />
                  <Tooltip content={<FunnelTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="users" radius={[6, 6, 0, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === worstDropStep ? '#ef4444' : '#10b981'}
                        opacity={i === worstDropStep ? 1 : 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {funnelData.length > 0 && worstDropStep > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="destructive">Biggest Drop</Badge>
              <span className="text-sm text-muted-foreground">
                {funnelData[worstDropStep]?.label} lost{' '}
                <span className="text-red-400 font-medium">
                  {fmtPct(funnelData[worstDropStep]?.dropOff)}
                </span>{' '}
                of users from the previous step
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panel 3 & 4: Side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 3: Abandonment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-amber-400" />
              Abandonment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {abandonment.isLoading ? (
              <LoadingSkeleton className="h-48" />
            ) : abandonRows.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No abandonment data available.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead className="text-right">Abandons</TableHead>
                    <TableHead className="text-right">Avg Hesitation</TableHead>
                    <TableHead className="text-right">Avg Scroll</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abandonRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">Step {String(row.step)}</TableCell>
                      <TableCell className="text-right">{fmtNum(row.abandons as number)}</TableCell>
                      <TableCell className="text-right">
                        {fmtSeconds(row.avg_hesitation as number)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtPct(row.avg_scroll as number)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Panel 4: Page Variant Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Page Variant Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            {variantComp.isLoading ? (
              <LoadingSkeleton className="h-48" />
            ) : variantRows.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No variant data available.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">Visitors</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Conv Rate</TableHead>
                    <TableHead className="text-right">Avg Load</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantRows.map((row, i) => {
                    const isWinner =
                      bestVariant && String(row.variant) === String(bestVariant.variant);
                    return (
                      <TableRow key={i} className={isWinner ? 'bg-emerald-500/[0.06]' : ''}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {String(row.variant) || 'unknown'}
                            {isWinner && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                Winner
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtNum(row.visitors as number)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtNum(row.conversions as number)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtPct(row.conv_rate as number)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.avg_load != null
                            ? `${(Number(row.avg_load) / 1000).toFixed(2)}s`
                            : '--'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panel 5 & 6: Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 5: Scroll Depth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5 text-violet-400" />
              Scroll Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scrollDepth.isLoading ? (
              <LoadingSkeleton className="h-40" />
            ) : scrollData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No scroll data available.
              </p>
            ) : (
              <div className="space-y-4">
                {scrollData.map((d) => (
                  <div key={d.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{d.label} depth</span>
                      <span className="font-medium">{fmtPct(d.pct)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700"
                        style={{ width: `${Math.min(d.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 6: Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-400" />
              Device Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceBreak.isLoading ? (
              <LoadingSkeleton className="h-40" />
            ) : deviceRows.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No device data available.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Mobile */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-amber-400" />
                    <span className="font-medium">Mobile</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Visitors</span>
                      <span>{fmtNum(mobileDevice?.visitors as number)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conversions</span>
                      <span>{fmtNum(mobileDevice?.conversions as number)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conv Rate</span>
                      <span className="font-medium text-amber-400">
                        {fmtPct(mobileDevice?.conv_rate as number)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Load</span>
                      <span>
                        {mobileDevice?.avg_load != null
                          ? `${(Number(mobileDevice.avg_load) / 1000).toFixed(2)}s`
                          : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-blue-400" />
                    <span className="font-medium">Desktop</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Visitors</span>
                      <span>{fmtNum(desktopDevice?.visitors as number)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conversions</span>
                      <span>{fmtNum(desktopDevice?.conversions as number)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conv Rate</span>
                      <span className="font-medium text-blue-400">
                        {fmtPct(desktopDevice?.conv_rate as number)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Load</span>
                      <span>
                        {desktopDevice?.avg_load != null
                          ? `${(Number(desktopDevice.avg_load) / 1000).toFixed(2)}s`
                          : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panel 7: Query Console */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-400" />
            Query Console
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Example query chips */}
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((eq) => (
              <button
                key={eq.label}
                onClick={() => setConsoleQuery(eq.query)}
                className="px-3 py-1 text-xs rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                {eq.label}
              </button>
            ))}
          </div>

          <textarea
            value={consoleQuery}
            onChange={(e) => setConsoleQuery(e.target.value)}
            placeholder="Enter a HogQL query..."
            className="w-full h-28 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />

          <div className="flex items-center gap-3">
            <Button
              onClick={handleRunConsole}
              disabled={!consoleQuery.trim() || consoleResult.isFetching}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              {consoleResult.isFetching ? 'Running...' : 'Run Query'}
            </Button>
            {consoleResult.isError && (
              <span className="text-sm text-red-400">
                Error: {(consoleResult.error as Error)?.message ?? 'Unknown error'}
              </span>
            )}
          </div>

          {/* Results table */}
          {consoleRows.length > 0 && (
            <div className="rounded-lg border border-white/[0.06] overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    {consoleColumns.map((col: string) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consoleRows.map((row, i) => (
                    <TableRow key={i}>
                      {consoleColumns.map((col: string) => (
                        <TableCell key={col}>{String(row[col] ?? '')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {runConsole && !consoleResult.isFetching && consoleRows.length === 0 && !consoleResult.isError && (
            <p className="text-sm text-muted-foreground">No results returned.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
