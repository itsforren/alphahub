import { useState, useEffect } from 'react';
import { Bell, Mail, Volume2, VolumeX, Loader2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MFAEnrollment from '@/components/auth/MFAEnrollment';

interface NotificationPreferences {
  sound_enabled: boolean;
  email_enabled: boolean;
}

export default function HubSettings() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    sound_enabled: true,
    email_enabled: true,
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('sound_enabled, email_enabled')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          sound_enabled: data.sound_enabled,
          email_enabled: data.email_enabled,
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    setSaving(true);
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user?.id,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const testSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playNote = (freq: number, startTime: number, duration: number, volume: number) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      // Pleasant 3-note chime (C5 - E5 - G5)
      playNote(523.25, now, 0.15, 0.15);       // C5
      playNote(659.25, now + 0.1, 0.15, 0.12); // E5
      playNote(783.99, now + 0.2, 0.2, 0.1);   // G5

      toast({
        title: 'Sound test',
        description: 'This is what notification sounds will be like.',
      });
    } catch (error) {
      console.error('Error playing test sound:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      {/* MFA Section - Show for admins */}
      {isAdmin && (
        <MFAEnrollment />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Control how you receive notifications for new messages and support tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sound Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sound-toggle" className="flex items-center gap-2 text-base font-medium">
                {preferences.sound_enabled ? (
                  <Volume2 className="w-4 h-4 text-primary" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                In-Browser Sound Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Play a subtle chime when new messages or tickets arrive
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testSound}
                disabled={saving}
              >
                Test Sound
              </Button>
              <Switch
                id="sound-toggle"
                checked={preferences.sound_enabled}
                onCheckedChange={(checked) => updatePreferences({ sound_enabled: checked })}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-toggle" className="flex items-center gap-2 text-base font-medium">
                <Mail className={`w-4 h-4 ${preferences.email_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts when you get new messages or ticket updates
              </p>
            </div>
            <Switch
              id="email-toggle"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => updatePreferences({ email_enabled: checked })}
              disabled={saving}
            />
          </div>

          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional info card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Real-time notifications enabled</p>
              <p className="text-sm text-muted-foreground">
                You'll receive instant notifications when your team sends you messages or updates your support tickets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
