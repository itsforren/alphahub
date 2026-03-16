import { useState } from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useStaleChargingRecords } from '@/hooks/useBillingVerification';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function StaleChargingPanel() {
  const { data: staleRecords = [], isLoading } = useStaleChargingRecords();
  const queryClient = useQueryClient();
  const [markingId, setMarkingId] = useState<string | null>(null);

  const handleMarkOverdue = async (recordId: string) => {
    setMarkingId(recordId);
    try {
      const { error } = await supabase
        .from('billing_records')
        .update({ status: 'overdue' })
        .eq('id', recordId);

      if (error) throw error;

      toast.success('Record marked as overdue');
      queryClient.invalidateQueries({ queryKey: ['stale-charging-records'] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update: ${message}`);
    } finally {
      setMarkingId(null);
    }
  };

  if (isLoading) return null;

  const hasStale = staleRecords.length > 0;

  return (
    <Card className={cn(
      'transition-colors',
      hasStale
        ? 'border-red-500/50 bg-red-500/5'
        : 'border-green-500/30 bg-green-500/5'
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {hasStale ? (
            <>
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Stale Charging Records</span>
              <span className="ml-auto text-xs font-semibold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                {staleRecords.length}
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Stale Charging Records</span>
              <span className="ml-auto text-xs text-green-400">All clear</span>
            </>
          )}
        </CardTitle>
      </CardHeader>

      {hasStale && (
        <CardContent className="px-4 pb-3 pt-0">
          <div className="space-y-2">
            {staleRecords.map((record) => {
              const stuckDuration = formatDistanceToNow(new Date(record.updated_at), {
                addSuffix: false,
              });
              const clientName = record.clients?.company_name ?? 'Unknown';
              const piId = record.stripe_payment_intent_id;

              return (
                <div
                  key={record.id}
                  className="flex items-center gap-3 text-xs bg-background/50 rounded-md px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground truncate block">
                      {clientName}
                    </span>
                    <span className="text-muted-foreground">
                      ${record.amount?.toFixed(2)} -- stuck {stuckDuration}
                    </span>
                  </div>

                  {piId && (
                    <a
                      href={`https://dashboard.stripe.com/payments/${piId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="View in Stripe"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2 shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => handleMarkOverdue(record.id)}
                    disabled={markingId === record.id}
                  >
                    {markingId === record.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Mark Overdue'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
