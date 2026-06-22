# Vercel Deployment Runbook

**Audience:** Operator completing the Phase 1 production deployment.
**Prerequisite runbooks:** Complete these before deploying:
- [`docs/runbook/oauth-setup.md`](./oauth-setup.md) — Google + Apple OAuth callback URLs
- [`docs/runbook/resend-setup.md`](./resend-setup.md) — Resend API key for invite emails
- [`docs/runbook/push-setup.md`](./push-setup.md) — VAPID keys for push subscriptions

---

## Step 1: Import the Repository into Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new) and sign in.
2. Click **Add New → Project** and select **Import Git Repository**.
3. Connect your GitHub account if not already connected, then import the `worship-app` repository.
4. Framework detection will identify **Next.js** — accept the preset.
5. Confirm the following build settings (they are correct by default for Next.js):

   | Setting | Value |
   |---|---|
   | Framework Preset | Next.js |
   | Build Command | `pnpm build` |
   | Output Directory | `.next` (auto-detected) |
   | Install Command | `pnpm install` |
   | Root Directory | `.` (repo root) |

6. **Before clicking Deploy**, proceed to Step 2 to add environment variables first.

---

## Step 2: Set Environment Variables in Vercel

In the Vercel project settings (**Settings → Environment Variables**), add the following variables. Unless noted, set them for all three environments: **Production**, **Preview**, and **Development**.

### Required variables

| Variable | Visibility | Production vs Preview | Where to find the value |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser) | Same for both | Supabase Dashboard → Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser) | Same for both | Supabase Dashboard → Settings → API → **Project API keys → anon / public** |
| `SUPABASE_SECRET_KEY` | **Server-only — keep secret** | Same for both | Supabase Dashboard → Settings → API → **Project API keys → service_role** |
| `NEXT_PUBLIC_APP_URL` | Public (browser) | **DIFFERS** (see below) | Set to the Vercel production URL (e.g., `https://ftm-worship.vercel.app`) |
| `RESEND_API_KEY` | **Server-only — keep secret** | Same for both | See [`docs/runbook/resend-setup.md`](./resend-setup.md) |
| `VAPID_PUBLIC_KEY` | Server-only | Same for both | See [`docs/runbook/push-setup.md`](./push-setup.md) |
| `VAPID_PRIVATE_KEY` | **Server-only — keep secret** | Same for both | See [`docs/runbook/push-setup.md`](./push-setup.md) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public (browser) | Same for both | Must match `VAPID_PUBLIC_KEY` exactly |

### Variables that must NOT be set in Vercel

| Variable | Why excluded |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Local CLI use only — grants broad Supabase account access |
| `SUPABASE_PROJECT_REF` | Local CLI use only |

### `NEXT_PUBLIC_APP_URL` per environment

`NEXT_PUBLIC_APP_URL` is used to construct OAuth redirect URLs and invite links. It must match the canonical URL for each environment:

- **Production:** `https://ftm-worship.vercel.app` (or your custom domain)
- **Preview:** Vercel auto-generates preview URLs per branch (e.g., `https://ftm-worship-git-feat-foo.vercel.app`). For preview deployments you can use the Vercel-provided system variable `VERCEL_URL` by setting `NEXT_PUBLIC_APP_URL` to `https://${VERCEL_URL}` — however, this requires a [Vercel system environment variable reference](https://vercel.com/docs/concepts/projects/environment-variables/system-environment-variables). The simplest option is to omit `NEXT_PUBLIC_APP_URL` on Preview and accept that OAuth/invites will use the production URL in preview builds. For most single-church deployments, previews are not used for auth testing.

---

## Step 3: Pin Node Version

The project already declares `"engines": { "node": ">=20.0.0" }` in `package.json`. Vercel respects this declaration. To be explicit, you can also pin it in the Vercel UI:

1. Go to **Settings → General** in your Vercel project.
2. Under **Node.js Version**, select **20.x**.

Both the `engines` field and the Vercel UI setting work independently; having both is belt-and-suspenders.

---

## Step 4: Configure Supabase Auth Redirect URLs

Supabase validates the `redirect_to` parameter on OAuth and magic-link flows. You must whitelist the Vercel URLs:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → select your project.
2. Navigate to **Authentication → URL Configuration**.
3. Set **Site URL** to your production URL:
   ```
   https://ftm-worship.vercel.app
   ```
4. Under **Redirect URLs**, add the following entries:

   ```
   https://ftm-worship.vercel.app/**
   https://*.vercel.app/**
   http://localhost:3000/**
   ```

   The wildcard `https://*.vercel.app/**` covers all preview deployment URLs automatically.

5. Click **Save**.

> **Note:** If you are using a custom domain (not `.vercel.app`), add `https://yourdomain.com/**` instead of (or in addition to) the Vercel URL.

---

## Step 5: Update OAuth Provider Callback URLs

OAuth providers (Google, Apple) must have the production URL registered as an authorized redirect URI. See [`docs/runbook/oauth-setup.md`](./oauth-setup.md) for complete instructions.

The callback URL to register in each provider's console is:

```
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

This Supabase-side URL does not change with your Vercel URL — it was set up during initial OAuth configuration. However, you must ensure `NEXT_PUBLIC_APP_URL` in Vercel points to the correct production URL so that the post-auth redirect from Supabase back to your app works.

---

## Step 6: Trigger the First Deploy

1. Return to the Vercel project and click **Deploy** (or push a commit to `main`).
2. Watch the build log — a successful build ends with:
   ```
   Build Completed
   ```
3. Vercel will show a production URL (e.g., `https://ftm-worship.vercel.app`).

---

## Step 7: First-Deploy Expectations

- The **first user to sign in** will be automatically granted `PASTOR` + `WORSHIP_HEAD` roles via the Supabase bootstrap trigger (`handle_new_auth_user` function).
- Subsequent sign-ups receive the `MEMBER` role by default (unless an unconsumed invite matches their email, in which case the invite's `intended_app_roles` and `intended_instrument_role_ids` are applied).
- The first sign-in should land on `/dashboard`. If redirected to `/signin` in a loop, check that `NEXT_PUBLIC_APP_URL` is set correctly and that the Supabase redirect URLs (Step 4) include the production domain.

---

## Smoke Test Checklist

Complete this checklist after every production deploy. All five items must pass before creating the `phase1-complete` git tag.

- [ ] **Sign in** — Navigate to `/signin`, sign in with magic link or OAuth. First sign-in should redirect to `/dashboard` and the user profile should show roles `PASTOR` and `WORSHIP_HEAD`.
- [ ] **Instrument roles** — Navigate to `/admin/instrument-roles`. Add a new role (e.g., "Electric Guitar"). Confirm it appears in the list.
- [ ] **Invite flow** — Send an invite from `/admin/members/invite` to a second test email address. Open the invite link on a different device or incognito window. Accept the invite, complete sign-in. Confirm the new user appears in `/admin/members` with the correct roles and instrument assignments.
- [ ] **PWA install** — On Android Chrome, visit the production URL. The browser should show an install prompt (or use the browser menu → "Add to Home Screen"). Install it and confirm it opens as a standalone app. On iOS Safari, use Share → "Add to Home Screen".
- [ ] **Push subscription** — Sign in on a mobile device. Navigate to `/profile`. Enable push notifications. Confirm a row appears in the `push_subscriptions` table in Supabase Dashboard → Table Editor.

Once all five boxes are checked, create the `phase1-complete` tag:

```bash
git tag -a phase1-complete -m "Phase 1: Foundation & Auth complete — verified in production"
git push origin phase1-complete
```

---

## Rollback Procedure

### Instant rollback via Vercel UI

1. Open your Vercel project.
2. Go to **Deployments**.
3. Find the last known-good deployment.
4. Click the three-dot menu → **Promote to Production**.

This is instant — no rebuild required. The previous build artifact is re-promoted.

### Inspect build and runtime logs

- **Build logs:** Vercel project → Deployments → select a deployment → **Build Logs** tab.
- **Runtime logs (server-side):** Vercel project → **Logs** tab (shows Edge/Node function output including `console.error`).
- **Supabase logs:** Supabase Dashboard → **Logs** → select **API** or **Auth** for Supabase-side errors.

### Rollback environment variables

If a bad env var was the cause:
1. Fix the variable in **Settings → Environment Variables**.
2. Go to **Deployments** → select the current production deployment → **Redeploy** (this picks up the new env vars without a code change).

---

## Custom Domain (Optional)

1. In the Vercel project, go to **Settings → Domains**.
2. Add your custom domain (e.g., `worship.yourchurch.com`).
3. Follow the DNS instructions Vercel provides (typically a CNAME or A record).
4. Once DNS propagates, update:
   - `NEXT_PUBLIC_APP_URL` in Vercel env vars → `https://worship.yourchurch.com`
   - Supabase **Site URL** → `https://worship.yourchurch.com`
   - Supabase **Redirect URLs** → add `https://worship.yourchurch.com/**`
5. Redeploy to pick up the updated `NEXT_PUBLIC_APP_URL`.
