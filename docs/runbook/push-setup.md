# Push Notifications Setup (VAPID)

## What are VAPID keys?

VAPID (Voluntary Application Server Identification for Web Push) keys are an EC keypair used to authenticate the application server when sending push notifications to browsers. They allow browsers and push services (FCM, APNs, etc.) to verify that push messages genuinely come from your server.

- The **public key** is shared with the browser at subscription time — it's embedded in the push subscription object.
- The **private key** stays on the server and is used to sign push requests when delivering notifications (Phase 5).

VAPID keys are not cryptographic secrets in the traditional sense. They are push-identity credentials: if rotated, all existing subscriptions become invalid and users must re-register.

## Generating VAPID keys

Run once per environment:

```bash
pnpm dlx web-push generate-vapid-keys
```

This outputs two base64url strings. Add them to `.env.local` (development) or your deployment secrets (staging/production):

```
VAPID_PUBLIC_KEY=<public key output>
VAPID_PRIVATE_KEY=<private key output>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same as VAPID_PUBLIC_KEY>
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be the same value as `VAPID_PUBLIC_KEY`. It is prefixed `NEXT_PUBLIC_` so that Next.js exposes it to the browser bundle (required for `pushManager.subscribe`).

## Required environment variables

| Variable | Where used | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Server (Phase 5) | Public VAPID key — sent in push payloads |
| `VAPID_PRIVATE_KEY` | Server (Phase 5) | Private VAPID key — signs outgoing push requests |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser | Public key injected into browser bundle for subscription |

## Rotating VAPID keys

If you need to rotate keys (security incident, key loss):

1. Generate new keys with `pnpm dlx web-push generate-vapid-keys`
2. Update all three env vars in your deployment secrets
3. Re-deploy the application

**Warning:** Rotating VAPID keys invalidates **all existing push subscriptions**. Every user who previously granted push permission will need to re-subscribe. The app will prompt them again on next visit to the Profile page.

## Notes

- The private key is only consumed in Phase 5 (server-side push delivery).
- Development and production should each have their own distinct keypairs.
- The subscription flow requires a registered service worker (`public/sw.js`, registered by `ServiceWorkerRegister`).
