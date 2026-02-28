import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLeadStats, useLeadsWithFilters, useAgentPerformance, useLeadDeliveryLogs, useUniqueLeadSources, LeadWithDetails } from "@/hooks/useLeadStats";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Phone, 
  FileText, 
  Award,
  RefreshCw,
  ChevronDown,
  ExternalLink
} from "lucide-react";
import { RouterValidationWidget } from "@/components/admin/RouterValidationWidget";
import { SystemAlertsWidget } from "@/components/admin/SystemAlertsWidget";
import { LeadPipelineHealthWidget } from "@/components/admin/LeadPipelineHealthWidget";

const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'booked call', label: 'Booked Call' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'no_show', label: 'No Show' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'issued paid', label: 'Issued Paid' },
  { value: 'dead', label: 'Dead' },
];

const DELIVERY_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'failed_permanent', label: 'Failed Permanent' },
];

export default function LeadStats() {
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  
  // Selected lead for detail view
  const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);

  const filters = {
    startDate: startDate + 'T00:00:00',
    endDate: endDate + 'T23:59:59',
    agentId: selectedAgent !== 'all' ? selectedAgent : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    deliveryStatus: selectedDeliveryStatus !== 'all' ? selectedDeliveryStatus : undefined,
    source: selectedSource !== 'all' ? selectedSource : undefined,
  };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useLeadStats(filters);
  const { data: leads, isLoading: leadsLoading, refetch: refetchLeads } = useLeadsWithFilters(filters);
  const { data: agentPerformance, isLoading: perfLoading, refetch: refetchPerf } = useAgentPerformance({ startDate: filters.startDate, endDate: filters.endDate });
  const { data: clients } = useClients();
  const { data: sources } = useUniqueLeadSources();
  const { data: deliveryLogs } = useLeadDeliveryLogs(selectedLead?.id);

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-failed-lead-delivery');
      
      if (error) throw error;
      
      toast({
        title: "Retry Complete",
        description: `Processed: ${data.results?.success || 0} success, ${data.results?.failed || 0} failed`,
      });

      refetchStats();
      refetchLeads();
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const getDeliveryStatusBadge = (status: string | null) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Delivered</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'retrying':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Retrying</Badge>;
      case 'failed_permanent':
        return <Badge className="bg-red-700/20 text-red-300 border-red-700/30">Permanent Fail</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getLeadStatusBadge = (status: string | null) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-500/20 text-blue-400">New</Badge>;
      case 'booked call':
      case 'booked_call':
        return <Badge className="bg-purple-500/20 text-purple-400">Booked</Badge>;
      case 'submitted':
        return <Badge className="bg-orange-500/20 text-orange-400">Submitted</Badge>;
      case 'approved':
        return <Badge className="bg-teal-500/20 text-teal-400">Approved</Badge>;
      case 'issued paid':
        return <Badge className="bg-green-500/20 text-green-400">Issued Paid</Badge>;
      case 'dead':
        return <Badge className="bg-gray-500/20 text-gray-400">Dead</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Stats</h1>
          <p className="text-muted-foreground">Central lead routing and performance dashboard</p>
        </div>
        <Button 
          onClick={handleRetryFailed} 
          disabled={isRetrying}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
          Retry Failed Deliveries
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Agent</label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {clients?.map(client => (
                    <SelectItem key={client.agent_id} value={client.agent_id || ''}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Lead Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {LEAD_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Delivery Status</label>
              <Select value={selectedDeliveryStatus} onValueChange={setSelectedDeliveryStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {DELIVERY_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Source</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources?.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{stats?.totalLeads || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{stats?.deliveredLeads || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{stats?.failedLeads || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats?.pendingLeads || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats?.deliverySuccessRate?.toFixed(1) || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Booked Calls</p>
                <p className="text-2xl font-bold">{stats?.bookedCalls || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-2xl font-bold">{stats?.applications || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Issued Paid</p>
                <p className="text-2xl font-bold">{stats?.issuedPaid || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Issued Premium</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalIssuedPremium || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Health & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadPipelineHealthWidget />
        <SystemAlertsWidget />
      </div>
      
      <RouterValidationWidget />

      {/* Tabs for different views */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">All Leads</TabsTrigger>
          <TabsTrigger value="performance">Agent Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Leads</CardTitle>
              <CardDescription>
                {leads?.length || 0} leads found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Lead Status</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : leads?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No leads found
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads?.map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell className="text-sm">
                            {lead.created_at ? format(new Date(lead.created_at), 'MMM d, h:mm a') : '-'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                              <p className="text-xs text-muted-foreground">{lead.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{lead.client_name}</TableCell>
                          <TableCell>
                            <span className="text-sm">{lead.lead_source || '-'}</span>
                          </TableCell>
                          <TableCell>{getLeadStatusBadge(lead.status)}</TableCell>
                          <TableCell>{getDeliveryStatusBadge(lead.delivery_status)}</TableCell>
                          <TableCell>
                            {lead.delivery_error ? (
                              <span 
                                className="text-xs text-red-400 truncate block max-w-[150px]" 
                                title={lead.delivery_error}
                              >
                                {lead.delivery_error.length > 30 
                                  ? lead.delivery_error.substring(0, 30) + '...' 
                                  : lead.delivery_error}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {lead.target_premium ? formatCurrency(Number(lead.target_premium)) : '-'}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedLead(lead)}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Lead Details</DialogTitle>
                                </DialogHeader>
                                <LeadDetailView lead={lead} />
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Performance metrics by agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Delivery %</TableHead>
                      <TableHead className="text-right">Booked</TableHead>
                      <TableHead className="text-right">Apps</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right">Target $</TableHead>
                      <TableHead className="text-right">Issued $</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perfLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : agentPerformance?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      agentPerformance?.map(agent => (
                        <TableRow key={agent.agent_id}>
                          <TableCell className="font-medium">{agent.client_name}</TableCell>
                          <TableCell className="text-right">{agent.total_leads}</TableCell>
                          <TableCell className="text-right">{agent.delivery_success_rate.toFixed(0)}%</TableCell>
                          <TableCell className="text-right">{agent.booked_calls}</TableCell>
                          <TableCell className="text-right">{agent.applications}</TableCell>
                          <TableCell className="text-right">{agent.issued_paid}</TableCell>
                          <TableCell className="text-right">{formatCurrency(agent.total_target_premium)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(agent.total_issued_premium)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeadDetailView({ lead }: { lead: LeadWithDetails }) {
  const { data: deliveryLogs, isLoading } = useLeadDeliveryLogs(lead.id);

  return (
    <div className="space-y-6">
      {/* Lead Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-medium">{lead.first_name} {lead.last_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{lead.email || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-medium">{lead.phone || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">State</p>
          <p className="font-medium">{lead.state || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Agent</p>
          <p className="font-medium">{lead.client_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Source</p>
          <p className="font-medium">{lead.lead_source || '-'}</p>
        </div>
      </div>

      {/* Attribution */}
      {(lead.utm_source || lead.utm_campaign || lead.gclid) && (
        <div>
          <h4 className="text-sm font-medium mb-2">Attribution</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {lead.utm_source && <div><span className="text-muted-foreground">Source:</span> {lead.utm_source}</div>}
            {lead.utm_medium && <div><span className="text-muted-foreground">Medium:</span> {lead.utm_medium}</div>}
            {lead.utm_campaign && <div><span className="text-muted-foreground">Campaign:</span> {lead.utm_campaign}</div>}
            {lead.gclid && <div><span className="text-muted-foreground">GCLID:</span> {lead.gclid.substring(0, 20)}...</div>}
          </div>
        </div>
      )}

      {/* GHL Info */}
      {lead.ghl_contact_id && (
        <div>
          <p className="text-sm text-muted-foreground">GHL Contact ID</p>
          <p className="font-mono text-sm">{lead.ghl_contact_id}</p>
        </div>
      )}

      {/* Delivery Error */}
      {lead.delivery_error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{lead.delivery_error}</p>
        </div>
      )}

      {/* Delivery Logs */}
      <div>
        <h4 className="text-sm font-medium mb-2">Delivery History</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : deliveryLogs?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No delivery attempts logged</p>
        ) : (
          <div className="space-y-2">
            {deliveryLogs?.map(log => (
              <div 
                key={log.id} 
                className={`p-3 rounded-lg text-sm ${
                  log.status === 'success' 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Attempt #{log.attempt_number} - {log.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, h:mm:ss a')}
                  </span>
                </div>
                {log.error_message && (
                  <p className="text-red-400 mt-1">{log.error_message}</p>
                )}
                {log.ghl_contact_id && (
                  <p className="text-muted-foreground mt-1">Contact: {log.ghl_contact_id}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
