import { useState } from 'react';
import { CreditCard, Plus, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePaymentMethods,
  useSyncStripeCards,
  useSetDefaultPaymentMethod,
  type PaymentMethod,
} from '@/hooks/usePaymentMethods';
import { CardExpiryWarning } from './CardExpiryWarning';
import { AddCardModal } from './AddCardModal';

interface ClientPaymentMethodTabsProps {
  clientId: string;
}

const TAB_CONFIG: {
  value: 'ad_spend' | 'management';
  label: string;
  chargeLabel: string;
}[] = [
  { value: 'ad_spend', label: 'Ad Spend', chargeLabel: 'ad spend charges' },
  { value: 'management', label: 'Management', chargeLabel: 'management fees' },
];

function CardRow({
  pm,
  clientId,
  stripeAccount,
  setDefault,
}: {
  pm: PaymentMethod;
  clientId: string;
  stripeAccount: 'ad_spend' | 'management';
  setDefault: ReturnType<typeof useSetDefaultPaymentMethod>;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
      <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium capitalize">
          {pm.card_brand || 'Card'} ending in {pm.card_last_four}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          Expires {pm.card_exp_month}/{pm.card_exp_year}
          <CardExpiryWarning expMonth={pm.card_exp_month} expYear={pm.card_exp_year} />
        </div>
      </div>
      {pm.is_default ? (
        <div className="flex items-center gap-1 text-green-500 flex-shrink-0">
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs font-medium">Default</span>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs flex-shrink-0"
          disabled={setDefault.isPending}
          onClick={() =>
            setDefault.mutate({
              clientId,
              stripeAccount,
              paymentMethodDbId: pm.id,
            })
          }
        >
          Set as Default
        </Button>
      )}
    </div>
  );
}

function TabContent({
  cards,
  clientId,
  stripeAccount,
  chargeLabel,
  setDefault,
  onAddCard,
}: {
  cards: PaymentMethod[];
  clientId: string;
  stripeAccount: 'ad_spend' | 'management';
  chargeLabel: string;
  setDefault: ReturnType<typeof useSetDefaultPaymentMethod>;
  onAddCard: () => void;
}) {
  const defaultCard = cards.find((c) => c.is_default);

  return (
    <div className="space-y-3">
      {cards.length > 0 ? (
        <div className="space-y-2">
          {cards.map((pm) => (
            <CardRow
              key={pm.id}
              pm={pm}
              clientId={clientId}
              stripeAccount={stripeAccount}
              setDefault={setDefault}
            />
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-lg border border-dashed border-border/50 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No payment method on file</p>
          <Button size="sm" onClick={onAddCard}>
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        </div>
      )}

      {cards.length > 0 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddCard}>
          <Plus className="w-3 h-3 mr-1" />
          Add Card
        </Button>
      )}

      {defaultCard && (
        <p className="text-xs text-muted-foreground">
          {defaultCard.card_brand || 'Card'} ending in {defaultCard.card_last_four} will be charged
          for {chargeLabel}.
        </p>
      )}
    </div>
  );
}

export function ClientPaymentMethodTabs({ clientId }: ClientPaymentMethodTabsProps) {
  const { data: methods, isLoading } = usePaymentMethods(clientId);
  const setDefault = useSetDefaultPaymentMethod();
  const [showCardModal, setShowCardModal] = useState(false);
  const [activeModalAccount, setActiveModalAccount] = useState<'ad_spend' | 'management'>('ad_spend');

  // Auto-sync existing Stripe cards on mount
  useSyncStripeCards(clientId);

  const openAddCard = (account: 'ad_spend' | 'management') => {
    setActiveModalAccount(account);
    setShowCardModal(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="w-4 h-4 text-primary" />
          Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="ad_spend">
            <TabsList className="w-full">
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TAB_CONFIG.map((tab) => {
              const cards = methods?.filter((m) => m.stripe_account === tab.value) || [];
              return (
                <TabsContent key={tab.value} value={tab.value}>
                  <TabContent
                    cards={cards}
                    clientId={clientId}
                    stripeAccount={tab.value}
                    chargeLabel={tab.chargeLabel}
                    setDefault={setDefault}
                    onAddCard={() => openAddCard(tab.value)}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>

      <AddCardModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        clientId={clientId}
        stripeAccount={activeModalAccount}
      />
    </Card>
  );
}
