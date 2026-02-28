import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  RefreshCw, 
  CloudDownload, 
  Loader2,
  Link2,
  Gift
} from 'lucide-react';
import { SalesKanbanBoard } from '@/components/sales/SalesKanbanBoard';
import { AddProspectDialog } from '@/components/sales/AddProspectDialog';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const AttributionContent = lazy(() => import('./Attribution'));
const ReferralAdminContent = lazy(() => import('./ReferralAdmin'));

const TabSkeleton = () => (
  <div className="space-y-4 p-6">
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
    <Skeleton className="h-64" />
  </div>
);

export default function UnifiedSales() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const activeTab = searchParams.get('tab') || 'pipeline';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
    queryClient.invalidateQueries({ queryKey: ['b2b-attribution-stats'] });
    queryClient.invalidateQueries({ queryKey: ['referrals-with-client-info'] });
  };

  const handleSyncFromGHL = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-ghl-appointments');
      
      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: data.message || `Synced ${data.synced || 0} appointments`,
      });

      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync from GHL",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sales</h1>
              <p className="text-sm text-muted-foreground">
                Pipeline, attribution tracking, and referral management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'pipeline' && (
              <>
                <AddProspectDialog />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSyncFromGHL}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CloudDownload className="w-4 h-4 mr-2" />
                  )}
                  Sync from GHL
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="pipeline" className="gap-2">
              <Target className="w-4 h-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="attribution" className="gap-2">
              <Link2 className="w-4 h-4" />
              Attribution
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2">
              <Gift className="w-4 h-4" />
              Referrals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <SalesKanbanBoard />
          </TabsContent>

          <TabsContent value="attribution">
            <Suspense fallback={<TabSkeleton />}>
              <AttributionContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="referrals">
            <Suspense fallback={<TabSkeleton />}>
              <ReferralAdminContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
