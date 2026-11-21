import type { EnquiryRequest } from './enquiryRules';

/**
 * Sends the enquiry form to our own server function (api/enquiry.ts), which checks it,
 * verifies the Turnstile bot check and forwards it to the Google Apps Script backend.
 * The Apps Script URL is a server-only setting: it never appears in the browser code.
 */

export type EnquiryPayload = EnquiryRequest;

// Trailing slash: vercel.json has trailingSlash: true (no redirect round trip)
const ENDPOINT = '/api/enquiry/';
const TIMEOUT_MS = 30000;

/** Error with the server's reason code (e.g. RATE_LIMIT, CAPTCHA) */
export class EnquiryError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

export async function submitEnquiry(payload: EnquiryPayload): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; code?: string } | null;
    if (!res.ok || !data?.ok) {
      throw new EnquiryError(data?.error || 'Could not send your request. Please try again.', data?.code);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new EnquiryError('The request timed out. Please check your connection and try again.');
    }
    if (err instanceof TypeError) {
      throw new EnquiryError('Network error. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
