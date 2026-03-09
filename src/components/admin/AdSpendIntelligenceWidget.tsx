import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Wallet,
  CreditCard,
  Settings,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AdSpendIntelligence } from '@/hooks/useBillingDashboard';
import {
  useExcludedCampaigns,
  useUpdateExcludedCampaigns,
} from '@/hooks/useBillingDashboard';

interface Props {
  data?: AdSpendIntelligence;
  isLoading?: boolean;
  isCurrentMonth?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtD(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function Dot({ status }: { status: 'green' | 'yellow' | 'red' }) {
  return (
    <span className={cn(
      'inline-block w-2.5 h-2.5 rounded-full',
      status === 'green' && 'bg-green-400',
      status === 'yellow' && 'bg-yellow-400',
      status === 'red' && 'bg-red-400',
    )} />
  );
}

function StatusIcon({ status }: { status: 'green' | 'yellow' | 'red' }) {
  if (status === 'green') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'yellow') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  return <AlertCircle className="w-4 h-4 text-red-400" />;
}

function ExcludedCampaignsSettings() {
  const { data: excluded = [], isLoading } = useExcludedCampaigns();
  const updateMutation = useUpdateExcludedCampaigns();
  const [newId, setNewId] = useState('');

  const handleAdd = () => {
    const trimmed = newId.trim();
    if (!trimmed || excluded.includes(trimmed)) return;
    updateMutation.mutate([...excluded, trimmed]);
    setNewId('');
  };

  const handleRemove = (id: string) => {
    updateMutation.mutate(excluded.filter(c => c !== id));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Exclude campaign IDs from spend tracking (internal campaigns, IUL agents, etc.).
        Campaigns marked "ignored" in Command Center are excluded automatically.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Campaign ID..."
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="h-8 text-xs"
        />
        <Button variant="outline" size="sm" onClick={handleAdd}
          disabled={!newId.trim() || updateMutation.isPending} className="h-8 px-2">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      {isLoading ? <Skeleton className="h-6 w-full" /> : excluded.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No extra exclusions configured.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {excluded.map(id => (
            <Badge key={id} variant="outline" className="text-xs gap-1 pl-2 pr-1 py-0.5 bg-muted/30">
              {id}
              <button onClick={() => handleRemove(id)} className="ml-0.5 hover:text-red-400 transition-colors"
                disabled={updateMutation.isPending}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdSpendIntelligenceWidget({ data, isLoading, isCurrentMonth = true }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const {
    googleAdsSpendMtd,
    walletDepositsMtd,
    totalWalletBalance,
    totalStripeCharged,
    managementCharged,
    overallStatus,
    clients,
    excludedCampaignIds,
    ignoredCampaignCount,
    currentMonth,
    daysElapsed,
    daysInMonth,
  } = data;

  const mtdLabel = isCurrentMonth ? 'MTD' : currentMonth;
  const depositDiff = walletDepositsMtd - googleAdsSpendMtd;
  const clientsWithIssues = clients.filter(c => c.status !== 'green');
  const totalExcluded = ignoredCampaignCount + excludedCampaignIds.length;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/10">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ad Spend Tracker</p>
            <p className="text-xs text-muted-foreground">
              {mtdLabel} &middot; Day {daysElapsed}/{daysInMonth}
              {totalExcluded > 0 && (
                <span className="ml-1 text-muted-foreground/60">
                  &middot; {totalExcluded} campaign{totalExcluded !== 1 ? 's' : ''} excluded
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StatusIcon status={overallStatus} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Excluded Campaigns</p>
                <ExcludedCampaignsSettings />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 3-column metrics */}
      <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google Ads Spend */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-xs text-muted-foreground">Google Ads Spend</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(googleAdsSpendMtd)}</p>
          <p className="text-[10px] text-muted-foreground">Actual platform spend {mtdLabel}</p>
        </div>

        {/* Wallet Deposits (Stripe ad spend charges) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-green-400" />
            <p className="text-xs text-muted-foreground">Wallet Deposits</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(walletDepositsMtd)}</p>
          <p className={cn(
            'text-[10px]',
            depositDiff >= 0 ? 'text-green-400' : 'text-red-400',
          )}>
            {depositDiff >= 0 ? '+' : ''}{fmt(depositDiff)} vs Google Ads
          </p>
        </div>

        {/* Total Wallet Balance */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-xs text-muted-foreground">Total Wallet Balance</p>
          </div>
          <p className={cn(
            'text-2xl font-bold',
            totalWalletBalance < 0 ? 'text-red-400' : totalWalletBalance < 500 ? 'text-yellow-400' : 'text-foreground',
          )}>
            {fmt(totalWalletBalance)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Across {clients.length} client{clients.length !== 1 ? 's' : ''}
            {' '}&middot; {fmt(totalStripeCharged)} total Stripe {mtdLabel}
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Dot status={overallStatus} />
            <span className="text-xs text-muted-foreground">
              {overallStatus === 'green' ? 'All wallets healthy' :
               overallStatus === 'yellow' ? 'Some wallets low' : 'Wallets need attention'}
            </span>
          </div>
          {clientsWithIssues.length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
              {clientsWithIssues.length} client{clientsWithIssues.length !== 1 ? 's' : ''} low/negative
            </Badge>
          )}
        </div>
        {clients.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowBreakdown(!showBreakdown)}
            className="h-6 text-xs gap-1">
            {showBreakdown ? 'Hide' : 'Per Client'}
            {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        )}
      </div>

      {/* Per-client breakdown */}
      {showBreakdown && clients.length > 0 && (
        <div className="border-t border-border/30">
          <div className="px-5 py-2 grid grid-cols-5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-b border-border/20">
            <span className="col-span-2">Client</span>
            <span className="text-right">Google Ads</span>
            <span className="text-right">Deposited</span>
            <span className="text-right">Balance</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {clients.map(c => (
              <div key={c.clientId} className={cn(
                'px-5 py-2 grid grid-cols-5 text-xs border-b border-border/10 hover:bg-muted/20 transition-colors',
                c.status === 'red' && 'bg-red-500/5',
                c.status === 'yellow' && 'bg-yellow-500/5',
              )}>
                <div className="col-span-2 flex items-center gap-1.5 truncate">
                  <Dot status={c.status} />
                  <span className="truncate">{c.clientName}</span>
                </div>
                <span className="text-right text-muted-foreground">{fmtD(c.googleAdsSpend)}</span>
                <span className="text-right">{fmtD(c.walletDeposits)}</span>
                <span className={cn(
                  'text-right font-medium',
                  c.walletBalance < 0 ? 'text-red-400' : c.walletBalance < 100 ? 'text-yellow-400' : 'text-green-400',
                )}>
                  {fmtD(c.walletBalance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
