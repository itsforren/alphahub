import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, Loader2, Play, RotateCcw, ChevronDown, ChevronUp,
  Rocket, Clock, AlertTriangle, ExternalLink, Zap, CheckCheck, UserCheck, Square, CheckSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useOnboardingAutomation, AUTOMATION_STEPS, AutomationStep } from '@/hooks/useOnboardingAutomation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VerificationCheck {
  step: string;
  success: boolean | null;
  details: string;
  url?: string;
}

interface VerificationChecksDropdownProps {
  data: any;
  stepStatus: string;
  onRetry: (step: string) => void;
  isRetrying: boolean;
}

function VerificationChecksDropdown({ data, stepStatus, onRetry, isRetrying }: VerificationChecksDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const defaultChecks: VerificationCheck[] = [
    { step: 'scheduler_page', success: null, details: 'Scheduler page is live' },
    { step: 'lander_page', success: null, details: 'Lander page is live + HTML fetch' },
    { step: 'profile_page', success: null, details: 'Profile page is live' },
    { step: 'thankyou_page', success: null, details: 'Thank You page is live' },
    { step: 'nfia_page', success: null, details: 'NFIA page is live' },
    { step: 'ghl_subaccount', success: null, details: 'Subaccount exists' },
    { step: 'google_ads', success: null, details: 'Google Ads campaign exists' },
    { step: 'test_url_construction', success: null, details: 'Test URL built with agent_id' },
    { step: 'form_analysis', success: null, details: 'Form detected + test data generated' },
    { step: 'lead_webhook_submit', success: null, details: 'Submit test lead into lead webhook' },
    { step: 'lead_db_verify', success: null, details: 'Verify test lead exists + linked' },
    { step: 'ghl_delivery', success: null, details: 'Verify delivery into CRM (if enabled)' },
  ];
  
  const checks = Array.isArray(data?.results) && data.results.length > 0 ? data.results : defaultChecks;
  const passedCount = checks.filter((c: VerificationCheck) => c.success === true).length;
  const failedCount = checks.filter((c: VerificationCheck) => c.success === false).length;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-medium text-xs">Verification Checks</span>
            {data?.passedChecks !== undefined && data?.totalChecks !== undefined && (
              <Badge variant={data.passedChecks === data.totalChecks ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                {data.passedChecks}/{data.totalChecks}
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {failedCount} failed
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-2 space-y-1.5">
          {checks.map((r: VerificationCheck, idx: number) => {
            const ok = r?.success;
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                {ok === true ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                ) : ok === false ? (
                  <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                ) : (
                  <Loader2 className={cn("w-3.5 h-3.5 mt-0.5", stepStatus === 'running' ? 'animate-spin text-blue-500' : 'text-muted-foreground')} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] text-muted-foreground truncate">{String(r?.step || 'check')}</div>
                  <div className="text-[11px] leading-snug text-muted-foreground">
                    {r?.details || ''}
                    {r?.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {ok === false && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onRetry(String(r?.step))}
                    disabled={isRetrying}
                    className="h-7 w-7"
                    title={`Retry ${String(r?.step)}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
          
          {data?.testLeadId && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">testLeadId: {String(data.testLeadId).slice(0, 12)}...</span>
              {data?.ghlContactId && (
                <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">ghlContactId: {String(data.ghlContactId).slice(0, 12)}...</span>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface OnboardingAutomationWidgetProps {
  clientId: string;
  clientName?: string;
  onSkipAutomation?: () => void;
}

export function OnboardingAutomationWidget({ clientId, clientName, onSkipAutomation }: OnboardingAutomationWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  
  const { 
    automationRun, 
    isLoading, 
    startAutomation, 
    retryFromStep,
    retryVerificationCheck,
    completeManualStep,
    uncompleteManualStep,
    markComplete,
  } = useOnboardingAutomation(clientId);

  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [togglingManualStep, setTogglingManualStep] = useState<number | null>(null);

  const handleMarkComplete = async () => {
    setIsMarkingComplete(true);
    try {
      await markComplete.mutateAsync();
      toast.success('Automation marked as complete');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark complete');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleStartAutomation = async () => {
    try {
      toast.info('Starting full onboarding automation...');
      await startAutomation.mutateAsync({ startFromStep: 1 });
      toast.success('Automation started successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start automation');
    }
  };

  const handleRetryFromStep = async (stepNumber: number) => {
    try {
      const stepName = AUTOMATION_STEPS.find(s => s.step === stepNumber)?.label || `Step ${stepNumber}`;
      toast.info(`Retrying from ${stepName}...`);
      await retryFromStep.mutateAsync(stepNumber);
      toast.success('Retry started successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry');
    }
  };

  const handleRetryVerificationCheck = async (checkStep: string) => {
    try {
      toast.info(`Retrying check: ${checkStep}...`);
      await retryVerificationCheck.mutateAsync(checkStep);
      toast.success('Verification check retried!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry verification check');
    }
  };

  const handleToggleManualStep = async (step: AutomationStep) => {
    if (!automationRun) return;
    setTogglingManualStep(step.step);
    try {
      const isCompleted = stepsCompleted.includes(step.step);
      if (isCompleted) {
        await uncompleteManualStep.mutateAsync(step.step);
        toast.info(`${step.label} unmarked`);
      } else {
        await completeManualStep.mutateAsync(step.step);
        toast.success(`${step.label} marked complete!`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update step');
    } finally {
      setTogglingManualStep(null);
    }
  };

  const stepsCompleted = automationRun?.steps_completed || [];
  const stepsFailed = automationRun?.steps_failed || [];
  const currentStep = automationRun?.current_step || 0;
  const status = automationRun?.status || 'pending';
  const stepData = automationRun?.step_data || {};
  const errorLog = automationRun?.error_log || [];

  // Some older/buggy runs can end up with status=failed but steps_failed empty.
  // In that case, fall back to current_step so the admin still has a retry path.
  const failedStepForRetry =
    stepsFailed.length > 0
      ? stepsFailed[0]
      : status === 'failed' && currentStep > 0
      ? currentStep
      : null;
  
  const progress = (stepsCompleted.length / AUTOMATION_STEPS.length) * 100;

  const getStepStatus = (stepNum: number) => {
    if (stepsCompleted.includes(stepNum)) return 'completed';
    if (stepsFailed.includes(stepNum)) return 'failed';
    if (status === 'running' && currentStep === stepNum) return 'running';
    return 'pending';
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">Running</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      case 'paused':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Paused</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Onboarding Automation
                  {getStatusBadge()}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                {status === 'completed' 
                    ? `All ${AUTOMATION_STEPS.length} steps completed successfully`
                    : status === 'running'
                    ? `Step ${currentStep} of ${AUTOMATION_STEPS.length} in progress...`
                    : status === 'paused'
                    ? `Paused at Step ${currentStep} — waiting for: ${AUTOMATION_STEPS.find(s => s.step === currentStep)?.label || 'manual action'}`
                    : status === 'failed'
                    ? `Failed at step ${currentStep}`
                    : 'Run the full automation pipeline'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onSkipAutomation && status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsSkipping(true);
                    try {
                      await onSkipAutomation();
                    } finally {
                      setIsSkipping(false);
                    }
                  }}
                  disabled={isSkipping}
                  className="gap-1.5 text-muted-foreground"
                >
                  {isSkipping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Skip
                </Button>
              )}
              {!automationRun || status === 'pending' ? (
                <Button 
                  onClick={handleStartAutomation}
                  disabled={startAutomation.isPending}
                  className="gap-2"
                >
                  {startAutomation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Run Full Automation
                </Button>
              ) : status === 'paused' ? (
                <Button 
                  onClick={() => handleRetryFromStep(currentStep + 1)}
                  disabled={retryFromStep.isPending || !stepsCompleted.includes(currentStep)}
                  className="gap-2"
                >
                  {retryFromStep.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Resume Automation
                </Button>
              ) : status === 'failed' && failedStepForRetry ? (
                <Button 
                  onClick={() => handleRetryFromStep(failedStepForRetry)}
                  disabled={retryFromStep.isPending}
                  variant="destructive"
                  className="gap-2"
                >
                  {retryFromStep.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Retry from Step {failedStepForRetry}
                </Button>
              ) : null}
              {status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkComplete}
                  disabled={isMarkingComplete}
                  className="gap-1.5"
                >
                  {isMarkingComplete ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  Mark Complete
                </Button>
              )}

              {automationRun && status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetryFromStep(11)}
                  disabled={retryFromStep.isPending}
                  className="gap-1.5"
                  title="Re-run snapshot verification/polling (Step 11)"
                >
                  <Clock className="w-4 h-4" />
                  Retry Snapshot
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          {automationRun && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{stepsCompleted.length}/{AUTOMATION_STEPS.length} steps</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Step List */}
            <div className="space-y-2">
              {AUTOMATION_STEPS.map((step) => {
                const stepStatus = getStepStatus(step.step);
                const data = stepData[`step_${step.step}`];
                const error = errorLog.find(e => e.step === step.step);
                
                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: step.step * 0.02 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      stepStatus === 'completed' && "bg-emerald-500/5 border-emerald-500/20",
                      stepStatus === 'failed' && "bg-red-500/5 border-red-500/20",
                      stepStatus === 'running' && "bg-blue-500/5 border-blue-500/20 animate-pulse",
                      stepStatus === 'pending' && "bg-muted/30 border-border/50"
                    )}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {step.manual ? (
                        // Manual step: show clickable checkbox
                        <button
                          onClick={() => handleToggleManualStep(step)}
                          disabled={togglingManualStep === step.step}
                          className="focus:outline-none"
                          title={stepStatus === 'completed' ? 'Unmark as complete' : 'Mark as complete'}
                        >
                          {togglingManualStep === step.step ? (
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          ) : stepStatus === 'completed' ? (
                            <CheckSquare className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Square className="w-5 h-5 text-amber-500 hover:text-amber-400 transition-colors" />
                          )}
                        </button>
                      ) : stepStatus === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : stepStatus === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : stepStatus === 'running' ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>

                    {/* Step Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {step.step.toString().padStart(2, '0')}
                        </span>
                        <span className={cn(
                          "font-medium text-sm",
                          stepStatus === 'pending' && "text-muted-foreground"
                        )}>
                          {step.label}
                        </span>
                        {step.manual && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                            <UserCheck className="w-3 h-3 mr-0.5" /> Manual
                          </Badge>
                        )}
                      </div>
                      
                      {/* Step Output */}
 {(((stepStatus === 'completed' && data) || (stepStatus === 'running' && data)) || (step.step === 18)) && (
                        <div className="mt-1 text-xs text-muted-foreground space-y-2">
                          {/* Standard step chips (completed only) */}
                          {stepStatus === 'completed' && data && step.step !== 18 && step.step !== 16 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {data.slug && <span className="bg-muted px-1.5 py-0.5 rounded">{data.slug}</span>}
                              {(data.liveUrl || data.nfiaPageUrl) && (
                                <a
                                  href={data.liveUrl || data.nfiaPageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {data.calendarId && <span className="bg-muted px-1.5 py-0.5 rounded font-mono">{data.calendarId.slice(0, 12)}...</span>}
                              {data.campaignId && <span className="bg-muted px-1.5 py-0.5 rounded font-mono">{data.campaignId}</span>}
                            </div>
                          )}

                          {/* Step 10 (Activate SaaS) - show SaaS diagnostics */}
                          {step.step === 10 && data && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {data.locationId && (
                                  <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
                                    loc: {data.locationId}
                                  </span>
                                )}
                                {data.saasActivationResult?.status === 'enabled' && (
                                  <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">SaaS Enabled</span>
                                )}
                                {data.saasActivationResult?.status === 'already_enabled' && (
                                  <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Already Enabled</span>
                                )}
                                {data.saasActivationResult?.status === 'failed' && (
                                  <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">SaaS Failed</span>
                                )}
                              </div>
                              
                              {/* Show detailed failure info */}
                              {data.saasActivationResult?.status === 'failed' && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2 text-[11px]">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">saasPlanId:</span>
                                      <span className="font-mono">{data.saasActivationResult?.saasPlanId || 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">contactId:</span>
                                      <span className="font-mono">{data.saasActivationResult?.contactId || 'Not set'}</span>
                                    </div>
                                    {data.saasActivationResult?.v2Attempt?.traceId && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">traceId:</span>
                                        <span className="font-mono">{data.saasActivationResult.v2Attempt.traceId}</span>
                                      </div>
                                    )}
                                    {data.saasActivationResult?.hint && (
                                      <div className="text-amber-400 mt-1">{data.saasActivationResult.hint}</div>
                                    )}
                                    {data.saasActivationResult?.v2Attempt?.responseSnippet && (
                                      <div className="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/50 p-1 rounded overflow-x-auto">
                                        {data.saasActivationResult.v2Attempt.responseSnippet}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Show user creation info */}
                              {data.userCreationResult && (
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="text-muted-foreground">User:</span>
                                  {data.userCreationResult.alreadyExisted ? (
                                    <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Existed</span>
                                  ) : data.userCreationResult.ok ? (
                                    <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Created</span>
                                  ) : (
                                    <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Failed</span>
                                  )}
                                  {data.userCreationResult.userId && (
                                    <span className="font-mono text-muted-foreground">{data.userCreationResult.userId.slice(0, 12)}...</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Step 11 (Verify Snapshot) - show Discovery polling status */}
                          {step.step === 11 && data && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {data.snapshotApplied === true && (
                                <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Discovery Found</span>
                              )}
                              {data.snapshotApplied === false && (
                                <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Polling…</span>
                              )}
                              {data.discoveryCalendarId && (
                                <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">
                                  cal: {data.discoveryCalendarId.slice(0, 12)}...
                                </span>
                              )}
                              {typeof data.polls === 'number' && (
                                <span className="bg-muted px-1.5 py-0.5 rounded">polls: {data.polls}</span>
                              )}
                              {typeof data.elapsedMs === 'number' && (
                                <span className="bg-muted px-1.5 py-0.5 rounded">{Math.round(data.elapsedMs / 1000)}s</span>
                              )}
                              {data.lastStatus?.calendarsFound && (
                                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                  {data.lastStatus.calendarsFound.length} calendars
                                </span>
                              )}
                            </div>
                          )}

                          {/* CRM Custom Fields Sync (Step 15) */}
                          {step.step === 15 && stepStatus === 'completed' && data && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {data.skipped ? (
                                <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Skipped</span>
                              ) : (
                                <>
                                  <span className="bg-muted px-1.5 py-0.5 rounded">
                                    {data.matchedCount ?? 0}/{data.totalRequired ?? 0} fields mapped
                                  </span>
                                  {data.mappings !== undefined && (
                                    <span className="bg-muted px-1.5 py-0.5 rounded">{data.mappings} mappings</span>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Verify & Test Onboarding (Step 18) - collapsible dropdown */}
                          {step.step === 18 && (
                            <VerificationChecksDropdown 
                              data={data} 
                              stepStatus={stepStatus}
                              onRetry={handleRetryVerificationCheck}
                              isRetrying={retryVerificationCheck.isPending}
                            />
                          )}
                        </div>
                      )}
                      
                      {/* Error */}
                      {stepStatus === 'failed' && error && (
                        <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {error.error}
                        </div>
                      )}
                    </div>

                    {/* Retry Button for Failed Steps */}
                    {stepStatus === 'failed' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRetryFromStep(step.step)}
                          disabled={retryFromStep.isPending}
                          title={`Retry from Step ${step.step}`}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        
                        {/* Skip to next step option for Step 10 (SaaS failures can be manually resolved) */}
                        {step.step === 10 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetryFromStep(11)}
                            disabled={retryFromStep.isPending}
                            title="Skip SaaS - proceed to Step 11 (Snapshot Verify)"
                            className="text-amber-500 hover:text-amber-400"
                          >
                            Skip →
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Timing Info */}
            {automationRun && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                {automationRun.started_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Started: {new Date(automationRun.started_at).toLocaleString()}
                  </div>
                )}
                {automationRun.completed_at && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Completed: {new Date(automationRun.completed_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Error Log Toggle */}
            {errorLog.length > 0 && (
              <Collapsible open={showLogs} onOpenChange={setShowLogs}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Error Log ({errorLog.length})
                    </span>
                    {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2 bg-muted/50 rounded-lg p-3">
                    {errorLog.map((log, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono">Step {log.step}</span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-red-400 mt-0.5">{log.error}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
