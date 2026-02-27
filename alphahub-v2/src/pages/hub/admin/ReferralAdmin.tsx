import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Search, 
  RefreshCw,
  ChevronDown,
  UserCheck,
  Clock,
  Gift,
  Copy,
  ExternalLink,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAllReferrals, useAllReferralRewards, useUpdateReferralStatus } from '@/hooks/useReferralData';
import { useAllReferralPartners } from '@/hooks/useReferralPartner';
import { AddReferralPartnerDialog } from '@/components/admin/AddReferralPartnerDialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  isLoading?: boolean;
}

function StatCard({ icon, label, value, color, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <Skeleton className="h-10 w-10 rounded-full mb-3" />
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50 hover:border-border transition-colors">
      <CardContent className="p-6">
        <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <p className="text-muted-foreground text-sm mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    pending: { label: 'Pending', variant: 'outline' },
    signed_up: { label: 'Signed Up', variant: 'secondary' },
    active: { label: 'Active', variant: 'default' },
    churned: { label: 'Churned', variant: 'destructive' },
  };

  const { label, variant } = config[status] || { label: status, variant: 'outline' as const };

  return <Badge variant={variant}>{label}</Badge>;
}

function RewardStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    pending: { label: 'Pending', variant: 'outline' },
    approved: { label: 'Approved', variant: 'secondary' },
    paid: { label: 'Paid', variant: 'default' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
  };

  const { label, variant } = config[status] || { label: status, variant: 'outline' as const };

  return <Badge variant={variant}>{label}</Badge>;
}

interface ReferringAgent {
  id: string;
  code: string;
  client_id: string;
  client_name: string;
  email: string;
  management_fee: number | null;
  created_at: string;
  is_active: boolean;
}

interface ReferralWithClient {
  id: string;
  referrer_client_id: string;
  referred_client_id: string | null;
  referral_code_id: string;
  referred_email: string;
  referred_name: string | null;
  status: 'pending' | 'signed_up' | 'active' | 'churned';
  referred_at: string;
  signed_up_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  referrer?: {
    id: string;
    name: string;
    email: string;
  } | null;
  referred_client?: {
    id: string;
    name: string;
    management_fee: number | null;
  } | null;
}

// Hook to fetch all referring agents with their codes
function useReferringAgents() {
  return useQuery({
    queryKey: ['referring-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_codes')
        .select(`
          id,
          code,
          client_id,
          created_at,
          is_active,
          client:clients!referral_codes_client_id_fkey(name, email, management_fee)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        code: item.code,
        client_id: item.client_id,
        client_name: (item.client as any)?.name || 'Unknown',
        email: (item.client as any)?.email || '',
        management_fee: (item.client as any)?.management_fee || null,
        created_at: item.created_at,
        is_active: item.is_active,
      })) as ReferringAgent[];
    },
  });
}

// Hook to fetch referrals with referred client info (for management fee)
function useReferralsWithClientInfo() {
  return useQuery({
    queryKey: ['referrals-with-client-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:clients!referrals_referrer_client_id_fkey(id, name, email),
          referred_client:clients!referrals_referred_client_id_fkey(id, name, management_fee)
        `)
        .order('referred_at', { ascending: false });

      if (error) throw error;
      return data as ReferralWithClient[];
    },
  });
}

export default function ReferralAdmin() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRewards, setShowRewards] = useState(false);
  const [activeTab, setActiveTab] = useState('referrals');
  const [showAddPartnerDialog, setShowAddPartnerDialog] = useState(false);

  const { data: referrals, isLoading: referralsLoading } = useReferralsWithClientInfo();
  const { data: rewards, isLoading: rewardsLoading } = useAllReferralRewards();
  const { data: referringAgents, isLoading: agentsLoading } = useReferringAgents();
  const { data: referralPartners, isLoading: partnersLoading } = useAllReferralPartners();
  const updateReferralStatus = useUpdateReferralStatus();

  const isLoading = referralsLoading || rewardsLoading;

  // Calculate stats
  const totalReferrals = referrals?.length || 0;
  const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
  const totalCommissions = rewards?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const pendingCommissions = rewards?.filter(r => r.status === 'pending' || r.status === 'approved')
    .reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  // Filter referrals
  const filteredReferrals = referrals?.filter(r => {
    const matchesSearch = searchQuery === '' ||
      r.referred_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referred_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referrer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  // Filter referring agents
  const filteredAgents = referringAgents?.filter(a => {
    return agentSearchQuery === '' ||
      a.client_name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(agentSearchQuery.toLowerCase());
  }) || [];

  // Filter referral partners
  const filteredPartners = referralPartners?.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return partnerSearchQuery === '' ||
      fullName.includes(partnerSearchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
      p.referral_code?.toLowerCase().includes(partnerSearchQuery.toLowerCase());
  }) || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['referrals-with-client-info'] });
    queryClient.invalidateQueries({ queryKey: ['all-referral-rewards'] });
    queryClient.invalidateQueries({ queryKey: ['referring-agents'] });
    queryClient.invalidateQueries({ queryKey: ['all-referral-partners'] });
  };

  const handleStatusChange = async (referralId: string, newStatus: 'pending' | 'signed_up' | 'active' | 'churned') => {
    try {
      await updateReferralStatus.mutateAsync({ referralId, status: newStatus });
      toast.success('Referral status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getReferralLink = (code: string) => {
    return `https://alphaagent.io?ref=${code}`;
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const calculateCommission = (managementFee: number | null) => {
    if (managementFee === null || managementFee === undefined) return null;
    return managementFee * 0.10;
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Referral Management</h1>
            <p className="text-sm text-muted-foreground">
              Track referrals and commission payouts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddPartnerDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Referral Partner
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={<Users className="w-5 h-5 text-primary" />}
          label="Total Referrals"
          value={totalReferrals}
          color="bg-primary/10"
          isLoading={isLoading}
        />
        <StatCard
          icon={<UserCheck className="w-5 h-5 text-green-500" />}
          label="Active Referrals"
          value={activeReferrals}
          color="bg-green-500/10"
          isLoading={isLoading}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-amber-500" />}
          label="Total Commissions"
          value={`$${totalCommissions.toFixed(2)}`}
          color="bg-amber-500/10"
          isLoading={isLoading}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          label="Pending Payout"
          value={`$${pendingCommissions.toFixed(2)}`}
          color="bg-blue-500/10"
          isLoading={isLoading}
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="agents">Referring Agents</TabsTrigger>
            <TabsTrigger value="partners">Referral Partners</TabsTrigger>
          </TabsList>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">All Referrals</CardTitle>
                    <CardDescription>
                      View and manage all referral relationships
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search referrals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="signed_up">Signed Up</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="churned">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {referralsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredReferrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referrer</TableHead>
                          <TableHead>Referred Agent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Management Fee</TableHead>
                          <TableHead>10% Commission</TableHead>
                          <TableHead>Referred At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReferrals.map((referral) => {
                          const managementFee = referral.referred_client?.management_fee || null;
                          const commission = calculateCommission(managementFee);
                          
                          return (
                            <TableRow key={referral.id}>
                              <TableCell className="font-medium">
                                {referral.referrer?.name || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{referral.referred_name || referral.referred_client?.name || '—'}</p>
                                  <p className="text-sm text-muted-foreground">{referral.referred_email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={referral.status} />
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(managementFee)}
                              </TableCell>
                              <TableCell className="font-medium text-green-500">
                                {commission !== null ? formatCurrency(commission) : '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(referral.referred_at), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={referral.status}
                                  onValueChange={(value) => handleStatusChange(
                                    referral.id, 
                                    value as 'pending' | 'signed_up' | 'active' | 'churned'
                                  )}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="signed_up">Signed Up</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="churned">Churned</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="font-medium text-foreground mb-1">No Referrals Found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'No referrals have been tracked yet'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Commission History (Collapsible) */}
            <Collapsible open={showRewards} onOpenChange={setShowRewards}>
              <Card className="bg-card/50 border-border/50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">Commission History</CardTitle>
                        <Badge variant="secondary">{rewards?.length || 0}</Badge>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${showRewards ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {rewardsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : rewards && rewards.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Referrer</TableHead>
                              <TableHead>From Agent</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rewards.map((reward) => (
                              <TableRow key={reward.id}>
                                <TableCell className="font-medium">
                                  {reward.referrer?.name || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                  {reward.referral?.referred_name || '—'}
                                </TableCell>
                                <TableCell className="font-medium text-green-500">
                                  ${Number(reward.amount).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {reward.reward_type === 'monthly_commission' ? 'Commission' : reward.reward_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {reward.period_start && reward.period_end
                                    ? `${format(new Date(reward.period_start), 'MMM d')} - ${format(new Date(reward.period_end), 'MMM d')}`
                                    : '—'}
                                </TableCell>
                                <TableCell>
                                  <RewardStatusBadge status={reward.status} />
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(reward.created_at), 'MMM d, yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <h3 className="font-medium text-foreground mb-1">No Commissions Yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Commissions will appear here when referred agents pay their fees
                        </p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>

          {/* Referring Agents Tab */}
          <TabsContent value="agents">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Referring Agents</CardTitle>
                    <CardDescription>
                      All agents with referral codes
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search agents..."
                      value={agentSearchQuery}
                      onChange={(e) => setAgentSearchQuery(e.target.value)}
                      className="pl-9 w-[250px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {agentsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredAgents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Referral Code</TableHead>
                          <TableHead>Management Fee</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAgents.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell className="font-medium">
                              {agent.client_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {agent.email}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                  {agent.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyToClipboard(agent.code)}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(agent.management_fee)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(agent.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(getReferralLink(agent.code))}
                                >
                                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                                  Copy Link
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  asChild
                                >
                                  <a 
                                    href={getReferralLink(agent.code)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="font-medium text-foreground mb-1">No Referring Agents Found</h3>
                    <p className="text-sm text-muted-foreground">
                      {agentSearchQuery 
                        ? 'Try adjusting your search'
                        : 'No agents have referral codes yet'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Partners Tab */}
          <TabsContent value="partners">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Referral Partners</CardTitle>
                    <CardDescription>
                      External referrers who earn commissions without being full clients
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search partners..."
                        value={partnerSearchQuery}
                        onChange={(e) => setPartnerSearchQuery(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    <Button onClick={() => setShowAddPartnerDialog(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Partner
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {partnersLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredPartners.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Referral Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPartners.map((partner) => (
                          <TableRow key={partner.id}>
                            <TableCell className="font-medium">
                              {partner.first_name} {partner.last_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {partner.email}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {partner.phone || '—'}
                            </TableCell>
                            <TableCell>
                              {partner.referral_code ? (
                                <div className="flex items-center gap-2">
                                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                    {partner.referral_code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => copyToClipboard(partner.referral_code!)}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={partner.is_active ? 'default' : 'secondary'}>
                                {partner.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(partner.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {partner.referral_code && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(getReferralLink(partner.referral_code!))}
                                  >
                                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                                    Copy Link
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    asChild
                                  >
                                    <a 
                                      href={getReferralLink(partner.referral_code!)} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="font-medium text-foreground mb-1">No Referral Partners Found</h3>
                    <p className="text-sm text-muted-foreground">
                      {partnerSearchQuery 
                        ? 'Try adjusting your search'
                        : 'Click "Add Referral Partner" to create one'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Add Referral Partner Dialog */}
      <AddReferralPartnerDialog 
        open={showAddPartnerDialog} 
        onOpenChange={setShowAddPartnerDialog} 
      />
    </div>
  );
}
