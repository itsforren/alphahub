import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useCampaignSettings, 
  useUpdateCampaignSettings,
  CampaignSettings as CampaignSettingsType,
} from '@/hooks/useCampaignCommandCenter';
import { 
  ArrowLeft,
  Save,
  Shield,
  Zap,
  Settings,
  AlertTriangle,
  Bot,
  Bell,
  DollarSign,
  Percent,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CampaignSettings() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useCampaignSettings();
  const updateSettings = useUpdateCampaignSettings();

  // Local form state
  const [formData, setFormData] = useState<Partial<CampaignSettingsType>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = <K extends keyof CampaignSettingsType>(
    key: K,
    value: CampaignSettingsType[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      toast.success('Settings saved successfully');
      setIsDirty(false);
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/hub/admin/analytics')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Campaign Settings</h1>
            <p className="text-sm text-muted-foreground">Configure AI and automation rules</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Auto-Approve Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Auto-Approve Rules
          </CardTitle>
          <CardDescription>
            Automatically execute proposals without manual approval based on campaign status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                🟢 Green
              </Badge>
              <span className="text-sm">Auto-approve green campaign proposals</span>
            </div>
            <Switch
              checked={formData.auto_approve_green ?? false}
              onCheckedChange={(v) => handleChange('auto_approve_green', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                🟡 Yellow
              </Badge>
              <span className="text-sm">Auto-approve yellow campaign proposals</span>
            </div>
            <Switch
              checked={formData.auto_approve_yellow ?? false}
              onCheckedChange={(v) => handleChange('auto_approve_yellow', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30">
                🔴 Red
              </Badge>
              <span className="text-sm">Auto-approve red campaign proposals</span>
            </div>
            <Switch
              checked={formData.auto_approve_red ?? false}
              onCheckedChange={(v) => handleChange('auto_approve_red', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-destructive" />
              <div>
                <span className="text-sm font-medium">Safe Mode Auto-Trigger</span>
                <p className="text-xs text-muted-foreground">
                  Automatically enter safe mode when wallet balance is low
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <Switch
                checked={formData.safe_mode_auto_trigger ?? true}
                disabled
                className="opacity-70"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Thresholds Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            KPI Thresholds
          </CardTitle>
          <CardDescription>
            Define thresholds that determine campaign health status (green/yellow/red)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                CTR Red Threshold (%)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={formData.ctr_red_threshold ?? 5}
                onChange={(e) => handleChange('ctr_red_threshold', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">CTR below this triggers red status</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                CVR Red Threshold (%)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={formData.cvr_red_threshold ?? 4}
                onChange={(e) => handleChange('cvr_red_threshold', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">CVR below this triggers red status</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                No-Conv Spend Threshold ($)
              </Label>
              <Input
                type="number"
                step="1"
                value={formData.no_conv_spend_threshold ?? 60}
                onChange={(e) => handleChange('no_conv_spend_threshold', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Daily spend without conversions triggers alert</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Not-Spending Budget Threshold ($)
              </Label>
              <Input
                type="number"
                step="1"
                value={formData.not_spending_budget_threshold ?? 30}
                onChange={(e) => handleChange('not_spending_budget_threshold', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Budget above this with low spend triggers alert</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Not-Spending Spend Threshold ($)
              </Label>
              <Input
                type="number"
                step="1"
                value={formData.not_spending_spend_threshold ?? 5}
                onChange={(e) => handleChange('not_spending_spend_threshold', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Spend below this triggers "not spending" alert</p>
            </div>

            <div className="space-y-2">
              <Label>Clicks No-Conv Threshold</Label>
              <Input
                type="number"
                step="1"
                value={formData.clicks_no_conv_threshold ?? 50}
                onChange={(e) => handleChange('clicks_no_conv_threshold', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Clicks without conversions triggers alert</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                CPL Yellow Threshold ($)
              </Label>
              <Input
                type="number"
                step="1"
                value={formData.cpl_yellow_threshold ?? 50}
                onChange={(e) => handleChange('cpl_yellow_threshold', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">CPL above this triggers yellow status</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Max Budget Change (%)
              </Label>
              <Input
                type="number"
                step="1"
                value={formData.max_budget_change_pct ?? 20}
                onChange={(e) => handleChange('max_budget_change_pct', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Maximum allowed budget change per proposal</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Target Spend (%)
              </Label>
              <Input
                type="number"
                step="1"
                value={formData.target_spend_pct ?? 95}
                onChange={(e) => handleChange('target_spend_pct', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Target budget utilization percentage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Provider Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI Provider
          </CardTitle>
          <CardDescription>
            Choose the AI provider for campaign analysis and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={formData.ai_provider ?? 'lovable_llm'}
              onValueChange={(v) => handleChange('ai_provider', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable_llm">Lovable AI (Recommended)</SelectItem>
                <SelectItem value="custom">Custom Server</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.ai_provider === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Server URL</Label>
              <Input
                placeholder="https://your-ai-server.com/analyze"
                value={formData.custom_ai_server_url ?? ''}
                onChange={(e) => handleChange('custom_ai_server_url', e.target.value || null)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how and when you receive campaign notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Slack Webhook URL</Label>
            <Input
              placeholder="https://hooks.slack.com/services/..."
              value={formData.slack_webhook_url ?? ''}
              onChange={(e) => handleChange('slack_webhook_url', e.target.value || null)}
            />
            <p className="text-xs text-muted-foreground">Optional: Receive notifications in Slack</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reminder Quiet Hours Start</Label>
              <Select
                value={String(formData.reminder_quiet_hours_start ?? 22)}
                onValueChange={(v) => handleChange('reminder_quiet_hours_start', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reminder Quiet Hours End</Label>
              <Select
                value={String(formData.reminder_quiet_hours_end ?? 8)}
                onValueChange={(v) => handleChange('reminder_quiet_hours_end', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            No reminders will be sent during quiet hours (Eastern time)
          </p>
        </CardContent>
      </Card>

      {/* Policy Version */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            System Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Policy Version</span>
            <Badge variant="outline">{settings?.policy_version || 'v1.0'}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
