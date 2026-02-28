import { useState, useMemo } from 'react';
import { Copy, Link2, Check, Facebook, Youtube, Globe, Share2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const PRODUCTION_DOMAIN = 'https://alphaagent.io';

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook Ads', icon: Facebook, color: 'text-blue-600' },
  { id: 'youtube', name: 'YouTube Ads', icon: Youtube, color: 'text-red-600' },
  { id: 'google', name: 'Google Ads', icon: Globe, color: 'text-green-600' },
  { id: 'email', name: 'Email Marketing', icon: Mail, color: 'text-orange-600' },
  { id: 'referral', name: 'Referral Link', icon: Share2, color: 'text-purple-600' },
];

export function UTMBuilder() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    baseUrl: `${PRODUCTION_DOMAIN}/`,
    platform: 'facebook',
    campaign: '',
    adName: '',
    audience: '',
    referrer: '',
  });

  const generatedURL = useMemo(() => {
    try {
      const baseUrl = formData.baseUrl.trim() || `${PRODUCTION_DOMAIN}/`;
      const url = new URL(baseUrl);
      
      // Set source based on platform
      const sourceMap: Record<string, string> = {
        facebook: 'facebook',
        youtube: 'youtube',
        google: 'google',
        email: 'email',
        referral: 'referral',
      };
      
      const mediumMap: Record<string, string> = {
        facebook: 'paid_social',
        youtube: 'paid_video',
        google: 'cpc',
        email: 'email',
        referral: 'referral',
      };

      url.searchParams.set('utm_source', sourceMap[formData.platform] || formData.platform);
      url.searchParams.set('utm_medium', mediumMap[formData.platform] || 'referral');
      
      if (formData.campaign.trim()) {
        url.searchParams.set('utm_campaign', formData.campaign.trim().toLowerCase().replace(/\s+/g, '_'));
      }
      
      if (formData.adName.trim()) {
        url.searchParams.set('utm_content', formData.adName.trim().toLowerCase().replace(/\s+/g, '_'));
      }
      
      if (formData.audience.trim()) {
        url.searchParams.set('utm_term', formData.audience.trim().toLowerCase().replace(/\s+/g, '_'));
      }

      if (formData.platform === 'referral' && formData.referrer.trim()) {
        url.searchParams.set('ref', formData.referrer.trim());
      }

      return url.toString();
    } catch {
      return formData.baseUrl || `${PRODUCTION_DOMAIN}/`;
    }
  }, [formData]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedURL);
    setCopied(true);
    toast.success('URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 className="w-4 h-4 mr-2" />
          Create Tracking Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Tracking URL</DialogTitle>
          <DialogDescription>
            Generate a properly formatted URL with UTM parameters for attribution tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Base URL */}
          <div className="space-y-2">
            <Label>Landing Page URL</Label>
            <Input
              placeholder="https://yoursite.com/landing-page"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            />
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <div className="grid grid-cols-4 gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setFormData({ ...formData, platform: platform.id })}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.platform === platform.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <platform.icon className={`w-5 h-5 ${platform.color}`} />
                  <span className="text-xs font-medium">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campaign Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g., june_2024_promo"
                value={formData.campaign}
                onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Maps to utm_campaign</p>
            </div>

            <div className="space-y-2">
              <Label>Ad Creative / Variant</Label>
              <Input
                placeholder="e.g., video_testimonial_v2"
                value={formData.adName}
                onChange={(e) => setFormData({ ...formData, adName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Maps to utm_content</p>
            </div>

            <div className="space-y-2">
              <Label>Audience / Targeting</Label>
              <Input
                placeholder="e.g., lookalike_buyers_1pct"
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Maps to utm_term</p>
            </div>

            {formData.platform === 'referral' && (
              <div className="space-y-2">
                <Label>Referrer ID</Label>
                <Input
                  placeholder="e.g., john_smith"
                  value={formData.referrer}
                  onChange={(e) => setFormData({ ...formData, referrer: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Maps to ref parameter</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Generated URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={generatedURL}
                className="font-mono text-sm bg-muted"
              />
              <Button onClick={copyToClipboard} variant="outline" className="shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Platform-specific instructions */}
          <Tabs defaultValue="facebook" value={formData.platform}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="youtube">YouTube</TabsTrigger>
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="referral">Referral</TabsTrigger>
            </TabsList>
            
            <TabsContent value="facebook" className="mt-4">
              <Card>
                <CardContent className="pt-4 text-sm space-y-2">
                  <p className="font-medium">How to add in Facebook Ads Manager:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to your ad set → Edit</li>
                    <li>Scroll to "Tracking" section</li>
                    <li>Add "URL Parameters" field</li>
                    <li>Paste everything after the "?" from the generated URL</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Facebook will automatically append <code className="bg-muted px-1 rounded">fbclid</code> - we capture that too!
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="youtube" className="mt-4">
              <Card>
                <CardContent className="pt-4 text-sm space-y-2">
                  <p className="font-medium">How to add in Google Ads (YouTube):</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to your campaign → Settings</li>
                    <li>Expand "Additional Settings"</li>
                    <li>Find "Campaign URL Options"</li>
                    <li>Use the full generated URL as your Final URL</li>
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="google" className="mt-4">
              <Card>
                <CardContent className="pt-4 text-sm space-y-2">
                  <p className="font-medium">How to add in Google Ads:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to your ad → Edit</li>
                    <li>Use the full generated URL as your Final URL</li>
                    <li>Or add to Tracking Template at account level</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Google will automatically append <code className="bg-muted px-1 rounded">gclid</code> - we capture that too!
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="mt-4">
              <Card>
                <CardContent className="pt-4 text-sm space-y-2">
                  <p className="font-medium">How to use in email campaigns:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Copy the full generated URL</li>
                    <li>Use it as the href for any CTA buttons or links</li>
                    <li>Use unique campaign names per email blast</li>
                    <li>Add UTMs <strong>before</strong> shortening links</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Works with Mailchimp, ActiveCampaign, cold email tools, etc.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="referral" className="mt-4">
              <Card>
                <CardContent className="pt-4 text-sm space-y-2">
                  <p className="font-medium">How to share referral links:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Copy the full generated URL</li>
                    <li>Share with your referral partner</li>
                    <li>They can use it in emails, social posts, or their website</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    The <code className="bg-muted px-1 rounded">ref</code> parameter identifies the referrer for commission tracking.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
