import { useState, useEffect } from 'react';
import { User, Mail, Phone, Image, Calendar, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSuccessManagerSettings, useUpdateSuccessManagerSettings, SuccessManagerDefaults } from '@/hooks/useSuccessManagerSettings';
import { Skeleton } from '@/components/ui/skeleton';

export function SuccessManagerSettingsWidget() {
  const { data: settings, isLoading } = useSuccessManagerSettings();
  const updateSettings = useUpdateSuccessManagerSettings();
  
  const [formData, setFormData] = useState<SuccessManagerDefaults>({
    default_success_manager_name: '',
    default_success_manager_email: '',
    default_success_manager_phone: '',
    default_success_manager_image_url: '',
    default_calendar_link: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const handleChange = (key: keyof SuccessManagerDefaults, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(formData);
    setHasChanges(false);
  };

  const initials = formData.default_success_manager_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SM';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Default Success Manager
        </CardTitle>
        <CardDescription>
          Set default success manager info that applies to all clients without individual assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
          <Avatar className="w-14 h-14 border-2 border-primary/20">
            <AvatarImage src={formData.default_success_manager_image_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">
              {formData.default_success_manager_name || 'Success Manager Name'}
            </p>
            <p className="text-sm text-muted-foreground">
              {formData.default_success_manager_email || 'email@example.com'}
            </p>
            <p className="text-sm text-muted-foreground">
              {formData.default_success_manager_phone || '(555) 555-5555'}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sm-name" className="flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Name
            </Label>
            <Input
              id="sm-name"
              placeholder="John Smith"
              value={formData.default_success_manager_name}
              onChange={(e) => handleChange('default_success_manager_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sm-email" className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> Email
            </Label>
            <Input
              id="sm-email"
              type="email"
              placeholder="john@alphaagent.io"
              value={formData.default_success_manager_email}
              onChange={(e) => handleChange('default_success_manager_email', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sm-phone" className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" /> Phone
            </Label>
            <Input
              id="sm-phone"
              placeholder="+1 (555) 123-4567"
              value={formData.default_success_manager_phone}
              onChange={(e) => handleChange('default_success_manager_phone', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sm-calendar" className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Calendar Link
            </Label>
            <Input
              id="sm-calendar"
              placeholder="https://calendly.com/..."
              value={formData.default_calendar_link}
              onChange={(e) => handleChange('default_calendar_link', e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="sm-image" className="flex items-center gap-2">
              <Image className="w-3.5 h-3.5" /> Profile Image URL
            </Label>
            <Input
              id="sm-image"
              placeholder="https://..."
              value={formData.default_success_manager_image_url}
              onChange={(e) => handleChange('default_success_manager_image_url', e.target.value)}
            />
          </div>
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
