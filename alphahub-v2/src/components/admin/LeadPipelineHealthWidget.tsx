import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Zap,
  User,
  Clock,
  X
} from "lucide-react";
import { toast } from "sonner";

interface PipelineMetrics {
  webhook_received: number;
  stored: number;
  delivered: number;
  failed: number;
  skipped: number;
}

interface DailyMetric {
  metric_date: string;
  stage: string;
  count: number;
  agent_id: string | null;
}

interface RecentDelivery {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  agent_id: string;
  client_name?: string;
  delivery_status: string;
  delivered_at: string | null;
  created_at: string;
  ghl_contact_id: string | null;
}

export function LeadPipelineHealthWidget() {
  const queryClient = useQueryClient();
  const [liveIndicator, setLiveIndicator] = useState(false);

  // Fetch metrics since Dec 15th
  const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pipeline-metrics'],
    queryFn: async () => {
      const startDate = '2025-12-15';
      
      const { data, error } = await supabase
        .from('lead_pipeline_metrics')
        .select('metric_date, stage, count, agent_id')
        .gte('metric_date', startDate)
        .order('metric_date', { ascending: false });

      if (error) throw error;
      return data as DailyMetric[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch today's delivered leads with client info for live feed
  const { data: todayDeliveries } = useQuery({
    queryKey: ['today-deliveries'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, agent_id, delivery_status, delivered_at, created_at, ghl_contact_id')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get client names for agent IDs
      if (leads && leads.length > 0) {
        const agentIds = [...new Set(leads.map(l => l.agent_id).filter(Boolean))];
        const { data: clients } = await supabase
          .from('clients')
          .select('agent_id, name')
          .in('agent_id', agentIds);

        const clientMap = new Map(clients?.map(c => [c.agent_id, c.name]) || []);
        
        return leads.map(lead => ({
          ...lead,
          client_name: lead.agent_id ? clientMap.get(lead.agent_id) || 'Unknown' : 'Unknown'
        })) as RecentDelivery[];
      }
      
      return leads as RecentDelivery[];
    },
    refetchInterval: 10000 // Refresh every 10 seconds for near-realtime
  });

  // Fetch recent failed leads
  const { data: failedLeads } = useQuery({
    queryKey: ['recent-failed-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, agent_id, delivery_error, created_at, delivery_status')
        .in('delivery_status', ['failed', 'failed_permanent', 'pending'])
        .gte('created_at', subDays(new Date(), 7).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  // Fetch system alerts
  const { data: systemAlerts } = useQuery({
    queryKey: ['pipeline-system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('id, alert_type, title, message, severity, created_at, acknowledged_at')
        .in('alert_type', ['lead_stuck', 'delivery_failures', 'router_misconfigured'])
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  // Realtime subscription for leads table
  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('[LeadPipelineHealth] Realtime update:', payload);
          // Flash the live indicator
          setLiveIndicator(true);
          setTimeout(() => setLiveIndicator(false), 1000);
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['today-deliveries'] });
          queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['recent-failed-leads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Also subscribe to pipeline metrics updates
  useEffect(() => {
    const channel = supabase
      .channel('metrics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_pipeline_metrics'
        },
        () => {
          setLiveIndicator(true);
          setTimeout(() => setLiveIndicator(false), 1000);
          queryClient.invalidateQueries({ queryKey: ['pipeline-metrics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate totals
  const totals: PipelineMetrics = {
    webhook_received: 0,
    stored: 0,
    delivered: 0,
    failed: 0,
    skipped: 0
  };

  // Calculate today's metrics
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayMetrics: PipelineMetrics = {
    webhook_received: 0,
    stored: 0,
    delivered: 0,
    failed: 0,
    skipped: 0
  };

  metrics?.forEach(m => {
    if (m.stage in totals) {
      totals[m.stage as keyof PipelineMetrics] += m.count;
      
      if (m.metric_date === today) {
        todayMetrics[m.stage as keyof PipelineMetrics] += m.count;
      }
    }
  });

  // Calculate success rate
  const totalProcessed = totals.delivered + totals.failed;
  const successRate = totalProcessed > 0 
    ? ((totals.delivered / totalProcessed) * 100).toFixed(1) 
    : '100';

  // Determine health status
  const getHealthStatus = () => {
    const rate = parseFloat(successRate);
    const hasPendingIssues = (failedLeads?.filter(l => l.delivery_status === 'pending')?.length || 0) > 0;
    const hasActiveAlerts = (systemAlerts?.length || 0) > 0;
    
    if (hasActiveAlerts) return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Issues Detected' };
    if (hasPendingIssues) return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pending' };
    if (rate >= 98) return { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Excellent' };
    if (rate >= 95) return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Good' };
    if (rate >= 90) return { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Fair' };
    return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' };
  };

  const healthStatus = getHealthStatus();

  // Filter today's successful deliveries for the live feed
  const successfulDeliveries = todayDeliveries?.filter(d => d.delivery_status === 'delivered') || [];
  const pendingDeliveries = todayDeliveries?.filter(d => d.delivery_status === 'pending') || [];
  const failedTodayDeliveries = todayDeliveries?.filter(d => ['failed', 'failed_permanent'].includes(d.delivery_status)) || [];

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-500/10 text-green-500 border-0"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
      case 'failed_permanent':
        return <Badge className="bg-red-500/10 text-red-500 border-0"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Lead Pipeline Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading metrics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative">
      {/* Live indicator */}
      {liveIndicator && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Lead Pipeline Health
            <Badge className={`${healthStatus.bg} ${healthStatus.color} border-0 ml-2`}>
              {healthStatus.label}
            </Badge>
            <div className="flex items-center gap-1 ml-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Since December 15, 2025 • Updates in realtime</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Live Pipeline Status */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Today's Pipeline</span>
            <span className="text-xs text-muted-foreground">({format(new Date(), 'MMM d, yyyy')})</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-center">
            <div className="flex-1 p-2 rounded bg-background/50">
              <div className="text-xl font-bold">{todayMetrics.webhook_received}</div>
              <div className="text-xs text-muted-foreground">Received</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 p-2 rounded bg-background/50">
              <div className="text-xl font-bold">{todayMetrics.stored}</div>
              <div className="text-xs text-muted-foreground">Stored</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 p-2 rounded bg-green-500/10">
              <div className="text-xl font-bold text-green-500">{todayMetrics.delivered}</div>
              <div className="text-xs text-green-600">Delivered</div>
            </div>
            {(todayMetrics.failed > 0 || pendingDeliveries.length > 0) && (
              <>
                <div className="flex-1 p-2 rounded bg-yellow-500/10">
                  <div className="text-xl font-bold text-yellow-500">{pendingDeliveries.length}</div>
                  <div className="text-xs text-yellow-600">Pending</div>
                </div>
                {todayMetrics.failed > 0 && (
                  <div className="flex-1 p-2 rounded bg-red-500/10">
                    <div className="text-xl font-bold text-red-500">{todayMetrics.failed}</div>
                    <div className="text-xs text-red-600">Failed</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Live Feed of Today's Deliveries */}
        {successfulDeliveries.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <CheckCircle className="h-4 w-4" />
              Recent Successful Deliveries
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {successfulDeliveries.slice(0, 5).map(lead => (
                <div 
                  key={lead.id} 
                  className="flex items-center justify-between p-2 rounded bg-green-500/5 border border-green-500/20 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{lead.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.ghl_contact_id && (
                      <Badge variant="outline" className="text-xs">GHL ✓</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.delivered_at || lead.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All-time Pipeline Flow */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">All-Time Totals</p>
          <div className="flex items-center justify-between gap-2 text-center">
            <div className="flex-1">
              <div className="text-lg font-bold">{totals.webhook_received}</div>
              <div className="text-xs text-muted-foreground">Received</div>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="text-lg font-bold">{totals.stored}</div>
              <div className="text-xs text-muted-foreground">Stored</div>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="text-lg font-bold text-green-500">{totals.delivered}</div>
              <div className="text-xs text-muted-foreground">Delivered</div>
            </div>
            {totals.skipped > 0 && (
              <div className="flex-1">
                <div className="text-lg font-bold text-muted-foreground">{totals.skipped}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
            )}
            <div className="flex-1">
              <div className="text-lg font-bold text-red-500">{totals.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Success Rate</span>
          </div>
          <span className={`text-lg font-bold ${healthStatus.color}`}>
            {successRate}%
          </span>
        </div>

        {/* System Alerts */}
        {systemAlerts && systemAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-red-500">
              <AlertTriangle className="h-4 w-4" />
              Active Alerts ({systemAlerts.length})
            </div>
            <div className="space-y-1">
              {systemAlerts.slice(0, 3).map(alert => (
                <div 
                  key={alert.id} 
                  className="flex items-center justify-between p-2 rounded bg-red-500/5 border border-red-500/20 text-sm"
                >
                  <div className="flex-1">
                    <span className="font-medium">{alert.alert_type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{alert.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-500/20"
                      onClick={async () => {
                        try {
                          await supabase
                            .from('system_alerts')
                            .update({ acknowledged_at: new Date().toISOString() })
                            .eq('id', alert.id);
                          queryClient.invalidateQueries({ queryKey: ['pipeline-system-alerts'] });
                          toast.success('Alert dismissed');
                        } catch (error) {
                          toast.error('Failed to dismiss alert');
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending/Failed Leads */}
        {failedLeads && failedLeads.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-600">
              <Clock className="h-4 w-4" />
              Needs Attention ({failedLeads.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {failedLeads.slice(0, 5).map(lead => (
                <div 
                  key={lead.id} 
                  className="flex items-center justify-between p-2 rounded bg-yellow-500/5 border border-yellow-500/20 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                    {getDeliveryStatusBadge(lead.delivery_status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {lead.delivery_error || 'Awaiting delivery'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-yellow-500/20"
                      onClick={async () => {
                        try {
                          await supabase
                            .from('leads')
                            .update({ delivery_status: 'skipped' })
                            .eq('id', lead.id);
                          queryClient.invalidateQueries({ queryKey: ['recent-failed-leads'] });
                          toast.success('Lead dismissed');
                        } catch (error) {
                          toast.error('Failed to dismiss lead');
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
