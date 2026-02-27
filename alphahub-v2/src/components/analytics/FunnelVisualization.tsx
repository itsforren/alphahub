import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountWideMetrics } from '@/hooks/useAccountWideMetrics';
import { cn } from '@/lib/utils';

interface FunnelVisualizationProps {
  metrics: AccountWideMetrics | undefined;
  isLoading: boolean;
}

interface FunnelStep {
  label: string;
  count: number;
  conversionRate: number | null;
  color: string;
}

export function FunnelVisualization({ metrics, isLoading }: FunnelVisualizationProps) {
  const steps: FunnelStep[] = useMemo(() => {
    if (!metrics) return [];
    
    const { totalLeads, bookedCalls, submittedApps, approvedApps, issuedPaid } = metrics;
    
    return [
      { 
        label: 'Leads', 
        count: totalLeads, 
        conversionRate: null,
        color: 'bg-primary/90'
      },
      { 
        label: 'Booked Calls', 
        count: bookedCalls, 
        conversionRate: totalLeads > 0 ? (bookedCalls / totalLeads) * 100 : 0,
        color: 'bg-primary/70'
      },
      { 
        label: 'Submitted', 
        count: submittedApps, 
        conversionRate: bookedCalls > 0 ? (submittedApps / bookedCalls) * 100 : 0,
        color: 'bg-primary/55'
      },
      { 
        label: 'Approved', 
        count: approvedApps, 
        conversionRate: submittedApps > 0 ? (approvedApps / submittedApps) * 100 : 0,
        color: 'bg-primary/40'
      },
      { 
        label: 'Issued Paid', 
        count: issuedPaid, 
        conversionRate: approvedApps > 0 ? (issuedPaid / approvedApps) * 100 : 0,
        color: 'bg-success'
      },
    ];
  }, [metrics]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Lead Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...steps.map(s => s.count), 1);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Lead Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const widthPercent = (step.count / maxCount) * 100;
            
            return (
              <div key={step.label} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{step.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-foreground">{step.count.toLocaleString()}</span>
                    {step.conversionRate !== null && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {step.conversionRate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-muted rounded-md overflow-hidden">
                  <div 
                    className={cn("h-full rounded-md transition-all duration-500", step.color)}
                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                  />
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 text-muted-foreground">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-40">
                      <path d="M6 0L6 12M6 12L1 7M6 12L11 7" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Overall conversion summary */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Lead → Issued Paid Conversion</span>
            <span className="text-lg font-bold text-primary">
              {metrics && metrics.totalLeads > 0 
                ? ((metrics.issuedPaid / metrics.totalLeads) * 100).toFixed(1)
                : '0.0'}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
