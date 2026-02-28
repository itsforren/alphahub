import { useChecklistProgress, CategoryProgress } from '@/hooks/useOnboardingChecklist';
import { CheckCircle2, AlertCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface OnboardingClientProgressProps {
  clientId: string;
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  hub_setup: '🏠',
  google_ads: '📢',
  crm_account: '👥',
  funnel_testing: '🔄',
  compliance: '✅',
  billing_docs: '📄',
  final_onboarding: '🎯',
};

export function OnboardingClientProgress({ clientId }: OnboardingClientProgressProps) {
  const { categoryProgress, overallProgress, isComplete, hasIssues } = useChecklistProgress(clientId);

  if (categoryProgress.length === 0) {
    return null;
  }

  const progressPercent = overallProgress.total > 0 
    ? Math.round((overallProgress.completed / overallProgress.total) * 100) 
    : 0;

  return (
    <div className="frosted-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Onboarding Progress
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {overallProgress.completed} of {overallProgress.total} steps completed
          </p>
        </div>
        <div className="text-right flex items-center gap-2">
          {isComplete && !hasIssues ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Complete
            </span>
          ) : hasIssues ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              In Progress
            </span>
          ) : null}
          <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {categoryProgress.map((stage) => (
          <StageCard key={stage.category} stage={stage} />
        ))}
      </div>

      {/* Client message */}
      {!isComplete && (
        <p className="text-xs text-center text-muted-foreground mt-4">
          Your portal is being set up. We'll notify you when everything is ready!
        </p>
      )}
    </div>
  );
}

function StageCard({ stage }: { stage: CategoryProgress }) {
  const getStatusColor = () => {
    switch (stage.status) {
      case 'complete':
        return 'border-green-500/50 bg-green-50 dark:bg-green-950/20';
      case 'issue':
        return 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20';
      case 'in_progress':
        return 'border-primary/50 bg-primary/5';
      default:
        return 'border-border bg-muted/30';
    }
  };

  const getStatusIcon = () => {
    switch (stage.status) {
      case 'complete':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
      case 'issue':
        return <Loader2 className="w-3.5 h-3.5 text-yellow-600 animate-spin" />;
      case 'in_progress':
        return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div 
      className={cn(
        "rounded-lg border p-2.5 transition-colors",
        getStatusColor()
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base">{STAGE_ICONS[stage.category]}</span>
        {getStatusIcon()}
      </div>
      <p className="text-xs font-medium truncate" title={stage.label}>
        {stage.label.split(' ')[0]}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {stage.completed}/{stage.total}
      </p>
    </div>
  );
}
