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
  const liveClients = clients.filter(c => normalizeStatus(c.status) === 'active').length;
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
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor all client accounts
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
          <Button onClick={() => navigate('/hub/admin/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
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
          value={`${liveClients}/${totalClients}`}
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
      <div className="frosted-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or agent ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] bg-background/50 justify-start">
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="truncate">
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
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                        onClick={() => toggleStatus(option.value)}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full ${option.color}`} />
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-border mt-2 pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => setStatusFilter([])}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Package Type Filter (Live/Aged) */}
            <div className="flex rounded-lg border border-border/50 bg-background/50 p-0.5">
              {PACKAGE_FILTER_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = packageFilter === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setPackageFilter(option.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[140px] bg-background/50">
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
              <Label htmlFor="renewal-filter" className="text-sm text-muted-foreground whitespace-nowrap">
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
        <div className="frosted-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Clients Found</h3>
          <p className="text-muted-foreground mb-4">
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
        <div className="frosted-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Leads</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Calls</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">MTD Spend</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">CPL</th>
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
      className="frosted-card p-5 cursor-pointer hover:bg-white/5 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <ClientAvatar
            name={client.name}
            src={client.profile_image_url}
            cacheKey={(client as any).headshot_updated_at || client.updated_at}
            size="md"
          />
          {!client.profile_image_url && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center" title="No profile photo">
              <span className="text-[8px] text-white font-bold">!</span>
            </div>
          )}
          {!client.phone && (
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center" title="No phone number">
              <Phone className="w-2 h-2 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{client.name}</h3>
          
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
      {isAgedPackage ? (
        /* AGED Clients - Minimal display */
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-center">
            <Archive className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Aged Leads Package</p>
            <p className="text-xs text-muted-foreground/70 mt-1">No live ad spend tracking</p>
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
          <p className="text-[10px] text-muted-foreground mb-1">Last 30 Days</p>
          <div className="grid grid-cols-4 gap-2 text-sm mb-3">
            <div className="text-center p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CPL</p>
              <p className="font-bold text-foreground">${cpl.toFixed(0)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Leads</p>
              <p className="font-bold text-foreground">{mtdLeads}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Calls</p>
              <p className="font-bold text-foreground">{bookedCalls}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">L→C</p>
              <p className="font-bold text-foreground">{leadToCallRate.toFixed(0)}%</p>
            </div>
          </div>
          
        </>
      )}
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
      className="border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
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
