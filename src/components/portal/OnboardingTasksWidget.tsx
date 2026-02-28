import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useOnboardingTasks, useUpdateOnboardingTask, useCompleteOnboarding, OnboardingTask } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingTasksWidgetProps {
  clientId: string;
  isAdmin?: boolean;
}

export function OnboardingTasksWidget({ clientId, isAdmin = false }: OnboardingTasksWidgetProps) {
  const { user } = useAuth();
  const { data: tasks, isLoading } = useOnboardingTasks(clientId);
  const updateTask = useUpdateOnboardingTask();
  const completeOnboarding = useCompleteOnboarding();

  if (isLoading) {
    return (
      <div className="frosted-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-1/3" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return null;
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allComplete = completedCount === totalCount;

  const handleToggleTask = async (task: OnboardingTask) => {
    if (!isAdmin) return;
    
    await updateTask.mutateAsync({
      taskId: task.id,
      completed: !task.completed,
      completedBy: user?.id,
    });
  };

  const handleCompleteOnboarding = async () => {
    if (!allComplete) return;
    await completeOnboarding.mutateAsync(clientId);
  };

  return (
    <div className="frosted-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Onboarding Progress
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount} of {totalCount} tasks completed
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{progress}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              isAdmin && "cursor-pointer hover:bg-muted/50",
              task.completed && "opacity-70"
            )}
            onClick={() => isAdmin && handleToggleTask(task)}
          >
            {updateTask.isPending ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : task.completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-sm",
              task.completed && "line-through text-muted-foreground"
            )}>
              {task.task_label}
            </span>
            {task.completed && task.completed_at && (
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(task.completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Complete onboarding button */}
      {isAdmin && allComplete && (
        <Button 
          className="w-full mt-4"
          onClick={handleCompleteOnboarding}
          disabled={completeOnboarding.isPending}
        >
          {completeOnboarding.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          )}
          Complete Onboarding & Activate
        </Button>
      )}

      {!isAdmin && !allComplete && (
        <p className="text-xs text-center text-muted-foreground mt-4">
          Your portal is being set up. We'll notify you when everything is ready!
        </p>
      )}
    </div>
  );
}
