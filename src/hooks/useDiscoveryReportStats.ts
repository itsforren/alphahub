import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HourlyPickup {
  hour: number;
  total: number;
  answered: number;
  rate: number;
}

export interface DailyBooking {
  date: string;
  count: number;
}

export interface DiscoveryReportStats {
  totalLeadsReceived: number;
  totalLeadsContacted: number;
  coverageRate: number;
  avgSpeedToFirstContact: number;
  hourlyPickup: HourlyPickup[];
  dailyBookings: DailyBooking[];
  fallenThrough: number;
  totalConnected: number;
  totalBooked: number;
  bookingRate: number;
}

export type DateRange = 'today' | 'week' | 'custom';

function getDateRangeStart(range: DateRange, customStart?: string): string {
  if (range === 'custom' && customStart) return customStart;
  const d = new Date();
  if (range === 'today') {
    d.setHours(0, 0, 0, 0);
  } else {
    // week = last 7 days
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export function useDiscoveryReportStats(
  agentId: string | null,
  dateRange: DateRange,
  customStart?: string,
  customEnd?: string
) {
  return useQuery({
    queryKey: ['discovery-report', agentId, dateRange, customStart, customEnd],
    queryFn: async (): Promise<DiscoveryReportStats | null> => {
      if (!agentId) return null;

      const rangeStart = getDateRangeStart(dateRange, customStart);
      const rangeEnd = dateRange === 'custom' && customEnd ? customEnd : new Date().toISOString();

      // Fetch calls and leads in parallel
      const [callsResult, leadsResult] = await Promise.all([
        supabase
          .from('discovery_calls')
          .select('lead_id, call_date, answered, outcome')
          .eq('agent_id', agentId)
          .gte('call_date', rangeStart)
          .lte('call_date', rangeEnd)
          .order('call_date', { ascending: true }),
        supabase
          .from('leads')
          .select('id, lead_date, call_attempt_count')
          .eq('agent_id', agentId),
      ]);

      if (callsResult.error) throw callsResult.error;
      if (leadsResult.error) throw leadsResult.error;

      const calls = callsResult.data || [];
      const leads = leadsResult.data || [];

      // Leads received in range
      const leadsInRange = leads.filter((l) => {
        if (!l.lead_date) return false;
        return l.lead_date >= rangeStart && l.lead_date <= rangeEnd;
      });
      const totalLeadsReceived = leadsInRange.length;

      // Leads contacted (have at least 1 call in range)
      const contactedLeadIds = new Set(calls.map((c) => c.lead_id));
      const totalLeadsContacted = contactedLeadIds.size;
      const coverageRate = totalLeadsReceived > 0
        ? Math.round((totalLeadsContacted / totalLeadsReceived) * 100)
        : 0;

      // Avg speed to first contact
      const leadDateMap = new Map<string, string>();
      leads.forEach((l) => {
        if (l.lead_date) leadDateMap.set(l.id, l.lead_date);
      });
      const firstCallPerLead = new Map<string, number>();
      calls.forEach((c) => {
        if (!firstCallPerLead.has(c.lead_id)) {
          firstCallPerLead.set(c.lead_id, new Date(c.call_date).getTime());
        }
      });
      const speedDeltas: number[] = [];
      firstCallPerLead.forEach((callTime, leadId) => {
        const leadDate = leadDateMap.get(leadId);
        if (leadDate) {
          const delta = callTime - new Date(leadDate).getTime();
          if (delta > 0) speedDeltas.push(delta / 60_000);
        }
      });
      const avgSpeedToFirstContact = speedDeltas.length > 0
        ? Math.round(speedDeltas.reduce((a, b) => a + b, 0) / speedDeltas.length)
        : 0;

      // Hourly pickup
      const hourMap = new Map<number, { total: number; answered: number }>();
      calls.forEach((c) => {
        const hour = new Date(c.call_date).getHours();
        const entry = hourMap.get(hour) || { total: 0, answered: 0 };
        entry.total++;
        if (c.answered) entry.answered++;
        hourMap.set(hour, entry);
      });
      const hourlyPickup: HourlyPickup[] = Array.from(hourMap.entries())
        .map(([hour, s]) => ({
          hour,
          total: s.total,
          answered: s.answered,
          rate: s.total > 0 ? Math.round((s.answered / s.total) * 100) : 0,
        }))
        .sort((a, b) => a.hour - b.hour);

      // Daily bookings
      const bookingMap = new Map<string, number>();
      calls.forEach((c) => {
        if (c.outcome === 'strategy_booked' || c.outcome === 'scheduled') {
          const date = c.call_date.split('T')[0];
          bookingMap.set(date, (bookingMap.get(date) || 0) + 1);
        }
      });
      const dailyBookings: DailyBooking[] = Array.from(bookingMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Fallen through: leads received >24h ago in range with 0 calls
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const fallenThrough = leadsInRange.filter((l) => {
        if (!l.lead_date) return false;
        const leadTime = new Date(l.lead_date).getTime();
        return leadTime < twentyFourHoursAgo && (l.call_attempt_count || 0) === 0;
      }).length;

      // Totals
      const totalConnected = calls.filter((c) => c.answered).length;
      const totalBooked = calls.filter(
        (c) => c.outcome === 'strategy_booked' || c.outcome === 'scheduled'
      ).length;
      const bookingRate = totalConnected > 0
        ? Math.round((totalBooked / totalConnected) * 100)
        : 0;

      return {
        totalLeadsReceived,
        totalLeadsContacted,
        coverageRate,
        avgSpeedToFirstContact,
        hourlyPickup,
        dailyBookings,
        fallenThrough,
        totalConnected,
        totalBooked,
        bookingRate,
      };
    },
    enabled: !!agentId,
  });
}
