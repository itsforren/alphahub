import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useOnboardingChecklist, 
  useInitializeChecklist,
  useChecklistProgress,
  OnboardingChecklistItem 
} from '@/hooks/useOnboardingChecklist';
import { OnboardingCategorySection } from './OnboardingCategorySection';
import { OnboardingIssueModal } from './OnboardingIssueModal';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle, ClipboardCheck } from 'lucide-react';

interface OnboardingQATabProps {
  clientId: string;
  clientName: string;
}

const CATEGORY_ORDER = [
  'hub_setup',
  'google_ads', 
  'crm_account',
  'funnel_testing',
  'compliance',
  'billing_docs',
  'final_onboarding',
];

const CATEGORY_LABELS: Record<string, string> = {
  hub_setup: 'Hub Account Setup',
  google_ads: 'Google Ads Campaign',
  crm_account: 'CRM Account Setup',
  funnel_testing: 'Funnel Testing',
  compliance: 'Compliance',
  billing_docs: 'Billing & Documents',
  final_onboarding: 'Final Onboarding',
};

export function OnboardingQATab({ clientId, clientName }: OnboardingQATabProps) {
  const { user } = useAuth();
  const { data: items = [], isLoading, refetch } = useOnboardingChecklist(clientId);
  const initializeChecklist = useInitializeChecklist();
  const { overallProgress, hasIssues, isComplete } = useChecklistProgress(clientId);
  
  const [issueModalItem, setIssueModalItem] = useState<OnboardingChecklistItem | null>(null);

  // Initialize checklist if empty
  useEffect(() => {
    if (!isLoading && items.length === 0 && clientId) {
      initializeChecklist.mutate(clientId, {
        onSuccess: () => refetch()
      });
    }
  }, [isLoading, items.length, clientId]);

  const groupedItems = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = items.filter(item => item.category === category);
    return acc;
  }, {} as Record<string, OnboardingChecklistItem[]>);

  const handleIssueFound = (item: OnboardingChecklistItem) => {
    setIssueModalItem(item);
  };

  if (isLoading || initializeChecklist.isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progressPercent = overallProgress.total > 0 
    ? Math.round((overallProgress.completed / overallProgress.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Onboarding QA Progress</h3>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              {overallProgress.completed} verified
            </span>
            {hasIssues && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="w-4 h-4" />
                {overallProgress.issues} issues
              </span>
            )}
            <span className="text-muted-foreground">
              {overallProgress.pending} pending
            </span>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>{overallProgress.completed} of {overallProgress.total} items checked</span>
          <span>{progressPercent}% complete</span>
        </div>
        {isComplete && !hasIssues && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-md text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            All onboarding checks passed! Ready to mark onboarding complete.
          </div>
        )}
      </div>

      {/* Category Sections */}
      <div className="space-y-3">
        {CATEGORY_ORDER.map(category => (
          <OnboardingCategorySection
            key={category}
            category={category}
            label={CATEGORY_LABELS[category]}
            items={groupedItems[category] || []}
            userId={user?.id}
            clientId={clientId}
            onIssueFound={handleIssueFound}
          />
        ))}
      </div>

      {/* Issue Modal */}
      <OnboardingIssueModal
        isOpen={!!issueModalItem}
        onClose={() => setIssueModalItem(null)}
        item={issueModalItem}
        clientId={clientId}
        clientName={clientName}
      />
    </div>
  );
}
