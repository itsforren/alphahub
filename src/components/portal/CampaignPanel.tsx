import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, ChevronDown, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditBudgetDialog } from '@/components/portal/EditBudgetDialog';
import { StateSelector } from '@/components/portal/StateSelector';
import { GoogleAdsSyncButton } from '@/components/portal/GoogleAdsSyncButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  client_id: string;
  google_customer_id: string;
  google_campaign_id: string;
  label: string | null;
  states: string | null;
  is_primary: boolean | null;
  current_daily_budget: number | null;
  status: string | null;
  created_at: string;
}

interface CampaignPanelProps {
  clientId: string;
  campaigns: Campaign[];
  trackingStartDate?: string | null;
  onRefresh: () => void;
  onUpdateStates: (states: string) => Promise<void>;
}

export function CampaignPanel({
  clientId,
  campaigns,
  trackingStartDate,
  onRefresh,
  onUpdateStates,
}: CampaignPanelProps) {
  const queryClient = useQueryClient();
  const [isBuilding, setIsBuilding] = useState(false);
  const [rebuildingCampaignId, setRebuildingCampaignId] = useState<string | null>(null);
  const [manualCampaignId, setManualCampaignId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [googleAdsLinkParams, setGoogleAdsLinkParams] = useState('');

  // Fetch Google Ads link params setting once
  useEffect(() => {
    supabase
      .from('onboarding_settings')
      .select('setting_value')
      .eq('setting_key', 'google_ads_link_params')
      .single()
      .then(({ data }) => {
        if (data?.setting_value) {
          setGoogleAdsLinkParams(data.setting_value);
        }
      });
  }, []);

  const buildGoogleAdsUrl = (campaignId: string) => {
    if (googleAdsLinkParams) {
      return `https://ads.google.com/aw/campaigns?${googleAdsLinkParams}&campaignId=${campaignId}`;
    }
    return `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`;
  };

  const handleBuildCampaign = async (templateType: 'primary' | 'secondary') => {
    setIsBuilding(true);
    try {
      // Get client info for campaign creation
      const { data: client } = await supabase
        .from('clients')
        .select('name, agent_id, states, ad_spend_budget, lander_link')
        .eq('id', clientId)
        .single();

      if (!client) throw new Error('Client not found');

      // Use primary campaign's states if available, otherwise fall back to client states
      const primaryCampaign = campaigns.find(c => c.is_primary);
      const statesToUse = primaryCampaign?.states || client.states;

      const { data, error } = await supabase.functions.invoke('create-google-ads-campaign', {
        body: {
          clientId,
          agentName: client.name,
          agentId: client.agent_id,
          states: statesToUse,
          budget: client.ad_spend_budget,
          landingPage: client.lander_link,
          templateType,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create campaign');

      toast.success(`${templateType === 'secondary' ? 'Secondary' : 'Standard'} campaign created`, {
        description: `Campaign ID: ${data.campaignId}`,
      });

      queryClient.invalidateQueries({ queryKey: ['campaigns', clientId] });
      onRefresh();
    } catch (error) {
      console.error('Error building campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to build campaign');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleRebuildAds = async (campaign: Campaign) => {
    setRebuildingCampaignId(campaign.id);
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('name, agent_id, lander_link')
        .eq('id', clientId)
        .single();

      if (!client) throw new Error('Client not found');

      const { data, error } = await supabase.functions.invoke('create-google-ads-campaign', {
        body: {
          clientId,
          agentName: client.name,
          agentId: client.agent_id,
          landingPage: client.lander_link,
          retryStep: 'adgroup',
          targetCampaignId: campaign.google_campaign_id,
          targetCustomerId: campaign.google_customer_id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to rebuild ads');

      toast.success('Ad groups and ads rebuilt', {
        description: `${campaign.label}: ad groups=${data.adGroupCreated}, ads=${data.adCreated}`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error rebuilding ads:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to rebuild ads');
    } finally {
      setRebuildingCampaignId(null);
    }
  };

  const handleSaveManualCampaign = async () => {
    if (!manualCampaignId.trim()) {
      toast.error('Please enter a campaign ID');
      return;
    }

    setIsSavingManual(true);
    try {
      // Parse the campaign ID — expect "customerId:campaignId" or just "campaignId"
      let googleCustomerId: string;
      let googleCampaignId: string;

      if (manualCampaignId.includes(':')) {
        const [cust, camp] = manualCampaignId.split(':');
        googleCustomerId = cust.replace(/\D/g, '');
        googleCampaignId = camp.replace(/\D/g, '');
      } else {
        // Default customer ID
        googleCustomerId = '6551751244';
        googleCampaignId = manualCampaignId.replace(/\D/g, '');
      }

      const label = campaigns.length === 0 ? 'Campaign 1' : `Campaign ${campaigns.length + 1}`;

      const { error } = await supabase
        .from('campaigns')
        .upsert({
          client_id: clientId,
          google_customer_id: googleCustomerId,
          google_campaign_id: googleCampaignId,
          is_primary: campaigns.length === 0,
          label,
        }, {
          onConflict: 'google_customer_id,google_campaign_id',
        });

      if (error) throw error;

      toast.success(`Campaign added: ${label}`);
      setManualCampaignId('');
      setShowManualInput(false);
      queryClient.invalidateQueries({ queryKey: ['campaigns', clientId] });
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save campaign');
    } finally {
      setIsSavingManual(false);
    }
  };

  const statusColor = (status: string | null) => {
    if (status === 'green') return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (status === 'yellow') return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    if (status === 'red') return 'bg-red-500/10 text-red-600 border-red-500/20';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="border-border/50">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <a
                  href={buildGoogleAdsUrl(campaign.google_campaign_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                >
                  {campaign.label || 'Campaign'}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
                {campaign.is_primary && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Primary</Badge>
                )}
                {campaign.status && (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(campaign.status)}`}>
                    {campaign.status}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium">
                  {campaign.current_daily_budget ? `$${campaign.current_daily_budget}` : '—'}
                </span>
                <EditBudgetDialog
                  clientId={clientId}
                  currentBudget={campaign.current_daily_budget}
                  googleCampaignId={`${campaign.google_customer_id}:${campaign.google_campaign_id}`}
                  campaignRowId={campaign.id}
                  campaignLabel={campaign.label || undefined}
                  onSuccess={onRefresh}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">States:</span>
                <StateSelector
                  value={campaign.states}
                  clientId={clientId}
                  googleCampaignId={`${campaign.google_customer_id}:${campaign.google_campaign_id}`}
                  campaignRowId={campaign.id}
                  onSave={async (states) => {
                    // Update the campaign's states in campaigns table
                    await supabase
                      .from('campaigns')
                      .update({ states })
                      .eq('id', campaign.id);
                    queryClient.invalidateQueries({ queryKey: ['campaigns', clientId] });
                    await onUpdateStates(states);
                  }}
                />
              </div>

              <GoogleAdsSyncButton
                clientId={clientId}
                googleCampaignId={`${campaign.google_customer_id}:${campaign.google_campaign_id}`}
                trackingStartDate={trackingStartDate}
                campaignRowId={campaign.id}
                onSyncComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ['campaigns', clientId] });
                  onRefresh();
                }}
              />

              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleRebuildAds(campaign)}
                disabled={rebuildingCampaignId === campaign.id}
                title="Rebuild ad groups and ads from template"
              >
                {rebuildingCampaignId === campaign.id ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Rebuild Ads
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Build/Add Campaign Button — only show if < 2 campaigns */}
      {campaigns.length < 2 && (
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isBuilding} className="gap-2">
                {isBuilding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Build Campaign
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBuildCampaign('primary')}>
                Original (Standard Template)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBuildCampaign('secondary')}>
                Revamp (Secondary Template)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowManualInput(!showManualInput)}
          >
            or add existing
          </Button>

          {showManualInput && (
            <div className="flex items-center gap-2">
              <Input
                value={manualCampaignId}
                onChange={(e) => setManualCampaignId(e.target.value)}
                placeholder="customerId:campaignId"
                className="h-8 w-[220px] text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveManualCampaign}
                disabled={isSavingManual}
                className="h-8"
              >
                {isSavingManual ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
