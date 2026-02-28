import { useState, useMemo } from 'react';
import { ClientSpendData } from '@/hooks/useAccountWideMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientPerformanceTableProps {
  data: ClientSpendData[] | undefined;
  isLoading: boolean;
}

type SortField = 'clientName' | 'totalSpend' | 'totalLeads' | 'bookedCalls' | 'issuedPaid' | 'cpl' | 'cpba' | 'issuedPremium';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function ClientPerformanceTable({ data, isLoading }: ClientPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalSpend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  );

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Client Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Client Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            No client performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Client Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">
                  <SortableHeader field="clientName">Client</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="totalSpend">Spend</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="totalLeads">Leads</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="bookedCalls">Booked</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="issuedPaid">Issued</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="cpl">CPL</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="cpba">CPBA</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="issuedPremium">Issued Premium</SortableHeader>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((client) => (
                <TableRow key={client.clientId} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{client.clientName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(client.totalSpend)}</TableCell>
                  <TableCell className="text-right">{client.totalLeads}</TableCell>
                  <TableCell className="text-right">{client.bookedCalls}</TableCell>
                  <TableCell className="text-right">{client.issuedPaid}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      client.cpl > 0 && client.cpl < 50 && 'text-success',
                      client.cpl >= 50 && client.cpl < 100 && 'text-foreground',
                      client.cpl >= 100 && 'text-alert'
                    )}>
                      {client.cpl > 0 ? formatCurrency(client.cpl) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {client.cpba > 0 ? formatCurrency(client.cpba) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    {client.issuedPremium > 0 ? formatCurrency(client.issuedPremium) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
