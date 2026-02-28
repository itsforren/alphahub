import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours, differenceInMinutes, subDays, format } from 'date-fns';

export interface AlertItem {
  id: string;
  clientName: string;
  errorType: string;
  duration: string;
  owner: string | null;
  severity: 'critical' | 'warning';
  createdAt: string;
}

export interface RedAlertMetrics {
  alerts: AlertItem[];
  criticalCount: number;
  warningCount: number;
  oldestUnresolvedHours: number;
}

export function useRedAlertData() {
  return useQuery({
    queryKey: ['tv-red-alert-data'],
    queryFn: async (): Promise<RedAlertMetrics> => {
      const now = new Date();
      const twoDaysAgo = format(subDays(now, 2), 'yyyy-MM-dd');
      
      // Fetch system alerts
      const { data: systemAlerts } = await supabase
        .from('system_alerts')
        .select('*')
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Fetch clients for name mapping
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');
      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);
      
      // Fetch campaigns with potential issues
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, client_id, status, leads_yesterday, safe_mode, reason_codes, clients!inner(name)')
        .eq('ignored', false);
      
      const alerts: AlertItem[] = [];
      
      // Add system alerts
      (systemAlerts || []).forEach(alert => {
        const hours = differenceInHours(now, new Date(alert.created_at));
        const minutes = differenceInMinutes(now, new Date(alert.created_at)) % 60;
        alerts.push({
          id: alert.id,
          clientName: 'System',
          errorType: formatAlertType(alert.alert_type),
          duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
          owner: null,
          severity: alert.severity === 'critical' ? 'critical' : 'warning',
          createdAt: alert.created_at,
        });
      });
      
      // Add campaign-based alerts
      (campaigns || []).forEach(campaign => {
        const clientName = (campaign.clients as { name: string }).name;
        
        // Zero leads for 48+ hours
        if (campaign.leads_yesterday === 0) {
          alerts.push({
            id: `zero-leads-${campaign.id}`,
            clientName,
            errorType: 'Zero Leads 48h',
            duration: '48h+',
            owner: null,
            severity: 'critical',
            createdAt: new Date().toISOString(),
          });
        }
        
        // Safe mode triggered
        if (campaign.safe_mode) {
          alerts.push({
            id: `safe-mode-${campaign.id}`,
            clientName,
            errorType: 'Safe Mode Active',
            duration: '—',
            owner: null,
            severity: 'warning',
            createdAt: new Date().toISOString(),
          });
        }
        
        // Campaign disabled/paused
        if (campaign.status === 'PAUSED' || campaign.status === 'REMOVED') {
          alerts.push({
            id: `disabled-${campaign.id}`,
            clientName,
            errorType: 'Ad Account Paused',
            duration: '—',
            owner: null,
            severity: 'critical',
            createdAt: new Date().toISOString(),
          });
        }
      });
      
      // Sort: critical first, then by creation time
      alerts.sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      const criticalCount = alerts.filter(a => a.severity === 'critical').length;
      const warningCount = alerts.filter(a => a.severity === 'warning').length;
      const oldestAlert = alerts[alerts.length - 1];
      const oldestUnresolvedHours = oldestAlert ? differenceInHours(now, new Date(oldestAlert.createdAt)) : 0;
      
      return {
        alerts,
        criticalCount,
        warningCount,
        oldestUnresolvedHours,
      };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

function formatAlertType(type: string | null): string {
  if (!type) return 'Unknown Issue';
  
  const typeMap: Record<string, string> = {
    'low_balance': 'Low Wallet Balance',
    'lead_router_down': 'Lead Router Down',
    'pixel_not_firing': 'Pixel Not Firing',
    'ad_account_disconnected': 'Ad Account Disconnected',
    'zero_leads': 'Zero Leads 48h',
    'budget_exhausted': 'Budget Exhausted',
    'conversion_drop': 'Conversion Drop',
  };
  
  return typeMap[type] || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
