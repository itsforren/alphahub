import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBillingIntegrity, BillingIntegrityRow } from '@/hooks/useBillingDashboard';
import { useAllClientVerifications, useSyncHealth } from '@/hooks/useBillingVerification';
import { VerificationPanel, fmt } from '@/components/admin/VerificationPanel';
import { SyncHealthBar } from '@/components/admin/SyncHealthBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ClipboardCheck,
  Search,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  AlertTriangle,
  CircleX,
  Filter,
  ShieldCheck,
  Brain,
} from 'lucide-react';

type FilterMode = 'all' | 'problems' | 'warnings' | 'clean';
type SortField = 'clientName' | 'mtdAdSpend' | 'totalDeposits' | 'walletBalance' | 'unbackedTotal' | 'status';
type SortDir = 'asc' | 'desc';

function statusIcon(status: BillingIntegrityRow['status']) {
  switch (status) {
    case 'clean': return <CircleCheck className="w-4 h-4 text-green-400" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'problem': return <CircleX className="w-4 h-4 text-red-400" />;
  }
}

function statusLabel(status: BillingIntegrityRow['status']) {
  switch (status) {
    case 'clean': return 'Clean';
    case 'warning': return 'Warning';
    case 'problem': return 'Problem';
  }
}

function statusBadgeClass(status: BillingIntegrityRow['status']) {
  switch (status) {
    case 'clean': return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'problem': return 'bg-red-500/10 text-red-400 border-red-500/30';
  }
}

// ── Main component ──
export function BillingIntegrityAudit() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useBillingIntegrity();
  const { data: verificationMap, isLoading: verifLoading } = useAllClientVerifications();
  const { data: syncEntries = [], isLoading: syncLoading } = useSyncHealth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const selectedRow = selectedClientId ? rows.find(r => r.clientId === selectedClientId) : null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'clientName' ? 'asc' : 'desc');
    }
  };

  const filtered = rows
    .filter(r => {
      if (search && !r.clientName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'problems') return r.status === 'problem';
      if (filter === 'warnings') return r.status === 'warning';
      if (filter === 'clean') return r.status === 'clean';
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'status') {
        const order = { problem: 0, warning: 1, clean: 2 };
        return (order[a.status] - order[b.status]) * dir;
      }
      if (sortField === 'clientName') return a.clientName.localeCompare(b.clientName) * dir;
      return ((a[sortField] as number) - (b[sortField] as number)) * dir;
    });

  const problemCount = rows.filter(r => r.status === 'problem').length;
  const warningCount = rows.filter(r => r.status === 'warning').length;
  const cleanCount = rows.filter(r => r.status === 'clean').length;

  const SortHeader = ({ field, label, align = 'left' }: { field: SortField; label: string; align?: string }) => (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none',
        align === 'right' && 'text-right'
      )}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </span>
    </th>
  );

  if (isLoading) {
    return (
      <Card className="frosted-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="frosted-card overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-foreground">Billing Integrity Audit</h3>
              <span className="text-xs text-muted-foreground">{rows.length} clients</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search client..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 w-48 text-sm"
                />
              </div>
              <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
                {([
                  ['all', `All (${rows.length})`],
                  ['problems', `${problemCount}`],
                  ['warnings', `${warningCount}`],
                  ['clean', `${cleanCount}`],
                ] as [FilterMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={cn(
                      'px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                      filter === mode
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {mode === 'problems' && <CircleX className="w-3 h-3 text-red-400" />}
                    {mode === 'warnings' && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
                    {mode === 'clean' && <CircleCheck className="w-3 h-3 text-green-400" />}
                    {mode === 'all' && <Filter className="w-3 h-3" />}
                    {label}
                  </button>
                ))}
              </div>
              {/* Analyze All -- placeholder for Plan 03 */}
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled>
                <Brain className="w-3.5 h-3.5" />
                Analyze All
              </Button>
            </div>
          </div>
        </div>

        {/* Sync Health Bar */}
        <SyncHealthBar entries={syncEntries} isLoading={syncLoading} />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">Verified</th>
                <SortHeader field="clientName" label="Client" />
                <SortHeader field="mtdAdSpend" label="MTD Ad Spend" align="right" />
                <SortHeader field="totalDeposits" label="Total Deposits" align="right" />
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Stripe-Backed</th>
                <SortHeader field="unbackedTotal" label="Unbacked" align="right" />
                <SortHeader field="walletBalance" label="Balance" align="right" />
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Issues</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-center">Audit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {search ? 'No clients match your search' : 'No clients with wallets found'}
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <Row
                    key={row.clientId}
                    row={row}
                    isVerified={verificationMap?.has(row.clientId) ?? false}
                    verifiedAt={verificationMap?.get(row.clientId)?.verifiedAt ?? null}
                    verificationScope={verificationMap?.get(row.clientId)?.scope ?? null}
                    verifLoading={verifLoading}
                    onCheck={() => setSelectedClientId(row.clientId)}
                    onNavigate={() => navigate(`/hub/admin/clients/${row.clientId}?tab=billing`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="px-4 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {problemCount > 0 && <span className="text-red-400 font-medium">{problemCount} problem(s)</span>}
            {problemCount > 0 && warningCount > 0 && ' \u00b7 '}
            {warningCount > 0 && <span className="text-yellow-400 font-medium">{warningCount} warning(s)</span>}
            {(problemCount > 0 || warningCount > 0) && ' \u00b7 '}
            <span className="text-green-400">{cleanCount} clean</span>
          </span>
          <span>
            Total MTD Ad Spend: <strong className="text-foreground">{fmt(rows.reduce((s, r) => s + r.mtdAdSpend, 0))}</strong>
            {' \u00b7 '}
            Total Deposits: <strong className="text-foreground">{fmt(rows.reduce((s, r) => s + r.totalDeposits, 0))}</strong>
          </span>
        </div>
      </Card>

      {/* Sheet slide-over for verification panel */}
      <Sheet open={!!selectedClientId} onOpenChange={(open) => { if (!open) setSelectedClientId(null); }}>
        <SheetContent
          side="right"
          className="w-[700px] sm:max-w-[700px] lg:max-w-[900px] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{selectedRow?.clientName ?? 'Client'} Audit</SheetTitle>
            <SheetDescription>
              Billing integrity verification and reconciliation
            </SheetDescription>
          </SheetHeader>
          {selectedClientId && (
            <div className="mt-4">
              <VerificationPanel
                clientId={selectedClientId}
                clientName={selectedRow?.clientName ?? ''}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

// ── Table row ──
function Row({
  row,
  isVerified,
  verifiedAt,
  verificationScope,
  verifLoading,
  onCheck,
  onNavigate,
}: {
  row: BillingIntegrityRow;
  isVerified: boolean;
  verifiedAt: string | null;
  verificationScope: 'all_records' | 'new_only' | 'records_through_date' | null;
  verifLoading: boolean;
  onCheck: () => void;
  onNavigate: () => void;
}) {
  // Stale if verified more than 30 days ago
  const isStale = (() => {
    if (!verifiedAt) return false;
    try {
      const diff = Date.now() - new Date(verifiedAt).getTime();
      return diff > 30 * 24 * 60 * 60 * 1000;
    } catch { return false; }
  })();

  const isFullVerification = verificationScope === 'all_records';
  const isPartialVerification = verificationScope === 'new_only' || verificationScope === 'records_through_date';

  return (
    <tr
      className={cn(
        'border-b border-border/30 transition-colors',
        row.status === 'problem' && 'bg-red-500/5 hover:bg-red-500/10',
        row.status === 'warning' && 'bg-yellow-500/5 hover:bg-yellow-500/10',
        row.status === 'clean' && 'hover:bg-muted/50',
      )}
    >
      {/* Status */}
      <td className="px-4 py-3">
        <Badge variant="outline" className={cn('text-xs gap-1', statusBadgeClass(row.status))}>
          {statusIcon(row.status)}
          {statusLabel(row.status)}
        </Badge>
      </td>

      {/* Verified */}
      <td className="px-4 py-3 text-center">
        {verifLoading ? (
          <span className="text-muted-foreground">-</span>
        ) : isVerified ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex flex-col items-center">
                <CircleCheck className={cn('w-4 h-4', isFullVerification ? 'text-green-400' : 'text-yellow-400')} />
                {verifiedAt && (
                  <span className={cn('text-[10px]', isStale ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
                    {(() => { try { return format(new Date(verifiedAt), 'MMM d'); } catch { return ''; } })()}
                    {isStale && ' (stale)'}
                  </span>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isFullVerification ? 'Fully verified' : 'Partially verified'}
                {verifiedAt ? ` on ${(() => { try { return format(new Date(verifiedAt), 'MMM d, yyyy'); } catch { return verifiedAt; } })()}` : ''}
                {isPartialVerification && verificationScope === 'new_only' && ' (new records only)'}
                {isPartialVerification && verificationScope === 'records_through_date' && ' (records through date)'}
                {isStale && ' -- stale, re-verify recommended'}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* Client name */}
      <td className="px-4 py-3">
        <button onClick={onNavigate} className="font-medium text-foreground hover:text-primary transition-colors text-left">
          {row.clientName}
        </button>
      </td>

      {/* MTD Ad Spend */}
      <td className="px-4 py-3 text-right tabular-nums">{fmt(row.mtdAdSpend)}</td>

      {/* Total Deposits */}
      <td className="px-4 py-3 text-right tabular-nums">{fmt(row.totalDeposits)}</td>

      {/* Stripe-Backed */}
      <td className="px-4 py-3 text-right tabular-nums">
        <span className="text-green-400">{fmt(row.stripeBackedTotal)}</span>
        <span className="text-muted-foreground ml-1">({row.stripeBackedCount})</span>
      </td>

      {/* Unbacked */}
      <td className="px-4 py-3 text-right tabular-nums">
        {row.unbackedTotal > 0 ? (
          <>
            <span className="text-red-400 font-medium">{fmt(row.unbackedTotal)}</span>
            <span className="text-muted-foreground ml-1">({row.unbackedCount})</span>
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>

      {/* Balance */}
      <td className={cn('px-4 py-3 text-right tabular-nums font-medium', row.walletBalance < 0 ? 'text-red-400' : 'text-foreground')}>
        {row.walletBalance < 0 && '-'}{fmt(row.walletBalance)}
      </td>

      {/* Issues */}
      <td className="px-4 py-3 max-w-[200px]">
        {row.issues.length === 0 ? (
          <span className="text-muted-foreground text-xs">-</span>
        ) : row.issues.length === 1 ? (
          <span className="text-xs text-muted-foreground">{row.issues[0]}</span>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-default">
                {row.issues[0]}
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-muted/30 text-muted-foreground border-border/50">
                  +{row.issues.length - 1}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <ul className="space-y-1">
                {row.issues.map((issue, i) => (
                  <li key={i} className="text-xs">{issue}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </td>

      {/* Audit button */}
      <td className="px-4 py-3 text-center">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onCheck}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Check
        </Button>
      </td>
    </tr>
  );
}
