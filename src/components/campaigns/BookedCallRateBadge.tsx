import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, PhoneOff } from 'lucide-react';

interface BookedCallRateBadgeProps {
  rate: number | null | undefined;
  leads?: number | null;
  bookedCalls?: number | null;
  size?: 'sm' | 'md';
}

export function BookedCallRateBadge({ 
  rate, 
  leads, 
  bookedCalls,
  size = 'sm' 
}: BookedCallRateBadgeProps) {
  if (rate == null) {
    return (
      <span className="text-muted-foreground text-sm">—</span>
    );
  }

  const getColorClass = () => {
    if (rate >= 60) return 'bg-green-100 text-green-700 border-green-300';
    if (rate >= 50) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (rate >= 35) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getLabel = () => {
    if (rate >= 60) return 'Excellent';
    if (rate >= 50) return 'Good';
    if (rate >= 35) return 'Fair';
    return 'Low';
  };

  const Icon = rate >= 35 ? Phone : PhoneOff;
  const lowSample = leads != null && leads < 10;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${getColorClass()} gap-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
          >
            <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
            {rate.toFixed(0)}%
            {lowSample && '*'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">Booked Call Rate: {rate.toFixed(1)}%</p>
            {leads != null && bookedCalls != null && (
              <p className="text-muted-foreground">
                {bookedCalls} booked / {leads} leads
              </p>
            )}
            <p className="text-muted-foreground">Quality: {getLabel()}</p>
            {lowSample && (
              <p className="text-yellow-600 text-xs mt-1">
                *Low sample size (under 10 leads)
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
