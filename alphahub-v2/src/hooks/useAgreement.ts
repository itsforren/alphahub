import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface KeyTermCheckbox {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export interface InitialsSection {
  id: string;
  label: string;
  required: boolean;
}

export interface AgreementTemplate {
  id: string;
  template_id: string;
  name: string;
  version: string;
  is_active: boolean;
  content: string;
  key_terms: KeyTermCheckbox[];
  initials_sections: InitialsSection[];
  created_at: string;
  updated_at: string;
}

export interface KeyTermCheckboxState {
  checked: boolean;
  checked_at: string;
}

export interface Agreement {
  id: string;
  client_id: string;
  status: 'pending' | 'signed' | 'expired';
  signed_at: string | null;
  signer_full_name: string | null;
  signer_email: string | null;
  signer_phone: string | null;
  signer_state: string | null;
  signer_business_address: string | null;
  signer_license_number: string | null;
  signer_license_states: string[] | null;
  otp_verified: boolean;
  otp_verified_at: string | null;
  signature_drawn_url: string | null;
  signature_typed: string | null;
  electronic_intent_accepted: boolean;
  printed_name: string | null;
  key_terms_checkboxes: Record<string, KeyTermCheckboxState>;
  initials_ip_no_copying: string | null;
  initials_ip_no_copying_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  scrolled_to_bottom: boolean;
  scrolled_to_bottom_at: string | null;
  time_on_page_seconds: number | null;
  template_id: string;
  contract_content: string | null;
  contract_content_hash: string | null;
  pdf_url: string | null;
  pdf_hash: string | null;
  created_at: string;
  updated_at: string;
}

export function useAgreementTemplate() {
  return useQuery({
    queryKey: ['agreement-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agreement_templates')
        .select('*')
        .eq('is_active', true)
        .eq('template_id', 'alpha-agent-v4')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        ...data,
        key_terms: (data.key_terms as unknown as KeyTermCheckbox[]) || [],
        initials_sections: (data.initials_sections as unknown as InitialsSection[]) || [],
      } as AgreementTemplate;
    },
  });
}

export function useClientAgreement(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-agreement', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('agreements')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'signed')
        .order('signed_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        key_terms_checkboxes: (data.key_terms_checkboxes as unknown as Record<string, KeyTermCheckboxState>) || {},
      } as Agreement;
    },
    enabled: !!clientId,
  });
}

export function useCreateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agreementData: Partial<Agreement>) => {
      const { data, error } = await supabase
        .from('agreements')
        .insert({
          ...agreementData,
          key_terms_checkboxes: agreementData.key_terms_checkboxes as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-agreement', data.client_id] });
      // Note: Don't show success toast here - the parent function handles success/failure
    },
    onError: (error) => {
      console.error('[Agreement] Create failed:', error.message);
      toast.error('Failed to create agreement: ' + error.message);
    },
  });
}

export function useUpdateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Agreement> & { id: string }) => {
      const { data, error } = await supabase
        .from('agreements')
        .update({
          ...updates,
          key_terms_checkboxes: updates.key_terms_checkboxes as unknown as Json,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-agreement', data.client_id] });
    },
    onError: (error) => {
      toast.error('Failed to update agreement: ' + error.message);
    },
  });
}

export function useSignAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agreementId,
      clientId,
      signatureData,
    }: {
      agreementId: string;
      clientId: string;
      signatureData: Partial<Agreement>;
    }) => {
      // Update the agreement with signature data
      const { data: agreementData, error: agreementError } = await supabase
        .from('agreements')
        .update({
          ...signatureData,
          key_terms_checkboxes: signatureData.key_terms_checkboxes as unknown as Json,
          status: 'signed',
          signed_at: new Date().toISOString(),
        })
        .eq('id', agreementId)
        .select()
        .single();

      if (agreementError) throw agreementError;

      // Update the client record
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          agreement_id: agreementId,
          contract_signed_at: new Date().toISOString(),
        })
        .eq('id', clientId);

      if (clientError) throw clientError;

      // Mark onboarding checklist items as complete
      await supabase
        .from('onboarding_checklist')
        .update({ status: 'yes', updated_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .in('item_key', ['agreement_signed', 'agreement_stored']);

      return agreementData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-agreement', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-self-onboarding'] });
      toast.success('Agreement signed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to sign agreement: ' + error.message);
    },
  });
}

export function useUploadSignature() {
  return useMutation({
    mutationFn: async ({
      clientId,
      signatureBlob,
    }: {
      clientId: string;
      signatureBlob: Blob;
    }) => {
      const timestamp = Date.now();
      const filePath = `${clientId}/signature-${timestamp}.png`;

      const { error: uploadError } = await supabase.storage
        .from('agreements')
        .upload(filePath, signatureBlob, {
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      // Return the storage object path (bucket is private). Consumers should create a signed URL when downloading.
      return filePath;
    },
    onError: (error) => {
      toast.error('Failed to upload signature: ' + error.message);
    },
  });
}

export function useUploadAgreementPdf() {
  return useMutation({
    mutationFn: async ({
      clientId,
      pdfBlob,
    }: {
      clientId: string;
      pdfBlob: Blob;
    }) => {
      const timestamp = Date.now();
      const filePath = `${clientId}/agreement-${timestamp}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('agreements')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
        });

      if (uploadError) throw uploadError;

      // Return the storage object path (bucket is private). Consumers should create a signed URL when downloading.
      return filePath;
    },
    onError: (error) => {
      toast.error('Failed to upload PDF: ' + error.message);
    },
  });
}
