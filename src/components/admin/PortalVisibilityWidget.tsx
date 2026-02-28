import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Loader2, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePortalSettings, useUpdatePortalSettings, PortalVisibilitySettings } from '@/hooks/usePortalSettings';
import { Skeleton } from '@/components/ui/skeleton';

interface VisibilityOption {
  key: keyof PortalVisibilitySettings;
  label: string;
  description: string;
}

const visibilityOptions: VisibilityOption[] = [
  {
    key: 'agent_portal_show_billing',
    label: 'Billing Section',
    description: 'Show billing history, invoices, and payment information'
  },
  {
    key: 'agent_portal_show_wallet',
    label: 'Ad Spend Wallet',
    description: 'Show wallet balance and ad spend tracking'
  },
  {
    key: 'agent_portal_show_performance_metrics',
    label: 'Performance Metrics',
    description: 'Show CPL, CPA, CTR, and other performance stats'
  },
  {
    key: 'agent_portal_show_leads',
    label: 'Leads Section',
    description: 'Show lead list and lead metrics'
  },
  {
    key: 'agent_portal_show_referrals',
    label: 'Referrals Section',
    description: 'Show referral program and rewards'
  }
];

export function PortalVisibilityWidget() {
  const { data: settings, isLoading } = usePortalSettings();
  const updateSettings = useUpdatePortalSettings();
  
  const [formData, setFormData] = useState<PortalVisibilitySettings>({
    agent_portal_show_billing: true,
    agent_portal_show_wallet: true,
    agent_portal_show_performance_metrics: true,
    agent_portal_show_referrals: true,
    agent_portal_show_leads: true
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const handleToggle = (key: keyof PortalVisibilitySettings) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(formData);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Agent Portal Visibility
        </CardTitle>
        <CardDescription>
          Control which sections agents can see in their portal. Hidden sections will not appear in navigation or profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {visibilityOptions.map(option => (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {formData[option.key] ? (
                  <Eye className="w-5 h-5 text-primary mt-0.5" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground mt-0.5" />
                )}
                <div>
                  <Label htmlFor={option.key} className="text-sm font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </div>
              <Switch
                id={option.key}
                checked={formData[option.key]}
                onCheckedChange={() => handleToggle(option.key)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
