import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface AutomationStep {
  step: number;
  name: string;
  label: string;
  manual?: boolean; // If true, this step is completed by a human, not automation
}

export const AUTOMATION_STEPS: AutomationStep[] = [
  { step: 1, name: 'lowercase_name', label: 'Lowercase Agent Name' },
  { step: 2, name: 'generate_slug', label: 'Generate URL Slug' },
  { step: 3, name: 'generate_bio', label: 'Generate AI Bio' },
  { step: 4, name: 'create_nfia', label: 'Create NFIA Page' },
  { step: 5, name: 'create_scheduler', label: 'Create Scheduler Page' },
  { step: 6, name: 'create_lander', label: 'Create Lander Page' },
  { step: 7, name: 'create_profile', label: 'Create Profile Page' },
  { step: 8, name: 'create_thankyou', label: 'Create Thank You Page' },
  { step: 9, name: 'create_subaccount', label: 'Create GHL Subaccount' },
  { step: 10, name: 'activate_saas', label: 'Activate SaaS (Manual)', manual: true },
  { step: 11, name: 'install_snapshot', label: 'Verify Snapshot & Calendar ID' },
  { step: 12, name: 'pull_calendar_id', label: 'Pull Calendar ID' },
  { step: 13, name: 'assign_calendars', label: 'Assign User to Calendars' },
  { step: 14, name: 'update_scheduler_embed', label: 'Update Scheduler Embed' },
  { step: 15, name: 'sync_crm_custom_fields', label: 'Sync CRM Custom Fields' },
  { step: 16, name: 'create_google_ads', label: 'Create Google Ads Campaign' },
  { step: 17, name: 'final_verification', label: 'Final Verification' },
  { step: 18, name: 'verify_onboarding', label: 'Verify & Test Onboarding' },
  { step: 19, name: 'provision_phone', label: 'Provision Phone Number (Manual)', manual: true },
];

export interface OnboardingAutomationRun {
  id: string;
  client_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  current_step: number;
  total_steps: number;
  steps_completed: number[];
  steps_failed: number[];
  step_data: Record<string, any>;
  error_log: any; // JSON type from database
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  last_step_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useOnboardingAutomation(clientId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: automationRun, isLoading, refetch } = useQuery({
    queryKey: ['onboarding-automation', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('onboarding_automation_runs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as OnboardingAutomationRun | null;
    },
    enabled: !!clientId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`automation-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding_automation_runs',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, refetch]);

  const startAutomation = useMutation({
    mutationFn: async ({ startFromStep = 1 }: { startFromStep?: number }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-full-onboarding`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ clientId, startFromStep }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start automation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-automation', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    },
  });

  const retryFromStep = useMutation({
    mutationFn: async (stepNumber: number) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-full-onboarding`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ clientId, startFromStep: stepNumber }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to retry automation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-automation', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    },
  });

  const retryVerificationCheck = useMutation({
    mutationFn: async (checkStep: string) => {
      // Call verify-onboarding-live directly with only_step parameter
      // This avoids re-running previous steps like Google Ads
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-onboarding-live`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ client_id: clientId, only_step: checkStep }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to retry verification check');
      }

      const result = await response.json();
      
      // Update the automation run step_data with the new result
      if (result.results) {
        const { data: currentRun } = await supabase
          .from('onboarding_automation_runs')
          .select('id, step_data')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (currentRun) {
          const stepData = (currentRun.step_data as Record<string, any>) || {};
          const existingStep18 = stepData.step_18 || {};
          const existingResults = existingStep18.results || [];
          
          // Merge new results into existing results
          const mergedResults = [...existingResults];
          for (const newResult of result.results) {
            const idx = mergedResults.findIndex((r: any) => r.step === newResult.step);
            if (idx >= 0) {
              mergedResults[idx] = newResult;
            } else {
              mergedResults.push(newResult);
            }
          }
          
          const passedChecks = mergedResults.filter((r: any) => r.success === true).length;
          const totalChecks = mergedResults.length;
          
          await supabase
            .from('onboarding_automation_runs')
            .update({
              step_data: {
                ...stepData,
                step_18: {
                  ...existingStep18,
                  results: mergedResults,
                  passedChecks,
                  totalChecks,
                  allPassed: passedChecks === totalChecks,
                }
              }
            })
            .eq('id', currentRun.id);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-automation', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    },
  });

  const completeManualStep = useMutation({
    mutationFn: async (stepNumber: number) => {
      if (!automationRun?.id) throw new Error('No automation run found');

      const stepsCompleted = [...(automationRun.steps_completed || [])];
      if (!stepsCompleted.includes(stepNumber)) {
        stepsCompleted.push(stepNumber);
        stepsCompleted.sort((a, b) => a - b);
      }

      const stepsFailed = (automationRun.steps_failed || []).filter((s: number) => s !== stepNumber);

      const stepData = { ...(automationRun.step_data || {}) };
      stepData[`step_${stepNumber}`] = {
        manual: true,
        completedBy: 'admin',
        completedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('onboarding_automation_runs')
        .update({
          steps_completed: stepsCompleted,
          steps_failed: stepsFailed,
          step_data: stepData,
        })
        .eq('id', automationRun.id);

      if (error) throw error;

      // Auto-resume: if automation was paused, trigger run-full-onboarding from the next step
      if (automationRun.status === 'paused') {
        const resumeResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-full-onboarding`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ clientId, startFromStep: stepNumber + 1 }),
          }
        );

        if (!resumeResponse.ok) {
          const resumeError = await resumeResponse.json().catch(() => null);
          throw new Error(resumeError?.error || 'Manual step completed, but failed to resume automation');
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-automation', clientId] });
    },
  });

  const uncompleteManualStep = useMutation({
    mutationFn: async (stepNumber: number) => {
      if (!automationRun?.id) throw new Error('No automation run found');

      const stepsCompleted = (automationRun.steps_completed || []).filter((s: number) => s !== stepNumber);

      const stepData = { ...(automationRun.step_data || {}) };
      delete stepData[`step_${stepNumber}`];

      const { error } = await supabase
        .from('onboarding_automation_runs')
        .update({
          steps_completed: stepsCompleted,
          step_data: stepData,
        })
        .eq('id', automationRun.id);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-automation', clientId] });
    },
  });

  const markComplete = useMutation({
    mutationFn: async () => {
      // If there's an existing run, update it
      if (automationRun?.id) {
        const allSteps = AUTOMATION_STEPS.map(s => s.step);
        const { error } = await supabase
          .from('onboarding_automation_runs')
          .update({
            status: 'completed',
            steps_completed: allSteps,
            steps_failed: [],
            current_step: AUTOMATION_STEPS.length,
            completed_at: new Date().toISOString(),
          })
          .eq('id', automationRun.id);

        if (error) throw error;
      } else {
        // Create a new completed run
        const allSteps = AUTOMATION_STEPS.map(s => s.step);
        const { error } = await supabase
          .from('onboarding_automation_runs')
          .insert({
            client_id: clientId,
            status: 'completed',
            steps_completed: allSteps,
            steps_failed: [],
            current_step: AUTOMATION_STEPS.length,
            total_steps: AUTOMATION_STEPS.length,
            completed_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-automation', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    },
  });

  return {
    automationRun,
    isLoading,
    steps: AUTOMATION_STEPS,
    startAutomation,
    retryFromStep,
    retryVerificationCheck,
    completeManualStep,
    uncompleteManualStep,
    markComplete,
    refetch,
  };
}
