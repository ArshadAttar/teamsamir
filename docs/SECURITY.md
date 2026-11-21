# TeamSamir website – security audit and hardening

Audit date: 22 Nov 2026 · Site: https://teamsamir.vercel.app · Git checkpoint before changes: tag `pre-security-audit`

No website is 100% secure. This document lists what was found, what was changed, how it was tested and what is left.

Status labels used below:
**✅ Implemented and tested locally** · **🟡 Implemented, needs testing after deploy** · **🛠 Needs manual dashboard setup** · **➖ Not applicable**

---

## 1. Technology stack (as found)

| Part | What it is |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4, `motion`, `lucide-react`. Pages pre-rendered to static HTML at build time (`scripts/prerender.mjs`); no router package. |
| Backend | **None on Vercel before this audit.** The enquiry form posted straight from the browser to a Google Apps Script web app (`docs/google-apps-script/Code.gs`). Now a Vercel Function `api/enquiry.ts` sits in front of it. |
| Database | None. Enquiries are rows in a Google Sheet. No SQL anywhere. |
| Email | Apps Script `MailApp`, from the sheet owner's Gmail to the same Gmail (recipient fixed in code). |
| Auth | None (public marketing site, no login, no admin pages). |
| Hosting | Vercel (project `teamsamir`), GitHub repo `ArshadAttar/teamsamir`, every push to `main` deploys to production. Domain `teamsamir.vercel.app` (HTTPS + HSTS provided by Vercel). |
| Third parties | Google Fonts, Google Maps embed (contact page), WhatsApp `wa.me` links, Instagram link, Cloudflare Turnstile (new). |
| Public endpoints | Static pages and media; `POST /api/enquiry` (new); the Apps Script `/exec` URL (Google-hosted). |

## 2. Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| F1 | **HIGH** | The Apps Script URL was baked into the public JavaScript (`VITE_FORM_ENDPOINT`). Anyone could post straight to it, skipping the website: unlimited fake rows and email-quota exhaustion. | ✅ Fixed: URL is now server-only (`APPS_SCRIPT_URL`), and Apps Script refuses any post without the shared secret (`FORM_SHARED_SECRET`). |
| F2 | **HIGH** | No bot protection: the honeypot and "too fast" checks used values the sender controls. | ✅ Cloudflare Turnstile verified on the server (hostname + action checked; testing keys refused in production). Honeypot and timing kept as extra layers. |
| F3 | **HIGH** | No IP rate limit. | ✅ 20 per IP per rolling 24 h, enforced in Apps Script (shared, persistent store; not in-memory) + a site-wide hourly cap of 150. |
| F4 | MEDIUM | Server-side validation was looser than the form's (goal/plan/title free text, any page URL). | ✅ Strict allow-lists and patterns on the server (`src/lib/enquiryRules.ts`) and again in Apps Script. |
| F5 | MEDIUM | No Content-Security-Policy or Permissions-Policy. | ✅ Added (see §6); all pages tested with no CSP violations. |
| F6 | MEDIUM | Duplicate submits only de-duplicated by mobile number for 2 min. | ✅ Plus a per-form-fill submission id (10 min) and an instant double-click guard in the browser. |
| F7 | LOW | `doGet` of the Apps Script revealed the service name. | ✅ Now returns `{"ok":false}`. |
| F8 | LOW | 1 low-severity npm advisory (esbuild dev server on Windows). | ✅ `npm audit fix`; `npm audit` now reports 0. |
| F9 | LOW | Unused packages from the AI Studio template (`@google/genai`, `express`, `dotenv`, `@types/express`). | ✅ Removed (never bundled, but less attack surface and install time). |
| F10 | INFO | `Access-Control-Allow-Origin: *` on static files, `Server: Vercel` header. | ➖ Vercel defaults for public static files; nothing sensitive is served. The API sends no CORS headers (same-site only). |
| F11 | INFO | Google Sheet ID is in `Code.gs` in the repo. | ➖ Not a secret: access is controlled by Google sharing settings. Keep the sheet private. |
| F12 | INFO | Original JPG/PNG photos are public under `/media/`. | ➖ Same photos the site shows; no private data. Never put raw client uploads in `public/`. |

Checked and found **not vulnerable** (no change needed):
- **SQL injection:** no database or queries anywhere.
- **XSS:** React escapes all text. There's no `dangerouslySetInnerHTML`, `eval` or `javascript:` URL, and the email HTML is escaped in Apps Script.
- **Open redirect:** no page reads URL parameters. `//evil.com` resolves to a path on our own site.
- **Path traversal and directory listing:** Vercel serves only `dist/`. `/.env`, `/package.json` and `/docs/…` return 404, and `/assets/` doesn't list files.
- **SSRF:** the function only calls two fixed URLs (Cloudflare siteverify and the configured Apps Script URL, which must match `https://script.google.com/macros/s/…/exec`).
- **IDOR, auth bypass and deserialization:** there are no objects, logins or object deserialization. JSON parse errors are handled.
- **RCE:** no user input reaches any interpreter.
- **Secrets in Git:** no `.env` file was ever committed (checked the full history), and `.gitignore` covers `.env*` and `.vercel`.
- **Source maps:** none are published.

## 3. What changed

| File | Change |
|---|---|
| `api/enquiry.ts` (new) | Vercel Function `POST /api/enquiry`: same-site check (Origin + Sec-Fetch-Site), JSON only, 8 KB limit, honeypot/timing, strict validation, Turnstile verification, HMAC-hashed client IP, forwards to Apps Script with the shared secret, maps results to proper status codes (400/403/405/413/415/429/502/503), generic error messages, `no-store`. Other methods → 405. |
| `src/lib/enquiryRules.ts` (new) | One set of validation rules for the form and the server. |
| `src/components/Turnstile.tsx` (new) | Turnstile widget, "interaction-only" (invisible unless Cloudflare needs a click), so the form design is unchanged. |
| `src/lib/submitEnquiry.ts` | Posts to `/api/enquiry`; no third-party URL in the browser. |
| `src/pages/ContactPage.tsx` | Turnstile token, submission id, instant double-submit guard, shared rules. No visual change. |
| `docs/google-apps-script/Code.gs` | Shared-secret check (constant-time), per-IP 24 h limit in Script Properties with hourly clean-up, site-wide hourly cap, submission-id de-duplication, stricter validation, quieter `doGet`, 8 KB limit. Formula-injection and HTML-escaping protections kept. |
| `docs/google-apps-script/SETUP.md` | New steps 5–7 (secret, Turnstile, Vercel variables). |
| `vercel.json` | CSP, Permissions-Policy, Cross-Origin-Opener-Policy, X-Permitted-Cross-Domain-Policies; `/api/*` gets `no-store` + `noindex`; function max duration 30 s. |
| `scripts/prerender.mjs` | `robots.txt`: `Disallow: /api/` (pages stay fully indexable). |
| `.env.example` | New variable list, no real values; removed AI Studio leftovers. |
| `package.json` / lock | Removed 4 unused packages; esbuild patched by `npm audit fix`. No new packages. |

## 4. Form protection, in order

1. **Browser:** field checks, a disabled button while sending, and an instant guard so a double click sends once.
2. **`/api/enquiry`:**
   - only POST, only JSON, only from our own site, at most 8 KB;
   - honeypot or too-fast submits are dropped (with a fake "ok" so bots learn nothing);
   - strict validation;
   - the Turnstile token is verified with Cloudflare.
3. **Apps Script:**
   - refuses anything without the shared secret;
   - checks the data again;
   - ignores a repeat of the same submission id (10 min) or the same mobile number (2 min);
   - enforces 20 per IP per 24 h and 150 per hour in total.

   Only then does it save the row and send the email.

**How the IP is detected:**
- The function reads `x-real-ip` / `x-vercel-forwarded-for`. Vercel sets these itself at its edge and overwrites anything the visitor sends.
- A visitor-supplied `X-Forwarded-For` is never used (tested).
- The IP is HMAC-hashed before it leaves Vercel, so Google never sees raw IPs.

**Rate-limit store:** Apps Script Script Properties, one record per hashed IP holding its timestamps from the last 24 h. Updates run under a script lock, so all serverless instances share one count. Old records are deleted every hour.

**Email:**
- The recipient is fixed in code (`Session.getEffectiveUser()`); the form can't change it.
- `replyTo` is only set to an email that passed validation, and newlines are removed from every field. This blocks header injection.
- Email volume is capped by the per-IP limit, the hourly cap, and the existing quota and digest logic.

## 5. Environment variables

| Name | Where | Secret? |
|---|---|---|
| `APPS_SCRIPT_URL` | Vercel (server) | Yes – keep out of the browser |
| `FORM_SHARED_SECRET` | Vercel (server) **and** Apps Script → Script Properties | Yes |
| `TURNSTILE_SECRET_KEY` | Vercel (server) | Yes |
| `VITE_TURNSTILE_SITE_KEY` | Vercel (build) | No – public by design |
| `ALLOWED_ORIGINS` | Vercel, optional (custom domain) | No |
| `TURNSTILE_DISABLED` | Local tests only (ignored in production) | No |
| `VITE_FORM_ENDPOINT` | **Delete from Vercel** – no longer used | – |

If anything is missing, the API answers 503 "form temporarily unavailable" (fails closed) and logs which setting is missing to the Vercel function log, never to the visitor.

## 6. Security headers (all pages)

| Header | Value / purpose |
|---|---|
| Content-Security-Policy | `default-src 'self'`, scripts only from the site and Cloudflare Turnstile, styles from the site + Google Fonts (+ inline styles React/animations need), fonts from Google Fonts, images/media from the site, frames only Turnstile + Google Maps, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests` |
| Strict-Transport-Security | Already sent by Vercel (`max-age=63072000; includeSubDomains; preload`) |
| X-Frame-Options | `SAMEORIGIN` (clickjacking; plus `frame-ancestors`) |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | camera, microphone, geolocation, payment, USB, serial, Bluetooth, HID, MIDI, sensors, topics all off |
| Cross-Origin-Opener-Policy | `same-origin` |
| `/api/*` | `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow` |

No cookies are used, so cookie flags don't apply.

## 7. Tests run (local, nothing sent to the live site or the real sheet)

**API function** (38/38 passed; Cloudflare and Google stubbed):
- **Normal submit:** a valid enquiry is accepted. It's forwarded with the secret and the hashed IP; the raw IP, the token and the honeypot are not forwarded.
- **Limit message:** the 429 response carries the exact "You have reached the submission limit…" text.
- **Bad input rejected:** invalid email, HTML or JavaScript in the name/plan/email, formula injection, SQL-style payloads, goal or contact method not in the list, a page URL from another site, and a bad submission id.
- **Size limits:** a 20 KB body and a declared huge `content-length` both get 413.
- **Turnstile (CAPTCHA) refused:** a missing token, an invalid token, a token for another site, a token for another action, and a testing-key result in production. Nothing reached Apps Script when the check failed.
- **Malformed requests:** malformed JSON, a JSON array and the wrong content type are refused. Prototype-pollution keys are ignored.
- **Origin and methods:** a cross-site origin, a missing origin and `sec-fetch-site: cross-site` get 403; GET gets 405.
- **Bots:** a filled honeypot and a too-fast submit get a silent fake "ok" and are never forwarded.
- **IP spoofing:** a spoofed `X-Forwarded-For` doesn't change the IP bucket.
- **Missing configuration:** 503 with no details; `TURNSTILE_DISABLED` is ignored in production; an Apps Script refusal gives a generic 502.

**Apps Script** (17/17 passed; `Code.gs` run in Node with fake Google services):
- **Secret:** posts with no secret or a wrong secret are refused, and nothing is saved.
- **`doGet`:** reveals nothing.
- **Per-IP limit:** 20 submissions from one IP are accepted and the 21st is blocked. Another IP is still allowed. The IP is still blocked 23 h later and allowed again after 24 h.
- **Repeats:** the same submission id, or the same mobile within 2 min, is saved once.
- **Bad input:** formula or HTML refused, an unknown goal dropped, an oversized body refused.
- **Caps and clean-up:** the hourly cap answers BUSY; expired rate-limit records are deleted.

**Real browser against a local copy of the production build** (served with the exact `vercel.json` headers, real API function, Cloudflare's always-pass test keys, Google stubbed):
- **All pages at 360 px and 1280 px** (Home, Services, Senior Fitness, Transformations, About, Contact, 404): status OK, 0 broken images, videos load, fonts load, the map iframe present, no horizontal scroll, and **0 CSP violations or JS errors**.
- **Contact form:** submitted through `/api/enquiry`; the success popup shows and the enquiry was forwarded.
- **Plan labels:** all 13 real plan labels, 17 form headings and 7 goals pass the server rules, so no genuine visitor is blocked.
- **Robots and API:** `robots.txt` still allows every page; `GET /api/enquiry` → 405.

**Read-only checks on the live site:** HTTPS redirect (308), HSTS present, `/.env`, `/package.json` and `/docs/…` return 404, and there's no directory listing.

## 8. Manual setup needed (in this order, before deploying)

1. 🛠 **Apps Script:**
   - paste the new `Code.gs`;
   - add the `FORM_SHARED_SECRET` Script Property;
   - run `setup` once (this creates the clean-up trigger);
   - **Deploy → Manage deployments → Edit → New version** (keeps the same URL).

   ⚠ Until the website is redeployed with the new variables, the live form stops working, because the old site posts without the secret. Do steps 1–3 together.
2. 🛠 **Cloudflare (free):**
   - create a Turnstile widget for `teamsamir.vercel.app`;
   - copy the site key and secret key.
3. 🛠 **Vercel → Settings → Environment Variables:**
   - add `APPS_SCRIPT_URL`, `FORM_SHARED_SECRET`, `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY`;
   - delete `VITE_FORM_ENDPOINT`;
   - push or redeploy.
4. 🟡 **After deploy:**
   - submit one real enquiry (row + email arrive);
   - check the response headers in the browser (DevTools → Network);
   - optionally run a header scan at securityheaders.com.
5. 🛠 **Optional Vercel settings:**
   - **Deployment Protection → Vercel Authentication** for Preview deployments, so preview URLs aren't public (available on Hobby).
   - **Firewall → Attack Challenge Mode** during an attack (available on all plans).
   - Custom WAF and rate-limit rules: check what your plan includes in the Vercel dashboard before relying on them.

## 9. Cloudflare free plan – what applies

- **Turnstile:** free, used here.
- **Cloudflare DNS, proxy, SSL, DDoS, WAF managed rules, Bot Fight Mode and free rate-limiting rules** only work for a **custom domain whose DNS is on Cloudflare**. `teamsamir.vercel.app` belongs to Vercel, so these **can't be applied to it**.

If you later buy a domain (e.g. `teamsamir.in`), the option is:
1. Add it to Cloudflare (free).
2. Point it at Vercel (CNAME `cname.vercel-dns.com`, proxied).
3. Set SSL/TLS to **Full (strict)**.
4. Turn on "Always Use HTTPS".
5. Enable Bot Fight Mode and the free managed ruleset.
6. Add one free rate-limiting rule for `/api/enquiry`.
7. Add the domain to `ALLOWED_ORIGINS` and to the Turnstile widget.

Vercel already provides HTTPS and DDoS mitigation for the current domain.

## 10. Remaining risks and limits

- **Shared IPs:** visitors behind the same mobile-carrier IP share one 20/day limit. This is rare for a local business, and the number is easy to change (`RATE_LIMIT_MAX`).
- **Determined attackers** with many IPs can still send up to 150 enquiries an hour (the site-wide cap). They'd also have to pass Turnstile each time.
- **Apps Script URL:** it's public by Google's design (the web app must allow "Anyone"). Protection is the shared secret: keep it secret, and rotate it in both places if it ever leaks.
- **Inline styles:** the CSP allows them (React and the animations need them). Inline *scripts* are not allowed.
- **Public contact details:** the phone number, email and Instagram are public on purpose, and scrapers can read them. Use Gmail's spam filter for the address.
- **Live result (22 Nov 2026):** deployed and checked. GET → 405, another site → 403, missing or fake CAPTCHA → 403, HTML in the name → 400, 20 KB → 413, malformed JSON → 400, direct post to Apps Script without the secret → FORBIDDEN, Apps Script URL absent from the public JS, all pages 200, 0 CSP violations. An automated browser (headless and visible) was stopped by Turnstile. The first deploy crashed (an ESM import without a `.js` extension); it was fixed in `c937e97`. Remaining: one real enquiry submitted by a person.

## 11. Deployment checklist

- [x] New `Code.gs` pasted and deployed as a **new version of the same deployment**
- [x] `FORM_SHARED_SECRET` set in Apps Script Script Properties and in Vercel (same value)
- [x] `setup` run once in Apps Script (clean-up trigger created)
- [x] Turnstile widget created; site key + secret key in Vercel
- [x] `APPS_SCRIPT_URL` in Vercel; `VITE_FORM_ENDPOINT` deleted
- [x] Push / redeploy
- [ ] One real enquiry submitted by a person: row in the sheet, email received
- [x] Response headers checked on the live site
- [ ] (Optional) Vercel Authentication on Preview deployments
