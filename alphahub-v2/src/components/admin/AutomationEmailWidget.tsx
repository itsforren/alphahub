import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function AutomationEmailWidget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');

  // Fetch current email setting
  const { data: emailSetting, isLoading } = useQuery({
    queryKey: ['automation-error-email'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'automation_error_email')
        .single();
      
      if (error) throw error;
      return data?.setting_value || '';
    },
  });

  // Update input when data is fetched
  useEffect(() => {
    if (emailSetting !== undefined) {
      setInputValue(emailSetting);
    }
  }, [emailSetting]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('onboarding_settings')
        .update({ setting_value: email })
        .eq('setting_key', 'automation_error_email');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-error-email'] });
      toast({
        title: 'Email Updated',
        description: 'Automation error notification email has been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update email. Please try again.',
        variant: 'destructive',
      });
      console.error('Error updating automation email:', error);
    },
  });

  const handleSave = () => {
    // Basic email validation
    if (inputValue && !inputValue.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate(inputValue);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Automation Error Notifications
        </CardTitle>
        <CardDescription>
          Email address to receive notifications when agent onboarding automations fail (exceed 10 minutes)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="admin@example.com"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {!inputValue && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No email configured. Error notifications will not be sent.</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <p className="font-medium mb-1">When notifications are sent:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>When an agent onboarding stays "in_progress" for more than 10 minutes</li>
            <li>The agent's status is automatically set to "error"</li>
            <li>You'll receive an email with agent details and troubleshooting info</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
