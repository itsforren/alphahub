import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronRight, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  RefreshCw,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UpcomingPayment } from '@/hooks/useBillingDashboard';

interface BillingTimelineTableProps {
  payments: UpcomingPayment[];
  isLoading?: boolean;
}

function getMonthKey(dateStr: string): string {
  if (!dateStr) return 'No Date';
  const date = parseISO(dateStr);
  if (!isValid(date)) return 'Invalid Date';
  return format(date, 'MMMM yyyy');
}

function StatusBadge({ color, daysUntilDue }: { color: 'green' | 'yellow' | 'red' | 'gray'; daysUntilDue: number }) {
  const variants = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-muted text-muted-foreground border-muted',
  };

  const getLabel = () => {
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `Due in ${daysUntilDue} days`;
  };

  return (
    <Badge variant="outline" className={cn('text-xs', variants[color])}>
      <Clock className="w-3 h-3 mr-1" />
      {getLabel()}
    </Badge>
  );
}

function BillingTypeBadge({ type }: { type: 'ad_spend' | 'management' }) {
  if (type === 'management') {
    return (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
        <DollarSign className="w-3 h-3 mr-1" />
        Mgmt Fee
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
      <TrendingUp className="w-3 h-3 mr-1" />
      Ad Spend
    </Badge>
  );
}

function RecurrenceBadge({ type }: { type: string | null }) {
  if (!type || type === 'one_time') return null;
  
  const label = type === 'bi_weekly' ? 'Bi-weekly' : type === 'monthly' ? 'Monthly' : type;
  
  return (
    <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted ml-2">
      <RefreshCw className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

export function BillingTimelineTable({ payments, isLoading }: BillingTimelineTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!payments.length) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Upcoming Payments
          </h3>
        </div>
        <div className="p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No upcoming payments</p>
        </div>
      </div>
    );
  }

  // Group payments by month
  const groupedPayments = payments.reduce((acc, payment) => {
    const monthKey = getMonthKey(payment.dueDate);
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(payment);
    return acc;
  }, {} as Record<string, UpcomingPayment[]>);

  const handleRowClick = (clientId: string) => {
    navigate(`/hub/admin/clients/${clientId}?tab=billing`);
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Upcoming Payments Timeline
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {payments.length} pending payment{payments.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Client</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead className="w-[150px]">Type</TableHead>
              <TableHead className="w-[100px] text-right">Amount</TableHead>
              <TableHead className="w-[180px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedPayments).map(([month, monthPayments]) => (
              <>
                {/* Month Divider */}
                <TableRow key={`divider-${month}`} className="hover:bg-transparent bg-muted/30">
                  <TableCell colSpan={6} className="py-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      ─── {month} ───
                    </span>
                  </TableCell>
                </TableRow>
                
                {/* Payment Rows */}
                {monthPayments.map((payment) => (
                  <TableRow 
                    key={payment.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(payment.clientId)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          payment.statusColor === 'green' && 'bg-green-500',
                          payment.statusColor === 'yellow' && 'bg-yellow-500',
                          payment.statusColor === 'red' && 'bg-red-500',
                          payment.statusColor === 'gray' && 'bg-muted-foreground',
                        )} />
                        <span className="font-medium text-foreground">{payment.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {payment.dueDate ? format(parseISO(payment.dueDate), 'MMM d') : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <BillingTypeBadge type={payment.billingType} />
                        <RecurrenceBadge type={payment.recurrenceType} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-foreground">
                        ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge color={payment.statusColor} daysUntilDue={payment.daysUntilDue} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
