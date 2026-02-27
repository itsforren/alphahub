import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Router, 
  History, 
  Settings2,
  RefreshCw 
} from 'lucide-react';
import { CampaignCommandCenter } from '@/components/campaigns/CampaignCommandCenter';
import { useQueryClient } from '@tanstack/react-query';

// Lazy import the content components to avoid circular imports
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const LeadStatsContent = lazy(() => import('./LeadStats'));
const CampaignChangesContent = lazy(() => import('./CampaignChanges'));
const CampaignSettingsContent = lazy(() => import('./CampaignSettings'));

const TabSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
    <Skeleton className="h-64" />
  </div>
);

export default function CommandCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const activeTab = searchParams.get('tab') || 'campaigns';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    queryClient.invalidateQueries({ queryKey: ['command-center-stats'] });
    queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Campaign management, lead routing, and performance tracking
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="campaigns" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="router" className="gap-2">
            <Router className="w-4 h-4" />
            Lead Router
          </TabsTrigger>
          <TabsTrigger value="changes" className="gap-2">
            <History className="w-4 h-4" />
            Change Log
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignCommandCenter />
        </TabsContent>

        <TabsContent value="router">
          <Suspense fallback={<TabSkeleton />}>
            <LeadStatsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="changes">
          <Suspense fallback={<TabSkeleton />}>
            <CampaignChangesContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings">
          <Suspense fallback={<TabSkeleton />}>
            <CampaignSettingsContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
