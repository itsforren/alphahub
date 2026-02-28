import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Phone, 
  Mail, 
  Building, 
  Calendar, 
  Clock, 
  TrendingUp, 
  MessageSquare, 
  Activity,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Mic,
  PlayCircle,
  Target,
  UserCheck,
  XCircle,
  Users,
  CreditCard,
  RefreshCw,
  Info,
  Sparkles,
  Loader2,
  MousePointerClick,
  Globe,
  Link2,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useProspectDetail, useUpdateProspect, useLogCall, CallLog, ProspectActivity } from '@/hooks/useSalesPipeline';
import { useFathomCalls, useImportFathomCall, FathomCall } from '@/hooks/useFathomCalls';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';
import { NextActionSelector, NextActionType } from './NextActionSelector';
import { DispositionModal, Disposition } from './DispositionModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { JourneyTimeline } from './JourneyTimeline';

interface ProspectDetailModalProps {
  prospectId: string | null;
  open: boolean;
  onClose: () => void;
}

// Helper to parse markdown-style bold text
function formatAiAnalysis(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function ProspectDetailModal({ prospectId, open, onClose }: ProspectDetailModalProps) {
  const { data, isLoading } = useProspectDetail(prospectId);
  const updateProspect = useUpdateProspect();
  const logCall = useLogCall();
  const { data: clients } = useClients();
  
  // Get prospect early for Fathom hook
  const prospect = data?.prospect;
  
  // Fathom calls integration - pass email and name for matching
  const [showAllFathomCalls, setShowAllFathomCalls] = useState(false);
  const { data: fathomCalls, isLoading: isFathomLoading, refetch: refetchFathom } = useFathomCalls({
    email: prospect?.email,
    name: prospect?.name,
    showAll: showAllFathomCalls,
  });
  const importFathomCall = useImportFathomCall(prospectId || '');

  // State for editable fields
  const [probability, setProbability] = useState<number>(0);
  const [dealValue, setDealValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [nextFollowUp, setNextFollowUp] = useState<string>('');
  const [intent, setIntent] = useState<string>('unsure');
  const [qualStatus, setQualStatus] = useState<string>('unreviewed');
  const [disqualReason, setDisqualReason] = useState<string>('');
  const [callType, setCallType] = useState<string>('system_setup');
  const [ownerRole, setOwnerRole] = useState<string>('setter');
  const [nextActionType, setNextActionType] = useState<NextActionType | null>(null);
  const [nextActionDueAt, setNextActionDueAt] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('not_paid');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [leadSource, setLeadSource] = useState<string>('');
  const [referredByClientId, setReferredByClientId] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sync state when data loads
  useEffect(() => {
    if (prospect) {
      setProbability(prospect.forecast_probability || 0);
      setDealValue(String(prospect.deal_value || ''));
      setNotes(prospect.sales_notes || '');
      setNextFollowUp(prospect.next_follow_up_at?.split('T')[0] || '');
      setIntent(prospect.intent || 'unsure');
      setQualStatus(prospect.qual_status || 'unreviewed');
      setDisqualReason(prospect.disqual_reason || '');
      setCallType(prospect.call_type || 'system_setup');
      setOwnerRole(prospect.owner_role || 'setter');
      setNextActionType(prospect.next_action_type as NextActionType || null);
      setNextActionDueAt(prospect.next_action_due_at?.slice(0, 16) || '');
      setPaymentStatus(prospect.payment_status || 'not_paid');
      setPaymentAmount(String(prospect.payment_amount || ''));
      setLeadSource(prospect.lead_source || '');
      // Use referrer_client_id from database
      setReferredByClientId((prospect as any).referrer_client_id || '');
      setHasChanges(false);
      setAiAnalysis(null); // Reset AI analysis when prospect changes
    }
  }, [prospect]);

  // Auto-refetch Fathom calls when modal opens
  useEffect(() => {
    if (open && prospect?.email) {
      refetchFathom();
    }
  }, [open, prospect?.email, refetchFathom]);

  const handleSave = async () => {
    if (!prospectId || !prospect) return;
    
    const newPaymentAmount = parseFloat(paymentAmount) || 0;
    const paymentWasSet = paymentStatus === 'paid' && newPaymentAmount > 0 && 
      (prospect.payment_status !== 'paid' || prospect.payment_amount !== newPaymentAmount);
    
    updateProspect.mutate({
      prospectId,
      updates: {
        forecast_probability: probability,
        deal_value: parseFloat(dealValue) || 0,
        sales_notes: notes,
        next_follow_up_at: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
        intent,
        qual_status: qualStatus,
        disqual_reason: qualStatus === 'disqualified' ? disqualReason : null,
        call_type: callType,
        owner_role: ownerRole,
        next_action_type: nextActionType,
        next_action_due_at: nextActionDueAt ? new Date(nextActionDueAt).toISOString() : null,
        payment_status: paymentStatus,
        payment_amount: newPaymentAmount,
        lead_source: leadSource || null,
        referrer_client_id: referredByClientId || null,
      } as any,
    });
    
    // Update referral status to 'signed_up' when payment is made
    if (paymentWasSet && prospect.email) {
      try {
        const { error } = await supabase
          .from('referrals')
          .update({ 
            status: 'signed_up',
            signed_up_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('referred_email', prospect.email.toLowerCase().trim())
          .eq('status', 'pending');
        
        if (error) {
          console.error('Failed to update referral status:', error);
        } else {
          console.log('Referral status updated to signed_up');
        }
      } catch (e) {
        console.error('Error updating referral:', e);
      }
    }
    
    setHasChanges(false);
  };

  const handleDispositionSave = async (dispositionData: {
    disposition: Disposition;
    nextActionType: NextActionType | null;
    nextActionDueAt: string | null;
    incrementCallCount: boolean;
    cashCollected?: number;
    adSpendBudget?: number;
    billingFrequency?: 'monthly' | 'bi_weekly';
    createAdSpendInvoice?: boolean;
  }) => {
    if (!prospectId || !prospect) return;

    const disposition = dispositionData.disposition;

    const updates: Partial<typeof prospect> & {
      ad_spend_budget?: number;
      billing_frequency?: string;
      ad_spend_invoice_pending?: boolean;
    } = {
      disposition,
      next_action_type: dispositionData.nextActionType,
      next_action_due_at: dispositionData.nextActionDueAt,
      // Auto-update qual_status based on disposition
      qual_status: disposition === 'disqualified' ? 'disqualified' : 'qualified',
    };

    // Increment call count if this was a completed call
    if (dispositionData.incrementCallCount) {
      updates.call_count = (prospect.call_count ?? 0) + 1;
    }

    // Keep appointment history in sync when disposition implies an appt outcome
    if (['showed_closed_won', 'showed_follow_up', 'showed_closed_lost'].includes(disposition)) {
      updates.appointment_status = 'completed';
    }

    if (disposition === 'no_show_rebooked') {
      updates.appointment_status = 'rescheduled';
      updates.appt_count_no_shows = (prospect.appt_count_no_shows ?? 0) + 1;
      updates.appt_count_reschedules = (prospect.appt_count_reschedules ?? 0) + 1;
    }

    if (disposition === 'canceled_rebooked') {
      updates.appointment_status = 'rescheduled';
      updates.appt_count_reschedules = (prospect.appt_count_reschedules ?? 0) + 1;
    }

    // When Closed Won, set payment as PENDING (not paid) and store billing config
    if (disposition === 'showed_closed_won') {
      const amount = dispositionData.cashCollected ?? 0;
      if (amount > 0) {
        updates.payment_status = 'pending'; // Set to pending, not paid
        updates.payment_amount = amount;
        updates.closed_at = new Date().toISOString();
      }
      
      // Store billing configuration from sales tracker
      if (dispositionData.adSpendBudget) {
        updates.ad_spend_budget = dispositionData.adSpendBudget;
      }
      if (dispositionData.billingFrequency) {
        updates.billing_frequency = dispositionData.billingFrequency;
      }
      updates.ad_spend_invoice_pending = dispositionData.createAdSpendInvoice ?? false;
    }

    updateProspect.mutate({
      prospectId,
      updates,
    });

    // Sync disposition tag to GHL in the background
    try {
      await supabase.functions.invoke('sync-disposition-to-ghl', {
        body: {
          prospect_id: prospectId,
          disposition,
          ghl_contact_id: prospect.ghl_contact_id,
        },
      });
      console.log('Disposition synced to GHL');
    } catch (error) {
      console.error('Failed to sync disposition to GHL:', error);
      // Don't block the UI - this is a background sync
    }
  };

  // Handle confirming pending payment as paid
  const handleConfirmPayment = async () => {
    if (!prospectId || !prospect) return;
    
    try {
      // Update prospect payment status to paid
      await supabase
        .from('prospects')
        .update({ 
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', prospectId);
      
      // Update local state
      updateProspect.mutate({
        prospectId,
        updates: { payment_status: 'paid' },
      });
      
      // Update referral status if applicable
      if (prospect.email) {
        await supabase
          .from('referrals')
          .update({ 
            status: 'signed_up',
            signed_up_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('referred_email', prospect.email.toLowerCase().trim())
          .eq('status', 'pending');
      }
      
      toast.success('Payment confirmed! Prospect marked as paid.');
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      toast.error('Failed to confirm payment');
    }
  };

  const handleFieldChange = () => {
    setHasChanges(true);
  };

  const handleRunAiAnalysis = async () => {
    if (!prospect) return;
    
    setIsAnalyzing(true);
    setAiAnalysis(null);
    
    try {
      // Get call summaries from both imported calls and Fathom
      const callSummaries: Array<{
        title?: string;
        date: string;
        duration?: number;
        summary?: string;
        actionItems?: string[];
      }> = [];
      
      // Add imported call logs
      if (data?.callLogs) {
        for (const call of data.callLogs) {
          callSummaries.push({
            title: 'Imported Call',
            date: format(new Date(call.call_date), 'PPP'),
            duration: call.duration_seconds ?? undefined,
            summary: call.summary ?? undefined,
            actionItems: call.action_items ?? undefined,
          });
        }
      }
      
      // Add Fathom calls
      if (fathomCalls) {
        for (const call of fathomCalls) {
          callSummaries.push({
            title: call.title,
            date: format(new Date(call.started_at), 'PPP'),
            duration: call.duration_seconds,
            summary: call.summary,
            actionItems: call.action_items,
          });
        }
      }
      
      const { data: result, error } = await supabase.functions.invoke('analyze-prospect', {
        body: {
          prospect: {
            name: prospect.name,
            email: prospect.email,
            phone: prospect.phone,
            pipelineStage: prospect.pipeline_stage_id || 'Unknown',
            disposition: prospect.disposition,
            qualStatus: prospect.qual_status,
            intent: prospect.intent,
            callCount: prospect.call_count,
            appointmentStatus: prospect.appointment_status,
            noShows: prospect.appt_count_no_shows,
            reschedules: prospect.appt_count_reschedules,
            dealValue: prospect.deal_value,
            probability: prospect.forecast_probability,
            paymentStatus: prospect.payment_status,
            leadSource: prospect.lead_source,
            salesNotes: prospect.sales_notes,
          },
          callSummaries,
        },
      });
      
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      
      setAiAnalysis(result.analysis);
      toast.success('AI analysis complete');
    } catch (e) {
      console.error('AI analysis error:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to analyze prospect');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!open) return null;

  const displayName = prospect 
    ? (prospect.name?.trim() || prospect.email?.split('@')[0] || prospect.email)
    : '';

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'stage_change': return <ArrowRight className="w-3 h-3" />;
      case 'call_logged': return <Phone className="w-3 h-3" />;
      case 'booking_created': return <Calendar className="w-3 h-3" />;
      case 'form_submit': return <CheckCircle2 className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'text-success';
      case 'negative': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  // Get referring client name
  const referringClient = clients?.find(c => c.id === referredByClientId);

  // Check if prospect is ready for onboarding (paid and in final stages)
  const isReadyForOnboarding = prospect?.payment_status === 'paid' || 
    prospect?.disposition === 'showed_closed_won' ||
    prospect?.pipeline_stage_id === 'closed_won';
  
  // Check if payment is pending confirmation
  const isPendingPayment = prospect?.payment_status === 'pending' && (prospect?.payment_amount ?? 0) > 0;

  const handleScheduleOnboarding = () => {
    if (!prospectId || !prospect) return;
    
    // Build URL with all prospect data for calendar autofill
    const params = new URLSearchParams();
    params.set('prospect_id', prospectId);
    
    if (prospect.visitor_id) {
      params.set('visitor_id', prospect.visitor_id);
    }
    
    // Extract first and last name
    const nameParts = (prospect.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    if (firstName) params.set('first_name', firstName);
    if (lastName) params.set('last_name', lastName);
    if (prospect.phone) params.set('phone', prospect.phone);
    if (prospect.email) params.set('email', prospect.email);
    
    // Pass referral code for linking
    const referralCode = (prospect as any).referral_code || prospect.attribution?.referral_code;
    if (referralCode) {
      params.set('referral_code', referralCode);
    }
    
    const url = `/schedule-onboarding?${params.toString()}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>{displayName}</span>
                {prospect?.company && (
                  <Badge variant="outline" className="font-normal">
                    <Building className="w-3 h-3 mr-1" />
                    {prospect.company}
                  </Badge>
                )}
                {prospect?.partner && (
                  <Badge 
                    variant="outline" 
                    className="font-normal text-white border-transparent"
                    style={{ backgroundColor: prospect.partner.color }}
                  >
                    {prospect.partner.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Pending Payment Confirmation */}
                {prospect && isPendingPayment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConfirmPayment}
                    className="gap-1.5 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  >
                    <DollarSign className="w-4 h-4" />
                    Confirm ${(prospect.payment_amount ?? 0).toLocaleString()} Paid
                  </Button>
                )}
                {prospect && isReadyForOnboarding && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleScheduleOnboarding}
                    className="gap-1.5"
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule Onboarding
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : prospect ? (
            <>
              <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-7 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sales">Sales Intel</TabsTrigger>
                <TabsTrigger value="calls">
                  Calls ({data?.callLogs?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="attribution">Attribution</TabsTrigger>
                <TabsTrigger value="journey">Journey</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <div className="pr-4">
                <TabsContent value="overview" className="m-0 space-y-4">
                  {/* AI Sales Intelligence - Moved to Overview */}
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          AI Sales Intelligence
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRunAiAnalysis}
                          disabled={isAnalyzing}
                          className="border-primary/30 hover:bg-primary/10"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" />
                              {aiAnalysis ? 'Refresh' : 'Analyze'}
                            </>
                          )}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {aiAnalysis ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {formatAiAnalysis(aiAnalysis)}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Click "Analyze" to get AI-powered insights based on the prospect's data and call summaries.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Status Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Qualification */}
                    <Card className="bg-card/50 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <UserCheck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Qualification</span>
                        </div>
                        <Select value={qualStatus} onValueChange={(v) => { setQualStatus(v); handleFieldChange(); }}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unreviewed">Unreviewed</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="disqualified">Disqualified</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Intent */}
                    <Card className="bg-card/50 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Intent</span>
                        </div>
                        <Select value={intent} onValueChange={(v) => { setIntent(v); handleFieldChange(); }}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unsure">Unsure</SelectItem>
                            <SelectItem value="join_partner">Join Partner</SelectItem>
                            <SelectItem value="system_only">System Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Owner Role */}
                    <Card className="bg-card/50 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Owner Role</span>
                        </div>
                        <Select value={ownerRole} onValueChange={(v) => { setOwnerRole(v); handleFieldChange(); }}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="setter">Setter</SelectItem>
                            <SelectItem value="closer">Closer</SelectItem>
                            <SelectItem value="onboarding">Onboarding</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lead Source with Referral Dropdown */}
                  <Card className="bg-card/50 border-white/10">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Lead Source</span>
                      </div>
                      <Select 
                        value={leadSource === 'referral' ? 'Referral' : leadSource} 
                        onValueChange={(v) => { setLeadSource(v); handleFieldChange(); }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select source..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="SEO">SEO</SelectItem>
                          <SelectItem value="YouTube">YouTube</SelectItem>
                          <SelectItem value="Partner">Partner</SelectItem>
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Show client dropdown when Referral is selected OR when there's an existing referrer */}
                      {(leadSource === 'Referral' || leadSource === 'referral' || referredByClientId) && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Referred By (Agent)</Label>
                          <Select 
                            value={referredByClientId || '__none__'} 
                            onValueChange={(v) => { 
                              setReferredByClientId(v === '__none__' ? '' : v); 
                              if (v !== '__none__' && leadSource !== 'Referral') {
                                setLeadSource('Referral');
                              }
                              handleFieldChange(); 
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select referring agent..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} {client.referral_code && `(${client.referral_code})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {referringClient && (
                            <p className="text-xs text-primary">
                              ✓ Referred by: <span className="font-medium">{referringClient.name}</span>
                              {referringClient.referral_code && ` (${referringClient.referral_code})`}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Disqualification Reason */}
                  {qualStatus === 'disqualified' && (
                    <Card className="bg-destructive/5 border-destructive/20">
                      <CardContent className="p-4">
                        <Label className="text-sm">Disqualification Reason</Label>
                        <Select value={disqualReason} onValueChange={(v) => { setDisqualReason(v); handleFieldChange(); }}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_budget">No Budget</SelectItem>
                            <SelectItem value="not_serious">Not Serious</SelectItem>
                            <SelectItem value="not_licensed">Not Licensed</SelectItem>
                            <SelectItem value="timing">Bad Timing</SelectItem>
                            <SelectItem value="bad_fit">Bad Fit</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  )}

                  {/* Next Action */}
                  <Card className="bg-card/50 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>Next Action</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowDispositionModal(true)}
                        >
                          Log Call Outcome
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NextActionSelector
                        actionType={nextActionType}
                        dueAt={nextActionDueAt}
                        onActionTypeChange={(t) => { setNextActionType(t); handleFieldChange(); }}
                        onDueAtChange={(d) => { setNextActionDueAt(d); handleFieldChange(); }}
                      />
                    </CardContent>
                  </Card>

                  {/* Attribution Summary */}
                  {(prospect.attribution || referringClient) && (
                    <Card className="bg-card/50 border-white/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Attribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Referral Code Display */}
                        {(prospect.attribution?.referral_code || referringClient) && (
                          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-xs text-primary mb-1 font-medium">Referral Source</p>
                            <p className="font-bold text-primary">
                              {prospect.attribution?.referral_code || referringClient?.referral_code || 'Manual Assignment'}
                            </p>
                            {referringClient && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Agent: {referringClient.name}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">First Touch</p>
                            <p className="font-medium">
                              {prospect.attribution?.first_touch_source || 'Direct'} 
                              {prospect.attribution?.first_touch_medium && ` / ${prospect.attribution.first_touch_medium}`}
                            </p>
                            {prospect.attribution?.first_touch_campaign && (
                              <p className="text-xs text-muted-foreground truncate">
                                {prospect.attribution.first_touch_campaign}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Last Touch</p>
                            <p className="font-medium">
                              {prospect.attribution?.last_touch_source || 'Direct'}
                              {prospect.attribution?.last_touch_medium && ` / ${prospect.attribution.last_touch_medium}`}
                            </p>
                            {prospect.attribution?.last_touch_campaign && (
                              <p className="text-xs text-muted-foreground truncate">
                                {prospect.attribution.last_touch_campaign}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                </TabsContent>

                <TabsContent value="sales" className="m-0 space-y-4 pb-4">
                  {/* Deal Information */}
                  <Card className="bg-card/50 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Deal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Probability Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Likelihood to Buy</Label>
                          <span className={cn(
                            "text-sm font-medium",
                            probability >= 70 ? "text-success" :
                            probability >= 40 ? "text-warning" :
                            "text-muted-foreground"
                          )}>
                            {probability}%
                          </span>
                        </div>
                        <Slider
                          value={[probability]}
                          onValueChange={([v]) => { setProbability(v); handleFieldChange(); }}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      {/* Deal Value */}
                      <div className="space-y-2">
                        <Label className="text-sm">Expected Deal Value</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={dealValue}
                            onChange={(e) => { setDealValue(e.target.value); handleFieldChange(); }}
                            placeholder="0"
                            className="pl-9"
                          />
                        </div>
                      </div>

                      {/* Call Type */}
                      <div className="space-y-2">
                        <Label className="text-sm">Call Type</Label>
                        <Select value={callType} onValueChange={(v) => { setCallType(v); handleFieldChange(); }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system_setup">System Setup</SelectItem>
                            <SelectItem value="partner_alignment">Partner Alignment</SelectItem>
                            <SelectItem value="follow_up">Follow-up</SelectItem>
                            <SelectItem value="onboarding_call">Onboarding Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Next Follow-up */}
                      <div className="space-y-2">
                        <Label className="text-sm">Next Follow-up Date</Label>
                        <Input
                          type="date"
                          value={nextFollowUp}
                          onChange={(e) => { setNextFollowUp(e.target.value); handleFieldChange(); }}
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label className="text-sm">Sales Notes</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => { setNotes(e.target.value); handleFieldChange(); }}
                          placeholder="Add your observations about this prospect..."
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Status */}
                  <Card className="bg-card/50 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Payment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Payment Status</Label>
                          <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); handleFieldChange(); }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_paid">Not Paid</SelectItem>
                              <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                              <SelectItem value="paid">Paid in Full</SelectItem>
                              <SelectItem value="failed">Payment Failed</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                              <SelectItem value="chargeback">Chargeback</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Payment Amount</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={paymentAmount}
                              onChange={(e) => { setPaymentAmount(e.target.value); handleFieldChange(); }}
                              placeholder="0"
                              className="pl-9"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Appointment Stats */}
                  <Card className="bg-card/50 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Appointment History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">
                            {prospect.call_count ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Calls Made</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-warning">
                            {prospect.appt_count_no_shows ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">No Shows</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary">
                            {prospect.appt_count_reschedules ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Reschedules</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-success">
                            {(prospect as any).appt_count_completed ?? 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </TabsContent>

                <TabsContent value="calls" className="m-0 space-y-4 pb-4">
                  {/* Fathom Sync Controls */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Call recordings & summaries
                      </p>
                      <Button
                        variant={showAllFathomCalls ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setShowAllFathomCalls(!showAllFathomCalls)}
                        className="text-xs h-7"
                      >
                        {showAllFathomCalls ? 'Show Matched Only' : 'Show All Calls'}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const t = toast.loading('Syncing from Fathom...');
                        try {
                          const res = await refetchFathom();
                          const count = res.data?.length ?? 0;
                          toast.dismiss(t);
                          if (res.error) {
                            toast.error(res.error instanceof Error ? res.error.message : 'Fathom sync failed');
                            return;
                          }
                          if (count === 0) {
                            toast.message('No meetings found matching this prospect. Try "Show All Calls" to see all recent calls.');
                          } else {
                            toast.success(`Found ${count} Fathom call${count === 1 ? '' : 's'}`);
                          }
                        } catch (e) {
                          toast.dismiss(t);
                          toast.error(e instanceof Error ? e.message : 'Fathom sync failed');
                        }
                      }}
                      disabled={isFathomLoading}
                    >
                      <RefreshCw className={cn("w-3 h-3 mr-1", isFathomLoading && "animate-spin")} />
                      {isFathomLoading ? 'Loading...' : 'Sync from Fathom'}
                    </Button>
                  </div>

                  {/* Imported Call Logs */}
                  {data?.callLogs && data.callLogs.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Imported Calls</p>
                      {data.callLogs.map((call: CallLog) => (
                        <Card key={call.id} className="bg-card/50 border-white/10">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Mic className={cn("w-4 h-4", getSentimentColor(call.sentiment))} />
                                <span className="text-sm font-medium">
                                  {format(new Date(call.call_date), 'PPp')}
                                </span>
                                {call.duration_seconds && (
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(call.duration_seconds / 60)} min
                                  </Badge>
                                )}
                              </div>
                              {call.recording_url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={call.recording_url} target="_blank" rel="noopener noreferrer">
                                    <PlayCircle className="w-4 h-4 mr-1" />
                                    Recording
                                  </a>
                                </Button>
                              )}
                            </div>

                            {call.summary && (
                              <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{call.summary}</p>
                              </div>
                            )}

                            {call.action_items && call.action_items.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Action Items</p>
                                <ul className="space-y-1">
                                  {call.action_items.map((item, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <CheckCircle2 className="w-3 h-3 mt-1 text-success flex-shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {call.key_topics && call.key_topics.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {call.key_topics.map((topic, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Fathom Calls (not yet imported) */}
                  {fathomCalls && fathomCalls.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        From Fathom ({fathomCalls.length} calls found)
                      </p>
                      {fathomCalls
                        .filter((fc: FathomCall) => !data?.callLogs?.some((cl: CallLog) => cl.fathom_call_id === fc.id))
                        .map((call: FathomCall) => (
                          <Card key={call.id} className="bg-card/50 border-white/10 border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Mic className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {call.started_at ? format(new Date(call.started_at), 'PPp') : 'Unknown date'}
                                  </span>
                                  {call.duration_seconds && (
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round(call.duration_seconds / 60)} min
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await importFathomCall.mutateAsync(call);
                                      toast.success('Call imported successfully');
                                    } catch (err) {
                                      toast.error(err instanceof Error ? err.message : 'Failed to import call');
                                    }
                                  }}
                                  disabled={importFathomCall.isPending}
                                >
                                  {importFathomCall.isPending ? 'Importing...' : 'Import'}
                                </Button>
                              </div>

                              {call.title && (
                                <p className="text-sm font-medium mb-2">{call.title}</p>
                              )}

                              {/* Short summary preview */}
                              {call.summary && (
                                <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                                  <p className="text-sm text-muted-foreground line-clamp-2">{call.summary}</p>
                                </div>
                              )}

                              {call.recording_url && (
                                <Button variant="ghost" size="sm" className="mt-2" asChild>
                                  <a href={call.recording_url} target="_blank" rel="noopener noreferrer">
                                    <PlayCircle className="w-4 h-4 mr-1" />
                                    View Recording
                                  </a>
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {(!data?.callLogs || data.callLogs.length === 0) && (!fathomCalls || fathomCalls.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No call notes yet</p>
                      <p className="text-xs">Fathom calls will sync automatically when you open this modal</p>
                    </div>
                  )}
                </TabsContent>

                {/* Attribution Tab */}
                <TabsContent value="attribution" className="m-0 space-y-4 pb-4">
                  {prospect.attribution ? (
                    <>
                      {/* Attribution Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <Card className="bg-card/50 border-white/10">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-primary">
                              {prospect.attribution.total_sessions ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Sessions</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-card/50 border-white/10">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-primary">
                              {prospect.attribution.total_page_views ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Page Views</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-card/50 border-white/10">
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-primary">
                              {prospect.attribution.time_to_conversion_hours != null 
                                ? `${Math.round(prospect.attribution.time_to_conversion_hours)}h` 
                                : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">Time to Convert</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* First Touch Attribution */}
                      <Card className="bg-card/50 border-white/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MousePointerClick className="w-4 h-4 text-primary" />
                            First Touch Attribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Source</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.first_touch_source || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Medium</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.first_touch_medium || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Campaign</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.first_touch_campaign || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Content</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.first_touch_content || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Term</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.first_touch_term || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Timestamp</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.first_touch_at 
                                  ? format(new Date(prospect.attribution.first_touch_at), 'PPp')
                                  : '-'}
                              </div>
                            </div>
                          </div>
                          {prospect.attribution.first_touch_landing_page && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Landing Page</Label>
                              <div className="text-sm font-medium break-all flex items-start gap-1">
                                <Link2 className="w-3 h-3 mt-1 flex-shrink-0" />
                                {prospect.attribution.first_touch_landing_page}
                              </div>
                            </div>
                          )}
                          {prospect.attribution.first_touch_referrer && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Referrer</Label>
                              <div className="text-sm font-medium break-all flex items-start gap-1">
                                <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0" />
                                {prospect.attribution.first_touch_referrer}
                              </div>
                            </div>
                          )}
                          {(prospect.attribution.first_touch_gclid || prospect.attribution.first_touch_fbclid) && (
                            <div className="flex gap-2">
                              {prospect.attribution.first_touch_gclid && (
                                <Badge variant="outline" className="text-xs">
                                  GCLID: {prospect.attribution.first_touch_gclid.slice(0, 10)}...
                                </Badge>
                              )}
                              {prospect.attribution.first_touch_fbclid && (
                                <Badge variant="outline" className="text-xs">
                                  FBCLID: {prospect.attribution.first_touch_fbclid.slice(0, 10)}...
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Last Touch Attribution */}
                      <Card className="bg-card/50 border-white/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            Last Touch Attribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Source</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.last_touch_source || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Medium</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.last_touch_medium || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Campaign</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.last_touch_campaign || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Content</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.last_touch_content || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Term</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.last_touch_term || '-'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Timestamp</Label>
                              <div className="text-sm font-medium">
                                {prospect.attribution.last_touch_at 
                                  ? format(new Date(prospect.attribution.last_touch_at), 'PPp')
                                  : '-'}
                              </div>
                            </div>
                          </div>
                          {prospect.attribution.last_touch_landing_page && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Landing Page</Label>
                              <div className="text-sm font-medium break-all flex items-start gap-1">
                                <Link2 className="w-3 h-3 mt-1 flex-shrink-0" />
                                {prospect.attribution.last_touch_landing_page}
                              </div>
                            </div>
                          )}
                          {prospect.attribution.last_touch_referrer && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Referrer</Label>
                              <div className="text-sm font-medium break-all flex items-start gap-1">
                                <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0" />
                                {prospect.attribution.last_touch_referrer}
                              </div>
                            </div>
                          )}
                          {(prospect.attribution.last_touch_gclid || prospect.attribution.last_touch_fbclid) && (
                            <div className="flex gap-2">
                              {prospect.attribution.last_touch_gclid && (
                                <Badge variant="outline" className="text-xs">
                                  GCLID: {prospect.attribution.last_touch_gclid.slice(0, 10)}...
                                </Badge>
                              )}
                              {prospect.attribution.last_touch_fbclid && (
                                <Badge variant="outline" className="text-xs">
                                  FBCLID: {prospect.attribution.last_touch_fbclid.slice(0, 10)}...
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Referral Code */}
                      {prospect.attribution.referral_code && (
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Referred via code:</span>
                              <Badge variant="secondary">{prospect.attribution.referral_code}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MousePointerClick className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No attribution data available</p>
                      <p className="text-xs mt-1">Attribution is tracked when visitors come from tracked sources</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="journey" className="m-0 pb-4">
                  <JourneyTimeline prospectId={prospectId} prospect={prospect} />
                </TabsContent>

                <TabsContent value="activity" className="m-0 space-y-2 pb-4">
                  {data?.activities && data.activities.length > 0 ? (
                    data.activities.map((activity: ProspectActivity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {activity.activity_type.replace(/_/g, ' ')}
                          </p>
                          {activity.activity_data && Object.keys(activity.activity_data).length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {JSON.stringify(activity.activity_data).slice(0, 100)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activity recorded yet</p>
                    </div>
                  )}
                </TabsContent>

                {/* Info tab moved to end - contains identifiers and contact info */}
                <TabsContent value="info" className="m-0 space-y-4 pb-4">
                  {/* Contact Information */}
                  <Card className="bg-card/50 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${prospect.email}`} className="hover:text-primary">{prospect.email}</a>
                      </div>
                      {prospect.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <a href={`tel:${prospect.phone}`} className="hover:text-primary">{prospect.phone}</a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Created {formatDistanceToNow(new Date(prospect.created_at), { addSuffix: true })}
                      </div>
                      {prospect.appt_start_at && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Calendar className="w-4 h-4" />
                          Call scheduled: {format(new Date(prospect.appt_start_at), 'PPp')}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Identifiers */}
                  <Card className="bg-card/50 border-white/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Identifiers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Prospect ID</Label>
                          <Input value={prospect.id} readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Visitor ID</Label>
                          <Input value={prospect.visitor_id || ''} readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Contact ID</Label>
                          <Input value={prospect.ghl_contact_id || ''} readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Appointment ID</Label>
                          <Input value={prospect.ghl_appointment_id || ''} readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Source Page</Label>
                          <Input value={prospect.source_page || ''} readOnly />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Appointment Status</Label>
                          <Input value={prospect.appointment_status || ''} readOnly />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
            
            {/* Sticky Save Button - Visible on all tabs when changes exist */}
            {hasChanges && (
              <div className="pt-4 border-t border-border mt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={updateProspect.isPending}
                  className="w-full"
                >
                  {updateProspect.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Prospect not found
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DispositionModal
        open={showDispositionModal}
        onClose={() => setShowDispositionModal(false)}
        onSave={handleDispositionSave}
        prospectName={displayName}
        currentCallCount={prospect?.call_count ?? 0}
      />
    </>
  );
}