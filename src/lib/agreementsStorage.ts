import { supabase } from '@/integrations/supabase/client';

const AGREEMENTS_BUCKET = 'agreements';

function isValidUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function extractAgreementsObjectPath(value: string): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;

  // If we already have a storage path like "<clientId>/agreement-123.pdf".
  if (!isValidUrl(raw)) return raw;

  const url = new URL(raw);
  const pathname = url.pathname;

  // Common patterns:
  // /storage/v1/object/public/agreements/<path>
  // /storage/v1/object/sign/agreements/<path>
  // /storage/v1/object/agreements/<path>
  const match = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/agreements\/(.+)$/);
  if (match?.[1]) return decodeURIComponent(match[1]);

  const matchDirect = pathname.match(/\/storage\/v1\/object\/agreements\/(.+)$/);
  if (matchDirect?.[1]) return decodeURIComponent(matchDirect[1]);

  const matchAlt = pathname.match(/\/object\/(?:public|sign)\/agreements\/(.+)$/);
  if (matchAlt?.[1]) return decodeURIComponent(matchAlt[1]);

  return null;
}

export async function getSignedAgreementsDownloadUrl(
  value: string,
  expiresInSeconds = 60 * 10
): Promise<string> {
  const objectPath = extractAgreementsObjectPath(value);
  if (!objectPath) throw new Error('Missing agreement file path');

  const { data, error } = await supabase.storage
    .from(AGREEMENTS_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Failed to create signed URL');

  return data.signedUrl;
}
