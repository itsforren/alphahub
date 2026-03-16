import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, Loader2, CheckCircle, Shield, Trash2 } from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/config/stripe';
import {
  usePaymentMethods,
  useSyncStripeCards,
  useCreateSetupIntent,
  useSavePaymentMethod,
  useDeletePaymentMethod,
  type PaymentMethod,
} from '@/hooks/usePaymentMethods';
import { toast } from 'sonner';
import type { Stripe } from '@stripe/stripe-js';

interface PaymentMethodCardProps {
  clientId: string;
  isAdmin?: boolean;
}

export const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '14px',
      color: '#e2e8f0',
      '::placeholder': { color: '#64748b' },
    },
    invalid: { color: '#ef4444' },
  },
};

// Inner form that saves card to ONE Stripe account
export function CardCaptureFormInner({
  clientId,
  stripeAccount,
  onSuccess,
  onCancel,
}: {
  clientId: string;
  stripeAccount: 'management' | 'ad_spend';
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const createSetupIntent = useCreateSetupIntent();
  const savePaymentMethod = useSavePaymentMethod();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setIsProcessing(true);
    try {
      const { client_secret } = await createSetupIntent.mutateAsync({
        clientId,
        stripeAccount,
      });

      const result = await stripe.confirmCardSetup(client_secret, {
        payment_method: { card: cardElement },
      });

      if (result.error) {
        toast.error(result.error.message || 'Card setup failed');
        return;
      }

      await savePaymentMethod.mutateAsync({
        clientId,
        stripeAccount,
        setupIntentId: result.setupIntent.id,
      });

      toast.success('Payment method saved');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="p-3 rounded-lg border border-border bg-background/50">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!stripe || isProcessing}>
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Shield className="w-4 h-4 mr-1" />}
          Save Card
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Wrapper that provides the correct Stripe Elements provider per account
function SingleAccountCardForm({
  clientId,
  stripeAccount,
  onSuccess,
  onCancel,
}: {
  clientId: string;
  stripeAccount: 'management' | 'ad_spend';
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripePromise = getStripePromise(stripeAccount);

  return (
    <Elements stripe={stripePromise}>
      <CardCaptureFormInner
        clientId={clientId}
        stripeAccount={stripeAccount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}

// Display a single card
function CardDisplay({
  pm,
  isAdmin,
  clientId,
}: {
  pm: PaymentMethod;
  isAdmin?: boolean;
  clientId: string;
}) {
  const deletePm = useDeletePaymentMethod();

  const handleDelete = () => {
    if (!confirm('Remove this payment method?')) return;
    deletePm.mutate(
      { paymentMethodId: pm.id, clientId },
      { onSuccess: () => toast.success('Payment method removed') }
    );
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
      <CreditCard className="w-5 h-5 text-primary" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium capitalize">
          {pm.card_brand || 'Card'} ending in {pm.card_last_four}
        </div>
        <div className="text-xs text-muted-foreground">
          Expires {pm.card_exp_month}/{pm.card_exp_year}
        </div>
      </div>
      {pm.is_default && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={handleDelete}
          disabled={deletePm.isPending}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

// Section for one Stripe account — owns its own showForm state
function AccountSection({
  clientId,
  stripeAccount,
  label,
  methods,
  isAdmin,
}: {
  clientId: string;
  stripeAccount: 'ad_spend' | 'management';
  label: string;
  methods: PaymentMethod[];
  isAdmin?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {!showForm && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Card
          </Button>
        )}
      </div>

      {methods.length > 0 && (
        <div className="space-y-2">
          {methods.map((pm) => (
            <CardDisplay key={pm.id} pm={pm} isAdmin={isAdmin} clientId={clientId} />
          ))}
        </div>
      )}

      {showForm ? (
        <SingleAccountCardForm
          clientId={clientId}
          stripeAccount={stripeAccount}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      ) : methods.length === 0 ? (
        <div className="p-3 rounded-lg border border-dashed border-border/50 text-center">
          <p className="text-xs text-muted-foreground">No payment method on file</p>
        </div>
      ) : null}
    </div>
  );
}

export function PaymentMethodCard({ clientId, isAdmin }: PaymentMethodCardProps) {
  const { data: methods, isLoading } = usePaymentMethods(clientId);

  // Auto-sync existing Stripe cards on mount
  useSyncStripeCards(clientId);

  const managementMethods = methods?.filter(m => m.stripe_account === 'management') || [];
  const adSpendMethods = methods?.filter(m => m.stripe_account === 'ad_spend') || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="w-4 h-4 text-primary" />
          Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <AccountSection
              clientId={clientId}
              stripeAccount="management"
              label="Management Fees"
              methods={managementMethods}
              isAdmin={isAdmin}
            />
            <div className="border-t border-border/30" />
            <AccountSection
              clientId={clientId}
              stripeAccount="ad_spend"
              label="Ad Spend"
              methods={adSpendMethods}
              isAdmin={isAdmin}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
