import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

interface MetaAdsConfig {
  access_token: string;
  ad_account_id: string;
  campaign_ids: string[];
}

export default function InternalMarketingSettingsWidget() {
  const queryClient = useQueryClient();
  const [googleCampaignId, setGoogleCampaignId] = useState('');
  const [metaConfig, setMetaConfig] = useState<MetaAdsConfig>({
    access_token: '',
    ad_account_id: '',
    campaign_ids: [],
  });
  const [newCampaignId, setNewCampaignId] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['internal-marketing-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_marketing_settings')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const googleSetting = settings.find(s => s.setting_key === 'google_ads_internal_campaign_id');
      const metaSetting = settings.find(s => s.setting_key === 'meta_ads_config');
      
      if (googleSetting?.setting_value) {
        const value = typeof googleSetting.setting_value === 'string' 
          ? googleSetting.setting_value.replace(/"/g, '')
          : googleSetting.setting_value;
        setGoogleCampaignId(value as string);
      }
      
      if (metaSetting?.setting_value && typeof metaSetting.setting_value === 'object') {
        const val = metaSetting.setting_value as Record<string, unknown>;
        setMetaConfig({
          access_token: (val.access_token as string) || '',
          ad_account_id: (val.ad_account_id as string) || '',
          campaign_ids: (val.campaign_ids as string[]) || [],
        });
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save Google Ads campaign ID using upsert
      await supabase
        .from('internal_marketing_settings')
        .upsert({
          setting_key: 'google_ads_internal_campaign_id',
          setting_value: JSON.stringify(googleCampaignId),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });

      // Save Meta Ads config using upsert
      await supabase
        .from('internal_marketing_settings')
        .upsert({
          setting_key: 'meta_ads_config',
          setting_value: metaConfig as unknown as Json,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-marketing-settings'] });
      toast.success('Internal marketing settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error(error);
    },
  });

  const addCampaignId = () => {
    if (newCampaignId && !metaConfig.campaign_ids.includes(newCampaignId)) {
      setMetaConfig({
        ...metaConfig,
        campaign_ids: [...metaConfig.campaign_ids, newCampaignId],
      });
      setNewCampaignId('');
    }
  };

  const removeCampaignId = (id: string) => {
    setMetaConfig({
      ...metaConfig,
      campaign_ids: metaConfig.campaign_ids.filter(c => c !== id),
    });
  };

  const isGoogleConfigured = !!googleCampaignId;
  const isMetaConfigured = !!(metaConfig.access_token && metaConfig.ad_account_id);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Internal Marketing Tracking
          {isGoogleConfigured && isMetaConfigured && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Configured
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your internal Google Ads and Meta Ads campaigns to track customer acquisition costs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Ads Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              Google Ads
              {isGoogleConfigured ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning" />
              )}
            </h4>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="google-campaign-id">Internal Acquisition Campaign ID</Label>
            <Input
              id="google-campaign-id"
              placeholder="e.g., 12345678901"
              value={googleCampaignId}
              onChange={(e) => setGoogleCampaignId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the Google Ads campaign ID used for Alpha Agent customer acquisition
            </p>
          </div>
        </div>

        {/* Meta Ads Section */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              Meta Ads
              {isMetaConfigured ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning" />
              )}
            </h4>
            <a 
              href="https://developers.facebook.com/tools/accesstoken/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Get Access Token <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meta-access-token">Access Token</Label>
            <Input
              id="meta-access-token"
              type="password"
              placeholder="Enter your Meta access token"
              value={metaConfig.access_token}
              onChange={(e) => setMetaConfig({ ...metaConfig, access_token: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-ad-account">Ad Account ID</Label>
            <Input
              id="meta-ad-account"
              placeholder="e.g., act_123456789"
              value={metaConfig.ad_account_id}
              onChange={(e) => setMetaConfig({ ...metaConfig, ad_account_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Campaign IDs</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add campaign ID"
                value={newCampaignId}
                onChange={(e) => setNewCampaignId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCampaignId()}
              />
              <Button variant="outline" onClick={addCampaignId}>Add</Button>
            </div>
            {metaConfig.campaign_ids.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {metaConfig.campaign_ids.map(id => (
                  <Badge 
                    key={id} 
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => removeCampaignId(id)}
                  >
                    {id} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
