import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSystemAlerts, SystemAlert } from '@/hooks/useSystemAlerts';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Bell, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export function SystemAlertsWidget() {
  const { data: alerts, isLoading, refetch } = useSystemAlerts(true);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const checkDiscrepancies = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-lead-discrepancy');
      
      if (error) throw error;
      
      toast.success(`Checked ${data.clientsChecked} clients, found ${data.discrepanciesFound} discrepancies`);
      refetch();
    } catch (error) {
      toast.error('Failed to check discrepancies');
    } finally {
      setIsChecking(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id,
        })
        .eq('id', alertId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast.success('Alert acknowledged');
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Warning</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">System Alerts</CardTitle>
              <CardDescription>
                {alerts?.length || 0} unacknowledged alerts
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkDiscrepancies}
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Check Now</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : alerts?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts?.map(alert => (
              <div 
                key={alert.id} 
                className="p-3 rounded-lg border border-border bg-muted/30 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                  {getSeverityBadge(alert.severity)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
