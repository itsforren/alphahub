import { useNavigate } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronRight,
  DollarSign,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverdueBillingRecord, UpcomingBillingRecord, PaidBillingRecord } from '@/hooks/useBillingDashboard';

interface BillingPaymentsTableProps {
  overdueRecords: OverdueBillingRecord[];
  upcomingRecords: UpcomingBillingRecord[];
  paidRecords: PaidBillingRecord[];
  isLoading?: boolean;
  selectedMonth: string;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, 'MMM d') : '—';
}

function BillingTypeBadge({ type }: { type: 'ad_spend' | 'management' }) {
  if (type === 'management') {
    return (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
        <DollarSign className="w-3 h-3 mr-1" />
        Mgmt Fee
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
      <TrendingUp className="w-3 h-3 mr-1" />
      Ad Spend
    </Badge>
  );
}

function RecurrenceBadge({ type }: { type: string | null }) {
  if (!type || type === 'one_time') return null;
  const label = type === 'bi_weekly' ? 'Bi-weekly' : type === 'monthly' ? 'Monthly' : type;
  return (
    <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted text-xs ml-1">
      <RefreshCw className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

// --- Overdue Table ---
function OverdueRows({ records }: { records: OverdueBillingRecord[] }) {
  const navigate = useNavigate();
  if (!records.length) {
    return (
      <div className="p-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No overdue payments</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead className="w-[110px]">Due Date</TableHead>
            <TableHead className="w-[160px]">Type</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[150px]">Overdue By</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-red-500/5 transition-colors border-l-2 border-l-red-500/40"
              onClick={() => navigate(`/hub/admin/clients/${r.clientId}?tab=billing`)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDate(r.dueDate)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                {fmt(r.amount)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {r.daysOverdue === 0 ? 'Today' : `${r.daysOverdue}d overdue`}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Upcoming Table ---
function UpcomingRows({ records }: { records: UpcomingBillingRecord[] }) {
  const navigate = useNavigate();
  if (!records.length) {
    return (
      <div className="p-12 text-center">
        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No upcoming payments in the next 30 days</p>
      </div>
    );
  }

  function getDueBadge(days: number) {
    if (days <= 2) return { cls: 'bg-red-500/10 border-red-500/30 text-red-400', label: days === 0 ? 'Due today' : `Due in ${days}d` };
    if (days <= 7) return { cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', label: `Due in ${days}d` };
    return { cls: 'bg-green-500/10 border-green-500/30 text-green-400', label: `Due in ${days}d` };
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead className="w-[110px]">Due Date</TableHead>
            <TableHead className="w-[160px]">Type</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => {
            const badge = getDueBadge(r.daysUntilDue);
            return (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/hub/admin/clients/${r.clientId}?tab=billing`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      r.daysUntilDue <= 2 ? 'bg-red-500' : r.daysUntilDue <= 7 ? 'bg-yellow-500' : 'bg-green-500',
                    )} />
                    <span className="font-medium text-foreground">{r.clientName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(r.dueDate)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <BillingTypeBadge type={r.billingType} />
                    <RecurrenceBadge type={r.recurrenceType} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">
                  {fmt(r.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', badge.cls)}>
                    <Clock className="w-3 h-3 mr-1" />
                    {badge.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Paid Table ---
function PaidRows({ records, selectedMonth }: { records: PaidBillingRecord[]; selectedMonth: string }) {
  const navigate = useNavigate();
  if (!records.length) {
    return (
      <div className="p-12 text-center">
        <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No payments collected in {selectedMonth}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead className="w-[110px]">Paid</TableHead>
            <TableHead className="w-[160px]">Type</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[150px]" />
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/hub/admin/clients/${r.clientId}?tab=billing`)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDate(r.paidAt)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-green-400">
                {fmt(r.amount)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Paid
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- All Table ---
function AllRows({
  overdue,
  upcoming,
  paid,
  selectedMonth,
}: {
  overdue: OverdueBillingRecord[];
  upcoming: UpcomingBillingRecord[];
  paid: PaidBillingRecord[];
  selectedMonth: string;
}) {
  const navigate = useNavigate();
  const totalCount = overdue.length + upcoming.length + paid.length;

  if (!totalCount) {
    return (
      <div className="p-12 text-center">
        <List className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No billing records for {selectedMonth}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead className="w-[110px]">Date</TableHead>
            <TableHead className="w-[160px]">Type</TableHead>
            <TableHead className="w-[100px] text-right">Amount</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Overdue first */}
          {overdue.length > 0 && (
            <TableRow className="hover:bg-transparent bg-red-500/5">
              <TableCell colSpan={6} className="py-1.5">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Overdue ({overdue.length})
                </span>
              </TableCell>
            </TableRow>
          )}
          {overdue.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-red-500/5 transition-colors border-l-2 border-l-red-500/40"
              onClick={() => navigate(`/hub/admin/clients/${r.clientId}?tab=billing`)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDate(r.dueDate)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{fmt(r.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {r.daysOverdue === 0 ? 'Today' : `${r.daysOverdue}d overdue`}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableCell colSpan={6} className="py-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Upcoming ({upcoming.length})
                </span>
              </TableCell>
            </TableRow>
          )}
          {upcoming.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/hub/admin/clients/${r.clientId}?tab=billing`)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    r.daysUntilDue <= 2 ? 'bg-red-500' : r.daysUntilDue <= 7 ? 'bg-yellow-500' : 'bg-green-500',
                  )} />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDate(r.dueDate)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">{fmt(r.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  In {r.daysUntilDue}d
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}

          {/* Paid */}
          {paid.length > 0 && (
            <TableRow className="hover:bg-transparent bg-green-500/5">
              <TableCell colSpan={6} className="py-1.5">
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                  Paid ({paid.length})
                </span>
              </TableCell>
            </TableRow>
          )}
          {paid.map(r => (
            <TableRow
              key={r.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/hub/admin/clients/${r.clientId}?tab=billing`)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="font-medium text-foreground">{r.clientName}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmtDate(r.paidAt)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <BillingTypeBadge type={r.billingType} />
                  <RecurrenceBadge type={r.recurrenceType} />
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-green-400">{fmt(r.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Paid
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function BillingPaymentsTable({
  overdueRecords,
  upcomingRecords,
  paidRecords,
  isLoading,
  selectedMonth,
}: BillingPaymentsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-8 w-96" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const overdueTotal = overdueRecords.reduce((s, r) => s + r.amount, 0);
  const upcomingTotal = upcomingRecords.reduce((s, r) => s + r.amount, 0);
  const paidTotal = paidRecords.reduce((s, r) => s + r.amount, 0);
  const allCount = overdueRecords.length + upcomingRecords.length + paidRecords.length;

  function TabLabel({
    icon,
    label,
    count,
    total,
    colorClass,
  }: {
    icon: React.ReactNode;
    label: string;
    count: number;
    total: number;
    colorClass?: string;
  }) {
    return (
      <span className="flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
        {count > 0 && (
          <>
            <span className={cn('font-semibold', colorClass)}>({count})</span>
            <span className="text-muted-foreground hidden sm:inline">· {fmt(total)}</span>
          </>
        )}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50">
      <Tabs defaultValue="overdue">
        <div className="px-4 pt-4 border-b border-border/50">
          <TabsList className="bg-transparent border border-border/50 h-auto p-0 gap-0 w-full sm:w-auto">
            <TabsTrigger
              value="overdue"
              className="rounded-none first:rounded-l-md last:rounded-r-md border-r border-border/50 px-4 py-2 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400"
            >
              <TabLabel
                icon={<AlertCircle className="w-3.5 h-3.5" />}
                label="Overdue"
                count={overdueRecords.length}
                total={overdueTotal}
                colorClass="text-red-400"
              />
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="rounded-none border-r border-border/50 px-4 py-2 data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-400"
            >
              <TabLabel
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Upcoming"
                count={upcomingRecords.length}
                total={upcomingTotal}
                colorClass="text-yellow-400"
              />
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="rounded-none border-r border-border/50 px-4 py-2 data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400"
            >
              <TabLabel
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                label="Paid"
                count={paidRecords.length}
                total={paidTotal}
                colorClass="text-green-400"
              />
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="rounded-none last:rounded-r-md px-4 py-2"
            >
              <TabLabel
                icon={<List className="w-3.5 h-3.5" />}
                label="All"
                count={allCount}
                total={overdueTotal + upcomingTotal + paidTotal}
              />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overdue" className="m-0">
          <OverdueRows records={overdueRecords} />
        </TabsContent>
        <TabsContent value="upcoming" className="m-0">
          <UpcomingRows records={upcomingRecords} />
        </TabsContent>
        <TabsContent value="paid" className="m-0">
          <PaidRows records={paidRecords} selectedMonth={selectedMonth} />
        </TabsContent>
        <TabsContent value="all" className="m-0">
          <AllRows overdue={overdueRecords} upcoming={upcomingRecords} paid={paidRecords} selectedMonth={selectedMonth} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
