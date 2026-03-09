import { useState } from 'react';
import { BarChart3, Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditResult {
  management: {
    expectedWeekly: number;
    actual: number;
    delta: number;
    clientsWithFee: number;
    clientsPaid: number;
    clientsMissing: number;
  };
  adSpend: {
    trackedPlatformSpend: number;
    stripeCharges: number;
    chargeCount: number;
    depositMismatches: number;
  };
  totalRevenue: number;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function WeeklyAuditWidget() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [expanded, setExpanded] = useState(true);

  const handleRunAudit = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('weekly-billing-audit', { body: {} });
      if (error) throw new Error(error.message);
      setResult(data);
      setExpanded(true);
      toast.success('Weekly audit complete');
    } catch (err: any) {
      toast.error(`Audit failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Weekly Billing Audit
          </h3>
          <div className="flex items-center gap-2">
            {result && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={handleRunAudit}
              disabled={isRunning}
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {isRunning ? 'Running...' : 'Run Audit'}
            </Button>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="p-6 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Click "Run Audit" to compare expected vs actual billing for the past 7 days</p>
        </div>
      ) : expanded && (
        <div className="p-4 space-y-4">
          {/* Total Revenue */}
          <div className="flex items-center justify-between pb-3 border-b border-border/30">
            <span className="text-sm font-medium text-foreground">Total Weekly Revenue</span>
            <span className="text-lg font-bold text-foreground">{fmt(result.totalRevenue)}</span>
          </div>

          {/* Management Fees */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">Management Fees</span>
              {result.management.delta > 0 && (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                  -{fmt(result.management.delta)} gap
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="text-sm font-semibold text-foreground">{fmt(result.management.expectedWeekly)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className={cn('text-sm font-semibold', result.management.actual < result.management.expectedWeekly * 0.5 ? 'text-red-400' : 'text-foreground')}>
                  {fmt(result.management.actual)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="text-sm font-semibold text-foreground">
                  {result.management.clientsPaid}/{result.management.clientsWithFee}
                  <span className="text-xs text-muted-foreground font-normal ml-1">paid</span>
                </p>
              </div>
            </div>
          </div>

          {/* Ad Spend */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">Ad Spend</span>
              {result.adSpend.depositMismatches > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                  {result.adSpend.depositMismatches} deposit issue{result.adSpend.depositMismatches !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Platform Spend</p>
                <p className="text-sm font-semibold text-foreground">{fmt(result.adSpend.trackedPlatformSpend)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Stripe Charged</p>
                <p className="text-sm font-semibold text-foreground">{fmt(result.adSpend.stripeCharges)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Charges</p>
                <p className="text-sm font-semibold text-foreground">{result.adSpend.chargeCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
