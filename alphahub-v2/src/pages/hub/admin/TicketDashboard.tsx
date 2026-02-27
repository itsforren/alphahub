import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket, 
  Filter, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Circle,
  Loader2,
  User,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  Timer,
  Users,
  Search,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useAllTickets, 
  useTicketMetrics, 
  useAssignTicket, 
  useUpdateTicket,
  useTicketRealtime,
  getSLAStatus,
  formatSLACountdown,
  TicketFilters,
  TicketWithDetails
} from '@/hooks/useTicketDashboard';
import { useSupportAgents } from '@/hooks/useSupportAgents';
import { useChatSLAMetrics } from '@/hooks/useChatSLAMetrics';
import { CreateInternalTicketDialog } from '@/components/admin/CreateInternalTicketDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Helper to format ticket number as TKT-XXXX
function formatTicketNumber(ticketNumber: number | null): string {
  if (!ticketNumber) return 'TKT-????';
  return `TKT-${ticketNumber.toString().padStart(4, '0')}`;
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Circle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Loader2 },
  waiting: { label: 'Waiting', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Clock },
  resolved: { label: 'Closed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', color: 'bg-blue-500/20 text-blue-400' },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-400' },
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400' },
};

const CATEGORY_CONFIG = {
  billing: { label: 'Billing', color: 'bg-emerald-500/20 text-emerald-400' },
  tech: { label: 'Technical', color: 'bg-blue-500/20 text-blue-400' },
  leads: { label: 'Leads', color: 'bg-purple-500/20 text-purple-400' },
  onboarding: { label: 'Onboarding', color: 'bg-cyan-500/20 text-cyan-400' },
  other: { label: 'Other', color: 'bg-muted text-muted-foreground' },
};

function MetricCard({ title, value, icon: Icon, variant }: { 
  title: string; 
  value: number; 
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const bgColors = {
    default: 'bg-card',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    danger: 'bg-red-500/10 border-red-500/20',
    success: 'bg-green-500/10 border-green-500/20',
  };

  const iconColors = {
    default: 'text-muted-foreground',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
    success: 'text-green-400',
  };

  return (
    <Card className={cn('border', bgColors[variant || 'default'])}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg bg-white/5', iconColors[variant || 'default'])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketCard({ ticket, onStatusChange, onAssign }: {
  ticket: TicketWithDetails;
  onStatusChange: (ticketId: string, status: string) => void;
  onAssign: (ticketId: string, assigneeId: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { data: agents } = useSupportAgents();
  
  const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
  const priorityConfig = PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
  const categoryConfig = CATEGORY_CONFIG[ticket.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other;
  const slaStatus = getSLAStatus(ticket.sla_deadline, ticket.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {/* SLA Indicator */}
          <div className={cn(
            'w-1 h-full min-h-[60px] rounded-full',
            slaStatus === 'overdue' && 'bg-red-500',
            slaStatus === 'approaching' && 'bg-yellow-500',
            slaStatus === 'ok' && 'bg-green-500',
            !slaStatus && 'bg-muted'
          )} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-muted text-muted-foreground font-mono text-xs">
                {formatTicketNumber(ticket.ticket_number)}
              </Badge>
              <h3 className="font-medium truncate">{ticket.subject}</h3>
              <Badge variant="outline" className={categoryConfig.color}>
                {categoryConfig.label}
              </Badge>
              <Badge variant="outline" className={priorityConfig.color}>
                {priorityConfig.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={ticket.client?.profile_image_url || undefined} />
                  <AvatarFallback className="text-[8px] bg-primary/20">
                    {ticket.client?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                {ticket.client?.name || 'Unknown'}
              </span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
              {ticket.sla_deadline && ticket.status !== 'resolved' && (
                <>
                  <span>•</span>
                  <span className={cn(
                    'flex items-center gap-1',
                    slaStatus === 'overdue' && 'text-red-400',
                    slaStatus === 'approaching' && 'text-yellow-400',
                  )}>
                    <Clock className="w-3 h-3" />
                    SLA: {formatSLACountdown(ticket.sla_deadline)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusConfig.color}>
              <StatusIcon className={cn('w-3 h-3 mr-1', ticket.status === 'in_progress' && 'animate-spin')} />
              {statusConfig.label}
            </Badge>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="p-4 space-y-4">
              {/* Message */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Select 
                    value={ticket.status} 
                    onValueChange={(value) => onStatusChange(ticket.id, value)}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="resolved">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Assigned:</span>
                  <Select 
                    value={ticket.assigned_to || 'unassigned'} 
                    onValueChange={(value) => onAssign(ticket.id, value === 'unassigned' ? null : value)}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agents?.filter(agent => agent.user_id).map((agent) => (
                        <SelectItem key={agent.user_id} value={agent.user_id!}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/hub/admin/clients/${ticket.client_id}`)}
                  className="ml-auto"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Client
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TicketDashboard() {
  // Default to hide resolved/closed tickets
  const [filters, setFilters] = useState<TicketFilters>({ status: 'active' });
  const [searchQuery, setSearchQuery] = useState('');
  const { data: tickets, isLoading: ticketsLoading, refetch } = useAllTickets(filters);
  const { data: metrics, isLoading: metricsLoading } = useTicketMetrics();
  const { data: agents } = useSupportAgents();
  const { data: chatSLAMetrics, isLoading: slaMetricsLoading } = useChatSLAMetrics();
  const updateTicket = useUpdateTicket();
  const assignTicket = useAssignTicket();

  // Enable realtime updates
  useTicketRealtime();

  // Filter tickets by search query (ticket number)
  const filteredTickets = tickets?.filter(ticket => {
    if (!searchQuery) return true;
    const ticketId = formatTicketNumber(ticket.ticket_number).toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return ticketId.includes(searchLower) || 
           ticket.subject.toLowerCase().includes(searchLower) ||
           ticket.client?.name?.toLowerCase().includes(searchLower);
  });

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await updateTicket.mutateAsync({ id: ticketId, status });
      toast.success('Ticket status updated');
    } catch (error) {
      toast.error('Failed to update ticket status');
    }
  };

  const handleAssign = async (ticketId: string, assigneeId: string | null) => {
    try {
      await assignTicket.mutateAsync({ ticketId, assigneeId });
      toast.success(assigneeId ? 'Ticket assigned' : 'Ticket unassigned');
    } catch (error) {
      toast.error('Failed to assign ticket');
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            Support Tickets
          </h1>
          <p className="text-muted-foreground">Manage and track all support tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateInternalTicketDialog />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics */}
      {metricsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard title="Total Tickets" value={metrics.total} icon={Ticket} />
          <MetricCard title="Open" value={metrics.open} icon={Circle} />
          <MetricCard title="In Progress" value={metrics.in_progress} icon={Loader2} />
          <MetricCard title="Waiting" value={metrics.waiting} icon={Clock} />
          <MetricCard 
            title="Approaching SLA" 
            value={metrics.approaching_sla} 
            icon={AlertTriangle}
            variant={metrics.approaching_sla > 0 ? 'warning' : 'default'}
          />
          <MetricCard 
            title="Overdue" 
            value={metrics.overdue} 
            icon={AlertTriangle}
            variant={metrics.overdue > 0 ? 'danger' : 'default'}
          />
        </div>
      )}

      {/* Chat Response SLA Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Chat Response SLA (Last 30 Days)
            <Badge variant="outline" className="ml-auto text-xs">
              EST Business Hours: 9AM-5PM Mon-Fri
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slaMetricsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : chatSLAMetrics ? (
            <div className="space-y-4">
              {/* Overview metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Timer className="w-4 h-4" />
                    <span className="text-xs">Avg Response</span>
                  </div>
                  <p className="text-xl font-bold">
                    {chatSLAMetrics.averageResponseMinutes}m
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs">SLA Compliance</span>
                  </div>
                  <p className={cn(
                    "text-xl font-bold",
                    chatSLAMetrics.slaCompliancePercent >= 90 ? "text-green-400" :
                    chatSLAMetrics.slaCompliancePercent >= 70 ? "text-yellow-400" :
                    "text-red-400"
                  )}>
                    {chatSLAMetrics.slaCompliancePercent}%
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs">Responses</span>
                  </div>
                  <p className="text-xl font-bold">
                    {chatSLAMetrics.respondedMessages}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Within 30m Target</span>
                  </div>
                  <p className="text-xl font-bold text-green-400">
                    {chatSLAMetrics.withinSLACount}
                  </p>
                </div>
              </div>

              {/* Agent breakdown */}
              {chatSLAMetrics.agentMetrics.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Customer Service Agent Performance
                  </h4>
                  <div className="grid gap-2">
                    {chatSLAMetrics.agentMetrics.map((agent) => (
                      <div 
                        key={agent.agentId}
                        className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary/20">
                              {agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{agent.agentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {agent.totalResponses} responses
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="font-medium">{agent.averageResponseMinutes}m avg</p>
                            <p className="text-xs text-muted-foreground">response time</p>
                          </div>
                          <Badge variant="outline" className={cn(
                            agent.slaCompliancePercent >= 90 ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            agent.slaCompliancePercent >= 70 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            "bg-red-500/20 text-red-400 border-red-500/30"
                          )}>
                            {agent.slaCompliancePercent}% SLA
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chatSLAMetrics.agentMetrics.length === 0 && chatSLAMetrics.respondedMessages === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No chat response data available for the last 30 days.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Unable to load chat SLA metrics.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search by ticket ID */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search TKT-0001 or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[220px]"
              />
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select 
              value={filters.status || 'active'} 
              onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="resolved">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.category || 'all'} 
              onValueChange={(value) => setFilters(f => ({ ...f, category: value }))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="tech">Technical</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.priority || 'all'} 
              onValueChange={(value) => setFilters(f => ({ ...f, priority: value }))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.assigned_to || 'all'} 
              onValueChange={(value) => setFilters(f => ({ ...f, assigned_to: value }))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents?.filter(agent => agent.user_id).map((agent) => (
                  <SelectItem key={agent.user_id} value={agent.user_id!}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.sla_status || 'all'} 
              onValueChange={(value) => setFilters(f => ({ ...f, sla_status: value as any }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="SLA Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SLA</SelectItem>
                <SelectItem value="approaching">Approaching</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            {Object.keys(filters).some(k => filters[k as keyof TicketFilters] && filters[k as keyof TicketFilters] !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setFilters({})}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket List with Scrollability */}
      {ticketsLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredTickets?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tickets found</h3>
            <p className="text-muted-foreground">
              {searchQuery || Object.keys(filters).some(k => filters[k as keyof TicketFilters] && filters[k as keyof TicketFilters] !== 'active')
                ? 'Try adjusting your search or filters' 
                : 'No active support tickets'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets?.map((ticket) => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket}
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}
    </div>
  );
}
