import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Mail, Phone, Calendar, DollarSign, TrendingUp, 
  MessageSquare, Edit2, Save, X, Loader2, Target,
  ExternalLink, MapPin, Activity, BarChart3, Users, FileText
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ClientWithPerformance, 
  Client,
  useSupportTickets, 
  useUpdateClient, 
  useUpdatePerformance,
  useCreateTicket
} from '@/hooks/useClientData';
import { usePerformancePercentage } from '@/hooks/usePerformancePercentage';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import ClientAvatar from './ClientAvatar';
import StatusBadge from './StatusBadge';
import { PackageTypeBadge } from './PackageTypeBadge';
import MetricCard from './MetricCard';

interface ClientDetailViewProps {
  client: ClientWithPerformance;
  isAdmin: boolean;
  canEdit: boolean;
}

export default function ClientDetailView({ client, isAdmin, canEdit }: ClientDetailViewProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<{
    management_fee: number;
    monthly_ad_spend: number;
    status: string;
    renewal_date: string;
  }>({
    management_fee: client.management_fee ?? 0,
    monthly_ad_spend: client.monthly_ad_spend ?? 0,
    status: client.status,
    renewal_date: client.renewal_date ?? '',
  });
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', category: 'general' });
  const [showNewTicket, setShowNewTicket] = useState(false);

  const { data: tickets, isLoading: ticketsLoading } = useSupportTickets(client.id);
  const updateClient = useUpdateClient();
  const updatePerformance = useUpdatePerformance();
  const createTicket = useCreateTicket();
  
  // Use the same computed wallet balance as the wallet widget for consistency
  const { displayedSpend: displayedMtdSpend } = useComputedWalletBalance(client.id);

  const performance = client.performance;

  // Calculate metrics dynamically using the computed spend (same as wallet)
  const calculatedMetrics = useMemo(() => {
    const mtdLeads = client.mtd_leads ?? 0;
    const bookedCalls = client.booked_calls ?? 0;
    const applications = client.applications ?? 0;

    return {
      cpl: mtdLeads > 0 ? displayedMtdSpend / mtdLeads : 0,
      cpba: bookedCalls > 0 ? displayedMtdSpend / bookedCalls : 0,
      cpa: applications > 0 ? displayedMtdSpend / applications : 0,
      leadToCallRate: mtdLeads > 0 ? (bookedCalls / mtdLeads) * 100 : 0,
      callToAppRate: bookedCalls > 0 ? (applications / bookedCalls) * 100 : 0,
    };
  }, [client, displayedMtdSpend]);

  const handleSave = async () => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        ...formData,
      });
      toast.success('Client updated successfully');
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to update client');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        status: newStatus,
      });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePackageTypeChange = async (newPackageType: string) => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        package_type: newPackageType,
      });
      toast.success('Package type updated');
    } catch (error) {
      toast.error('Failed to update package type');
    }
  };

  const handleFulfillmentChange = async (status: string) => {
    if (!performance) return;
    try {
      await updatePerformance.mutateAsync({
        client_id: client.id,
        fulfillment_status: status as 'green' | 'yellow' | 'red',
      });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.message) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      await createTicket.mutateAsync({
        client_id: client.id,
        subject: newTicket.subject,
        message: newTicket.message,
        category: newTicket.category,
      });
      toast.success('Ticket created');
      setNewTicket({ subject: '', message: '', category: 'general' });
      setShowNewTicket(false);
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const externalLinks = [
    { label: 'CRM', url: client.crm_link, icon: MessageSquare },
    { label: 'Scheduler', url: (client as any).scheduler_link, icon: Calendar },
    { label: 'NFIA', url: client.nfia_link, icon: BarChart3 },
    { label: 'TFWP Profile', url: (client as any).tfwp_profile_link, icon: Users },
    { label: 'Agreement', url: (client as any).agreement_link, icon: FileText },
  ].filter(link => link.url);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="frosted-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <ClientAvatar 
              name={client.name} 
              src={client.profile_image_url}
              cacheKey={(client as any).headshot_updated_at || client.updated_at}
              size="xl"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4" />
                    {client.phone}
                  </span>
                )}
                {client.states && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {client.states}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <StatusBadge 
                  status={client.status} 
                  editable={canEdit}
                  onStatusChange={handleStatusChange}
                />
                <PackageTypeBadge 
                  packageType={client.package_type ?? null}
                  editable={canEdit}
                  onPackageTypeChange={handlePackageTypeChange}
                />
                {client.team && (
                  <Badge variant="outline">{client.team}</Badge>
                )}
                {client.agent_id && (
                  <Badge variant="secondary" className="text-xs">
                    ID: {client.agent_id}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateClient.isPending}>
                    {updateClient.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* External Links */}
        {externalLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {externalLinks.map((link) => (
              <Button
                key={link.label}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => window.open(link.url!, '_blank')}
              >
                <link.icon className="w-3 h-3 mr-1" />
                {link.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="frosted-card p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="frosted-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Management Fee</span>
              </div>
              {editMode ? (
                <Input
                  type="number"
                  value={formData.management_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, management_fee: Number(e.target.value) }))}
                  className="bg-background/50"
                />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(client.management_fee ?? 0)}</p>
              )}
            </div>

            <div className="frosted-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Ad Spend Budget</span>
              </div>
              {editMode ? (
                <Input
                  type="number"
                  value={formData.monthly_ad_spend}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_ad_spend: Number(e.target.value) }))}
                  className="bg-background/50"
                />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(client.ad_spend_budget ?? client.monthly_ad_spend ?? 0)}</p>
              )}
            </div>

            <div className="frosted-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Renewal Date</span>
              </div>
              {editMode ? (
                <Input
                  type="date"
                  value={formData.renewal_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, renewal_date: e.target.value }))}
                  className="bg-background/50"
                />
              ) : (
                <p className="text-2xl font-bold">
                  {client.renewal_date 
                    ? format(parseISO(client.renewal_date), 'MMM d, yyyy')
                    : '—'}
                </p>
              )}
            </div>

            <div className="frosted-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <span className="text-sm">Status</span>
              </div>
              {editMode ? (
                <Select
                  value={formData.status}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={client.status} />
              )}
            </div>
          </div>

          {/* MTD Stats */}
          <div className="frosted-card p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Month-to-Date Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">MTD Spend</p>
                <p className="text-lg font-semibold">{formatCurrency(displayedMtdSpend)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MTD Leads</p>
                <p className="text-lg font-semibold">{client.mtd_leads ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Booked Calls</p>
                <p className="text-lg font-semibold">{client.booked_calls ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Applications</p>
                <p className="text-lg font-semibold">{client.applications ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Delivered</p>
                <p className="text-lg font-semibold">{client.total_delivered ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ads Live</p>
                <Badge variant={client.ads_live ? 'default' : 'secondary'}>
                  {client.ads_live ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Calculated Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Cost Per Lead"
              value={formatCurrency(calculatedMetrics.cpl)}
              icon={DollarSign}
              trend={calculatedMetrics.cpl < 50 ? 'up' : calculatedMetrics.cpl > 100 ? 'down' : undefined}
            />
            <MetricCard
              title="Cost Per Booked Call"
              value={formatCurrency(calculatedMetrics.cpba)}
              icon={Phone}
            />
            <MetricCard
              title="Cost Per Application"
              value={formatCurrency(calculatedMetrics.cpa)}
              icon={Target}
            />
            <MetricCard
              title="Lead→Call Rate"
              value={`${calculatedMetrics.leadToCallRate.toFixed(1)}%`}
              icon={TrendingUp}
            />
            <MetricCard
              title="Call→App Rate"
              value={`${calculatedMetrics.callToAppRate.toFixed(1)}%`}
              icon={BarChart3}
            />
          </div>

          {/* Raw Performance Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Leads Delivered"
              value={performance?.leads_delivered_this_month ?? client.mtd_leads ?? 0}
              icon={TrendingUp}
              trend="up"
            />
            <MetricCard
              title="Booked Calls"
              value={performance?.booked_calls_this_month ?? client.booked_calls ?? 0}
              icon={Phone}
            />
            <MetricCard
              title="NPS Score"
              value={client.nps_score ?? '—'}
              icon={Activity}
              trend={client.nps_score && client.nps_score >= 8 ? 'up' : client.nps_score && client.nps_score < 7 ? 'down' : undefined}
            />
          </div>

          {isAdmin && performance && (
            <div className="frosted-card p-6">
              <h3 className="font-semibold mb-4">Fulfillment Status</h3>
              <Select
                value={performance.fulfillment_status}
                onValueChange={handleFulfillmentChange}
              >
                <SelectTrigger className="w-48 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success" /> On Track
                    </span>
                  </SelectItem>
                  <SelectItem value="yellow">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" /> Needs Attention
                    </span>
                  </SelectItem>
                  <SelectItem value="red">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-alert" /> At Risk
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Support Tickets</h3>
            {!isAdmin && (
              <Button onClick={() => setShowNewTicket(!showNewTicket)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                New Ticket
              </Button>
            )}
          </div>

          {showNewTicket && (
            <div className="frosted-card p-6 space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your issue"
                  className="bg-background/50 mt-1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="bg-background/50 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="tech">Technical</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Describe your issue in detail"
                  className="bg-background/50 mt-1 min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateTicket} disabled={createTicket.isPending}>
                  {createTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Ticket
                </Button>
                <Button variant="ghost" onClick={() => setShowNewTicket(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {ticketsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="frosted-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{ticket.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {ticket.message}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={ticket.status} size="sm" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(ticket.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="frosted-card p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No support tickets yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
