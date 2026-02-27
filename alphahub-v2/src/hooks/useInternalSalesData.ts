import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subDays } from 'date-fns';

interface InternalSalesMetrics {
  // Sales Metrics
  salesAdSpendMTD: number;
  salesAdSpendGoogle: number;
  salesAdSpendMeta: number;
  salesCPL: number;
  salesCPBC: number;
  salesCAC: number;
  salesShowRate: number;
  salesCloseRate: number;
  speedToLead: number;
  managementFeeRevenueMTD: number;
  
  // Raw counts
  totalPaidLeads: number;
  totalBookedCalls: number;
  newClientsWon: number;
  totalShows: number;
  
  // Attribution
  attributionBreakdown: { source: string; count: number; color: string }[];
  
  // Flags
  hasInternalAdSpend: boolean;
  needsSetup: string[];
}

export function useInternalSalesData() {
  return useQuery({
    queryKey: ['internal-sales-data'],
    queryFn: async (): Promise<InternalSalesMetrics> => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const thirtyDaysAgo = subDays(now, 30);
      
      const needsSetup: string[] = [];

      // Fetch billing records for management fee
      const { data: billingRecords } = await supabase
        .from('billing_records')
        .select('*')
        .eq('status', 'paid')
        .gte('paid_at', monthStart.toISOString());

      // Fetch prospects for sales metrics
      const { data: prospects } = await supabase
        .from('prospects')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fetch prospect activities for booking tracking
      const { data: prospectActivities } = await supabase
        .from('prospect_activities')
        .select('prospect_id, activity_type, created_at')
        .eq('activity_type', 'booking_created')
        .gte('created_at', monthStart.toISOString());

      // Fetch prospect attribution for source tracking
      const { data: prospectAttribution } = await supabase
        .from('prospect_attribution')
        .select('prospect_id, first_touch_source, first_touch_medium');

      // Fetch internal marketing settings
      const { data: internalSettings } = await supabase
        .from('internal_marketing_settings')
        .select('setting_key, setting_value');

      // Management Fee Revenue MTD
      const managementFees = billingRecords?.filter(r => r.billing_type === 'management') || [];
      const managementFeeRevenueMTD = managementFees.reduce((sum, r) => sum + (r.amount || 0), 0);

      // === INTERNAL SALES METRICS ===

      // Check if internal ad spend is configured
      const googleCampaignId = internalSettings?.find(s => s.setting_key === 'google_ads_internal_campaign_id')?.setting_value;
      const metaConfig = internalSettings?.find(s => s.setting_key === 'meta_ads_config')?.setting_value as { access_token?: string } | null;
      
      const hasInternalAdSpend = !!(googleCampaignId && googleCampaignId !== '""') || 
                                  !!(metaConfig?.access_token && metaConfig.access_token !== '');

      if (!hasInternalAdSpend) {
        needsSetup.push('Internal Ad Spend Tracking');
      }

      // Fetch internal ad spend from edge functions
      let salesAdSpendGoogle = 0;
      let salesAdSpendMeta = 0;

      // Fetch Google Ads spend if configured
      if (googleCampaignId && googleCampaignId !== '""') {
        try {
          const { data: googleData } = await supabase.functions.invoke('sync-internal-google-ads');
          if (googleData?.mtd) {
            salesAdSpendGoogle = googleData.mtd;
          }
        } catch (e) {
          console.warn('Failed to fetch internal Google Ads data:', e);
        }
      }

      // Fetch Meta Ads spend if configured
      if (metaConfig?.access_token) {
        try {
          const { data: metaData } = await supabase.functions.invoke('sync-meta-ads');
          if (metaData?.mtd) {
            salesAdSpendMeta = metaData.mtd;
          }
        } catch (e) {
          console.warn('Failed to fetch internal Meta Ads data:', e);
        }
      }

      const salesAdSpendMTD = salesAdSpendGoogle + salesAdSpendMeta;

      // Create attribution map
      const attributionMap = new Map<string, string>();
      prospectAttribution?.forEach(a => {
        const source = a.first_touch_source?.toLowerCase() || 'direct';
        const medium = a.first_touch_medium?.toLowerCase() || '';
        let category = 'Organic';
        if (medium.includes('cpc') || medium.includes('paid') || source.includes('google') || source.includes('facebook') || source.includes('meta')) {
          category = source.includes('facebook') || source.includes('meta') ? 'Facebook Ads' : 'Google Ads';
        } else if (source.includes('referral') || medium.includes('referral')) {
          category = 'Referral';
        }
        attributionMap.set(a.prospect_id, category);
      });

      // Count paid leads
      const paidLeads = prospects?.filter(p => {
        const source = attributionMap.get(p.id);
        return source === 'Google Ads' || source === 'Facebook Ads';
      }) || [];
      const totalPaidLeads = paidLeads.length;

      // Unique booked calls (distinct prospects with booking_created, excluding converted)
      const bookedProspectIds = new Set(
        prospectActivities
          ?.filter(a => !prospects?.find(p => p.id === a.prospect_id)?.client_id)
          .map(a => a.prospect_id)
      );
      const totalBookedCalls = bookedProspectIds.size;

      // Paid booked calls
      const paidBookedCalls = [...bookedProspectIds].filter(id => {
        const source = attributionMap.get(id);
        return source === 'Google Ads' || source === 'Facebook Ads';
      }).length;

      // Shows and closes
      const shows = prospects?.filter(p => p.disposition?.toLowerCase().includes('showed')) || [];
      const totalShows = shows.length;
      const wins = prospects?.filter(p => p.disposition === 'showed_closed_won') || [];
      const newClientsWon = wins.length;

      // Sales CPL (only paid leads)
      const salesCPL = salesAdSpendMTD > 0 && totalPaidLeads > 0 
        ? salesAdSpendMTD / totalPaidLeads 
        : 0;

      // Sales CPBC (only paid booked calls)
      const salesCPBC = salesAdSpendMTD > 0 && paidBookedCalls > 0 
        ? salesAdSpendMTD / paidBookedCalls 
        : 0;

      // Sales CAC
      const salesCAC = salesAdSpendMTD > 0 && newClientsWon > 0 
        ? salesAdSpendMTD / newClientsWon 
        : 0;

      // Sales Show Rate
      const salesShowRate = totalBookedCalls > 0 ? (totalShows / totalBookedCalls) * 100 : 0;

      // Sales Close Rate
      const salesCloseRate = totalShows > 0 ? (newClientsWon / totalShows) * 100 : 0;

      // Speed to Lead
      const prospectsWithContact = prospects?.filter(p => p.first_contact_at) || [];
      let speedToLead = 0;
      if (prospectsWithContact.length > 0) {
        const speeds = prospectsWithContact.map(p => {
          const created = new Date(p.created_at);
          const contacted = new Date(p.first_contact_at!);
          return (contacted.getTime() - created.getTime()) / (1000 * 60); // minutes
        });
        speedToLead = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      } else if (prospects && prospects.length > 0) {
        needsSetup.push('Speed to Lead Tracking');
      }

      // Attribution Breakdown
      const attributionCounts: Record<string, number> = {
        'Google Ads': 0,
        'Facebook Ads': 0,
        'Referral': 0,
        'Organic': 0,
      };
      prospects?.forEach(p => {
        const source = attributionMap.get(p.id) || 'Organic';
        attributionCounts[source] = (attributionCounts[source] || 0) + 1;
      });
      const attributionBreakdown = [
        { source: 'Google Ads', count: attributionCounts['Google Ads'], color: '#4285f4' },
        { source: 'Facebook Ads', count: attributionCounts['Facebook Ads'], color: '#1877f2' },
        { source: 'Referral', count: attributionCounts['Referral'], color: '#22c55e' },
        { source: 'Organic', count: attributionCounts['Organic'], color: '#a78bfa' },
      ].filter(a => a.count > 0);

      return {
        salesAdSpendMTD,
        salesAdSpendGoogle,
        salesAdSpendMeta,
        salesCPL,
        salesCPBC,
        salesCAC,
        salesShowRate,
        salesCloseRate,
        speedToLead,
        managementFeeRevenueMTD,
        totalPaidLeads,
        totalBookedCalls,
        newClientsWon,
        totalShows,
        attributionBreakdown,
        hasInternalAdSpend,
        needsSetup,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
