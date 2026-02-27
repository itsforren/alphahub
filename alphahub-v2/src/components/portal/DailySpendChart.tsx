import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { usePerformancePercentage, applyPerformancePercentage } from '@/hooks/usePerformancePercentage';

interface DailySpendChartProps {
  clientId: string;
  targetDailySpend?: number | null;
}

export function DailySpendChart({ clientId, targetDailySpend }: DailySpendChartProps) {
  // Fetch performance percentage to apply to all spend figures
  const { data: performancePercentage, isLoading: performanceLoading } = usePerformancePercentage();
  const perfPct = performancePercentage ?? 0;

  const { data: dailyData, isLoading } = useQuery({
    queryKey: ['ad-spend-daily', clientId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('ad_spend_daily')
        .select('spend_date, cost, clicks, impressions, conversions, ctr, cpc')
        .eq('client_id', clientId)
        .gte('spend_date', thirtyDaysAgo)
        .order('spend_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const chartData = useMemo(() => {
    // Create a map of existing data by date
    const dataByDate = new Map<string, typeof dailyData[0]>();
    dailyData?.forEach(row => {
      dataByDate.set(row.spend_date, row);
    });
    
    // Generate all 30 days
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const row = dataByDate.get(dateStr);
      
      const conversions = row?.conversions || 0;
      const rawCost = row?.cost || 0;
      // Apply performance percentage to the cost (e.g., +10% markup)
      const cost = applyPerformancePercentage(rawCost, perfPct);
      const costPerConversion = conversions > 0 ? cost / conversions : 0;

      result.push({
        date: dateStr,
        spend: cost,
        clicks: row?.clicks || 0,
        impressions: row?.impressions || 0,
        conversions,
        ctr: row?.ctr || 0,
        costPerConversion,
        formattedDate: format(date, 'MMM d'),
      });
    }

    return result;
  }, [dailyData, perfPct]);

  // Calculate trend line (simple linear regression)
  const trendData = useMemo(() => {
    if (chartData.length < 2) return chartData;

    const n = chartData.length;
    const sumX = chartData.reduce((acc, _, i) => acc + i, 0);
    const sumY = chartData.reduce((acc, d) => acc + d.spend, 0);
    const sumXY = chartData.reduce((acc, d, i) => acc + i * d.spend, 0);
    const sumX2 = chartData.reduce((acc, _, i) => acc + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return chartData.map((d, i) => ({
      ...d,
      trend: Math.max(0, intercept + slope * i),
    }));
  }, [chartData]);

  const totalSpend = chartData.reduce((acc, d) => acc + d.spend, 0);
  const avgSpend = chartData.length > 0 ? totalSpend / chartData.length : 0;

  if (isLoading || performanceLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Ad Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Ad Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            No spend data available. Sync Google Ads to populate.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Daily Ad Spend (Last 30 Days)</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Avg: <span className="font-medium text-foreground">${avgSpend.toFixed(2)}/day</span></span>
            {targetDailySpend && (
              <span>Target: <span className="font-medium text-foreground">${targetDailySpend}/day</span></span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 10 }} 
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 10 }} 
              className="text-muted-foreground"
              tickFormatter={(v) => `$${v}`}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }} 
              className="text-muted-foreground"
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'spend') return [`$${value.toFixed(2)}`, 'Daily Spend'];
                if (name === 'trend') return [`$${value.toFixed(2)}`, 'Trend'];
                if (name === 'costPerConversion') return [`$${value.toFixed(2)}`, 'Cost/Conv'];
                if (name === 'ctr') return [`${value.toFixed(2)}%`, 'CTR'];
                return [value, name];
              }}
              labelFormatter={(label) => label}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => {
                if (value === 'spend') return 'Spend';
                if (value === 'costPerConversion') return 'Cost/Conv';
                if (value === 'ctr') return 'CTR';
                if (value === 'trend') return 'Trend';
                return value;
              }}
            />
            {targetDailySpend && (
              <ReferenceLine 
                yAxisId="left"
                y={targetDailySpend} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5" 
                strokeOpacity={0.6}
              />
            )}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="spend"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="costPerConversion"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#ef4444' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ctr"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="trend"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
