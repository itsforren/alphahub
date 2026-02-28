import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SuccessManagerDefaults {
  default_success_manager_name: string;
  default_success_manager_email: string;
  default_success_manager_phone: string;
  default_success_manager_image_url: string;
  default_calendar_link: string;
}

export function useSuccessManagerSettings() {
  return useQuery({
    queryKey: ['success-manager-settings'],
    queryFn: async (): Promise<SuccessManagerDefaults> => {
      const { data, error } = await supabase
        .from('onboarding_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'default_success_manager_name',
          'default_success_manager_email',
          'default_success_manager_phone',
          'default_success_manager_image_url',
          'default_calendar_link'
        ]);

      if (error) throw error;

      const settings: SuccessManagerDefaults = {
        default_success_manager_name: '',
        default_success_manager_email: '',
        default_success_manager_phone: '',
        default_success_manager_image_url: '',
        default_calendar_link: ''
      };

      data?.forEach(row => {
        if (row.setting_key in settings) {
          settings[row.setting_key as keyof SuccessManagerDefaults] = row.setting_value;
        }
      });

      return settings;
    }
  });
}

export function useUpdateSuccessManagerSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<SuccessManagerDefaults>) => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value || ''
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('onboarding_settings')
          .update({ setting_value: update.setting_value, updated_at: new Date().toISOString() })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['success-manager-settings'] });
      toast({
        title: 'Settings saved',
        description: 'Default success manager settings have been updated.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}
