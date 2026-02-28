import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, ArrowUp, ArrowDown, Shield, Minus, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  created_at: string;
  campaign_id: string | null;
  client_id: string | null;
  action: string;
  actor: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason_codes: string[] | null;
  notes: string | null;
  proposal_id: string | null;
  clients?: { name: string } | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function useCampaignChangeLog(filters: {
  startDate: string;
  endDate: string;
  clientId?: string;
  actor?: string;
  actionType?: string;
}) {
  return useQuery({
    queryKey: ['campaign-change-log', filters],
    queryFn: async () => {
      // Use a left join style query - select from audit log and optionally get client name
      let query = supabase
        .from('campaign_audit_log')
        .select(`
          *,
          clients:client_id(name)
        `)
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters.actor && filters.actor !== 'all') {
        query = query.eq('actor', filters.actor);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Campaign change log query error:', error);
        throw error;
      }
      return (data || []) as AuditLogEntry[];
    },
  });
}

function useClients() {
  return useQuery({
    queryKey: ['clients-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

function getActionIcon(action: string) {
  if (action.includes('INCREASE') || action.includes('increase')) {
    return <ArrowUp className="h-4 w-4 text-green-600" />;
  }
  if (action.includes('DECREASE') || action.includes('decrease')) {
    return <ArrowDown className="h-4 w-4 text-red-600" />;
  }
  if (action.includes('SAFE') || action.includes('safe_mode')) {
    return <Shield className="h-4 w-4 text-orange-600" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getActorBadge(actor: string) {
  const variants: Record<string, { className: string; label: string }> = {
    AUTO: { className: 'bg-blue-100 text-blue-700 border-blue-300', label: 'AUTO' },
    USER: { className: 'bg-green-100 text-green-700 border-green-300', label: 'USER' },
    SAFE: { className: 'bg-orange-100 text-orange-700 border-orange-300', label: 'SAFE' },
    system: { className: 'bg-purple-100 text-purple-700 border-purple-300', label: 'SYSTEM' },
    morning_review: { className: 'bg-blue-100 text-blue-700 border-blue-300', label: 'AI' },
  };

  const variant = variants[actor] || { className: 'bg-gray-100 text-gray-700 border-gray-300', label: actor };
  return (
    <Badge variant="outline" className={`text-xs ${variant.className}`}>
      {variant.label}
    </Badge>
  );
}

export default function CampaignChanges() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedActor, setSelectedActor] = useState<string>('all');

  const { data: logs, isLoading, refetch } = useCampaignChangeLog({
    startDate: `${startDate}T00:00:00`,
    endDate: `${endDate}T23:59:59`,
    clientId: selectedClient === 'all' ? undefined : selectedClient,
    actor: selectedActor,
  });

  const { data: clients } = useClients();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaign Change Log</h1>
          <p className="text-muted-foreground">Budget changes, approvals, and denials</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Actor</label>
              <Select value={selectedActor} onValueChange={setSelectedActor}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="AUTO">Auto</SelectItem>
                  <SelectItem value="SAFE">Safe Mode</SelectItem>
                  <SelectItem value="morning_review">AI Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Changes {logs && `(${logs.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp (ET)</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Old → New</TableHead>
                  <TableHead>Reason Codes</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !logs?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No changes found in this date range.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const oldBudget = (log.old_value as any)?.budget || (log.old_value as any)?.daily_budget;
                    const newBudget = (log.new_value as any)?.budget || (log.new_value as any)?.daily_budget;

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(log.created_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>
                          {log.client_id ? (
                            <Button 
                              variant="link" 
                              className="p-0 h-auto font-medium text-foreground hover:text-primary"
                              onClick={() => navigate(`/hub/admin/clients/${log.client_id}`)}
                            >
                              {log.clients?.name || 'Unknown'}
                            </Button>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {log.campaign_id ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1 text-xs text-muted-foreground"
                                    onClick={() => copyToClipboard(log.campaign_id!)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    {log.campaign_id.slice(-8)}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy: {log.campaign_id}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {getActorBadge(log.actor)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getActionIcon(log.action)}
                            <span className="text-sm">{log.action}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {oldBudget !== undefined && newBudget !== undefined ? (
                            <span className="text-sm">
                              {formatCurrency(oldBudget)} → {formatCurrency(newBudget)}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {log.reason_codes?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {log.reason_codes.slice(0, 2).map((code) => (
                                <Badge key={code} variant="outline" className="text-xs">
                                  {code}
                                </Badge>
                              ))}
                              {log.reason_codes.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{log.reason_codes.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {log.notes ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm text-muted-foreground truncate block">
                                    {log.notes}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                  {log.notes}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
