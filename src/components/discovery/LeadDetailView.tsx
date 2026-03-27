import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Phone, Mail, MapPin, ExternalLink, PhoneCall, Calendar,
  Briefcase, Users, Baby, DollarSign, Target, Heart, Shield,
  Cigarette, Scale, StickyNote, Clock, CheckCircle, PhoneMissed,
  ArrowLeft, TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TemperatureBadge } from './TemperatureSelector';
import { OutcomeBadge } from './OutcomeSelector';
import type { DiscoveryLead } from '@/hooks/useLeadDiscoveryQueue';
import type { DiscoveryCall, DiscoveryFormData, DiscoveryStage } from '@/hooks/useDiscoveryCalls';

// ── Stage Config (mirrored from LeadCard) ─────────────────────────────────

const stageConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
  attempt_1: { label: 'Attempt 1', color: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  attempt_2: { label: 'Attempt 2', color: 'bg-orange-500/15 text-orange-400 border-orange-500/40' },
  attempt_3: { label: 'Attempt 3', color: 'bg-red-500/15 text-red-400 border-red-500/40' },
  attempt_4: { label: 'Attempt 4', color: 'bg-red-600/15 text-red-300 border-red-600/40' },
  intro_scheduled: { label: 'Intro Booked', color: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
  discovery_complete: { label: 'Needs Booking', color: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  strategy_booked: { label: 'Strategy Booked', color: 'bg-green-500/15 text-green-400 border-green-500/40' },
  booked: { label: 'Booked', color: 'bg-green-500/15 text-green-400 border-green-500/40' },
  no_show: { label: 'No-Show', color: 'bg-red-500/15 text-red-400 border-red-500/40' },
  strategy_no_show: { label: 'Zoom No-Show', color: 'bg-red-600/20 text-red-300 border-red-600/40' },
  cancelled: { label: 'Cancelled', color: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  reschedule_needed: { label: 'Reschedule', color: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  lost: { label: 'Lost', color: 'bg-muted/50 text-muted-foreground border-border' },
  long_term_nurture: { label: 'Nurture', color: 'bg-purple-500/15 text-purple-400 border-purple-500/40' },
  completed: { label: 'Completed', color: 'bg-green-500/15 text-green-400 border-green-500/40' },
};

// Stages that allow booking a strategy call
const BOOKABLE_STAGES: string[] = [
  'discovery_complete', 'no_show', 'strategy_no_show', 'cancelled', 'reschedule_needed',
];

const RESCHEDULE_STRATEGY_STAGES: string[] = [
  'strategy_booked', 'booked',
];

const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'booked call', label: 'Booked Call' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'issued paid', label: 'Issued Paid' },
];

const leadStatusColors: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
  'booked call': 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  submitted: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
  approved: 'bg-green-500/15 text-green-400 border-green-500/40',
  'issued paid': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
};

// ── Props ──────────────────────────────────────────────────────────────────

interface LeadDetailViewProps {
  lead: DiscoveryLead;
  discoveryData: DiscoveryFormData | null;
  callHistory: DiscoveryCall[];
  onCallAgain: () => void;
  onBookStrategy: () => void;
  onRescheduleStrategy: () => void;
  onClose: () => void;
  subaccountId?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 block">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20"
        >
          {item.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function LeadDetailView({
  lead,
  discoveryData,
  callHistory,
  onCallAgain,
  onBookStrategy,
  onRescheduleStrategy,
  onClose,
  subaccountId,
}: LeadDetailViewProps) {
  const stage = stageConfig[lead.discovery_stage || 'new'] || stageConfig.new;
  const canBookStrategy = BOOKABLE_STAGES.includes(lead.discovery_stage || '');
  const canRescheduleStrategy = RESCHEDULE_STRATEGY_STAGES.includes(lead.discovery_stage || '');

  const queryClient = useQueryClient();
  const [leadStatus, setLeadStatus] = useState(lead.status || 'new');
  const [showPremiumPrompt, setShowPremiumPrompt] = useState<'target' | 'issued' | null>(null);
  const [premiumInput, setPremiumInput] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  const handleStatusChange = async (newStatus: string) => {
    setLeadStatus(newStatus);
    if (newStatus === 'submitted') {
      setPremiumInput(lead.target_premium?.toString() || '');
      setShowPremiumPrompt('target');
    } else if (newStatus === 'issued paid') {
      setPremiumInput(lead.issued_premium?.toString() || '');
      setShowPremiumPrompt('issued');
    } else {
      setUpdatingStatus(true);
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
      setUpdatingStatus(false);
      if (error) { toast.error('Failed to update status'); return; }
      toast.success('Lead status updated');
      queryClient.invalidateQueries({ queryKey: ['discovery-queue'] });
    }
  };

  const handlePremiumSubmit = async () => {
    setUpdatingStatus(true);
    const premiumValue = premiumInput ? parseFloat(premiumInput) : null;
    const updateData: Record<string, any> = { status: leadStatus };
    if (showPremiumPrompt === 'target') {
      updateData.target_premium = premiumValue;
      updateData.submitted_at = new Date().toISOString();
    } else if (showPremiumPrompt === 'issued') {
      updateData.issued_premium = premiumValue;
      updateData.issued_at = new Date().toISOString();
    }
    const { error } = await supabase.from('leads').update(updateData).eq('id', lead.id);
    setUpdatingStatus(false);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success('Lead status & premium updated');
    setShowPremiumPrompt(null);
    setPremiumInput('');
    queryClient.invalidateQueries({ queryKey: ['discovery-queue'] });
  };

  return (
    <div className="space-y-4 pb-6">
      {/* ── Lead Info Card ──────────────────────────────────────────────── */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Lead Info</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-[11px] font-bold', stage.color)}>
              {stage.label}
            </Badge>
            <TemperatureBadge temp={lead.discovery_temperature} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {lead.phone && (
              <DetailRow
                icon={Phone}
                label="Phone"
                value={
                  <a href={`tel:${lead.phone}`} className="hover:text-primary transition-colors">
                    {lead.phone}
                  </a>
                }
              />
            )}
            {lead.email && <DetailRow icon={Mail} label="Email" value={lead.email} />}
            {lead.age && <DetailRow icon={Users} label="Age" value={lead.age} />}
            {lead.state && <DetailRow icon={MapPin} label="State" value={lead.state} />}
          </div>

          {/* CRM links */}
          {lead.ghl_contact_id && subaccountId && (
            <div className="flex items-center gap-4 pt-1 border-t border-border/20">
              <a
                href={`https://app.alphaagentcrm.com/v2/location/${subaccountId}/contacts/detail/${lead.ghl_contact_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary/60 hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View in CRM
              </a>
              <a
                href={`https://app.alphaagentcrm.com/v2/location/${subaccountId}/conversations/${lead.ghl_contact_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-green-400/60 hover:text-green-400 transition-colors"
              >
                <PhoneCall className="h-3 w-3" />
                Call from CRM
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Lead Status Card ────────────────────────────────────────────── */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Lead Status</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={leadStatus} onValueChange={handleStatusChange} disabled={updatingStatus}>
              <SelectTrigger className={cn('w-[160px] text-xs font-bold', leadStatusColors[leadStatus] || '')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Premium prompt when changing to submitted or issued paid */}
          {showPremiumPrompt && (
            <div className="mt-3 p-3 rounded-lg border border-border bg-background/30 space-y-3">
              <p className="text-xs font-bold text-muted-foreground">
                {showPremiumPrompt === 'target' ? 'Target Premium Amount' : 'Issued Premium Amount'}
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    type="number"
                    value={premiumInput}
                    onChange={(e) => setPremiumInput(e.target.value)}
                    className="pl-6 h-9 text-sm"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handlePremiumSubmit}
                  disabled={updatingStatus}
                  className="text-xs"
                >
                  {updatingStatus ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    // Save status without premium
                    setShowPremiumPrompt(null);
                    setPremiumInput('');
                    supabase.from('leads').update({ status: leadStatus }).eq('id', lead.id).then(() => {
                      toast.success('Lead status updated (no premium set)');
                      queryClient.invalidateQueries({ queryKey: ['discovery-queue'] });
                    });
                  }}
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {/* Display current premiums */}
          {(lead.target_premium || lead.submitted_premium || lead.approved_premium || lead.issued_premium) && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {lead.target_premium != null && lead.target_premium > 0 && (
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400/60 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Target
                  </span>
                  <span className="text-sm font-bold text-purple-400">{formatCurrency(lead.target_premium)}</span>
                </div>
              )}
              {lead.submitted_premium != null && lead.submitted_premium > 0 && (
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400/60">Submitted</span>
                  <span className="text-sm font-bold text-blue-400">{formatCurrency(lead.submitted_premium)}</span>
                </div>
              )}
              {lead.approved_premium != null && lead.approved_premium > 0 && (
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-400/60">Approved</span>
                  <span className="text-sm font-bold text-green-400">{formatCurrency(lead.approved_premium)}</span>
                </div>
              )}
              {lead.issued_premium != null && lead.issued_premium > 0 && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Issued</span>
                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(lead.issued_premium)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Discovery Summary Card ─────────────────────────────────────── */}
      {discoveryData && (
        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Discovery Summary</p>

            {/* Interests */}
            {discoveryData.interests && discoveryData.interests.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Interests</span>
                <TagList items={discoveryData.interests} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-0">
              {discoveryData.occupation && (
                <DetailRow icon={Briefcase} label="Occupation" value={discoveryData.occupation} />
              )}
              <DetailRow
                icon={Users}
                label="Spouse"
                value={discoveryData.spouse === 'yes' ? 'Yes' : discoveryData.spouse === 'no' ? 'No' : discoveryData.spouse || null}
              />
              {discoveryData.kids && (
                <DetailRow
                  icon={Baby}
                  label="Kids"
                  value={
                    discoveryData.kids === 'yes'
                      ? discoveryData.kid_details
                        ? `Yes — ${discoveryData.kid_details}`
                        : 'Yes'
                      : discoveryData.kids === 'no'
                        ? 'No'
                        : discoveryData.kids
                  }
                />
              )}
              {discoveryData.contribution && (
                <DetailRow icon={DollarSign} label="Monthly Contribution" value={discoveryData.contribution} />
              )}
              {discoveryData.retire_age && (
                <DetailRow icon={Target} label="Target Retirement Age" value={discoveryData.retire_age} />
              )}
            </div>

            {/* Retirement Accounts */}
            {discoveryData.accounts && discoveryData.accounts.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Retirement Accounts
                </span>
                <div className="space-y-1">
                  {discoveryData.accounts.map((acct, i) => (
                    <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded-md bg-muted/20">
                      <span className="font-medium text-foreground">{acct.type}</span>
                      <span className="text-muted-foreground">{acct.balance}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Health Conditions */}
            {discoveryData.health_conditions && discoveryData.health_conditions.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1.5">
                  <Heart className="h-3 w-3" /> Health Conditions
                </span>
                <TagList items={discoveryData.health_conditions} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-0">
              {/* Tobacco */}
              {discoveryData.tobacco && (
                <DetailRow
                  icon={Cigarette}
                  label="Tobacco"
                  value={
                    discoveryData.tobacco === 'yes'
                      ? [discoveryData.tobacco_type, discoveryData.tobacco_frequency].filter(Boolean).join(' — ') || 'Yes'
                      : discoveryData.tobacco === 'no'
                        ? 'No'
                        : discoveryData.tobacco
                  }
                />
              )}
              {/* Felony */}
              {discoveryData.felony && (
                <DetailRow
                  icon={Scale}
                  label="Felony"
                  value={discoveryData.felony === 'yes' ? 'Yes' : discoveryData.felony === 'no' ? 'No' : discoveryData.felony}
                />
              )}
              {/* Qualifies */}
              {discoveryData.qualifies && (
                <DetailRow
                  icon={CheckCircle}
                  label="Qualifies"
                  value={
                    <span className={cn(
                      'font-bold',
                      discoveryData.qualifies === 'yes' ? 'text-green-400' : 'text-rose-400'
                    )}>
                      {discoveryData.qualifies === 'yes' ? 'Yes' : 'No'}
                    </span>
                  }
                />
              )}
            </div>

            {/* Notes */}
            {discoveryData.notes && (
              <div className="space-y-1 pt-1 border-t border-border/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" /> Notes
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{discoveryData.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Call History Card ───────────────────────────────────────────── */}
      {callHistory.length > 0 && (
        <Card className="border-border/30 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Call History</p>
            <div className="space-y-2">
              {callHistory.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/15 border border-border/20"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold border',
                      call.answered
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-muted/30 text-muted-foreground border-border/40'
                    )}>
                      {call.attempt_number}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">
                        {new Date(call.call_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' '}
                        {new Date(call.call_date).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      {call.called_by_name && (
                        <span className="text-[10px] text-muted-foreground/50">by {call.called_by_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {call.answered ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <PhoneMissed className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                    <OutcomeBadge outcome={call.answered ? call.outcome : 'no_answer'} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Action Buttons ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          className="w-full h-14 text-base font-bold border-2 border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20"
          variant="outline"
          onClick={onCallAgain}
        >
          <Phone className="h-5 w-5 mr-2" />
          Call Again
        </Button>

        {canBookStrategy && (
          <Button
            size="lg"
            className="w-full h-14 text-base font-bold border-2 border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            variant="outline"
            onClick={onBookStrategy}
          >
            <Calendar className="h-5 w-5 mr-2" />
            Book Strategy Call
          </Button>
        )}


        <Button variant="outline" onClick={onClose} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
