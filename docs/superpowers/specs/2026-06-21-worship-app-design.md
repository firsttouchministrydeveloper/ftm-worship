# FTM Worship — Design Spec

**Name:** FTM Worship
**Working title in code/repo:** `worship-app`

**Date:** 2026-06-21
**Owner:** Daryll
**Status:** Approved (ready for implementation planning)

## 1. Purpose

Digitalize the worship team's existing scheduling workflow so the Worship Head, Pastor, Worship Leaders, and Members can submit, approve, and coordinate Schedules, Line-ups, and Substitutions from any device.

The app replaces ad-hoc messaging and spreadsheets with a single source of truth: a published monthly Schedule, a Line-up per service, and a clean Substitution flow with dual approval.

## 2. Scope

**In scope (MVP):**
- Monthly Schedule submission and approval covering all four service types.
- Per-service Line-up submission and approval, with paste-parse and automatic YouTube playlist generation.
- Substitution requests with dual approval (sub + Worship Leader).
- Schedule amendments (post-approval changes) with Pastor re-approval.
- Member management, app roles, instrument roles.
- Push + email notifications + in-app inbox.
- Reminders before service dates and for missing line-ups.

**Explicitly out of scope (for now):**
- Multi-church / multi-tenant support — single-church only.
- Member availability / blackout dates — Worship Head assigns blind; conflicts handled via Substitution.
- Pastor fallback approval for line-ups or subs — only the Worship Head can approve line-ups and subs. If unavailable, role can be reassigned temporarily.
- Shared song library — songs are free-text per line-up.
- Native app store distribution — web-installable PWA only. TWA wrapper for Play Store can be added later if desired.

## 3. Users & Roles

A user holds two independent sets of roles, both stackable:

**App roles** (permissions):
- `PASTOR` — approves Schedules and Amendments; manages members.
- `WORSHIP_HEAD` — submits Schedules; approves Line-ups and Substitutions; manages members.
- `WORSHIP_LEADER` — submits Line-ups for services they lead; approves sub requests for those services.
- `MEMBER` — receives assignments; requests subs; responds to sub requests directed at them.

**Instrument roles** (musical positions):
- A user can be marked for one or more instrument roles (Drums, Bass, Keys, Acoustic Guitar, Electric Guitar, Vocals 1, Vocals 2, etc.). The list is editable in admin.
- The Worship Head can only assign a member to a service in an instrument role the member is marked for.

A single user can hold any combination — e.g., Pastor + Worship Leader + Vocals + Keys.

**Self-action guard:** a user cannot approve a submission they made themselves, even if they hold both submitter and approver roles.

## 4. Service Types

Four recurring service types, stored as editable lookup rows:

| Service Type | Day | Notes |
|---|---|---|
| Sunday Service | Sunday | Morning |
| TXT | Friday | |
| Plug In | Tuesday | |
| Teenagents | Sunday | Afternoon (community) |

The Schedule builder auto-generates one service occurrence per service-type per relevant date in the chosen month.

## 5. Architecture

**Stack:**
- **Frontend:** Next.js 14+ (App Router, TypeScript), deployed as a PWA on Vercel. Tailwind CSS + shadcn/ui component library. Framer Motion for app-like transitions.
- **Backend-as-a-service:** Supabase — managed Postgres, Auth (Google/Apple/Email), Row-Level Security, Realtime, Storage, Edge Functions.
- **Push notifications:** Web Push API (VAPID), dispatched from Supabase Edge Functions. One implementation covers Android and iOS (iOS 16.4+).
- **Email:** Resend (transactional, with deep links into the PWA).
- **YouTube playlist generation:** Supabase Edge Function calling YouTube Data API v3, authenticated as a single church-owned Google account via stored refresh token.

**Why this shape:**
- Single managed backend (Supabase) — no separate API server to deploy or maintain.
- Postgres + RLS enforces data security at the database level; UI bugs cannot leak data.
- Realtime subscriptions allow approval UIs to update instantly without polling.
- Generous free tiers across all providers; a single church can run at zero cost for the foreseeable future.

**Expected monthly cost (under ~100 active users):** $0. Beyond free tier, ~$25/month gets significantly more headroom.

## 6. Data Model

### 6.1 Users

```
users
  id (uuid, PK, FK to auth.users)
  name (text)
  email (text, unique)
  avatar_url (text, nullable)
  app_roles (text[] — subset of {PASTOR, WORSHIP_HEAD, WORSHIP_LEADER, MEMBER})
  active (boolean, default true)
  created_at, updated_at
```

```
user_instrument_roles
  user_id (FK users)
  instrument_role_id (FK instrument_roles)
  PRIMARY KEY (user_id, instrument_role_id)
```

```
instrument_roles
  id (uuid, PK)
  name (text, unique) — e.g., "Drums", "Bass", "Vocals 1"
  display_order (int)
```

### 6.2 Service catalogue

```
service_types
  id (uuid, PK)
  name (text, unique) — e.g., "Sunday Service"
  recurring_day (int — 0=Sun .. 6=Sat)
  recurring_time (time, nullable)
  notes (text, nullable)
  active (boolean, default true)
```

### 6.3 Scheduling

```
schedules
  id (uuid, PK)
  month (int 1..12)
  year (int)
  status (enum: DRAFT | SUBMITTED | APPROVED | REJECTED)
  submitted_by (FK users, nullable)
  submitted_at (timestamptz, nullable)
  approved_by (FK users, nullable)
  approved_at (timestamptz, nullable)
  rejection_reason (text, nullable)
  created_at, updated_at
  UNIQUE (month, year)
```

```
services
  id (uuid, PK)
  schedule_id (FK schedules)
  service_type_id (FK service_types)
  date (date)
  start_time (time, nullable)
  worship_leader_id (FK users, nullable until assigned)
  notes (text, nullable)
  UNIQUE (schedule_id, service_type_id, date)
```

```
service_assignments
  id (uuid, PK)
  service_id (FK services)
  user_id (FK users)
  instrument_role_id (FK instrument_roles)
  status (enum: ASSIGNED | SUBBED_OUT | SUBBING_FOR)
  replaced_assignment_id (FK service_assignments, nullable — set when SUBBING_FOR)
  UNIQUE (service_id, user_id, instrument_role_id)
```

```
schedule_amendments
  id (uuid, PK)
  schedule_id (FK schedules)
  description (text)
  changes (jsonb — snapshot of intended diff: assignments added/removed/changed)
  status (enum: PENDING_REVIEW | APPROVED | REJECTED)
  submitted_by (FK users)
  submitted_at (timestamptz)
  approved_by (FK users, nullable)
  approved_at (timestamptz, nullable)
  rejection_reason (text, nullable)
```

### 6.4 Line-ups

```
line_ups
  id (uuid, PK)
  service_id (FK services, unique)
  status (enum: DRAFT | SUBMITTED | APPROVED | REJECTED)
  submitted_by (FK users, nullable)
  submitted_at (timestamptz, nullable)
  approved_by (FK users, nullable)
  approved_at (timestamptz, nullable)
  rejection_reason (text, nullable)
  youtube_playlist_url (text, nullable — set after generation)
  created_at, updated_at
```

```
line_up_songs
  id (uuid, PK)
  line_up_id (FK line_ups)
  position (int)
  title (text)
  link (text, nullable)
  recommended_key (text, nullable)
  lead (text, nullable — free text, not a user FK)
  UNIQUE (line_up_id, position)
```

### 6.5 Substitution

```
substitution_requests
  id (uuid, PK)
  service_assignment_id (FK service_assignments)
  requester_id (FK users)
  sub_user_id (FK users)
  reason (text, nullable)
  status (enum: PENDING_SUB | PENDING_LEADER | APPROVED | DECLINED_BY_SUB | REJECTED_BY_LEADER)
  sub_responded_at (timestamptz, nullable)
  sub_response_note (text, nullable)
  leader_responded_at (timestamptz, nullable)
  leader_response_note (text, nullable)
  created_at, updated_at
```

### 6.6 Notifications & devices

```
notifications
  id (uuid, PK)
  user_id (FK users)
  type (text — e.g., SCHEDULE_APPROVED, SUB_REQUEST_RECEIVED)
  entity_type (text, nullable)
  entity_id (uuid, nullable)
  title (text)
  body (text)
  deep_link (text)
  read_at (timestamptz, nullable)
  sent_push_at (timestamptz, nullable)
  sent_email_at (timestamptz, nullable)
  created_at (timestamptz)
```

```
push_subscriptions
  id (uuid, PK)
  user_id (FK users)
  endpoint (text)
  p256dh (text)
  auth (text)
  device_label (text, nullable)
  created_at, last_seen_at
```

### 6.7 Invites

```
invites
  id (uuid, PK)
  email (text)
  name (text, nullable)
  intended_app_roles (text[])
  intended_instrument_role_ids (uuid[])
  token (text, unique)
  invited_by (FK users)
  invited_at (timestamptz)
  accepted_at (timestamptz, nullable)
  expires_at (timestamptz)
```

### 6.8 Row-Level Security (summary)

- **`users`**: read all (limited fields); update only self. Insert/delete by Pastor/WH.
- **`schedules`, `services`, `service_assignments`**: read all when schedule is APPROVED. Drafts readable by WH + Pastor only. Mutations by WH only; status transitions enforce role + self-action guard.
- **`schedule_amendments`**: read by Pastor + WH; insert by WH; update (approval) by Pastor only.
- **`line_ups`, `line_up_songs`**: read by all when APPROVED; drafts readable by the assigned WL + WH + Pastor. Mutations by the service's WL only; approval status changes by WH only.
- **`substitution_requests`**: read by parties involved + the service's WL + WH; insert by the requester; sub response by `sub_user_id`; leader response by the service's WL.
- **`notifications`, `push_subscriptions`**: read/update only the owning user.
- **`invites`**: read by Pastor + WH; resolved by token at sign-up.

All status transitions are guarded by Postgres functions that enforce the state machine.

## 7. Core Workflows

### 7.1 Monthly Schedule

```
DRAFT  ──WH submits──▶  SUBMITTED  ──Pastor approves──▶  APPROVED
                                  └─Pastor rejects (+reason)─▶  REJECTED ──▶ back to DRAFT
```

- WH opens "New monthly schedule" → picks month → app auto-generates one row per service occurrence.
- WH assigns Worship Leader + instrument-role-filtered team members per service.
- Save Draft any time; Submit for Approval when ready.
- Pastor receives notification, reviews, taps Approve or Reject (Reject requires a reason).
- On APPROVED: schedule is published; all members notified.
- On REJECTED: WH sees the reason; schedule returns to DRAFT for editing.

### 7.2 Schedule Amendment (post-approval)

```
PENDING_REVIEW  ──Pastor approves──▶  APPROVED ──▶ applied to schedule
                              └─Pastor rejects──▶  REJECTED
```

- WH opens an APPROVED schedule → "Propose amendment" → makes edits in a sandbox view (does not mutate the live schedule yet) → submits with optional description.
- On submit, the system computes a diff between the sandbox and the live schedule and stores it in `schedule_amendments.changes` as a structured JSON document (`{assignments_added: [...], assignments_removed: [...], assignments_changed: [...], wl_changes: [...], etc.}`). The live schedule remains unchanged until approval.
- Pastor sees a focused diff view rendered from `changes` and approves or rejects.
- On APPROVED: the diff is applied transactionally to the schedule; affected members (anyone added, removed, or swapped) are notified.
- Multiple amendments can be in-flight simultaneously; they're applied in order of approval, and a stale amendment (one whose pre-image no longer matches the live schedule) is auto-rejected with reason "Underlying schedule changed — please re-propose."

### 7.3 Line-up

```
DRAFT  ──WL submits──▶  SUBMITTED  ──WH approves──▶  APPROVED ──▶ YouTube playlist generated
                                  └─WH rejects (+reason)─▶  REJECTED ──▶ back to DRAFT
```

- WL opens the service they lead → adds songs one-by-one or via Paste-Line-Up flow → submits.
- WH receives notification, approves or rejects (reason required).
- On APPROVED: Edge Function generates a YouTube playlist from any YouTube links; team is notified with playlist link.

### 7.4 Substitution

```
                                  ┌─sub declines──▶  DECLINED_BY_SUB ─▶ requester picks another
PENDING_SUB  ──sub accepts──▶  PENDING_LEADER ──WL approves──▶  APPROVED
                                  └─WL rejects──▶  REJECTED_BY_LEADER
```

- Requester opens their assignment → "Request sub" → picks a member with at least one matching instrument role and no conflicting assignment that day → optional reason → submits.
- Sub receives notification + email, taps Accept or Decline.
- On accept, WL of that service is notified, approves or rejects.
- On APPROVED: original assignment status flips to `SUBBED_OUT`; new assignment created with `SUBBING_FOR` linking to the original.
- Sub flow is locked after the service date passes.

## 8. Permissions Matrix

| Action | Pastor | Worship Head | Worship Leader (their service) | Member |
|---|---|---|---|---|
| View published Schedule | ✓ | ✓ | ✓ | ✓ |
| View approved Line-ups | ✓ | ✓ | ✓ | ✓ |
| View own assignments + sub requests | ✓ | ✓ | ✓ | ✓ |
| Edit own profile | ✓ | ✓ | ✓ | ✓ |
| Manage members | ✓ | ✓ | — | — |
| Manage instrument roles & service types | ✓ | ✓ | — | — |
| Create / edit draft Schedule | — | ✓ | — | — |
| Submit Schedule for approval | — | ✓ | — | — |
| Approve / reject Schedule | ✓ | — | — | — |
| Propose Schedule amendment | — | ✓ | — | — |
| Approve / reject amendment | ✓ | — | — | — |
| Create / edit Line-up | — | — | ✓ | — |
| Submit Line-up for approval | — | — | ✓ | — |
| Approve / reject Line-up | — | ✓ | — | — |
| Request a substitute | (if assigned) | (if assigned) | (if assigned) | (if assigned) |
| Respond to sub request directed at me | ✓ | ✓ | ✓ | ✓ |
| Approve / reject a sub request | — | — | ✓ | — |

Permissions stack across app roles. Self-action guard prevents a user from approving their own submissions.

If multiple users hold the same approver role (e.g., two Pastors), any of them can act on a pending approval; the first to act wins, the second sees "Already approved by X" (see §13).

## 9. Notifications

Each event creates one `notifications` row per recipient, delivered via push + email in parallel. The in-app inbox is canonical.

### 9.1 Triggers

**Schedule**
| Event | Recipient | CTA |
|---|---|---|
| WH submits Schedule | Pastor | Review schedule |
| Pastor approves | All members | View your assignments |
| Pastor rejects | WH | View reason, edit, resubmit |
| WH submits amendment | Pastor | Review amendment |
| Amendment approved | Members affected by the change | View updated assignments |
| Amendment rejected | WH | View reason |

**Line-up**
| Event | Recipient | CTA |
|---|---|---|
| WL submits | WH | Review line-up |
| WH approves | Team for that service | View line-up + playlist |
| WH rejects | WL | View reason, edit, resubmit |

**Substitution**
| Event | Recipient | CTA |
|---|---|---|
| Sub requested | The picked sub | Accept / decline |
| Sub accepts | WL of that service | Approve / reject |
| Sub declines | Requester | Pick someone else |
| WL approves sub | Requester + sub + WH | View updated assignment |
| WL rejects sub | Requester + sub | View reason, try again |

**Reminders**
- 24 hours before a service: everyone with an `ASSIGNED` or `SUBBING_FOR` assignment for that service. Computed against `services.start_time` when set; otherwise sent at 6pm local time the day before.
- 7 days before a service: the WL of that service, only if the line-up is still in DRAFT or unsubmitted at the time the reminder is computed.

The "team for that service" — used throughout this section — means every user with a `service_assignments` row for the service whose status is `ASSIGNED` or `SUBBING_FOR` (i.e., currently expected to play).

### 9.2 Delivery rules

- Push to every registered device for the user.
- Email always sent in parallel (deep-link to the relevant screen).
- Quiet hours 10pm–7am local time: hold push until 7am; email is unaffected.
- Grouping: 3+ notifications for the same Schedule within 60 seconds collapse into one summary notification.

### 9.3 Per-user preferences

In Profile → Notifications, a user can:
- Disable email (push only).
- Disable push per device.
- Disable reminders.
- Approval-related notifications cannot be disabled.

## 10. Line-up Paste-Parser

**Goal:** the WL pastes any reasonably structured multi-line line-up; the parser produces a draft list; the WL reviews before saving.

**Block detection rules** (start a new song block when):
- A blank line appears, OR
- A line begins with a number, bullet, or dash (`1.`, `1)`, `-`, `•`), OR
- The current block already has both a title and a URL.

**Per-block extraction:**
- **Link**: first line matching a URL regex; stripped from any title candidate.
- **Title**: longest non-URL line, after stripping leading numbers/bullets and trailing key/lead patterns.
- **Key**: capture from `Key:\s*([A-G](#|b)?(m|maj|sus|7)?)` or trailing parens like `(G)`; strip from title.
- **Lead**: capture from `Lead:\s*(.+)` or trailing `(led by John)`; strip from title.

**Preview-before-save** is mandatory. After parse, an editable table appears with confidence dots on uncertain fields. The WL can edit, reorder, add, or remove rows before committing.

A help link near the paste box shows the preferred format:

```
1. Way Maker (G) — Lead: John
   https://youtube.com/watch?v=xxxx

2. Build My Life (C)
   https://youtube.com/watch?v=yyyy
```

## 11. YouTube Playlist Generation

**One-time setup:** Worship Head signs in once with a church-owned Google account and grants `youtube` scope via an in-app "Authorize YouTube" button. The refresh token is stored as a Supabase secret.

**Trigger:** line-up transitions to APPROVED.

**Flow (Edge Function):**
1. Read line-up; collect songs whose `link` matches a YouTube URL pattern (`youtube.com/watch`, `youtu.be/`, `music.youtube.com/watch`).
2. Extract video IDs.
3. Mint an access token from the stored refresh token.
4. Call `playlists.insert` with privacy `unlisted` and a generated title (e.g. `"June 14 Sunday Service — Way Maker, +5 more"`).
5. For each video ID, call `playlistItems.insert`.
6. Set `line_ups.youtube_playlist_url` to the resulting URL.
7. Fire the team notification (which already includes the playlist link).

**Edge cases:**
- **Zero YouTube links** → skip playlist creation; notification omits playlist link.
- **Dead / private video** → log and continue; surface a non-blocking warning to the WL: "Playlist created — 1 video couldn't be added."
- **Token expired / revoked** → surface to admins: "Reconnect YouTube account." Line-up approval still succeeds.
- **Quota exceeded** → retry next day; line-up approval is independent of playlist success.
- **Idempotency** → skip if `youtube_playlist_url` is already set.

**Quota estimate:** ~30 services × ~6 songs/month = ~10,500 units total, spread across the month. Daily quota of 10,000 units is comfortably sufficient.

## 12. UI Structure

**Mobile-first PWA. Bottom tab bar:** Home · Schedule · Inbox · Profile.

**Screens:**

1. **Home** — "Your next assignment" card; "Pending actions" (role-aware approvals + incoming sub requests); "This week" list.
2. **Schedule** — month view, filter by service type, tap into Service detail.
3. **Service detail** — date/type/time, WL, team grid by instrument role, line-up section + playlist link, role-aware action buttons.
4. **Schedule builder** (WH) — auto-generated service rows, WL + team pickers per service, Save Draft / Submit.
5. **Line-up editor** (WL) — songs list (drag to reorder, inline edit), Add Song / Paste Line-up, Submit.
6. **Substitution flows** — Request sub from a Service detail; Accept/Decline from Inbox; Approve/Reject from Service detail (WL view).
7. **Inbox** — chronological notification list with unread badge.
8. **Profile / Settings** — name, avatar, notification prefs, push device list, sign out.
9. **Admin** (Pastor + WH) — members, instrument roles, service types, YouTube integration status.

**Design system:** shadcn/ui on Tailwind. Framer Motion for sheet/dialog transitions. Native-style gestures where they help. Dark mode from day one.

## 13. Error Handling

- **Optimistic UI** for high-success actions (Approve, mark-as-read); roll back with a toast on server reject.
- **Idempotent server actions** — repeated approves are no-ops, not errors.
- **Offline-tolerant** via service worker caching of last-seen Schedule, Assignments, Inbox; mutations queue and replay on reconnect.
- **Silent auth refresh**; redirect to sign-in only on genuine failure.

| Situation | Behavior |
|---|---|
| Two approvers act simultaneously | First write wins; second sees "Already approved by X at HH:MM". |
| Network drops mid-action | Action queued locally; banner: "Offline — your action will send when you reconnect." |
| Push delivery fails | Email fallback already sent; inbox is canonical. |
| YouTube playlist generation fails | Line-up approval still succeeds; non-blocking banner with retry. |
| Sub picker finds no candidates | Empty state: "No one else on the team plays Drums. Ask the Worship Head to assign one or add the role to a member." |
| Invite link expired / used | Friendly page: "This invite has expired — ask your Worship Head to send a new one." |

Server-side validation mirrors UI validation. Form errors surface inline beside the offending field.

## 14. Testing Strategy

**Unit (Vitest):**
- Paste-parser fixture set covering real-world line-up formats.
- State machine transition tests for Schedule, Amendment, Line-up, Sub.
- Permission helper functions.

**Database / RLS (pgTAP or Supabase test runner):**
- Positive and negative tests for every RLS policy.
- Migration smoke tests for schema integrity.

**Integration:**
- YouTube playlist generation against recorded HTTP fixtures.
- Notification dispatch: trigger event, assert push + email payloads + inbox row.

**End-to-end (Playwright):**
1. WH builds + submits Schedule → Pastor approves → members see assignments.
2. WL submits line-up → WH approves → playlist URL appears in team notification.
3. Member requests sub → sub accepts → WL approves → assignments swap.
4. Pastor rejects Schedule with reason → WH edits → resubmits → approved.

**Manual QA (per release):**
- Install PWA on iOS device, grant push, verify delivery.
- Install on Android device, verify push.
- Quiet hours behavior.
- Screen-reader pass through the three critical flows.
- YouTube playlist appears in the configured church Google account.

**Deliberately not tested:**
- Trivial UI rendering / styling — visual review only.
- Third-party service internals (Supabase auth flows, YouTube API behavior).

## 15. Open Questions / Future Considerations

These were considered and explicitly deferred — easy to revisit once the MVP is in real use:

- **Pastor fallback approval** for line-ups and subs when the Worship Head is unavailable.
- **Member availability / blackout dates** to prevent conflicts before the Schedule is drafted.
- **Shared song library** with reusable Title/Link/default Key entries.
- **Play Store listing via TWA wrapper** for discoverability.
- **Multi-church / tenant support** if other churches want to use the app.
- **Calendar export** (iCal feed of your assignments).
- **Practice scheduling** beyond the service itself.
