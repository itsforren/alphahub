import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, HelpCircle, ExternalLink, Loader2, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useClientSelfOnboarding,
  useInitializeSelfOnboarding,
  useUpdateSelfOnboardingTask,
  useSelfOnboardingProgress,
} from '@/hooks/useClientSelfOnboarding';

interface ClientSelfOnboardingProps {
  clientId: string;
  hasSignedAgreement?: boolean;
  clientCreatedAt?: string;
  clientName?: string;
  onOpenPaymentWizard?: () => void;
}

const COUNTDOWN_HOURS = 2;

function useCountdown(startTime: string | undefined) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!startTime) return;

    const calculateTimeLeft = () => {
      const start = new Date(startTime).getTime();
      const deadline = start + COUNTDOWN_HOURS * 60 * 60 * 1000;
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds, isExpired: false };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return timeLeft;
}

export function ClientSelfOnboarding({ clientId, hasSignedAgreement, clientCreatedAt, clientName, onOpenPaymentWizard }: ClientSelfOnboardingProps) {
  const { data: tasks = [], isLoading } = useClientSelfOnboarding(clientId);
  const initializeTasks = useInitializeSelfOnboarding();
  const updateTask = useUpdateSelfOnboardingTask();
  const { completedCount, totalCount, percentage } = useSelfOnboardingProgress(clientId);

  // Use first task's created_at as fallback if no clientCreatedAt provided
  const countdownStart = clientCreatedAt || tasks[0]?.created_at;
  const countdown = useCountdown(countdownStart);

  // Initialize tasks if they don't exist
  useEffect(() => {
    if (!isLoading && tasks.length === 0 && clientId) {
      initializeTasks.mutate(clientId);
    }
  }, [isLoading, tasks.length, clientId, initializeTasks]);

  // Auto-complete sign_agreement task if agreement is signed
  useEffect(() => {
    if (hasSignedAgreement) {
      const signTask = tasks.find(t => t.task_key === 'sign_agreement' && !t.completed);
      if (signTask) {
        updateTask.mutate({ taskId: signTask.id, completed: true, clientId, clientName });
      }
    }
  }, [hasSignedAgreement, tasks, updateTask, clientId, clientName]);

  const handleToggleTask = (taskId: string, currentlyCompleted: boolean, taskLabel: string) => {
    updateTask.mutate({ 
      taskId, 
      completed: !currentlyCompleted, 
      clientId, 
      clientName,
      taskLabel 
    });
  };

  const getTaskLink = (taskKey: string): string | null => {
    switch (taskKey) {
      case 'sign_agreement':
        return '/hub/sign-agreement';
      case 'login_crm':
        return 'https://app.alphaagentcrm.com';
      default:
        return null;
    }
  };

  const isExternalLink = (link: string | null) => link?.startsWith('http');

  if (isLoading) {
    return (
      <Card className="border-border/50 overflow-visible">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  // All complete - don't show the widget
  if (percentage === 100) {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent overflow-visible">
        <CardContent className="py-6">
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-emerald-600">
              🎉 You're all set! Your onboarding is complete.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Our team will process your account shortly.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isUrgent = countdown.hours === 0 && countdown.minutes < 30 && !countdown.isExpired;
  const countdownColor = countdown.isExpired 
    ? 'text-destructive' 
    : isUrgent 
      ? 'text-amber-500' 
      : 'text-muted-foreground';

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg font-semibold">Your Next Steps</CardTitle>
            <CardDescription className="mt-1">
              Complete these tasks to get your account live
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Countdown Timer */}
            <div className={cn("flex items-center gap-1.5 text-sm font-medium", countdownColor)}>
              {countdown.isExpired ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Overdue</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>
                    {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                  </span>
                </>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {completedCount}/{totalCount} complete
            </Badge>
          </div>
        </div>
        
        {/* Password Note */}
        <div className="mt-3 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            🔐 Your CRM password is: <span className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">Alpha21$</span>
          </p>
        </div>
        
        <Progress value={percentage} className="h-2 mt-3" />
        {!countdown.isExpired && (
          <p className="text-xs text-muted-foreground mt-2">
            Complete all tasks within 2 hours for our team to process your account correctly.
          </p>
        )}
        {countdown.isExpired && (
          <p className="text-xs text-destructive mt-2">
            Time limit exceeded. Please complete remaining tasks ASAP so we can process your account.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-2">
        {tasks.map((task, index) => {
          const taskLink = task.help_url || getTaskLink(task.task_key);
          const isExternal = isExternalLink(taskLink);

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                task.completed 
                  ? 'bg-emerald-500/5 border border-emerald-500/20' 
                  : 'bg-muted/30 border border-border/50 hover:bg-muted/50'
              )}
            >
              <button
                onClick={() => handleToggleTask(task.id, task.completed, task.task_label)}
                disabled={updateTask.isPending}
                className="flex-shrink-0"
              >
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>

              <span
                className={cn(
                  'flex-1 text-sm font-medium',
                  task.completed && 'line-through text-muted-foreground'
                )}
              >
                {task.task_label}
              </span>

              <div className="flex items-center gap-2">
                {task.task_key === 'activate_subscription' && onOpenPaymentWizard && !task.completed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPaymentWizard();
                    }}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Set Up Payment
                  </Button>
                )}
                {taskLink && (
                  <>
                    {isExternal ? (
                      <a
                        href={taskLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <Link
                        to={taskLink}
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </>
                )}

                {task.help_url && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={task.help_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click for help guide</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
