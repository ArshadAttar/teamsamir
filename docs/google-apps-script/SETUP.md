# Enquiry form setup (Google Sheet + Gmail)

How it works: the website form sends each enquiry to the site's own server function (`api/enquiry.ts` on Vercel).
That function checks the data, verifies the Cloudflare Turnstile bot check and forwards the enquiry, with a shared
secret, to a Google Apps Script attached to your Google Sheet. The script refuses anything without the secret, allows
at most 20 enquiries per visitor IP per 24 hours, and then:

1. **Saves every enquiry as a row in the sheet.** This has no daily limit.
2. **Emails each enquiry** from your Gmail to the same Gmail, so it shows in both Inbox and Sent.
3. **Groups enquiries once today's email quota is nearly used up.** Free Gmail allows about 100 emails a day. After about 75 single emails, new rows are marked `Pending (digest)` and one **summary email per hour** lists them all. Nothing is lost.

No database and no passwords in the website code. The Apps Script URL and the secrets live only in Vercel's
Environment Variables and in the script's Script Properties. Security details: `docs/SECURITY.md`.

---

## Step 1: Create the sheet (2 min)

1. Sign in to Chrome with **the Gmail account that should receive the enquiries**.
2. Open <https://sheets.new> and name the file **TeamSamir Enquiries**.
3. Copy the sheet's URL and keep it handy. This is your enquiries sheet.

## Step 2: Add the script (2 min)

1. In the sheet, go to **Extensions → Apps Script**.
2. Delete everything in `Code.gs` and paste in the full contents of `docs/google-apps-script/Code.gs` from this project.
3. Click **Save** (💾). Name the project **TeamSamir Enquiry Backend**.

## Step 3: Run setup once (1 min)

1. In the function dropdown at the top, choose **`setup`** and click **Run**.
2. Google asks for permission. Click **Review permissions**, pick your account, then **Advanced → Go to TeamSamir Enquiry Backend (unsafe) → Allow**.
   (The "unsafe" warning appears because this is your own unpublished script. It only gets access to this sheet and to sending mail as you.)
3. Back in the sheet you'll see an **Enquiries** tab with blue headers. Two hourly triggers were also created: the digest email and the clean-up of old rate-limit records.
4. Optional: choose **`testEmail`** and click **Run**. You should receive a sample enquiry email.

## Step 4: Deploy as a web app (1 min)

1. Click **Deploy → New deployment**.
2. Click the gear icon ⚙ and choose **Web app**.
3. Settings:
   - Description: `v1`
   - **Execute as: Me**
   - **Who has access: Anyone** (required so website visitors can submit; they can only add rows, not read the sheet)
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

## Step 5: Create the shared secret

1. Generate a long random secret on your computer:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   (or any 64-character random string from a password manager).
2. In Apps Script, open **Project Settings (⚙) → Script Properties → Add script property**:
   - Property: `FORM_SHARED_SECRET`
   - Value: the secret
3. Save. Until this is set, the script refuses every submit.

## Step 6: Cloudflare Turnstile (free bot check)

1. Sign in at <https://dash.cloudflare.com> (free account) → **Turnstile → Add widget**.
2. Widget name `TeamSamir enquiry`, hostnames `teamsamir.com`, `www.teamsamir.com` and `teamsamir.vercel.app`,
   widget mode **Managed**. Create.
3. Copy the **Site Key** and the **Secret Key**.

## Step 7: Connect the website (Vercel → Project → Settings → Environment Variables)

| Name | Value | Environments |
|---|---|---|
| `APPS_SCRIPT_URL` | the Web app URL from Step 4 (ends in `/exec`) | Production (and Preview if you test previews) |
| `FORM_SHARED_SECRET` | the same secret as Step 5 | Production, Preview |
| `TURNSTILE_SECRET_KEY` | Turnstile Secret Key | Production, Preview |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile Site Key | Production, Preview |

Then **redeploy**. (`VITE_TURNSTILE_SITE_KEY` is built into the page at build time; the other three are read by the
server function and never reach the browser.) The old `VITE_FORM_ENDPOINT` variable is no longer used: delete it.

- **Local:** put the same names in `.env.local` (see `.env.example`). Cloudflare's test keys work locally:
  site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA` (refused on production on purpose).

Then submit the form once on the site. You should see a new row in the sheet and an email in your inbox.

---

## Day-to-day

- **Follow-up Status** column: a dropdown with New / Called / No Answer / Demo Booked / Converted / Not Interested. **Notes** is free text.
- **Email Status** column: `Sent` means it was emailed on its own. `Pending (digest)` means it will be in the next hourly summary. `Sent in digest …` means it already was.
- Want a ping for every new row with no quota limit? In the sheet, go to **Tools → Notification settings → Edit notifications → "Any changes are made" → "Email – right away"**.

## Changing the script later

After editing `Code.gs` in Apps Script, go to **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**.
This keeps the **same URL**, so nothing on the website needs to change. If you choose "New deployment" instead, you get a new URL and must update `APPS_SCRIPT_URL` in Vercel.

## Settings you can change (top of `Code.gs`)

| Setting | Default | Meaning |
|---|---|---|
| `CC` | `[]` | Extra people to copy on each email. Each one uses quota. |
| `DIGEST_RESERVE` | `25` | Emails kept back each day for the hourly summaries |
| `DUPLICATE_WINDOW_SEC` | `120` | Ignores a repeat submit from the same mobile number within 2 min |
| `RATE_LIMIT_MAX` | `20` | Enquiries allowed per visitor IP in a rolling 24 hours |
| `GLOBAL_HOURLY_MAX` | `150` | Enquiries allowed from everyone together per hour (protects the email quota) |
| `SUBMISSION_ID_WINDOW_SEC` | `600` | A repeat of the same form fill within 10 min is ignored |

## Upgrading later (more emails)

- **Google Workspace account** (e.g. `info@yourdomain.com`): about 1,500 emails/day. Do the same setup under that account. No code change.
- **Brevo or Amazon SES:** only `sendEnquiryEmail_` and `sendPendingDigest` need to change to call their API. The website doesn't change.
