# OAuth Provider Setup Runbook

**This document MUST be completed by a human operator before OAuth sign-in works in production. Magic link sign-in works without this configuration.**

---

## Overview

This runbook covers enabling Google and Apple OAuth providers in Supabase and registering the correct callback URLs in each provider's developer console. Complete both sections before testing OAuth sign-in.

The OAuth callback URL for this application is:

```
<NEXT_PUBLIC_APP_URL>/auth/callback
```

Example: `https://yourapp.example.com/auth/callback`

---

## Step 1: Enable Google OAuth in Supabase

### 1.1 Create a Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project.
3. Navigate to **APIs & Services → Credentials**.
4. Click **Create Credentials → OAuth client ID**.
5. Choose **Web application** as the application type.
6. Under **Authorized redirect URIs**, add:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
   (Find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`)
7. Click **Create**.
8. Copy the **Client ID** and **Client Secret**.

### 1.2 Enable Google in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Navigate to **Authentication → Providers**.
4. Find **Google** and toggle it **ON**.
5. Paste your credentials:
   - **Client ID (for OAuth):** `<TODO: paste Google client ID>`
   - **Client Secret:** `<TODO: paste Google client secret>`
6. Click **Save**.

---

## Step 2: Enable Apple OAuth in Supabase

### 2.1 Create an Apple Sign In App

1. Go to [Apple Developer Portal](https://developer.apple.com/account/).
2. Navigate to **Certificates, Identifiers & Profiles → Identifiers**.
3. Create or select an **App ID** with **Sign In with Apple** capability enabled.
4. Navigate to **Keys** and create a new key:
   - Enable **Sign In with Apple**.
   - Download the `.p8` private key file (you can only download it once).
   - Note the **Key ID**.
5. Navigate to **Identifiers → Services IDs**.
6. Register a new Services ID (this is the OAuth client ID for web flows).
7. Configure **Sign In with Apple** for the Services ID:
   - **Primary App ID:** select your App ID from step 3.
   - **Domains:** add your app domain (e.g., `yourapp.example.com`).
   - **Return URLs:** add:
     ```
     https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
     ```
8. Note your **Team ID** (visible in the top-right of the Apple Developer portal).

### 2.2 Enable Apple in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Navigate to **Authentication → Providers**.
4. Find **Apple** and toggle it **ON**.
5. Paste your credentials:
   - **Services ID (Client ID):** `<TODO: paste Apple Services ID>`
   - **Team ID:** `<TODO: paste Apple Team ID>`
   - **Key ID:** `<TODO: paste Apple Key ID>`
   - **Private Key (.p8 content):** `<TODO: paste contents of downloaded .p8 file>`
6. Click **Save**.

---

## Step 3: Verify the Callback URL in Your App

Confirm that `NEXT_PUBLIC_APP_URL` in `.env.local` (and production environment variables) is set to your deployed app's base URL without a trailing slash:

```
NEXT_PUBLIC_APP_URL=https://yourapp.example.com
```

The app constructs the OAuth redirect URL as:

```
${NEXT_PUBLIC_APP_URL}/auth/callback
```

This must match what is registered in both Google Cloud Console and Apple Developer Portal as a valid redirect URI.

---

## Step 4: Test OAuth Sign-In

1. Deploy your application (or run locally if you have a publicly accessible tunnel).
2. Navigate to `/signin`.
3. Click **Sign in with Google** — you should be redirected to Google's OAuth consent screen.
4. Complete the Google sign-in — you should land on `/dashboard`.
5. Repeat with **Sign in with Apple**.

---

## Notes

- Magic link sign-in (email OTP) works without any OAuth configuration as long as Supabase email provider is enabled (it is by default).
- The Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) is different from the app callback URL (`/auth/callback`). Supabase handles the first leg of the OAuth flow internally and then redirects to your app's callback.
- For local development with OAuth, you can use a tunnel tool like [ngrok](https://ngrok.com/) to expose `localhost:3000` with a public HTTPS URL, then register that URL in both provider consoles.
