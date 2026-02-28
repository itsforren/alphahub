import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet, TrendingUp, RefreshCw, DollarSign, Shield, Lock, CheckCircle2, CreditCard } from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/config/stripe';
import { usePaymentMethods, useCreateSetupIntent, useSavePaymentMethod } from '@/hooks/usePaymentMethods';
import { useCreateOrUpdateWallet, useClientWallet } from '@/hooks/useClientWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdSpendSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onComplete?: () => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '14px',
      color: '#e2e8f0',
      '::placeholder': { color: '#64748b' },
    },
    invalid: { color: '#ef4444' },
  },
};

const MIN_MONTHLY_CAP = 1000;
const MIN_RECHARGE_AMOUNT = 200;
const DEFAULT_RECHARGE_AMOUNT = 250;
const LOW_BALANCE_THRESHOLD = 150;

function TrustBadges() {
  return (
    <div className="flex items-center justify-center gap-4 mt-3 mb-1">
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

function SetupForm({
  clientId,
  onComplete,
  hasAdSpendCard,
}: {
  clientId: string;
  onComplete?: () => void;
  hasAdSpendCard: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [monthlyCap, setMonthlyCap] = useState('1000');
  const [rechargeAmount, setRechargeAmount] = useState(String(DEFAULT_RECHARGE_AMOUNT));
  const [isProcessing, setIsProcessing] = useState(false);
  const createSetupIntent = useCreateSetupIntent();
  const savePaymentMethod = useSavePaymentMethod();
  const createOrUpdateWallet = useCreateOrUpdateWallet();
  const { data: wallet } = useClientWallet(clientId);

  const capValue = parseFloat(monthlyCap) || 0;
  const rechargeValue = parseFloat(rechargeAmount) || 0;
  const isValid = capValue >= MIN_MONTHLY_CAP && rechargeValue >= MIN_RECHARGE_AMOUNT;

  const existingBalance = wallet?.ad_spend_balance ?? 0;
  const shouldSkipInitialCharge = existingBalance >= LOW_BALANCE_THRESHOLD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsProcessing(true);
    try {
      // If no card on file, save one first
      if (!hasAdSpendCard && stripe && elements) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          toast.error('Please enter your card details');
          setIsProcessing(false);
          return;
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
          setIsProcessing(false);
          return;
        }

        await savePaymentMethod.mutateAsync({
          clientId,
          stripeAccount: 'ad_spend',
          setupIntentId: result.setupIntent.id,
        });
      }

      // Create/update wallet with settings
      await createOrUpdateWallet.mutateAsync({
        client_id: clientId,
        auto_charge_amount: rechargeValue,
        low_balance_threshold: LOW_BALANCE_THRESHOLD,
        auto_billing_enabled: true,
        billing_mode: 'auto_stripe',
        monthly_ad_spend_cap: capValue,
      });

      // Only create billing record for initial deposit if balance is below threshold
      if (!shouldSkipInitialCharge) {
        const today = new Date().toISOString().split('T')[0];
        const { data: billingRecord, error: billingError } = await supabase
          .from('billing_records')
          .insert({
            client_id: clientId,
            billing_type: 'ad_spend',
            amount: rechargeValue,
            status: 'pending',
            billing_period_start: today,
            due_date: today,
            notes: `Initial ad spend deposit - Monthly cap: $${capValue.toLocaleString()}`,
          })
          .select()
          .single();

        if (billingError) throw billingError;

        const { error: invoiceError } = await supabase.functions.invoke('create-stripe-invoice', {
          body: { billing_record_id: billingRecord.id },
        });

        if (invoiceError) {
          console.error('Invoice creation error:', invoiceError);
          toast.error('Wallet configured but payment processing failed. An admin will follow up.');
        } else {
          toast.success(`Ad spend wallet set up! $${rechargeValue} initial deposit processing.`);
        }
      } else {
        toast.success(`Ad spend wallet configured! Your current balance of $${existingBalance.toFixed(2)} will be used. Auto-recharge of $${rechargeValue} kicks in when balance drops below $${LOW_BALANCE_THRESHOLD}.`);
      }

      onComplete?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set up ad spend');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Existing Balance Notice */}
      {existingBalance > 0 && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-foreground">
              Current wallet balance: <strong className="text-emerald-500">${existingBalance.toFixed(2)}</strong>
            </span>
          </div>
          {shouldSkipInitialCharge && (
            <p className="text-xs text-muted-foreground mt-2 pl-6">
              Your balance is above ${LOW_BALANCE_THRESHOLD}, so you won't be charged until it drops below that threshold.
            </p>
          )}
        </div>
      )}

      {/* Monthly Cap Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Monthly Ad Spend Limit</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
          <Input
            type="number"
            min={MIN_MONTHLY_CAP}
            step="100"
            value={monthlyCap}
            onChange={(e) => setMonthlyCap(e.target.value)}
            className="pl-8 text-lg h-12"
            placeholder="1,000"
          />
        </div>
        {capValue > 0 && capValue < MIN_MONTHLY_CAP && (
          <p className="text-xs text-destructive">
            Minimum monthly cap is ${MIN_MONTHLY_CAP.toLocaleString()}
          </p>
        )}
      </div>

      {/* Recharge Amount Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Auto-Recharge Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
          <Input
            type="number"
            min={MIN_RECHARGE_AMOUNT}
            step="50"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            className="pl-8 text-lg h-12"
            placeholder="250"
          />
        </div>
        {rechargeValue > 0 && rechargeValue < MIN_RECHARGE_AMOUNT && (
          <p className="text-xs text-destructive">
            Minimum recharge amount is ${MIN_RECHARGE_AMOUNT}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          This amount will be charged when your balance drops below ${LOW_BALANCE_THRESHOLD}
        </p>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {!shouldSkipInitialCharge && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-primary" />
            <span>Initial deposit: <strong>${rechargeValue > 0 ? rechargeValue : '—'}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4 text-primary" />
          <span>Auto-recharge: <strong>${rechargeValue > 0 ? rechargeValue : '—'}</strong> when balance drops below <strong>${LOW_BALANCE_THRESHOLD}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span>Monthly cap: <strong>${capValue > 0 ? capValue.toLocaleString() : '—'}</strong></span>
        </div>
      </div>

      {/* Card input if no card on file */}
      {!hasAdSpendCard && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Card Details</Label>
          <div className="p-3 rounded-lg border border-border bg-background/50">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
          <TrustBadges />
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={!isValid || isProcessing} className="w-full gap-2">
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          {shouldSkipInitialCharge
            ? 'Confirm Settings'
            : `Confirm & Pay $${rechargeValue > 0 ? rechargeValue : 0}`
          }
        </Button>
      </DialogFooter>

      {/* Trust symbols at bottom */}
      {hasAdSpendCard && <TrustBadges />}
    </form>
  );
}

export function AdSpendSetupDialog({ open, onOpenChange, clientId, onComplete }: AdSpendSetupDialogProps) {
  const { data: methods } = usePaymentMethods(clientId);
  const hasAdSpendCard = (methods || []).some(m => m.stripe_account === 'ad_spend');
  const stripePromise = getStripePromise('ad_spend');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Set Up Ad Spend
          </DialogTitle>
          <DialogDescription>
            Configure your monthly ad spend budget and auto-recharge settings.
          </DialogDescription>
        </DialogHeader>

        <Elements stripe={stripePromise}>
          <SetupForm
            clientId={clientId}
            onComplete={() => {
              onOpenChange(false);
              onComplete?.();
            }}
            hasAdSpendCard={hasAdSpendCard}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}
