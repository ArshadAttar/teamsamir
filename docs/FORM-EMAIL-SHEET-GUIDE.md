# Enquiry form: change the email or the Google Sheet

This guide explains how the website's enquiry form is connected to Google, and every step to:

- **A.** send enquiry emails to a different address, or to extra people;
- **B.** move the form to a new Google Sheet in the same Google account;
- **C.** move everything to a different Google account (new sheet **and** new email).

The last section is a **ready-to-copy prompt** for Claude, so it can do the code part for you.

> Never write passwords or secret values into this file or into Git.
> Secrets live only in Vercel, in Apps Script → Script Properties, and in `.env.local` on your computer.

---

## 1. How it works today

```
Visitor fills the form (teamsamir.vercel.app/contact/)
   → Cloudflare Turnstile bot check (invisible)
   → Vercel Function  api/enquiry.ts   (checks the data, adds the secret)
   → Google Apps Script web app       (docs/google-apps-script/Code.gs, attached to the sheet)
        → adds a row to the "Enquiries" tab of the Google Sheet
        → emails the enquiry to the Google account that owns the script
```

**Who receives the email?** The Google account that owns the Apps Script and deployed it with "Execute as: Me". The code uses `Session.getEffectiveUser()`, so the address isn't typed anywhere in the code. Extra people can be added with `CC` (step A1).

**Which sheet?** The sheet the Apps Script is attached to (**Extensions → Apps Script** from inside that sheet). `CONFIG.SPREADSHEET_ID` in `Code.gs` is only a backup.

### Where each setting lives

| Setting | Where | Notes |
|---|---|---|
| Apps Script code | Google Sheet → Extensions → Apps Script → `Code.gs` | Master copy: `docs/google-apps-script/Code.gs` in this project |
| `FORM_SHARED_SECRET` (in Apps Script) | Apps Script → Project Settings ⚙ → Script Properties | Must be **exactly the same** as in Vercel |
| `APPS_SCRIPT_URL` | Vercel → teamsamir → Settings → Environment Variables | The web app URL ending in `/exec` |
| `FORM_SHARED_SECRET` (in Vercel) | Vercel → Environment Variables | Same value as in Apps Script |
| `TURNSTILE_SECRET_KEY` | Vercel → Environment Variables | From Cloudflare → Turnstile |
| `VITE_TURNSTILE_SITE_KEY` | Vercel → Environment Variables | Public key, from Cloudflare → Turnstile |
| Local copies of all of the above | `.env.local` in the project folder | Git-ignored, never uploaded |

Vercel shows secret values as "Hidden" and can't display them again. Your local copy of the secret is in `.env.local` (`FORM_SHARED_SECRET=...`).

---

## A. Change who receives the emails

### A1. Add extra people (keep the current inbox too). Code change: small.

1. In `Code.gs`, set `CC` near the top, for example:
   `CC: ['partner@example.com', 'manager@example.com'],`
2. Paste the updated `Code.gs` into Apps Script and click **Save**.
3. **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy.** The URL stays the same, so nothing changes in Vercel.
4. Test (section D).

Each CC person uses one email from the daily Gmail quota (about 100 a day on free Gmail).

### A2. Send to a different single address instead of the owner. Code change: small (Claude can do it).

The code currently always sends to the script owner. To send to another address (for example `info@yourdomain.com`), Claude changes `ownerEmail_()` / the `to:` lines in `Code.gs` to use a new `CONFIG.NOTIFY_TO` setting. Then:

1. Paste the updated `Code.gs` into Apps Script → **Save**.
2. **Deploy → Manage deployments → ✏ Edit → New version → Deploy** (same URL).
3. Test (section D).

Emails are still **sent from** the owner's Gmail; only the recipient changes.

### A3. Emails should come from, and go to, a different Google account

That means moving the script to the other account. Follow **section C**.

---

## B. Use a new Google Sheet (same Google account)

1. **Create the sheet:** open <https://sheets.new> while signed in to the same account, and name it (e.g. `TeamSamir Enquiries 2027`).
2. **Add the script:** in the new sheet, open **Extensions → Apps Script**, delete everything in `Code.gs`, paste the full `docs/google-apps-script/Code.gs`, and click **Save**.
3. **Update the backup sheet ID (recommended):** copy the new sheet's ID from its URL (the long part between `/d/` and `/edit`) and put it in `CONFIG.SPREADSHEET_ID` in Code.gs. Save. (Claude can update the project copy too.)
4. **Add the secret:** **Project Settings ⚙ → Script Properties → Add script property**: `FORM_SHARED_SECRET` = the same value as in Vercel (copy it from `.env.local`). Save.
5. **Run setup once:** Editor → choose `setup` → **Run**. Allow the permissions (Advanced → Go to … (unsafe) → Allow). This creates the **Enquiries** tab and the two hourly triggers.
6. **Deploy as a web app:** **Deploy → New deployment** → ⚙ **Web app**.
   - **Execute as: Me**
   - **Who has access: Anyone**

   Click **Deploy** and copy the new **Web app URL** (ends in `/exec`).
7. **Update Vercel:** Settings → Environment Variables → `APPS_SCRIPT_URL` → **Edit** → paste the new URL → Save. (Or ask Claude: it can do this with the Vercel CLI.) Also update `APPS_SCRIPT_URL` in `.env.local`.
8. **Redeploy the website:** Vercel → Deployments → ⋯ on the latest → **Redeploy**, or push any commit. New variable values only work after a redeploy.
9. **Switch off the old sheet's script:** in the **old** sheet: Extensions → Apps Script → **Deploy → Manage deployments → Archive** the old deployment. Optionally delete its triggers (clock icon ⏰ in the left bar).
10. **Test** (section D).

The old enquiries stay in the old sheet. Copy them over if you want everything in one place.

---

## C. Move everything to a different Google account (new email + new sheet)

Same as section B, but signed in to the **new** Google account from step 1:

1. Sign in to Chrome with the new Google account (the one that should receive the emails).
2. Do **steps 1–8 of section B** in that account. The first `setup` run asks that account for permission to manage the sheet and send email.
3. Optional: run `testEmail` once (Editor → choose `testEmail` → Run) to get a sample email in the new inbox.
4. In the **old** account, archive the old deployment (section B, step 9).
5. Test (section D).

The new inbox automatically receives the emails, because the code emails whichever account owns the script.

---

## D. Test after any change

1. Open <https://teamsamir.vercel.app/contact/> in your normal browser.
2. Fill in dummy data:
   - Full Name: `Test Enquiry`
   - Mobile: `9999999999`
   - any goal
3. Click **Submit Request**. If a "Verify you are human" box appears, tick it and submit again.
4. You should see the green confetti popup.
5. Check for a new row in the sheet and an email in the expected inbox (and CC inboxes).
6. Delete the test row.

**If something fails:**

| You see | Likely cause | Fix |
|---|---|---|
| "The enquiry form is temporarily unavailable" | A Vercel variable is missing, or the site wasn't redeployed | Check the 4 variables, then redeploy |
| "Could not send your request" | `FORM_SHARED_SECRET` differs between Vercel and Apps Script, or the web app isn't deployed / access isn't "Anyone" | Re-enter the same secret in both places; check the deployment settings |
| "Security check failed" | Turnstile keys wrong, or a new domain isn't added in Cloudflare | Check the keys in Vercel; add the domain to the Turnstile widget |
| Row added but no email | Daily Gmail quota used up (it goes in the hourly digest), or the email is in spam | Wait for the hourly digest; check spam |

---

## E. Prompt to give Claude next time

Copy this, fill in the brackets, and send it in the project folder. Don't paste the secret; Claude reads it from `.env.local`.

```
Read docs/FORM-EMAIL-SHEET-GUIDE.md and follow it.

What I want to change: [A1 add CC / A2 send to a different address / B new sheet / C new Google account]

Details:
- New email address(es): [e.g. info@teamsamir.in, or "none"]
- New Google Sheet URL: [paste the sheet URL, or "same sheet"]
- New Apps Script web app URL: [paste after I deploy it, or "not deployed yet"]
- Google account that owns the new script: [same as before / new account]

Please:
1. Update docs/google-apps-script/Code.gs if needed (CC, NOTIFY_TO, SPREADSHEET_ID).
2. Tell me exactly what to paste and click in Apps Script (put the code on my clipboard).
3. Update APPS_SCRIPT_URL in Vercel and .env.local if the URL changed, without showing secret values, then redeploy.
4. Update this guide if anything changed, commit, and tell me when to run the test in section D.
```

**What Claude will do with it:**
- **Code changes:** edits `Code.gs` (CC list, recipient, sheet ID) and keeps the project copy in sync.
- **Your clicks:** puts the code and the secret on your clipboard and lists the exact Apps Script clicks. Those need your Google login.
- **Vercel:** updates `APPS_SCRIPT_URL` with the Vercel CLI (`npx vercel login` first if asked) and redeploys.
- **Records:** updates this guide and `CLAUDE.md` if anything changed, then commits.
