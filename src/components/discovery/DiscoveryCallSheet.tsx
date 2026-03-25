import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, CheckCircle, PhoneMissed, PhoneOff, Clock, Loader2, AlertTriangle, RotateCcw, XCircle, PhoneForwarded, Sprout } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DiscoveryCallForm } from './DiscoveryCallForm';
import { BadNumberHandler } from './BadNumberHandler';
import { SlotPicker } from './SlotPicker';
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
  onCallNext?: (lead: DiscoveryLead) => void;
  queueData?: import('@/hooks/useLeadDiscoveryQueue').DiscoveryQueueData;
}

type Step =
  | 'answer'           // Did they answer?
  | 'form'             // Full discovery form (the live script)
  | 'bad_number'       // Bad number reason picker
  | 'schedule_intro'   // Bad timing → schedule discovery call for later
  | 'book_strategy'    // End of form → book strategy/zoom call
  | 'lost_detail'      // Viewing a lost lead — show reason + reactivate options
  | 'saved';           // Done

export function DiscoveryCallSheet({ open, onClose, lead, agentId, onCallNext, queueData }: DiscoveryCallSheetProps) {
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
  const [callBackDate, setCallBackDate] = useState<string>('');
  const [showCallBackPicker, setShowCallBackPicker] = useState(false);

  const saveCall = useSaveDiscoveryCall();
  const claimLead = useClaimLead();
  const releaseLead = useReleaseLead();
  const { data: callHistory } = useDiscoveryCallsForLead(lead?.id || null);

  useEffect(() => {
    if (open && lead) {
      // If lead is lost, show the lost detail screen instead of the answer step
      const isLost = lead.discovery_stage === 'lost' || lead.discovery_stage === 'long_term_nurture';
      setStep(isLost ? 'lost_detail' : 'answer');
      setPendingFormData(null);
      setSavedMessage('');
      setQualifies(null);
      setCallBackDate('');
      setShowCallBackPicker(false);
      claimLead.mutate(lead.id);
    }
  }, [open, lead?.id]);

  const handleClose = () => {
    if (lead && step !== 'saved') {
      releaseLead.mutate(lead.id);
    }
    onClose();
  };

  if (!lead) return null;

  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown';
  const currentAttempt = lead.call_attempt_count || 0;
  const nextAttempt = currentAttempt + 1;

  // ── Answer Step Handlers ───────────────────────────────────────────────────

  // "Yes, let's go" → full discovery form
  const handleAnswered = () => setStep('form');

  // "Yes, bad timing" → schedule intro call for later
  const handleBadTiming = () => setStep('schedule_intro');

  // "No answer"
  const handleNoAnswer = () => {
    saveCall.mutate(
      {
        lead_id: lead.id,
        agent_id: agentId,
        attempt_number: nextAttempt,
        answered: false,
        outcome: 'no_answer',
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

  // ── Intro Scheduling (bad timing path) ─────────────────────────────────────

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

      // Book the appointment
      await invokeEdgeFunction('book-discovery-appointment', {
        lead_id: lead.id,
        agent_id: agentId,
        calendar_id: calendarId,
        calendar_type: 'discovery',
        selected_slot: slot,
        notes: `Intro discovery call scheduled from dial tracker. Lead answered but couldn't talk.`,
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
    if (!pendingFormData) return;
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

      // Save the discovery call record first (include qualifies in discovery_data)
      const enrichedData = { ...pendingFormData.discovery_data, ...(qualifies ? { qualifies } : {}) };
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

      // Book the strategy appointment
      await invokeEdgeFunction('book-discovery-appointment', {
        lead_id: lead.id,
        agent_id: agentId,
        calendar_id: calendarId,
        calendar_type: 'strategy',
        selected_slot: slot,
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
          calendar_id: '7DRohwRVnVUA5QvMOiHN', // Callback calendar
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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg font-bold flex items-center gap-2">
                {name}
                <TemperatureBadge temp={lead.discovery_temperature} />
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                    <Phone className="h-3 w-3" /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {lead.email}
                  </span>
                )}
                {lead.age && <span>Age {lead.age}</span>}
                {lead.state && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {lead.state}
                  </span>
                )}
              </div>
            </div>
            {lead.delivery_status !== 'delivered' && (
              <Badge variant="destructive" className="text-xs">CRM Error</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="p-4">
          {/* ── Call History ──────────────────────────────────────────────────── */}
          {callHistory && callHistory.length > 0 && step !== 'saved' && (
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

          {/* ── Step: Did they answer? ──────────────────────────────────────── */}
          {step === 'answer' && (
            <div className="space-y-5 text-center py-8">
              <div>
                <div className="text-3xl font-black bg-gradient-to-r from-pink-400 to-amber-500 bg-clip-text text-transparent">
                  Attempt {nextAttempt}
                </div>
                <p className="text-sm font-semibold text-muted-foreground mt-2">Did they answer?</p>
              </div>

              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className="flex-1 h-14 text-base font-bold border-2 border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    variant="outline"
                    onClick={handleAnswered}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Yes, let's go
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-14 text-base font-bold border-2 border-rose-500 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                    variant="outline"
                    onClick={handleNoAnswer}
                    disabled={saveCall.isPending}
                  >
                    <PhoneMissed className="h-5 w-5 mr-2" />
                    No Answer
                  </Button>
                </div>

                <Button
                  size="lg"
                  className="h-14 text-base font-bold border-2 border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  variant="outline"
                  onClick={handleBadTiming}
                >
                  <Clock className="h-5 w-5 mr-2" />
                  Yes, but bad timing
                </Button>

                <Button
                  variant="outline"
                  className="border-muted text-muted-foreground hover:border-red-500/40 hover:text-red-400"
                  onClick={() => setStep('bad_number')}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Bad Number
                </Button>
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
          {step === 'schedule_intro' && (
            <div className="py-4 space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  Schedule the discovery call for a better time
                </p>
              </div>
              {booking ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Booking appointment...</p>
                </div>
              ) : (
                <SlotPicker
                  agentId={agentId}
                  calendarType="discovery"
                  onSlotSelected={handleIntroSlotSelected}
                  onCancel={() => {
                    // Skip booking, just save as bad_timing
                    saveCall.mutate(
                      {
                        lead_id: lead.id,
                        agent_id: agentId,
                        attempt_number: nextAttempt,
                        answered: true,
                        outcome: 'bad_timing',
                      },
                      {
                        onSuccess: () => {
                          setSavedMessage('Bad timing logged — call back later');
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

          {/* ── Step: Full Discovery Form (the live script) ────────────────── */}
          {step === 'form' && (
            <DiscoveryCallForm
              lead={lead}
              agentId={agentId}
              onSave={handleFormSave}
              saving={saveCall.isPending}
            />
          )}

          {/* ── Step: Book Strategy Call (post-form) ───────────────────────── */}
          {step === 'book_strategy' && (
            <div className="py-4 space-y-6">
              <div className="text-center mb-2">
                <CheckCircle className="h-10 w-10 mx-auto text-green-400 mb-2" />
                <p className="text-lg font-bold text-foreground">Discovery saved!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Schedule the strategy call
                </p>
              </div>

              {/* Qualifies toggle */}
              <div className="p-4 rounded-xl border border-border bg-card/50 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Qualifies?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'flex-1',
                      qualifies === 'yes' && 'border-green-500 bg-green-500/10 text-green-400'
                    )}
                    onClick={() => setQualifies('yes')}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'flex-1',
                      qualifies === 'no' && 'border-rose-500 bg-rose-500/10 text-rose-400'
                    )}
                    onClick={() => setQualifies('no')}
                  >
                    No
                  </Button>
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
              <div className="border-t border-border/30 pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50 text-center mb-3">
                  Not scheduling a call?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => handleSkipWithOutcome('not_a_fit')}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Not a Fit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      if (!showCallBackPicker) {
                        setShowCallBackPicker(true);
                      } else if (callBackDate) {
                        handleSkipWithOutcome('call_back', callBackDate);
                      } else {
                        handleSkipWithOutcome('call_back');
                      }
                    }}
                  >
                    <PhoneForwarded className="h-3.5 w-3.5 mr-1.5" />
                    {showCallBackPicker && callBackDate ? 'Confirm Call Back' : 'Call Back Later'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                    onClick={() => handleSkipWithOutcome('long_term_nurture')}
                  >
                    <Sprout className="h-3.5 w-3.5 mr-1.5" />
                    Long-Term Nurture
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => handleSkipWithOutcome('cant_book_now')}
                  >
                    Save Without Outcome
                  </Button>
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
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
                        variant="outline"
                        disabled={!callBackDate}
                        onClick={() => handleSkipWithOutcome('call_back', callBackDate)}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Set Call Back
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-muted-foreground"
                        onClick={() => {
                          setShowCallBackPicker(false);
                          setCallBackDate('');
                        }}
                      >
                        Cancel
                      </Button>
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

              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <Button
                  size="lg"
                  className="h-14 text-base font-bold border-2 border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  variant="outline"
                  onClick={async () => {
                    await supabase.from('leads').update({
                      discovery_stage: 'new',
                      lost_reason: null,
                      call_attempt_count: 0,
                    }).eq('id', lead.id);
                    toast.success('Lead moved back to Follow Up queue');
                    setSavedMessage('Lead reactivated — back in Follow Up queue');
                    setStep('saved');
                  }}
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Move Back to Follow Up
                </Button>

                <Button
                  size="lg"
                  className="h-14 text-base font-bold border-2 border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  variant="outline"
                  onClick={() => setStep('answer')}
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Try Calling Again
                </Button>

                <Button variant="outline" onClick={handleClose} className="text-muted-foreground">
                  Keep as Lost
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Saved ────────────────────────────────────────────────── */}
          {step === 'saved' && (
            <div className="text-center py-12 space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-400" />
              <p className="text-lg font-bold text-foreground">{savedMessage || 'Call Saved'}</p>
              <div className="flex flex-col gap-3 max-w-sm mx-auto mt-4">
                {/* Call Next Lead */}
                {queueData && (() => {
                  const nextLead = queueData.queue.find(l => l.id !== lead?.id);
                  if (!nextLead) return null;
                  const nextName = [nextLead.first_name, nextLead.last_name].filter(Boolean).join(' ') || 'Next Lead';
                  return (
                    <Button
                      size="lg"
                      className="w-full h-14 text-base font-bold border-2 border-green-500 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      variant="outline"
                      onClick={() => onCallNext?.(nextLead)}
                    >
                      <PhoneCall className="h-5 w-5 mr-2" />
                      Call Next: {nextName}
                    </Button>
                  );
                })()}
                <Button variant="outline" onClick={handleClose}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
  };
  return map[reason] || `Reason: ${reason.replace(/_/g, ' ')}`;
}
