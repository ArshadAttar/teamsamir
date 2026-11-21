/**
 * POST /api/enquiry – the only way into the enquiry backend.
 *
 * The browser form posts here (same site). This function:
 *   1. accepts POST only, JSON only, from our own site only (Origin / Sec-Fetch-Site),
 *      and at most MAX_BODY_BYTES;
 *   2. drops honeypot / too-fast submits (answers "ok" so bots learn nothing);
 *   3. validates and cleans every field (src/lib/enquiryRules.ts);
 *   4. verifies the Cloudflare Turnstile token with Cloudflare (server side);
 *   5. forwards the enquiry to the Google Apps Script web app with a shared secret and a
 *      hashed client IP. Apps Script (docs/google-apps-script/Code.gs) rejects anything
 *      without the secret, applies the 20-per-24-hours limit per IP (stored in Apps Script,
 *      so it is shared across all function instances), drops repeats, then saves to the
 *      sheet and emails.
 *
 * Environment variables (Vercel → Settings → Environment Variables; never VITE_-prefixed,
 * so they never reach the browser):
 *   APPS_SCRIPT_URL       Apps Script web app URL (…/exec)
 *   FORM_SHARED_SECRET    long random string, also set in Apps Script Script Properties
 *   TURNSTILE_SECRET_KEY  Cloudflare Turnstile secret key
 *   ALLOWED_ORIGINS       optional, comma-separated extra origins, e.g. a custom domain
 *   TURNSTILE_DISABLED    "true" skips Turnstile (ignored in production; for local tests)
 */

import { RATE_LIMIT_MESSAGE, validateEnquiry } from '../src/lib/enquiryRules.js';

declare const process: { env: Record<string, string | undefined> };

const MAX_BODY_BYTES = 8 * 1024;
const MIN_FILL_MS = 2500;
const TURNSTILE_TIMEOUT_MS = 8000;
const APPS_SCRIPT_TIMEOUT_MS = 20000;
const TURNSTILE_ACTION = 'enquiry';

const PRODUCTION_ORIGIN = 'https://teamsamir.vercel.app';
const GENERIC_ERROR = 'Could not send your request. Please try again or call us.';

/** Sites allowed to post the form */
function allowedOrigins(env = process.env): string[] {
  const list = new Set<string>([PRODUCTION_ORIGIN]);
  for (const o of (env.ALLOWED_ORIGINS ?? '').split(',')) {
    const t = o.trim().replace(/\/+$/, '');
    if (/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(t)) list.add(t);
  }
  // This deployment's own URLs (preview deployments, the production alias)
  for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host && /^[a-z0-9.-]+$/i.test(host)) list.add(`https://${host}`);
  }
  if (env.VERCEL_ENV !== 'production' && env.VERCEL_ENV !== 'preview') {
    list.add('http://localhost:3000');
    list.add('http://localhost:4173');
  }
  return [...list];
}

const json = (status: number, body: Record<string, unknown>, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });

/**
 * Client IP as seen by Vercel. Vercel sets these headers itself at its edge and
 * overwrites any value the visitor sends, so they can't be spoofed on Vercel. We never
 * read the visitor-controlled left-most X-Forwarded-For entry.
 */
function clientIp(headers: Headers): string {
  const ip = headers.get('x-real-ip') || headers.get('x-vercel-forwarded-for')?.split(',')[0] || '';
  const t = ip.trim();
  return /^[0-9a-f:.]{3,45}$/i.test(t) ? t : 'unknown';
}

/** HMAC-SHA256 of the IP, so the raw IP is never sent to or stored in Google */
async function hashIp(ip: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`ip:${ip}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Server-side Turnstile check: success, our hostname and our action. In production a
 * result made with Cloudflare's always-pass testing keys is refused too.
 */
async function verifyTurnstile(
  token: string,
  ip: string,
  secret: string,
  hostnames: string[],
  production: boolean
): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (ip !== 'unknown') form.set('remoteip', ip);
  try {
    const res = await fetchWithTimeout(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: form },
      TURNSTILE_TIMEOUT_MS
    );
    const data = (await res.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
      metadata?: { result_with_testing_key?: boolean };
    };
    if (!data.success) return false;
    if (production && data.metadata?.result_with_testing_key) return false;
    if (data.action && data.action !== TURNSTILE_ACTION) return false;
    if (data.hostname && !hostnames.includes(data.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  const env = process.env;
  const origins = allowedOrigins(env);

  // 1. Same-site only (blocks cross-site form posts / CSRF and other sites using this endpoint)
  const origin = request.headers.get('origin');
  if (!origin || !origins.includes(origin)) return json(403, { ok: false, error: 'Forbidden.' });
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return json(403, { ok: false, error: 'Forbidden.' });

  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(type)) return json(415, { ok: false, error: 'Unsupported content type.' });

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Request too large.' });

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(400, { ok: false, error: 'Invalid request.' });
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Request too large.' });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'Invalid request.' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { ok: false, error: 'Invalid request.' });
  const b = body as Record<string, unknown>;

  // 2. Bots: honeypot filled, or submitted faster than a person can type. Pretend success.
  if ((typeof b.website === 'string' && b.website.trim() !== '') || !(Number(b.elapsedMs) >= MIN_FILL_MS)) {
    return json(200, { ok: true });
  }

  // 3. Strict validation
  const checked = validateEnquiry(body, origins);
  if (!checked.ok) return json(400, { ok: false, error: checked.error });

  // Server configuration (never sent to the browser)
  const scriptUrl = env.APPS_SCRIPT_URL ?? '';
  const sharedSecret = env.FORM_SHARED_SECRET ?? '';
  const turnstileSecret = env.TURNSTILE_SECRET_KEY ?? '';
  const turnstileOff = env.TURNSTILE_DISABLED === 'true' && env.VERCEL_ENV !== 'production';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(scriptUrl) || sharedSecret.length < 32 || (!turnstileSecret && !turnstileOff)) {
    console.error('Enquiry endpoint is not configured (APPS_SCRIPT_URL / FORM_SHARED_SECRET / TURNSTILE_SECRET_KEY).');
    return json(503, { ok: false, error: 'The enquiry form is temporarily unavailable. Please call or WhatsApp us.' });
  }

  const ip = clientIp(request.headers);

  // 4. Bot check with Cloudflare
  if (!turnstileOff) {
    const hostnames = origins.map((o) => new URL(o).hostname);
    const human = await verifyTurnstile(
      typeof b.turnstileToken === 'string' ? b.turnstileToken : '',
      ip,
      turnstileSecret,
      hostnames,
      env.VERCEL_ENV === 'production'
    );
    if (!human) return json(403, { ok: false, error: 'Security check failed. Please refresh the page and try again.', code: 'CAPTCHA' });
  }

  // 5. Forward to Apps Script (rate limit + duplicate check + save + email happen there)
  type ScriptResult = { ok?: boolean; code?: string; error?: string };
  let result: ScriptResult | null = null;
  try {
    const res = await fetchWithTimeout(
      scriptUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...checked.data, secret: sharedSecret, ipHash: await hashIp(ip, sharedSecret) }),
        redirect: 'follow',
      },
      APPS_SCRIPT_TIMEOUT_MS
    );
    result = (await res.json().catch(() => null)) as ScriptResult | null;
  } catch {
    result = null;
  }
  const r = result as ScriptResult | null;

  if (r?.ok) return json(200, { ok: true });
  if (r?.code === 'RATE_LIMIT') return json(429, { ok: false, error: RATE_LIMIT_MESSAGE, code: 'RATE_LIMIT' }, { 'Retry-After': '3600' });
  if (r?.code === 'BUSY') return json(503, { ok: false, error: 'We are receiving many requests right now. Please try again in a little while.' }, { 'Retry-After': '600' });
  if (r?.code === 'INVALID' && typeof r.error === 'string' && r.error.length < 120) {
    return json(400, { ok: false, error: r.error });
  }
  if (r?.code === 'FORBIDDEN') console.error('Apps Script rejected the shared secret: FORM_SHARED_SECRET differs from the Script Property.');
  return json(502, { ok: false, error: GENERIC_ERROR });
}

const notAllowed = () => json(405, { ok: false, error: 'Method not allowed.' }, { Allow: 'POST' });
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
export const OPTIONS = notAllowed;
