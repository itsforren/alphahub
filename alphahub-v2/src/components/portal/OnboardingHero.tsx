import { useMemo } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { OnboardingTask } from '@/hooks/useClients';
import { useUpdateOnboardingTask, useCompleteOnboarding } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface OnboardingHeroProps {
  clientId: string;
  tasks: OnboardingTask[];
  isAdmin?: boolean;
}

export function OnboardingHero({ clientId, tasks, isAdmin = false }: OnboardingHeroProps) {
  const { user } = useAuth();
  const updateTask = useUpdateOnboardingTask();
  const completeOnboarding = useCompleteOnboarding();

  const { completedCount, totalCount, progressPercent } = useMemo(() => {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    return {
      completedCount: completed,
      totalCount: total,
      progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks]);

  const allComplete = completedCount === totalCount && totalCount > 0;

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    if (!isAdmin) return;
    await updateTask.mutateAsync({
      taskId,
      completed: !currentCompleted,
      completedBy: user?.id,
    });
  };

  const handleCompleteOnboarding = async () => {
    if (!allComplete) return;
    await completeOnboarding.mutateAsync(clientId);
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-foreground">
            Onboarding Progress
          </div>
          <div className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} complete
          </div>
        </div>
        <div className="text-lg font-bold text-primary">{progressPercent}%</div>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-2 mb-3" />

      {/* Compact Task List */}
      <div className="flex flex-wrap gap-2">
        {tasks.map((task) => {
          const isCompleted = task.completed;
          
          return (
            <motion.button
              key={task.id}
              onClick={() => isAdmin && handleToggleTask(task.id, isCompleted)}
              disabled={!isAdmin}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
                isCompleted 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "bg-muted/50 text-muted-foreground border border-border/50",
                isAdmin && "cursor-pointer hover:scale-105"
              )}
              whileTap={isAdmin ? { scale: 0.95 } : undefined}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span className="max-w-[120px] truncate">{task.task_label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Complete Button */}
      {isAdmin && allComplete && (
        <div className="mt-3 flex justify-end">
          <Button 
            onClick={handleCompleteOnboarding}
            disabled={completeOnboarding.isPending}
            size="sm"
          >
            Complete Onboarding
          </Button>
        </div>
      )}
    </div>
  );
}
