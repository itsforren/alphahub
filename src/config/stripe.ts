import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';

let keysPromise: Promise<{ management: string; ad_spend: string }> | null = null;

function fetchKeys() {
  if (!keysPromise) {
    keysPromise = supabase.functions
      .invoke('get-stripe-config')
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('Failed to fetch Stripe config:', error);
          return { management: '', ad_spend: '' };
        }
        return {
          management: data.management_publishable_key || '',
          ad_spend: data.ad_spend_publishable_key || '',
        };
      });
  }
  return keysPromise;
}

let managementStripe: Promise<Stripe | null> | null = null;
let adSpendStripe: Promise<Stripe | null> | null = null;

export function getStripePromise(account: 'management' | 'ad_spend'): Promise<Stripe | null> {
  if (account === 'management') {
    if (!managementStripe) {
      managementStripe = fetchKeys().then((k) =>
        k.management ? loadStripe(k.management) : null
      );
    }
    return managementStripe;
  } else {
    if (!adSpendStripe) {
      adSpendStripe = fetchKeys().then((k) =>
        k.ad_spend ? loadStripe(k.ad_spend) : null
      );
    }
    return adSpendStripe;
  }
}
