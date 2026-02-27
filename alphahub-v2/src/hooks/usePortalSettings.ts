import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PortalVisibilitySettings {
  agent_portal_show_billing: boolean;
  agent_portal_show_wallet: boolean;
  agent_portal_show_performance_metrics: boolean;
  agent_portal_show_referrals: boolean;
  agent_portal_show_leads: boolean;
}

export function usePortalSettings() {
  return useQuery({
    queryKey: ['portal-visibility-settings'],
    queryFn: async (): Promise<PortalVisibilitySettings> => {
      const { data, error } = await supabase
        .from('onboarding_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'agent_portal_show_billing',
          'agent_portal_show_wallet',
          'agent_portal_show_performance_metrics',
          'agent_portal_show_referrals',
          'agent_portal_show_leads'
        ]);

      if (error) throw error;

      // Default all to true
      const settings: PortalVisibilitySettings = {
        agent_portal_show_billing: true,
        agent_portal_show_wallet: true,
        agent_portal_show_performance_metrics: true,
        agent_portal_show_referrals: true,
        agent_portal_show_leads: true
      };

      data?.forEach(row => {
        if (row.setting_key in settings) {
          settings[row.setting_key as keyof PortalVisibilitySettings] = row.setting_value === 'true';
        }
      });

      return settings;
    }
  });
}

export function useUpdatePortalSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<PortalVisibilitySettings>) => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: String(value)
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
      queryClient.invalidateQueries({ queryKey: ['portal-visibility-settings'] });
      toast({
        title: 'Settings saved',
        description: 'Portal visibility settings have been updated.'
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
