import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LocationMap } from '@/components/ui/expand-map';
import { Phone, Mail, MapPin, CheckCircle, PhoneMissed, PhoneOff, Clock, Loader2, AlertTriangle, RotateCcw, XCircle, PhoneForwarded, Sprout, PhoneCall, Calendar, Video, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DiscoveryCallForm } from './DiscoveryCallForm';
import { BadNumberHandler } from './BadNumberHandler';
import { SlotPicker } from './SlotPicker';
import { LeadDetailView } from './LeadDetailView';
import { TemperatureBadge } from './TemperatureSelector';
import { useSaveDiscoveryCall, useClaimLead, useReleaseLead, useDiscoveryCallsForLead } from '@/hooks/useDiscoveryCalls';
import { OutcomeBadge } from './OutcomeSelector';
import type { DiscoveryLead } from '@/hooks/useLeadDiscoveryQueue';
import type { DiscoveryOutcome, DiscoveryFormData } from '@/hooks/useDiscoveryCalls';
// Direct fetch helper for edge functions (avoids JWT issues with supabase.functions.invoke)
async function invokeEdgeFunction(name: string, body: Record<string, any>) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
import { toast } from 'sonner';

interface DiscoveryCallSheetProps {
  open: boolean;
  onClose: () => void;
  lead: DiscoveryLead | null;
  agentId: string;
  schedulerLink?: string | null;
  callbackCalendarId?: string | null;
  subaccountId?: string | null;
  onCallNext?: (lead: DiscoveryLead) => void;
  queueData?: import('@/hooks/useLeadDiscoveryQueue').DiscoveryQueueData;
}

type Step =
  | 'detail'              // Lead detail view (has discovery data from previous call)
  | 'answer'              // Did they answer?
  | 'form'                // Full discovery form (the live script)
  | 'bad_number'          // Bad number reason picker
  | 'schedule_callback'   // Bad timing → quick callback on Callback calendar
  | 'schedule_discovery'  // Reschedule full discovery call on Discovery calendar
  | 'schedule_strategy'   // Reschedule strategy/zoom call on Strategy calendar
  | 'book_strategy'       // End of form → book strategy/zoom call
  | 'lost_detail'         // Viewing a lost lead — show reason + reactivate options
  | 'saved';              // Done

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

// Stages that indicate a discovery form has been filled out at some point
const ATTEMPT_STAGES = ['new', 'attempt_1', 'attempt_2', 'attempt_3', 'attempt_4'];

const STATE_DATA: Record<string, { name: string; coords: string }> = {
  AL: { name: 'Alabama', coords: '32.81° N, 86.79° W' }, AK: { name: 'Alaska', coords: '61.37° N, 152.40° W' },
  AZ: { name: 'Arizona', coords: '33.73° N, 111.43° W' }, AR: { name: 'Arkansas', coords: '34.97° N, 92.37° W' },
  CA: { name: 'California', coords: '36.12° N, 119.68° W' }, CO: { name: 'Colorado', coords: '39.06° N, 105.31° W' },
  CT: { name: 'Connecticut', coords: '41.60° N, 72.76° W' }, DE: { name: 'Delaware', coords: '39.32° N, 75.51° W' },
  DC: { name: 'Washington DC', coords: '38.90° N, 77.03° W' }, FL: { name: 'Florida', coords: '27.77° N, 81.69° W' },
  GA: { name: 'Georgia', coords: '33.04° N, 83.64° W' }, HI: { name: 'Hawaii', coords: '21.09° N, 157.50° W' },
  ID: { name: 'Idaho', coords: '44.24° N, 114.48° W' }, IL: { name: 'Illinois', coords: '40.35° N, 88.99° W' },
  IN: { name: 'Indiana', coords: '39.85° N, 86.26° W' }, IA: { name: 'Iowa', coords: '42.01° N, 93.21° W' },
  KS: { name: 'Kansas', coords: '38.53° N, 96.73° W' }, KY: { name: 'Kentucky', coords: '37.67° N, 84.67° W' },
  LA: { name: 'Louisiana', coords: '31.17° N, 91.87° W' }, ME: { name: 'Maine', coords: '44.69° N, 69.38° W' },
  MD: { name: 'Maryland', coords: '39.06° N, 76.80° W' }, MA: { name: 'Massachusetts', coords: '42.23° N, 71.53° W' },
  MI: { name: 'Michigan', coords: '43.33° N, 84.54° W' }, MN: { name: 'Minnesota', coords: '45.69° N, 93.90° W' },
  MS: { name: 'Mississippi', coords: '32.74° N, 89.68° W' }, MO: { name: 'Missouri', coords: '38.46° N, 92.29° W' },
  MT: { name: 'Montana', coords: '46.92° N, 110.45° W' }, NE: { name: 'Nebraska', coords: '41.13° N, 98.27° W' },
  NV: { name: 'Nevada', coords: '38.31° N, 117.06° W' }, NH: { name: 'New Hampshire', coords: '43.45° N, 71.56° W' },
  NJ: { name: 'New Jersey', coords: '40.30° N, 74.52° W' }, NM: { name: 'New Mexico', coords: '34.84° N, 106.25° W' },
  NY: { name: 'New York', coords: '42.17° N, 74.95° W' }, NC: { name: 'North Carolina', coords: '35.63° N, 79.81° W' },
  ND: { name: 'North Dakota', coords: '47.53° N, 99.78° W' }, OH: { name: 'Ohio', coords: '40.39° N, 82.76° W' },
  OK: { name: 'Oklahoma', coords: '35.57° N, 96.93° W' }, OR: { name: 'Oregon', coords: '44.57° N, 122.07° W' },
  PA: { name: 'Pennsylvania', coords: '40.59° N, 77.21° W' }, RI: { name: 'Rhode Island', coords: '41.68° N, 71.51° W' },
  SC: { name: 'South Carolina', coords: '33.86° N, 80.95° W' }, SD: { name: 'South Dakota', coords: '44.30° N, 99.44° W' },
  TN: { name: 'Tennessee', coords: '35.75° N, 86.69° W' }, TX: { name: 'Texas', coords: '31.05° N, 97.56° W' },
  UT: { name: 'Utah', coords: '40.15° N, 111.86° W' }, VT: { name: 'Vermont', coords: '44.05° N, 72.71° W' },
  VA: { name: 'Virginia', coords: '37.77° N, 78.17° W' }, WA: { name: 'Washington', coords: '47.40° N, 121.49° W' },
  WV: { name: 'West Virginia', coords: '38.49° N, 80.95° W' }, WI: { name: 'Wisconsin', coords: '44.27° N, 89.62° W' },
  WY: { name: 'Wyoming', coords: '42.76° N, 107.30° W' },
};

// Reverse lookup: full name → abbreviation (case-insensitive)
const STATE_NAME_TO_ABBR: Record<string, string> = {};
for (const [abbr, data] of Object.entries(STATE_DATA)) {
  STATE_NAME_TO_ABBR[data.name.toLowerCase()] = abbr;
}

function resolveState(raw: string | null): { name: string; coords: string } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Try abbreviation first (e.g. "FL")
  const upper = trimmed.toUpperCase();
  if (STATE_DATA[upper]) return STATE_DATA[upper];
  // Try full name (e.g. "Florida")
  const abbr = STATE_NAME_TO_ABBR[trimmed.toLowerCase()];
  if (abbr && STATE_DATA[abbr]) return STATE_DATA[abbr];
  return null;
}

export function DiscoveryCallSheet({ open, onClose, lead, agentId, callbackCalendarId, subaccountId, onCallNext, queueData }: DiscoveryCallSheetProps) {
  const [step, setStep] = useState<Step>('answer');
  const [booking, setBooking] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  // Hold form data when transitioning from form → book_strategy
  const [pendingFormData, setPendingFormData] = useState<{
    outcome: DiscoveryOutcome;
    temperature?: string;
    discovery_data: DiscoveryFormData;
  } | null>(null);
  const [qualifies, setQualifies] = useState<string | null>(null);
  const [dqReasons, setDqReasons] = useState<string[]>([]);
  const [annuityOpportunity, setAnnuityOpportunity] = useState<string | null>(null);
  const [callBackDate, setCallBackDate] = useState<string>('');
  const [showCallBackPicker, setShowCallBackPicker] = useState(false);

  const saveCall = useSaveDiscoveryCall();
  const claimLead = useClaimLead();
  const releaseLead = useReleaseLead();
  const { data: callHistory } = useDiscoveryCallsForLead(lead?.id || null);

  useEffect(() => {
    if (open && lead) {
      // Route to the right step based on current stage
      const isLost = lead.discovery_stage === 'lost' || lead.discovery_stage === 'long_term_nurture';
      const isStrategyNoShow = lead.discovery_stage === 'strategy_no_show';
      const hasDiscoveryData = !ATTEMPT_STAGES.includes(lead.discovery_stage || 'new');

      let initialStep: Step = 'answer';
      if (isLost) {
        initialStep = 'lost_detail';
      } else if (isStrategyNoShow) {
        initialStep = 'book_strategy';
      } else if (hasDiscoveryData) {
        initialStep = 'detail';
      }

      setStep(initialStep);
      if (isStrategyNoShow) setSavedMessage(''); // Clear for rebook flow
      setPendingFormData(null);
      setSavedMessage('');
      setQualifies(null);
      setDqReasons([]);
      setAnnuityOpportunity(null);
      setCallBackDate('');
      setShowCallBackPicker(false);
      claimLead.mutate(lead.id);
    }
  }, [open, lead?.id]);

  // Pre-fill qualifies + annuity from most recent answered call (async loaded)
  useEffect(() => {
    if (callHistory && callHistory.length > 0 && lead) {
      const lastAnswered = callHistory.find((c) => c.answered && c.discovery_data);
      if (lastAnswered?.discovery_data) {
        if (lastAnswered.discovery_data.qualifies && !qualifies) setQualifies(lastAnswered.discovery_data.qualifies);
        if (lastAnswered.discovery_data.annuity_opportunity && !annuityOpportunity) setAnnuityOpportunity(lastAnswered.discovery_data.annuity_opportunity);
        if (lastAnswered.discovery_data.dq_reason && dqReasons.length === 0) {
          const reasons = lastAnswered.discovery_data.dq_reason.split(', ').filter(Boolean);
          if (reasons.length > 0) setDqReasons(reasons);
        }
      }
    }
  }, [callHistory, lead?.id]);

  const handleClose = () => {
    if (lead && step !== 'saved') {
      releaseLead.mutate(lead.id);
    }
    onClose();
  };

  if (!lead) return null;

  const rawName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown';
  const name = rawName.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const currentAttempt = lead.call_attempt_count || 0;
  const nextAttempt = currentAttempt + 1;

  // ── Answer Step Handlers ───────────────────────────────────────────────────

  // "Yes, let's go" → full discovery form
  const handleAnswered = () => setStep('form');

  // "Yes, bad timing" → schedule callback
  const handleBadTiming = () => setStep('schedule_callback');

  // "No answer"
  const handleNoAnswer = () => {
    saveCall.mutate(
      {
        lead_id: lead.id,
        agent_id: agentId,
        attempt_number: nextAttempt,
        answered: false,
        outcome: 'no_answer',
        current_stage: lead.discovery_stage || undefined,
      },
      {
        onSuccess: () => {
          setSavedMessage(`No answer logged — Attempt ${Math.min(nextAttempt, 4)}`);
          setStep('saved');
        },
      }
    );
  };

  // Bad number
  const handleBadNumber = (reason: string) => {
    saveCall.mutate(
      {
        lead_id: lead.id,
        agent_id: agentId,
        attempt_number: nextAttempt,
        answered: false,
        outcome: 'bad_number',
        bad_number_reason: reason,
      },
      {
        onSuccess: () => {
          setSavedMessage(`Bad number (${reason.replace(/_/g, ' ')}) — moved to Lost`);
          setStep('saved');
        },
      }
    );
  };

  // ── Callback Scheduling (bad timing path) ───────────────────────────────────

  const handleCallbackSlotSelected = async (slot: string, _calendarId: string) => {
    setBooking(true);
    try {
      saveCall.mutate({
        lead_id: lead.id,
        agent_id: agentId,
        attempt_number: nextAttempt,
        answered: true,
        outcome: 'call_back',
      });

      await invokeEdgeFunction('book-discovery-appointment', {
        lead_id: lead.id,
        agent_id: agentId,
        calendar_id: callbackCalendarId || _calendarId,
        calendar_type: 'callback',
        selected_slot: slot,
        reschedule: true,
        notes: `Callback scheduled from dial tracker. Lead answered but bad timing.`,
      });

      const timeStr = new Date(slot).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      toast.success(`Callback booked for ${timeStr}`);
      setSavedMessage(`Callback booked for ${timeStr}`);
      setStep('saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to book callback');
    } finally {
      setBooking(false);
    }
  };

  // ── Intro Scheduling (reschedule discovery path) ───────────────────────────

  const handleIntroSlotSelected = async (slot: string, calendarId: string) => {
    setBooking(true);
    try {
      // Save a discovery call record for the attempt
      saveCall.mutate({
        lead_id: lead.id,
        agent_id: agentId,
        attempt_number: nextAttempt,
        answered: true,
        outcome: 'intro_scheduled',
      });

      // Book the appointment (reschedule cancels existing first)
      await invokeEdgeFunction('book-discovery-appointment', {
        lead_id: lead.id,
        agent_id: agentId,
        calendar_id: calendarId,
        calendar_type: 'discovery',
        selected_slot: slot,
        reschedule: true,
        notes: `Discovery call scheduled from dial tracker.`,
      });

      const timeStr = new Date(slot).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      toast.success(`Discovery call booked for ${timeStr}`);
      setSavedMessage(`Intro call booked for ${timeStr}`);
      setStep('saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to book');
    } finally {
      setBooking(false);
    }
  };

  // ── Form Completion Handlers ───────────────────────────────────────────────

  const handleFormSave = (data: {
    outcome: DiscoveryOutcome;
    temperature?: string;
    discovery_data: DiscoveryFormData;
  }) => {
    // Save discovery data first (without final outcome — that's decided next)
    setPendingFormData(data);

    // Save the discovery call record with a pending state
    saveCall.mutate(
      {
        lead_id: lead.id,
        agent_id: agentId,
        attempt_number: nextAttempt,
        answered: true,
        outcome: 'cant_book_now', // temporary — updated when they book or skip
        temperature: data.temperature,
        discovery_data: data.discovery_data,
      },
      {
        onSuccess: () => {
          // Now show the booking + outcome screen
          setStep('book_strategy');
        },
      }
    );
  };

  // ── Strategy Booking (post-form) ───────────────────────────────────────────

  const handleStrategySlotSelected = async (slot: string, calendarId: string) => {
    if (!pendingFormData) {
      // Direct rebook (no form data) — e.g., from strategy_no_show
      setBooking(true);
      try {
        saveCall.mutate({
          lead_id: lead.id,
          agent_id: agentId,
          attempt_number: nextAttempt,
          answered: true,
          outcome: 'strategy_booked',
          ...(qualifies ? { discovery_data: { qualifies, ...(annuityOpportunity ? { annuity_opportunity: annuityOpportunity } : {}), ...(dqReasons.length > 0 ? { dq_reason: dqReasons.join(', ') } : {}) } } : {}),
          appointment_datetime: slot,
        });

        await invokeEdgeFunction('book-discovery-appointment', {
          lead_id: lead.id,
          agent_id: agentId,
          calendar_id: calendarId,
          calendar_type: 'strategy',
          selected_slot: slot,
          reschedule: true,
          notes: 'Strategy call rebooked after no-show',
        });

        const timeStr = new Date(slot).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        });
        toast.success(`Strategy call booked for ${timeStr}!`);
        setSavedMessage(`Strategy call booked for ${timeStr}`);
        setStep('saved');
      } catch (err: any) {
        toast.error(err.message || 'Failed to book strategy call');
      } finally {
        setBooking(false);
      }
      return;
    }

    setBooking(true);

    try {
      // Build discovery summary for appointment notes
      const disc = pendingFormData.discovery_data;
      const noteLines = [
        'IUL DISCOVERY CALL NOTES',
        disc.interests?.length ? `Interest: ${disc.interests.join(', ')}` : '',
        disc.occupation ? `Occupation: ${disc.occupation}` : '',
        disc.contribution ? `Contribution: ${disc.contribution}` : '',
        disc.retire_age ? `Retire age: ${disc.retire_age}` : '',
        qualifies ? `Qualifies: ${qualifies}` : '',
        pendingFormData.temperature ? `Temperature: ${pendingFormData.temperature}/10` : '',
        disc.notes ? `Notes: ${disc.notes}` : '',
      ].filter(Boolean).join('\n');

      // Save the discovery call record first (include qualifies, dq_reason, annuity_opportunity in discovery_data)
      const enrichedData = {
        ...pendingFormData.discovery_data,
        ...(qualifies ? { qualifies } : {}),
        ...(dqReasons.length > 0 ? { dq_reason: dqReasons.join(', ') } : {}),
        ...(annuityOpportunity ? { annuity_opportunity: annuityOpportunity } : {}),
      };
      saveCall.mutate({
        lead_id: lead.id,
        agent_id: agentId,
        attempt_number: nextAttempt,
        answered: true,
        outcome: 'strategy_booked',
        temperature: pendingFormData.temperature,
        discovery_data: enrichedData,
        appointment_datetime: slot,
      });

      // Book the strategy appointment (reschedule cancels existing first)
      await invokeEdgeFunction('book-discovery-appointment', {
        lead_id: lead.id,
        agent_id: agentId,
        calendar_id: calendarId,
        calendar_type: 'strategy',
        selected_slot: slot,
        reschedule: true,
        notes: noteLines,
      });

      const timeStr = new Date(slot).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      toast.success(`Strategy call booked for ${timeStr}!`);
      setSavedMessage(`Strategy call booked for ${timeStr}`);
      setStep('saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to book strategy call');
    } finally {
      setBooking(false);
    }
  };

  // Skip strategy booking with a specific outcome — updates the already-saved call record
  const handleSkipWithOutcome = async (outcome: DiscoveryOutcome, callbackDate?: string) => {
    // Build the update payload — include qualifies + callback_date in discovery_data if available
    const updatePayload: Record<string, any> = { outcome };
    if (pendingFormData) {
      const enrichedData = {
        ...pendingFormData.discovery_data,
        ...(qualifies ? { qualifies } : {}),
        ...(dqReasons.length > 0 ? { dq_reason: dqReasons.join(', ') } : {}),
        ...(annuityOpportunity ? { annuity_opportunity: annuityOpportunity } : {}),
        ...(callbackDate ? { callback_date: callbackDate } : {}),
      };
      updatePayload.discovery_data = enrichedData;
    }

    // Update the discovery call that was already saved with the real outcome
    await supabase
      .from('discovery_calls')
      .update(updatePayload)
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Determine stage
    let newStage = 'discovery_complete';
    let lostReason: string | null = null;
    if (outcome === 'not_a_fit') { newStage = 'lost'; lostReason = 'not_a_fit'; }
    if (outcome === 'long_term_nurture') newStage = 'long_term_nurture';
    if (outcome === 'call_back') newStage = 'discovery_complete';

    await supabase
      .from('leads')
      .update({
        discovery_stage: newStage,
        ...(lostReason ? { lost_reason: lostReason } : {}),
      })
      .eq('id', lead.id);

    // Book 15-min callback on the Callback calendar if date is set
    if (outcome === 'call_back' && callbackDate) {
      try {
        const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
        await invokeEdgeFunction('book-discovery-appointment', {
          lead_id: lead.id,
          agent_id: agentId,
          calendar_id: callbackCalendarId || '7DRohwRVnVUA5QvMOiHN', // Per-user callback calendar
          calendar_type: 'callback',
          selected_slot: callbackDate,
          notes: `Callback: ${leadName}\n${pendingFormData?.discovery_data?.notes || ''}`,
        });
        toast.success(`Callback booked for ${new Date(callbackDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`);
        setSavedMessage(`Callback booked — ${new Date(callbackDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`);
      } catch (err: any) {
        console.error('Callback booking failed:', err);
        toast.error('Callback saved but calendar booking failed');
        setSavedMessage('Call back saved (calendar booking failed)');
      }
    } else {
      const messages: Record<string, string> = {
        not_a_fit: 'Not a fit — moved to Lost',
        call_back: 'Call back later — stays in queue',
        long_term_nurture: 'Long-term nurture',
        cant_book_now: 'Saved — needs booking follow-up',
      };
      toast.success(messages[outcome] || 'Saved');
      setSavedMessage(messages[outcome] || 'Call saved');
    }
    setStep('saved');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const stateInfo = resolveState(lead.state);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0 border-white/[0.06] bg-[rgba(8,8,8,0.95)] backdrop-blur-2xl rounded-2xl">
        {/* Header with Location Map */}
        <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[rgba(8,8,8,0.95)] backdrop-blur-2xl">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
          <div className="flex gap-5 p-4 sm:p-5">
            {/* Location Map */}
            {stateInfo && (
              <div className="flex-shrink-0 hidden sm:block">
                <LocationMap
                  location={stateInfo.name}
                  coordinates={stateInfo.coords}
                />
              </div>
            )}

            {/* Lead Info */}
            <div className="flex-1 min-w-0">
              <DialogHeader className="space-y-0 p-0">
                <DialogTitle className="text-xl font-semibold text-luxury tracking-tight flex items-center gap-3">
                  {name}
                  <TemperatureBadge temp={lead.discovery_temperature} />
                  {lead.delivery_status !== 'delivered' && (
                    <Badge variant="destructive" className="text-[10px]">CRM Error</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-primary transition-colors">
                    <Phone className="h-3.5 w-3.5 text-white/25" /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <span className="inline-flex items-center gap-2 text-sm text-white/50 truncate">
                    <Mail className="h-3.5 w-3.5 text-white/25" /> {lead.email}
                  </span>
                )}
                {lead.age && (
                  <span className="inline-flex items-center gap-2 text-sm text-white/50">
                    <span className="text-white/25 text-xs">AGE</span> {lead.age}
                  </span>
                )}
                {lead.state && (
                  <span className="inline-flex items-center gap-2 text-sm text-white/50">
                    <MapPin className="h-3.5 w-3.5 text-white/25" /> {lead.state}
                  </span>
                )}
              </div>

              {/* Quick status badges */}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className={cn('text-[10px] font-bold', stageConfig[lead.discovery_stage || 'new']?.color || stageConfig.new.color)}>
                  {stageConfig[lead.discovery_stage || 'new']?.label || 'New'}
                </Badge>
                {lead.status && lead.status !== 'new' && (
                  <Badge variant="outline" className="text-[10px] font-bold bg-white/[0.04] text-white/50 border-white/[0.08]">
                    {lead.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* ── Call History (inline — hidden on detail + saved steps) ────────── */}
          {callHistory && callHistory.length > 0 && step !== 'saved' && step !== 'detail' && (
            <div className="mb-4 p-3 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Previous Attempts</p>
              <div className="space-y-1.5">
                {callHistory.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/50 font-mono w-5">c{c.attempt_number}</span>
                      <span className="text-muted-foreground">
                        {new Date(c.call_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' '}
                        {new Date(c.call_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {c.called_by_name && <span className="text-muted-foreground/50">by {c.called_by_name}</span>}
                    </div>
                    <OutcomeBadge outcome={c.answered ? c.outcome : 'no_answer'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Lead Detail View ──────────────────────────────────────── */}
          {step === 'detail' && (
            <LeadDetailView
              lead={lead}
              discoveryData={
                // Find the most recent answered call's discovery data
                callHistory?.find((c) => c.answered && c.discovery_data && Object.keys(c.discovery_data).length > 0)?.discovery_data || null
              }
              callHistory={callHistory || []}
              onCallAgain={() => setStep('answer')}
              onBookStrategy={() => setStep('book_strategy')}
              onRescheduleStrategy={() => setStep('book_strategy')}
              onClose={handleClose}
              subaccountId={subaccountId}
            />
          )}

          {/* ── Step: Did they answer? ──────────────────────────────────────── */}
          {step === 'answer' && (
            <div className="space-y-6 text-center py-8">
              <div>
                <div className="text-3xl font-black text-luxury">
                  Attempt {nextAttempt}
                </div>
                <p className="text-sm font-medium text-white/35 mt-2">Did they answer?</p>
              </div>

              <div className="flex flex-col gap-4 max-w-md mx-auto">
                {/* Primary actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAnswered}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-medium text-base hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-[0.97] transition-all duration-200"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Yes, let's go
                  </button>
                  <button
                    onClick={handleNoAnswer}
                    disabled={saveCall.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 font-medium text-base hover:bg-red-500/20 hover:border-red-500/40 active:scale-[0.97] transition-all duration-200 disabled:opacity-40"
                  >
                    <PhoneMissed className="h-5 w-5" />
                    No Answer
                  </button>
                </div>

                {/* Schedule section divider */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20">Schedule</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                </div>

                {/* Schedule buttons */}
                <div className="flex gap-2">
                  <button onClick={handleBadTiming} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400/80 text-xs font-medium hover:bg-amber-500/15 hover:border-amber-500/35 active:scale-[0.97] transition-all duration-200">
                    <Clock className="h-3.5 w-3.5" /> Callback
                  </button>
                  <button onClick={() => setStep('schedule_discovery')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/20 text-blue-400/80 text-xs font-medium hover:bg-blue-500/15 hover:border-blue-500/35 active:scale-[0.97] transition-all duration-200">
                    <Calendar className="h-3.5 w-3.5" /> Discovery
                  </button>
                  <button onClick={() => setStep('schedule_strategy')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-500/8 border border-purple-500/20 text-purple-400/80 text-xs font-medium hover:bg-purple-500/15 hover:border-purple-500/35 active:scale-[0.97] transition-all duration-200">
                    <Video className="h-3.5 w-3.5" /> Strategy
                  </button>
                </div>

                {/* Bad number */}
                <button
                  onClick={() => setStep('bad_number')}
                  className="flex items-center justify-center gap-1.5 text-xs text-white/20 hover:text-red-400 transition-colors mt-1 mx-auto"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                  Bad Number
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Bad Number ────────────────────────────────────────────── */}
          {step === 'bad_number' && (
            <div className="py-8">
              <BadNumberHandler
                onSelect={handleBadNumber}
                onBack={() => setStep('answer')}
              />
            </div>
          )}

          {/* ── Step: Schedule Intro (bad timing) ──────────────────────────── */}
          {/* ── Step: Schedule Callback (bad timing → Callback calendar) ──── */}
          {step === 'schedule_callback' && (
            <div className="py-4 space-y-4">
              <button onClick={() => setStep('answer')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="text-center mb-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  Schedule a quick callback
                </p>
              </div>
              {booking ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-400 mb-3" />
                  <p className="text-sm text-muted-foreground">Booking callback...</p>
                </div>
              ) : (
                <SlotPicker
                  agentId={agentId}
                  calendarType="callback"
                  calendarId={callbackCalendarId || undefined}
                  onSlotSelected={handleCallbackSlotSelected}
                  onCancel={() => {
                    saveCall.mutate(
                      {
                        lead_id: lead.id,
                        agent_id: agentId,
                        attempt_number: nextAttempt,
                        answered: true,
                        outcome: 'bad_timing',
                        current_stage: lead.discovery_stage || undefined,
                      },
                      {
                        onSuccess: () => {
                          setSavedMessage('Bad timing logged — call back later');
                          setStep('saved');
                        },
                      }
                    );
                  }}
                  title="Schedule Callback"
                />
              )}
            </div>
          )}

          {/* ── Step: Schedule Discovery (full discovery call → Discovery calendar) */}
          {step === 'schedule_discovery' && (
            <div className="py-4 space-y-4">
              <button onClick={() => setStep('answer')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="text-center mb-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  Schedule the discovery call
                </p>
              </div>
              {booking ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-400 mb-3" />
                  <p className="text-sm text-muted-foreground">Booking discovery call...</p>
                </div>
              ) : (
                <SlotPicker
                  agentId={agentId}
                  calendarType="discovery"
                  onSlotSelected={handleIntroSlotSelected}
                  onCancel={() => {
                    saveCall.mutate(
                      {
                        lead_id: lead.id,
                        agent_id: agentId,
                        attempt_number: nextAttempt,
                        answered: true,
                        outcome: 'bad_timing',
                        current_stage: lead.discovery_stage || undefined,
                      },
                      {
                        onSuccess: () => {
                          setSavedMessage('Saved — call back later');
                          setStep('saved');
                        },
                      }
                    );
                  }}
                  title="Schedule Discovery Call"
                />
              )}
            </div>
          )}

          {/* ── Step: Reschedule Strategy (Strategy/Zoom calendar) ──────────── */}
          {step === 'schedule_strategy' && (
            <div className="py-4 space-y-4">
              <button onClick={() => setStep('answer')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <div className="text-center mb-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  Reschedule the strategy call
                </p>
              </div>
              {booking ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-purple-400 mb-3" />
                  <p className="text-sm text-muted-foreground">Booking strategy call...</p>
                </div>
              ) : (
                <SlotPicker
                  agentId={agentId}
                  calendarType="strategy"
                  onSlotSelected={handleStrategySlotSelected}
                  onCancel={() => setStep('answer')}
                  title="Reschedule Strategy Call"
                />
              )}
            </div>
          )}

          {/* ── Step: Full Discovery Form (the live script) ────────────────── */}
          {step === 'form' && (
            <div>
              <button onClick={() => setStep('answer')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            <DiscoveryCallForm
              lead={lead}
              agentId={agentId}
              onSave={handleFormSave}
              saving={saveCall.isPending}
            />
            </div>
          )}

          {/* ── Step: Book Strategy Call (post-form) ───────────────────────── */}
          {step === 'book_strategy' && (
            <div className="py-4 space-y-6">
              <div className="text-center mb-2">
                {lead.discovery_stage === 'strategy_no_show' ? (
                  <>
                    <AlertTriangle className="h-10 w-10 mx-auto text-red-400 mb-2" />
                    <p className="text-lg font-bold text-foreground">Strategy Call No-Show</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Rebook the strategy call
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-10 w-10 mx-auto text-green-400 mb-2" />
                    <p className="text-lg font-bold text-foreground">Discovery saved!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Schedule the strategy call
                    </p>
                  </>
                )}
              </div>

              {/* Qualifies toggle */}
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Qualifies?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border',
                      qualifies === 'yes'
                        ? 'border-green-500/40 bg-green-500/15 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.05]'
                    )}
                    onClick={() => { setQualifies('yes'); setDqReasons([]); }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border',
                      qualifies === 'no'
                        ? 'border-red-500/40 bg-red-500/15 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.05]'
                    )}
                    onClick={() => setQualifies('no')}
                  >
                    No
                  </button>
                </div>
                {qualifies === 'no' && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">DQ Reason</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Age (too young/old)',
                        'Health conditions',
                        'Income too low',
                        'Not interested',
                        'Already has coverage',
                        'Tobacco/health risk',
                        'Felony',
                        'Wrong state',
                        'Other',
                      ].map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setDqReasons((prev) =>
                            prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
                          )}
                          className={cn(
                            'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                            dqReasons.includes(reason)
                              ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                              : 'border-border bg-background/50 text-muted-foreground hover:border-rose-500/30'
                          )}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Annuity opportunity toggle */}
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Potential Annuity Opportunity?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border',
                      annuityOpportunity === 'yes'
                        ? 'border-green-500/40 bg-green-500/15 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.05]'
                    )}
                    onClick={() => setAnnuityOpportunity('yes')}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border',
                      annuityOpportunity === 'no'
                        ? 'border-red-500/40 bg-red-500/15 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                        : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.05]'
                    )}
                    onClick={() => setAnnuityOpportunity('no')}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Calendar slot picker */}
              {booking ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-green-400 mb-3" />
                  <p className="text-sm text-muted-foreground">Booking strategy call...</p>
                </div>
              ) : (
                <SlotPicker
                  agentId={agentId}
                  calendarType="strategy"
                  onSlotSelected={handleStrategySlotSelected}
                  onCancel={() => {}} // Don't auto-skip — let them use the options below
                  title="Book Strategy / Zoom Call"
                />
              )}

              {/* Not scheduling? — outcome options */}
              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20 text-center mb-3">
                  Not scheduling a call?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button onClick={() => handleSkipWithOutcome('not_a_fit')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400/80 text-xs font-medium hover:bg-red-500/15 hover:border-red-500/35 active:scale-[0.97] transition-all duration-200">
                    <XCircle className="h-3.5 w-3.5" /> Not a Fit
                  </button>
                  <button onClick={() => { if (!showCallBackPicker) { setShowCallBackPicker(true); } else if (callBackDate) { handleSkipWithOutcome('call_back', callBackDate); } else { handleSkipWithOutcome('call_back'); } }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400/80 text-xs font-medium hover:bg-amber-500/15 hover:border-amber-500/35 active:scale-[0.97] transition-all duration-200">
                    <PhoneForwarded className="h-3.5 w-3.5" /> {showCallBackPicker && callBackDate ? 'Confirm Call Back' : 'Call Back Later'}
                  </button>
                  <button onClick={() => handleSkipWithOutcome('long_term_nurture')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/8 border border-purple-500/20 text-purple-400/80 text-xs font-medium hover:bg-purple-500/15 hover:border-purple-500/35 active:scale-[0.97] transition-all duration-200">
                    <Sprout className="h-3.5 w-3.5" /> Nurture
                  </button>
                  <button onClick={() => handleSkipWithOutcome('cant_book_now')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/40 text-xs font-medium hover:bg-white/[0.06] hover:text-white/60 active:scale-[0.97] transition-all duration-200">
                    Save Without Outcome
                  </button>
                </div>

                {/* Call Back date/time picker */}
                {showCallBackPicker && (
                  <div className="mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <p className="text-xs font-bold text-amber-400">When should we call back?</p>
                    <input
                      type="datetime-local"
                      value={callBackDate}
                      onChange={(e) => setCallBackDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                    <div className="flex gap-2">
                      <button disabled={!callBackDate} onClick={() => handleSkipWithOutcome('call_back', callBackDate)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-medium hover:bg-amber-500/20 active:scale-[0.97] transition-all duration-200 disabled:opacity-40">
                        <Clock className="h-3.5 w-3.5" /> Set Call Back
                      </button>
                      <button onClick={() => { setShowCallBackPicker(false); setCallBackDate(''); }} className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-white/[0.06] active:scale-[0.97] transition-all duration-200">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step: Lost Detail — show reason + reactivate options ──────── */}
          {step === 'lost_detail' && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-3" />
                <p className="text-lg font-bold text-foreground">Lead Marked as Lost</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {lead.lost_reason
                    ? formatLostReasonLong(lead.lost_reason)
                    : lead.discovery_stage === 'long_term_nurture'
                      ? 'Moved to long-term nurture'
                      : 'No reason recorded'}
                </p>
                {lead.last_call_attempt_at && (
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {new Date(lead.last_call_attempt_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                    {lead.last_attempted_by && ` by ${lead.last_attempted_by}`}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5 max-w-sm mx-auto">
                <button
                  onClick={async () => {
                    await supabase.from('leads').update({ discovery_stage: 'new', lost_reason: null, call_attempt_count: 0 }).eq('id', lead.id);
                    toast.success('Lead moved back to Dial queue');
                    setSavedMessage('Lead reactivated — back in Dial queue');
                    setStep('saved');
                  }}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-[0.98] transition-all duration-200"
                >
                  <RotateCcw className="h-4 w-4" /> Move Back to Dial
                </button>
                <button
                  onClick={() => setStep('answer')}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 font-medium text-sm hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-[0.98] transition-all duration-200"
                >
                  <Phone className="h-4 w-4" /> Try Calling Again
                </button>
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 font-medium text-sm hover:bg-white/[0.06] hover:text-white/60 active:scale-[0.98] transition-all duration-200"
                >
                  Keep as Lost
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Saved ────────────────────────────────────────────────── */}
          {step === 'saved' && (
            <div className="text-center py-12 space-y-5">
              <CheckCircle className="h-16 w-16 mx-auto text-green-400" style={{ filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.4))' }} />
              <p className="text-lg font-semibold text-white/80">{savedMessage || 'Call Saved'}</p>
              <div className="flex flex-col gap-3 max-w-sm mx-auto mt-4">
                {queueData && (() => {
                  const nextLead = queueData.queue.find(l => l.id !== lead?.id);
                  if (!nextLead) return null;
                  const nextName = [nextLead.first_name, nextLead.last_name].filter(Boolean).join(' ') || 'Next Lead';
                  return (
                    <button
                      onClick={() => onCallNext?.(nextLead)}
                      className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-[0.98] transition-all duration-200"
                    >
                      <PhoneCall className="h-4 w-4" /> Call Next: {nextName}
                    </button>
                  );
                })()}
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 font-medium text-sm hover:bg-white/[0.06] hover:text-white/60 active:scale-[0.98] transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatLostReasonLong(reason: string): string {
  const map: Record<string, string> = {
    not_a_fit: 'Marked as Not a Fit during discovery call',
    bad_number: 'Bad phone number',
    disconnected: 'Phone number is disconnected',
    wrong_number: 'Wrong phone number',
    not_in_service: 'Phone number not in service',
    no_ring: "Phone number doesn't ring",
    straight_to_vm: 'Goes straight to voicemail',
    not_approved: 'Application was not approved',
    wrong_state: 'Lead is in wrong state for licensing',
  };
  return map[reason] || `Reason: ${reason.replace(/_/g, ' ')}`;
}
