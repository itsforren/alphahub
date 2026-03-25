import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, Mail, Eye, EyeOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// Note: We use raw fetch for the edge function call (not supabase.functions.invoke)
// because invoke swallows error response bodies on non-2xx status codes
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  licensedStates: string[];
  address: { street: string; city: string; state: string; zip: string; country: string };
  npn: string;
  bio: string;
  headshotFile: File | null;
  headshotPreviewUrl: string | null;
  isCreatingAccount: boolean;
  dispatch: React.Dispatch<OnboardingAction>;
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <X className="w-3 h-3 text-white/20" />
      )}
      <span className={met ? 'text-emerald-400' : 'text-white/30'}>{label}</span>
    </div>
  );
}

export default function CreateAccountStep({
  email,
  password,
  confirmPassword,
  firstName,
  lastName,
  phone,
  licensedStates,
  address,
  npn,
  bio,
  headshotFile,
  headshotPreviewUrl,
  isCreatingAccount,
  dispatch,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isValid = hasMinLength && hasUpper && hasLower && hasNumber && passwordsMatch;

  async function handleCreateAccount() {
    if (!isValid) return;

    dispatch({ type: 'SET_CREATING_ACCOUNT', value: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      // Upload headshot to Supabase storage if provided
      let headshotUrl: string | null = null;
      if (headshotFile) {
        try {
          const fileExt = headshotFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          // Use a temp path keyed by email hash — will be moved to stable path
          // (agent-headshots/{clientId}.ext) by refresh-stable-headshot after client creation
          const tempKey = btoa(email.trim().toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
          const filePath = `agent-headshots/onboarding-${tempKey}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, headshotFile, { upsert: true });

          if (uploadError) {
            console.warn('Headshot upload failed (non-blocking):', uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('media')
              .getPublicUrl(filePath);
            headshotUrl = publicUrl;
          }
        } catch (err) {
          console.warn('Headshot upload error (non-blocking):', err);
        }
      }

      // Call the self-onboard-agent edge function via raw fetch
      // (supabase.functions.invoke swallows error bodies on non-2xx)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/self-onboard-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: email.trim().toLowerCase(),
            phone,
            password,
            states_licensed: licensedStates,
            address_street: address.street,
            address_city: address.city,
            address_state: address.state,
            address_zip: address.zip,
            address_country: address.country || 'US',
            npn,
            bio: bio || undefined,
            headshot_url: headshotUrl || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || `Server error (${response.status})`);
      if (!data?.success) throw new Error(data?.error || 'Account creation failed');

      // Store the IDs from the response
      dispatch({
        type: 'ACCOUNT_CREATED',
        clientId: data.client_id,
        userId: data.user_id,
        agreementId: data.agreement_id,
        agentId: data.agent_id,
      });

      // Auto-login with the chosen password
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginError) {
        console.error('Auto-login failed:', loginError);
        toast.error('Account created but auto-login failed. Please log in manually.');
        return;
      }

      dispatch({ type: 'SET_AUTHENTICATED' });
      dispatch({ type: 'NEXT_STEP' });
      toast.success('Account created!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      dispatch({ type: 'SET_ERROR', error: message });
      toast.error(message);
    }
  }

  return (
    <motion.div
      className="glass-card p-8 max-w-lg w-full mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-3 mb-1">
        <Lock className="w-5 h-5 text-blue-400" />
        <h2 className="text-2xl font-semibold text-white">Create your account</h2>
      </div>
      <p className="text-sm text-white/50 mt-1 mb-6">
        This password will be used for both Alpha Hub and your CRM login
      </p>

      <div className="space-y-4">
        {/* Email (read-only) */}
        <div>
          <Label className="text-sm text-white/60 mb-1.5 block">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={email}
              readOnly
              className="bg-white/5 border-white/10 text-white/60 pl-10 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <Label className="text-sm text-white/60 mb-1.5 block">Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'password', value: e.target.value })}
              placeholder="Choose a strong password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20 pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Password requirements */}
        <div className="grid grid-cols-2 gap-1.5 px-1">
          <PasswordRequirement met={hasMinLength} label="8+ characters" />
          <PasswordRequirement met={hasUpper} label="Uppercase letter" />
          <PasswordRequirement met={hasLower} label="Lowercase letter" />
          <PasswordRequirement met={hasNumber} label="Number" />
        </div>

        {/* Confirm Password */}
        <div>
          <Label className="text-sm text-white/60 mb-1.5 block">Confirm Password</Label>
          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'confirmPassword', value: e.target.value })}
              placeholder="Confirm your password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-400 mt-1.5">Passwords don't match</p>
          )}
        </div>

        {/* Create Account Button */}
        <Button
          onClick={handleCreateAccount}
          disabled={!isValid || isCreatingAccount}
          className="w-full h-12 mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium text-base rounded-xl border-0 transition-all duration-300 disabled:opacity-40"
        >
          {isCreatingAccount ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating your account...
            </span>
          ) : (
            'Create Account'
          )}
        </Button>
      </div>
    </motion.div>
  );
}
