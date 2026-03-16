import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Elements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/config/stripe';
import { CardCaptureFormInner } from '@/components/portal/PaymentMethodCard';

interface AddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  stripeAccount: 'ad_spend' | 'management';
}

const ACCOUNT_LABELS: Record<'ad_spend' | 'management', string> = {
  ad_spend: 'Ad Spend',
  management: 'Management Fees',
};

export function AddCardModal({ open, onOpenChange, clientId, stripeAccount }: AddCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            This card will be used for {ACCOUNT_LABELS[stripeAccount]}.
          </DialogDescription>
        </DialogHeader>
        <Elements stripe={getStripePromise(stripeAccount)}>
          <CardCaptureFormInner
            clientId={clientId}
            stripeAccount={stripeAccount}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}
