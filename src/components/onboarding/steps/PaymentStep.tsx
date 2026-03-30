import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  clientId: string | null;
  paymentComplete: boolean;
  dispatch: React.Dispatch<OnboardingAction>;
}

/**
 * Payment Step — Embeds the existing OnboardingPaymentFlow dialog.
 *
 * The existing component at src/components/portal/OnboardingPaymentFlow.tsx
 * handles Stripe Setup Intent creation, card form, and payment method saving.
 * We lazy-load it and render it inline as a full-width card rather than a modal.
 *
 * For the initial build, we show a "Set up payment" button that opens the
 * existing payment dialog. Once payment is saved, we advance.
 */
export default function PaymentStep({ clientId, paymentComplete, dispatch }: Props) {
  const [showPayment, setShowPayment] = useState(false);
  const [OnboardingPaymentFlow, setPaymentComponent] = useState<React.ComponentType<any> | null>(null);

  // Lazy load the payment component
  useEffect(() => {
    import('@/components/portal/OnboardingPaymentFlow').then((mod) => {
      setPaymentComponent(() => mod.default || mod.OnboardingPaymentFlow);
    });
  }, []);

  // When dialog closes, verify payment was actually made before advancing
  const verifyPaymentOnClose = async () => {
    if (!clientId) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      // Check if there's a paid management billing record OR a wallet deposit
      const [{ data: paidMgmt }, { data: walletTx }] = await Promise.all([
        supabase
          .from('billing_records')
          .select('id')
          .eq('client_id', clientId)
          .eq('billing_type', 'management')
          .eq('status', 'paid')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('wallet_transactions')
          .select('id')
          .eq('client_id', clientId)
          .limit(1)
          .maybeSingle(),
      ]);

      if (paidMgmt || walletTx) {
        dispatch({ type: 'PAYMENT_COMPLETE' });
        dispatch({ type: 'NEXT_STEP' });
      }
      // If no payment found, just close the dialog — don't advance
    } catch {
      // On error, don't advance
    }
  };

  if (paymentComplete) {
    return (
      <motion.div
        className="glass-card p-8 max-w-lg w-full mx-auto text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Payment set up!</h2>
        <p className="text-sm text-white/50">Your card has been saved successfully.</p>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        className="glass-card p-8 max-w-lg w-full mx-auto text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-2">Set up payment</h2>
        <p className="text-sm text-white/50 mb-8 max-w-sm mx-auto">
          Add your payment method to activate your management fee and ad spend wallet.
        </p>

        <Button
          onClick={() => setShowPayment(true)}
          className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium text-base rounded-xl border-0 transition-all duration-300"
        >
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Add Payment Method
          </span>
        </Button>

        <button
          onClick={() => {
            dispatch({ type: 'NEXT_STEP' });
          }}
          className="text-xs text-white/30 hover:text-white/50 mt-4 block mx-auto transition-colors"
        >
          Skip for now — I'll add payment later
        </button>
      </motion.div>

      {/* Render the existing payment flow dialog */}
      {showPayment && OnboardingPaymentFlow && clientId && (
        <OnboardingPaymentFlow
          open={showPayment}
          onOpenChange={(open: boolean) => {
            setShowPayment(open);
            if (!open) {
              verifyPaymentOnClose();
            }
          }}
          clientId={clientId}
        />
      )}
    </>
  );
}
