import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Wallet, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export interface WalletVerificationIssue {
  type: 'missing_deposit' | 'amount_mismatch' | 'stripe_not_succeeded' | 'stripe_amount_mismatch';
  billingRecordId: string;
  clientId: string;
  clientName: string;
  chargeAmount: number;
  depositAmount: number | null;
  stripeAmount: number | null;
  paymentIntentId: string | null;
  paidAt: string | null;
}

interface WalletVerificationWidgetProps {
  issues: WalletVerificationIssue[];
  checked: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

function typeLabel(type: WalletVerificationIssue['type']): string {
  switch (type) {
    case 'missing_deposit': return 'Missing Deposit';
    case 'amount_mismatch': return 'Amount Mismatch';
    case 'stripe_not_succeeded': return 'Stripe Not Paid';
    case 'stripe_amount_mismatch': return 'Stripe Mismatch';
  }
}

function typeBadgeClass(type: WalletVerificationIssue['type']): string {
  switch (type) {
    case 'missing_deposit': return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'amount_mismatch': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'stripe_not_succeeded': return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'stripe_amount_mismatch': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  }
}

export function WalletVerificationWidget({ issues, checked, isLoading, onRefresh }: WalletVerificationWidgetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleApprove = async (issue: WalletVerificationIssue, e: React.MouseEvent) => {
    e.stopPropagation();
    setApprovingId(issue.billingRecordId);
    try {
      const { data, error } = await supabase.functions.invoke('verify-wallet-charges', {
        body: {
          action: 'approve_deposit',
          billingRecordId: issue.billingRecordId,
          clientId: issue.clientId,
          amount: issue.chargeAmount,
        },
      });
      if (error) throw new Error(error.message);
      toast.success(`Deposit of $${issue.chargeAmount} created for ${issue.clientName}`);
      setDismissedIds(prev => new Set([...prev, issue.billingRecordId]));
      queryClient.invalidateQueries({ queryKey: ['wallet-verification'] });
    } catch (err: any) {
      toast.error(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleDismiss = (issue: WalletVerificationIssue, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, issue.billingRecordId]));
    toast.info(`Dismissed for ${issue.clientName}`);
  };

  const visibleIssues = issues.filter(i => !dismissedIds.has(i.billingRecordId));
  const hasIssues = visibleIssues.length > 0;
  const borderClass = hasIssues ? 'border-yellow-500/20' : 'border-border/50';
  const bgClass = hasIssues ? 'bg-yellow-500/5' : 'bg-card/50';

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border overflow-hidden', borderClass, bgClass)}>
      <div className={cn('p-4 border-b', hasIssues ? 'border-yellow-500/20' : 'border-border/50')}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className={cn('w-5 h-5', hasIssues ? 'text-yellow-400' : 'text-green-400')} />
            Wallet Charge Verification
            {hasIssues && (
              <Badge variant="outline" className="ml-1 bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                {visibleIssues.length}
              </Badge>
            )}
          </h3>
          <span className="text-xs text-muted-foreground">{checked} charges checked</span>
        </div>
      </div>

      {!hasIssues ? (
        <div className="p-6 text-center">
          <ShieldCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">All recent charges verified — deposits match</p>
        </div>
      ) : (
        <div className="divide-y divide-yellow-500/10">
          {visibleIssues.slice(0, 8).map((issue) => (
            <div
              key={issue.billingRecordId}
              className="p-4 hover:bg-yellow-500/5 cursor-pointer transition-colors"
              onClick={() => navigate(`/hub/admin/clients/${issue.clientId}?tab=billing`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{issue.clientName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={cn('text-xs', typeBadgeClass(issue.type))}>
                        {typeLabel(issue.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ${issue.chargeAmount.toFixed(2)}
                        {issue.depositAmount !== null && ` → $${issue.depositAmount.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {issue.type === 'missing_deposit' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-green-500/40 text-green-400 hover:bg-green-500/10"
                      disabled={approvingId === issue.billingRecordId}
                      onClick={(e) => handleApprove(issue, e)}
                    >
                      {approvingId === issue.billingRecordId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Approve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => handleDismiss(issue, e)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
