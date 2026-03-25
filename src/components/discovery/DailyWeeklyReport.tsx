import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Users, Zap, PhoneCall, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { useDiscoveryReportStats } from '@/hooks/useDiscoveryReportStats';
import type { DateRange } from '@/hooks/useDiscoveryReportStats';
import { TimeOfDayHeatmap } from './TimeOfDayHeatmap';

interface DailyWeeklyReportProps {
  agentId: string;
}

const bookingChartConfig = {
  count: { label: 'Bookings', color: 'hsl(270, 70%, 60%)' },
} satisfies ChartConfig;

export function DailyWeeklyReport({ agentId }: DailyWeeklyReportProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { data: report, isLoading } = useDiscoveryReportStats(
    agentId,
    dateRange,
    customStart || undefined,
    customEnd || undefined
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/50 border-border/50">
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors rounded-t-lg">
          <span className="text-sm font-bold text-foreground">Performance Report</span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Date range toggle */}
            <div className="flex items-center gap-2">
              {(['today', 'week', 'custom'] as DateRange[]).map((range) => (
                <Button
                  key={range}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'text-xs h-7 px-3',
                    dateRange === range && 'bg-primary/10 border-primary/40 text-primary'
                  )}
                  onClick={() => setDateRange(range)}
                >
                  {range === 'today' ? 'Today' : range === 'week' ? 'Week' : 'Custom'}
                </Button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 px-2 rounded-md border border-border bg-background text-xs text-foreground"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 px-2 rounded-md border border-border bg-background text-xs text-foreground"
                />
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">Loading report...</p>
              </div>
            )}

            {report && (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard
                    icon={Users}
                    label="Coverage"
                    value={`${report.totalLeadsContacted}/${report.totalLeadsReceived}`}
                    sub={`${report.coverageRate}%`}
                    color="text-blue-400"
                  />
                  <StatCard
                    icon={Zap}
                    label="Avg Speed"
                    value={report.avgSpeedToFirstContact < 60
                      ? `${report.avgSpeedToFirstContact}m`
                      : `${Math.round(report.avgSpeedToFirstContact / 60)}h`
                    }
                    sub="to first contact"
                    color="text-amber-400"
                  />
                  <StatCard
                    icon={PhoneCall}
                    label="Pick-up Rate"
                    value={`${report.totalConnected > 0
                      ? Math.round((report.totalConnected / (report.totalConnected + (report.totalLeadsContacted - report.totalConnected))) * 100) || report.bookingRate
                      : 0}%`}
                    sub={`${report.totalConnected} connected`}
                    color={report.bookingRate >= 30 ? 'text-green-400' : report.bookingRate >= 15 ? 'text-amber-400' : 'text-red-400'}
                  />
                  <StatCard
                    icon={Calendar}
                    label="Booking Rate"
                    value={`${report.bookingRate}%`}
                    sub={`${report.totalBooked} booked`}
                    color="text-purple-400"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    label="Fallen Through"
                    value={`${report.fallenThrough}`}
                    sub="leads >24h, 0 calls"
                    color={report.fallenThrough > 0 ? 'text-red-400' : 'text-green-400'}
                  />
                </div>

                {/* Time of Day Heatmap */}
                <TimeOfDayHeatmap hourlyData={report.hourlyPickup} />

                {/* Daily bookings chart (only for week range) */}
                {dateRange === 'week' && report.dailyBookings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                      Daily Bookings
                    </p>
                    <ChartContainer config={bookingChartConfig} className="h-[120px] w-full">
                      <BarChart
                        data={report.dailyBookings.map((d) => ({
                          date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
                          count: d.count,
                        }))}
                        margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/10 border border-border/30 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
      </div>
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
