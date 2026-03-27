import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Phone, Trash2, Eye, CheckCircle2, XCircle, AlertTriangle, Loader2, Zap, CheckCircle, AlertCircle, Rocket, ChevronDown, DollarSign, MapPin, UserPlus, ExternalLink, ImageDown, MoreVertical, RotateCcw, StickyNote } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useClient, useClientByUserId, useClients, useOnboardingTasks, useUpdateClient, useHardDeleteClient } from '@/hooks/useClients';
import { useLeadMetrics, useUpdateClientMetrics } from '@/hooks/useLeadMetrics';
import { useClientPreview } from '@/contexts/ClientPreviewContext';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { usePortalSettings } from '@/hooks/usePortalSettings';
import { usePerformancePercentage } from '@/hooks/usePerformancePercentage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OnboardingStageProgress } from '@/components/portal/onboarding';
import { PillLinks } from '@/components/portal/PillLinks';
import { LeadIntelPillInline } from '@/components/hub/LeadIntelModal';
import { ChatPopup, ChatBubbleButton } from '@/components/portal/ChatPopup';
import { DiscoveryStatsSection } from '@/components/discovery/DiscoveryStatsSection';
import StatusBadge from '@/components/portal/StatusBadge';
import { PackageTypeBadge } from '@/components/portal/PackageTypeBadge';
import { ProfilePhotoUpload } from '@/components/portal/ProfilePhotoUpload';
import { LeadsWidget } from '@/components/portal/LeadsWidget';
import { BillingWidget } from '@/components/portal/BillingWidget';
import { CreditsWidget } from '@/components/portal/CreditsWidget';
import { PaymentMethodCard } from '@/components/portal/PaymentMethodCard';
import { AdSpendSetupCard } from '@/components/portal/AdSpendSetupCard';
import { MetricCard } from '@/components/portal/MetricCard';
import { SupportTicketPanel } from '@/components/portal/SupportTicketPanel';
import { AdSpendWalletHorizontal } from '@/components/portal/AdSpendWalletHorizontal';
import { UpcomingPaymentsWidget } from '@/components/portal/UpcomingPaymentsWidget';
import { GoogleAdsSyncButton } from '@/components/portal/GoogleAdsSyncButton';
import { DailySpendChart } from '@/components/portal/DailySpendChart';
import { EditBudgetDialog } from '@/components/portal/EditBudgetDialog';
import { StateSelector } from '@/components/portal/StateSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampaignPanel } from '@/components/portal/CampaignPanel';
import { BudgetHistoryPanel } from '@/components/portal/BudgetHistoryPanel';
import { useCampaigns } from '@/hooks/useCampaigns';
import EditableField from '@/components/portal/EditableField';
import { CreateTicketFromChat } from '@/components/portal/chat/CreateTicketFromChat';
import { GHLFieldMappingWidget } from '@/components/portal/GHLFieldMappingWidget';
import { OnboardingQATab } from '@/components/portal/onboarding';
import { HeroStatsCard } from '@/components/portal/HeroStatsCard';
import { LeaderboardWidget } from '@/components/portal/LeaderboardWidget';
import { ClientSelfOnboarding } from '@/components/portal/ClientSelfOnboarding';
import { MetricsDateSelector, DatePreset, getDateRangeFromPreset } from '@/components/portal/MetricsDateSelector';
import { AgreementSigningWidget } from '@/components/portal/AgreementSigningWidget';
import { AgreementSignedWidget } from '@/components/portal/AgreementSignedWidget';
import { OnboardingPaymentFlow } from '@/components/portal/OnboardingPaymentFlow';
import { ClientBillingSection } from '@/components/portal/client/ClientBillingSection';
import { useClientAgreement } from '@/hooks/useAgreement';
import { OnboardingAutomationWidget } from '@/components/admin/OnboardingAutomationWidget';
import ChurnReasonDropdown from '@/components/admin/ChurnReasonDropdown';
import { DeleteClientDialog } from '@/components/admin/DeleteClientDialog';
import { motion } from 'framer-motion';
import { FightDisputeButton } from '@/components/admin/FightDisputeButton';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ClientAvatar from '@/components/portal/ClientAvatar';

export default function PortalAdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  
  // Determine if this is a client viewing their own portal (no ID param)
  const isClientView = !id;
  
  // For client view, fetch by user_id; for admin view, fetch by client id
  const adminQuery = useClient(id);
  const clientQuery = useClientByUserId(isClientView ? user?.id : undefined);
  
  // Use the appropriate query based on view mode
  const { data: client, isLoading, error, refetch } = isClientView ? clientQuery : adminQuery;
  
  const { data: allClients = [], refetch: refetchClients } = useClients();
  const { data: tasks = [] } = useOnboardingTasks(client?.id);
  const updateClient = useUpdateClient();
  const updateMetrics = useUpdateClientMetrics();
  const hardDeleteClient = useHardDeleteClient();
  const { enterPreviewMode } = useClientPreview();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isSendingTestLead, setIsSendingTestLead] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [paymentWizardOpen, setPaymentWizardOpen] = useState(false);
  const queryClient = useQueryClient();

  // Portal visibility settings (for client view)
  const { data: portalSettings } = usePortalSettings();
  const showBilling = portalSettings?.agent_portal_show_billing !== false;
  const showWallet = portalSettings?.agent_portal_show_wallet !== false;
  const showPerformance = portalSettings?.agent_portal_show_performance_metrics !== false;
  const showLeads = portalSettings?.agent_portal_show_leads !== false;
  const showReferrals = portalSettings?.agent_portal_show_referrals !== false;
  
  const [testLeadResult, setTestLeadResult] = useState<{
    success: boolean;
    message: string;
    ghlContactId?: string;
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState<string | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Get date range from preset
  const dateRange = useMemo(() => getDateRangeFromPreset(datePreset), [datePreset]);
  
  // Get performance percentage for ROI calculation
  const { data: performancePercentage } = usePerformancePercentage();
  
  // Use lead metrics with date range and performance/commission options
  const { data: leadMetrics, isLoading: metricsLoading } = useLeadMetrics(
    client?.id || '', 
    dateRange,
    {
      performancePercentage: performancePercentage ?? 0,
      commissionContractPercent: (client as any)?.commission_contract_percent ?? 100
    }
  );
  
  // All-time metrics for Hero Stats Card (no date range = all time)
  const { data: allTimeLeadMetrics, isLoading: allTimeMetricsLoading } = useLeadMetrics(
    client?.id || '', 
    undefined, // No date range = all time
    {
      performancePercentage: performancePercentage ?? 0,
      commissionContractPercent: (client as any)?.commission_contract_percent ?? 100
    }
  );
  
  // Get client agreement status
  const { data: clientAgreement } = useClientAgreement(client?.id);
  const hasSignedAgreement = !!(client?.contract_signed_at || clientAgreement?.status === 'signed');
  
  // Fetch linked prospect for this client (Phase 5: Show prospect history)
  const { data: linkedProspect } = useQuery({
    queryKey: ['client-prospect', client?.id, client?.email],
    queryFn: async () => {
      if (!client) return null;
      
      // First try to find by client_id
      const { data: byClientId, error: err1 } = await supabase
        .from('prospects')
        .select('id, name, email, lead_source, referral_code, referrer_client_id, created_at, converted_at, visitor_id')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .maybeSingle();
      
      if (byClientId) return byClientId;
      
      // Fallback: try to find by email
      const { data: byEmail } = await supabase
        .from('prospects')
        .select('id, name, email, lead_source, referral_code, referrer_client_id, created_at, converted_at, visitor_id')
        .eq('email', client.email.toLowerCase())
        .order('created_at', { ascending: false })
        .maybeSingle();
      
      return byEmail;
    },
    enabled: !!client && !isClientView,
  });

  // Fetch referrer client name if there's a referral
  const referrerClientId = linkedProspect?.referrer_client_id || (client as any)?.referred_by_client_id;
  const { data: referrerClient } = useQuery({
    queryKey: ['referrer-client', referrerClientId],
    queryFn: async () => {
      if (!referrerClientId) return null;
      const { data } = await supabase
        .from('clients')
        .select('id, name, referral_code')
        .eq('id', referrerClientId)
        .single();
      return data;
    },
    enabled: !!referrerClientId,
  });
  
  // Use computed wallet balance for consistent spend display
  const { displayedSpend: displayedMtdSpend, trackingStartDate: walletTrackingStartDate, refetch: refetchWalletBalance } = useComputedWalletBalance(isClientView ? client?.id : id);

  // Fetch campaigns for dual-campaign support
  const { data: campaigns = [] } = useCampaigns(client?.id);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First verify Google Ads campaign status if we have a campaign ID
      if (client?.google_campaign_id) {
        try {
          const verifyResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-google-ads-campaign`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                clientId: client.id,
                googleCampaignId: client.google_campaign_id,
              }),
            }
          );
          const verifyResult = await verifyResponse.json();
          if (verifyResult.success) {
            console.log('Campaign verification:', verifyResult);
          }
        } catch (verifyError) {
          console.error('Campaign verification error:', verifyError);
        }
      }



      // Critical: Ad spend + wallet are computed from ad_spend_daily.
      // So refresh MUST backfill Google Ads data and then invalidate the wallet/spend queries.
      if (client?.google_campaign_id) {
        const daysBack = (() => {
          if (!walletTrackingStartDate) return 30;
          const start = new Date(walletTrackingStartDate);
          const today = new Date();
          const daysDiff = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return Math.min(Math.max(daysDiff + 1, 7), 90);
        })();

        // Sync ad spend data and state targeting in parallel
        const [adsResult, targetingResult] = await Promise.allSettled([
          supabase.functions.invoke('sync-google-ads', {
            body: { clientId: client.id, daysBack },
          }),
          supabase.functions.invoke('sync-google-ads-targeting', {
            body: { clientId: client.id },
          }),
        ]);

        // Handle ad spend sync result
        if (adsResult.status === 'fulfilled') {
          const { data: syncData, error: syncError } = adsResult.value;
          if (syncError) {
            console.error('sync-google-ads error:', syncError);
            toast.error('Ads sync failed', { description: syncError.message });
          } else if (!syncData?.success) {
            const msg = syncData?.error || 'Sync failed';
            console.error('sync-google-ads failed:', syncData);
            toast.error('Ads sync failed', { description: msg });
          }
        } else {
          console.error('sync-google-ads error:', adsResult.reason);
        }

        // Handle targeting sync result (silent - states update in DB)
        if (targetingResult.status === 'fulfilled') {
          const { data: targetData, error: targetError } = targetingResult.value;
          if (targetError) {
            console.error('sync-google-ads-targeting error:', targetError);
          } else if (targetData?.success) {
            console.log('States synced from Google Ads:', targetData.syncedStates?.join(', '));
          }
        } else {
          console.error('sync-google-ads-targeting error:', targetingResult.reason);
        }

        // Force UI refresh (wallet is based on these queries)
        queryClient.invalidateQueries({ queryKey: ['ad-spend-daily', client.id] });
        queryClient.invalidateQueries({ queryKey: ['tracked-ad-spend', client.id], exact: false });
        queryClient.invalidateQueries({ queryKey: ['wallet-deposits', client.id], exact: false });
        queryClient.invalidateQueries({ queryKey: ['client-wallet-tracking', client.id], exact: false });
        queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['command-center-stats'], exact: false });
        refetchWalletBalance?.();
      }

      await refetch();
      await refetchClients();

      // Also recalculate lead metrics
      if (id) {
        try {
          await updateMetrics.mutateAsync(id);
        } catch (error) {
          // Silently ignore if no agent_id
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAdsLiveToggle = async (adsLive: boolean) => {
    if (!id) return;
    try {
      await updateClient.mutateAsync({ clientId: id, updates: { ads_live: adsLive } });
      toast.success(adsLive ? 'Ads marked as live!' : 'Ads marked as not live');
    } catch (error) {
      toast.error('Failed to update ads status');
    }
  };

  const handleSendTestLead = async () => {
    if (!client) return;
    
    setIsSendingTestLead(true);
    setTestLeadResult(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-lead`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ clientId: client.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test lead');
      }

      // Check delivery status
      if (result.delivery?.success) {
        setTestLeadResult({
          success: true,
          message: 'Test lead delivered to GHL',
          ghlContactId: result.delivery.contactId,
        });
        toast.success(`Test lead delivered! GHL Contact: ${result.delivery.contactId?.slice(0, 8)}...`);
      } else if (result.routerStatus?.issues?.length > 0) {
        setTestLeadResult({
          success: false,
          message: result.routerStatus.issues.join(', '),
        });
        toast.warning(`Router issues: ${result.routerStatus.issues[0]}`);
      } else if (result.delivery?.error) {
        setTestLeadResult({
          success: false,
          message: result.delivery.error,
        });
        toast.error(`Delivery failed: ${result.delivery.error}`);
      } else {
        setTestLeadResult({
          success: true,
          message: 'Test lead created (CRM delivery disabled)',
        });
        toast.success('Test lead created in database');
      }

      // Refresh to show the new lead
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestLeadResult({
        success: false,
        message: errorMessage,
      });
      toast.error(`Test lead failed: ${errorMessage}`);
    } finally {
      setIsSendingTestLead(false);
    }
  };

  const handleProfilePhotoUpload = async (url: string) => {
    const targetClientId = id ?? client?.id;
    if (!targetClientId) return;
    await updateClient.mutateAsync({
      clientId: targetClientId,
      updates: { profile_image_url: url, headshot_updated_at: new Date().toISOString() as any },
    });
  };

  const handleRefreshStableHeadshot = async () => {
    if (!client?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke('refresh-stable-headshot', {
        body: { clientId: client.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Refresh failed');

      toast.success('Headshot refreshed', { description: 'Stable URL updated in storage.' });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', client.id] });
      await refetch();
      await refetchClients();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to refresh headshot';
      toast.error('Headshot refresh failed', { description: msg });
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!id) return;
    await updateClient.mutateAsync({ clientId: id, updates: { profile_image_url: null } });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    const updates: any = { status: newStatus };
    // Auto-set activated_at when transitioning to active (if not already set)
    if (newStatus === 'active' && !(client as any).activated_at) {
      updates.activated_at = new Date().toISOString();
    }
    await updateClient.mutateAsync({ clientId: id, updates });
  };

  const handlePackageTypeChange = async (newType: string) => {
    if (!id) return;
    await updateClient.mutateAsync({ clientId: id, updates: { package_type: newType } });
  };

  // Default Google Ads customer account ID - used for all campaigns
  const GOOGLE_ADS_CUSTOMER_ID = '6551751244';

  const handleSaveField = async (key: string, value: string) => {
    if (!id) return;
    try {
      let finalValue: string | number | null = value || null;
      
      // Auto-prepend Google Ads customer account ID if only campaign ID is provided
      if (key === 'google_campaign_id' && value && !value.includes(':')) {
        finalValue = `${GOOGLE_ADS_CUSTOMER_ID}:${value}`;
        toast.info(`Auto-formatted to ${finalValue}`);
      }
      
      // Strip commas from numeric fields and convert to number
      const numericFields = ['historical_total_paid', 'profit_margin', 'commission_contract_percent', 'management_fee', 'ad_spend_budget', 'monthly_ad_spend'];
      if (numericFields.includes(key) && value) {
        const cleanedValue = value.replace(/,/g, '');
        finalValue = parseFloat(cleanedValue) || 0;
      }
      
      const updates: Record<string, string | number | null> = { [key]: finalValue };

      // Auto-update CRM link when subaccount_id changes
      if (key === 'subaccount_id' && finalValue) {
        updates.crm_link = `https://app.alphaagentcrm.com/v2/location/${finalValue}`;
      }

      await updateClient.mutateAsync({ clientId: id, updates });
      const toastMessages: Record<string, string> = {
        subaccount_id: 'Sub-account ID updated — CRM link and lead delivery will use this location',
        ghl_user_id: 'GHL User ID updated — future leads will auto-assign to this user',
      };
      toast.success(toastMessages[key] || 'Field updated successfully');
    } catch (error) {
      toast.error('Failed to update field');
      throw error;
    }
  };

  // Use leadMetrics from the hook for date-range aware metrics
  // Also calculate client-based metrics for display
  const metrics = useMemo(() => {
    if (!leadMetrics) return null;
    return {
      ...leadMetrics,
      adSpendBudget: client?.ad_spend_budget || 0,
    };
  }, [leadMetrics, client?.ad_spend_budget]);

  // All-time metrics for Hero Stats Card
  const allTimeMetrics = useMemo(() => {
    if (!allTimeLeadMetrics) return null;
    return {
      ...allTimeLeadMetrics,
      adSpendBudget: client?.ad_spend_budget || 0,
    };
  }, [allTimeLeadMetrics, client?.ad_spend_budget]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Extract just the campaign ID from the full google_campaign_id (format: accountId:campaignId)
  const getDisplayCampaignId = (fullId: string | null) => {
    if (!fullId) return null;
    if (fullId.includes(':')) {
      return fullId.split(':')[1];
    }
    return fullId;
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6 lg:p-8">
        {!isClientView && (
          <Button
            variant="ghost"
            onClick={() => navigate('/hub/admin/clients')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </Button>
        )}
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {isClientView ? 'Portal Not Available' : 'Client Not Found'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {isClientView 
              ? 'Your portal is being set up. Please check back soon or contact support.'
              : "The client you're looking for doesn't exist."
            }
          </p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const initials = client.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    paused: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    at_risk: 'bg-red-500/10 text-red-600 border-red-500/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
  };

  const isOnboarding = client.onboarding_status === 'in_progress';
  const isAutomationComplete = client.onboarding_status === 'automation_complete';
  
  // Gate onboarding widgets - only show when client status is 'onboarding'
  const showOnboardingWidgets = client.status === 'onboarding';

  // Handler to skip onboarding automation
  const handleSkipAutomation = async () => {
    if (!id) return;
    try {
      await updateClient.mutateAsync({ 
        clientId: id, 
        updates: { 
          status: 'active',
          onboarding_status: 'automation_complete',
          automation_completed_at: new Date().toISOString()
        } as any
      });
      toast.success('Onboarding skipped - client marked as active');
      refetch();
    } catch (error) {
      toast.error('Failed to skip automation');
    }
  };

  // Handler for retrying Google Ads campaign creation
  const handleRetryGoogleCampaign = async (retryStep?: 'full' | 'adgroup' | 'ad') => {
    if (!client) return;
    
    setIsCreatingCampaign(true);
    try {
      toast.info('Creating Google Ads campaign...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-google-ads-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            clientId: client.id,
            states: client.states,
            budget: client.ad_spend_budget,
            agentId: client.agent_id,
            agentName: client.name,
            landingPage: (client as any).lander_link,
            retryStep, // Pass retry step if specified
          }),
        }
      );
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success(`Campaign created: ${result.campaignId}`);
        refetch();
      } else {
        toast.error(`Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Failed to create campaign');
      console.error('Campaign creation error:', error);
    } finally {
      setIsCreatingCampaign(false);
    }
  };
  
  // Campaign creation status helpers
  const campaignStatus = {
    campaignCreated: (client as any)?.gads_campaign_created ?? false,
    adgroupCreated: (client as any)?.gads_adgroup_created ?? false,
    adCreated: (client as any)?.gads_ad_created ?? false,
    error: (client as any)?.gads_creation_error ?? null,
    lastAttempt: (client as any)?.gads_last_attempt_at ?? null,
  };
  
  const hasPartialCampaign = campaignStatus.campaignCreated && (!campaignStatus.adgroupCreated || !campaignStatus.adCreated);
  const hasCampaignError = !!campaignStatus.error;

  return (
    <div className="p-6 lg:p-8 space-y-6 overflow-x-hidden">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        {/* Left: Back + Client Info */}
        <div className="flex items-start gap-4">
          {!isClientView && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/hub/admin/clients')}
              className="shrink-0 mt-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
            <div className="flex items-start gap-4">
              {/* Profile Photo - editable for admin + clients (stable URL system) */}
              <div className="relative shrink-0">
                <ProfilePhotoUpload
                  currentImageUrl={client.profile_image_url}
                  name={client.name}
                  clientId={client.id}
                  onUpload={handleProfilePhotoUpload}
                  size="lg"
                  cacheKey={(client as any).headshot_updated_at || client.updated_at}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshStableHeadshot}
                  className="absolute -bottom-1 -left-1 h-7 w-7 rounded-full bg-background/80 border border-border hover:bg-muted"
                  title="Refresh headshot (stable URL)"
                >
                  <ImageDown className="h-3.5 w-3.5" />
                </Button>
                {!isClientView && client.profile_image_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveProfilePhoto}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background/80 border border-border hover:bg-muted"
                    title="Remove photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

            <div className="space-y-1 min-w-0 flex-1">
              {/* Name + Chat Row */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground whitespace-nowrap">{client.name}</h1>
                {!isClientView && (
                  <ChatBubbleButton
                    onClick={() => setIsChatOpen(true)}
                    className="text-primary"
                  />
                )}
              </div>
              {/* Status + Package Badge Row */}
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={client.status}
                  size="sm"
                  editable={!isClientView}
                  onStatusChange={!isClientView ? handleStatusChange : undefined}
                />
                <PackageTypeBadge
                  packageType={client.package_type}
                  editable={!isClientView}
                  onPackageTypeChange={!isClientView ? handlePackageTypeChange : undefined}
                />
              </div>

              {/* Email */}
              <div className="text-sm text-muted-foreground">{client.email}</div>
              {/* Phone */}
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {client.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pill Links + Refresh (admin-only) */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <PillLinks
            landerLink={isClientView ? undefined : (client as any).lander_link}
            thankyouLink={isClientView ? undefined : (client as any).thankyou_link}
            nfiaLink={client.nfia_link}
            schedulerLink={(client as any).scheduler_link}
            crmLink={client.subaccount_id ? `https://app.alphaagentcrm.com/v2/location/${client.subaccount_id}` : client.crm_link}
            tfwpProfileLink={(client as any).tfwp_profile_link}
            agreementLink={(client as any).agreement_link}
          />
          <LeadIntelPillInline />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Full-width Ad Spend Wallet (visibility controlled) */}
      {showWallet && (
        <AdSpendWalletHorizontal
          clientId={client.id}
          mtdAdSpend={client.mtd_ad_spend || 0}
          isAdmin={!isClientView}
        />
      )}

      {/* Alpha Results (Hero Stats) */}
      {allTimeMetrics && showPerformance && (
        allTimeMetrics.submittedApps > 0 ||
        allTimeMetrics.issuedPaidCount > 0 ||
        allTimeMetrics.totalSubmittedPremium > 0 ||
        allTimeMetrics.totalIssuedPremium > 0
      ) && (
        <HeroStatsCard
          totalSubmittedPremium={allTimeMetrics.totalSubmittedPremium}
          totalIssuedPremium={allTimeMetrics.totalIssuedPremium}
          submittedApps={allTimeMetrics.submittedApps}
          issuedPaidCount={allTimeMetrics.issuedPaidCount}
          alphaRoi={allTimeMetrics.alphaRoi}
          adSpend={allTimeMetrics.adSpend}
          isLoading={allTimeMetricsLoading}
          commissionContractPercent={client?.commission_contract_percent ?? 100}
          onCommissionChange={!isClientView ? async (value) => {
            await handleSaveField('commission_contract_percent', String(value));
          } : undefined}
        />
      )}

      {/* Top Alpha Agents Leaderboard (preview: James Warren only, remove gate to go live) */}
      {client.id === '9d03c1f4-8f20-48fd-b358-64b9752a7861' && <LeaderboardWidget />}

      {/* Upcoming Payments Due (visibility controlled) */}
      {showBilling && <UpcomingPaymentsWidget clientId={client.id} />}

      {/* Full Width Content */}
      <div className="space-y-6">
        {/* Onboarding Progress (admin only) */}
        {!isClientView && showOnboardingWidgets && (
          <OnboardingStageProgress clientId={client.id} />
        )}
        
        {/* Tabs - Full Width */}
        <Tabs defaultValue={showPerformance ? "overview" : showBilling ? "billing" : "support"} className="w-full">
          <TabsList className="w-full justify-start mb-6 bg-muted/50">
            {showPerformance && <TabsTrigger value="overview">Overview</TabsTrigger>}
            {showBilling && <TabsTrigger value="billing">Billing</TabsTrigger>}
            <TabsTrigger value="support">Support</TabsTrigger>
            {!isClientView && <TabsTrigger value="info">Info</TabsTrigger>}
            {!isClientView && showOnboardingWidgets && <TabsTrigger value="onboarding-qa">Onboarding QA</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Campaign Panel */}
            {!isClientView && (
              <div className="space-y-3">
                {client.team && (
                  <div className="flex items-center gap-2 text-sm px-1">
                    <span className="text-muted-foreground">Team:</span>
                    <span className="text-foreground font-medium">{client.team}</span>
                  </div>
                )}
                <CampaignPanel
                  clientId={client.id}
                  campaigns={campaigns as any}
                  trackingStartDate={walletTrackingStartDate}
                  onRefresh={handleRefresh}
                  onUpdateStates={async (states) => {
                    if (!id) return;
                    await updateClient.mutateAsync({ clientId: id, updates: { states } });
                  }}
                />
              </div>
            )}

            {/* Budget History Panel */}
            {!isClientView && client.id && (
              <BudgetHistoryPanel clientId={client.id} />
            )}

            {/* Agreement Signing Widget - Only show if NOT signed */}
            {client && !hasSignedAgreement && (
              <AgreementSigningWidget clientId={client.id} />
            )}

            {/* Onboarding Automation Widget (Admin Only) - Only show during onboarding */}
            {!isClientView && client.id && showOnboardingWidgets && (
              <OnboardingAutomationWidget 
                clientId={client.id}
                clientName={client.name}
                onSkipAutomation={handleSkipAutomation}
              />
            )}

            {/* Client Self-Onboarding Checklist - Only show during onboarding */}
            {client.id && showOnboardingWidgets && (
            <ClientSelfOnboarding 
                clientId={client.id} 
                hasSignedAgreement={hasSignedAgreement}
                clientCreatedAt={client.created_at}
                clientName={client.name}
                onOpenPaymentWizard={() => setPaymentWizardOpen(true)}
              />
            )}

            {/* Read-only Campaign Summary for Clients */}
            {isClientView && client && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm px-3 py-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground font-medium">Alpha Agent Google Ads Campaign</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Daily Budget:</span>
                  <span className="text-foreground font-medium">
                    ${campaigns.length > 0
                      ? `$${campaigns.reduce((sum: number, c: any) => sum + (c.current_daily_budget || 0), 0).toFixed(0)}`
                      : client.target_daily_spend ? `$${client.target_daily_spend}` : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Target States:</span>
                  <span className="text-foreground font-medium">
                    {(() => {
                      const allStates = campaigns
                        .map((c: any) => c.states || '')
                        .join(', ')
                        .split(/[,\s]+/)
                        .map((s: string) => s.trim())
                        .filter(Boolean);
                      const unique = [...new Set(allStates)].sort();
                      return unique.length > 0 ? unique.join(', ') : (client.states || 'Not set');
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {metrics && showPerformance && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Performance Metrics</h3>
                  <MetricsDateSelector value={datePreset} onChange={setDatePreset} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                  <MetricCard label="Leads" value={metrics.totalLeads} format="number" />
                  <MetricCard label="Booked Calls" value={metrics.bookedCalls} format="number" />
                  <MetricCard label="Booking %" value={metrics.bookingPercentage} format="percent" />
                  <MetricCard label="CPL" value={metrics.cpl} format="currency" />
                  <MetricCard label="CPBC" value={metrics.cpbc} format="currency" />
                  <MetricCard label="Ad Spend" value={metrics.adSpend} format="currency" />
                  <MetricCard label="LTSA Cost" value={metrics.ltsaCost} format="currency" />
                  <MetricCard label="LTSA %" value={metrics.ltsaPercentage} format="percent" />
                </div>
              </div>
            )}

            {/* Daily Spend Chart */}
            {showPerformance && (
              <DailySpendChart
                clientId={client.id}
                targetDailySpend={client.target_daily_spend}
                campaigns={campaigns.length > 1 ? campaigns.map(c => ({
                  id: c.id,
                  google_campaign_id: c.google_campaign_id,
                  label: c.label || 'Campaign',
                })) : undefined}
              />
            )}

            {/* Leads Widget (visibility controlled) */}
            {showLeads && client.agent_id && (
              <LeadsWidget agentId={client.agent_id} />
            )}

            {/* Discovery Call Stats (admin only) */}
            {!isClientView && client.agent_id && (
              <DiscoveryStatsSection agentId={client.agent_id} />
            )}
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {isClientView ? (
              <ClientBillingSection clientId={client.id} />
            ) : (
              <>
                {/* Onboarding Payment Flow */}
                {client.id && (
                  <OnboardingPaymentFlow
                    clientId={client.id}
                    hasSignedAgreement={hasSignedAgreement}
                    clientEmail={client.email}
                    open={paymentWizardOpen}
                    onOpenChange={setPaymentWizardOpen}
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PaymentMethodCard clientId={client.id} isAdmin={true} />
                  <AdSpendSetupCard clientId={client.id} />
                </div>
                <BillingWidget clientId={client.id} isAdmin={true} />
                <CreditsWidget clientId={client.id} isAdmin={true} />
              </>
            )}
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            {/* Signed Agreement Widget */}
            {hasSignedAgreement && client.contract_signed_at && (
              <AgreementSignedWidget 
                clientId={client.id}
                signedAt={client.contract_signed_at} 
                pdfUrl={clientAgreement?.pdf_url}
              />
            )}
            <SupportTicketPanel clientId={client.id} isAdmin={!isClientView} />
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            {/* Prospect History (Admin Only) - Phase 5 */}
            {!isClientView && (linkedProspect || referrerClient) && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Sales Origin / Prospect History
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  {linkedProspect && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lead Source</p>
                        <p className="font-medium">{linkedProspect.lead_source || 'Direct'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Prospect Created</p>
                        <p className="font-medium">{new Date(linkedProspect.created_at).toLocaleDateString()}</p>
                      </div>
                      {linkedProspect.converted_at && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Converted</p>
                          <p className="font-medium">{new Date(linkedProspect.converted_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </>
                  )}
                  {referrerClient && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Referred By</p>
                      <p className="font-medium text-primary">{referrerClient.name}</p>
                      {referrerClient.referral_code && (
                        <Badge variant="secondary" className="mt-1 text-xs">{referrerClient.referral_code}</Badge>
                      )}
                    </div>
                  )}
                </div>
                {linkedProspect?.id && (
                  <Link 
                    to={`/hub/admin/attribution/journey/${linkedProspect.id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    View Full Customer Journey
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}

            {/* Referrer Assignment (Admin Only) */}
            {!isClientView && isAdmin && client && (
              <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Referral Commission Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Referrer (10%) */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Primary Referrer <span className="text-muted-foreground">(10%)</span></Label>
                    <Select
                      value={(client as any).referred_by_client_id || 'none'}
                      onValueChange={async (value) => {
                        if (!id) return;
                        const referrerId = value === 'none' ? null : value;
                        try {
                          await updateClient.mutateAsync({
                            clientId: id,
                            updates: { referred_by_client_id: referrerId } as any,
                          });
                          toast.success('Primary referrer updated');
                          // Check for management payment in last 24h and retroactively apply commission
                          if (referrerId) {
                            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                            const { data: recentBilling } = await supabase
                              .from('billing_records')
                              .select('id, amount, billing_type, billing_period_start, billing_period_end')
                              .eq('client_id', id)
                              .eq('billing_type', 'management')
                              .eq('status', 'paid')
                              .gte('paid_at', since)
                              .order('paid_at', { ascending: false })
                              .limit(1)
                              .maybeSingle();
                            if (recentBilling) {
                              const resp = await fetch(
                                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-referral-commission`,
                                {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                  },
                                  body: JSON.stringify({
                                    billing_record_id: recentBilling.id,
                                    client_id: id,
                                    amount: recentBilling.amount,
                                    billing_type: recentBilling.billing_type,
                                    billing_period_start: recentBilling.billing_period_start,
                                    billing_period_end: recentBilling.billing_period_end,
                                  }),
                                }
                              );
                              if (resp.ok) {
                                toast.success('Applied commission for recent management payment');
                              }
                            }
                          }
                        } catch {
                          toast.error('Failed to update referrer');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select referring agent..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {allClients
                          .filter(c => c.id !== client.id && c.status !== 'cancelled' && c.user_id)
                          .map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Earns 10% credit on each management fee payment
                    </p>
                  </div>

                  {/* Secondary Referrer (5%) */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Secondary Referrer <span className="text-muted-foreground">(5%)</span></Label>
                    <Select
                      value={(client as any).referred_by_client_id_secondary || 'none'}
                      onValueChange={async (value) => {
                        if (!id) return;
                        const referrerId = value === 'none' ? null : value;
                        try {
                          await updateClient.mutateAsync({
                            clientId: id,
                            updates: { referred_by_client_id_secondary: referrerId } as any,
                          });
                          toast.success('Secondary referrer updated');
                          // Check for management payment in last 24h and retroactively apply commission
                          if (referrerId) {
                            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                            const { data: recentBilling } = await supabase
                              .from('billing_records')
                              .select('id, amount, billing_type, billing_period_start, billing_period_end')
                              .eq('client_id', id)
                              .eq('billing_type', 'management')
                              .eq('status', 'paid')
                              .gte('paid_at', since)
                              .order('paid_at', { ascending: false })
                              .limit(1)
                              .maybeSingle();
                            if (recentBilling) {
                              const resp = await fetch(
                                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-referral-commission`,
                                {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                  },
                                  body: JSON.stringify({
                                    billing_record_id: recentBilling.id,
                                    client_id: id,
                                    amount: recentBilling.amount,
                                    billing_type: recentBilling.billing_type,
                                    billing_period_start: recentBilling.billing_period_start,
                                    billing_period_end: recentBilling.billing_period_end,
                                  }),
                                }
                              );
                              if (resp.ok) {
                                toast.success('Applied commission for recent management payment');
                              }
                            }
                          }
                        } catch {
                          toast.error('Failed to update referrer');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select secondary referrer..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {allClients
                          .filter(c => c.id !== client.id && c.id !== (client as any).referred_by_client_id && c.status !== 'cancelled' && c.user_id)
                          .map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Earns 5% credit on each management fee payment
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {!isClientView && isAdmin && (
              <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <StickyNote className="w-4 h-4" />
                  Admin Notes
                </h3>
                <Textarea
                  value={adminNotes ?? (client as any).admin_notes ?? ''}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about client interactions, preferences, issues..."
                  className="min-h-[120px] resize-y text-sm"
                  rows={5}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={isSavingNotes || (adminNotes ?? (client as any).admin_notes ?? '') === ((client as any).admin_notes ?? '')}
                    onClick={async () => {
                      if (!id) return;
                      setIsSavingNotes(true);
                      try {
                        await updateClient.mutateAsync({
                          clientId: id,
                          updates: { admin_notes: adminNotes || null } as any,
                        });
                        setAdminNotes(null); // Reset local state, let query data take over
                        toast.success('Notes saved');
                      } catch (error) {
                        toast.error('Failed to save notes');
                      }
                      setIsSavingNotes(false);
                    }}
                  >
                    {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Save Notes
                  </Button>
                  {adminNotes !== null && adminNotes !== ((client as any).admin_notes ?? '') && (
                    <span className="text-xs text-muted-foreground">Unsaved changes</span>
                  )}
                </div>
              </div>
            )}

            {/* CRM Delivery Toggle */}
            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="crm-delivery" className="text-sm font-medium">CRM Lead Delivery</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, leads are automatically sent to the agent's GHL CRM. 
                    Disable if agent uses their own CRM or only wants a lead sheet.
                  </p>
                </div>
                <Switch
                  id="crm-delivery"
                  checked={(client as any).crm_delivery_enabled !== false}
                  onCheckedChange={async (checked) => {
                    if (!id) return;
                    try {
                      await updateClient.mutateAsync({ 
                        clientId: id, 
                        updates: { crm_delivery_enabled: checked } as any 
                      });
                      toast.success(checked ? 'CRM delivery enabled' : 'CRM delivery disabled');
                    } catch (error) {
                      toast.error('Failed to update CRM delivery setting');
                    }
                  }}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
              <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Phone Number</label>
                  <EditableField
                    value={client.phone}
                    fieldKey="phone"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                  {!client.phone && (
                    <p className="text-xs text-amber-500">⚠️ Phone number required for SMS OTP</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
                  <EditableField
                    value={client.email}
                    fieldKey="email"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">NPN</label>
                  <EditableField
                    value={(client as any).npn}
                    fieldKey="npn"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Start Date</label>
                  <EditableField
                    value={(client as any).activated_at ? new Date((client as any).activated_at).toISOString().split('T')[0] : null}
                    fieldKey="activated_at"
                    onSave={handleSaveField}
                    type="date"
                    displayValue={(client as any).activated_at ? new Date((client as any).activated_at).toLocaleDateString() : undefined}
                    className="text-sm"
                  />
                  {!(client as any).activated_at && client.status !== 'active' && (
                    <p className="text-xs text-muted-foreground">Auto-set when status changes to active</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address for A2P */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
              <h3 className="text-sm font-medium text-muted-foreground">Address (for A2P Verification)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1 lg:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Street Address</label>
                  <EditableField
                    value={(client as any).address_street}
                    fieldKey="address_street"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">City</label>
                  <EditableField
                    value={(client as any).address_city}
                    fieldKey="address_city"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">State</label>
                  <EditableField
                    value={(client as any).address_state}
                    fieldKey="address_state"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">ZIP Code</label>
                  <EditableField
                    value={(client as any).address_zip}
                    fieldKey="address_zip"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Asset Links — matches all pill links */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
              <h3 className="text-sm font-medium text-muted-foreground">Asset Links</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Landing Page URL</label>
                  <EditableField
                    value={(client as any).lander_link}
                    fieldKey="lander_link"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Thank You Page URL</label>
                  <EditableField
                    value={(client as any).thankyou_link}
                    fieldKey="thankyou_link"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">NFIA URL</label>
                  <EditableField
                    value={client.nfia_link}
                    fieldKey="nfia_link"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">TFWP Profile URL</label>
                  <EditableField
                    value={(client as any).tfwp_profile_link}
                    fieldKey="tfwp_profile_link"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Scheduler URL</label>
                  <EditableField
                    value={(client as any).scheduler_link}
                    fieldKey="scheduler_link"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">CRM URL</label>
                  <EditableField
                    value={client.crm_link}
                    fieldKey="crm_link"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Agreement URL</label>
                  <EditableField
                    value={(client as any).agreement_link}
                    fieldKey="agreement_link"
                    onSave={handleSaveField}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
              <h3 className="text-sm font-medium text-muted-foreground">Agent Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Agent ID</label>
                  <EditableField
                    value={client.agent_id}
                    fieldKey="agent_id"
                    onSave={handleSaveField}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Subaccount ID</label>
                  <EditableField
                    value={(client as any).subaccount_id}
                    fieldKey="subaccount_id"
                    onSave={handleSaveField}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">GHL User ID</label>
                  <EditableField
                    value={(client as any).ghl_user_id}
                    fieldKey="ghl_user_id"
                    onSave={handleSaveField}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Auto-assigns leads to this user in GHL</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Campaign ID</label>
                  <div className="flex items-center gap-2">
                    <EditableField
                      value={getDisplayCampaignId((client as any).google_campaign_id)}
                      fieldKey="google_campaign_id"
                      onSave={handleSaveField}
                      className="font-mono text-sm"
                    />
                    <GoogleAdsSyncButton
                      clientId={client.id}
                      googleCampaignId={(client as any).google_campaign_id}
                      trackingStartDate={walletTrackingStartDate}
                      onSyncComplete={handleRefresh}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isCreatingCampaign || !client.states || !client.ad_spend_budget}
                          className="gap-1.5"
                          title={!client.states ? 'States required' : !client.ad_spend_budget ? 'Budget required' : 'Rebuild Google Ads campaign from scratch'}
                        >
                          {isCreatingCampaign ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Rebuild
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rebuild Google Ads Campaign?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will rebuild the entire Google Ads campaign from scratch including ad groups and ads. 
                            The existing campaign structure will be replaced with new ad groups and ads.
                            <br /><br />
                            <strong>Client:</strong> {client.name}<br />
                            <strong>States:</strong> {client.states}<br />
                            <strong>Budget:</strong> ${client.ad_spend_budget}/month
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRetryGoogleCampaign('full')}
                            className="bg-primary"
                          >
                            Yes, Rebuild Campaign
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Management Fee</label>
                  <EditableField
                    value={client.management_fee?.toString() || '1497'}
                    fieldKey="management_fee"
                    onSave={handleSaveField}
                    type="number"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Default: $1,497</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Billing Frequency</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={(client as any).billing_frequency || 'monthly'}
                    onChange={async (e) => {
                      const newFreq = e.target.value;
                      try {
                        await supabase.from('clients').update({ billing_frequency: newFreq } as any).eq('id', client.id);
                        queryClient.invalidateQueries({ queryKey: ['client', client.id] });
                        toast.success(`Billing frequency updated to ${newFreq === 'bi_weekly' ? 'Bi-Weekly' : 'Monthly'}`);
                      } catch (err: any) {
                        toast.error('Failed to update billing frequency');
                      }
                    }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {(client as any).billing_frequency === 'bi_weekly'
                      ? `Client pays ${client.management_fee ? formatCurrency(client.management_fee / 2) : '—'} every 2 weeks`
                      : 'Client pays full fee monthly'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Mgmt Stripe Subscription ID</label>
                  <EditableField
                    value={(client as any).management_stripe_subscription_id?.toString() || ''}
                    fieldKey="management_stripe_subscription_id"
                    onSave={handleSaveField}
                    type="text"
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Stripe subscription ID for management fee (sub_xxx)</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Commission Contract %</label>
                  <EditableField
                    value={(client as any).commission_contract_percent?.toString() || '100'}
                    fieldKey="commission_contract_percent"
                    onSave={handleSaveField}
                    type="number"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">IUL contract % (e.g., 130 = 130%)</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Budget</label>
                  <p className="text-foreground font-medium">
                    {client.ad_spend_budget ? formatCurrency(client.ad_spend_budget) : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Contract Signed</label>
                  <p className="text-foreground">
                    {client.contract_signed_at 
                      ? new Date(client.contract_signed_at).toLocaleDateString() 
                      : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Renewal Date</label>
                  <p className="text-foreground">
                    {client.renewal_date 
                      ? new Date(client.renewal_date).toLocaleDateString() 
                      : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Start Date</label>
                  <EditableField
                    value={client.start_date}
                    fieldKey="start_date"
                    onSave={handleSaveField}
                    type="date"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Used for LTV & lifespan calculations</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Historical Payments</label>
                  <EditableField
                    value={(client as any).historical_total_paid?.toString() || '0'}
                    fieldKey="historical_total_paid"
                    onSave={handleSaveField}
                    type="number"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Total paid before system tracking (for accurate LTV)</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Profit Margin %</label>
                  <EditableField
                    value={(client as any).profit_margin?.toString() || ''}
                    fieldKey="profit_margin"
                    onSave={handleSaveField}
                    type="number"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for default 50%</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">End Date</label>
                  <EditableField
                    value={(client as any).end_date || ''}
                    fieldKey="end_date"
                    onSave={handleSaveField}
                    type="date"
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Actual end date for cohort retention</p>
                </div>
                {(client.status === 'cancelled' || client.deleted_at) && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Churn Reason</label>
                    <ChurnReasonDropdown
                      value={client.churn_reason}
                      onChange={(value) => handleSaveField('churn_reason', value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Google Ads Campaign Status (moved from pre-tabs) */}
            {!isClientView && (isAutomationComplete || hasCampaignError || hasPartialCampaign) && (
              <Card className={cn(
                "border",
                hasCampaignError || hasPartialCampaign
                  ? "border-amber-500/30 bg-amber-500/5"
                  : !client.google_campaign_id
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-green-500/30 bg-green-500/5"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {hasCampaignError || hasPartialCampaign || !client.google_campaign_id ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Google Ads Campaign Status
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Google Ads Campaign Ready
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      {campaignStatus.campaignCreated ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={campaignStatus.campaignCreated ? "text-foreground" : "text-muted-foreground"}>
                        Campaign
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {campaignStatus.adgroupCreated ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={campaignStatus.adgroupCreated ? "text-foreground" : "text-muted-foreground"}>
                        Ad Group
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {campaignStatus.adCreated ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={campaignStatus.adCreated ? "text-foreground" : "text-muted-foreground"}>
                        Ad
                      </span>
                    </div>
                  </div>
                  {campaignStatus.error && (
                    <div className="text-xs text-amber-700 bg-amber-100/50 p-2 rounded">
                      <strong>Error:</strong> {campaignStatus.error}
                    </div>
                  )}
                  {campaignStatus.lastAttempt && (
                    <p className="text-xs text-muted-foreground">
                      Last attempt: {new Date(campaignStatus.lastAttempt).toLocaleString()}
                    </p>
                  )}
                  {(!client.google_campaign_id || hasCampaignError || hasPartialCampaign) && client.states && client.ad_spend_budget && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryGoogleCampaign('full')}
                        disabled={isCreatingCampaign}
                        className="border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                      >
                        {isCreatingCampaign ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Rebuild Full Campaign'
                        )}
                      </Button>
                      {hasPartialCampaign && !campaignStatus.adgroupCreated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryGoogleCampaign('adgroup')}
                          disabled={isCreatingCampaign}
                        >
                          Retry Ad Group Only
                        </Button>
                      )}
                      {hasPartialCampaign && campaignStatus.adgroupCreated && !campaignStatus.adCreated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryGoogleCampaign('ad')}
                          disabled={isCreatingCampaign}
                        >
                          Retry Ad Only
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* A2P SMS Registration Status (moved from pre-tabs) */}
            {!isClientView && client.subaccount_id && (
              <Card className={cn(
                "border",
                client.a2p_brand_status === 'approved' && client.a2p_campaign_status === 'approved'
                  ? "border-green-500/30 bg-green-500/5"
                  : client.a2p_brand_status === 'rejected' || client.a2p_campaign_status === 'rejected'
                    ? "border-red-500/30 bg-red-500/5"
                    : client.a2p_brand_status || client.a2p_campaign_status
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border/50"
              )}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    A2P SMS Registration Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Brand:</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="focus:outline-none">
                            <Badge
                              variant={
                                client.a2p_brand_status === 'approved' ? 'default' :
                                client.a2p_brand_status === 'pending' ? 'secondary' :
                                client.a2p_brand_status === 'rejected' ? 'destructive' : 'outline'
                              }
                              className="capitalize cursor-pointer flex items-center gap-1"
                            >
                              {client.a2p_brand_status || 'Not submitted'}
                              <ChevronDown className="w-3 h-3" />
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-popover border border-border">
                          {['approved', 'pending', 'rejected', null].map((status) => (
                            <DropdownMenuItem
                              key={status || 'none'}
                              onClick={async () => {
                                try {
                                  await updateClient.mutateAsync({
                                    clientId: id!,
                                    updates: { a2p_brand_status: status } as any
                                  });
                                  toast.success(`A2P brand status updated to ${status || 'not submitted'}`);
                                } catch (error) {
                                  toast.error('Failed to update A2P brand status');
                                }
                              }}
                              className={cn("cursor-pointer capitalize", client.a2p_brand_status === status && "bg-muted")}
                            >
                              {status || 'Not submitted'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Campaign:</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="focus:outline-none">
                            <Badge
                              variant={
                                client.a2p_campaign_status === 'approved' ? 'default' :
                                client.a2p_campaign_status === 'pending' ? 'secondary' :
                                client.a2p_campaign_status === 'rejected' ? 'destructive' : 'outline'
                              }
                              className="capitalize cursor-pointer flex items-center gap-1"
                            >
                              {client.a2p_campaign_status || 'Not submitted'}
                              <ChevronDown className="w-3 h-3" />
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-popover border border-border">
                          {['approved', 'pending', 'rejected', null].map((status) => (
                            <DropdownMenuItem
                              key={status || 'none'}
                              onClick={async () => {
                                try {
                                  await updateClient.mutateAsync({
                                    clientId: id!,
                                    updates: { a2p_campaign_status: status } as any
                                  });
                                  toast.success(`A2P campaign status updated to ${status || 'not submitted'}`);
                                } catch (error) {
                                  toast.error('Failed to update A2P campaign status');
                                }
                              }}
                              className={cn("cursor-pointer capitalize", client.a2p_campaign_status === status && "bg-muted")}
                            >
                              {status || 'Not submitted'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Actions: Preview + Delete */}
            {!isClientView && isAdmin && (
              <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Admin Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => enterPreviewMode(client.id)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview as Client
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Client
                  </Button>
                  <FightDisputeButton clientId={client.id} clientName={client.name} />
                </div>
              </div>
            )}

            {/* GHL Custom Field Mapping + Test Lead */}
            <GHLFieldMappingWidget
              clientId={client.id}
              locationId={(client as any).subaccount_id}
              extraHeaderActions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestLead}
                  disabled={isSendingTestLead}
                  className={cn(
                    "gap-1.5",
                    testLeadResult?.success && "border-green-500/50 text-green-600",
                    testLeadResult && !testLeadResult.success && "border-red-500/50 text-red-600"
                  )}
                  title={testLeadResult?.message || 'Send a test lead through the router'}
                >
                  {isSendingTestLead ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : testLeadResult?.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : testLeadResult ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Test Lead
                </Button>
              }
            />
          </TabsContent>

          {/* Onboarding QA Tab - Only show during onboarding */}
          {showOnboardingWidgets && (
            <TabsContent value="onboarding-qa">
              <OnboardingQATab clientId={client.id} clientName={client.name} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Chat Popup (admin only - clients use the floating ChatBubble) */}
      {!isClientView && (
        <ChatPopup
          clientId={client.id}
          clientName={client.name}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Delete Client Dialog (admin only) */}
      {!isClientView && isAdmin && (
        <DeleteClientDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          client={{
            id: client.id,
            name: client.name,
            email: client.email,
            user_id: client.user_id,
            profile_image_url: client.profile_image_url,
          }}
          onConfirm={async (deleteAuthUser) => {
            await hardDeleteClient.mutateAsync({
              clientId: client.id,
              deleteAuthUser,
              deletedBy: user?.id,
            });
            navigate('/hub/admin/clients');
          }}
          isDeleting={hardDeleteClient.isPending}
        />
      )}
    </div>
  );
}
