# FTM Worship App

A web application for managing worship team members, scheduling, and communication at FTM Church. Built as a Progressive Web App (PWA) with role-based access control.

For the full product specification, see [`docs/superpowers/specs/2026-06-21-worship-app-design.md`](docs/superpowers/specs/2026-06-21-worship-app-design.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Components | [shadcn/ui](https://ui.shadcn.com/) via [@base-ui/react](https://base-ui.com/) |
| Database + Auth | [Supabase](https://supabase.com/) (Postgres + Row Level Security + Auth) |
| Email | [Resend](https://resend.com/) (invite emails) |
| Testing | [Vitest](https://vitest.dev/) (unit/integration) + [Playwright](https://playwright.dev/) (E2E) |
| Deployment | [Vercel](https://vercel.com/) |

---

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or higher
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- A Supabase project (create one at [https://supabase.com](https://supabase.com))

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create `.env.local` in the project root with the following variables:

```bash
# Supabase — from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/public key>
SUPABASE_SECRET_KEY=<service_role key>           # server-only, keep secret

# App URL — use localhost for local dev
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase CLI — for running migrations locally
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_ACCESS_TOKEN=<personal access token>    # Supabase Dashboard → Account → Access Tokens

# Resend — for invite emails (see docs/runbook/resend-setup.md)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# VAPID push keys — generate once per environment (see docs/runbook/push-setup.md)
VAPID_PUBLIC_KEY=<base64url public key>
VAPID_PRIVATE_KEY=<base64url private key>         # keep secret
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same as VAPID_PUBLIC_KEY>
```

> `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are only needed for local CLI operations (migrations, type generation). Do not set them in Vercel.

### 3. Apply database migrations

Link to your Supabase project and push all migrations:

```bash
pnpm dlx supabase db push --linked
```

Or if you haven't linked yet:

```bash
pnpm dlx supabase link --project-ref <project-ref>
pnpm dlx supabase db push
```

### 4. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The first user to sign in becomes `PASTOR` + `WORSHIP_HEAD` via the database bootstrap trigger.

---

## Test Commands

```bash
# Type checking (must pass with zero errors)
pnpm typecheck

# Unit + integration tests (Vitest)
pnpm vitest run

# Watch mode during development
pnpm test:watch

# End-to-end tests (Playwright) — requires the dev server to be running
pnpm test:e2e

# Run a specific E2E suite
pnpm test:e2e auth
pnpm test:e2e invite-flow
```

---

## Generating Database Types

After changing the schema in Supabase, regenerate TypeScript types:

```bash
pnpm db:types
```

This writes to `src/lib/types/database.types.ts`.

---

## Deployment

See [`docs/runbook/deploy.md`](docs/runbook/deploy.md) for the complete operator guide covering:
- Vercel project import + build settings
- All required environment variables (with sources)
- Node version pinning
- Supabase auth redirect URL configuration
- OAuth provider callback URL setup
- Smoke test checklist
- Rollback procedure

---

## Operator Setup Runbooks

These must be completed by the operator before the corresponding features work in production:

| Feature | Runbook |
|---|---|
| Google + Apple OAuth sign-in | [`docs/runbook/oauth-setup.md`](docs/runbook/oauth-setup.md) |
| Invite emails via Resend | [`docs/runbook/resend-setup.md`](docs/runbook/resend-setup.md) |
| Push notification subscriptions | [`docs/runbook/push-setup.md`](docs/runbook/push-setup.md) |
| Full production deployment | [`docs/runbook/deploy.md`](docs/runbook/deploy.md) |

---

## Phase Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Foundation & Auth | Code complete — awaiting production deployment |
| Phase 2 | Scheduling | Planned |
| Phase 3 | Line-ups & YouTube | Planned |
| Phase 4 | Substitution | Planned |
| Phase 5 | Notifications, Reminders & Amendments | Planned |

See [`docs/superpowers/plans/`](docs/superpowers/plans/) for detailed implementation plans.

---

## Project Structure

```
src/
  app/               # Next.js App Router pages and layouts
    (app)/           # Authenticated app shell
    admin/           # Admin-only pages (members, roles, service types)
    auth/            # Auth callback handler
    api/             # API routes (push subscription)
    signin/          # Sign-in page
  actions/           # Server Actions (invites, profile updates)
  components/        # Shared UI components
  lib/
    supabase/        # Supabase client helpers (browser + server + middleware)
    types/           # TypeScript types including generated database.types.ts
docs/
  runbook/           # Operator setup guides
  superpowers/
    plans/           # Phase implementation plans
    specs/           # Product specification
supabase/
  migrations/        # SQL migration files
tests/               # Playwright E2E tests
```
