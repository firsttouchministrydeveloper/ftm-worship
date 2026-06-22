import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const admin = createClient(url, secret, { auth: { persistSession: false } });

// Unique prefix so we can identify test users safely
const PREFIX = `boot-${Date.now()}`;
const EMAIL_A = `${PREFIX}-a@test.invalid`;
const EMAIL_B = `${PREFIX}-b@test.invalid`;
const EMAIL_C = `${PREFIX}-c@test.invalid`;

let userAId: string;
let userBId: string;
let userCId: string;
let inviteId: string;

beforeAll(async () => {
  // Clean public.users rows whose emails match our test prefix to ensure a
  // deterministic "first user" scenario. We delete invites first (FK), then
  // users (cascades to user_instrument_roles and push_subscriptions).
  // We do NOT delete public.users rows for emails that look real.
  const { data: existingUsers } = await admin
    .from("users")
    .select("id, email")
    .like("email", `boot-%@test.invalid`);

  if (existingUsers && existingUsers.length > 0) {
    const ids = existingUsers.map((u: { id: string }) => u.id);
    // Delete invites referencing these users first
    await admin.from("invites").delete().in("invited_by", ids);
    // Delete public.users rows (cascades to child tables)
    await admin.from("users").delete().in("id", ids);
  }

  // Clean up any orphaned auth users with the boot- prefix (from prior runs)
  const { data: authData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`beforeAll: failed to list auth users: ${listErr.message}`);
  if (authData?.users) {
    const bootAuthUsers = authData.users.filter((u) =>
      u.email?.startsWith("boot-") && u.email?.endsWith("@test.invalid")
    );
    for (const u of bootAuthUsers) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
});

afterAll(async () => {
  // Delete invites inserted in Test C
  if (inviteId) {
    await admin.from("invites").delete().eq("id", inviteId);
  }
  // Delete auth users (cascades to public.users)
  if (userAId) await admin.auth.admin.deleteUser(userAId);
  if (userBId) await admin.auth.admin.deleteUser(userBId);
  if (userCId) await admin.auth.admin.deleteUser(userCId);
});

describe("Bootstrap trigger (0003)", () => {
  // Test A depends on public.users being empty when the bootstrap trigger fires.
  // The beforeAll cleans up boot-*@test.invalid rows but cannot clean up real
  // developer accounts. If anyone signs up to the cloud project outside this
  // test, Test A will fail with "MEMBER instead of PASTOR+WORSHIP_HEAD".
  it("Test A — first signup becomes PASTOR + WORSHIP_HEAD", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL_A,
      email_confirm: true,
    });
    expect(error).toBeNull();
    expect(data?.user).toBeTruthy();
    userAId = data!.user!.id;

    const { data: row, error: rowErr } = await admin
      .from("users")
      .select("app_roles")
      .eq("id", userAId)
      .single();

    expect(rowErr).toBeNull();
    expect(row).toBeTruthy();
    expect(row!.app_roles).toEqual(["PASTOR", "WORSHIP_HEAD"]);
  });

  it("Test B — second signup with no invite becomes MEMBER", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL_B,
      email_confirm: true,
    });
    expect(error).toBeNull();
    expect(data?.user).toBeTruthy();
    userBId = data!.user!.id;

    const { data: row, error: rowErr } = await admin
      .from("users")
      .select("app_roles")
      .eq("id", userBId)
      .single();

    expect(rowErr).toBeNull();
    expect(row).toBeTruthy();
    expect(row!.app_roles).toEqual(["MEMBER"]);
  });

  it("Test C — invited signup adopts roles from invite, invite marked accepted", async () => {
    // Insert an invite for EMAIL_C, authored by the first user (userAId)
    const { data: invite, error: inviteErr } = await admin
      .from("invites")
      .insert({
        email: EMAIL_C,
        name: "Invited User",
        intended_app_roles: ["WORSHIP_LEADER"],
        intended_instrument_role_ids: [],
        token: `tok-${PREFIX}`,
        invited_by: userAId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    expect(inviteErr).toBeNull();
    expect(invite).toBeTruthy();
    inviteId = invite!.id;

    // Now create the auth user — trigger fires synchronously
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL_C,
      email_confirm: true,
    });
    expect(error).toBeNull();
    expect(data?.user).toBeTruthy();
    userCId = data!.user!.id;

    // Assert roles from invite
    const { data: row, error: rowErr } = await admin
      .from("users")
      .select("app_roles")
      .eq("id", userCId)
      .single();

    expect(rowErr).toBeNull();
    expect(row).toBeTruthy();
    expect(row!.app_roles).toEqual(["WORSHIP_LEADER"]);

    // Assert invite is marked accepted
    const { data: updatedInvite, error: invFetchErr } = await admin
      .from("invites")
      .select("accepted_at")
      .eq("id", inviteId)
      .single();

    expect(invFetchErr).toBeNull();
    expect(updatedInvite?.accepted_at).not.toBeNull();
  });
});
