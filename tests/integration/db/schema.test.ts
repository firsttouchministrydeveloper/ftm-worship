import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const admin = createClient(url, secret, { auth: { persistSession: false } });

async function tableExists(name: string): Promise<boolean> {
  const { error } = await admin.from(name).select("*").limit(0);
  return !error;
}

describe("Phase 1 schema (cloud)", () => {
  it.each([
    "users",
    "instrument_roles",
    "user_instrument_roles",
    "service_types",
    "invites",
    "push_subscriptions",
  ])("table %s exists", async (name) => {
    expect(await tableExists(name)).toBe(true);
  });

  it("seeds default service types", async () => {
    const { data, error } = await admin.from("service_types").select("name").order("name");
    expect(error).toBeNull();
    const names = data?.map((r) => r.name).sort();
    expect(names).toEqual(["Plug In", "Sunday Service", "TXT", "Teenagents"]);
  });

  it("seeds default instrument roles (9 entries, no Worship Leader)", async () => {
    const { data, error } = await admin.from("instrument_roles").select("name");
    expect(error).toBeNull();
    expect(data?.length).toBe(9);
    expect(data?.map((r) => r.name)).not.toContain("Worship Leader");
  });
});
