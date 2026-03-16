/**
 * Edge function invocation helper with auth headers.
 * Calls Supabase edge functions with service role key and billing secret.
 */

export interface EdgeFunctionResponse {
  status: number;
  data: unknown;
}

/**
 * Invokes a Supabase edge function by name.
 * Includes Authorization (service role) and x-billing-secret headers.
 */
export async function invokeEdgeFunction(
  name: string,
  body?: Record<string, unknown>,
  method: string = 'POST'
): Promise<EdgeFunctionResponse> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const billingSecret = process.env.BILLING_EDGE_SECRET;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is not set.');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }
  if (!billingSecret) {
    throw new Error(
      'BILLING_EDGE_SECRET is not set. Copy .env.test.example to .env.test and fill in values.'
    );
  }

  const url = `${supabaseUrl}/functions/v1/${name}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceRoleKey}`,
    'x-billing-secret': billingSecret,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  let data: unknown;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, data };
}
