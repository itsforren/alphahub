import { CalendarDays } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export type DatePreset = '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'all';

export interface DateRange {
  from: Date;
  to: Date;
}

interface MetricsDateSelectorProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
  className?: string;
}

export function getDateRangeFromPreset(preset: DatePreset, trackingStartDate?: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (preset) {
    case '7d':
      return { from: subDays(today, 7), to: today };
    case '30d':
      return { from: subDays(today, 30), to: today };
    case '90d':
      return { from: subDays(today, 90), to: today };
    case 'this_month':
      return { from: startOfMonth(today), to: today };
    case 'last_month':
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'all':
      // Use tracking start date if available, otherwise go back 1 year
      const allTimeStart = trackingStartDate 
        ? new Date(trackingStartDate) 
        : subDays(today, 365);
      return { from: allTimeStart, to: today };
    default:
      return { from: subDays(today, 30), to: today };
  }
}

const presetLabels: Record<DatePreset, string> = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  'this_month': 'This Month',
  'last_month': 'Last Month',
  'all': 'All Time',
};

export function MetricsDateSelector({ value, onChange, className }: MetricsDateSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DatePreset)}>
      <SelectTrigger className={className ?? "w-[160px]"}>
        <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">{presetLabels['7d']}</SelectItem>
        <SelectItem value="30d">{presetLabels['30d']}</SelectItem>
        <SelectItem value="90d">{presetLabels['90d']}</SelectItem>
        <SelectItem value="this_month">{presetLabels['this_month']}</SelectItem>
        <SelectItem value="last_month">{presetLabels['last_month']}</SelectItem>
        <SelectItem value="all">{presetLabels['all']}</SelectItem>
      </SelectContent>
    </Select>
  );
}
