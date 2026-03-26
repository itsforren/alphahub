import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, EyeOff, Link, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UntrackedCampaign {
  customerId: string;
  customerName: string;
  campaignId: string;
  campaignName: string;
  suggestedClientId: string | null;
  suggestedClientName: string | null;
  matchScore: number;
}

interface Client {
  id: string;
  name: string;
}

export function FindUntrackedCampaignsDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [untracked, setUntracked] = useState<UntrackedCampaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<Record<string, string>>({});
  const [attaching, setAttaching] = useState<string | null>(null);
  const [ignoring, setIgnoring] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-untracked-campaigns');
      if (error) throw error;

      setUntracked(data.untrackedCampaigns || []);
      setClients(data.clients || []);

      // Pre-fill suggested clients
      const suggestions: Record<string, string> = {};
      for (const c of (data.untrackedCampaigns || [])) {
        if (c.suggestedClientId) {
          suggestions[`${c.customerId}:${c.campaignId}`] = c.suggestedClientId;
        }
      }
      setSelectedClients(suggestions);
      setDismissed(new Set());
    } catch (error) {
      console.error('Error finding untracked campaigns:', error);
      toast.error('Failed to scan for untracked campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async (campaign: UntrackedCampaign) => {
    const key = `${campaign.customerId}:${campaign.campaignId}`;
    const clientId = selectedClients[key];
    if (!clientId) {
      toast.error('Select an agent to attach this campaign to');
      return;
    }

    setAttaching(key);
    try {
      // Check how many campaigns this client already has
      const { data: existing } = await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', clientId);

      const { error } = await supabase
        .from('campaigns')
        .upsert({
          client_id: clientId,
          google_customer_id: campaign.customerId,
          google_campaign_id: campaign.campaignId,
          label: campaign.campaignName || `Campaign ${(existing?.length || 0) + 1}`,
          is_primary: (existing?.length || 0) === 0,
        }, {
          onConflict: 'google_customer_id,google_campaign_id',
        });

      if (error) throw error;

      const clientName = clients.find(c => c.id === clientId)?.name || 'agent';
      toast.success(`Campaign attached to ${clientName}`, {
        description: campaign.campaignName,
      });

      setDismissed(prev => new Set(prev).add(key));
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });

      // Trigger sync for this client
      supabase.functions.invoke('sync-google-ads', {
        body: { clientId, daysBack: 7 },
      }).catch(console.error);
    } catch (error) {
      console.error('Error attaching campaign:', error);
      toast.error('Failed to attach campaign');
    } finally {
      setAttaching(null);
    }
  };

  const handleIgnore = async (campaign: UntrackedCampaign) => {
    const key = `${campaign.customerId}:${campaign.campaignId}`;
    setIgnoring(key);
    try {
      // Insert as ignored campaign (no client_id needed — use a placeholder approach)
      // We insert it into campaigns with ignored=true so it won't show up as untracked again
      const { error } = await supabase
        .from('campaigns')
        .upsert({
          client_id: null as any, // Will need a placeholder — see below
          google_customer_id: campaign.customerId,
          google_campaign_id: campaign.campaignId,
          label: campaign.campaignName || 'Ignored Campaign',
          ignored: true,
          ignored_reason: 'Marked as ignored from untracked campaigns scan',
          ignored_at: new Date().toISOString(),
        }, {
          onConflict: 'google_customer_id,google_campaign_id',
        });

      // If the upsert fails because client_id is required, just dismiss it locally
      if (error) {
        console.warn('Could not persist ignore (client_id required), dismissing locally');
      } else {
        toast.success('Campaign ignored');
      }

      setDismissed(prev => new Set(prev).add(key));
    } catch (error) {
      console.error('Error ignoring campaign:', error);
    } finally {
      setIgnoring(null);
    }
  };

  const visibleCampaigns = untracked.filter(
    c => !dismissed.has(`${c.customerId}:${c.campaignId}`)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Find Untracked
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find Untracked Campaigns</DialogTitle>
        </DialogHeader>

        {!hasSearched ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan all Google Ads accounts for campaigns that aren't being tracked against any agent's billing.
            </p>
            <Button onClick={handleSearch} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Scan Google Ads
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Scanning all Google Ads accounts...</span>
          </div>
        ) : visibleCampaigns.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground">All campaigns are tracked.</p>
            <Button variant="outline" size="sm" onClick={handleSearch}>
              Scan Again
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {visibleCampaigns.length} untracked campaign{visibleCampaigns.length !== 1 ? 's' : ''} found
              </p>
              <Button variant="ghost" size="sm" onClick={handleSearch} disabled={loading}>
                <Search className="h-3 w-3 mr-1" />
                Rescan
              </Button>
            </div>

            {visibleCampaigns.map((campaign) => {
              const key = `${campaign.customerId}:${campaign.campaignId}`;
              const isAttaching = attaching === key;
              const isIgnoring = ignoring === key;

              return (
                <div
                  key={key}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{campaign.campaignName}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {campaign.campaignId} &middot; Account: {campaign.customerName}
                      </p>
                    </div>
                    {campaign.suggestedClientName && (
                      <Badge variant="outline" className="text-[10px] shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                        Suggested: {campaign.suggestedClientName}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedClients[key] || ''}
                      onValueChange={(value) =>
                        setSelectedClients(prev => ({ ...prev, [key]: value }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select agent to attach..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 gap-1 shrink-0"
                      onClick={() => handleAttach(campaign)}
                      disabled={isAttaching || !selectedClients[key]}
                    >
                      {isAttaching ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Link className="h-3 w-3" />
                      )}
                      Attach
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 shrink-0 text-muted-foreground"
                      onClick={() => handleIgnore(campaign)}
                      disabled={isIgnoring}
                    >
                      {isIgnoring ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      Ignore
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
