import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  clientId: string | null;
  agreementId: string | null;
  agreementSigned: boolean;
  dispatch: React.Dispatch<OnboardingAction>;
}

/**
 * Agreement Step — Redirects to the existing full-page SignAgreement flow.
 *
 * The existing SignAgreement.tsx is a complex 850+ line component with OTP verification,
 * scroll tracking, key terms, initials, signature canvas, and compliance logging.
 * Rather than duplicating or extracting all of that, we redirect to it with a
 * return URL so the agent comes back to the onboarding flow after signing.
 *
 * The agreement was already created with pre-filled signer info by the
 * self-onboard-agent edge function, so the agent only needs to:
 * OTP verify → scroll → check terms → initial → sign.
 */
export default function AgreementStep({ clientId, agreementId, agreementSigned, dispatch }: Props) {
  const navigate = useNavigate();

  // If agreement is already signed (user came back), advance to payment
  useEffect(() => {
    if (agreementSigned) {
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [agreementSigned, dispatch]);

  function handleSignAgreement() {
    // Navigate to the existing full-page agreement signing flow
    // Pass clientId so it loads the right client data
    // The returnTo param tells SignAgreement where to redirect after signing
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    params.set('returnTo', '/onboarding?step=11'); // Return to payment step
    navigate(`/hub/sign-agreement?${params.toString()}`);
  }

  return (
    <motion.div
      className="glass-card p-8 max-w-lg w-full mx-auto text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <FileText className="w-8 h-8 text-blue-400" />
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-2">Sign your agreement</h2>
      <p className="text-sm text-white/50 mb-8 max-w-sm mx-auto">
        Review and sign your service agreement. Your information has been pre-filled from the details you just provided.
      </p>

      <Button
        onClick={handleSignAgreement}
        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium text-base rounded-xl border-0 transition-all duration-300"
      >
        <span className="flex items-center gap-2">
          Review & Sign Agreement
          <ExternalLink className="w-4 h-4" />
        </span>
      </Button>

      <p className="text-xs text-white/30 mt-4">
        You'll verify via SMS, review the agreement, and sign electronically
      </p>
    </motion.div>
  );
}
