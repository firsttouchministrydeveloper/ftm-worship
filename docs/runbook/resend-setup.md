# Resend Email Setup Runbook

**IMPORTANT: Until this runbook is completed, the invite flow uses Resend's shared test sender (`onboarding@resend.dev`). Email delivery is limited to addresses verified in your Resend account. Complete this guide before using invite emails in production.**

---

## Overview

This runbook covers signing up for Resend, generating an API key, and optionally verifying a custom domain so invite emails arrive from your own sender address (e.g., `invites@yourchurch.com`).

The invite server action at `src/actions/invites.ts` uses:

- `RESEND_API_KEY` — required at runtime; the app throws `RESEND_API_KEY not set` if absent.
- `from: "FTM Worship <onboarding@resend.dev>"` — Resend's shared test sender (no domain verification needed).

---

## Step 1: Sign Up for Resend

1. Go to [https://resend.com](https://resend.com) and click **Sign Up**.
2. Enter your email address and complete verification.
3. You will land on the Resend dashboard at [https://resend.com/overview](https://resend.com/overview).

---

## Step 2: Generate an API Key

1. In the left sidebar, click **API Keys**.
2. Click **Create API Key**.
3. Enter a descriptive name (e.g., `worship-app-production`).
4. Under **Permission**, select **Full access** (required for `emails.send`).
5. Under **Domain**, select **All domains** (or restrict to your verified domain once set up).
6. Click **Add**.
7. Copy the generated key — it is shown **only once**. Store it securely (e.g., a password manager).

---

## Step 3: Add the API Key to the Application

Open `.env.local` in the project root and add:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Replace `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual key.

For production deployments, set `RESEND_API_KEY` as an environment variable in your hosting platform (Vercel, Fly.io, etc.) — do **not** commit it to the repository.

---

## Step 4: Verify a Custom Domain (Optional but Recommended)

Without domain verification, invite emails are sent from `onboarding@resend.dev`, which is Resend's shared test address. Emails may land in spam and display Resend branding. Verifying your church's domain fixes both.

### 4.1 Add Your Domain in Resend

1. In the Resend sidebar, click **Domains**.
2. Click **Add Domain**.
3. Enter your domain (e.g., `yourchurch.com`).
4. Select your DNS provider region if prompted, then click **Add**.

### 4.2 Add DNS Records

Resend will display a set of DNS records to add:

| Type | Name | Value |
|------|------|-------|
| MX | `send` (or `resend._domainkey`) | Provided by Resend |
| TXT | `resend._domainkey` | Provided by Resend (DKIM) |
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` |

Log in to your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap, Google Domains) and add exactly the records shown in the Resend dashboard. DNS propagation can take up to 24 hours.

### 4.3 Verify the Domain

1. After adding the DNS records, return to the Resend **Domains** page.
2. Click **Verify** next to your domain.
3. Resend will check the records and show a green **Verified** badge when complete.

---

## Step 5: Switch the `from` Address

Once your domain is verified, update `src/actions/invites.ts`:

```ts
// Before (test sender):
from: "FTM Worship <onboarding@resend.dev>",

// After (your verified domain):
from: "FTM Worship <invites@yourchurch.com>",
```

Replace `yourchurch.com` with your verified domain. The local part (`invites`) can be any value — Resend does not require the mailbox to exist on your mail server.

Commit the change and redeploy.

---

## Step 6: Verify Email Delivery

1. With `RESEND_API_KEY` set and the app running, navigate to `/admin/members/invite`.
2. Submit the invite form with a real email address.
3. Check the recipient inbox (and spam folder) for the invite email.
4. In the Resend dashboard under **Emails**, you should see the send event with status **Delivered**.

---

## Notes

- `RESEND_API_KEY` is an **operator concern** — never commit it to the repository. The application throws an error at invite-send time if the key is missing; typecheck and other tests are unaffected.
- The `onboarding@resend.dev` sender is reserved by Resend for testing. It works without domain verification but only delivers to email addresses you have manually verified in your Resend account (under **Audiences → Contacts**) or to your own Resend account email address.
- The invite row is inserted into the database **before** the email is sent. If email sending fails, the invite row persists and the admin sees an error message. The invite URL is still valid and can be shared manually.
- Invite tokens expire after 7 days (`INVITE_TTL_DAYS = 7` in `src/actions/invites.ts`).
