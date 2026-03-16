import { DollarSign, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { BillingIntegrityRow } from '@/hooks/useBillingDashboard';
import type { ClientVerificationSummary } from '@/hooks/useBillingVerification';

interface BillingSummaryCardsProps {
  rows: BillingIntegrityRow[];
  verificationMap: Map<string, ClientVerificationSummary> | undefined;
  projectedAdSpend: number;
  isLoading: boolean;
  isVerificationLoading: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  tint: string;
}

function SummaryCard({ icon, label, value, sublabel, tint }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-border/50 bg-card p-4')}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-md', tint)}>
          {icon}
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
      {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
    </div>
  );
}

export function BillingSummaryCards({
  rows,
  verificationMap,
  projectedAdSpend,
  isLoading,
  isVerificationLoading,
}: BillingSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const mtdCollected = rows.reduce((s, r) => s + r.totalDeposits, 0);
  const problemCount = rows.filter(r => r.status === 'problem').length;
  const verifiedCount = verificationMap?.size ?? 0;
  const totalClients = rows.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SummaryCard
        icon={<DollarSign className="w-4 h-4 text-green-400" />}
        label="MTD Ad Spend Collected"
        value={fmt(mtdCollected)}
        sublabel={`${totalClients} clients tracked`}
        tint="bg-green-500/10"
      />
      <SummaryCard
        icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
        label="Projected Ad Spend"
        value={fmt(projectedAdSpend)}
        sublabel="run-rate projection"
        tint="bg-blue-500/10"
      />
      <SummaryCard
        icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
        label="Problem Clients"
        value={String(problemCount)}
        sublabel={problemCount > 0 ? 'need attention' : 'all clear'}
        tint="bg-red-500/10"
      />
      <SummaryCard
        icon={<ShieldCheck className="w-4 h-4 text-green-400" />}
        label="Verified Clients"
        value={isVerificationLoading ? '...' : `${verifiedCount} / ${totalClients}`}
        sublabel="verified"
        tint="bg-green-500/10"
      />
    </div>
  );
}
