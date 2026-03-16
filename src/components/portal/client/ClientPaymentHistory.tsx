import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useBillingRecords, BillingRecord } from '@/hooks/useBillingRecords';
import { useClientVerifications } from '@/hooks/useBillingVerification';
import { BillingStatusBadge } from '@/components/portal/BillingStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientPaymentHistoryProps {
  clientId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

/**
 * Truncates a Stripe PI or invoice ID for display.
 * "pi_3QaBcDeFgHiJ" -> "pi_3QaB...HiJ"
 */
function truncateReference(ref: string): string {
  if (ref.length <= 14) return ref;
  return `${ref.slice(0, 7)}...${ref.slice(-4)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return '--';
  }
}

export function ClientPaymentHistory({ clientId }: ClientPaymentHistoryProps) {
  const { data: records, isLoading: recordsLoading } = useBillingRecords(clientId);
  const { data: verifications, isLoading: verificationsLoading } = useClientVerifications(clientId);

  const isLoading = recordsLoading || verificationsLoading;

  // Build set of verified billing_record_ids for v1_manual filtering
  const visibleRecords = useMemo(() => {
    if (!records) return [];

    // Build verified set from billing_verifications
    const verifiedIds = new Set<string>();
    if (verifications) {
      for (const v of verifications) {
        if (v.status === 'verified' && v.billing_record_id) {
          verifiedIds.add(v.billing_record_id);
        }
      }
    }

    // Filter: stripe + auto_recharge always visible; v1_manual only if verified; exclude rest
    const filtered = records.filter((r: BillingRecord) => {
      if (r.source === 'stripe' || r.source === 'auto_recharge') return true;
      if (r.source === 'v1_manual' && verifiedIds.has(r.id)) return true;
      return false;
    });

    // Sort by paid_at || created_at descending (newest first)
    return filtered.sort((a: BillingRecord, b: BillingRecord) => {
      const dateA = a.paid_at || a.created_at;
      const dateB = b.paid_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [records, verifications]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Payment History</h3>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  // Empty state
  if (visibleRecords.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Payment History</h3>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No transactions yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Payment History</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Period</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRecords.map((record: BillingRecord) => {
            const dateStr = record.paid_at || record.created_at;
            const ref = record.stripe_payment_intent_id || record.stripe_invoice_id;
            const periodStart = record.billing_period_start;
            const periodEnd = record.billing_period_end;

            return (
              <TableRow key={record.id}>
                <TableCell>{formatDate(dateStr)}</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(record.amount)}
                </TableCell>
                <TableCell>
                  <BillingStatusBadge status={record.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {ref ? truncateReference(ref) : '--'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {periodStart && periodEnd
                    ? `${formatDate(periodStart)} - ${formatDate(periodEnd)}`
                    : '--'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
