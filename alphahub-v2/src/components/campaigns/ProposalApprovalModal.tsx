import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Proposal, useDenyProposal, useApproveProposal } from '@/hooks/useCampaignCommandCenter';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

interface ProposalApprovalModalProps {
  proposal: Proposal;
  onClose: () => void;
}

const DECISION_OUTCOMES = [
  { value: 'DENY_NO_CHANGE', label: 'Deny - No Change', description: 'Keep current budget, do not make suggested change' },
  { value: 'DENY_SET_SAFE_MODE', label: 'Deny - Set Safe Mode', description: 'Reject suggestion and set campaign to Safe Mode' },
  { value: 'ESCALATE_INVESTIGATION', label: 'Escalate for Investigation', description: 'Needs human review or investigation' },
];

const REASON_CATEGORIES = [
  { value: 'PACING_WALLET', label: 'Pacing / Wallet', description: 'Wallet pacing issues, budget timing' },
  { value: 'PERFORMANCE', label: 'Performance', description: 'CPL, CVR, CTR performance concerns' },
  { value: 'TRACKING_ATTRIBUTION', label: 'Tracking / Attribution', description: 'Conversion tracking or attribution issues' },
  { value: 'FUNNEL_ROUTING', label: 'Funnel / Routing', description: 'Lead routing or funnel flow issues' },
  { value: 'DELIVERY_AUCTION_NOT_SPENDING', label: 'Delivery / Auction', description: 'Campaign not spending, auction issues' },
  { value: 'POLICY_DISAPPROVALS', label: 'Policy / Disapprovals', description: 'Ad disapprovals or policy violations' },
  { value: 'TARGETING_INTENT', label: 'Targeting / Intent', description: 'Targeting or keyword intent issues' },
  { value: 'STRATEGY_EXPERIMENT', label: 'Strategy / Experiment', description: 'Running a test or strategic hold' },
  { value: 'CLIENT_REQUEST_CONSTRAINT', label: 'Client Request', description: 'Client-specific constraints or requests' },
  { value: 'DATA_QUALITY', label: 'Data Quality', description: 'Data sync or quality issues' },
  { value: 'OTHER', label: 'Other', description: 'Other reason (please specify)' },
];

const SPECIFIC_REASONS: Record<string, string[]> = {
  PACING_WALLET: ['wallet_low', 'cycle_ending_soon', 'pace_ahead', 'pace_behind', 'overdelivery_risk'],
  PERFORMANCE: ['cpl_too_high', 'cvr_low', 'ctr_low', 'quality_concerns'],
  TRACKING_ATTRIBUTION: ['tracking_broken', 'attribution_lag', 'offline_conv_pending'],
  FUNNEL_ROUTING: ['routing_error', 'lander_issue', 'crm_sync_issue'],
  DELIVERY_AUCTION_NOT_SPENDING: ['limited_budget', 'low_search_volume', 'bid_too_low'],
  POLICY_DISAPPROVALS: ['ad_disapproved', 'policy_violation', 'review_pending'],
  TARGETING_INTENT: ['geo_mismatch', 'keyword_intent', 'audience_issue'],
  STRATEGY_EXPERIMENT: ['ab_test', 'scaling_test', 'seasonal_hold'],
  CLIENT_REQUEST_CONSTRAINT: ['client_pause', 'budget_cap', 'timing_request'],
  DATA_QUALITY: ['sync_error', 'missing_data', 'stale_data'],
  OTHER: [],
};

const NEXT_ACTIONS = [
  { value: 'NO_ACTION_MONITOR', label: 'No Action - Monitor', description: 'Continue monitoring' },
  { value: 'RECALCULATE_PACING', label: 'Recalculate Pacing', description: 'Re-run pacing calculations' },
  { value: 'SET_SAFE_MODE_0_01', label: 'Set Safe Mode ($0.01)', description: 'Set budget to $0.01/day' },
  { value: 'CHECK_TRACKING', label: 'Check Tracking', description: 'Verify conversion tracking' },
  { value: 'CHECK_FUNNEL_FLOW', label: 'Check Funnel Flow', description: 'Verify lead routing and funnel' },
  { value: 'CHECK_POLICY_DISAPPROVALS', label: 'Check Policies', description: 'Review ad approvals' },
  { value: 'CHECK_SEARCH_TERMS_NEGATIVES', label: 'Check Search Terms', description: 'Review search terms report' },
  { value: 'TIGHTEN_TARGETING_GEO_SCHEDULE', label: 'Tighten Targeting', description: 'Adjust geo/schedule targeting' },
  { value: 'ADJUST_BID_STRATEGY', label: 'Adjust Bid Strategy', description: 'Modify bidding approach' },
  { value: 'REQUEST_HUMAN_ADS_REVIEW', label: 'Request Human Review', description: 'Escalate to ads specialist' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export function ProposalApprovalModal({ proposal, onClose }: ProposalApprovalModalProps) {
  const [decisionOutcome, setDecisionOutcome] = useState('');
  const [primaryReason, setPrimaryReason] = useState('');
  const [specificReasons, setSpecificReasons] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState('');
  const [userNote, setUserNote] = useState('');
  const [overrideBudget, setOverrideBudget] = useState('');

  const denyProposal = useDenyProposal();
  const approveProposal = useApproveProposal();

  const availableSpecificReasons = SPECIFIC_REASONS[primaryReason] || [];
  const requiresNote = primaryReason === 'OTHER';

  const toggleSpecificReason = (reason: string) => {
    if (specificReasons.includes(reason)) {
      setSpecificReasons(specificReasons.filter(r => r !== reason));
    } else if (specificReasons.length < 3) {
      setSpecificReasons([...specificReasons, reason]);
    }
  };

  const handleDeny = async () => {
    if (!decisionOutcome || !primaryReason || !nextAction) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (requiresNote && !userNote.trim()) {
      toast.error('Please provide a note for "Other" reason');
      return;
    }

    try {
      await denyProposal.mutateAsync({
        proposalId: proposal.id,
        decisionOutcome,
        primaryReasonCategory: primaryReason,
        specificReasonCodes: specificReasons,
        nextAction,
        userNote,
        overrideBudget: overrideBudget ? parseFloat(overrideBudget) : undefined,
      });
      toast.success('Proposal denied');
      onClose();
    } catch (error) {
      toast.error('Failed to deny proposal');
    }
  };

  const handleApproveOverride = async () => {
    if (!overrideBudget) {
      toast.error('Please enter an override budget');
      return;
    }

    try {
      await approveProposal.mutateAsync({
        proposalId: proposal.id,
        overrideBudget: parseFloat(overrideBudget),
      });
      toast.success('Override approved and executed');
      onClose();
    } catch (error) {
      toast.error('Failed to approve override');
    }
  };

  const campaignData = proposal.campaigns as { status?: string; safe_mode?: boolean } | undefined;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deny Proposal</DialogTitle>
          <DialogDescription>
            Provide feedback to help the system learn from this decision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Proposal Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Client</span>
              <span className="font-medium">{proposal.clients?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <CampaignStatusBadge 
                status={(campaignData?.status as 'green' | 'yellow' | 'red') || 'green'} 
                safeMode={campaignData?.safe_mode} 
                size="sm" 
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current → Proposed</span>
              <span className="font-medium">
                {formatCurrency(proposal.current_daily_budget || 0)} → {formatCurrency(proposal.proposed_daily_budget || 0)}
                {proposal.delta_pct !== null && (
                  <span className={`ml-1 ${proposal.delta_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({proposal.delta_pct >= 0 ? '+' : ''}{proposal.delta_pct.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Decision Form */}
          <div className="space-y-4">
            {/* Decision Outcome */}
            <div>
              <Label className="text-sm font-medium">Decision Outcome *</Label>
              <Select value={decisionOutcome} onValueChange={setDecisionOutcome}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_OUTCOMES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Primary Reason */}
            <div>
              <Label className="text-sm font-medium">Primary Reason *</Label>
              <Select value={primaryReason} onValueChange={(v) => { setPrimaryReason(v); setSpecificReasons([]); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_CATEGORIES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific Reasons (multi-select badges) */}
            {availableSpecificReasons.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Specific Reasons (optional, max 3)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableSpecificReasons.map((reason) => (
                    <Badge
                      key={reason}
                      variant={specificReasons.includes(reason) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSpecificReason(reason)}
                    >
                      {reason.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Next Action */}
            <div>
              <Label className="text-sm font-medium">Next Action *</Label>
              <Select value={nextAction} onValueChange={setNextAction}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {NEXT_ACTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Override Budget */}
            <div>
              <Label className="text-sm font-medium">Override Budget (optional)</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Enter a different budget to approve with your override
              </p>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 150.00"
                value={overrideBudget}
                onChange={(e) => setOverrideBudget(e.target.value)}
              />
            </div>

            {/* Note */}
            <div>
              <Label className="text-sm font-medium">
                Note {requiresNote && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                placeholder="Additional context or notes..."
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            {requiresNote && !userNote.trim() && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Note is required when selecting "Other" as the reason
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {overrideBudget && (
            <Button 
              variant="default" 
              onClick={handleApproveOverride}
              disabled={approveProposal.isPending}
            >
              Approve Override ({formatCurrency(parseFloat(overrideBudget) || 0)})
            </Button>
          )}
          <Button 
            variant="destructive" 
            onClick={handleDeny}
            disabled={denyProposal.isPending || !decisionOutcome || !primaryReason || !nextAction || (requiresNote && !userNote.trim())}
          >
            Deny
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
