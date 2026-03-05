import { useNavigate } from 'react-router-dom';
import { Zap, ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { WalletPipelineItem } from '@/hooks/useBillingDashboard';

interface WalletPipelineWidgetProps {
  items: WalletPipelineItem[];
  isLoading?: boolean;
}

function StatusBadge({ item }: { item: WalletPipelineItem }) {
  if (item.lastChargeFailedAt) {
    const daysSince = differenceInDays(new Date(), parseISO(item.lastChargeFailedAt));
    if (daysSince <= 7) {
      return (
        <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400 gap-1">
          <AlertTriangle className="w-3 h-3" />
          Charge failed
        </Badge>
      );
    }
  }
  if (!item.lastAutoChargeAt) {
    return (
      <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground gap-1">
        <Clock className="w-3 h-3" />
        Never recharged
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400 gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Active
    </Badge>
  );
}

export function WalletPipelineWidget({ items, isLoading }: WalletPipelineWidgetProps) {
  const navigate = useNavigate();

  const totalPipeline = items.reduce((sum, i) => sum + (i.autoChargeAmount || i.threshold || 0), 0);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-500/20 overflow-hidden bg-cyan-500/5">
        <div className="p-4 border-b border-cyan-500/20">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-muted-foreground" />
            Ad Spend Pipeline
          </h3>
        </div>
        <div className="p-8 text-center">
          <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No auto-billing clients configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 overflow-hidden bg-cyan-500/5">
      <div className="p-4 border-b border-cyan-500/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          Ad Spend Pipeline
          <span className="text-sm font-normal text-muted-foreground ml-1">
            {items.length} auto-billing client{items.length !== 1 ? 's' : ''}
          </span>
          <Badge variant="outline" className="ml-auto text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
            ${totalPipeline.toLocaleString()} pool
          </Badge>
        </h3>
      </div>

      <div className="divide-y divide-cyan-500/10">
        {items.map((item) => {
          const rechargeAmount = item.autoChargeAmount || item.threshold;
          return (
            <div
              key={item.clientId}
              className="p-4 hover:bg-cyan-500/5 cursor-pointer transition-colors flex items-center justify-between"
              onClick={() => navigate(`/hub/admin/clients/${item.clientId}?tab=wallet`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.clientName}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>${(item.threshold || 0).toLocaleString()} trigger</span>
                    {item.autoChargeAmount && item.autoChargeAmount !== item.threshold && (
                      <span>· ${item.autoChargeAmount.toLocaleString()} charge</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${(rechargeAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.lastAutoChargeAt
                      ? `Last: ${format(parseISO(item.lastAutoChargeAt), 'MMM d')}`
                      : 'No recharges yet'}
                  </p>
                </div>
                <StatusBadge item={item} />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-cyan-500/10 bg-cyan-500/5">
        <p className="text-xs text-muted-foreground">
          Pipeline = total recharge amounts across all auto-billing clients. Revenue comes in as clients spend down to their trigger threshold.
        </p>
      </div>
    </div>
  );
}
