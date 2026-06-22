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
