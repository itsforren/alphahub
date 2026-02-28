import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMinutes, differenceInHours, differenceInDays, subDays, format, startOfMonth, startOfDay, subMonths } from 'date-fns';

export interface WatchtowerMetrics {
  // NPS
  npsScore: number | null;
  npsTrend: number | null; // vs last 30 days
  promoterCount: number;
  detractorCount: number;
  passiveCount: number;

  // Client Status Counts
  clientStatusCounts: {
    live: number;
    onboarding: number;
    paused: number;
    atRisk: number;
    churned: number;
  };

  // Onboarding & Support
  avgOnboardingDays: number;
  avgChatResponseMinutes: number;
  avgTicketResolutionHours: number;
  slaCompliancePercent: number;
  oldestOpenTicketHours: number;
  openTicketCount: number;

  // Financial Alerts
  overdueCount: number;
  overdueAmount: number;
  failedPaymentsAmount: number;
  collectionsCount: number; // Future: sent to collections
  safeModeCount: number;
  disputeCount: number;

  // CPA Alarm (CPL > $75 yesterday or today)
  cpaAlarmClients: Array<{
    id: string;
    name: string;
    cpl: number;
    date: string;
  }>;

  // Problems Feed
  recentChanges: Array<{
    id: string;
    user: string;
    action: string;
    clientName: string;
    timestamp: string;
  }>;

  // Critical Alerts
  budgetCriticalClients: Array<{
    id: string;
    name: string;
    daysRemaining: number;
    walletBalance: number;
  }>;

  zeroLeadCampaigns: Array<{
    id: string;
    clientName: string;
    spend: number;
  }>;

  systemAlerts: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    severity: string;
    createdAt: string;
  }>;
}

export function useWatchtowerData() {
  return useQuery({
    queryKey: ['tv-watchtower-data'],
    queryFn: async (): Promise<WatchtowerMetrics> => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd');
      const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd');
      const sixtyDaysAgo = format(subDays(now, 60), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');

      // Split into two batches to avoid TypeScript deep instantiation error
      const [
        npsResult,
        npsPriorResult,
        clientsResult,
        onboardingResult,
        chatMessagesResult,
        ticketsResult,
      ] = await Promise.all([
        // NPS responses last 30 days
        supabase
          .from('nps_responses')
          .select('score')
          .gte('created_at', thirtyDaysAgo),

        // NPS responses prior 30 days (30-60 days ago)
        supabase
          .from('nps_responses')
          .select('score')
          .gte('created_at', sixtyDaysAgo)
          .lt('created_at', thirtyDaysAgo),

        // All clients with status
        supabase
          .from('clients')
          .select('id, name, status, onboarding_status, deleted_at, automation_started_at, automation_completed_at'),

        // Onboarding time calculation
        supabase
          .from('clients')
          .select('automation_started_at, automation_completed_at')
          .not('automation_started_at', 'is', null)
          .not('automation_completed_at', 'is', null),

        // Chat messages for response time
        supabase
          .from('chat_messages')
          .select('conversation_id, sender_role, created_at')
          .gte('created_at', sevenDaysAgo)
          .order('created_at'),

        // Support tickets
        supabase
          .from('support_tickets')
          .select('id, status, created_at, resolved_at, sla_deadline'),
      ]);

      // Billing records for overdue and failed
      const billingResult = await supabase
        .from('billing_records')
        .select('id, status, amount, due_date, updated_at, charge_attempts')
        .in('status', ['pending', 'overdue']);

      // Campaigns for safe mode, budget critical, zero leads
      const campaignsResult = await supabase
        .from('campaigns')
        .select('id, client_id, safe_mode, wallet_remaining, current_daily_budget, leads_yesterday, clients!inner(id, name)')
        .eq('ignored', false);

      // Audit log for recent changes
      const auditLogResult = await supabase
        .from('campaign_audit_log')
        .select('id, action, actor, created_at, clients(name), profiles(name)')
        .order('created_at', { ascending: false })
        .limit(15);

      // System alerts - bypass complex type inference
      const alertsResult: { data: Array<{ id: string; alert_type: string; title: string; message: string; severity: string; created_at: string }> | null; error: unknown } = 
        await (supabase as any)
          .from('system_alerts')
          .select('id, alert_type, title, message, severity, created_at')
          .eq('acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(10);

      // Ad spend for yesterday and today for CPA alarm
      const adSpendResult = await supabase
        .from('ad_spend_daily')
        .select('client_id, spend_date, cost, conversions, clients(id, name)')
        .in('spend_date', [today, yesterday]);

      // Disputes
      const disputesResult = await supabase
        .from('disputes')
        .select('id, status')
        .in('status', ['pending', 'needs_response']);

      // Calculate NPS Score
      const npsResponses = npsResult.data || [];
      const promoters = npsResponses.filter(r => r.score >= 9).length;
      const detractors = npsResponses.filter(r => r.score <= 6).length;
      const passives = npsResponses.filter(r => r.score >= 7 && r.score <= 8).length;
      const totalResponses = npsResponses.length;
      
      const npsScore = totalResponses > 0
        ? Math.round(((promoters - detractors) / totalResponses) * 100)
        : null;

      // Calculate prior NPS for trend
      const priorResponses = npsPriorResult.data || [];
      const priorPromoters = priorResponses.filter(r => r.score >= 9).length;
      const priorDetractors = priorResponses.filter(r => r.score <= 6).length;
      const priorTotal = priorResponses.length;
      const priorNps = priorTotal > 0
        ? Math.round(((priorPromoters - priorDetractors) / priorTotal) * 100)
        : null;
      
      const npsTrend = npsScore !== null && priorNps !== null
        ? npsScore - priorNps
        : null;

      // Client status counts - ONLY count status='live' for live count (not 'active' which includes leads)
      const clients = clientsResult.data || [];
      const activeClients = clients.filter(c => !c.deleted_at);
      
      const clientStatusCounts = {
        live: activeClients.filter(c => c.status === 'live').length,
        onboarding: activeClients.filter(c => c.status === 'onboarding').length,
        paused: activeClients.filter(c => c.status === 'paused').length,
        atRisk: activeClients.filter(c => c.status === 'at_risk').length,
        churned: clients.filter(c => c.deleted_at || c.status === 'churned').length,
      };

      // Average onboarding time
      const onboardingData = onboardingResult.data || [];
      const onboardingDays = onboardingData.map(c => 
        differenceInDays(new Date(c.automation_completed_at!), new Date(c.automation_started_at!))
      );
      const avgOnboardingDays = onboardingDays.length > 0
        ? Math.round(onboardingDays.reduce((a, b) => a + b, 0) / onboardingDays.length)
        : 0;

      // Chat response time calculation
      const messages = chatMessagesResult.data || [];
      const conversationFirstResponses: number[] = [];
      const groupedByConversation = new Map<string, Array<{ role: string; time: Date }>>();
      
      messages.forEach(msg => {
        if (!groupedByConversation.has(msg.conversation_id)) {
          groupedByConversation.set(msg.conversation_id, []);
        }
        groupedByConversation.get(msg.conversation_id)?.push({
          role: msg.sender_role,
          time: new Date(msg.created_at),
        });
      });
      
      groupedByConversation.forEach(msgs => {
        const sorted = msgs.sort((a, b) => a.time.getTime() - b.time.getTime());
        const firstClient = sorted.find(m => m.role === 'client');
        const firstAdmin = sorted.find(m => m.role === 'admin' && firstClient && m.time > firstClient.time);
        if (firstClient && firstAdmin) {
          conversationFirstResponses.push(differenceInMinutes(firstAdmin.time, firstClient.time));
        }
      });
      
      const avgChatResponseMinutes = conversationFirstResponses.length > 0
        ? Math.round(conversationFirstResponses.reduce((a, b) => a + b, 0) / conversationFirstResponses.length)
        : 0;

      // Ticket metrics
      const tickets = ticketsResult.data || [];
      const recentTickets = tickets.filter(t => new Date(t.created_at) >= new Date(sevenDaysAgo));
      const resolvedTickets = recentTickets.filter(t => t.status === 'resolved' && t.resolved_at);
      const resolutionTimes = resolvedTickets.map(t => 
        differenceInHours(new Date(t.resolved_at!), new Date(t.created_at))
      );
      const avgTicketResolutionHours = resolutionTimes.length > 0
        ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
        : 0;

      // SLA compliance (responded within SLA deadline)
      const ticketsWithSLA = recentTickets.filter(t => t.sla_deadline);
      const withinSLA = ticketsWithSLA.filter(t => {
        // If resolved before SLA deadline, it's within SLA
        if (t.resolved_at && t.sla_deadline) {
          return new Date(t.resolved_at) <= new Date(t.sla_deadline);
        }
        // If still open, check if SLA deadline has passed
        return t.sla_deadline ? new Date() <= new Date(t.sla_deadline) : true;
      });
      const slaCompliancePercent = ticketsWithSLA.length > 0
        ? Math.round((withinSLA.length / ticketsWithSLA.length) * 100)
        : 100;

      // Oldest open ticket
      const openTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');
      const oldestOpenTicketHours = openTickets.length > 0
        ? Math.max(...openTickets.map(t => differenceInHours(now, new Date(t.created_at))))
        : 0;

      // Billing metrics
      const billingRecords = billingResult.data || [];
      const overdueRecords = billingRecords.filter(b => 
        b.status === 'pending' && 
        b.due_date && 
        new Date(b.due_date) < now
      );
      const overdueCount = overdueRecords.length;
      const overdueAmount = overdueRecords.reduce((sum, b) => sum + (b.amount || 0), 0);

      // Failed payments - records with charge_attempts > 0 (attempted but failed)
      const failedRecords = billingRecords.filter(b => 
        (b.charge_attempts || 0) > 0 && 
        b.status !== 'paid' &&
        b.updated_at && 
        new Date(b.updated_at) >= new Date(sevenDaysAgo)
      );
      const failedPaymentsAmount = failedRecords.reduce((sum, b) => sum + (b.amount || 0), 0);

      // Collections (future: for now show 0)
      const collectionsCount = 0;

      // Campaign metrics
      const campaigns = campaignsResult.data || [];
      const safeModeCount = campaigns.filter(c => c.safe_mode).length;

      // Budget critical (< 2 days remaining)
      const budgetCriticalClients = campaigns
        .filter(c => {
          const walletBalance = c.wallet_remaining || 0;
          const dailySpend = c.current_daily_budget || 0;
          if (dailySpend <= 0) return false;
          const daysRemaining = walletBalance / dailySpend;
          return daysRemaining < 2 && daysRemaining > 0;
        })
        .map(c => ({
          id: c.client_id,
          name: (c.clients as any)?.name || 'Unknown',
          daysRemaining: Math.round((c.wallet_remaining || 0) / (c.current_daily_budget || 1) * 10) / 10,
          walletBalance: c.wallet_remaining || 0,
        }))
        .slice(0, 5);

      // Zero lead campaigns today
      const zeroLeadCampaigns = campaigns
        .filter(c => {
          const todayLeads = c.leads_yesterday || 0;
          const spend = c.current_daily_budget || 0;
          return todayLeads === 0 && spend >= 50;
        })
        .map(c => ({
          id: c.id,
          clientName: (c.clients as any)?.name || 'Unknown',
          spend: c.current_daily_budget || 0,
        }))
        .slice(0, 5);

      // CPA Alarm (CPL > $75 yesterday or today)
      const adSpendData = adSpendResult.data || [];
      const cpaAlarmClients: WatchtowerMetrics['cpaAlarmClients'] = [];
      
      // Group by client and date
      const clientSpendMap = new Map<string, { spend: number; leads: number; date: string; name: string; id: string }>();
      adSpendData.forEach(record => {
        const key = `${record.client_id}-${record.spend_date}`;
        const existing = clientSpendMap.get(key);
        const cost = record.cost || 0;
        const conversions = record.conversions || 0;
        
        if (existing) {
          existing.spend += cost;
          existing.leads += conversions;
        } else {
          clientSpendMap.set(key, {
            spend: cost,
            leads: conversions,
            date: record.spend_date,
            name: (record.clients as any)?.name || 'Unknown',
            id: record.client_id,
          });
        }
      });

      clientSpendMap.forEach((data) => {
        if (data.leads > 0) {
          const cpl = data.spend / data.leads;
          if (cpl > 75) {
            cpaAlarmClients.push({
              id: data.id,
              name: data.name,
              cpl: Math.round(cpl),
              date: data.date,
            });
          }
        }
      });

      // Recent changes from audit log
      const auditLog = auditLogResult.data || [];
      const recentChanges = auditLog.map(log => ({
        id: log.id,
        user: (log.profiles as any)?.name || log.actor || 'System',
        action: log.action,
        clientName: (log.clients as any)?.name || 'Unknown',
        timestamp: log.created_at,
      }));

      // System alerts
      const alerts = alertsResult.data || [];
      const systemAlerts = alerts.map(a => ({
        id: a.id,
        type: a.alert_type,
        title: a.title,
        message: a.message,
        severity: a.severity,
        createdAt: a.created_at,
      }));

      // Disputes
      const disputes = disputesResult.data || [];
      const disputeCount = disputes.length;

      return {
        npsScore,
        npsTrend,
        promoterCount: promoters,
        detractorCount: detractors,
        passiveCount: passives,
        clientStatusCounts,
        avgOnboardingDays,
        avgChatResponseMinutes,
        avgTicketResolutionHours,
        slaCompliancePercent,
        oldestOpenTicketHours,
        openTicketCount: openTickets.length,
        overdueCount,
        overdueAmount,
        failedPaymentsAmount,
        collectionsCount,
        safeModeCount,
        disputeCount,
        cpaAlarmClients,
        recentChanges,
        budgetCriticalClients,
        zeroLeadCampaigns,
        systemAlerts,
      };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
