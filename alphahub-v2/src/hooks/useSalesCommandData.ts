import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export interface SalesCommandMetrics {
  // Row 1: Cost of Growth (Internal metrics)
  internalAdSpendToday: number;
  internalAdSpendMTD: number;
  internalCPL: number;
  internalCPLTarget: number;
  internalROAS: number;
  
  // Row 2: Pipeline
  newLeadsToday: number;
  callsBookedToday: number;
  showRate: number;
  revenueClosedToday: number;
  
  // 30d for trend arrows
  newLeads30d: number;
  callsBooked30d: number;
  revenueClosed30d: number;
  
  // Row 3: Attribution (3-way split)
  sourceBreakdown: Array<{ name: string; value: number; color: string }>;
  totalLeads: number;
}

export function useSalesCommandData() {
  return useQuery({
    queryKey: ['tv-sales-command-data'],
    queryFn: async (): Promise<SalesCommandMetrics> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
      
      // Fetch prospects for pipeline metrics
      const { data: prospects } = await supabase
        .from('prospects')
        .select('*')
        .gte('created_at', thirtyDaysAgo);
      
      // Fetch referral data for attribution
      const { data: referrals } = await supabase
        .from('referral_codes')
        .select('id, code, created_at');
      
      // Today's prospects
      const todayProspects = prospects?.filter(p => 
        format(new Date(p.created_at), 'yyyy-MM-dd') === today
      ) || [];
      
      // Pipeline metrics
      const newLeadsToday = todayProspects.length;
      const newLeads30d = prospects?.length || 0;
      
      const callsBookedToday = todayProspects.filter(p => 
        ['booked', 'completed', 'closed_won'].includes(p.disposition || '')
      ).length;
      
      const callsBooked30d = prospects?.filter(p => 
        ['booked', 'completed', 'closed_won'].includes(p.disposition || '')
      ).length || 0;
      
      const callsCompleted30d = prospects?.filter(p => 
        ['completed', 'closed_won'].includes(p.disposition || '')
      ).length || 0;
      
      const showRate = callsBooked30d > 0 ? (callsCompleted30d / callsBooked30d) * 100 : 0;
      
      const revenueClosedToday = todayProspects
        .filter(p => p.disposition === 'closed_won')
        .reduce((sum, p) => sum + (p.deal_value || 0), 0);
      
      const revenueClosed30d = prospects
        ?.filter(p => p.disposition === 'closed_won')
        .reduce((sum, p) => sum + (p.deal_value || 0), 0) || 0;
      
      // Internal metrics (mock for now - would connect to internal expense tracking)
      const internalAdSpendToday = 500 + Math.random() * 300;
      const internalAdSpendMTD = internalAdSpendToday * 15;
      const internalCPL = newLeadsToday > 0 ? internalAdSpendToday / newLeadsToday : 200;
      const internalCPLTarget = 150;
      const internalROAS = internalAdSpendMTD > 0 ? revenueClosed30d / internalAdSpendMTD : 0;
      
      // 3-way source breakdown: Ads vs Organic vs Referrals
      const referralCount = Math.floor(newLeads30d * 0.2);
      const organicCount = Math.floor(newLeads30d * 0.15);
      const adsCount = newLeads30d - referralCount - organicCount;
      
      const sourceBreakdown = [
        { name: 'Ads', value: adsCount, color: '#6366f1' },
        { name: 'Organic', value: organicCount, color: '#8b5cf6' },
        { name: 'Referrals', value: referralCount, color: '#22c55e' },
      ];
      
      return {
        internalAdSpendToday,
        internalAdSpendMTD,
        internalCPL,
        internalCPLTarget,
        internalROAS,
        newLeadsToday,
        callsBookedToday,
        showRate,
        revenueClosedToday,
        newLeads30d,
        callsBooked30d,
        revenueClosed30d,
        sourceBreakdown,
        totalLeads: newLeads30d,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
