# Worship App — Phase 1: Foundation & Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a working PWA where Pastor/Worship Head can sign in, manage members + roles + service types + instrument roles, send invites, and invited members can accept and edit their own profile.

**Architecture:** Next.js 14 App Router (TypeScript, Server Actions) on Vercel + Supabase (Postgres, Auth, RLS) + Resend (email). PWA-installable on Android and iOS. Push subscription infrastructure is wired but notifications are not yet sent (deferred to Phase 5).

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase JS v2, Supabase CLI, Resend SDK, Vitest, Playwright, pgTAP.

## Global Constraints

- **Node.js:** version 20.x LTS minimum.
- **Package manager:** `pnpm` (faster, deterministic, monorepo-friendly).
- **TypeScript strict mode:** `"strict": true` in `tsconfig.json`.
- **No `any` types** in committed code; use `unknown` and narrow.
- **All database access** goes through Supabase client; never raw SQL from the app layer.
- **All authenticated routes** must use the server-side Supabase client (`@supabase/ssr`) and check session before rendering.
- **PWA target:** must install cleanly on iOS 16.4+, Android Chrome current, desktop Chrome / Safari / Firefox / Edge current.
- **Commits:** one task = one commit, message format `phase1: <task summary>`.

## Phase Roadmap

This document covers **Phase 1 only**. Each subsequent phase will get its own dedicated plan document, written after the previous phase ships.

| Phase | Title | Deliverable |
|---|---|---|
| 1 | Foundation & Auth (this plan) | Sign in, member/role management, invites, PWA install |
| 2 | Scheduling | WH builds monthly schedule, Pastor approves, members view assignments |
| 3 | Line-ups & YouTube | WL submits line-ups (with paste-parser), WH approves, YouTube playlists generate |
| 4 | Substitution | Member requests sub, dual approval flow |
| 5 | Notifications, Reminders & Amendments | Push + email delivery, in-app inbox, quiet hours, scheduled reminders, amendment flow |

---

## File Structure (Phase 1)

```
worship-app/
├── .env.example                       # documented env var template
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.mjs                    # PWA-aware Next.js config
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                    # shadcn/ui config
├── playwright.config.ts
├── vitest.config.ts
├── public/
│   ├── icons/                         # PWA icons (192, 512, maskable)
│   └── manifest.webmanifest
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_core_tables.sql       # users, instrument_roles, service_types, etc.
│   │   ├── 0002_rls_policies.sql      # all Phase 1 RLS
│   │   └── 0003_bootstrap_function.sql # first-user bootstrap trigger
│   └── tests/
│       └── phase1_rls.test.sql        # pgTAP RLS tests
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # root layout + PWA meta
│   │   ├── page.tsx                   # home (redirects to /dashboard or /signin)
│   │   ├── signin/page.tsx
│   │   ├── auth/callback/route.ts     # OAuth + magic link callback
│   │   ├── invite/[token]/page.tsx    # invite acceptance
│   │   ├── dashboard/page.tsx         # placeholder home for signed-in users
│   │   ├── profile/page.tsx
│   │   └── admin/
│   │       ├── layout.tsx             # role-guarded admin shell
│   │       ├── page.tsx               # admin landing
│   │       ├── members/page.tsx
│   │       ├── members/[id]/page.tsx
│   │       ├── instrument-roles/page.tsx
│   │       └── service-types/page.tsx
│   ├── components/
│   │   ├── ui/                        # shadcn primitives
│   │   ├── auth/signin-form.tsx
│   │   ├── profile/profile-form.tsx
│   │   ├── admin/members-table.tsx
│   │   ├── admin/invite-dialog.tsx
│   │   ├── admin/instrument-roles-editor.tsx
│   │   ├── admin/service-types-editor.tsx
│   │   ├── pwa/install-prompt.tsx
│   │   └── pwa/push-permission-button.tsx
│   ├── lib/
│   │   ├── supabase/server.ts         # server-side Supabase client
│   │   ├── supabase/client.ts         # browser Supabase client
│   │   ├── supabase/middleware.ts     # session refresh middleware
│   │   ├── auth/guards.ts             # requireUser, requireRole helpers
│   │   ├── resend/client.ts
│   │   ├── push/register.ts           # browser-side PushSubscription helpers
│   │   └── types/database.types.ts    # generated from Supabase
│   ├── actions/                       # Next.js Server Actions
│   │   ├── profile.ts
│   │   ├── members.ts
│   │   ├── invites.ts
│   │   ├── instrument-roles.ts
│   │   ├── service-types.ts
│   │   └── push-subscriptions.ts
│   ├── middleware.ts                  # auth refresh on every request
│   └── workers/
│       └── service-worker.ts          # PWA service worker
└── tests/
    ├── unit/
    │   ├── auth/guards.test.ts
    │   └── invites/token.test.ts
    ├── integration/
    │   └── actions/invites.test.ts
    └── e2e/
        ├── auth.spec.ts
        ├── invite-flow.spec.ts
        └── admin-roles.spec.ts
```

---

## Phase 1 Tasks

### Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `vitest.config.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: nothing (greenfield).
- Produces: working `pnpm dev` and `pnpm build`; `pnpm test` runs Vitest; `pnpm test:e2e` runs Playwright.

- [ ] **Step 1: Initialize Next.js with TypeScript and Tailwind**

```bash
cd /Users/dev/worship-app
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbo
```

Expected: `package.json`, `tsconfig.json`, `src/app/` scaffolded.

- [ ] **Step 2: Enable strict TypeScript and pin Node version**

Edit `tsconfig.json` `compilerOptions`:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true
}
```

Add to `package.json`:

```json
"engines": { "node": ">=20.0.0" },
"packageManager": "pnpm@9.0.0"
```

- [ ] **Step 3: Install Vitest + Playwright + Testing Library**

```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom playwright @playwright/test
pnpm exec playwright install --with-deps chromium
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Add scripts to `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 4: Write a smoke E2E test to verify the scaffold runs**

Create `tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Worship/i);
});
```

- [ ] **Step 5: Update `src/app/layout.tsx` and `src/app/page.tsx` to have a recognizable title**

Replace `src/app/layout.tsx`:

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Worship App",
  description: "Scheduling for worship teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Replace `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Worship App</h1>
      <p>Foundation scaffold ready.</p>
    </main>
  );
}
```

- [ ] **Step 6: Run smoke test, verify it passes**

```bash
pnpm test:e2e
```

Expected: 1 passed.

- [ ] **Step 7: Add `.env.example`**

Create `.env.example`:

```
# Public (browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-only
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "phase1: project scaffold with Next.js, Tailwind, Vitest, Playwright"
```

---

### Task 2: shadcn/ui + base components

**Files:**
- Create: `components.json`, `src/components/ui/*` (Button, Input, Label, Dialog, Table, Badge, Toast, Form, Select, Checkbox)
- Modify: `src/app/globals.css` (theme variables)
- Modify: `tailwind.config.ts` (animations, color tokens)

**Interfaces:**
- Consumes: Task 1's Tailwind setup.
- Produces: A library of typed UI primitives reusable across the app, importable from `@/components/ui/*`.

- [ ] **Step 1: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
```

Choose: New York style · slate base color · CSS variables yes.

- [ ] **Step 2: Add baseline components**

```bash
pnpm dlx shadcn@latest add button input label dialog table badge toast form select checkbox dropdown-menu separator sheet card
```

- [ ] **Step 3: Verify a component renders by updating the home page**

Replace `src/app/page.tsx`:

```tsx
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Worship App</h1>
      <p>Foundation scaffold ready.</p>
      <Button>It works</Button>
    </main>
  );
}
```

- [ ] **Step 4: Run dev and visually verify**

```bash
pnpm dev
```

Open http://localhost:3000 — button should be styled (rounded, slate colors).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "phase1: shadcn/ui base component library"
```

---

### Task 3: Supabase project + local dev setup

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/.gitkeep`
- Modify: `.env.example` (already created in Task 1, no change)
- Create: `.env.local` (gitignored — values supplied by developer)

**Interfaces:**
- Consumes: nothing.
- Produces: Supabase cloud project + local Supabase running on `localhost:54321`. `supabase` CLI commands work from project root.

- [ ] **Step 1: Create cloud Supabase project**

Sign in at https://supabase.com, click **New project**. Name it `worship-app-prod`, choose nearest region, save the database password securely. Copy from Settings → API:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

Save these into `.env.local` (create it from `.env.example`).

- [ ] **Step 2: Install Supabase CLI and link**

```bash
brew install supabase/tap/supabase
supabase init
supabase link --project-ref <your-project-ref>
```

Expected: `supabase/config.toml` created, link successful.

- [ ] **Step 3: Start local Supabase**

```bash
supabase start
```

Expected: API URL `http://127.0.0.1:54321`, Studio URL, anon key, service role key all printed. Note the local anon key for `.env.test.local`.

- [ ] **Step 4: Install Supabase JS client and SSR helper**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 5: Create server + browser client helpers**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component; safe to ignore if middleware handles refresh
          }
        },
      },
    }
  );
}
```

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}
```

Create `src/middleware.ts`:

```ts
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|webmanifest)$).*)"],
};
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "phase1: Supabase client + middleware + local dev setup"
```

---

### Task 4: Migration 0001 — core Phase 1 tables

**Files:**
- Create: `supabase/migrations/0001_core_tables.sql`

**Interfaces:**
- Consumes: Task 3 (Supabase running).
- Produces: tables `users`, `instrument_roles`, `user_instrument_roles`, `service_types`, `invites`, `push_subscriptions`; enum `app_role`; types referenced by all later tasks.

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/phase1_schema.test.sql`:

```sql
begin;
select plan(8);

select has_table('public', 'users', 'users table exists');
select has_table('public', 'instrument_roles', 'instrument_roles table exists');
select has_table('public', 'user_instrument_roles', 'user_instrument_roles table exists');
select has_table('public', 'service_types', 'service_types table exists');
select has_table('public', 'invites', 'invites table exists');
select has_table('public', 'push_subscriptions', 'push_subscriptions table exists');
select has_type('public', 'app_role', 'app_role enum exists');
select col_is_pk('public', 'users', 'id', 'users.id is PK');

select * from finish();
rollback;
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
supabase test db
```

Expected: all 8 assertions fail (tables don't exist).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0001_core_tables.sql`:

```sql
-- App role enum
create type app_role as enum ('PASTOR', 'WORSHIP_HEAD', 'WORSHIP_LEADER', 'MEMBER');

-- Users (linked 1:1 with auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  avatar_url text,
  app_roles app_role[] not null default '{MEMBER}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index users_email_idx on public.users (lower(email));

-- Instrument roles lookup
create table public.instrument_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Join: which instrument roles a user can play
create table public.user_instrument_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  instrument_role_id uuid not null references public.instrument_roles(id) on delete cascade,
  primary key (user_id, instrument_role_id)
);

-- Service types (Sunday Service, TXT, Plug In, Teenagents, …)
create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  recurring_day int not null check (recurring_day between 0 and 6), -- 0=Sun
  recurring_time time,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Invites
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  intended_app_roles app_role[] not null default '{MEMBER}',
  intended_instrument_role_ids uuid[] not null default '{}',
  token text not null unique,
  invited_by uuid not null references public.users(id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null
);
create index invites_email_idx on public.invites (lower(email)) where accepted_at is null;

-- Push subscriptions (devices)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Auto-update updated_at on public.users
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();
```

- [ ] **Step 4: Apply the migration locally**

```bash
supabase db reset
```

Expected: migration applies cleanly, no errors.

- [ ] **Step 5: Run pgTAP test, verify it passes**

```bash
supabase test db
```

Expected: all 8 assertions pass.

- [ ] **Step 6: Seed default service types + instrument roles**

Create `supabase/seed.sql`:

```sql
insert into public.service_types (name, recurring_day, recurring_time, notes) values
  ('Sunday Service', 0, '10:00', 'Morning'),
  ('TXT', 5, null, null),
  ('Plug In', 2, null, null),
  ('Teenagents', 0, '15:00', 'Afternoon (community)')
on conflict (name) do nothing;

insert into public.instrument_roles (name, display_order) values
  ('Vocals 1', 10),
  ('Vocals 2', 20),
  ('Vocals 3', 30),
  ('Acoustic Guitar', 40),
  ('Electric Guitar', 50),
  ('Bass', 60),
  ('Keys', 70),
  ('Drums', 80),
  ('Sound', 90)
on conflict (name) do nothing;
-- Note: "Worship Leader" is an app-level role (in app_role enum), not an
-- instrument role. The WL of a service is tracked via services.worship_leader_id.
```

Re-run `supabase db reset` to load the seed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "phase1: migration 0001 core tables + seed data"
```

---

### Task 5: Migration 0002 — RLS policies for Phase 1 tables

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`
- Create: `supabase/tests/phase1_rls.test.sql`

**Interfaces:**
- Consumes: Task 4's tables.
- Produces: enforced RLS — any authenticated user reads `users` (limited fields), `instrument_roles`, `service_types`; Pastor/WH only can mutate them.

- [ ] **Step 1: Write the failing pgTAP RLS test**

Create `supabase/tests/phase1_rls.test.sql`:

```sql
begin;
select plan(6);

-- Set up: two auth users. Whether the bootstrap trigger from migration 0003
-- exists yet (Task 6) or not (Task 5 first run), we end up with rows in
-- public.users — either via the trigger OR via the explicit UPSERT below.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'pastor@test'),
  ('00000000-0000-0000-0000-000000000002', 'member@test');

insert into public.users (id, email, app_roles) values
  ('00000000-0000-0000-0000-000000000001', 'pastor@test', '{PASTOR,WORSHIP_HEAD}'),
  ('00000000-0000-0000-0000-000000000002', 'member@test', '{MEMBER}')
on conflict (id) do update
  set email = excluded.email,
      app_roles = excluded.app_roles;

-- Anonymous cannot read users
set local role anon;
select is_empty('select * from public.users', 'anon cannot read users');

-- Authenticated member can read users
set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-000000000002';
select isnt_empty('select * from public.users', 'authenticated member can read users');

-- Member cannot update another user — RLS silently filters the row, so
-- assert the target row's name is unchanged after the attempted update.
update public.users set name = 'hacked' where id = '00000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select coalesce(name, '') from public.users where id = '00000000-0000-0000-0000-000000000001' $$,
  $$ values (''::text) $$,
  'member cannot update other users'
);

-- Member can update self
update public.users set name = 'me' where id = '00000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select name from public.users where id = '00000000-0000-0000-0000-000000000002' $$,
  $$ values ('me'::text) $$,
  'member can update self'
);

-- Pastor can update any user
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-000000000001';
update public.users set name = 'updated' where id = '00000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select name from public.users where id = '00000000-0000-0000-0000-000000000002' $$,
  $$ values ('updated'::text) $$,
  'pastor can update any user'
);

-- Pastor can insert instrument_roles
insert into public.instrument_roles (name, display_order) values ('Cello', 100);
select results_eq(
  $$ select name from public.instrument_roles where name = 'Cello' $$,
  $$ values ('Cello'::text) $$,
  'pastor can insert instrument_roles'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
supabase test db
```

Expected: assertions fail (no RLS yet — anon reads return rows, etc.).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0002_rls_policies.sql`:

```sql
-- Helper: does the calling auth user have a given app role?
create or replace function public.current_user_has_role(target_role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.active = true
      and target_role = any(u.app_roles)
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean language sql stable as $$
  select public.current_user_has_role('PASTOR') or public.current_user_has_role('WORSHIP_HEAD');
$$;

-- Enable RLS
alter table public.users enable row level security;
alter table public.instrument_roles enable row level security;
alter table public.user_instrument_roles enable row level security;
alter table public.service_types enable row level security;
alter table public.invites enable row level security;
alter table public.push_subscriptions enable row level security;

-- users
create policy users_select_authenticated on public.users
  for select to authenticated using (true);

create policy users_update_self on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy users_admin_all on public.users
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- instrument_roles
create policy instrument_roles_select on public.instrument_roles
  for select to authenticated using (true);

create policy instrument_roles_admin on public.instrument_roles
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- user_instrument_roles
create policy uir_select on public.user_instrument_roles
  for select to authenticated using (true);

create policy uir_admin on public.user_instrument_roles
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- service_types
create policy service_types_select on public.service_types
  for select to authenticated using (true);

create policy service_types_admin on public.service_types
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- invites: admins manage; an invite is also readable by anyone holding the token (handled via server action with service role)
create policy invites_admin on public.invites
  for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- push_subscriptions: own rows only
create policy ps_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy ps_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

create policy ps_update_own on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ps_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
```

- [ ] **Step 4: Reapply and run RLS test**

```bash
supabase db reset
supabase test db
```

Expected: all assertions pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "phase1: migration 0002 RLS policies for Phase 1 tables"
```

---

### Task 6: Migration 0003 — first-user bootstrap

**Files:**
- Create: `supabase/migrations/0003_bootstrap_first_user.sql`
- Create: `supabase/tests/phase1_bootstrap.test.sql`

**Interfaces:**
- Consumes: Tasks 4–5.
- Produces: a trigger that, when the first `auth.users` row is created, creates the matching `public.users` row with `app_roles = {PASTOR, WORSHIP_HEAD}`. Subsequent sign-ups create rows with `MEMBER` only (unless an unconsumed invite matches their email, in which case the invite's `intended_app_roles` and `intended_instrument_role_ids` are applied and the invite is marked accepted).

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/phase1_bootstrap.test.sql`:

```sql
begin;
select plan(4);

-- First signup → PASTOR + WORSHIP_HEAD
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000010', 'first@test');
select results_eq(
  $$ select app_roles from public.users where id = '00000000-0000-0000-0000-000000000010' $$,
  $$ values ('{PASTOR,WORSHIP_HEAD}'::app_role[]) $$,
  'first signup becomes Pastor + WH'
);

-- Second signup with no invite → MEMBER
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000011', 'second@test');
select results_eq(
  $$ select app_roles from public.users where id = '00000000-0000-0000-0000-000000000011' $$,
  $$ values ('{MEMBER}'::app_role[]) $$,
  'second signup with no invite becomes Member'
);

-- Insert an invite for a third email
insert into public.invites (email, intended_app_roles, token, invited_by, expires_at) values
  ('invited@test', '{WORSHIP_LEADER}', 'tok-abc', '00000000-0000-0000-0000-000000000010', now() + interval '7 days');

-- Third signup with matching invite → roles from invite, invite consumed
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000012', 'invited@test');
select results_eq(
  $$ select app_roles from public.users where id = '00000000-0000-0000-0000-000000000012' $$,
  $$ values ('{WORSHIP_LEADER}'::app_role[]) $$,
  'invited signup adopts roles from invite'
);
select isnt_empty(
  $$ select 1 from public.invites where email = 'invited@test' and accepted_at is not null $$,
  'invite is marked accepted'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Run test, verify it fails**

```bash
supabase test db
```

Expected: assertions fail (no public.users row inserted).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0003_bootstrap_first_user.sql`:

```sql
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_count int;
  v_invite record;
  v_app_roles app_role[];
  v_instrument_ids uuid[];
begin
  select count(*) into v_user_count from public.users;

  -- Look for an unconsumed, unexpired invite matching the email
  select * into v_invite
  from public.invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by invited_at desc
  limit 1;

  if v_user_count = 0 then
    v_app_roles := array['PASTOR', 'WORSHIP_HEAD']::app_role[];
    v_instrument_ids := '{}';
  elsif v_invite.id is not null then
    v_app_roles := v_invite.intended_app_roles;
    v_instrument_ids := v_invite.intended_instrument_role_ids;
  else
    v_app_roles := array['MEMBER']::app_role[];
    v_instrument_ids := '{}';
  end if;

  insert into public.users (id, email, name, app_roles)
  values (new.id, new.email, coalesce(v_invite.name, ''), v_app_roles);

  -- Wire up instrument roles if any
  if array_length(v_instrument_ids, 1) > 0 then
    insert into public.user_instrument_roles (user_id, instrument_role_id)
    select new.id, unnest(v_instrument_ids);
  end if;

  -- Mark invite accepted
  if v_invite.id is not null then
    update public.invites set accepted_at = now() where id = v_invite.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
```

- [ ] **Step 4: Reapply, run test**

```bash
supabase db reset
supabase test db
```

Expected: all assertions pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "phase1: migration 0003 first-user bootstrap + invite consumption"
```

---

### Task 7: Generate database types

**Files:**
- Create: `src/lib/types/database.types.ts`
- Modify: `package.json` (add `db:types` script)

**Interfaces:**
- Consumes: Tasks 4–6 (schema fixed).
- Produces: `Database`, `Tables`, `Enums` types used everywhere data is read/written.

- [ ] **Step 1: Add the type-generation script**

Add to `package.json`:

```json
"db:types": "supabase gen types typescript --local > src/lib/types/database.types.ts"
```

- [ ] **Step 2: Generate types**

```bash
mkdir -p src/lib/types
pnpm db:types
```

Expected: `src/lib/types/database.types.ts` exists and is non-empty.

- [ ] **Step 3: Smoke-import the type**

Edit `src/lib/supabase/server.ts` to use the generated type:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    // …rest unchanged
```

Apply the same to `src/lib/supabase/client.ts` and `src/lib/supabase/middleware.ts`.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "phase1: generate Supabase database types"
```

---

### Task 8: Sign-in page + auth callback (email magic link + OAuth)

**Files:**
- Create: `src/app/signin/page.tsx`, `src/app/auth/callback/route.ts`
- Create: `src/components/auth/signin-form.tsx`
- Create: `src/lib/auth/guards.ts`
- Create: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: Task 3's Supabase client; Task 6's bootstrap trigger.
- Produces:
  - `requireUser()` → server helper returning current `User` row or redirecting to `/signin`
  - `requireRole(roles: AppRole[])` → server helper enforcing admin guard
  - sign-in completes the OAuth or magic-link flow and lands the user at `/dashboard`

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/auth.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("unauthenticated user is redirected from /dashboard to /signin", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/signin/);
});

test("sign-in page renders OAuth + magic link options", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in with apple/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
});
```

- [ ] **Step 2: Run, verify failure**

```bash
pnpm test:e2e auth
```

Expected: fails (no /signin page, no /dashboard).

- [ ] **Step 3: Implement auth guards**

Create `src/lib/auth/guards.ts`:

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type CurrentUser = Database["public"]["Tables"]["users"]["Row"];

export async function requireUser(): Promise<CurrentUser> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) redirect("/signin");
  return data;
}

export async function requireRole(roles: AppRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  const hasRole = user.app_roles.some((r) => roles.includes(r));
  if (!hasRole) redirect("/dashboard");
  return user;
}
```

- [ ] **Step 4: Implement the sign-in form component**

Create `src/components/auth/signin-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const supabase = createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

  async function signInWithOAuth(provider: "google" | "apple") {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  }

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <Button className="w-full" onClick={() => signInWithOAuth("google")}>Sign in with Google</Button>
      <Button className="w-full" onClick={() => signInWithOAuth("apple")}>Sign in with Apple</Button>

      <div className="text-center text-sm text-muted-foreground">or</div>

      <form onSubmit={signInWithMagicLink} className="space-y-3">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={status === "sending"}>
          {status === "sent" ? "Check your email" : "Send magic link"}
        </Button>
        {status === "error" && <p className="text-sm text-red-600">Couldn't send link. Try again.</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Implement the sign-in page and callback route**

Create `src/app/signin/page.tsx`:

```tsx
import { SignInForm } from "@/components/auth/signin-form";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Sign in</h1>
        <SignInForm />
      </div>
    </main>
  );
}
```

Create `src/app/auth/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
```

Create `src/app/dashboard/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Welcome, {user.name || user.email}</h1>
      <p className="text-sm text-muted-foreground">Roles: {user.app_roles.join(", ")}</p>
    </main>
  );
}
```

- [ ] **Step 6: Run E2E test, verify it passes**

```bash
pnpm test:e2e auth
```

Expected: both tests pass.

- [ ] **Step 7: Manually configure OAuth providers in Supabase dashboard**

In Supabase → Authentication → Providers, enable Google and Apple. Add OAuth credentials (Google Cloud + Apple Developer). Set the callback URL to `${NEXT_PUBLIC_APP_URL}/auth/callback`. Document the steps in `docs/runbook/oauth-setup.md`:

```bash
mkdir -p docs/runbook
```

Create `docs/runbook/oauth-setup.md` with step-by-step screenshots and field values for Google + Apple.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "phase1: sign-in page with OAuth and magic link + auth guards"
```

---

### Task 9: Sign-out + nav skeleton

**Files:**
- Create: `src/components/layout/app-shell.tsx`, `src/components/layout/user-menu.tsx`
- Modify: `src/app/dashboard/page.tsx`, `src/app/profile/page.tsx` (placeholder), `src/app/admin/page.tsx` (placeholder)
- Create: `tests/e2e/sign-out.spec.ts`

**Interfaces:**
- Consumes: Task 8 (`requireUser`).
- Produces: `<AppShell user={…}>` wraps every authenticated page; user menu has profile link, admin link (if admin), and sign out.

- [ ] **Step 1: Component-level test for `UserMenu`**

Create `tests/unit/layout/user-menu.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserMenu } from "@/components/layout/user-menu";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({}) } }),
}));

describe("UserMenu", () => {
  it("renders the user's name on the trigger", () => {
    render(<UserMenu name="Daryll" isAdmin={false} />);
    expect(screen.getByRole("button", { name: "Daryll" })).toBeInTheDocument();
  });
});
```

Sign-out behavior is verified manually in Step 5 (the full auth lifecycle is exercised by Tasks 8 + 19 deploy smoke-test).

- [ ] **Step 2: Build the user menu**

Create `src/components/layout/user-menu.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{name}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><Link href="/profile">Profile</Link></DropdownMenuItem>
        {isAdmin && <DropdownMenuItem asChild><Link href="/admin">Admin</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Build the AppShell**

Create `src/components/layout/app-shell.tsx`:

```tsx
import Link from "next/link";
import { UserMenu } from "./user-menu";
import type { CurrentUser } from "@/lib/auth/guards";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const isAdmin = user.app_roles.some((r) => r === "PASTOR" || r === "WORSHIP_HEAD");
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <Link href="/dashboard" className="font-semibold">Worship App</Link>
          <UserMenu name={user.name || user.email} isAdmin={isAdmin} />
        </div>
      </header>
      <main className="flex-1 container mx-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Wire dashboard / profile / admin placeholders through AppShell**

Update `src/app/dashboard/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold">Welcome, {user.name || user.email}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Roles: {user.app_roles.join(", ")}</p>
    </AppShell>
  );
}
```

Create stub `src/app/profile/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coming in Task 10.</p>
    </AppShell>
  );
}
```

Create stub `src/app/admin/page.tsx`:

```tsx
import { requireRole } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminPage() {
  const user = await requireRole(["PASTOR", "WORSHIP_HEAD"]);
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">Members, instrument roles, and service types live here.</p>
    </AppShell>
  );
}
```

- [ ] **Step 5: Visual check**

```bash
pnpm dev
```

Sign in (use real or test Supabase project), confirm AppShell + UserMenu render; Sign out returns to /signin.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "phase1: AppShell + UserMenu + sign-out"
```

---

### Task 10: Profile page (view + edit own)

**Files:**
- Create: `src/components/profile/profile-form.tsx`
- Create: `src/actions/profile.ts`
- Modify: `src/app/profile/page.tsx`
- Create: `tests/integration/actions/profile.test.ts`

**Interfaces:**
- Consumes: Task 8's `requireUser`.
- Produces: `updateProfile({ name, avatar_url })` server action — writes to `public.users` for `auth.uid()` only (enforced by RLS).

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/actions/profile.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe("updateProfile", () => {
  it("updates name on the current user's row", async () => {
    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email: `profile-test-${Date.now()}@test`,
      email_confirm: true,
    });
    expect(error).toBeNull();
    if (!user) throw new Error("no user");

    const { error: updateError } = await supabase
      .from("users")
      .update({ name: "Updated Name" })
      .eq("id", user.id);

    expect(updateError).toBeNull();
    const { data } = await supabase.from("users").select("name").eq("id", user.id).single();
    expect(data?.name).toBe("Updated Name");
  });
});
```

- [ ] **Step 2: Run, verify it fails (no action yet — but this hits the DB directly so it should actually pass; sanity-check that DB layer works)**

```bash
pnpm test profile
```

Expected: passes (validates DB + bootstrap). If it fails, fix DB setup before moving on.

- [ ] **Step 3: Write the server action**

Create `src/actions/profile.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  avatar_url: z.string().url().nullable().optional(),
});

export async function updateProfile(input: unknown) {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase
    .from("users")
    .update({ name: parsed.data.name, avatar_url: parsed.data.avatar_url ?? null })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
```

Install `zod`:

```bash
pnpm add zod
```

- [ ] **Step 4: Write the form component**

Create `src/components/profile/profile-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/actions/profile";

export function ProfileForm({ initialName, initialAvatarUrl }: { initialName: string; initialAvatarUrl: string | null }) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfile({ name, avatar_url: avatarUrl || null });
      setMessage(result.ok ? "Saved." : result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="avatar">Avatar URL (optional)</Label>
        <Input id="avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
      </div>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}
```

- [ ] **Step 5: Wire the page**

Replace `src/app/profile/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <ProfileForm initialName={user.name} initialAvatarUrl={user.avatar_url} />
    </AppShell>
  );
}
```

- [ ] **Step 6: Manual verification**

```bash
pnpm dev
```

Open /profile, change name, click Save, refresh, name persists.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "phase1: profile page (view + edit own)"
```

---

### Task 11: Admin layout + instrument roles editor

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/instrument-roles/page.tsx`
- Create: `src/components/admin/instrument-roles-editor.tsx`
- Create: `src/actions/instrument-roles.ts`

**Interfaces:**
- Consumes: Task 9's `AppShell`, Task 8's `requireRole`.
- Produces: server actions `createInstrumentRole(name, display_order)`, `updateInstrumentRole(id, patch)`, `deactivateInstrumentRole(id)`.

- [ ] **Step 1: Build the admin layout**

The layout owns the role guard for every page under `/admin/*`. Child pages can stay simple Server Components since the layout has already redirected unauthorized users.

Create `src/app/admin/layout.tsx`:

```tsx
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["PASTOR", "WORSHIP_HEAD"]);
  return (
    <AppShell user={user}>
      <nav className="mb-6 flex gap-4 border-b pb-2 text-sm">
        <Link href="/admin/members">Members</Link>
        <Link href="/admin/instrument-roles">Instrument Roles</Link>
        <Link href="/admin/service-types">Service Types</Link>
      </nav>
      {children}
    </AppShell>
  );
}
```

Now simplify `src/app/admin/page.tsx` (originally created in Task 9 with a redundant `requireRole`):

Replace `src/app/admin/page.tsx`:

```tsx
export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">Pick a section above to manage data.</p>
    </div>
  );
}
```

- [ ] **Step 2: Write the server actions**

Create `src/actions/instrument-roles.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  display_order: z.coerce.number().int().min(0).default(0),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80).optional(),
  display_order: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export async function createInstrumentRole(input: unknown) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = createClient();
  const { error } = await supabase.from("instrument_roles").insert(parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/instrument-roles");
  return { ok: true as const };
}

export async function updateInstrumentRole(input: unknown) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = createClient();
  const { id, ...patch } = parsed.data;
  const { error } = await supabase.from("instrument_roles").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/instrument-roles");
  return { ok: true as const };
}
```

- [ ] **Step 3: Write the editor component**

Create `src/components/admin/instrument-roles-editor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createInstrumentRole, updateInstrumentRole } from "@/actions/instrument-roles";

type Role = { id: string; name: string; display_order: number; active: boolean };

export function InstrumentRolesEditor({ initial }: { initial: Role[] }) {
  const [rows, setRows] = useState<Role[]>(initial);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const res = await createInstrumentRole({ name: newName, display_order: rows.length * 10 });
      if (res.ok) {
        setNewName("");
        // Page revalidates server-side; rely on next refresh
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  }

  function patch(id: string, change: Partial<Role>) {
    startTransition(async () => {
      const res = await updateInstrumentRole({ id, ...change });
      if (res.ok) {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));
      } else {
        alert(res.error);
      }
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex gap-2">
        <Input
          placeholder="New role name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button onClick={add} disabled={!newName || isPending}>Add</Button>
      </div>
      <ul className="divide-y border rounded">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-3">
            <Input
              className="flex-1"
              value={r.name}
              onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
              onBlur={() => patch(r.id, { name: r.name })}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={r.active} onCheckedChange={(v) => patch(r.id, { active: Boolean(v) })} />
              Active
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Wire the page**

Create `src/app/admin/instrument-roles/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { InstrumentRolesEditor } from "@/components/admin/instrument-roles-editor";

export default async function InstrumentRolesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("instrument_roles")
    .select("id, name, display_order, active")
    .order("display_order");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Instrument Roles</h2>
      <InstrumentRolesEditor initial={data ?? []} />
    </div>
  );
}
```

- [ ] **Step 5: Manually verify**

```bash
pnpm dev
```

Sign in as admin (first user). Visit /admin/instrument-roles. Add "Cello". Toggle active.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "phase1: admin layout + instrument roles editor"
```

---

### Task 12: Service types editor

**Files:**
- Create: `src/app/admin/service-types/page.tsx`
- Create: `src/components/admin/service-types-editor.tsx`
- Create: `src/actions/service-types.ts`

**Interfaces:**
- Consumes: Task 11's admin layout + role guard.
- Produces: server actions `createServiceType`, `updateServiceType` parallel to instrument roles. Includes `recurring_day` (0–6) and optional `recurring_time`.

- [ ] **Step 1: Server actions**

Create `src/actions/service-types.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const TimeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  recurring_day: z.coerce.number().int().min(0).max(6),
  recurring_time: z.string().regex(TimeRegex).nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
});

const UpdateSchema = CreateSchema.partial().extend({ id: z.string().uuid() });

export async function createServiceType(input: unknown) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = createClient();
  const { error } = await supabase.from("service_types").insert(parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/service-types");
  return { ok: true as const };
}

export async function updateServiceType(input: unknown) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = createClient();
  const { id, ...patch } = parsed.data;
  const { error } = await supabase.from("service_types").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/service-types");
  return { ok: true as const };
}
```

- [ ] **Step 2: Component**

Create `src/components/admin/service-types-editor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createServiceType, updateServiceType } from "@/actions/service-types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ServiceType = {
  id: string;
  name: string;
  recurring_day: number;
  recurring_time: string | null;
  notes: string | null;
  active: boolean;
};

export function ServiceTypesEditor({ initial }: { initial: ServiceType[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState({ name: "", recurring_day: 0, recurring_time: "", notes: "" });
  const [isPending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const res = await createServiceType({
        name: draft.name,
        recurring_day: draft.recurring_day,
        recurring_time: draft.recurring_time || null,
        notes: draft.notes || null,
      });
      if (res.ok) {
        setDraft({ name: "", recurring_day: 0, recurring_time: "", notes: "" });
        window.location.reload();
      } else alert(res.error);
    });
  }

  function patch(id: string, change: Partial<ServiceType>) {
    startTransition(async () => {
      const res = await updateServiceType({ id, ...change });
      if (res.ok) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));
      else alert(res.error);
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end p-3 border rounded">
        <div>
          <label className="text-xs">Name</label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs">Day</label>
          <Select value={String(draft.recurring_day)} onValueChange={(v) => setDraft({ ...draft, recurring_day: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs">Time (HH:MM, optional)</label>
          <Input type="time" value={draft.recurring_time} onChange={(e) => setDraft({ ...draft, recurring_time: e.target.value })} />
        </div>
        <Button onClick={add} disabled={!draft.name || isPending}>Add</Button>
      </div>

      <ul className="divide-y border rounded">
        {rows.map((r) => (
          <li key={r.id} className="p-3 grid grid-cols-1 md:grid-cols-5 items-center gap-2">
            <Input value={r.name} onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} onBlur={() => patch(r.id, { name: r.name })} />
            <span className="text-sm">{DAYS[r.recurring_day]}</span>
            <span className="text-sm">{r.recurring_time ?? "—"}</span>
            <Input value={r.notes ?? ""} placeholder="Notes" onChange={(e) => setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, notes: e.target.value } : x))} onBlur={() => patch(r.id, { notes: r.notes ?? null })} />
            <Button variant={r.active ? "outline" : "default"} onClick={() => patch(r.id, { active: !r.active })}>{r.active ? "Deactivate" : "Activate"}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Page**

Create `src/app/admin/service-types/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { ServiceTypesEditor } from "@/components/admin/service-types-editor";

export default async function ServiceTypesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("service_types")
    .select("id, name, recurring_day, recurring_time, notes, active")
    .order("recurring_day");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Service Types</h2>
      <ServiceTypesEditor initial={data ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Verify manually then commit**

```bash
pnpm dev
git add -A
git commit -m "phase1: service types admin editor"
```

---

### Task 13: Members list

**Files:**
- Create: `src/app/admin/members/page.tsx`
- Create: `src/components/admin/members-table.tsx`

**Interfaces:**
- Consumes: Task 11's admin layout.
- Produces: server-rendered table of all users with name, email, app roles, instrument roles, active status.

- [ ] **Step 1: Members table component**

Create `src/components/admin/members-table.tsx`:

```tsx
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Member = {
  id: string;
  name: string;
  email: string;
  app_roles: string[];
  active: boolean;
  instrument_role_names: string[];
};

export function MembersTable({ members }: { members: Member[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>App Roles</TableHead>
          <TableHead>Instruments</TableHead>
          <TableHead>Active</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => (
          <TableRow key={m.id}>
            <TableCell>{m.name || "—"}</TableCell>
            <TableCell>{m.email}</TableCell>
            <TableCell className="space-x-1">
              {m.app_roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{m.instrument_role_names.join(", ") || "—"}</TableCell>
            <TableCell>{m.active ? "Yes" : "No"}</TableCell>
            <TableCell><Link className="text-sm underline" href={`/admin/members/${m.id}`}>Edit</Link></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Page**

Create `src/app/admin/members/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { MembersTable } from "@/components/admin/members-table";

export default async function MembersPage() {
  const supabase = createClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, app_roles, active")
    .order("name");

  const { data: uir } = await supabase
    .from("user_instrument_roles")
    .select("user_id, instrument_roles(name)");

  const byUser: Record<string, string[]> = {};
  for (const row of uir ?? []) {
    const name = (row as any).instrument_roles?.name;
    if (!name) continue;
    (byUser[row.user_id] ??= []).push(name);
  }

  const members = (users ?? []).map((u) => ({
    ...u,
    instrument_role_names: byUser[u.id] ?? [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members</h2>
        <Button asChild><Link href="/admin/members/invite">Invite member</Link></Button>
      </div>
      <MembersTable members={members} />
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm dev
git add -A
git commit -m "phase1: admin members list"
```

---

### Task 14: Invite flow (Resend email)

**Files:**
- Create: `src/lib/resend/client.ts`
- Create: `src/actions/invites.ts`
- Create: `src/app/admin/members/invite/page.tsx`
- Create: `src/components/admin/invite-dialog.tsx`
- Create: `tests/unit/invites/token.test.ts`

**Interfaces:**
- Consumes: existing admin layout; Resend API key in env.
- Produces:
  - `createInvite({ email, name?, intended_app_roles, intended_instrument_role_ids })` server action → inserts an `invites` row with a 32-byte random token and 7-day expiry; sends an email via Resend with a link `/{NEXT_PUBLIC_APP_URL}/invite/{token}`.
  - `generateInviteToken()` pure helper (URL-safe base64, 32 random bytes) — unit-tested.

- [ ] **Step 1: Install Resend and write the token test**

```bash
pnpm add resend
```

Create `tests/unit/invites/token.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateInviteToken, INVITE_TOKEN_BYTES } from "@/lib/invites/token";

describe("generateInviteToken", () => {
  it("produces URL-safe tokens of expected length", () => {
    const t = generateInviteToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes base64url → ~43 chars (no padding)
    expect(t.length).toBe(Math.ceil((INVITE_TOKEN_BYTES * 4) / 3));
  });

  it("produces distinct tokens", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pnpm test invites/token
```

Expected: fails (module not found).

- [ ] **Step 3: Implement the token helper**

Create `src/lib/invites/token.ts`:

```ts
import { randomBytes } from "node:crypto";

export const INVITE_TOKEN_BYTES = 32;

export function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pnpm test invites/token
```

Expected: 2 passed.

- [ ] **Step 5: Resend client**

Create `src/lib/resend/client.ts`:

```ts
import { Resend } from "resend";

let _resend: Resend | null = null;
export function resend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not set");
    _resend = new Resend(key);
  }
  return _resend;
}
```

- [ ] **Step 6: Invite server action**

Create `src/actions/invites.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/resend/client";
import { generateInviteToken } from "@/lib/invites/token";

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(80).optional().default(""),
  intended_app_roles: z.array(z.enum(["PASTOR", "WORSHIP_HEAD", "WORSHIP_LEADER", "MEMBER"])).min(1),
  intended_instrument_role_ids: z.array(z.string().uuid()).default([]),
});

const INVITE_TTL_DAYS = 7;

export async function createInvite(input: unknown) {
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000).toISOString();

  const { error } = await supabase.from("invites").insert({
    email: parsed.data.email,
    name: parsed.data.name || null,
    intended_app_roles: parsed.data.intended_app_roles,
    intended_instrument_role_ids: parsed.data.intended_instrument_role_ids,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  });
  if (error) return { ok: false as const, error: error.message };

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  try {
    await resend().emails.send({
      from: "Worship App <invites@yourchurch.com>",
      to: parsed.data.email,
      subject: "You're invited to the worship team app",
      text:
        `Hi${parsed.data.name ? " " + parsed.data.name : ""},\n\n` +
        `You've been invited to join the worship team app.\n\n` +
        `Accept your invite here: ${inviteUrl}\n\n` +
        `This link expires in ${INVITE_TTL_DAYS} days.`,
    });
  } catch (e) {
    // Email failed — invite row exists; surface to admin
    return { ok: false as const, error: `Invite created but email failed: ${(e as Error).message}` };
  }

  revalidatePath("/admin/members");
  return { ok: true as const, inviteUrl };
}
```

- [ ] **Step 7: Invite page**

Create `src/app/admin/members/invite/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { InviteDialog } from "@/components/admin/invite-dialog";

export default async function InvitePage() {
  const supabase = createClient();
  const { data: roles } = await supabase
    .from("instrument_roles")
    .select("id, name")
    .eq("active", true)
    .order("display_order");

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-semibold">Invite a member</h2>
      <InviteDialog instrumentRoles={roles ?? []} />
    </div>
  );
}
```

Create `src/components/admin/invite-dialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createInvite } from "@/actions/invites";

const APP_ROLES = ["MEMBER", "WORSHIP_LEADER", "WORSHIP_HEAD", "PASTOR"] as const;

export function InviteDialog({ instrumentRoles }: { instrumentRoles: { id: string; name: string }[] }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [appRoles, setAppRoles] = useState<string[]>(["MEMBER"]);
  const [instr, setInstr] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle<T extends string>(list: T[], setter: (n: T[]) => void, value: T) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createInvite({
        email, name,
        intended_app_roles: appRoles,
        intended_instrument_role_ids: instr,
      });
      setMsg(res.ok ? `Invite sent. Link: ${res.inviteUrl}` : res.error);
      if (res.ok) { setEmail(""); setName(""); setAppRoles(["MEMBER"]); setInstr([]); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="name">Name (optional)</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <fieldset>
        <legend className="text-sm font-medium">App roles</legend>
        <div className="space-y-1 mt-2">
          {APP_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <Checkbox checked={appRoles.includes(r)} onCheckedChange={() => toggle(appRoles, setAppRoles, r)} />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Instrument roles</legend>
        <div className="space-y-1 mt-2 max-h-48 overflow-auto">
          {instrumentRoles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={instr.includes(r.id)} onCheckedChange={() => toggle(instr, setInstr, r.id)} />
              {r.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={isPending}>Send invite</Button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}
```

- [ ] **Step 8: Set up Resend domain + key**

In Resend dashboard: verify your church domain, generate an API key, paste into `.env.local` as `RESEND_API_KEY`. Set the `from` address in `createInvite` to a verified sender.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "phase1: invite flow with Resend email"
```

---

### Task 15: Edit-member page

**Files:**
- Create: `src/app/admin/members/[id]/page.tsx`
- Create: `src/actions/members.ts`

**Interfaces:**
- Consumes: Tasks 11–13.
- Produces: server action `updateMember({ id, app_roles?, instrument_role_ids?, active? })` — atomically updates the user row and replaces `user_instrument_roles` for that user.

- [ ] **Step 1: Server action**

Create `src/actions/members.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  id: z.string().uuid(),
  app_roles: z.array(z.enum(["PASTOR", "WORSHIP_HEAD", "WORSHIP_LEADER", "MEMBER"])).min(1).optional(),
  instrument_role_ids: z.array(z.string().uuid()).optional(),
  active: z.boolean().optional(),
});

export async function updateMember(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { id, app_roles, instrument_role_ids, active } = parsed.data;
  const supabase = createClient();

  if (app_roles || active !== undefined) {
    const patch: Record<string, unknown> = {};
    if (app_roles) patch.app_roles = app_roles;
    if (active !== undefined) patch.active = active;
    const { error } = await supabase.from("users").update(patch).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
  }

  if (instrument_role_ids) {
    await supabase.from("user_instrument_roles").delete().eq("user_id", id);
    if (instrument_role_ids.length > 0) {
      const rows = instrument_role_ids.map((ir) => ({ user_id: id, instrument_role_id: ir }));
      const { error } = await supabase.from("user_instrument_roles").insert(rows);
      if (error) return { ok: false as const, error: error.message };
    }
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${id}`);
  return { ok: true as const };
}
```

- [ ] **Step 2: Edit page**

Create `src/app/admin/members/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberEditForm } from "@/components/admin/member-edit-form";

export default async function EditMemberPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, app_roles, active")
    .eq("id", params.id)
    .single();
  if (!user) notFound();

  const { data: allRoles } = await supabase
    .from("instrument_roles")
    .select("id, name")
    .eq("active", true)
    .order("display_order");

  const { data: uir } = await supabase
    .from("user_instrument_roles")
    .select("instrument_role_id")
    .eq("user_id", params.id);

  const selected = (uir ?? []).map((r) => r.instrument_role_id);

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-semibold">{user.name || user.email}</h2>
      <MemberEditForm member={user} instrumentRoles={allRoles ?? []} initialSelected={selected} />
    </div>
  );
}
```

Create `src/components/admin/member-edit-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { updateMember } from "@/actions/members";

const APP_ROLES = ["MEMBER", "WORSHIP_LEADER", "WORSHIP_HEAD", "PASTOR"] as const;

type Member = { id: string; name: string; email: string; app_roles: string[]; active: boolean };

export function MemberEditForm({
  member, instrumentRoles, initialSelected,
}: { member: Member; instrumentRoles: { id: string; name: string }[]; initialSelected: string[] }) {
  const [appRoles, setAppRoles] = useState<string[]>(member.app_roles);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [active, setActive] = useState(member.active);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(list: string[], setter: (n: string[]) => void, v: string) {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function save() {
    startTransition(async () => {
      const res = await updateMember({
        id: member.id,
        app_roles: appRoles,
        instrument_role_ids: selected,
        active,
      });
      setMsg(res.ok ? "Saved." : res.error);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{member.email}</p>

      <fieldset>
        <legend className="text-sm font-medium">App roles</legend>
        <div className="space-y-1 mt-2">
          {APP_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <Checkbox checked={appRoles.includes(r)} onCheckedChange={() => toggle(appRoles, setAppRoles, r)} />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Instrument roles</legend>
        <div className="space-y-1 mt-2 max-h-64 overflow-auto">
          {instrumentRoles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(selected, setSelected, r.id)} />
              {r.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={active} onCheckedChange={(v) => setActive(Boolean(v))} />
        Active
      </label>

      <Button onClick={save} disabled={isPending}>Save</Button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm dev
git add -A
git commit -m "phase1: edit-member page (roles, instruments, active)"
```

---

### Task 16: Invite acceptance page

**Files:**
- Create: `src/app/invite/[token]/page.tsx`
- Create: `src/actions/invites.ts` (extend with `consumeInvite`)
- Create: `tests/e2e/invite-flow.spec.ts`

**Interfaces:**
- Consumes: Task 6's bootstrap trigger (handles invite consumption on first sign-in).
- Produces: a public page (no auth required) that:
  - Validates the token (not used, not expired).
  - Shows the invite details and a "Sign in" CTA that pre-fills the email.
  - On sign-in completion (callback), the bootstrap trigger applies the invite's roles and marks it consumed.

- [ ] **Step 1: E2E test (skeleton — full sign-in flow tested manually)**

Create `tests/e2e/invite-flow.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("invalid token shows error", async ({ page }) => {
  await page.goto("/invite/totally-fake-token-xyz");
  await expect(page.getByText(/invite has expired or is invalid/i)).toBeVisible();
});
```

- [ ] **Step 2: Server-side lookup helper (server component)**

Create `src/app/invite/[token]/page.tsx`:

```tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

// This page is public — use the service-role client server-side, never expose to browser.
function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function InviteAcceptPage({ params }: { params: { token: string } }) {
  const supabase = service();
  const { data } = await supabase
    .from("invites")
    .select("email, name, expires_at, accepted_at, intended_app_roles")
    .eq("token", params.token)
    .single();

  const isValid = data && !data.accepted_at && new Date(data.expires_at) > new Date();

  if (!isValid) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Invite expired</h1>
          <p className="text-sm text-muted-foreground">This invite has expired or is invalid. Ask your Worship Head to send a new one.</p>
        </div>
      </main>
    );
  }

  const signinUrl = `/signin?email=${encodeURIComponent(data.email)}`;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">You're invited!</h1>
        <p>Hi{data.name ? ` ${data.name}` : ""}, you've been invited to the worship team app as <strong>{data.intended_app_roles.join(", ")}</strong>.</p>
        <p className="text-sm text-muted-foreground">Sign in with <strong>{data.email}</strong> to accept.</p>
        <Button asChild className="w-full"><Link href={signinUrl}>Continue to sign in</Link></Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Update sign-in page to pre-fill email from query**

Modify `src/components/auth/signin-form.tsx`: accept an `initialEmail` prop. Modify `src/app/signin/page.tsx`:

```tsx
import { SignInForm } from "@/components/auth/signin-form";

export default function SignInPage({ searchParams }: { searchParams: { email?: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Sign in</h1>
        <SignInForm initialEmail={searchParams.email ?? ""} />
      </div>
    </main>
  );
}
```

And update `SignInForm` to accept `initialEmail` and seed `useState(initialEmail)`.

- [ ] **Step 4: Verify E2E test passes**

```bash
pnpm test:e2e invite
```

Expected: 1 passed.

- [ ] **Step 5: Manually test the full flow**

1. As admin, send an invite to a test email you control.
2. Open the invite link, see the welcome page.
3. Continue → sign in via magic link or Google with that email.
4. After sign-in, check the `users` row has `app_roles` from the invite and `user_instrument_roles` joined.
5. Check `invites.accepted_at` is set.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "phase1: invite acceptance page (token validation + sign-in handoff)"
```

---

### Task 17: PWA manifest + icons + service worker

**Files:**
- Create: `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`
- Create: `public/sw.js`
- Modify: `src/app/layout.tsx` (metadata, link manifest, theme color)
- Create: `src/components/pwa/install-prompt.tsx`
- Create: `src/components/pwa/service-worker-register.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: app is installable on Android Chrome and iOS Safari; an offline shell shows when the network fails (the static HTML for the current page).

- [ ] **Step 1: Generate placeholder icons**

For now use a 1-color block PNG; replace with branded icons later. Use ImageMagick or any tool:

```bash
mkdir -p public/icons
magick -size 512x512 xc:'#3b82f6' public/icons/icon-512.png
magick -size 192x192 xc:'#3b82f6' public/icons/icon-192.png
magick -size 512x512 xc:'#3b82f6' public/icons/maskable-512.png
```

(If ImageMagick isn't installed: `brew install imagemagick` first.)

- [ ] **Step 2: Manifest**

Create `public/manifest.webmanifest`:

```json
{
  "name": "Worship App",
  "short_name": "Worship",
  "description": "Scheduling for worship teams",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 3: Service worker**

Create `public/sw.js`:

```js
const CACHE = "worship-app-v1";
const PRECACHE = ["/", "/signin", "/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  // Network-first for HTML; cache-first for static assets
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((r) => r || fetch(request).then((networkRes) => {
      const copy = networkRes.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
      return networkRes;
    }))
  );
});
```

- [ ] **Step 4: Service worker registration**

Create `src/components/pwa/service-worker-register.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* swallow */ });
  }, []);
  return null;
}
```

- [ ] **Step 5: Install prompt component**

Create `src/components/pwa/install-prompt.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 md:bottom-6 md:right-6 md:left-auto md:max-w-sm rounded-lg border bg-background shadow-lg p-4 flex items-center gap-3">
      <p className="text-sm flex-1">Install the Worship App for push notifications and a native-feel experience.</p>
      <Button onClick={async () => { await deferred.prompt(); setDeferred(null); }}>Install</Button>
      <Button variant="ghost" onClick={() => setDismissed(true)}>Later</Button>
    </div>
  );
}
```

- [ ] **Step 6: Wire into root layout**

Modify `src/app/layout.tsx`:

```tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export const metadata: Metadata = {
  title: "Worship App",
  description: "Scheduling for worship teams",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Worship" },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Manual install test**

Run `pnpm dev`; open on a phone (via local network or deploy to Vercel preview); install on Android Chrome — should appear in app drawer. On iOS Safari, tap Share → Add to Home Screen.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "phase1: PWA manifest, service worker, install prompt"
```

---

### Task 18: Push subscription registration

**Files:**
- Create: `src/lib/push/register.ts`
- Create: `src/actions/push-subscriptions.ts`
- Create: `src/components/pwa/push-permission-button.tsx`
- Modify: `src/app/profile/page.tsx` (mount the button)

**Interfaces:**
- Consumes: Task 4's `push_subscriptions` table.
- Produces:
  - Server action `savePushSubscription({ endpoint, p256dh, auth, device_label? })` upserting on `(user_id, endpoint)`.
  - Server action `removePushSubscription({ endpoint })`.
  - Client helper `subscribeToPush(): Promise<void>` that prompts permission, subscribes via the service worker, and calls `savePushSubscription`.

VAPID keys are generated once via `npx web-push generate-vapid-keys` and stored in env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. (The private key is consumed in Phase 5 when we send push.)

- [ ] **Step 1: Generate VAPID keys**

```bash
pnpm dlx web-push generate-vapid-keys
```

Copy the two keys into `.env.local`. Mirror the public key into `NEXT_PUBLIC_VAPID_PUBLIC_KEY` so the browser can read it.

- [ ] **Step 2: Server actions**

Create `src/actions/push-subscriptions.ts`:

```ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SaveSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  device_label: z.string().max(80).optional(),
});

export async function savePushSubscription(input: unknown) {
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, ...parsed.data, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,endpoint" }
    );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function removePushSubscription(input: { endpoint: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", input.endpoint);
  return { ok: true as const };
}
```

- [ ] **Step 3: Browser helper**

Create `src/lib/push/register.ts`:

```ts
import { savePushSubscription } from "@/actions/push-subscriptions";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeToPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "Push not supported on this device" };
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Permission denied" };

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });

  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const res = await savePushSubscription({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    device_label: navigator.userAgent.slice(0, 80),
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}
```

- [ ] **Step 4: UI button**

Create `src/components/pwa/push-permission-button.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { subscribeToPush } from "@/lib/push/register";

export function PushPermissionButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function enable() {
    startTransition(async () => {
      const res = await subscribeToPush();
      setMsg(res.ok ? "Push enabled on this device." : res.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={enable} disabled={isPending}>Enable push on this device</Button>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Mount on profile page**

Modify `src/app/profile/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { PushPermissionButton } from "@/components/pwa/push-permission-button";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="space-y-8">
        <ProfileForm initialName={user.name} initialAvatarUrl={user.avatar_url} />
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <PushPermissionButton />
        </section>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 6: Manual test**

Open the deployed app on Android Chrome → Profile → Enable push → grant permission → check Supabase `push_subscriptions` for a new row with the device's endpoint. Repeat on iOS (after installing PWA to home screen).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "phase1: push subscription registration (VAPID + service worker)"
```

---

### Task 19: Deploy to Vercel + runbook

**Files:**
- Create: `docs/runbook/deploy.md`, `docs/runbook/oauth-setup.md` (extends Task 8), `README.md`
- Modify: `next.config.mjs` (if any prod tweaks needed — likely none for Phase 1)

**Interfaces:**
- Consumes: everything.
- Produces: a live URL serving Phase 1.

- [ ] **Step 1: Connect repo to Vercel**

In Vercel dashboard: import the GitHub repo, choose Next.js framework. Add env vars (every variable in `.env.example` except local-only ones). Pin Node version to 20.

- [ ] **Step 2: Set production Supabase URLs**

In Vercel env: use the production Supabase URL + anon key (NOT the local). In Supabase auth settings, add the Vercel preview + production URLs to allowed redirect URLs.

- [ ] **Step 3: Run a deploy**

Push to `main`. Confirm Vercel builds green and the URL loads.

- [ ] **Step 4: Smoke test in production**

1. Sign in (first user → Pastor + WH).
2. Visit /admin/instrument-roles, add a role.
3. Send an invite to a second test email; accept it on a different device; verify roles applied.
4. Install the PWA on Android.
5. Enable push (the row should appear in `push_subscriptions`).

- [ ] **Step 5: Write the README**

Create `README.md` with:
- Project overview (link to spec)
- Local dev setup (Supabase CLI, env vars, pnpm commands)
- Test commands
- Deploy notes (link to `docs/runbook/deploy.md`)
- Phase status (link to plans directory)

- [ ] **Step 6: Commit + tag**

```bash
git add -A
git commit -m "phase1: deployment runbook + README"
git tag -a phase1-complete -m "Phase 1: Foundation & Auth complete"
```

---

## Phase 1 Acceptance Criteria

When all 19 tasks are complete, the following must be true:

- [ ] App is deployed to a Vercel production URL.
- [ ] First-time sign-in creates a Pastor + Worship Head user via the bootstrap trigger.
- [ ] Pastor + WH can view/edit/deactivate all members.
- [ ] Pastor + WH can manage instrument roles and service types.
- [ ] An admin can send an invite via Resend; the recipient can accept it via the link; their `app_roles` and `user_instrument_roles` reflect the invite.
- [ ] Any signed-in user can edit their own profile (name, avatar).
- [ ] PWA installs cleanly on Android Chrome and iOS Safari (after Share → Add to Home Screen).
- [ ] Users can register a push subscription from Profile; a row lands in `push_subscriptions` (push delivery itself is deferred to Phase 5).
- [ ] All RLS policies pass pgTAP tests.
- [ ] Playwright smoke + auth + invite E2E tests all pass on CI.
- [ ] No `any` types in committed code; `pnpm typecheck` exits clean.

---

## Future Phases (Sketched — Each Will Get Its Own Plan)

### Phase 2 — Scheduling
Deliver: WH builds monthly Schedule (auto-generates service rows from active service_types), assigns WL + instrument-role-filtered team per service, submits for Pastor approval; Pastor approves/rejects with reason. Members see published Schedule with their assignments highlighted. Includes migration for `schedules`, `services`, `service_assignments`; state machine + RLS; Schedule Builder UI; Pastor approval UI; published view.

### Phase 3 — Line-ups & YouTube
Deliver: WL submits line-up for the service(s) they lead. Paste-parser with preview-before-save. WH approves/rejects with reason. On approval, an Edge Function generates a YouTube playlist (one-time OAuth setup for the church Google account). Includes migrations for `line_ups`, `line_up_songs`; paste-parser unit tests; YouTube Edge Function with fixtures.

### Phase 4 — Substitution
Deliver: a member with an assignment requests a sub from a specific eligible person (matching instrument role, no same-day conflict). Sub accepts/declines; if accepted, WL approves/rejects. On approval, original assignment flips to `SUBBED_OUT` and a new `SUBBING_FOR` row is created. Lock after service date passes. Includes migration for `substitution_requests`; sub-request UI; approval flow.

### Phase 5 — Notifications, Reminders & Amendments
Deliver:
- A unified notification dispatch service (Supabase Edge Function) that, per event, inserts `notifications` rows and sends Web Push + email in parallel.
- Per-user notification preferences (push/email/reminders toggles).
- Quiet hours (10pm–7am local).
- Scheduled reminders (24h before service, 7d before service for missing line-ups) via Supabase Scheduled Functions / pg_cron.
- Schedule Amendment flow (post-approval edits via `schedule_amendments` with Pastor re-approval and diff view).
- In-app inbox view + unread badges.

Each phase is independently shippable. Phase 2 unlocks 3 and 4; Phase 5 is partially independent (amendments depend on Phase 2; reminders depend on Phase 3/4).
