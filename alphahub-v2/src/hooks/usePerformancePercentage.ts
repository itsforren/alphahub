import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function usePerformancePercentage() {
  return useQuery({
    queryKey: ['performance-percentage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_settings')
        .select('setting_value')
        .eq('setting_key', 'performance_percentage')
        .maybeSingle();

      if (error) throw error;

      // Never hard-code a default performance fee.
      // If the setting is missing/invalid, treat as 0%.
      const raw = data?.setting_value;
      const parsed = raw != null ? Number(raw) : NaN;

      if (Number.isFinite(parsed)) return parsed;
      if (raw != null) console.warn('Invalid performance_percentage setting_value:', raw);
      return 0;
    },
  });
}

export function useUpdatePerformancePercentage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (percentage: number) => {
      const { error } = await supabase
        .from('onboarding_settings')
        .upsert({
          setting_key: 'performance_percentage',
          setting_value: percentage.toString(),
          description: 'Percentage to increase displayed ad spend (e.g., 7 means +7%)',
        }, { onConflict: 'setting_key' });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate the performance percentage query itself
      queryClient.invalidateQueries({ queryKey: ['performance-percentage'] });

      // Invalidate ALL wallet and spend-related queries (partial match)
      queryClient.invalidateQueries({ queryKey: ['client-wallet-tracking'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['wallet-deposits'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tracked-ad-spend'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['computed-wallet-balance'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['command-center-stats'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['ad-spend-daily'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['yesterday-metrics'], exact: false });

      toast({
        title: 'Settings updated',
        description: 'Performance percentage applied account-wide.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update performance percentage.',
        variant: 'destructive',
      });
      console.error('Error updating performance percentage:', error);
    },
  });
}

// Helper function to apply performance percentage to a value
export function applyPerformancePercentage(value: number, percentage: number): number {
  return value * (1 + percentage / 100);
}
