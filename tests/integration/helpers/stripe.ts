/**
 * Stripe test mode helpers.
 * CRITICAL: Live key guard prevents accidental production charges.
 */

/**
 * Returns the Stripe test secret key from env.
 * Throws if key is missing or is a live key.
 */
export function getStripeTestKey(): string {
  const key = process.env.STRIPE_TEST_SECRET_KEY;

  if (!key) {
    throw new Error(
      'STRIPE_TEST_SECRET_KEY is not set. Copy .env.test.example to .env.test and fill in values.'
    );
  }

  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) {
    throw new Error(
      'REFUSING TO RUN TESTS WITH LIVE STRIPE KEY. ' +
      'STRIPE_TEST_SECRET_KEY must be a test-mode key (sk_test_* or rk_test_*). ' +
      'Using a live key would charge real customers.'
    );
  }

  return key;
}

/**
 * Helper to make authenticated Stripe API requests.
 */
async function stripeRequest(
  path: string,
  body: Record<string, string>,
  method: string = 'POST'
): Promise<Record<string, unknown>> {
  const key = getStripeTestKey();

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Stripe API error (${response.status}): ${JSON.stringify(data.error || data)}`
    );
  }

  return data as Record<string, unknown>;
}

/**
 * Creates a PaymentIntent in Stripe test mode.
 * Automatically sets confirm=true, off_session=true, metadata[source]=integration_test.
 */
export async function createTestPaymentIntent(params: {
  customerId: string;
  paymentMethodId: string;
  amountCents: number;
  metadata?: Record<string, string>;
}): Promise<Record<string, unknown>> {
  const body: Record<string, string> = {
    amount: String(params.amountCents),
    currency: 'usd',
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    confirm: 'true',
    off_session: 'true',
    'metadata[source]': 'integration_test',
  };

  // Add any extra metadata
  if (params.metadata) {
    for (const [k, v] of Object.entries(params.metadata)) {
      body[`metadata[${k}]`] = v;
    }
  }

  return stripeRequest('/payment_intents', body);
}

/**
 * Creates a Stripe test customer.
 */
export async function createTestCustomer(name: string): Promise<Record<string, unknown>> {
  return stripeRequest('/customers', {
    name,
    'metadata[source]': 'integration_test',
  });
}

/**
 * Attaches pm_card_visa (Stripe test token) to a customer.
 * Returns the payment method ID.
 */
export async function attachTestPaymentMethod(customerId: string): Promise<string> {
  // Create a payment method using the test card token
  const pm = await stripeRequest('/payment_methods', {
    type: 'card',
    'card[token]': 'tok_visa',
  });

  const pmId = pm.id as string;

  // Attach to customer
  await stripeRequest(`/payment_methods/${pmId}/attach`, {
    customer: customerId,
  });

  // Set as default payment method
  await stripeRequest(`/customers/${customerId}`, {
    'invoice_settings[default_payment_method]': pmId,
  });

  return pmId;
}
