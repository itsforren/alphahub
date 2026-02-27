import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OTPState {
  isSending: boolean;
  isVerifying: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  maskedPhone: string | null;
  expiresAt: string | null;
  error: string | null;
  attemptsRemaining: number | null;
}

export function useAgreementOTP() {
  const [state, setState] = useState<OTPState>({
    isSending: false,
    isVerifying: false,
    isVerified: false,
    verifiedAt: null,
    maskedPhone: null,
    expiresAt: null,
    error: null,
    attemptsRemaining: null,
  });

  const sendOTP = useCallback(async (phone: string, agreementId?: string) => {
    setState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('send-agreement-otp', {
        body: { phone, agreementId },
      });

      if (error) throw error;

      if (data.success) {
        setState(prev => ({
          ...prev,
          isSending: false,
          maskedPhone: data.maskedPhone,
          expiresAt: data.expiresAt,
          error: null,
        }));
        toast.success('Verification code sent to your phone');
        return true;
      } else {
        throw new Error(data.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send verification code';
      setState(prev => ({ ...prev, isSending: false, error: errorMessage }));
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const verifyOTP = useCallback(async (phone: string, otp: string) => {
    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('verify-agreement-otp', {
        body: { phone, otp },
      });

      if (error) throw error;

      if (data.success) {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          isVerified: true,
          verifiedAt: data.verifiedAt,
          error: null,
        }));
        toast.success('Phone verified successfully!');
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isVerifying: false,
          error: data.error,
          attemptsRemaining: data.attemptsRemaining,
        }));
        toast.error(data.error || 'Invalid verification code');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to verify code';
      setState(prev => ({ ...prev, isVerifying: false, error: errorMessage }));
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isSending: false,
      isVerifying: false,
      isVerified: false,
      verifiedAt: null,
      maskedPhone: null,
      expiresAt: null,
      error: null,
      attemptsRemaining: null,
    });
  }, []);

  return {
    ...state,
    sendOTP,
    verifyOTP,
    reset,
  };
}
