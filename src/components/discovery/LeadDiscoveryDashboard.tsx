import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PhoneCall, Calendar, Users, XCircle, AlertTriangle, Filter, TrendingUp, PhoneForwarded, Video, Headphones } from 'lucide-react';
import { LeadCard } from './LeadCard';
import { DiscoveryCallSheet } from './DiscoveryCallSheet';
import { SpeedToLeadScoreboard } from './SpeedToLeadScoreboard';
import { CallerLeaderboard } from './CallerLeaderboard';
import { DailyWeeklyReport } from './DailyWeeklyReport';
import { useDiscoveryCallStats } from '@/hooks/useDiscoveryCallStats';
import { computePriorityScore } from '@/hooks/useLeadDiscoveryQueue';
import type { DiscoveryQueueData, DiscoveryLead } from '@/hooks/useLeadDiscoveryQueue';
import type { DiscoveryStage } from '@/hooks/useDiscoveryCalls';

interface LeadDiscoveryDashboardProps {
  data: DiscoveryQueueData;
  agentId: string;
  schedulerLink?: string | null;
  subaccountId?: string | null;
  callbackCalendarId?: string | null;
  isLoading?: boolean;
}

export function LeadDiscoveryDashboard({ data, agentId, schedulerLink, subaccountId, callbackCalendarId, isLoading }: LeadDiscoveryDashboardProps) {
  const [selectedLead, setSelectedLead] = useState<DiscoveryLead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<string>('');
  const [filterTemp, setFilterTemp] = useState<string>('');
  const [filterAssigned, setFilterAssigned] = useState<string>('');

  // Search filter — works across all tabs
  const filterBySearch = (leads: DiscoveryLead[]) => {
    if (!searchQuery) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter((l) => {
      const name = [l.first_name, l.last_name].filter(Boolean).join(' ').toLowerCase();
      return (
        name.includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (l.state || '').toLowerCase().includes(q) ||
        (l.lost_reason || '').toLowerCase().replace(/_/g, ' ').includes(q)
      );
    });
  };

  // Apply filters to a list of leads
  const applyFilters = (leads: DiscoveryLead[]) => {
    let result = leads;
    if (filterState) result = result.filter((l) => l.state === filterState);
    if (filterTemp) {
      result = result.filter((l) => {
        if (!l.discovery_temperature) return false;
        const n = parseInt(l.discovery_temperature, 10);
        // Support legacy string values
        if (isNaN(n)) return l.discovery_temperature === filterTemp;
        // Numeric range filters
        if (filterTemp === 'cold') return n <= 3;
        if (filterTemp === 'warm') return n >= 4 && n <= 6;
        if (filterTemp === 'hot') return n >= 7;
        return l.discovery_temperature === filterTemp;
      });
    }
    if (filterAssigned) result = result.filter((l) => l.last_attempted_by === filterAssigned);
    return filterBySearch(result);
  };

  // Unique states for filter dropdown
  const availableStates = useMemo(() => {
    const states = new Set(data.all.map((l) => l.state).filter(Boolean) as string[]);
    return Array.from(states).sort();
  }, [data.all]);

  // Unique assignees for filter dropdown
  const availableAssignees = useMemo(() => {
    const assignees = new Set(data.all.map((l) => l.last_attempted_by).filter(Boolean) as string[]);
    return Array.from(assignees).sort();
  }, [data.all]);

  // Flat priority-sorted queue (with filters applied)
  const filteredQueue = useMemo(() => applyFilters(data.queue), [data.queue, filterState, filterTemp, filterAssigned, searchQuery]);

  // Filter callbacks by search + filters
  const filteredCallbacks = useMemo(() => applyFilters(data.callbacks), [data.callbacks, filterState, filterTemp, filterAssigned, searchQuery]);

  // Filter intro booked + strategy booked by search + filters
  const filteredIntroBooked = useMemo(() => applyFilters(data.introBooked), [data.introBooked, filterState, filterTemp, filterAssigned, searchQuery]);
  const filteredStrategyBooked = useMemo(() => applyFilters(data.strategyBooked), [data.strategyBooked, filterState, filterTemp, filterAssigned, searchQuery]);

  // Filter all contacts by search + filters
  const filteredAll = useMemo(() => applyFilters(data.all), [data.all, filterState, filterTemp, filterAssigned, searchQuery]);

  // Filter lost by search + filters
  const filteredLost = useMemo(() => applyFilters(data.lost), [data.lost, filterState, filterTemp, filterAssigned, searchQuery]);

  const handleLeadClick = (lead: DiscoveryLead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const handleCallNext = (lead: DiscoveryLead) => {
    setSelectedLead(lead);
    // Sheet stays open — resets for the new lead via useEffect in DiscoveryCallSheet
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setSelectedLead(null);
  };

  const { data: stats } = useDiscoveryCallStats(agentId);

  return (
    <>
      {/* Speed-to-Lead Scoreboard */}
      <SpeedToLeadScoreboard stats={stats} queueData={data} />

      {/* Global Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, state, or lost reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background/50"
        />
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="bg-background/50 border border-border/50">
          <TabsTrigger value="queue" className="gap-2">
            <PhoneCall className="h-4 w-4" />
            Dial
            <Badge variant="secondary" className="ml-1 text-xs">
              {filteredQueue.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="callbacks" className="gap-2">
            <PhoneForwarded className="h-4 w-4" />
            Callbacks
            <Badge variant="secondary" className="ml-1 text-xs">
              {filteredCallbacks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="intro-booked" className="gap-2">
            <Headphones className="h-4 w-4" />
            Intro
            <Badge variant="secondary" className="ml-1 text-xs">
              {filteredIntroBooked.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="strategy-booked" className="gap-2">
            <Video className="h-4 w-4" />
            Strategy
            <Badge variant="secondary" className="ml-1 text-xs">
              {filteredStrategyBooked.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            All
            <Badge variant="secondary" className="ml-1 text-xs">
              {filteredAll.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="lost" className="gap-2">
            <XCircle className="h-4 w-4" />
            Lost
            <Badge variant="secondary" className="ml-1 text-xs">
              {filteredLost.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground/50" />
          <Select value={filterState} onValueChange={(v) => setFilterState(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[100px] bg-background/50 border-border/50">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All States</SelectItem>
              {availableStates.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTemp} onValueChange={(v) => setFilterTemp(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[100px] bg-background/50 border-border/50">
              <SelectValue placeholder="Temperature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Temps</SelectItem>
              <SelectItem value="hot" className="text-xs">Hot (7-10)</SelectItem>
              <SelectItem value="warm" className="text-xs">Warm (4-6)</SelectItem>
              <SelectItem value="cold" className="text-xs">Cold (1-3)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAssigned} onValueChange={(v) => setFilterAssigned(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[120px] bg-background/50 border-border/50">
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Assignees</SelectItem>
              {availableAssignees.map((a) => (
                <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterState || filterTemp || filterAssigned) && (
            <button
              onClick={() => { setFilterState(''); setFilterTemp(''); setFilterAssigned(''); }}
              className="text-[10px] text-muted-foreground hover:text-primary underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Follow-Up Queue */}
        <TabsContent value="queue" className="space-y-4">
          {/* Failed delivery banner */}
          {data.failedDelivery.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="py-3 px-4 flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400 font-medium">
                  {data.failedDelivery.length} lead{data.failedDelivery.length > 1 ? 's' : ''} failed CRM delivery — contact support
                </span>
              </CardContent>
            </Card>
          )}

          {filteredQueue.length === 0 ? (
            <EmptyState icon={PhoneCall} message="No follow-ups right now. Nice." />
          ) : (
            <div className="space-y-2">
              {filteredQueue.map((lead) => {
                const score = computePriorityScore(lead);
                return (
                  <div key={lead.id} className="relative">
                    {score >= 900 && (
                      <span className="absolute -top-1.5 -left-1 z-10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-500/90 text-white rounded">
                        URGENT
                      </span>
                    )}
                    {score >= 700 && score < 900 && (
                      <span className="absolute -top-1.5 -left-1 z-10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/90 text-white rounded">
                        HIGH
                      </span>
                    )}
                    <LeadCard lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Callbacks */}
        <TabsContent value="callbacks" className="space-y-2">
          {filteredCallbacks.length === 0 ? (
            <EmptyState icon={PhoneForwarded} message="No callbacks scheduled" />
          ) : (
            filteredCallbacks.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />
            ))
          )}
        </TabsContent>

        {/* Intro Booked */}
        <TabsContent value="intro-booked" className="space-y-2">
          {filteredIntroBooked.length === 0 ? (
            <EmptyState icon={Headphones} message="No intro calls booked" />
          ) : (
            filteredIntroBooked.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />
            ))
          )}
        </TabsContent>

        {/* Strategy Booked */}
        <TabsContent value="strategy-booked" className="space-y-2">
          {filteredStrategyBooked.length === 0 ? (
            <EmptyState icon={Video} message="No strategy calls booked" />
          ) : (
            filteredStrategyBooked.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />
            ))
          )}
        </TabsContent>

        {/* All Contacts */}
        <TabsContent value="all" className="space-y-2">
          {filteredAll.length === 0 ? (
            <EmptyState icon={Users} message="No contacts found" />
          ) : (
            filteredAll.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />
            ))
          )}
        </TabsContent>

        {/* Lost / DQ */}
        <TabsContent value="lost" className="space-y-2">
          {filteredLost.length === 0 ? (
            <EmptyState icon={XCircle} message="None" />
          ) : (
            filteredLost.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />
            ))
          )}
        </TabsContent>

      </Tabs>

      {/* Stats Section — below tabs */}
      <details className="mt-6">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <TrendingUp className="h-4 w-4" />
          Stats & Reports
        </summary>
        <div className="mt-4 space-y-6">
          <CallerLeaderboard agentId={agentId} />
          <DailyWeeklyReport agentId={agentId} />
        </div>
      </details>

      {/* Discovery Call Sheet */}
      <DiscoveryCallSheet
        open={sheetOpen}
        onClose={handleSheetClose}
        lead={selectedLead}
        agentId={agentId}
        schedulerLink={schedulerLink}
        callbackCalendarId={callbackCalendarId}
        subaccountId={subaccountId}
        onCallNext={handleCallNext}
        queueData={data}
      />
    </>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
