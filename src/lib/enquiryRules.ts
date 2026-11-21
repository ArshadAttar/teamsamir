/**
 * Enquiry form rules, shared by the browser form (src/pages/ContactPage.tsx) and the
 * server (api/enquiry.ts). The server is the one that counts: anyone can skip the
 * browser checks, so api/enquiry.ts runs validateEnquiry() on every request.
 *
 * No imports with side effects: this file is bundled into the Vercel Function too.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 50;
export const EMAIL_MAX = 100;
export const PHONE_LEN = 10;
/** Longest accepted value for the plan / form title / page fields */
export const PLAN_MAX = 120;
export const FORM_TITLE_MAX = 120;
export const PAGE_URL_MAX = 300;

export const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;
export const EMAIL_RE = /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[A-Za-z]{2,}$/;
/** Indian mobile: 10 digits starting 6-9 */
export const IN_MOBILE_RE = /^[6-9]\d{9}$/;
/** Plan / form title: letters, digits, spaces and simple punctuation only (no < > = { } etc.) */
export const SAFE_TEXT_RE = /^[\p{L}\p{N} .,'’()/&+–—:-]*$/u;
/** Browser-generated id of one form fill (crypto.randomUUID) */
export const SUBMISSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CONTACT_METHODS = ['Phone Call', 'WhatsApp', 'Email'] as const;

export const GOALS = [
  'Fat Loss / Weight Management',
  'Muscle Building',
  'Strength Training',
  'General Fitness & Health',
  'Flexibility & Posture',
  'Senior Fitness / Mobility',
  'Other',
] as const;

/** What the browser sends to /api/enquiry */
export interface EnquiryRequest {
  fullName: string;
  email: string;
  mobileNumber: string;
  whatsappNumber: string;
  goal: string;
  /** Human-readable plan label */
  plan: string;
  contactMethod: string;
  /** Heading of the form the visitor saw */
  formTitle: string;
  pageUrl: string;
  /** Honeypot: must stay empty (bots fill it) */
  website: string;
  /** Milliseconds between the form showing and submit */
  elapsedMs: number;
  /** Cloudflare Turnstile token */
  turnstileToken: string;
  /** Same id for retries of one form fill: the server ignores repeats */
  submissionId: string;
}

/** Cleaned, validated enquiry */
export interface CleanEnquiry {
  fullName: string;
  email: string;
  mobileNumber: string;
  whatsappNumber: string;
  goal: string;
  plan: string;
  contactMethod: (typeof CONTACT_METHODS)[number];
  formTitle: string;
  pageUrl: string;
  submissionId: string;
}

/** Removes control characters and collapses whitespace */
const tidy = (v: unknown): string =>
  typeof v === 'string'
    ? v
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

/**
 * Checks every field of an enquiry. Returns the cleaned data, or the first problem
 * (a message safe to show to the visitor). Unknown fields are ignored.
 * `allowedOrigins`: the page URL must be on one of these sites.
 */
export function validateEnquiry(
  body: unknown,
  allowedOrigins: string[]
): { ok: true; data: CleanEnquiry } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid request.' };
  const b = body as Record<string, unknown>;

  const fullName = tidy(b.fullName);
  if (fullName.length < NAME_MIN) return { ok: false, error: 'Name is required.' };
  if (fullName.length > NAME_MAX) return { ok: false, error: `Name must be at most ${NAME_MAX} characters.` };
  if (!NAME_RE.test(fullName)) return { ok: false, error: 'Use letters and spaces only in the name.' };

  const email = tidy(b.email);
  if (email.length > EMAIL_MAX) return { ok: false, error: `Email must be at most ${EMAIL_MAX} characters.` };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email, e.g. name@example.com.' };

  const mobileNumber = typeof b.mobileNumber === 'string' ? b.mobileNumber.trim() : '';
  if (!IN_MOBILE_RE.test(mobileNumber)) return { ok: false, error: 'Enter a valid 10-digit mobile number.' };
  const whatsappNumber = typeof b.whatsappNumber === 'string' ? b.whatsappNumber.trim() : '';
  if (!IN_MOBILE_RE.test(whatsappNumber)) return { ok: false, error: 'Enter a valid 10-digit WhatsApp number.' };

  const goal = tidy(b.goal);
  if (goal && !(GOALS as readonly string[]).includes(goal)) return { ok: false, error: 'Choose a goal from the list.' };

  const plan = tidy(b.plan);
  if (plan.length > PLAN_MAX || !SAFE_TEXT_RE.test(plan)) return { ok: false, error: 'Choose a plan from the list.' };

  const contactMethod = tidy(b.contactMethod);
  if (!(CONTACT_METHODS as readonly string[]).includes(contactMethod)) {
    return { ok: false, error: 'Choose how we should contact you.' };
  }

  const formTitle = tidy(b.formTitle);
  if (formTitle.length > FORM_TITLE_MAX || !SAFE_TEXT_RE.test(formTitle)) return { ok: false, error: 'Invalid request.' };

  const pageUrl = tidy(b.pageUrl);
  let pageOk = false;
  if (pageUrl.length <= PAGE_URL_MAX) {
    try {
      const u = new URL(pageUrl);
      pageOk = (u.protocol === 'https:' || u.protocol === 'http:') && allowedOrigins.includes(u.origin);
    } catch {
      pageOk = false;
    }
  }
  if (!pageOk) return { ok: false, error: 'Invalid request.' };

  const submissionId = typeof b.submissionId === 'string' ? b.submissionId : '';
  if (!SUBMISSION_ID_RE.test(submissionId)) return { ok: false, error: 'Invalid request.' };

  return {
    ok: true,
    data: {
      fullName,
      email,
      mobileNumber,
      whatsappNumber,
      goal,
      plan,
      contactMethod: contactMethod as CleanEnquiry['contactMethod'],
      formTitle,
      pageUrl,
      submissionId,
    },
  };
}

/** The message shown when the 20-per-day limit is reached */
export const RATE_LIMIT_MESSAGE = 'You have reached the submission limit. Please try again later.';
