import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, ChevronDown, ChevronUp, Loader2, Search, Phone, Mail, MapPin, Calendar, Briefcase, Download, Filter, Eye, DollarSign, AlertTriangle, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useLeadsByAgent, Lead, useUpdateLeadStatus, useUpdateLeadPremium, useRemoveTestLeads, LEAD_STATUS_OPTIONS } from '@/hooks/useLeads';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeadsWidgetProps {
  agentId: string;
  clientName?: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'booked call': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  submitted: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  'issued paid': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

// Statuses that require a target premium
const PREMIUM_REQUIRED_STATUSES = ['submitted', 'approved', 'issued paid'];

// Check if a lead needs premium warning
const needsPremiumWarning = (lead: Lead): boolean => {
  return PREMIUM_REQUIRED_STATUSES.includes(lead.status) && (!lead.target_premium || lead.target_premium === 0);
};

export function LeadsWidget({ agentId, clientName }: LeadsWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Editable premium state
  const [editingPremium, setEditingPremium] = useState(false);
  const [premiumEditValue, setPremiumEditValue] = useState('');
  
  // Premium dialog state
  const [premiumDialog, setPremiumDialog] = useState<{
    isOpen: boolean;
    leadId: string;
    newStatus: string;
    premiumType: 'target' | 'issued';
    currentValue: number | null;
  } | null>(null);
  const [premiumInput, setPremiumInput] = useState('');

  const { data: leads = [], isLoading, refetch } = useLeadsByAgent(agentId);
  const updateStatus = useUpdateLeadStatus();
  const updatePremium = useUpdateLeadPremium();
  const removeTestLeads = useRemoveTestLeads();

  // Count test leads for button display
  const testLeadCount = leads.filter(l => 
    l.first_name?.toLowerCase().includes('test') || 
    l.last_name?.toLowerCase().includes('test')
  ).length;

  const handleRemoveTestLeads = async () => {
    if (testLeadCount === 0) {
      toast.info('No test leads found');
      return;
    }
    
    try {
      const count = await removeTestLeads.mutateAsync(agentId);
      toast.success(`Removed ${count} test lead${count !== 1 ? 's' : ''}`);
    } catch (error) {
      toast.error('Failed to remove test leads');
    }
  };
  
  // Sync selected lead with latest data
  useEffect(() => {
    if (selectedLead) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads, selectedLead?.id]);

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchQuery === '' || 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    bookedCall: leads.filter(l => l.status === 'booked call').length,
    submitted: leads.filter(l => l.status === 'submitted').length,
    issuedPaid: leads.filter(l => l.status === 'issued paid').length,
  };

  // Calculate premium totals
  const premiumStats = {
    totalTargetPremium: leads.reduce((sum, l) => sum + (l.target_premium || 0), 0),
    totalIssuedPremium: leads.reduce((sum, l) => sum + (l.issued_premium || 0), 0),
  };

  const handleStatusChange = (leadId: string, newStatus: string, lead: Lead) => {
    // Check if we need to prompt for premium
    if (newStatus === 'submitted') {
      setPremiumDialog({
        isOpen: true,
        leadId,
        newStatus,
        premiumType: 'target',
        currentValue: lead.target_premium,
      });
      setPremiumInput(lead.target_premium?.toString() || '');
    } else if (newStatus === 'issued paid') {
      setPremiumDialog({
        isOpen: true,
        leadId,
        newStatus,
        premiumType: 'issued',
        currentValue: lead.issued_premium,
      });
      setPremiumInput(lead.issued_premium?.toString() || '');
    } else {
      // No premium needed, update directly
      executeStatusUpdate(leadId, newStatus);
    }
  };

  const executeStatusUpdate = async (
    leadId: string, 
    status: string, 
    target_premium?: number | null, 
    issued_premium?: number | null
  ) => {
    try {
      await updateStatus.mutateAsync({ 
        id: leadId, 
        status, 
        agentId,
        target_premium,
        issued_premium,
      });
      toast.success('Lead status updated & metrics recalculated');
      // Refresh the selected lead if it's the one being updated
      if (selectedLead?.id === leadId) {
        refetch();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePremiumSubmit = () => {
    if (!premiumDialog) return;
    
    const premiumValue = premiumInput ? parseFloat(premiumInput) : null;
    
    if (premiumDialog.premiumType === 'target') {
      executeStatusUpdate(premiumDialog.leadId, premiumDialog.newStatus, premiumValue, undefined);
    } else {
      executeStatusUpdate(premiumDialog.leadId, premiumDialog.newStatus, undefined, premiumValue);
    }
    
    setPremiumDialog(null);
    setPremiumInput('');
  };

  const handlePremiumSkip = () => {
    if (!premiumDialog) return;
    executeStatusUpdate(premiumDialog.leadId, premiumDialog.newStatus);
    setPremiumDialog(null);
    setPremiumInput('');
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Name', 'Email', 'Phone', 'State', 'Status', 'Source', 'Target Premium', 'Issued Premium'];
    const rows = filteredLeads.map(lead => [
      lead.lead_date ? format(new Date(lead.lead_date), 'MM/dd/yyyy') : '',
      `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      lead.email || '',
      lead.phone || '',
      lead.state || '',
      lead.status,
      lead.lead_source || '',
      lead.target_premium?.toString() || '',
      lead.issued_premium?.toString() || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${agentId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  if (isLoading) {
    return (
      <div className="frosted-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="frosted-card overflow-hidden">
          {/* Header */}
          <CollapsibleTrigger asChild>
            <div className="p-4 bg-gradient-to-r from-blue-500/20 via-blue-600/10 to-transparent cursor-pointer hover:from-blue-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Leads</h3>
                    <p className="text-xs text-muted-foreground">
                      {stats.total} total · {stats.new} new · {stats.issuedPaid} closed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {premiumStats.totalIssuedPremium > 0 && (
                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-400">{formatCurrency(premiumStats.totalIssuedPremium)}</span>
                      <p className="text-xs text-muted-foreground">Issued Premium</p>
                    </div>
                  )}
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-400">{stats.total}</span>
                    <p className="text-xs text-muted-foreground">Total Leads</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-4 space-y-4">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {LEAD_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={exportToCSV} title="Export CSV">
                  <Download className="w-4 h-4" />
                </Button>
                {testLeadCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRemoveTestLeads}
                    disabled={removeTestLeads.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title={`Remove ${testLeadCount} test lead(s)`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Test ({testLeadCount})
                  </Button>
                )}
              </div>

              {/* Leads List */}
              {filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {leads.length === 0 ? 'No leads yet for this agent.' : 'No leads match your filters.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredLeads.slice(0, 50).map((lead) => {
                    const showWarning = needsPremiumWarning(lead);
                    return (
                      <div
                        key={lead.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors cursor-pointer",
                          showWarning && "border-red-500/50 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                        )}
                        onClick={() => {
                          setSelectedLead(lead);
                          setEditingPremium(false);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">
                              {lead.first_name} {lead.last_name}
                            </span>
                            <Badge variant="outline" className={cn('text-xs', statusColors[lead.status] || statusColors.new)}>
                              {lead.status}
                            </Badge>
                            {showWarning && (
                              <Badge variant="destructive" className="text-xs gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                Add Premium
                              </Badge>
                            )}
                            {lead.target_premium && lead.target_premium > 0 && (
                              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
                                Target: {formatCurrency(lead.target_premium)}
                              </Badge>
                            )}
                            {lead.issued_premium && lead.issued_premium > 0 && (
                              <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-400">
                                Issued: {formatCurrency(lead.issued_premium)}
                              </Badge>
                            )}
                          </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          )}
                          {lead.state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {lead.state}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.lead_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(lead.lead_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                  {filteredLeads.length > 50 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Showing 50 of {filteredLeads.length} leads
                    </p>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              {/* Name & Status */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {selectedLead.first_name} {selectedLead.last_name}
                </h3>
                <Select
                  value={selectedLead.status}
                  onValueChange={(value) => handleStatusChange(selectedLead.id, value, selectedLead)}
                >
                  <SelectTrigger className={cn('w-[140px]', statusColors[selectedLead.status] || statusColors.new)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Premium Warning Banner */}
              {needsPremiumWarning(selectedLead) && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">Target Premium Required</p>
                    <p className="text-xs text-red-400/80">Please enter the target premium amount for this lead.</p>
                  </div>
                </div>
              )}

              {/* Premium Info - Editable */}
              <div className="grid grid-cols-2 gap-3">
                {/* Target Premium - Always show for submitted+ statuses, editable */}
                <div className={cn(
                  "p-3 rounded-lg border",
                  needsPremiumWarning(selectedLead) 
                    ? "bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                    : "bg-purple-500/10 border-purple-500/20"
                )}>
                  <label className={cn(
                    "text-xs flex items-center gap-1",
                    needsPremiumWarning(selectedLead) ? "text-red-400" : "text-purple-400"
                  )}>
                    <DollarSign className="w-3 h-3" /> Target Premium
                  </label>
                  {editingPremium ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input
                          type="number"
                          value={premiumEditValue}
                          onChange={(e) => setPremiumEditValue(e.target.value)}
                          className="pl-6 h-8 text-sm"
                          placeholder="0"
                          autoFocus
                        />
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-green-400 hover:text-green-300"
                        onClick={async () => {
                          const value = parseFloat(premiumEditValue) || 0;
                          try {
                            await updatePremium.mutateAsync({
                              lead: selectedLead,
                              target_premium: value,
                              agentId,
                            });
                            toast.success('Target premium updated');
                            setEditingPremium(false);
                            refetch();
                          } catch (error) {
                            toast.error('Failed to update premium');
                          }
                        }}
                        disabled={updatePremium.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingPremium(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-1">
                      <p className={cn(
                        "text-lg font-semibold",
                        needsPremiumWarning(selectedLead) ? "text-red-400" : "text-purple-400"
                      )}>
                        {selectedLead.target_premium ? formatCurrency(selectedLead.target_premium) : '$0'}
                      </p>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => {
                          setPremiumEditValue(selectedLead.target_premium?.toString() || '');
                          setEditingPremium(true);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Issued Premium */}
                {selectedLead.issued_premium && selectedLead.issued_premium > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <label className="text-xs text-emerald-400 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Issued Premium
                    </label>
                    <p className="text-lg font-semibold text-emerald-400">{formatCurrency(selectedLead.issued_premium)}</p>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <p className="text-sm font-medium">{selectedLead.email || '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <p className="text-sm font-medium">{selectedLead.phone || '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <label className="text-xs text-muted-foreground">State</label>
                  <p className="text-sm font-medium">{selectedLead.state || '-'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <label className="text-xs text-muted-foreground">Age</label>
                  <p className="text-sm font-medium">{selectedLead.age || '-'}</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                {selectedLead.employment && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Employment
                    </label>
                    <p className="text-sm">{selectedLead.employment}</p>
                  </div>
                )}
                {selectedLead.interest && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <label className="text-xs text-muted-foreground">Interest</label>
                    <p className="text-sm">{selectedLead.interest}</p>
                  </div>
                )}
                {selectedLead.savings && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <label className="text-xs text-muted-foreground">Savings Range</label>
                    <p className="text-sm">{selectedLead.savings}</p>
                  </div>
                )}
                {selectedLead.investments && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <label className="text-xs text-muted-foreground">Current Investments</label>
                    <p className="text-sm">{selectedLead.investments}</p>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                {selectedLead.lead_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Lead Date: {format(new Date(selectedLead.lead_date), 'MMM d, yyyy')}
                  </span>
                )}
                {selectedLead.lead_source && (
                  <span>Source: {selectedLead.lead_source}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Premium Input Dialog */}
      <Dialog open={!!premiumDialog?.isOpen} onOpenChange={() => setPremiumDialog(null)}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {premiumDialog?.premiumType === 'target' ? 'Target Premium Amount' : 'Issued Premium Amount'}
            </DialogTitle>
            <DialogDescription>
              {premiumDialog?.premiumType === 'target' 
                ? 'Enter the target premium amount for this application submission.'
                : 'Enter the actual premium amount for this issued policy.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="premium">Premium Amount ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="premium"
                  type="number"
                  placeholder="0.00"
                  value={premiumInput}
                  onChange={(e) => setPremiumInput(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handlePremiumSkip}>
              Skip
            </Button>
            <Button onClick={handlePremiumSubmit} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? 'Saving...' : 'Save & Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
