import { useState, useEffect } from 'react';
import { Clock, MessageCircle, Ticket, DollarSign, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  useChatSLASettings,
  useTicketSLASettings,
  useCollectionsSettings,
  useUpdateSLASettings,
  type ChatSLASettings,
  type TicketSLASettings,
  type CollectionsSettings,
} from '@/hooks/useSLASettings';
import { Skeleton } from '@/components/ui/skeleton';

export function SLASettingsWidget() {
  const { data: chatSLA, isLoading: loadingChat } = useChatSLASettings();
  const { data: ticketSLA, isLoading: loadingTicket } = useTicketSLASettings();
  const { data: collections, isLoading: loadingCollections } = useCollectionsSettings();
  const updateSettings = useUpdateSLASettings();

  const [chatSettings, setChatSettings] = useState<ChatSLASettings | null>(null);
  const [ticketSettings, setTicketSettings] = useState<TicketSLASettings | null>(null);
  const [collectionsSettings, setCollectionsSettings] = useState<CollectionsSettings | null>(null);

  useEffect(() => {
    if (chatSLA) setChatSettings(chatSLA);
  }, [chatSLA]);

  useEffect(() => {
    if (ticketSLA) setTicketSettings(ticketSLA);
  }, [ticketSLA]);

  useEffect(() => {
    if (collections) setCollectionsSettings(collections);
  }, [collections]);

  const handleSave = async () => {
    try {
      if (chatSettings) {
        await updateSettings.mutateAsync({ key: 'chat_sla', value: chatSettings });
      }
      if (ticketSettings) {
        await updateSettings.mutateAsync({ key: 'ticket_sla', value: ticketSettings });
      }
      if (collectionsSettings) {
        await updateSettings.mutateAsync({ key: 'collections', value: collectionsSettings });
      }
      toast.success('SLA settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (loadingChat || loadingTicket || loadingCollections) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          SLA & KPI Settings
        </CardTitle>
        <CardDescription>
          Configure response time targets and collection thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chat SLA */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium">Chat Response SLA</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Response (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={chatSettings?.first_response_minutes || ''}
                onChange={(e) => setChatSettings(prev => 
                  prev ? { ...prev, first_response_minutes: parseInt(e.target.value) || 0 } : prev
                )}
              />
              <p className="text-xs text-muted-foreground">Target for first reply to a new client message</p>
            </div>
            <div className="space-y-2">
              <Label>Follow-up Response (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={chatSettings?.response_minutes || ''}
                onChange={(e) => setChatSettings(prev => 
                  prev ? { ...prev, response_minutes: parseInt(e.target.value) || 0 } : prev
                )}
              />
              <p className="text-xs text-muted-foreground">Target for responses in ongoing threads</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Business Hours Start</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={chatSettings?.business_hours_start || ''}
                onChange={(e) => setChatSettings(prev => 
                  prev ? { ...prev, business_hours_start: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Business Hours End</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={chatSettings?.business_hours_end || ''}
                onChange={(e) => setChatSettings(prev => 
                  prev ? { ...prev, business_hours_end: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={chatSettings?.timezone || ''}
                onChange={(e) => setChatSettings(prev => 
                  prev ? { ...prev, timezone: e.target.value } : prev
                )}
                placeholder="America/New_York"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Ticket SLA */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium">Ticket Response SLA</h4>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>First Response (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={ticketSettings?.first_response_minutes || ''}
                onChange={(e) => setTicketSettings(prev => 
                  prev ? { ...prev, first_response_minutes: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Resolution Time (hours)</Label>
              <Input
                type="number"
                min={1}
                value={ticketSettings?.resolution_hours || ''}
                onChange={(e) => setTicketSettings(prev => 
                  prev ? { ...prev, resolution_hours: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Warning Threshold (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={ticketSettings?.warning_threshold_percent || ''}
                onChange={(e) => setTicketSettings(prev => 
                  prev ? { ...prev, warning_threshold_percent: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Collections Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium">Collections Escalation</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Reminder (days before due)</Label>
              <Input
                type="number"
                min={0}
                value={collectionsSettings?.reminder_days_before || ''}
                onChange={(e) => setCollectionsSettings(prev => 
                  prev ? { ...prev, reminder_days_before: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Late Notice (days after due)</Label>
              <Input
                type="number"
                min={1}
                value={collectionsSettings?.late_notice_days || ''}
                onChange={(e) => setCollectionsSettings(prev => 
                  prev ? { ...prev, late_notice_days: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Warning Notice (days)</Label>
              <Input
                type="number"
                min={1}
                value={collectionsSettings?.warning_days || ''}
                onChange={(e) => setCollectionsSettings(prev => 
                  prev ? { ...prev, warning_days: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Final Notice (days)</Label>
              <Input
                type="number"
                min={1}
                value={collectionsSettings?.final_notice_days || ''}
                onChange={(e) => setCollectionsSettings(prev => 
                  prev ? { ...prev, final_notice_days: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Sent to Collections (days)</Label>
              <Input
                type="number"
                min={1}
                value={collectionsSettings?.collections_days || ''}
                onChange={(e) => setCollectionsSettings(prev => 
                  prev ? { ...prev, collections_days: parseInt(e.target.value) || 0 } : prev
                )}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Emails are sent automatically: reminder before due, then escalating notices at configured intervals
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
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
