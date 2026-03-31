import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, AlertTriangle, Loader2, ExternalLink, PhoneCall, UserX, CalendarDays, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { TemperatureBadge } from './TemperatureSelector';
import { AttemptProgressBar } from './AttemptProgressBar';
import { CadenceSuggestion } from './CadenceSuggestion';
import type { DiscoveryLead } from '@/hooks/useLeadDiscoveryQueue';
import type { DiscoveryStage } from '@/hooks/useDiscoveryCalls';
import { useAuth } from '@/contexts/AuthContext';

interface LeadCardProps {
  lead: DiscoveryLead;
  onClick: () => void;
  subaccountId?: string | null;
}

const stageConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
  attempt_1: { label: 'Attempt 1', color: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  attempt_2: { label: 'Attempt 2', color: 'bg-orange-500/15 text-orange-400 border-orange-500/40' },
  attempt_3: { label: 'Attempt 3', color: 'bg-red-500/15 text-red-400 border-red-500/40' },
  attempt_4: { label: 'Attempt 4', color: 'bg-red-600/15 text-red-300 border-red-600/40' },
  intro_scheduled: { label: 'Intro Booked', color: 'bg-blue-500/15 text-blue-400 border-blue-500/40' },
  callback_scheduled: { label: 'Callback', color: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
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

function getFreshness(leadDate: string | null): { dot: string; text: string; label: string } {
  if (!leadDate) return { dot: 'bg-muted-foreground/30', text: 'text-muted-foreground/50', label: '' };
  const mins = (Date.now() - new Date(leadDate).getTime()) / 60_000;
  if (mins < 60) return { dot: 'bg-green-400 animate-pulse', text: 'text-green-400', label: `${Math.round(mins)}m` };
  const hrs = mins / 60;
  if (hrs < 24) return { dot: 'bg-amber-400', text: 'text-amber-400', label: `${Math.round(hrs)}h` };
  const days = hrs / 24;
  return { dot: 'bg-red-400', text: 'text-red-400/60', label: `${Math.round(days)}d` };
}

function formatLostReason(reason: string): string {
  const map: Record<string, string> = {
    not_a_fit: 'Not a Fit',
    bad_number: 'Bad Number',
    disconnected: 'Bad Number: Disconnected',
    wrong_number: 'Bad Number: Wrong Number',
    not_in_service: 'Bad Number: Not In Service',
    no_ring: "Bad Number: Doesn't Ring",
    straight_to_vm: 'Bad Number: Straight to VM',
  };
  return map[reason] || reason.replace(/_/g, ' ');
}

const BAD_NUMBER_REASONS = ['bad_number', 'disconnected', 'wrong_number', 'not_in_service', 'no_ring', 'straight_to_vm'];

function isBadNumber(lead: DiscoveryLead): boolean {
  return lead.discovery_stage === 'lost' && BAD_NUMBER_REASONS.includes(lead.lost_reason || '');
}

function getUpcomingAppointment(lead: DiscoveryLead): string | null {
  const dateStr = lead.strategy_booked_at || lead.intro_scheduled_at || lead.booked_call_at;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const BOOKED_STAGES = ['strategy_booked', 'intro_scheduled', 'callback_scheduled', 'booked'];
const ATTEMPT_STAGES = ['new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4'];

function getLeadSummary(lead: DiscoveryLead): string | null {
  if (ATTEMPT_STAGES.includes(lead.discovery_stage || 'new')) return null;
  const parts: string[] = [];
  if (lead.discovery_temperature) parts.push(`${lead.discovery_temperature}/10`);
  if (lead.employment) parts.push(lead.employment);
  if (lead.state) parts.push(lead.state);
  const stageLabel = stageConfig[lead.discovery_stage || '']?.label;
  if (stageLabel && lead.discovery_stage !== 'lost') parts.push(stageLabel);
  return parts.length > 0 ? parts.join(' \u00b7 ') : null;
}

function NoShowButton({ leadId, stage }: { leadId: string; stage: string }) {
  const [loading, setLoading] = useState(false);

  const handleNoShow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Mark this appointment as a no-show?')) return;

    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/mark-noshow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          lead_id: leadId,
          noshow_type: stage === 'strategy_booked' ? 'strategy' : 'discovery',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      toast.success(`No-show marked${data.appointment_updated ? ' — GHL appointment updated' : ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark no-show');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleNoShow}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
    >
      {loading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <UserX className="h-2.5 w-2.5" />}
      No-Show
    </button>
  );
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function LeadCard({ lead, onClick, subaccountId }: LeadCardProps) {
  const { user } = useAuth();
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown';
  const stage = stageConfig[lead.discovery_stage || 'new'] || stageConfig.new;
  const freshness = getFreshness(lead.lead_date);

  // Check if being worked by someone else
  const isWorkedByOther = lead.currently_being_worked && lead.last_attempted_by_id !== user?.id;
  const isDeliveryFailed = lead.delivery_status !== 'delivered';
  const activeStages = ['new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4', 'discovery_complete'];
  const isActiveStage = activeStages.includes(lead.discovery_stage || 'new');
  const badNumber = isBadNumber(lead);
  const appointmentTime = BOOKED_STAGES.includes(lead.discovery_stage || '') ? getUpcomingAppointment(lead) : null;
  const summary = getLeadSummary(lead);

  return (
    <button
      onClick={isWorkedByOther ? undefined : onClick}
      disabled={isWorkedByOther}
      className={cn(
        'w-full text-left p-3 sm:p-4 rounded-xl border transition-all duration-200 group overflow-hidden',
        isWorkedByOther
          ? 'opacity-50 cursor-not-allowed border-border bg-muted/20'
          : badNumber
            ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 cursor-pointer'
            : 'border-border/50 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-[0_0_20px_hsl(var(--primary)/0.08)] cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Name + details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', freshness.dot)} title={freshness.label} />
            <span className="font-bold text-foreground truncate">{name}</span>
            <span className={cn('text-[10px] font-semibold flex-shrink-0', freshness.text)}>{freshness.label}</span>
            <TemperatureBadge temp={lead.discovery_temperature} />
          </div>

          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-xs text-muted-foreground overflow-hidden">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 hover:text-primary transition-colors flex-shrink-0"
              >
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.phone}</span>
              </a>
            )}
            {lead.email && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{lead.email}</span>
              </span>
            )}
            {lead.age && <span className="flex-shrink-0">Age {lead.age}</span>}
            {lead.state && (
              <span className="inline-flex items-center gap-1 flex-shrink-0">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {lead.state}
              </span>
            )}
          </div>
          {/* Lost reason */}
          {lead.discovery_stage === 'lost' && lead.lost_reason && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-red-400/80">
              <AlertTriangle className="h-3 w-3" />
              {formatLostReason(lead.lost_reason)}
            </div>
          )}

          {/* Appointment bubble */}
          {appointmentTime && (
            <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[11px] text-green-400 font-medium">
              <CalendarDays className="h-3 w-3" />
              Next call: {appointmentTime}
            </div>
          )}

          {/* One-line lead summary */}
          {summary && (
            <div className="mt-1 text-[11px] text-muted-foreground/60 italic truncate">
              {summary}
            </div>
          )}

          {lead.ghl_contact_id && subaccountId && (
            <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
              <a
                href={`https://app.alphaagentcrm.com/v2/location/${subaccountId}/contacts/detail/${lead.ghl_contact_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[10px] text-primary/50 hover:text-primary transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                View in CRM
              </a>
              <a
                href={`https://app.alphaagentcrm.com/v2/location/${subaccountId}/conversations/${lead.ghl_contact_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[10px] text-green-400/60 hover:text-green-400 transition-colors"
              >
                <PhoneCall className="h-2.5 w-2.5" />
                Call from CRM
              </a>
              {/* No-Show button for booked leads */}
              {['strategy_booked', 'intro_scheduled', 'booked'].includes(lead.discovery_stage || '') && (
                <NoShowButton leadId={lead.id} stage={lead.discovery_stage || ''} />
              )}
              {/* Copy dial link for mobile */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = `${window.location.origin}/dial?lead_id=${lead.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Dial link copied');
                }}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
              >
                <Link2 className="h-2.5 w-2.5" />
                Copy Link
              </button>
            </div>
          )}

          {/* Assigned person */}
          {lead.last_attempted_by && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-[8px] font-bold text-primary flex-shrink-0">
                {lead.last_attempted_by.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className="text-[11px] text-muted-foreground/70">{lead.last_attempted_by}</span>
            </div>
          )}

          {/* Last attempt info */}
          {lead.last_call_attempt_at && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              Last: {formatRelativeTime(lead.last_call_attempt_at)}
            </div>
          )}

          {/* Cadence suggestion — only for active queue leads */}
          {isActiveStage && (
            <div className="mt-1">
              <CadenceSuggestion
                attemptCount={lead.call_attempt_count || 0}
                lastAttemptAt={lead.last_call_attempt_at}
              />
            </div>
          )}

          {/* Being worked indicator */}
          {isWorkedByOther && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Being worked by {lead.last_attempted_by}
            </div>
          )}

          {/* Delivery failure */}
          {isDeliveryFailed && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-red-400">
              <AlertTriangle className="h-3 w-3" />
              CRM delivery failed
            </div>
          )}
        </div>

        {/* Right: Stage badge + progress + arrow */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-[11px] font-bold', stage.color)}>
              {stage.label}
            </Badge>
            <span className="text-muted-foreground/50 group-hover:text-primary transition-colors text-lg">
              ›
            </span>
          </div>
          {isActiveStage && (
            <AttemptProgressBar attempts={lead.call_attempt_count || 0} />
          )}
        </div>
      </div>
    </button>
  );
}
