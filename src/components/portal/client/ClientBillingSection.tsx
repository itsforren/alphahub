import { ClientWalletCard } from './ClientWalletCard';
import { ClientPaymentHistory } from './ClientPaymentHistory';

interface ClientBillingSectionProps {
  clientId: string;
}

export function ClientBillingSection({ clientId }: ClientBillingSectionProps) {
  return (
    <div className="space-y-6">
      <ClientWalletCard clientId={clientId} />
      <ClientPaymentHistory clientId={clientId} />
    </div>
  );
}
