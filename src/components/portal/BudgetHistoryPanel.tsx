import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { History, ArrowUp, ArrowDown, Shield, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useBudgetHistory, type BudgetHistoryEntry } from '@/hooks/useBudgetHistory';

interface BudgetHistoryPanelProps {
  clientId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function getActionIcon(entry: BudgetHistoryEntry) {
  const action = entry.action;
  if (action === 'budget_change') {
    const oldBudget = (entry.old_value as any)?.daily_budget ?? (entry.old_value as any)?.budget;
    const newBudget = (entry.new_value as any)?.daily_budget ?? (entry.new_value as any)?.budget;
    if (oldBudget !== undefined && newBudget !== undefined) {
      return newBudget > oldBudget
        ? <ArrowUp className="h-4 w-4 text-green-600" />
        : <ArrowDown className="h-4 w-4 text-red-600" />;
    }
    return <ArrowUp className="h-4 w-4 text-muted-foreground" />;
  }
  if (action === 'safe_mode_enter' || action === 'safe_mode_exit') {
    return <Shield className="h-4 w-4 text-orange-600" />;
  }
  if (action === 'campaign_pause') {
    return <Pause className="h-4 w-4 text-red-600" />;
  }
  return <ArrowUp className="h-4 w-4 text-muted-foreground" />;
}

function getActorBadge(actor: string) {
  const variants: Record<string, { className: string; label: string }> = {
    admin: { className: 'bg-green-100 text-green-700 border-green-300', label: 'Admin' },
    system: { className: 'bg-purple-100 text-purple-700 border-purple-300', label: 'System' },
    safe_mode: { className: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Safe Mode' },
    auto_recharge: { className: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Auto Recharge' },
    client_status_change: { className: 'bg-red-100 text-red-700 border-red-300', label: 'Status Change' },
    auto: { className: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Auto' },
    user: { className: 'bg-green-100 text-green-700 border-green-300', label: 'User' },
  };

  const variant = variants[actor] || { className: 'bg-gray-100 text-gray-700 border-gray-300', label: actor };
  return (
    <Badge variant="outline" className={`text-[10px] ${variant.className}`}>
      {variant.label}
    </Badge>
  );
}

function getChangeDescription(entry: BudgetHistoryEntry): string {
  const { action, old_value, new_value } = entry;

  if (action === 'budget_change') {
    const oldBudget = (old_value as any)?.daily_budget ?? (old_value as any)?.budget;
    const newBudget = (new_value as any)?.daily_budget ?? (new_value as any)?.budget;
    if (oldBudget !== undefined && newBudget !== undefined) {
      return `${formatCurrency(oldBudget)} -> ${formatCurrency(newBudget)}`;
    }
    return 'Budget updated';
  }

  if (action === 'safe_mode_enter') {
    return 'Safe mode activated';
  }

  if (action === 'safe_mode_exit') {
    return 'Safe mode deactivated';
  }

  if (action === 'campaign_pause') {
    return 'Campaign paused';
  }

  if (action === 'campaign_enable') {
    return 'Campaign re-enabled';
  }

  return action;
}

export function BudgetHistoryPanel({ clientId }: BudgetHistoryPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const { data: entries, isLoading } = useBudgetHistory(clientId);

  const count = entries?.length ?? 0;

  if (isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Budget History
            {count > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {count}
              </Badge>
            )}
          </CardTitle>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide history
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show history ({count})
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      {showHistory && (
        <CardContent className="pt-0">
          {count === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No budget changes recorded.
            </p>
          ) : (
            <div className="space-y-2">
              {entries!.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0 text-sm"
                >
                  <div className="pt-0.5 shrink-0">
                    {getActionIcon(entry)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {getChangeDescription(entry)}
                      </span>
                      {getActorBadge(entry.actor)}
                    </div>
                    {entry.reason_codes && entry.reason_codes.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {entry.reason_codes.map((code) => (
                          <Badge key={code} variant="outline" className="text-[10px] px-1 py-0">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {entry.notes && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground truncate max-w-sm">
                              {entry.notes}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            {entry.notes}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
