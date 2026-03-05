import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Settings2, Info, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OnboardingSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
}

export function OnboardingSettingsWidget() {
  const [settings, setSettings] = useState<Record<string, OnboardingSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local form state
  const [templateCampaignId, setTemplateCampaignId] = useState('');
  const [landingPageBaseUrl, setLandingPageBaseUrl] = useState('');
  const [urlParamsFormat, setUrlParamsFormat] = useState('');
  const [defaultCustomerId, setDefaultCustomerId] = useState('');
  const [autoCreateCampaigns, setAutoCreateCampaigns] = useState(true);
  const [secondaryTemplateCampaignId, setSecondaryTemplateCampaignId] = useState('');
  const [googleAdsLinkParams, setGoogleAdsLinkParams] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('onboarding_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: Record<string, OnboardingSetting> = {};
      data?.forEach(s => {
        settingsMap[s.setting_key] = s;
      });

      setSettings(settingsMap);

      // Set form values
      setTemplateCampaignId(settingsMap['template_campaign_id']?.setting_value || '');
      setLandingPageBaseUrl(settingsMap['landing_page_base_url']?.setting_value || '');
      setUrlParamsFormat(settingsMap['url_params_format']?.setting_value || '');
      setDefaultCustomerId(settingsMap['default_customer_id']?.setting_value || '');
      setAutoCreateCampaigns(settingsMap['auto_create_campaigns']?.setting_value === 'true');
      setSecondaryTemplateCampaignId(settingsMap['template_campaign_id_secondary']?.setting_value || '');
      setGoogleAdsLinkParams(settingsMap['google_ads_link_params']?.setting_value || '');
    } catch (error) {
      console.error('Error fetching onboarding settings:', error);
      toast.error('Failed to load onboarding settings');
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(setter: (val: string) => void, value: string) {
    setter(value);
    setHasChanges(true);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const updates = [
        { key: 'template_campaign_id', value: templateCampaignId },
        { key: 'landing_page_base_url', value: landingPageBaseUrl },
        { key: 'url_params_format', value: urlParamsFormat },
        { key: 'default_customer_id', value: defaultCustomerId },
        { key: 'auto_create_campaigns', value: autoCreateCampaigns ? 'true' : 'false' },
        { key: 'template_campaign_id_secondary', value: secondaryTemplateCampaignId },
        { key: 'google_ads_link_params', value: googleAdsLinkParams },
      ];

      for (const { key, value } of updates) {
        const { error } = await supabase
          .from('onboarding_settings')
          .update({ setting_value: value })
          .eq('setting_key', key);

        if (error) throw error;
      }

      toast.success('Onboarding settings saved');
      setHasChanges(false);
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  // Generate preview URL
  const previewUrl = `${landingPageBaseUrl}john-doe?${urlParamsFormat.replace('{agent_id}', 'EXAMPLE_AGENT_ID')}`;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Campaign Auto-Creation Settings</CardTitle>
              <CardDescription>
                Configure how Google Ads campaigns are created for new clients
              </CardDescription>
            </div>
          </div>
          {hasChanges && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Unsaved changes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-create toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Auto-create campaigns on onboarding</Label>
            <p className="text-sm text-muted-foreground">
              Automatically create a Google Ads campaign when a new client is onboarded
            </p>
          </div>
          <Switch
            checked={autoCreateCampaigns}
            onCheckedChange={(checked) => {
              setAutoCreateCampaigns(checked);
              setHasChanges(true);
            }}
          />
        </div>

        {/* Template Campaign ID */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="templateCampaignId">Template Campaign ID</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    The Google Ads campaign ID to copy as a template. Format: customerId:campaignId
                    (e.g., 6551751244:21234567890)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="templateCampaignId"
            placeholder="6551751244:21234567890"
            value={templateCampaignId}
            onChange={(e) => handleFieldChange(setTemplateCampaignId, e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Format: customerId:campaignId — Find this in your Google Ads account
          </p>
        </div>

        {/* Secondary Template Campaign ID */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="secondaryTemplateCampaignId">Secondary Template Campaign ID</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Optional secondary campaign template (e.g., revamped campaign with different ads/sitelinks).
                    Used when building a second campaign for a client.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="secondaryTemplateCampaignId"
            placeholder="6551751244:21234567890"
            value={secondaryTemplateCampaignId}
            onChange={(e) => handleFieldChange(setSecondaryTemplateCampaignId, e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional — for dual-campaign clients. Leave blank if using single campaigns only.
          </p>
        </div>

        {/* Google Ads Link Params */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="googleAdsLinkParams">Google Ads Link Params</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Extra URL params for campaign links so they open directly without login prompts.
                    Copy from a working Google Ads URL — everything between ? and &campaignId.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="googleAdsLinkParams"
            placeholder="ocid=123&euid=456&__u=789&uscid=123&__c=321&authuser=0&ascid=123"
            value={googleAdsLinkParams}
            onChange={(e) => handleFieldChange(setGoogleAdsLinkParams, e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Paste the query params from a working Google Ads URL (without campaignId). This avoids login prompts.
          </p>
        </div>

        {/* Default Customer ID */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="defaultCustomerId">Default Google Ads Customer ID</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    The Google Ads customer/account ID where campaigns will be created.
                    Usually your MCC account ID.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="defaultCustomerId"
            placeholder="6551751244"
            value={defaultCustomerId}
            onChange={(e) => handleFieldChange(setDefaultCustomerId, e.target.value)}
          />
        </div>

        {/* Landing Page Base URL */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="landingPageBaseUrl">Landing Page Base URL</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    The base URL for landing pages. The agent's name (slugified) will be appended.
                    Example: https://www.taxfreewealthplan.com/discover/discover-our-wealth-secrets-
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="landingPageBaseUrl"
            placeholder="https://www.taxfreewealthplan.com/discover/discover-our-wealth-secrets-"
            value={landingPageBaseUrl}
            onChange={(e) => handleFieldChange(setLandingPageBaseUrl, e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Agent name will be appended (e.g., "joshua-harris")
          </p>
        </div>

        {/* URL Parameters Format */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="urlParamsFormat">URL Parameters Format</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Query parameters to add to the landing page URL.
                    Use {'{agent_id}'} as a placeholder for the actual agent ID.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="urlParamsFormat"
            placeholder="agent_id={agent_id}"
            value={urlParamsFormat}
            onChange={(e) => handleFieldChange(setUrlParamsFormat, e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {'{agent_id}'} will be replaced with the actual agent ID
          </p>
        </div>

        {/* Preview */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <Label className="text-sm font-medium">Preview URL</Label>
          <p className="text-xs text-muted-foreground break-all font-mono">
            {previewUrl}
          </p>
        </div>

        {/* Status indicators */}
        <div className="rounded-lg border p-4 space-y-3">
          <Label className="text-sm font-medium">Configuration Status</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {templateCampaignId ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-amber-500" />
              )}
              <span className={templateCampaignId ? 'text-foreground' : 'text-muted-foreground'}>
                Template Campaign ID configured
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {defaultCustomerId ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-amber-500" />
              )}
              <span className={defaultCustomerId ? 'text-foreground' : 'text-muted-foreground'}>
                Default Customer ID configured
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {landingPageBaseUrl ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-amber-500" />
              )}
              <span className={landingPageBaseUrl ? 'text-foreground' : 'text-muted-foreground'}>
                Landing Page URL configured
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
