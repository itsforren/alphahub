import { useState } from 'react';
import { format } from 'date-fns';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  Link,
  FileCode,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebhookApiKeys, useCreateWebhookApiKey, useToggleWebhookApiKey, useDeleteWebhookApiKey, useRegenerateWebhookApiKey, WebhookApiKey } from '@/hooks/useWebhookApiKeys';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const WEBHOOKS = [
  {
    id: 'onboarding',
    name: 'Agent Onboarding Webhook',
    description: 'Creates new agent account, auth user, billing records, wallet, and triggers Google Ads campaign',
    endpoint: `${SUPABASE_URL}/functions/v1/agent-onboarding-webhook`,
    color: 'emerald',
    example: `{
  "agent_id": "AGT-12345",
  "email": "agent@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "5551234567",
  "states": "TX,CA,FL",
  "management_fee": 500,
  "ad_spend_budget": 300,
  "team": "Alpha Team"
}`,
  },
  {
    id: 'update',
    name: 'Agent Update Webhook',
    description: 'Updates existing agent with lander, scheduler, and ad links after onboarding setup is complete',
    endpoint: `${SUPABASE_URL}/functions/v1/agent-update-webhook`,
    color: 'blue',
    example: `{
  "agent_id": "AGT-12345",
  "ghl_user_id": "GHL-USER-ID-HERE",
  "subaccount_id": "abc123xyz",
  "discovery_calendar_id": "CALENDAR-ID-HERE",
  "nfia_link": "https://nfia.com/profile/agent123",
  "lander_link": "https://lander.example.com/agent123",
  "scheduler_link": "https://scheduler.example.com/agent123",
  "thankyou_link": "https://thankyou.example.com/agent123",
  "ads_link": "https://ads.google.com/account123",
  "agreement_link": "https://agreement.example.com/agent123",
  "tfwp_profile_link": "https://taxrevolt.com/agent123"
}`,
  },
  {
    id: 'leads',
    name: 'Lead Webhook',
    description: 'Receives and tracks incoming leads for agents',
    endpoint: `${SUPABASE_URL}/functions/v1/lead-webhook`,
    color: 'amber',
    example: `{
  "Lead ID": "unique_lead_id",
  "Agent ID": "AGT-12345",
  "Lead Date": "1/15/2025",
  "First Name": "John",
  "Last Name": "Doe",
  "Email": "john@example.com",
  "Phone": "1234567890",
  "State": "TX",
  "Age": "45",
  "Employment": "Employed",
  "Interest": "Tax-Free Income"
}`,
  },
  {
    id: 'lead-status',
    name: 'Lead Status Update Webhook',
    description: 'Updates lead status and premium values. Matches leads by location_id (GHL subaccount) and email.',
    endpoint: `${SUPABASE_URL}/functions/v1/lead-status-webhook`,
    color: 'purple',
    example: `{
  "location_id": "abc123xyz",
  "email": "john@example.com",
  "status": "booked call",
  "target_premium": 5000
}

Status options:
  - "booked call"
  - "submitted"
  - "approved"
  - "issued paid"

Premium Tracking:
  - submitted: Records submitted_at & submitted_premium
  - approved: Records approved_at & approved_premium
  - issued paid: Records issued_at & issued_premium`,
  },
];
export function WebhookSettingsWidget() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [keyToDelete, setKeyToDelete] = useState<WebhookApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading } = useWebhookApiKeys();
  const createKey = useCreateWebhookApiKey();
  const toggleKey = useToggleWebhookApiKey();
  const deleteKey = useDeleteWebhookApiKey();
  const regenerateKey = useRegenerateWebhookApiKey();

  const handleAddKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      await createKey.mutateAsync(newKeyName.trim());
      toast.success('API key created');
      setIsAddModalOpen(false);
      setNewKeyName('');
    } catch (error) {
      toast.error('Failed to create API key');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggle = async (key: WebhookApiKey) => {
    try {
      await toggleKey.mutateAsync({ id: key.id, is_active: !key.is_active });
      toast.success(key.is_active ? 'API key deactivated' : 'API key activated');
    } catch (error) {
      toast.error('Failed to update API key');
    }
  };

  const handleRegenerate = async (key: WebhookApiKey) => {
    try {
      await regenerateKey.mutateAsync(key.id);
      toast.success('API key regenerated');
    } catch (error) {
      toast.error('Failed to regenerate API key');
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;
    try {
      await deleteKey.mutateAsync(keyToDelete.id);
      toast.success('API key deleted');
      setKeyToDelete(null);
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  if (isLoading) {
    return (
      <div className="frosted-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="frosted-card overflow-hidden">
          {/* Header */}
          <CollapsibleTrigger asChild>
            <div className="p-4 bg-gradient-to-r from-emerald-500/20 via-emerald-600/10 to-transparent cursor-pointer hover:from-emerald-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Webhook Settings</h3>
                    <p className="text-xs text-muted-foreground">
                      {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-4 space-y-4">
              <Tabs defaultValue="endpoint">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="endpoint">
                    <Link className="w-4 h-4 mr-2" />
                    Endpoint
                  </TabsTrigger>
                  <TabsTrigger value="keys">
                    <Key className="w-4 h-4 mr-2" />
                    API Keys
                  </TabsTrigger>
                </TabsList>

                {/* Endpoint Tab */}
                <TabsContent value="endpoint" className="space-y-4 mt-4">
                  {WEBHOOKS.map((webhook) => (
                    <div key={webhook.id} className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          webhook.color === 'emerald' && 'bg-emerald-500',
                          webhook.color === 'blue' && 'bg-blue-500',
                          webhook.color === 'amber' && 'bg-amber-500',
                          webhook.color === 'purple' && 'bg-purple-500',
                        )} />
                        <span className="font-semibold text-foreground">{webhook.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{webhook.description}</p>
                      
                      <div className="space-y-1.5">
                        <Label className="text-xs">Endpoint URL</Label>
                        <div className="flex gap-2">
                          <Input value={webhook.endpoint} readOnly className="font-mono text-xs" />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(webhook.endpoint, `${webhook.name} URL`)}
                          >
                            {copiedKey === webhook.endpoint ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                            <span className="flex items-center gap-2">
                              <FileCode className="w-3 h-3" />
                              Example Payload
                            </span>
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <pre className="text-xs bg-background/50 p-3 rounded-lg overflow-x-auto mt-2">
{`POST ${webhook.endpoint}
Headers:
  Content-Type: application/json
  x-api-key: YOUR_API_KEY

Body:
${webhook.example}`}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ))}

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-400">Important</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          All webhooks require the same API key in the <code className="bg-muted px-1 rounded">x-api-key</code> header. The Agent ID must match across all webhooks.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* API Keys Tab */}
                <TabsContent value="keys" className="space-y-4 mt-4">
                  <Button
                    onClick={() => setIsAddModalOpen(true)}
                    variant="outline"
                    className="w-full border-dashed border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create API Key
                  </Button>

                  {apiKeys.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No API keys yet. Create one to start receiving leads.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className={cn(
                            'p-3 rounded-lg border transition-colors',
                            key.is_active
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-muted/30 border-border/50 opacity-60'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{key.name}</span>
                              <Badge variant={key.is_active ? 'default' : 'secondary'}>
                                {key.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <Switch
                              checked={key.is_active}
                              onCheckedChange={() => handleToggle(key)}
                            />
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              value={key.api_key}
                              readOnly
                              className="font-mono text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopy(key.api_key, 'API key')}
                            >
                              {copiedKey === key.api_key ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRegenerate(key)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setKeyToDelete(key)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Requests: {key.request_count}</span>
                            {key.last_used_at && (
                              <span>Last used: {format(new Date(key.last_used_at), 'MMM d, yyyy h:mm a')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Add Key Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Create API Key
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Webhook, GHL Integration"
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify this API key
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddKey}
              disabled={createKey.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {createKey.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!keyToDelete} onOpenChange={(open) => !open && setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete API Key
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{keyToDelete?.name}"? Any integrations using this key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
