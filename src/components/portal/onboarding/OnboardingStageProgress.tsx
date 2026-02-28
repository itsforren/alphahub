import { useChecklistProgress, CategoryProgress } from '@/hooks/useOnboardingChecklist';
import { CheckCircle2, AlertCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface OnboardingStageProgressProps {
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

export function OnboardingStageProgress({ clientId }: OnboardingStageProgressProps) {
  const { categoryProgress, overallProgress, isComplete, hasIssues } = useChecklistProgress(clientId);

  if (categoryProgress.length === 0) {
    return null;
  }

  const progressPercent = overallProgress.total > 0 
    ? Math.round((overallProgress.completed / overallProgress.total) * 100) 
    : 0;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-foreground">Onboarding Progress</h3>
          {isComplete && !hasIssues ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Complete
            </span>
          ) : hasIssues ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {overallProgress.issues} issue{overallProgress.issues > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
        <div className="text-lg font-bold text-primary">{progressPercent}%</div>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-2 mb-4" />

      {/* Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {categoryProgress.map((stage) => (
          <StageCard key={stage.category} stage={stage} />
        ))}
      </div>
    </div>
  );
}

function StageCard({ stage }: { stage: CategoryProgress }) {
  const getStatusColor = () => {
    switch (stage.status) {
      case 'complete':
        return 'border-green-500/50 bg-green-50 dark:bg-green-950/20';
      case 'issue':
        return 'border-red-500/50 bg-red-50 dark:bg-red-950/20';
      case 'in_progress':
        return 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20';
      default:
        return 'border-border bg-muted/30';
    }
  };

  const getStatusIcon = () => {
    switch (stage.status) {
      case 'complete':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
      case 'issue':
        return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="w-3.5 h-3.5 text-yellow-600 animate-spin" />;
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
