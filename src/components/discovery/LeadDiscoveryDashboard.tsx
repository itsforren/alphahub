import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PhoneCall, Calendar, Users, XCircle, AlertTriangle, Filter, TrendingUp, PhoneForwarded, Video, Headphones, X } from 'lucide-react';
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

// Pure filter function — no hooks, no closures, just input → output
function filterLeads(leads: DiscoveryLead[], query: string, state: string, temp: string, assigned: string): DiscoveryLead[] {
  let r = leads;
  if (state) r = r.filter(l => l.state === state);
  if (temp) r = r.filter(l => {
    const n = parseInt(l.discovery_temperature || '', 10);
    if (isNaN(n)) return false;
    if (temp === 'cold') return n <= 3;
    if (temp === 'warm') return n >= 4 && n <= 6;
    if (temp === 'hot') return n >= 7;
    return false;
  });
  if (assigned) r = r.filter(l => l.last_attempted_by === assigned);
  if (query) {
    const q = query.toLowerCase();
    r = r.filter(l => {
      const name = [l.first_name, l.last_name].filter(Boolean).join(' ').toLowerCase();
      return name.includes(q) || (l.email || '').toLowerCase().includes(q) || (l.phone || '').includes(q) || (l.state || '').toLowerCase().includes(q);
    });
  }
  return r;
}

export function LeadDiscoveryDashboard({ data, agentId, schedulerLink, subaccountId, callbackCalendarId, isLoading }: LeadDiscoveryDashboardProps) {
  const [selectedLead, setSelectedLead] = useState<DiscoveryLead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('queue');
  const [filterState, setFilterState] = useState<string>('');
  const [filterTemp, setFilterTemp] = useState<string>('');
  const [filterAssigned, setFilterAssigned] = useState<string>('');

  // Compute on every render — zero caching, zero stale state
  const sq = searchQuery;
  const fs = filterState;
  const ft = filterTemp;
  const fa = filterAssigned;

  const filteredQueue = filterLeads(data.queue, sq, fs, ft, fa);
  const filteredCallbacks = filterLeads(data.callbacks, sq, fs, ft, fa);
  const filteredIntroBooked = filterLeads(data.introBooked, sq, fs, ft, fa);
  const filteredStrategyBooked = filterLeads(data.strategyBooked, sq, fs, ft, fa);
  const filteredAll = filterLeads(data.all, sq, fs, ft, fa);
  const filteredLost = filterLeads(data.lost, sq, fs, ft, fa);

  const activeTabTotal = { queue: data.queue.length, callbacks: data.callbacks.length, 'intro-booked': data.introBooked.length, 'strategy-booked': data.strategyBooked.length, all: data.all.length, lost: data.lost.length }[activeTab] || 0;
  const activeTabFiltered = { queue: filteredQueue.length, callbacks: filteredCallbacks.length, 'intro-booked': filteredIntroBooked.length, 'strategy-booked': filteredStrategyBooked.length, all: filteredAll.length, lost: filteredLost.length }[activeTab] || 0;

  const availableStates = Array.from(new Set(data.all.map(l => l.state).filter(Boolean) as string[])).sort();
  const availableAssignees = Array.from(new Set(data.all.map(l => l.last_attempted_by).filter(Boolean) as string[])).sort();

  const tabLabels: Record<string, string> = {
    queue: 'Dial', callbacks: 'Callbacks', 'intro-booked': 'Intro',
    'strategy-booked': 'Strategy', all: 'All', lost: 'Lost',
  };

  const handleLeadClick = (lead: DiscoveryLead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
  };

  const handleCallNext = (lead: DiscoveryLead) => {
    setSelectedLead(lead);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setSelectedLead(null);
  };

  const { data: stats } = useDiscoveryCallStats(agentId);
  const hasActiveFilters = filterState || filterTemp || filterAssigned;

  return (
    <>
      {/* Speed-to-Lead Scoreboard */}
      <SpeedToLeadScoreboard stats={stats} queueData={data} />

      {/* Search + Filters */}
      <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-3 sm:p-4 space-y-3 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 pointer-events-none z-10" />
          <input
            type="text"
            placeholder={`Search ${tabLabels[activeTab] || 'leads'} by name, email, phone, state...`}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            className="flex h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-10 pr-8 py-2 text-sm text-foreground placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] focus:ring-2 focus:ring-primary/15 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors z-10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {searchQuery && (
          <p className="text-[11px] text-white/30 px-1">
            Showing {activeTabFiltered} of {activeTabTotal} in {tabLabels[activeTab]}
          </p>
        )}

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3 w-3 text-white/15" />
          <Select value={filterState} onValueChange={(v) => setFilterState(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]">
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
            <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
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
            <SelectTrigger className="h-7 text-xs w-auto min-w-[110px]">
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Assignees</SelectItem>
              {availableAssignees.map((a) => (
                <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterState(''); setFilterTemp(''); setFilterAssigned(''); }}
              className="text-[10px] text-white/25 hover:text-primary transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="queue" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide -mx-1 px-1">
          <TabsTrigger value="queue" className="gap-1.5">
            <PhoneCall className="h-3.5 w-3.5" />
            Dial
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{filteredQueue.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="callbacks" className="gap-1.5">
            <PhoneForwarded className="h-3.5 w-3.5" />
            Callbacks
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{filteredCallbacks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="intro-booked" className="gap-1.5">
            <Headphones className="h-3.5 w-3.5" />
            Intro
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{filteredIntroBooked.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="strategy-booked" className="gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Strategy
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{filteredStrategyBooked.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            All
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{filteredAll.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="lost" className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            Lost
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{filteredLost.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Dial Queue */}
        <TabsContent value="queue" className="space-y-3">
          {data.failedDelivery.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] text-sm">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-red-400/80 font-medium">
                {data.failedDelivery.length} lead{data.failedDelivery.length > 1 ? 's' : ''} failed CRM delivery
              </span>
            </div>
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
                      <span className="absolute -top-1.5 -left-1 z-10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-500/90 text-white rounded">URGENT</span>
                    )}
                    {score >= 700 && score < 900 && (
                      <span className="absolute -top-1.5 -left-1 z-10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/90 text-white rounded">HIGH</span>
                    )}
                    <LeadCard lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="callbacks" className="space-y-2">
          {filteredCallbacks.length === 0 ? <EmptyState icon={PhoneForwarded} message="No callbacks scheduled" /> :
            filteredCallbacks.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />)}
        </TabsContent>

        <TabsContent value="intro-booked" className="space-y-2">
          {filteredIntroBooked.length === 0 ? <EmptyState icon={Headphones} message="No intro calls booked" /> :
            filteredIntroBooked.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />)}
        </TabsContent>

        <TabsContent value="strategy-booked" className="space-y-2">
          {filteredStrategyBooked.length === 0 ? <EmptyState icon={Video} message="No strategy calls booked" /> :
            filteredStrategyBooked.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />)}
        </TabsContent>

        <TabsContent value="all" className="space-y-2">
          {filteredAll.length === 0 ? <EmptyState icon={Users} message="No contacts found" /> :
            filteredAll.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />)}
        </TabsContent>

        <TabsContent value="lost" className="space-y-2">
          {filteredLost.length === 0 ? <EmptyState icon={XCircle} message="None" /> :
            filteredLost.map((lead) => <LeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} subaccountId={subaccountId} />)}
        </TabsContent>
      </Tabs>

      {/* Stats */}
      <details className="mt-6">
        <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-white/30 hover:text-white/60 transition-colors">
          <TrendingUp className="h-4 w-4" />
          Stats & Reports
        </summary>
        <div className="mt-4 space-y-6">
          <CallerLeaderboard agentId={agentId} />
          <DailyWeeklyReport agentId={agentId} />
        </div>
      </details>

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
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
        <Icon className="h-6 w-6 text-white/15" />
      </div>
      <p className="text-sm text-white/30">{message}</p>
    </div>
  );
}
