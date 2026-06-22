import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import type { Database } from "@/lib/types/database.types";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const admin = createClient<Database>(url, secret, { auth: { persistSession: false } });

let userId: string;

beforeAll(async () => {
  // Clean up any leftover profile-test users from prior runs
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authData?.users) {
    const stale = authData.users.filter((u) =>
      u.email?.startsWith("profile-test-") && u.email?.endsWith("@test")
    );
    for (const u of stale) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
});

afterAll(async () => {
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
  }
});

describe("updateProfile", () => {
  it("updates name on the current user's row", async () => {
    const { data: { user }, error } = await admin.auth.admin.createUser({
      email: `profile-test-${Date.now()}@test`,
      email_confirm: true,
    });
    expect(error).toBeNull();
    if (!user) throw new Error("no user");
    userId = user.id;

    const { error: updateError } = await admin
      .from("users")
      .update({ name: "Updated Name" })
      .eq("id", user.id);

    expect(updateError).toBeNull();
    const { data } = await admin.from("users").select("name").eq("id", user.id).single();
    expect(data?.name).toBe("Updated Name");
  });
});
