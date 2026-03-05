import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GoogleAdsSyncButtonProps {
  clientId: string;
  googleCampaignId: string | null;
  trackingStartDate?: string | null;
  campaignRowId?: string | null;
  onSyncComplete?: () => void;
}

export function GoogleAdsSyncButton({
  clientId,
  googleCampaignId,
  trackingStartDate,
  campaignRowId,
  onSyncComplete
}: GoogleAdsSyncButtonProps) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);

  // Calculate days back dynamically based on tracking start date (max 90 days)
  const getCalculatedDaysBack = (): number => {
    if (!trackingStartDate) return 30; // Default to 30 days
    
    const startDate = new Date(trackingStartDate);
    const today = new Date();
    const daysDiff = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(daysDiff + 1, 7), 90); // Min 7 days, max 90 days
  };

  const handleSync = async (manualDaysBack?: number) => {
    const daysBack = manualDaysBack ?? getCalculatedDaysBack();
    if (!googleCampaignId) {
      toast.error('No Google Campaign ID configured for this client');
      return;
    }

    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      // Sync ads data
      const { data, error } = await supabase.functions.invoke('sync-google-ads', {
        body: { clientId, campaignRowId, daysBack },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      // Check if any upserts failed
      if (data.failedDates && data.failedDates.length > 0) {
        setLastSyncResult('error');
        toast.error(`Sync partially failed: ${data.failedDates.length} days could not be saved`, {
          description: `Failed dates: ${data.failedDates.slice(0, 5).join(', ')}${data.failedDates.length > 5 ? '...' : ''}`,
        });
      } else {
        setLastSyncResult('success');
        const descriptionParts = [
          `Fetched ${data.recordsFetched} → Wrote ${data.recordsUpserted}`,
          `Range: ${data.dateRange?.start} to ${data.dateRange?.end}`,
          data.campaignInfo?.dailyBudget ? `Budget: $${data.campaignInfo.dailyBudget.toFixed(2)}/day` : null,
        ].filter(Boolean);
        
        toast.success(`Google Ads sync complete`, {
          description: descriptionParts.join(' | '),
        });
      }


      // Invalidate all wallet/spend/chart queries so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['ad-spend-daily', clientId] });
      queryClient.invalidateQueries({ queryKey: ['tracked-ad-spend', clientId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['wallet-deposits', clientId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['client-wallet-tracking', clientId], exact: false });
      queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['command-center-stats'], exact: false });

      onSyncComplete?.();
    } catch (error: any) {
      console.error('Google Ads sync error:', error);
      setLastSyncResult('error');
      toast.error('Failed to sync Google Ads data', {
        description: error.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!googleCampaignId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync Ads
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Set a Google Campaign ID to enable syncing</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const calculatedDaysBack = getCalculatedDaysBack();
  const syncLabel = trackingStartDate 
    ? `Sync from ${new Date(trackingStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${calculatedDaysBack}d)`
    : 'Sync last 30 days';

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSync()}
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Ads'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{syncLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSync(90)}
              disabled={isSyncing}
              className="text-xs text-muted-foreground"
            >
              Max 90d
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Force sync maximum 90 days of data</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {lastSyncResult === 'success' && (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      )}
      {lastSyncResult === 'error' && (
        <AlertCircle className="h-4 w-4 text-destructive" />
      )}
    </div>
  );
}
