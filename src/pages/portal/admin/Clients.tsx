import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Users, 
  DollarSign,
  TrendingUp,
  Calendar,
  Phone,
  RefreshCw,
  Settings,
  BarChart3,
  AlertTriangle,
  Check,
  UserPlus,
  Wallet,
  Zap,
  Archive
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useClients, Client, useUpdateClient } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MetricCard from '@/components/portal/MetricCard';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import StatusBadge from '@/components/portal/StatusBadge';
import { PackageTypeBadge } from '@/components/portal/PackageTypeBadge';
import ClientAvatar from '@/components/portal/ClientAvatar';
import { CompactWalletWidget } from '@/components/portal/CompactWalletWidget';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { usePerformancePercentage, applyPerformancePercentage } from '@/hooks/usePerformancePercentage';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'active', label: 'ACTIVE', color: 'bg-green-600' },
  { value: 'inactive', label: 'INACTIVE', color: 'bg-amber-500' },
  { value: 'paused', label: 'PAUSED', color: 'bg-slate-500' },
  { value: 'onboarding', label: 'ONBOARDING', color: 'bg-blue-600' },
  { value: 'pending reactivation', label: 'PENDING REACTIVATION', color: 'bg-slate-400' },
] as const;

const PACKAGE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Clients', icon: Users },
  { value: 'live', label: 'Live Leads', icon: Zap },
  { value: 'aged', label: 'Aged Leads', icon: Archive },
] as const;

// Safe date parsing helper
function safeParseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

function normalizeStatus(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return 'active';

  if (s.includes('pending') && s.includes('react')) return 'pending reactivation';
  if (s.includes('onboard')) return 'onboarding';
  if (s.includes('pause')) return 'paused';
  if (s.includes('inact')) return 'inactive';
  if (s === 'live' || s.includes('active')) return 'active';

  return s;
}

function safeDifferenceInDays(dateStr: string | null): number | null {
  const date = safeParseDate(dateStr);
  if (!date) return null;
  return differenceInDays(date, new Date());
}

export default function PortalAdminClients() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading, isFetching, refetch, error } = useClients();
  const { data: performancePercentage = 7 } = usePerformancePercentage();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['active', 'onboarding']);
  const [packageFilter, setPackageFilter] = useState<'all' | 'live' | 'aged'>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [renewalFilter, setRenewalFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('portal-clients-view');
    return (saved as 'grid' | 'list') || 'grid';
  });

  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('portal-clients-view', mode);
  };

  const toggleStatus = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      (client.agent_id?.toLowerCase() || '').includes(query);
    
    // Package type filter (Live vs Aged)
    const clientPackage = client.package_type?.toLowerCase() || '';
    const isAged = clientPackage === 'aged';
    const matchesPackage = packageFilter === 'all' || 
      (packageFilter === 'aged' && isAged) || 
      (packageFilter === 'live' && !isAged);
    
    const clientStatus = normalizeStatus(client.status);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(clientStatus);
    
    const renewalDays = safeDifferenceInDays(client.renewal_date);
    const matchesRenewal = !renewalFilter || (renewalDays !== null && renewalDays <= 7 && renewalDays >= 0);

    return matchesSearch && matchesStatus && matchesPackage && matchesRenewal;
  }).sort((a, b) => {
    switch (sortField) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      case 'leads':
        return (b.mtd_leads ?? 0) - (a.mtd_leads ?? 0);
      case 'spend':
        return (b.monthly_ad_spend ?? 0) - (a.monthly_ad_spend ?? 0);
      case 'renewal':
        const aDate = a.renewal_date ? new Date(a.renewal_date).getTime() : Infinity;
        const bDate = b.renewal_date ? new Date(b.renewal_date).getTime() : Infinity;
        return aDate - bDate;
      default:
        return 0;
    }
  });

  const totalClients = clients.length;
  const activeClients = clients.filter(c => normalizeStatus(c.status) === 'active').length;
  const onboardingClients = clients.filter(c => normalizeStatus(c.status) === 'onboarding').length;
  // Apply performance percentage to total MTD spend
  const totalMTDSpend = useMemo(() => {
    const rawTotal = clients.reduce((sum, c) => sum + (c.mtd_ad_spend ?? 0), 0);
    return applyPerformancePercentage(rawTotal, performancePercentage);
  }, [clients, performancePercentage]);
  const avgCPL = clients.length > 0 
    ? clients.reduce((sum, c) => sum + (c.cpl ?? 0), 0) / clients.filter(c => (c.cpl ?? 0) > 0).length || 0
    : 0;
  const avgCPBA = clients.length > 0 
    ? clients.reduce((sum, c) => sum + (c.cpba ?? 0), 0) / clients.filter(c => (c.cpba ?? 0) > 0).length || 0
    : 0;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        <Skeleton className="h-10 w-48 rounded-xl bg-white/[0.04]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.03]" />)}
        </div>
        <Skeleton className="h-16 rounded-2xl bg-white/[0.02]" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl bg-white/[0.03]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Clients</h1>
          <p className="text-sm text-white/35 mt-0.5">
            {activeClients} active &middot; {onboardingClients} onboarding &middot; {totalClients} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/hub/admin/clients/archived')}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <LiquidMetalButton label="Settings" onClick={() => navigate('/hub/admin/settings')} />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clients"
          value={`${activeClients + onboardingClients}`}
          icon={Users}
        />
        <MetricCard
          title="MTD Ad Spend"
          value={`$${totalMTDSpend.toLocaleString()}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Avg CPL"
          value={`$${avgCPL.toFixed(2)}`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Avg CPBA"
          value={`$${avgCPBA.toFixed(2)}`}
          icon={Phone}
        />
      </div>

      {/* Filters Bar */}
      <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-4 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="flex flex-col lg:flex-row gap-4 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <Input
              placeholder="Search by name, email, or agent ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start">
                  <Filter className="w-4 h-4 mr-2 text-white/30" />
                  <span className="truncate text-white/60">
                    {statusFilter.length === 0
                      ? 'All Status'
                      : statusFilter.length === STATUS_OPTIONS.length
                        ? 'All Status'
                        : `${statusFilter.length} selected`}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="start">
                <div className="space-y-1">
                  {STATUS_OPTIONS.map((option) => {
                    const isSelected = statusFilter.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
                        onClick={() => toggleStatus(option.value)}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-white/20'}`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className={`w-2 h-2 rounded-full ${option.color}`} />
                        <span className="text-sm font-medium text-white/70">{option.label}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-white/[0.06] mt-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-white/40"
                      onClick={() => setStatusFilter([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Package Type Filter (Live/Aged) */}
            <div className="flex rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5">
              {PACKAGE_FILTER_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = packageFilter === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setPackageFilter(option.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-white/[0.08] text-white/90 shadow-sm'
                        : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="spend">Ad Spend</SelectItem>
                <SelectItem value="renewal">Renewal Date</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch
                id="renewal-filter"
                checked={renewalFilter}
                onCheckedChange={setRenewalFilter}
              />
              <Label htmlFor="renewal-filter" className="text-sm text-white/35 whitespace-nowrap">
                Renewals ≤7d
              </Label>
            </div>

            <div className="flex gap-1 ml-auto">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => handleViewChange('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => handleViewChange('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Display */}
      {filteredClients.length === 0 ? (
        <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-16 text-center overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
            <Users className="w-7 h-7 text-white/20" />
          </div>
          <h3 className="text-lg font-medium text-white/70 mb-2">No Clients Found</h3>
          <p className="text-sm text-white/30 mb-6 max-w-sm mx-auto">
            {searchQuery || statusFilter.length > 0 || renewalFilter
              ? 'Try adjusting your filters'
              : 'Get started by importing clients or setting up the onboarding webhook'}
          </p>
          <Button onClick={() => navigate('/hub/admin/settings')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Import Clients
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left p-4 text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">Client</th>
                  <th className="text-left p-4 text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">Status</th>
                  <th className="text-left p-4 text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">Leads</th>
                  <th className="text-left p-4 text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">Calls</th>
                  <th className="text-left p-4 text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">MTD Spend</th>
                  <th className="text-left p-4 text-[11px] font-medium uppercase tracking-[0.12em] text-white/30">CPL</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <ClientRow key={client.id} client={client} performancePercentage={performancePercentage} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientCard({ client }: { client: Client }) {
  const navigate = useNavigate();
  const updateClient = useUpdateClient();

  // Fetch most recent paid management fee
  const { data: recentMgmtFee } = useQuery({
    queryKey: ['recent-mgmt-fee', client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_records')
        .select('amount, paid_at')
        .eq('client_id', client.id)
        .eq('billing_type', 'management')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data?.amount ?? null;
    },
  });

  // Use the computed wallet balance hook which applies performance percentage
  const { 
    totalDeposits, 
    displayedSpend, 
    remainingBalance, 
    trackingStartDate 
  } = useComputedWalletBalance(client.id);

  // Fetch wallet threshold
  const { data: walletData } = useQuery({
    queryKey: ['client-wallet-threshold', client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_wallets')
        .select('low_balance_threshold')
        .eq('client_id', client.id)
        .maybeSingle();
      return data;
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateClient.mutateAsync({ clientId: client.id, updates: { status: newStatus } });
    } catch {
      // handled by hook toast
    }
  };

  const handlePackageTypeChange = async (newType: string) => {
    try {
      await updateClient.mutateAsync({ clientId: client.id, updates: { package_type: newType } });
    } catch {
      // handled by hook toast
    }
  };

  const walletBalance = remainingBalance;
  const walletThreshold = walletData?.low_balance_threshold ?? 150;
  const walletDeposits = totalDeposits;
  const walletTrackedSpend = displayedSpend;
  const walletTrackingDate = trackingStartDate;
  const managementFee = recentMgmtFee ?? 0;
  const isAgedPackage = client.package_type?.toLowerCase() === 'aged';
  
  // Calculate metrics
  const mtdLeads = client.mtd_leads ?? 0;
  const bookedCalls = client.booked_calls ?? 0;
  const cpl = mtdLeads > 0 ? (client.mtd_ad_spend ?? 0) / mtdLeads : 0;
  const leadToCallRate = mtdLeads > 0 ? (bookedCalls / mtdLeads) * 100 : 0;

  // Format renewal dates
  const formatRenewalDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    try {
      return format(new Date(dateStr), 'MMM d');
    } catch {
      return 'Invalid';
    }
  };

  return (
    <div
      onClick={() => navigate(`/hub/admin/clients/${client.id}`)}
      className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 cursor-pointer transition-all duration-300 group hover:border-white/[0.1] hover:bg-white/[0.04] overflow-hidden"
    >
      {/* Top edge shine */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      {/* Hover glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.03] rounded-full blur-3xl translate-x-12 -translate-y-12 group-hover:bg-primary/[0.07] transition-colors duration-500" />

      {/* Header */}
      <div className="flex items-start gap-4 mb-4 relative z-10">
        <div className="relative">
          <ClientAvatar
            name={client.name}
            src={client.profile_image_url}
            cacheKey={(client as any).headshot_updated_at || client.updated_at}
            size="md"
          />
          {!client.profile_image_url && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center ring-2 ring-[rgba(8,8,8,0.9)]" title="No profile photo">
              <span className="text-[8px] text-white font-bold">!</span>
            </div>
          )}
          {!client.phone && (
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center ring-2 ring-[rgba(8,8,8,0.9)]" title="No phone number">
              <Phone className="w-2 h-2 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white/90 truncate group-hover:text-white transition-colors">{client.name}</h3>

        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            status={client.status}
            size="sm"
            editable
            onStatusChange={handleStatusChange}
          />
          <PackageTypeBadge
            packageType={client.package_type}
            editable
            onPackageTypeChange={handlePackageTypeChange}
          />
        </div>
      </div>

      {/* Content based on package type */}
      <div className="relative z-10">
        {isAgedPackage ? (
          /* AGED Clients - Minimal display */
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
              <Archive className="w-7 h-7 mx-auto text-white/15 mb-2" />
              <p className="text-sm font-medium text-white/40">Aged Leads Package</p>
              <p className="text-xs text-white/20 mt-1">No live ad spend tracking</p>
            </div>
          </div>
        ) : (
          /* LIVE Clients - Full metrics */
          <>
            {/* Compact Wallet Widget */}
            <div className="mb-4">
              <CompactWalletWidget
                remainingBalance={walletBalance}
                trackedSpend={walletTrackedSpend}
                totalDeposits={walletDeposits}
                threshold={walletThreshold}
                trackingStartDate={walletTrackingDate}
              />
            </div>

            {/* Key Metrics */}
            <p className="text-[10px] text-white/25 mb-1.5 uppercase tracking-[0.1em]">Last 30 Days</p>
            <div className="grid grid-cols-4 gap-1.5 text-sm mb-3">
              <div className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors">
                <p className="text-[9px] text-white/25 uppercase tracking-wider">CPL</p>
                <p className="font-semibold text-white/80 mt-0.5">${cpl.toFixed(0)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors">
                <p className="text-[9px] text-white/25 uppercase tracking-wider">Leads</p>
                <p className="font-semibold text-white/80 mt-0.5">{mtdLeads}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors">
                <p className="text-[9px] text-white/25 uppercase tracking-wider">Calls</p>
                <p className="font-semibold text-white/80 mt-0.5">{bookedCalls}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-colors">
                <p className="text-[9px] text-white/25 uppercase tracking-wider">L→C</p>
                <p className="font-semibold text-white/80 mt-0.5">{leadToCallRate.toFixed(0)}%</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ClientRow({ client, performancePercentage }: { client: Client; performancePercentage: number }) {
  const navigate = useNavigate();
  const updateClient = useUpdateClient();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateClient.mutateAsync({ clientId: client.id, updates: { status: newStatus } });
    } catch {
      // handled by hook toast
    }
  };

  const handlePackageTypeChange = async (newType: string) => {
    try {
      await updateClient.mutateAsync({ clientId: client.id, updates: { package_type: newType } });
    } catch {
      // handled by hook toast
    }
  };

  // Apply performance percentage to MTD spend and CPL
  const displayedMtdSpend = applyPerformancePercentage(client.mtd_ad_spend ?? 0, performancePercentage);
  const mtdLeads = client.mtd_leads ?? 0;
  const displayedCpl = mtdLeads > 0 ? displayedMtdSpend / mtdLeads : 0;

  return (
    <tr
      onClick={() => navigate(`/hub/admin/clients/${client.id}`)}
      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ClientAvatar name={client.name} src={client.profile_image_url} cacheKey={client.updated_at} size="sm" />
            {!client.profile_image_url && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{client.name}</p>
            <p className="text-xs text-muted-foreground">{client.email}</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={client.status} size="sm" editable onStatusChange={handleStatusChange} />
          <PackageTypeBadge packageType={client.package_type} editable onPackageTypeChange={handlePackageTypeChange} />
        </div>
      </td>
      <td className="p-4 text-sm">{mtdLeads}</td>
      <td className="p-4 text-sm">{client.booked_calls ?? 0}</td>
      <td className="p-4 text-sm">${displayedMtdSpend.toLocaleString()}</td>
      <td className="p-4 text-sm">${displayedCpl.toFixed(2)}</td>
    </tr>
  );
}
