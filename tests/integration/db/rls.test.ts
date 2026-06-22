import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const admin = createClient(url, secret, { auth: { persistSession: false } });

const PASTOR_EMAIL = `rls-pastor-${Date.now()}@test.invalid`;
const MEMBER_EMAIL = `rls-member-${Date.now()}@test.invalid`;
const PASSWORD = "Test-password-123!";

let pastorId: string;
let memberId: string;
let pastorClient: SupabaseClient;
let memberClient: SupabaseClient;
let anonClient: SupabaseClient;

async function userClient(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

beforeAll(async () => {
  const { data: p, error: pErr } = await admin.auth.admin.createUser({ email: PASTOR_EMAIL, password: PASSWORD, email_confirm: true });
  if (pErr || !p.user) throw pErr ?? new Error("no user");
  pastorId = p.user.id;
  await admin.from("users").upsert({ id: pastorId, email: PASTOR_EMAIL, app_roles: ["PASTOR", "WORSHIP_HEAD"], name: "RLS Pastor" });

  const { data: m, error: mErr } = await admin.auth.admin.createUser({ email: MEMBER_EMAIL, password: PASSWORD, email_confirm: true });
  if (mErr || !m.user) throw mErr ?? new Error("no user");
  memberId = m.user.id;
  await admin.from("users").upsert({ id: memberId, email: MEMBER_EMAIL, app_roles: ["MEMBER"], name: "RLS Member" });

  pastorClient = await userClient(PASTOR_EMAIL, PASSWORD);
  memberClient = await userClient(MEMBER_EMAIL, PASSWORD);
  anonClient = createClient(url, anon, { auth: { persistSession: false } });
});

afterAll(async () => {
  if (pastorId) await admin.auth.admin.deleteUser(pastorId);
  if (memberId) await admin.auth.admin.deleteUser(memberId);
});

describe("RLS: users", () => {
  it("anonymous cannot read users", async () => {
    const { data, error } = await anonClient.from("users").select("id").limit(1);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("member can read users", async () => {
    const { data, error } = await memberClient.from("users").select("id").limit(1);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("member cannot update another user (row silently filtered)", async () => {
    await memberClient.from("users").update({ name: "hacked" }).eq("id", pastorId);
    const { data } = await admin.from("users").select("name").eq("id", pastorId).single();
    expect(data?.name).not.toBe("hacked");
  });

  it("member can update self", async () => {
    await memberClient.from("users").update({ name: "Updated by self" }).eq("id", memberId);
    const { data } = await admin.from("users").select("name").eq("id", memberId).single();
    expect(data?.name).toBe("Updated by self");
  });

  it("pastor can update any user", async () => {
    await pastorClient.from("users").update({ name: "Updated by pastor" }).eq("id", memberId);
    const { data } = await admin.from("users").select("name").eq("id", memberId).single();
    expect(data?.name).toBe("Updated by pastor");
  });
});

describe("RLS: instrument_roles", () => {
  it("member can read instrument_roles", async () => {
    const { data, error } = await memberClient.from("instrument_roles").select("id");
    expect(error).toBeNull();
    expect((data?.length ?? 0) >= 9).toBe(true);
  });

  it("member CANNOT insert instrument_roles", async () => {
    const { error } = await memberClient.from("instrument_roles").insert({ name: `Test-${Date.now()}`, display_order: 999 });
    expect(error).not.toBeNull();
  });

  it("pastor can insert instrument_roles", async () => {
    const name = `Cello-test-${Date.now()}`;
    const { error } = await pastorClient.from("instrument_roles").insert({ name, display_order: 999 });
    expect(error).toBeNull();
    await admin.from("instrument_roles").delete().eq("name", name);
  });
});

describe("RLS: push_subscriptions", () => {
  it("member can insert own push subscription", async () => {
    const { error } = await memberClient.from("push_subscriptions").insert({
      user_id: memberId,
      endpoint: `https://example/push/${Date.now()}`,
      p256dh: "test-p256dh",
      auth: "test-auth",
    });
    expect(error).toBeNull();
  });

  it("member cannot insert another user's push subscription", async () => {
    const { error } = await memberClient.from("push_subscriptions").insert({
      user_id: pastorId,
      endpoint: `https://example/push/hijack-${Date.now()}`,
      p256dh: "x",
      auth: "x",
    });
    expect(error).not.toBeNull();
  });
});
