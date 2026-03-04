import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  CreditCard,
  Wallet,
  Shield,
  Lock,
  Loader2,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/config/stripe';
import { usePaymentMethods, useCreateSetupIntent, useSavePaymentMethod } from '@/hooks/usePaymentMethods';
import { useClientWallet } from '@/hooks/useClientWallet';
import { useCreateOrUpdateWallet } from '@/hooks/useClientWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fireConfetti, fireFireworks } from '@/lib/confetti';

const TEST_EMAILS = ['james@taxfreewealthplan.com', 'forrenwarren@gmail.com'];

function useClientBillingConfig(clientId: string, clientEmail?: string) {
  return useQuery({
    queryKey: ['client-billing-config', clientId],
    queryFn: async () => {
      if (clientEmail && TEST_EMAILS.includes(clientEmail.toLowerCase())) {
        return { fee: 0.42, frequency: 'monthly' as const, isTest: true };
      }
      const { data } = await supabase
        .from('clients')
        .select('management_fee, billing_frequency')
        .eq('id', clientId)
        .single();
      const fee = (data as any)?.management_fee || 1497;
      const frequency = ((data as any)?.billing_frequency || 'monthly') as 'monthly' | 'bi_weekly';
      return { fee, frequency, isTest: false };
    },
    enabled: !!clientId,
  });
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#e2e8f0',
      fontFamily: '"Inter", system-ui, sans-serif',
      '::placeholder': { color: '#64748b' },
    },
    invalid: { color: '#ef4444' },
  },
};

const MIN_MONTHLY_CAP = 1000;
const TEST_MIN_MONTHLY_CAP = 1;
const INITIAL_DEPOSIT = 250;
const TEST_INITIAL_DEPOSIT = 1;
const MIN_RECHARGE_AMOUNT = 200;
const DEFAULT_RECHARGE_AMOUNT = 250;
const LOW_BALANCE_THRESHOLD = 150;

interface OnboardingPaymentFlowProps {
  clientId: string;
  hasSignedAgreement: boolean;
  clientEmail?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Check if there's a paid management billing record in the current billing cycle
function useHasPaidManagementFee(clientId: string) {
  return useQuery({
    queryKey: ['has-paid-management-fee', clientId],
    queryFn: async () => {
      // First get the client's billing_cycle_start_at to scope the check
      const { data: client } = await supabase
        .from('clients')
        .select('billing_cycle_start_at')
        .eq('id', clientId)
        .single();

      let query = supabase
        .from('billing_records')
        .select('id')
        .eq('client_id', clientId)
        .eq('billing_type', 'management')
        .eq('status', 'paid');

      // Only count payments within the current billing cycle
      const cycleStart = (client as any)?.billing_cycle_start_at;
      if (cycleStart) {
        query = query.gte('paid_at', cycleStart);
      }

      const { data, error } = await query.limit(1);
      if (error) throw error;
      if ((data?.length ?? 0) > 0) return true;

      // Fallback: if there's an active subscription in DB, treat as paid
      // (handles case where billing record creation was delayed or failed)
      const { data: activeSub } = await supabase
        .from('client_stripe_subscriptions')
        .select('id')
        .eq('client_id', clientId)
        .eq('billing_type', 'management')
        .eq('status', 'active')
        .limit(1);

      return (activeSub?.length ?? 0) > 0;
    },
    enabled: !!clientId,
  });
}

// ─── Step Indicator ───
function StepIndicator({ currentStep, step2Complete, step3Complete }: { currentStep: number; step2Complete: boolean; step3Complete: boolean }) {
  const steps = [
    { num: 2, label: 'Management Fee', complete: step2Complete },
    { num: 3, label: 'Ad Spend Setup', complete: step3Complete },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
            s.complete
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : currentStep === s.num
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20'
                : 'bg-muted text-muted-foreground'
          )}>
            {s.complete ? <CheckCircle2 className="w-5 h-5" /> : s.num - 1}
          </div>
          <span className={cn(
            'text-sm font-medium hidden sm:inline',
            s.complete ? 'text-emerald-500' : currentStep === s.num ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn(
              'w-12 h-0.5 mx-1',
              s.complete ? 'bg-emerald-500' : 'bg-border'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Trust Badges ───
function TrustBadges() {
  return (
    <div className="flex items-center justify-center gap-4 mt-4 mb-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5" />
        <span>256-bit encrypted</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span>Secured by Stripe</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CreditCard className="w-3.5 h-3.5" />
        <span>PCI Compliant</span>
      </div>
    </div>
  );
}

// ─── Card Brand Icon ───
function CardBrandIcon({ brand }: { brand: string | null }) {
  const b = (brand || '').toLowerCase();
  if (b === 'visa') return <span className="font-bold text-blue-500 text-xs tracking-widest">VISA</span>;
  if (b === 'mastercard') return <span className="font-bold text-orange-500 text-xs">MC</span>;
  if (b === 'amex') return <span className="font-bold text-blue-400 text-xs">AMEX</span>;
  if (b === 'discover') return <span className="font-bold text-orange-400 text-xs">DISC</span>;
  return <CreditCard className="w-4 h-4 text-muted-foreground" />;
}

// ─── Management Fee Form (Step 2) ───
function ManagementFeeForm({
  clientId,
  hasCard,
  cardBrand,
  cardLastFour,
  fee,
  frequency,
  onSuccess,
}: {
  clientId: string;
  hasCard: boolean;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  fee: number;
  frequency: 'monthly' | 'bi_weekly';
  onSuccess: (subscriptionId?: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [useNewCard, setUseNewCard] = useState(false);
  const createSetupIntent = useCreateSetupIntent();
  const savePaymentMethod = useSavePaymentMethod();
  const queryClient = useQueryClient();

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      if ((!hasCard || useNewCard) && stripe && elements) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          toast.error('Please enter your card details');
          setIsProcessing(false);
          return;
        }

        const { client_secret } = await createSetupIntent.mutateAsync({
          clientId,
          stripeAccount: 'management',
        });

        const result = await stripe.confirmCardSetup(client_secret, {
          payment_method: { card: cardElement },
        });

        if (result.error) {
          toast.error(result.error.message || 'Card setup failed');
          setIsProcessing(false);
          return;
        }

        await savePaymentMethod.mutateAsync({
          clientId,
          stripeAccount: 'management',
          setupIntentId: result.setupIntent.id,
        });
      }

      // Use Stripe Subscriptions for management fees
      const notesLabel = fee < 1
        ? 'Admin test fee - $0.42'
        : frequency === 'bi_weekly'
          ? `Management fee - $${fee.toLocaleString()}/bi-weekly`
          : `Management fee - $${fee.toLocaleString()}/mo`;

      const { data: subResult, error: subError } = await supabase.functions.invoke('create-stripe-subscription', {
        body: {
          client_id: clientId,
          amount: fee,
          recurrence_type: frequency,
          notes: notesLabel,
        },
      });

      if (subError || !subResult?.success) {
        const errorMsg = subResult?.error || subError?.message || 'Payment processing failed';
        toast.error(errorMsg);
        setIsProcessing(false);
        return;
      }

      // Gate on confirmed status — don't advance if payment didn't complete
      if (subResult.status !== 'active') {
        const errMsg = subResult.error || 'Payment could not be confirmed. Please check your card details and try again.';
        toast.error(errMsg);
        setIsProcessing(false);
        return;
      }

      if (subResult.already_exists || subResult.recovered) {
        toast.info('Subscription confirmed');
      }

      onSuccess(subResult.subscription_id);
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Pricing Card */}
      <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center">
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
            {frequency === 'bi_weekly' ? 'Bi-Weekly' : 'Monthly'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          {frequency === 'bi_weekly' ? 'Bi-Weekly Management Fee' : 'Monthly Management Fee'}
        </p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-foreground">${fee < 1 ? fee : fee.toLocaleString()}</span>
          <span className="text-muted-foreground">{frequency === 'bi_weekly' ? '/2 weeks' : '/mo'}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Full-service campaign management & optimization</p>
      </div>

      {/* Card Input */}
      {(!hasCard || useNewCard) && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {useNewCard ? 'New Card Details' : 'Card Details'}
          </Label>
          <div className="p-4 rounded-xl border border-border bg-background/80 backdrop-blur-sm shadow-inner">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
          <TrustBadges />
          {hasCard && useNewCard && (
            <button
              type="button"
              onClick={() => setUseNewCard(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              ← Use saved card instead
            </button>
          )}
        </div>
      )}

      {hasCard && !useNewCard && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex items-center gap-2">
                <CardBrandIcon brand={cardBrand ?? null} />
                <span className="text-sm font-medium text-foreground">
                  {cardBrand ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1) : 'Card'}
                  {cardLastFour ? ` •••• ${cardLastFour}` : ' on file'}
                </span>
              </div>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Will be charged</span>
          </div>
          <button
            type="button"
            onClick={() => setUseNewCard(true)}
            className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors pl-7"
          >
            + Use a different card
          </button>
        </div>
      )}

      <Button
        onClick={handlePay}
        disabled={isProcessing}
        size="lg"
        className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/20"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <CreditCard className="w-5 h-5" />
        )}
        Pay ${fee < 1 ? fee : fee.toLocaleString()}
      </Button>
    </motion.div>
  );
}

// ─── Ad Spend Form (Step 3) ───
type AdSpendMode = 'wallet' | 'monthly';

function AdSpendForm({
  clientId,
  hasCard,
  cardBrand,
  cardLastFour,
  isTest,
  onSuccess,
}: {
  clientId: string;
  hasCard: boolean;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  isTest?: boolean;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [mode, setMode] = useState<AdSpendMode | null>(null);
  const [monthlyCap, setMonthlyCap] = useState(isTest ? '100' : '1000');
  const [monthlyAmount, setMonthlyAmount] = useState(isTest ? '100' : '1000');
  const [rechargeAmount, setRechargeAmount] = useState(isTest ? '1' : String(DEFAULT_RECHARGE_AMOUNT));
  const [isProcessing, setIsProcessing] = useState(false);
  const [useNewCard, setUseNewCard] = useState(false);
  const deposit = isTest ? TEST_INITIAL_DEPOSIT : INITIAL_DEPOSIT;
  const minCap = isTest ? TEST_MIN_MONTHLY_CAP : MIN_MONTHLY_CAP;
  const createSetupIntent = useCreateSetupIntent();
  const savePaymentMethod = useSavePaymentMethod();
  const createOrUpdateWallet = useCreateOrUpdateWallet();
  const { data: wallet } = useClientWallet(clientId);

  const existingBalance = wallet?.ad_spend_balance ?? 0;
  const shouldSkipInitialCharge = existingBalance >= LOW_BALANCE_THRESHOLD;

  const capValue = parseFloat(monthlyCap) || 0;
  const monthlyValue = parseFloat(monthlyAmount) || 0;
  const rechargeValue = parseFloat(rechargeAmount) || 0;
  const isWalletValid = mode === 'wallet' && capValue >= minCap && rechargeValue >= (isTest ? 1 : MIN_RECHARGE_AMOUNT);
  const isMonthlyValid = mode === 'monthly' && monthlyValue >= (isTest ? 1 : 500);
  const isValid = isWalletValid || isMonthlyValid;

  const saveCardIfNeeded = async () => {
    if ((!hasCard || useNewCard) && stripe && elements) {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        toast.error('Please enter your card details');
        return false;
      }

      const { client_secret } = await createSetupIntent.mutateAsync({
        clientId,
        stripeAccount: 'ad_spend',
      });

      const result = await stripe.confirmCardSetup(client_secret, {
        payment_method: { card: cardElement },
      });

      if (result.error) {
        toast.error(result.error.message || 'Card setup failed');
        return false;
      }

      await savePaymentMethod.mutateAsync({
        clientId,
        stripeAccount: 'ad_spend',
        setupIntentId: result.setupIntent.id,
      });
    }
    return true;
  };

  const handleWalletSubmit = async () => {
    if (!isWalletValid) return;
    setIsProcessing(true);
    try {
      if (!(await saveCardIfNeeded())) { setIsProcessing(false); return; }

      await createOrUpdateWallet.mutateAsync({
        client_id: clientId,
        auto_charge_amount: rechargeValue,
        low_balance_threshold: LOW_BALANCE_THRESHOLD,
        auto_billing_enabled: !isTest,
        billing_mode: isTest ? 'manual' : 'auto_stripe',
        monthly_ad_spend_cap: capValue,
      });

      // Only charge if balance is below threshold
      if (!shouldSkipInitialCharge) {
        const chargeAmount = isTest ? deposit : rechargeValue;
        const today = new Date().toISOString().split('T')[0];
        const { data: billingRecord, error: billingError } = await supabase
          .from('billing_records')
          .insert({
            client_id: clientId,
            billing_type: 'ad_spend',
            amount: chargeAmount,
            status: 'pending',
            billing_period_start: today,
            due_date: today,
            notes: `Initial ad spend deposit - Monthly cap: $${capValue.toLocaleString()}${isTest ? ' [TEST]' : ''}`,
          })
          .select()
          .single();

        if (billingError) throw billingError;

        const { data: invoiceResult, error: invoiceError } = await supabase.functions.invoke('create-stripe-invoice', {
          body: { billing_record_id: billingRecord.id },
        });

        if (invoiceError || !invoiceResult?.success) {
          toast.error('Wallet configured but payment processing failed. An admin will follow up.');
          setIsProcessing(false);
          return;
        }

        if (!invoiceResult.auto_charged && invoiceResult.payment_link) {
          window.open(invoiceResult.payment_link, '_blank');
          toast.info('Please complete payment in the opened window.');
          setIsProcessing(false);
          return;
        }
      } else {
        toast.success(`Wallet configured! Your balance of $${existingBalance.toFixed(2)} will be used. Auto-recharge of $${rechargeValue} activates when below $${LOW_BALANCE_THRESHOLD}.`);
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set up ad spend');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMonthlySubmit = async () => {
    if (!isMonthlyValid) return;
    setIsProcessing(true);
    try {
      if (!(await saveCardIfNeeded())) { setIsProcessing(false); return; }

      // Create wallet in subscription mode
      await createOrUpdateWallet.mutateAsync({
        client_id: clientId,
        auto_charge_amount: 0,
        low_balance_threshold: 0,
        auto_billing_enabled: true,
        billing_mode: 'auto_stripe',
        monthly_ad_spend_cap: monthlyValue,
      });

      // Create a monthly subscription on the ad_spend Stripe account
      const { data: subResult, error: subError } = await supabase.functions.invoke('create-stripe-subscription', {
        body: {
          client_id: clientId,
          amount: monthlyValue,
          recurrence_type: 'monthly',
          stripe_account: 'ad_spend',
          billing_type: 'ad_spend',
          notes: `Upfront monthly ad spend - $${monthlyValue.toLocaleString()}/mo`,
        },
      });

      if (subError || !subResult?.success) {
        const errorMsg = subResult?.error || subError?.message || 'Payment processing failed';
        toast.error(errorMsg);
        setIsProcessing(false);
        return;
      }

      if (subResult.status !== 'active') {
        toast.error(subResult.error || 'Payment could not be confirmed. Please check your card and try again.');
        setIsProcessing(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set up ad spend subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'wallet') handleWalletSubmit();
    else if (mode === 'monthly') handleMonthlySubmit();
  };

  // Card input section (shared)
  const cardSection = (
    <>
      {(!hasCard || useNewCard) && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {useNewCard ? 'New Card Details' : 'Card Details for Ad Spend'}
          </Label>
          <div className="p-4 rounded-xl border border-border bg-background/80 backdrop-blur-sm shadow-inner">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
          <TrustBadges />
          {hasCard && useNewCard && (
            <button
              type="button"
              onClick={() => setUseNewCard(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              ← Use saved card instead
            </button>
          )}
        </div>
      )}

      {hasCard && !useNewCard && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex items-center gap-2">
                <CardBrandIcon brand={cardBrand ?? null} />
                <span className="text-sm font-medium text-foreground">
                  {cardBrand ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1) : 'Card'}
                  {cardLastFour ? ` •••• ${cardLastFour}` : ' on file'}
                </span>
              </div>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{shouldSkipInitialCharge ? 'Saved for auto-recharge' : 'Will be charged'}</span>
          </div>
          <button
            type="button"
            onClick={() => setUseNewCard(true)}
            className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors pl-7"
          >
            + Use a different card
          </button>
        </div>
      )}
    </>
  );

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode('wallet')}
          className={cn(
            'relative rounded-xl border-2 p-4 text-left transition-all duration-200',
            mode === 'wallet'
              ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
              : 'border-border hover:border-primary/40 bg-muted/20'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className={cn('w-5 h-5', mode === 'wallet' ? 'text-primary' : 'text-muted-foreground')} />
            <span className="font-semibold text-sm">Wallet Refill</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {shouldSkipInitialCharge ? 'Save card — auto-recharges when below $150' : `$${deposit} deposit, auto-recharges as you spend`}
          </p>
          {mode === 'wallet' && (
            <div className="absolute top-2 right-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMode('monthly')}
          className={cn(
            'relative rounded-xl border-2 p-4 text-left transition-all duration-200',
            mode === 'monthly'
              ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
              : 'border-border hover:border-primary/40 bg-muted/20'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={cn('w-5 h-5', mode === 'monthly' ? 'text-primary' : 'text-muted-foreground')} />
            <span className="font-semibold text-sm">Upfront Monthly</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Fixed monthly subscription for ad spend
          </p>
          {mode === 'monthly' && (
            <div className="absolute top-2 right-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
          )}
        </button>
      </div>

      {/* Wallet Refill Options */}
      <AnimatePresence mode="wait">
        {mode === 'wallet' && (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Existing Balance Notice */}
            {shouldSkipInitialCharge ? (
              <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">You will not be charged upfront</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your current wallet balance (<strong className="text-emerald-400">${existingBalance.toFixed(2)}</strong>) is above the ${LOW_BALANCE_THRESHOLD} threshold.
                      Your card will only be charged when your balance drops below ${LOW_BALANCE_THRESHOLD}.
                    </p>
                  </div>
                </div>
              </div>
            ) : existingBalance > 0 ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Current balance: <strong className="text-emerald-500">${existingBalance.toFixed(2)}</strong></span>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Monthly Ad Spend Cap</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-semibold">$</span>
                <Input
                  type="number"
                  min={minCap}
                  step="100"
                  value={monthlyCap}
                  onChange={(e) => setMonthlyCap(e.target.value)}
                  className="pl-9 text-lg h-14 font-semibold"
                  placeholder="1,000"
                />
              </div>
              {capValue > 0 && capValue < minCap && (
                <p className="text-xs text-destructive">Minimum monthly cap is ${minCap.toLocaleString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Auto-Recharge Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-semibold">$</span>
                <Input
                  type="number"
                  min={isTest ? 1 : MIN_RECHARGE_AMOUNT}
                  step="50"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="pl-9 text-lg h-14 font-semibold"
                  placeholder="250"
                />
              </div>
              {rechargeValue > 0 && rechargeValue < (isTest ? 1 : MIN_RECHARGE_AMOUNT) && (
                <p className="text-xs text-destructive">Minimum recharge amount is ${isTest ? '1' : MIN_RECHARGE_AMOUNT.toString()}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Charged when your balance drops below ${LOW_BALANCE_THRESHOLD}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
              {!shouldSkipInitialCharge && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Initial deposit:</span>
                    <strong className="ml-1">${isTest ? deposit : (rechargeValue > 0 ? rechargeValue : '—')}</strong>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-muted-foreground">Auto-recharge:</span>
                  <strong className="ml-1">${rechargeValue > 0 ? rechargeValue : '—'}</strong>
                  <span className="text-muted-foreground ml-1">when below ${LOW_BALANCE_THRESHOLD}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly cap:</span>
                  <strong className="ml-1">${capValue > 0 ? capValue.toLocaleString() : '—'}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'monthly' && (
          <motion.div
            key="monthly"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium">Monthly Ad Spend Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-semibold">$</span>
                <Input
                  type="number"
                  min={isTest ? 1 : 500}
                  step="100"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  className="pl-9 text-lg h-14 font-semibold"
                  placeholder="1,000"
                />
              </div>
              {monthlyValue > 0 && monthlyValue < (isTest ? 1 : 500) && (
                <p className="text-xs text-destructive">Minimum monthly amount is ${isTest ? '1' : '500'}</p>
              )}
            </div>

            <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center">
              <div className="absolute top-2 right-2">
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Monthly</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Monthly Ad Spend Subscription</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-foreground">
                  ${monthlyValue > 0 ? monthlyValue.toLocaleString() : '—'}
                </span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Charged upfront on a recurring monthly basis
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card section — shown once a mode is selected */}
      {mode && cardSection}

      {/* Submit button */}
      {mode && (
        <Button
          type="submit"
          disabled={!isValid || isProcessing}
          size="lg"
          className="w-full h-14 text-lg font-semibold gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/20"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Wallet className="w-5 h-5" />
          )}
          {mode === 'wallet'
            ? (shouldSkipInitialCharge ? 'Confirm Settings' : `Confirm & Pay $${isTest ? deposit : (rechargeValue > 0 ? rechargeValue : 0)}`)
            : `Subscribe $${monthlyValue > 0 ? monthlyValue.toLocaleString() : '0'}/mo`
          }
        </Button>
      )}

      {/* Trust symbols */}
      {mode && <TrustBadges />}
    </motion.form>
  );
}

// ─── Success / Celebration Screens ───
function ManagementSuccess({ onContinue, subscriptionId }: { onContinue: () => void; subscriptionId?: string }) {
  useEffect(() => {
    fireConfetti();
    const timer = setTimeout(onContinue, 3000);
    return () => clearTimeout(timer);
  }, [onContinue]);

  const truncatedSubId = subscriptionId
    ? subscriptionId.slice(0, 14) + '...'
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
      >
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" />
      </motion.div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
      {truncatedSubId && (
        <div className="mt-3 mb-2 flex flex-col items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-3 py-1 gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            Subscription Confirmed
          </Badge>
          <p className="text-xs font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
            {truncatedSubId}
          </p>
        </div>
      )}
      <p className="text-muted-foreground mt-2">Setting up your ad spend next...</p>
    </motion.div>
  );
}

function FinalCelebration({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    fireFireworks();
    fireConfetti();
    const secondBurst = setTimeout(() => {
      fireFireworks();
    }, 1500);
    return () => clearTimeout(secondBurst);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      {/* Animated badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="w-4 h-4" />
          Account Activated
        </span>
      </motion.div>

      {/* Trophy icon with glow */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl scale-150" />
        <div className="relative bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full p-5 shadow-2xl shadow-amber-500/30">
          <Trophy className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      {/* Main headline */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-4xl font-bold text-foreground mb-2"
      >
        You're Officially an Alpha Agent
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="text-lg font-medium bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-3"
      >
        Your empire starts now
      </motion.p>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="text-muted-foreground max-w-md mb-10"
      >
        Your account is fully set up and ready to dominate. Let's build something legendary.
      </motion.p>

      {/* CTA button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <Button
          size="lg"
          onClick={onFinish}
          className="h-14 px-10 text-lg font-semibold gap-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-xl shadow-emerald-500/20 animate-glow-pulse"
        >
          Go to Dashboard
          <ChevronRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Wizard ───
export function OnboardingPaymentFlow({
  clientId,
  hasSignedAgreement,
  clientEmail,
  open: controlledOpen,
  onOpenChange,
}: OnboardingPaymentFlowProps) {
  const navigate = useNavigate();
  const { data: methods } = usePaymentMethods(clientId);
  const { data: hasPaidMgmt, isLoading: mgmtLoading } = useHasPaidManagementFee(clientId);
  const { data: wallet } = useClientWallet(clientId);
  const queryClient = useQueryClient();

  const { data: billingConfig } = useClientBillingConfig(clientId, clientEmail);
  const billingFrequency = billingConfig?.frequency || 'monthly';
  const baseFee = billingConfig?.fee || 1497;
  const managementFee = billingFrequency === 'bi_weekly' ? baseFee / 2 : baseFee;
  const mgmtCard = (methods || []).find(m => m.stripe_account === 'management' && m.is_default)
    || (methods || []).find(m => m.stripe_account === 'management');
  const adSpendCard = (methods || []).find(m => m.stripe_account === 'ad_spend' && m.is_default)
    || (methods || []).find(m => m.stripe_account === 'ad_spend');
  const hasManagementCard = !!mgmtCard;
  const hasAdSpendCard = !!adSpendCard;
  const step2Complete = hasPaidMgmt === true;
  const step3Complete = wallet?.auto_billing_enabled === true || (hasAdSpendCard && wallet && Number(wallet.ad_spend_balance) >= 150);

  const [wizardStep, setWizardStep] = useState<'mgmt' | 'mgmt-success' | 'adspend' | 'final'>('mgmt');
  const [mgmtSubscriptionId, setMgmtSubscriptionId] = useState<string | undefined>(undefined);
  const [internalOpen, setInternalOpen] = useState(false);
  // Ref to block useEffect auto-advance after manual wizard progression
  const hasManuallyProgressed = useRef(false);

  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  // Auto-determine wizard starting step — only when user hasn't manually progressed
  useEffect(() => {
    if (hasManuallyProgressed.current) return;
    if (step2Complete && !step3Complete) {
      setWizardStep('adspend');
    } else if (!step2Complete) {
      setWizardStep('mgmt');
    }
  }, [step2Complete, step3Complete]);

  // If all steps complete, hide
  if (hasSignedAgreement && step2Complete && step3Complete) return null;
  if (mgmtLoading) return null;
  // If agreement not signed, don't show wizard at all
  if (!hasSignedAgreement) return null;

  const managementStripePromise = getStripePromise('management');
  const adSpendStripePromise = getStripePromise('ad_spend');

  return (
    <>
      {/* Inline trigger card */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 cursor-pointer hover:border-primary/50 transition-all"
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Complete Your Payment Setup</h3>
                <p className="text-sm text-muted-foreground">
                  {!step2Complete ? 'Step 1 of 2 — Management Fee' : 'Step 2 of 2 — Ad Spend Setup'}
                </p>
              </div>
            </div>
            <Button variant="default" className="gap-2">
              Set Up Payment <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: step2Complete ? '50%' : '0%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}

      {/* Full-screen wizard dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 border-primary/20 bg-gradient-to-b from-background to-muted/20 flex flex-col max-h-[90vh] [&>button]:hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-foreground">Account Setup</h2>
              <p className="text-sm text-muted-foreground">Complete your payment setup to activate your account</p>
            </div>
            <StepIndicator
              currentStep={wizardStep === 'mgmt' || wizardStep === 'mgmt-success' ? 2 : 3}
              step2Complete={step2Complete || wizardStep === 'mgmt-success' || wizardStep === 'adspend' || wizardStep === 'final'}
              step3Complete={wizardStep === 'final'}
            />
          </div>

          {/* Body */}
          <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0">
            <AnimatePresence mode="wait">
              {wizardStep === 'mgmt' && (
                <Elements key="mgmt-elements" stripe={managementStripePromise}>
                  <ManagementFeeForm
                    clientId={clientId}
                    hasCard={hasManagementCard}
                    cardBrand={mgmtCard?.card_brand}
                    cardLastFour={mgmtCard?.card_last_four}
                    fee={managementFee}
                    frequency={billingFrequency}
                    onSuccess={(subscriptionId) => {
                      hasManuallyProgressed.current = true;
                      setMgmtSubscriptionId(subscriptionId);
                      setWizardStep('mgmt-success');
                    }}
                  />
                </Elements>
              )}

              {wizardStep === 'mgmt-success' && (
                <ManagementSuccess
                  key="mgmt-success"
                  subscriptionId={mgmtSubscriptionId}
                  onContinue={() => setWizardStep('adspend')}
                />
              )}

              {wizardStep === 'adspend' && (
                <Elements key="adspend-elements" stripe={adSpendStripePromise}>
                  <AdSpendForm
                    clientId={clientId}
                    hasCard={hasAdSpendCard}
                    cardBrand={adSpendCard?.card_brand}
                    cardLastFour={adSpendCard?.card_last_four}
                    isTest={billingConfig?.isTest}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['client-wallet', clientId] });
                      queryClient.invalidateQueries({ queryKey: ['has-paid-management-fee', clientId] });
                      setWizardStep('final');
                    }}
                  />
                </Elements>
              )}

              {wizardStep === 'final' && (
                <FinalCelebration
                  key="final"
                  onFinish={() => {
                    setIsOpen(false);
                    navigate('/hub');
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Skip link */}
          {wizardStep !== 'final' && wizardStep !== 'mgmt-success' && (
            <div className="px-6 pb-4 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                I'll do this later
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
