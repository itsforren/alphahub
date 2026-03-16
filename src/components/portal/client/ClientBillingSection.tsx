import { ClientWalletCard } from './ClientWalletCard';
import { ClientPaymentMethodTabs } from './ClientPaymentMethodTabs';
import { ClientPaymentHistory } from './ClientPaymentHistory';

interface ClientBillingSectionProps {
  clientId: string;
}

export function ClientBillingSection({ clientId }: ClientBillingSectionProps) {
  return (
    <div className="space-y-6">
      <ClientWalletCard clientId={clientId} />
      <ClientPaymentMethodTabs clientId={clientId} />
      <ClientPaymentHistory clientId={clientId} />
    </div>
  );
}
