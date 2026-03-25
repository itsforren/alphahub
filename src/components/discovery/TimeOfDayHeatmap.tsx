import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { HourlyPickup } from '@/hooks/useDiscoveryReportStats';

interface TimeOfDayHeatmapProps {
  hourlyData: HourlyPickup[];
}

const chartConfig = {
  answered: { label: 'Answered', color: 'hsl(142, 76%, 36%)' },
  unanswered: { label: 'No Answer', color: 'hsl(0, 0%, 40%)' },
} satisfies ChartConfig;

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

export function TimeOfDayHeatmap({ hourlyData }: TimeOfDayHeatmapProps) {
  const chartData = useMemo(() => {
    // Show hours 6am-9pm, or all hours that have data
    const result: { hour: string; answered: number; unanswered: number; total: number; rate: number }[] = [];
    for (let h = 6; h <= 21; h++) {
      const entry = hourlyData.find((d) => d.hour === h);
      result.push({
        hour: formatHour(h),
        answered: entry?.answered || 0,
        unanswered: (entry?.total || 0) - (entry?.answered || 0),
        total: entry?.total || 0,
        rate: entry?.rate || 0,
      });
    }
    return result;
  }, [hourlyData]);

  // Best windows: hours with >= 3 calls and highest pickup rates
  const bestWindows = useMemo(() => {
    const meaningful = hourlyData
      .filter((h) => h.total >= 3)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
    if (meaningful.length === 0) return null;
    return meaningful.map((h) => formatHour(h.hour)).join(', ');
  }, [hourlyData]);

  const hasData = hourlyData.some((h) => h.total > 0);

  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-muted-foreground">No call data yet for time-of-day analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
        Pick-up Rate by Time of Day
      </p>
      <ChartContainer config={chartConfig} className="h-[180px] w-full">
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => `${label}`}
                formatter={(value, name, item) => {
                  const entry = item.payload;
                  if (name === 'answered') {
                    return (
                      <span className="text-xs">
                        {entry.total} calls, {entry.answered} answered ({entry.rate}%)
                      </span>
                    );
                  }
                  return null;
                }}
              />
            }
          />
          <Bar dataKey="answered" stackId="calls" fill="var(--color-answered)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="unanswered" stackId="calls" fill="var(--color-unanswered)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>
      {bestWindows && (
        <p className="text-[11px] text-green-400">
          Best windows: {bestWindows}
        </p>
      )}
    </div>
  );
}
